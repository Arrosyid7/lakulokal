import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { hasAdminRole } from "@/lib/authorization";

type RouteContext = { params: Promise<{ proofId: string }> };

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
    console.error("admin_manual_qris_review_failed", { proofId, code: reviewError.code });
    return NextResponse.json({ error: "Keputusan pembayaran gagal disimpan." }, { status: 500 });
  }

  return NextResponse.json({ review_status: payload.decision === "APPROVE" ? "APPROVED" : "REJECTED" });
}
