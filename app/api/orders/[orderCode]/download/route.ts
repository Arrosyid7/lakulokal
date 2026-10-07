import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ownsOrder } from "@/lib/authorization";

type RouteContext = { params: Promise<{ orderCode: string }> };

export async function POST(_request: Request, { params }: RouteContext) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Autentikasi diperlukan." }, { status: 401 });
  const { user } = current;
  const { orderCode } = await params;
  const admin = createSupabaseAdminClient();
  const { data: order, error } = await admin
    .from("orders")
    .select("id,user_id,processing_status,processing_completed_at,result_zip_path")
    .eq("order_code", orderCode)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Order gagal diperiksa." }, { status: 500 });
  if (!order || !ownsOrder(order.user_id, user.id)) return NextResponse.json({ error: "Order tidak ditemukan." }, { status: 404 });
  if (order.processing_status !== "COMPLETED") return NextResponse.json({ error: "Hasil belum tersedia." }, { status: 409 });
  const expiryHours = Number.parseInt(process.env.RESULT_EXPIRATION_HOURS || "72", 10);
  const completedAt = order.processing_completed_at ? Date.parse(order.processing_completed_at) : NaN;
  if (
    !Number.isSafeInteger(expiryHours) ||
    expiryHours < 1 ||
    !Number.isFinite(completedAt) ||
    Date.now() - completedAt > expiryHours * 60 * 60 * 1000
  ) {
    return NextResponse.json({ error: "Masa penyimpanan hasil telah berakhir." }, { status: 410 });
  }

  const { data: clips, error: clipsError } = await admin
    .from("clips")
    .select("storage_path,file_name")
    .eq("order_id", order.id)
    .order("clip_number");
  if (clipsError) return NextResponse.json({ error: "Daftar clip gagal dimuat." }, { status: 500 });
  if (!clips?.length) return NextResponse.json({ error: "File hasil tidak ditemukan." }, { status: 404 });

  const signed = await Promise.all(clips.map(async (clip) => {
    try {
      const { data, error: signError } = await admin.storage
        .from("lakulokal-results")
        .createSignedUrl(clip.storage_path, 300, { download: clip.file_name });
      if (signError || !data?.signedUrl) return null;
      return { file_name: clip.file_name, url: data.signedUrl };
    } catch {
      return null;
    }
  }));
  if (signed.some((item) => item === null)) {
    return NextResponse.json({ error: "Tautan unduhan tidak dapat dibuat." }, { status: 500 });
  }
  let zip: { file_name: string; url: string } | null = null;
  if (order.result_zip_path) {
    const { data, error: zipError } = await admin.storage
      .from("lakulokal-results")
      .createSignedUrl(order.result_zip_path, 300, { download: "result.zip" });
    if (zipError || !data?.signedUrl) return NextResponse.json({ error: "Tautan ZIP gagal dibuat." }, { status: 500 });
    zip = { file_name: "result.zip", url: data.signedUrl };
  }
  return NextResponse.json({
    downloads: signed.filter((item): item is NonNullable<typeof item> => item !== null),
    zip
  });
}
