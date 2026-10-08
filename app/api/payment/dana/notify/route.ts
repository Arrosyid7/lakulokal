import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseDanaWebhook, queryDanaPayment } from "@/lib/dana";
import type { FinishNotifyRequest } from "dana-node/webhook/v1";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function acknowledge() {
  return NextResponse.json({ responseCode: "2005600", responseMessage: "Successful" });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  let body: FinishNotifyRequest;
  try {
    const headers: Record<string, string> = {};
    request.headers.forEach((value, name) => { headers[name] = value; });
    body = parseDanaWebhook({
      method: request.method,
      pathname: new URL(request.url).pathname,
      headers,
      rawBody
    });
  } catch (error) {
    console.error("dana_webhook_signature_or_payload_invalid", {
      message: error instanceof Error ? error.message : "unknown"
    });
    return NextResponse.json({ error: "Notifikasi DANA tidak valid." }, { status: 401 });
  }
  const partnerReference = body.originalPartnerReferenceNo;
  const providerReference = body.originalReferenceNo;
  if (!partnerReference || !providerReference || !body.finishedTime) {
    return NextResponse.json({ error: "Referensi pembayaran tidak lengkap." }, { status: 400 });
  }
  const eventId = `${providerReference}:${body.latestTransactionStatus}:${body.finishedTime}`;

  const admin = createSupabaseAdminClient();
  const { data: event, error: eventError } = await admin.from("webhook_events").insert({
    provider: "DANA",
    provider_event_id: eventId,
    event_type: `FINISH_NOTIFY_${body.latestTransactionStatus}`,
    payload: JSON.parse(JSON.stringify(body))
  }).select("id").maybeSingle();
  if (eventError && eventError.code !== "23505") {
    console.error("dana_webhook_event_insert_failed", { code: eventError.code });
    return NextResponse.json({ error: "Notifikasi belum dapat dicatat." }, { status: 500 });
  }

  let eventRowId = event?.id;
  if (!eventRowId) {
    const { data: existing, error: existingError } = await admin.from("webhook_events")
      .select("id,processed_at")
      .eq("provider", "DANA")
      .eq("provider_event_id", eventId)
      .maybeSingle();
    if (existingError || !existing) return NextResponse.json({ error: "Notifikasi duplikat tidak dapat diperiksa." }, { status: 500 });
    if (existing.processed_at) return acknowledge();
    eventRowId = existing.id;
  }

  try {
    const { data: order, error: orderError } = await admin.from("orders")
      .select("id,order_code,amount,currency,payment_status,dana_reference_no,dana_partner_reference_no")
      .eq("dana_partner_reference_no", partnerReference)
      .maybeSingle();
    if (orderError) throw new Error("Order pembayaran gagal diperiksa.");
    if (!order) return NextResponse.json({ error: "Order tidak ditemukan." }, { status: 404 });
    if (
      body.merchantId !== process.env.DANA_MERCHANT_ID ||
      Number(body.amount.value) !== Number(order.amount) ||
      body.amount.currency !== order.currency ||
      (order.dana_reference_no && providerReference !== order.dana_reference_no)
    ) {
      throw new Error("Data notifikasi DANA tidak cocok dengan order.");
    }

    const verified = await queryDanaPayment(partnerReference);
    if (
      verified.amount !== Number(order.amount) ||
      verified.merchantId !== process.env.DANA_MERCHANT_ID ||
      verified.partnerReference !== order.dana_partner_reference_no ||
      verified.providerReference !== providerReference ||
      (order.dana_reference_no && verified.providerReference !== order.dana_reference_no)
    ) {
      throw new Error("Data pembayaran DANA tidak cocok dengan order.");
    }

    if (!verified.paid) {
      const { error } = await admin.from("webhook_events").update({ processed_at: new Date().toISOString() }).eq("id", eventRowId);
      if (error) throw new Error("Notifikasi status belum dapat diselesaikan.");
      return acknowledge();
    }

    const { data: confirmation, error: confirmError } = await admin.rpc("confirm_paid_order", {
      p_order_id: order.id,
      p_provider_reference: order.dana_partner_reference_no,
      p_amount: Number(order.amount)
    }).maybeSingle();
    if (confirmError) {
      throw new Error("Status pembayaran tidak dapat disimpan.");
    }
    if (!confirmation) {
      throw new Error("Konfirmasi pembayaran tidak dikembalikan oleh database.");
    }

    if (!confirmation.already_paid) {
      const { error: auditError } = await admin.from("audit_logs").insert({
        action: "PAYMENT_CONFIRMED",
        entity_type: "order",
        entity_id: order.id,
        metadata: { provider: "DANA", event_id: eventId, verified_amount: verified.amount }
      });
      if (auditError) throw new Error("Audit pembayaran gagal dicatat.");
    }
    const { error: eventUpdateError } = await admin.from("webhook_events")
      .update({ order_id: order.id, processed_at: new Date().toISOString(), processing_error: null })
      .eq("id", eventRowId);
    if (eventUpdateError) throw new Error("Notifikasi pembayaran belum dapat ditandai selesai.");
    console.info("dana_finish_notify_processed", {
      orderCode: order.order_code,
      status: "PAID",
      alreadyPaid: confirmation.already_paid
    });
    return acknowledge();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kesalahan pemrosesan notifikasi.";
    const { error: updateError } = await admin.from("webhook_events")
      .update({ processing_error: message.slice(0, 400) })
      .eq("id", eventRowId);
    if (updateError) console.error("dana_webhook_error_log_failed", { code: updateError.code });
    console.error("dana_webhook_processing_failed", { message });
    return NextResponse.json({ error: "Notifikasi belum dapat diproses. Provider dapat mencoba kembali." }, { status: 500 });
  }
}
