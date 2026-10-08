import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

type RouteContext = { params: Promise<{ orderCode: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Autentikasi diperlukan." }, { status: 401 });
  const { supabase } = current;
  const { orderCode } = await params;
  const { data, error } = await supabase
    .from("orders")
    .select("id,order_code,youtube_url,package_name,clip_count,amount,currency,payment_status,processing_status,created_at,paid_at,processing_started_at,processing_completed_at,error_message")
    .eq("order_code", orderCode)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Order gagal dimuat." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Order tidak ditemukan." }, { status: 404 });
  const { data: processing, error: processingError } = await supabase
    .from("processing_jobs")
    .select("progress")
    .eq("order_id", data.id)
    .maybeSingle();
  if (processingError) return NextResponse.json({ error: "Status pemrosesan gagal dimuat." }, { status: 500 });
  const { data: clips, error: clipsError } = data.processing_status === "COMPLETED"
    ? await supabase.from("clips").select("id,clip_number,file_name,size_bytes,duration_seconds").eq("order_id", data.id).order("clip_number")
    : { data: [], error: null };
  if (clipsError) return NextResponse.json({ error: "Hasil clip gagal dimuat." }, { status: 500 });
  const { data: proof, error: proofError } = await supabase.from("payment_proofs")
    .select("review_status,ocr_amount,ocr_transaction_date,review_note")
    .eq("order_id", data.id)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (proofError) return NextResponse.json({ error: "Status bukti pembayaran gagal dimuat." }, { status: 500 });
  return NextResponse.json({
    order: data,
    proof,
    progress: processing?.progress ?? 0,
    clips: clips ?? []
  });
}
