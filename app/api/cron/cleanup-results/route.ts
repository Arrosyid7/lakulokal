import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const hours = Number.parseInt(process.env.RESULT_EXPIRATION_HOURS || "72", 10);
  if (!Number.isSafeInteger(hours) || hours < 1) {
    return NextResponse.json({ error: "RESULT_EXPIRATION_HOURS tidak valid." }, { status: 503 });
  }
  const admin = createSupabaseAdminClient();
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const { data: orders, error } = await admin.from("orders")
    .select("id,user_id,result_zip_path")
    .eq("processing_status", "COMPLETED")
    .not("result_zip_path", "is", null)
    .lt("processing_completed_at", cutoff)
    .limit(200);
  if (error) {
    console.error("result_cleanup_query_failed", { code: error.code });
    return NextResponse.json({ error: "Hasil kedaluwarsa belum dapat diperiksa." }, { status: 500 });
  }

  let removed = 0;
  for (const order of orders ?? []) {
    const { data: clips, error: clipsError } = await admin.from("clips")
      .select("storage_path")
      .eq("order_id", order.id);
    if (clipsError) {
      console.error("result_cleanup_clips_query_failed", { orderId: order.id, code: clipsError.code });
      continue;
    }
    const paths = [...(clips ?? []).map((clip) => clip.storage_path), order.result_zip_path].filter((path): path is string => Boolean(path));
    const { error: storageError } = await admin.storage.from("lakulokal-results").remove(paths);
    if (storageError) {
      console.error("result_cleanup_storage_failed", { orderId: order.id, message: storageError.message });
      continue;
    }
    const { error: clipDeleteError } = await admin.from("clips").delete().eq("order_id", order.id);
    if (clipDeleteError) {
      console.error("result_cleanup_clip_rows_failed", { orderId: order.id, code: clipDeleteError.code });
      continue;
    }
    const { error: orderUpdateError } = await admin.from("orders")
      .update({ result_zip_path: null, result_url: null })
      .eq("id", order.id);
    if (orderUpdateError) {
      console.error("result_cleanup_order_update_failed", { orderId: order.id, code: orderUpdateError.code });
      continue;
    }
    const { error: auditError } = await admin.from("audit_logs").insert({
      action: "RESULTS_EXPIRED",
      entity_type: "order",
      entity_id: order.id,
      metadata: { expiration_hours: hours }
    });
    if (auditError) console.error("result_cleanup_audit_failed", { orderId: order.id, code: auditError.code });
    removed += 1;
  }
  return NextResponse.json({ checked: orders?.length ?? 0, removed });
}
