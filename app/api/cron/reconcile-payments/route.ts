import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { queryDanaPayment } from "@/lib/dana";
import { isCronAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const admin = createSupabaseAdminClient();
  const olderThan = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data: pending, error } = await admin.from("orders")
    .select("id,order_code,amount,dana_partner_reference_no,payment_status")
    .eq("payment_status", "PENDING")
    .lt("payment_created_at", olderThan)
    .limit(100);
  if (error) {
    console.error("payment_reconciliation_query_failed", { code: error.code });
    return NextResponse.json({ error: "Pembayaran belum dapat direkonsiliasi." }, { status: 500 });
  }

  let expired = 0;
  let paid = 0;
  for (const order of pending ?? []) {
    if (!order.dana_partner_reference_no) {
      console.error("payment_reconciliation_missing_reference", { orderCode: order.order_code });
      continue;
    }
    try {
      const verified = await queryDanaPayment(order.dana_partner_reference_no);
      if (
        verified.amount !== Number(order.amount) ||
        verified.merchantId !== process.env.DANA_MERCHANT_ID ||
        verified.partnerReference !== order.dana_partner_reference_no
      ) {
        throw new Error("Data pembayaran DANA tidak cocok dengan order.");
      }
      if (verified.paid) {
        const { error: confirmError } = await admin.rpc("confirm_paid_order", {
          p_order_id: order.id,
          p_provider_reference: order.dana_partner_reference_no,
          p_amount: Number(order.amount)
        });
        if (confirmError) throw new Error("Status PAID gagal disimpan.");
        paid += 1;
      } else {
        const statusCode = (verified.statusCode ?? "").trim().toUpperCase();
        const terminalStatuses = new Set(["EXPIRED", "FAILED", "CANCELLED", "CANCELED", "TIMEOUT"]);
        if (statusCode && terminalStatuses.has(statusCode)) {
          const terminalStatus = statusCode.includes("EXPIRE") ? "EXPIRED" : statusCode.includes("CANCEL") ? "CANCELLED" : "FAILED";
          const { error: updateError } = await admin.from("orders")
            .update({ payment_status: terminalStatus })
            .eq("id", order.id)
            .eq("payment_status", "PENDING");
          if (updateError) throw new Error("Status terminal gagal disimpan.");
          const { error: paymentError } = await admin.from("payments")
            .update({ status: terminalStatus })
            .eq("order_id", order.id)
            .eq("status", "PENDING");
          if (paymentError) throw new Error("Status payment terminal gagal diperbarui.");
          expired += 1;
        } else {
          console.info("payment_reconciliation_still_pending", {
            orderCode: order.order_code,
            statusCode: statusCode || "unknown"
          });
        }
      }
    } catch (cause) {
      console.error("payment_reconciliation_order_failed", {
        orderCode: order.order_code,
        message: cause instanceof Error ? cause.message : "unknown"
      });
    }
  }

  return NextResponse.json({ checked: pending?.length ?? 0, paid, expired });
}
