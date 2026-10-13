import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { hasAdminRole } from "@/lib/authorization";

type RouteContext = { params: Promise<{ proofId: string }> };

function getReviewErrorMessage(code: string | undefined, message: string) {
  if (message.includes("admin role required")) {
    return "Akun administrator tidak dikenali database. Keluar, masuk kembali sebagai admin, lalu coba lagi.";
  }
  if (message.includes("service role required")) {
    return "Konfigurasi service-role server belum sesuai. Periksa SUPABASE_SERVICE_ROLE_KEY di environment server.";
  }
  if (message.includes("submitted payment proof required")) {
    return "Bukti ini tidak lagi berstatus menunggu. Muat ulang halaman untuk melihat status terbaru.";
  }
  if (message.includes("manual QRIS payment not found")) {
    return "Data pembayaran QRIS order ini tidak ditemukan atau tidak cocok.";
  }
  if (message.includes("payment proof does not match pending order")) {
    return "Nominal bukti tidak cocok dengan order. Pembayaran belum disetujui.";
  }
  if (message.includes("payment reference mismatch")) {
    return "Referensi pembayaran tidak cocok dengan order. Pembayaran belum disetujui.";
  }
  if (message.includes("credit purchase does not match the active package")) {
    return "Data paket kredit order tidak cocok. Minta pengelola memperbaiki data paket sebelum mencoba lagi.";
  }
  if (message.includes("order is not payable")) {
    return "Order tidak lagi menunggu pembayaran. Muat ulang halaman untuk melihat status terbaru.";
  }
  if (code === "42703") {
    return "Skema database belum lengkap. Pastikan migration 20261013010000_add_order_metadata.sql sudah diterapkan, lalu coba lagi.";
  }
  if (code === "42501") {
    return "Database menolak akses untuk meninjau pembayaran. Periksa role admin dan konfigurasi server.";
  }
  return "Keputusan pembayaran gagal disimpan. Muat ulang halaman dan coba lagi. Jika berulang, kirim kode error kepada pengelola.";
}

export async function POST(request: Request, { params }: RouteContext) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Autentikasi diperlukan." }, { status: 401 });
  const { data: profile, error: profileError } = await current.supabase
    .from("profiles")
    .select("role")
    .eq("id", current.user.id)
    .maybeSingle();
  if (profileError) return NextResponse.json({ error: "Role akun gagal diperiksa." }, { status: 500 });
  if (!hasAdminRole(profile?.role)) return NextResponse.json({ error: "Akses admin diperlukan." }, { status: 403 });

  const payload = await request.json().catch(() => null);
  if (
    !payload ||
    !["APPROVE", "REJECT"].includes(payload.decision) ||
    (payload.note !== undefined && (typeof payload.note !== "string" || payload.note.trim().length > 400))
  ) {
    return NextResponse.json({ error: "Keputusan pemeriksaan tidak valid." }, { status: 400 });
  }

  const { proofId } = await params;
  const admin = createSupabaseAdminClient();
  const { data: proof, error: proofError } = await admin.from("payment_proofs")
    .select("id,order_id,payment_id,ocr_amount,review_status")
    .eq("id", proofId)
    .maybeSingle();
  if (proofError) {
    console.error("admin_payment_proof_query_failed", { code: proofError.code });
    return NextResponse.json({ error: "Bukti pembayaran gagal diperiksa." }, { status: 500 });
  }
  if (!proof || proof.review_status !== "SUBMITTED") {
    return NextResponse.json({ error: "Bukti ini sudah diperiksa atau tidak ditemukan." }, { status: 409 });
  }
  const { data: order, error: orderError } = await admin.from("orders")
    .select("amount,payment_status")
    .eq("id", proof.order_id)
    .maybeSingle();
  if (orderError) {
    console.error("admin_payment_order_query_failed", { code: orderError.code });
    return NextResponse.json({ error: "Order pembayaran gagal diperiksa." }, { status: 500 });
  }
  if (!order || order.payment_status !== "PENDING" || order.amount !== proof.ocr_amount) {
    return NextResponse.json({ error: "Order tidak lagi cocok dengan bukti yang menunggu." }, { status: 409 });
  }

  const { error: reviewError } = await admin.rpc("review_manual_qris_payment", {
    p_proof_id: proof.id,
    p_decision: payload.decision,
    p_admin_user_id: current.user.id,
    p_note: typeof payload.note === "string" ? payload.note.trim() || null : null
  });
  if (reviewError) {
    console.error("admin_manual_qris_review_failed", {
      proofId,
      code: reviewError.code,
      message: reviewError.message,
      details: reviewError.details,
      hint: reviewError.hint
    });
    return NextResponse.json({
      error: getReviewErrorMessage(reviewError.code, reviewError.message),
      errorCode: reviewError.code ?? "UNKNOWN"
    }, { status: 500 });
  }

  return NextResponse.json({ review_status: payload.decision === "APPROVE" ? "APPROVED" : "REJECTED" });
}
