import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { browserProcessingSchema } from "@/lib/validation";

type RouteContext = { params: Promise<{ orderCode: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Autentikasi diperlukan." }, { status: 401 });

  const payload = await request.json().catch(() => null);
  const parsed = browserProcessingSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Status pemrosesan tidak valid." }, { status: 400 });
  }
  if (parsed.data.status === "COMPLETED" && parsed.data.progress !== 100) {
    return NextResponse.json({ error: "Proses selesai harus memiliki progress 100." }, { status: 400 });
  }

  const { orderCode } = await params;
  const { data: order, error: orderError } = await current.supabase
    .from("orders")
    .select("id,payment_status,youtube_url")
    .eq("order_code", orderCode)
    .maybeSingle();
  if (orderError) {
    console.error("browser_processing_order_query_failed", { code: orderError.code });
    return NextResponse.json({ error: "Order gagal diperiksa." }, { status: 500 });
  }
  if (!order) return NextResponse.json({ error: "Order tidak ditemukan." }, { status: 404 });
  if (order.payment_status !== "PAID") {
    return NextResponse.json({ error: "Pemrosesan hanya tersedia setelah pembayaran terverifikasi." }, { status: 409 });
  }
  if (order.youtube_url !== null) {
    return NextResponse.json({ error: "Order ini bukan order pemrosesan lokal." }, { status: 409 });
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.rpc("update_browser_processing_status", {
    p_order_id: order.id,
    p_status: parsed.data.status,
    p_progress: parsed.data.progress,
    p_error_message: parsed.data.error_message ?? null
  });
  if (error) {
    console.error("browser_processing_status_update_failed", { code: error.code, status: parsed.data.status });
    return NextResponse.json({ error: "Status pemrosesan gagal disimpan." }, { status: 500 });
  }
  return NextResponse.json({ status: parsed.data.status, progress: parsed.data.progress });
}
