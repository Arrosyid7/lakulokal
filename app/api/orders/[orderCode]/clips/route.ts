import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { ownsOrder } from "@/lib/authorization";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const MAX_CLIP_BYTES = 512 * 1024 * 1024;
const clipSchema = z.object({
  phase: z.enum(["sign", "finalize"]),
  clip_number: z.number().int().positive(),
  size_bytes: z.number().int().positive().max(MAX_CLIP_BYTES),
  duration_seconds: z.number().positive().max(60),
  file_name: z.string().regex(/^clip_\d{2}\.mp4$/)
});

type RouteContext = { params: Promise<{ orderCode: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Autentikasi diperlukan." }, { status: 401 });
  const payload: unknown = await request.json().catch(() => null);
  const parsed = clipSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Data clip tidak valid." }, { status: 400 });

  const { orderCode } = await params;
  const admin = createSupabaseAdminClient();
  const { data: order, error: orderError } = await admin.from("orders")
    .select("id,user_id,clip_count,payment_status,processing_status,processing_completed_at,result_expires_at")
    .eq("order_code", orderCode)
    .maybeSingle();
  if (orderError) {
    console.error("browser_clip_order_query_failed", { code: orderError.code });
    return NextResponse.json({ error: "Order gagal diperiksa." }, { status: 500 });
  }
  if (!order || !ownsOrder(order.user_id, current.user.id)) {
    return NextResponse.json({ error: "Order tidak ditemukan." }, { status: 404 });
  }
  if (order.payment_status !== "PAID" || order.processing_status !== "PROCESSING") {
    return NextResponse.json({ error: "Order belum dapat menyimpan clip." }, { status: 409 });
  }
  const { clip_number: clipNumber, file_name: fileName } = parsed.data;
  if (clipNumber > order.clip_count || fileName !== `clip_${String(clipNumber).padStart(2, "0")}.mp4`) {
    return NextResponse.json({ error: "Nomor clip tidak sesuai dengan paket." }, { status: 400 });
  }

  const storagePath = `${order.id}/${fileName}`;
  if (parsed.data.phase === "sign") {
    const { error: rowError } = await admin.from("clips").upsert({
      order_id: order.id,
      clip_number: clipNumber,
      storage_path: storagePath,
      file_name: fileName,
      content_type: "video/mp4",
      size_bytes: parsed.data.size_bytes,
      duration_seconds: parsed.data.duration_seconds,
      upload_status: "UPLOADING"
    }, { onConflict: "order_id,clip_number" });
    if (rowError) {
      console.error("browser_clip_row_prepare_failed", { orderId: order.id, clipNumber, code: rowError.code });
      return NextResponse.json({ error: "Clip belum dapat disiapkan untuk disimpan." }, { status: 500 });
    }

    const { data: signedUpload, error: signError } = await admin.storage
      .from("lakulokal-results")
      .createSignedUploadUrl(storagePath, { upsert: true });
    if (signError || !signedUpload?.token) {
      console.error("browser_clip_upload_sign_failed", { orderId: order.id, clipNumber, message: signError?.message });
      return NextResponse.json({ error: "Tautan penyimpanan clip gagal dibuat." }, { status: 500 });
    }
    return NextResponse.json({ path: storagePath, token: signedUpload.token });
  }

  const { data: clip, error: clipError } = await admin.from("clips")
    .select("id,size_bytes,storage_path,upload_status")
    .eq("order_id", order.id)
    .eq("clip_number", clipNumber)
    .maybeSingle();
  if (clipError || !clip || clip.storage_path !== storagePath || clip.size_bytes !== parsed.data.size_bytes) {
    console.error("browser_clip_finalize_row_failed", { orderId: order.id, clipNumber, code: clipError?.code });
    return NextResponse.json({ error: "Data clip tidak cocok dengan unggahan." }, { status: 409 });
  }

  const { data: objects, error: listError } = await admin.storage.from("lakulokal-results")
    .list(order.id, { search: fileName, limit: 20 });
  if (listError) {
    console.error("browser_clip_storage_verify_failed", { orderId: order.id, clipNumber, message: listError.message });
    return NextResponse.json({ error: "Clip yang diunggah belum dapat diperiksa." }, { status: 500 });
  }
  const object = objects?.find((item) => item.name === fileName);
  const storedSize = Number(object?.metadata?.size);
  if (!object || !Number.isSafeInteger(storedSize) || storedSize !== parsed.data.size_bytes) {
    return NextResponse.json({ error: "Ukuran clip di penyimpanan tidak sesuai." }, { status: 409 });
  }

  const { error: updateError } = await admin.from("clips")
    .update({ upload_status: "READY" })
    .eq("id", clip.id);
  if (updateError) {
    console.error("browser_clip_finalize_failed", { orderId: order.id, clipNumber, code: updateError.code });
    return NextResponse.json({ error: "Clip gagal dicatat sebagai hasil siap." }, { status: 500 });
  }
  return NextResponse.json({ clip_number: clipNumber, file_name: fileName });
}
