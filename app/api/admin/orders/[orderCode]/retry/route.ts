import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasAdminRole } from "@/lib/authorization";

type RouteContext = { params: Promise<{ orderCode: string }> };

export async function POST(_request: Request, { params }: RouteContext) {
  const userClient = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Autentikasi diperlukan." }, { status: 401 });
  const { data: profile, error: profileError } = await userClient.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profileError) return NextResponse.json({ error: "Role akun gagal diperiksa." }, { status: 500 });
  if (!hasAdminRole(profile?.role)) return NextResponse.json({ error: "Akses admin diperlukan." }, { status: 403 });

  const { orderCode } = await params;
  const admin = createSupabaseAdminClient();
  const { data: order, error: orderError } = await admin.from("orders")
    .select("id,payment_status,processing_status,youtube_url")
    .eq("order_code", orderCode)
    .maybeSingle();
  if (orderError) return NextResponse.json({ error: "Order gagal diperiksa." }, { status: 500 });
  if (!order) return NextResponse.json({ error: "Order tidak ditemukan." }, { status: 404 });
  if (order.payment_status !== "PAID" || order.processing_status !== "FAILED") {
    return NextResponse.json({ error: "Hanya order PAID dengan proses FAILED yang dapat dicoba ulang." }, { status: 409 });
  }
  if (order.youtube_url !== null) {
    return NextResponse.json({ error: "Order video lama tidak dapat diproses di browser. Minta pengguna membuat order video baru." }, { status: 409 });
  }

  const { data: job, error: jobError } = await admin.from("processing_jobs")
    .update({ status: "QUEUED", progress: 0, error_message: null, finished_at: null })
    .eq("order_id", order.id)
    .eq("status", "FAILED")
    .select("id")
    .maybeSingle();
  if (jobError) return NextResponse.json({ error: "Job gagal dimasukkan ke antrean." }, { status: 500 });
  if (!job) return NextResponse.json({ error: "Job tidak lagi berstatus gagal." }, { status: 409 });

  const { error: orderUpdateError } = await admin.from("orders")
    .update({ processing_status: "QUEUED", error_message: null })
    .eq("id", order.id)
    .eq("payment_status", "PAID");
  if (orderUpdateError) return NextResponse.json({ error: "Status order gagal diperbarui." }, { status: 500 });
  const { error: auditError } = await admin.from("audit_logs").insert({
    actor_user_id: user.id,
    action: "ADMIN_RETRY_JOB",
    entity_type: "order",
    entity_id: order.id,
    metadata: {}
  });
  if (auditError) return NextResponse.json({ error: "Tindakan admin gagal dicatat." }, { status: 500 });

  return NextResponse.json({ queued: true, message: "Pemilik order perlu memilih ulang file di detail order untuk memulai proses." });
}
