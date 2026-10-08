import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { orderSchema, validationMessage } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET() {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Autentikasi diperlukan." }, { status: 401 });
  const { supabase } = current;
  const { data, error } = await supabase
    .from("orders")
    .select("id,order_code,package_name,clip_count,amount,currency,payment_status,processing_status,created_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Riwayat order gagal dimuat." }, { status: 500 });
  return NextResponse.json({ orders: data });
}

export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Autentikasi diperlukan." }, { status: 401 });
  const { user } = current;
  const json = await request.json().catch(() => null);
  const parsed = orderSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: validationMessage(parsed.error) }, { status: 400 });

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Pembuatan order belum tersedia. Admin perlu melengkapi konfigurasi pembayaran." }, { status: 503 });
  }

  const admin = createSupabaseAdminClient();
  const { data: withinLimit, error: rateLimitError } = await admin.rpc("consume_user_rate_limit", {
    p_user_id: user.id,
    p_action: "create_order",
    p_limit: 3,
    p_window_seconds: 60
  });
  if (rateLimitError) {
    console.error("order_rate_limit_failed", { code: rateLimitError.code });
    return NextResponse.json({ error: "Order belum dapat dibuat. Silakan coba beberapa saat lagi." }, { status: 503 });
  }
  if (!withinLimit) return NextResponse.json({ error: "Batas pembuatan order tercapai. Coba lagi setelah satu menit." }, { status: 429 });

  const { data: product, error: productError } = await admin
    .from("packages")
    .select("id,name,clip_count,price,currency")
    .eq("id", parsed.data.package_id)
    .eq("active", true)
    .maybeSingle();
  if (productError) return NextResponse.json({ error: "Paket tidak dapat diperiksa." }, { status: 500 });
  if (!product) return NextResponse.json({ error: "Paket tidak ditemukan atau sudah tidak aktif." }, { status: 400 });

  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replaceAll("-", "");
  const orderCode = `LL-${datePart}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const { data: order, error: insertError } = await admin
    .from("orders")
    .insert({
      order_code: orderCode,
      user_id: user.id,
      youtube_url: null,
      package_id: product.id,
      package_name: product.name,
      clip_count: product.clip_count,
      amount: product.price,
      currency: product.currency
    })
    .select("id,order_code,amount,currency,package_name,clip_count,created_at")
    .single();
  if (insertError || !order) {
    console.error("order_create_failed", { userId: user.id, code: insertError?.code });
    return NextResponse.json({ error: "Order tidak berhasil dibuat." }, { status: 500 });
  }

  const { error: paymentError } = await admin.from("payments").insert({
    order_id: order.id,
    provider: "MANUAL_QRIS",
    provider_reference: `MANUAL_QRIS-${crypto.randomUUID()}`,
    partner_reference: orderCode,
    amount: order.amount,
    currency: order.currency
  });
  if (paymentError) {
    const { error: updateError } = await admin.from("orders").update({
      payment_status: "FAILED",
      error_message: "Data pembayaran QRIS gagal disimpan."
    }).eq("id", order.id);
    if (updateError) console.error("order_payment_failure_update_failed", { orderId: order.id, code: updateError.code });
    console.error("manual_qris_payment_create_failed", { orderId: order.id, code: paymentError.code });
    return NextResponse.json({ error: "QR pembayaran gagal dibuat. Order tidak dapat dibayar." }, { status: 502 });
  }

  return NextResponse.json({
    order: {
      order_code: order.order_code,
      amount: order.amount,
      currency: order.currency,
      clip_count: order.clip_count,
      created_at: order.created_at
    }
  }, { status: 201 });
}
