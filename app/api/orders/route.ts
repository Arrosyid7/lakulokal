import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { orderSchema, validationMessage } from "@/lib/validation";
import { createDanaCheckout } from "@/lib/dana";

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

  const paymentReady = Boolean(
    process.env.DANA_PRIVATE_KEY &&
    process.env.DANA_MERCHANT_ID &&
    process.env.DANA_CLIENT_ID &&
    process.env.DANA_MCC &&
    process.env.DANA_EXTERNAL_STORE_ID &&
    process.env.NEXT_PUBLIC_SITE_URL &&
    ((process.env.DANA_ENVIRONMENT || process.env.DANA_ENV || "sandbox") !== "production" || process.env.DANA_PUBLIC_KEY)
  );
  if (!paymentReady || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
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
  const partnerReference = orderCode;
  const { data: order, error: insertError } = await admin
    .from("orders")
    .insert({
      order_code: orderCode,
      user_id: user.id,
      youtube_url: parsed.data.youtube_url,
      package_id: product.id,
      package_name: product.name,
      clip_count: product.clip_count,
      amount: product.price,
      currency: product.currency,
      dana_partner_reference_no: partnerReference
    })
    .select("id,order_code,amount,currency,package_name,clip_count")
    .single();
  if (insertError || !order) {
    console.error("order_create_failed", { userId: user.id, code: insertError?.code });
    return NextResponse.json({ error: "Order tidak berhasil dibuat." }, { status: 500 });
  }

  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) throw new Error("NEXT_PUBLIC_SITE_URL belum dikonfigurasi.");
    const payment = await createDanaCheckout({
      orderCode,
      amount: order.amount,
      description: `${order.package_name} LakuLokal`,
      returnUrl: `${siteUrl.replace(/\/$/, "")}/payment/${encodeURIComponent(orderCode)}`
    });
    const { error: paymentError } = await admin.from("payments").insert({
      order_id: order.id,
      provider: "DANA",
      provider_reference: payment.providerReference,
      partner_reference: partnerReference,
      amount: order.amount,
      currency: order.currency,
      qr_content: payment.qrContent,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    });
    if (paymentError) throw new Error("Data pembayaran gagal disimpan.");
    const { error: updateError } = await admin.from("orders").update({
      dana_reference_no: payment.providerReference,
      dana_qr_content: payment.qrContent
    }).eq("id", order.id);
    if (updateError) throw new Error("QR pembayaran gagal disimpan.");

    return NextResponse.json({
      order: { order_code: order.order_code, amount: order.amount, currency: order.currency },
      payment: { qr_content: payment.qrContent }
    }, { status: 201 });
  } catch (error) {
    const { error: updateError } = await admin.from("orders").update({
      payment_status: "FAILED",
      error_message: "Pembuatan QR pembayaran gagal."
    }).eq("id", order.id);
    if (updateError) console.error("order_payment_failure_update_failed", { orderId: order.id, code: updateError.code });
    console.error("dana_qr_creation_failed", { orderId: order.id, message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "QR pembayaran gagal dibuat. Order tidak dapat dibayar." }, { status: 502 });
  }
}
