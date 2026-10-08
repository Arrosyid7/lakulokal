import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatJakartaDate, isReceiptDateValid } from "@/lib/payment-proof";

export const runtime = "nodejs";

const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

type ReceiptImage = { mimeType: string; extension: string };

function detectReceiptImage(bytes: Buffer): ReceiptImage | null {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return { mimeType: "image/png", extension: "png" };
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mimeType: "image/jpeg", extension: "jpg" };
  }
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") {
    return { mimeType: "image/webp", extension: "webp" };
  }
  return null;
}

export async function POST(request: Request, { params }: { params: Promise<{ orderCode: string }> }) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Autentikasi diperlukan." }, { status: 401 });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Penyimpanan bukti pembayaran belum dikonfigurasi." }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Form bukti pembayaran tidak valid." }, { status: 400 });
  }
  const receipt = form.get("receipt");
  const ocrAmount = Number(form.get("ocrAmount"));
  const transactionDate = String(form.get("ocrTransactionDate") ?? "");
  if (!(receipt instanceof File) || !Number.isSafeInteger(ocrAmount) || ocrAmount < 0) {
    return NextResponse.json({ error: "Gambar bukti dan hasil OCR nominal wajib diisi." }, { status: 400 });
  }
  if (receipt.size < 1 || receipt.size > MAX_RECEIPT_BYTES) {
    return NextResponse.json({ error: "Ukuran gambar bukti harus maksimal 5 MB." }, { status: 413 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(transactionDate)) {
    return NextResponse.json({ error: "Tanggal transaksi dari OCR tidak valid." }, { status: 400 });
  }

  const { orderCode } = await params;
  const admin = createSupabaseAdminClient();
  const { data: withinLimit, error: rateLimitError } = await admin.rpc("consume_user_rate_limit", {
    p_user_id: current.user.id,
    p_action: "payment_proof",
    p_limit: 3,
    p_window_seconds: 60
  });
  if (rateLimitError) {
    console.error("payment_proof_rate_limit_failed", { code: rateLimitError.code });
    return NextResponse.json({ error: "Bukti pembayaran belum dapat diperiksa." }, { status: 503 });
  }
  if (!withinLimit) return NextResponse.json({ error: "Terlalu banyak percobaan. Tunggu satu menit lalu coba lagi." }, { status: 429 });

  const { data: order, error: orderError } = await admin.from("orders")
    .select("id,user_id,amount,payment_status,created_at,youtube_url")
    .eq("order_code", orderCode)
    .maybeSingle();
  if (orderError) {
    console.error("payment_proof_order_query_failed", { code: orderError.code });
    return NextResponse.json({ error: "Order gagal diperiksa." }, { status: 500 });
  }
  if (!order || order.user_id !== current.user.id) return NextResponse.json({ error: "Order tidak ditemukan." }, { status: 404 });
  if (order.youtube_url !== null || order.payment_status !== "PENDING") {
    return NextResponse.json({ error: "Bukti hanya dapat dikirim untuk order QRIS yang masih menunggu pembayaran." }, { status: 409 });
  }

  const { data: payment, error: paymentError } = await admin.from("payments")
    .select("id,amount,status,provider")
    .eq("order_id", order.id)
    .eq("provider", "MANUAL_QRIS")
    .maybeSingle();
  if (paymentError) {
    console.error("payment_proof_payment_query_failed", { code: paymentError.code });
    return NextResponse.json({ error: "Data pembayaran gagal diperiksa." }, { status: 500 });
  }
  if (!payment || payment.status !== "PENDING" || payment.amount !== order.amount) {
    return NextResponse.json({ error: "Order tidak memiliki pembayaran QRIS yang dapat diperiksa." }, { status: 409 });
  }

  const { data: previousProof, error: proofQueryError } = await admin.from("payment_proofs")
    .select("review_status")
    .eq("payment_id", payment.id)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (proofQueryError) {
    console.error("payment_proof_previous_query_failed", { code: proofQueryError.code });
    return NextResponse.json({ error: "Status bukti sebelumnya gagal diperiksa." }, { status: 500 });
  }
  if (previousProof?.review_status === "SUBMITTED") {
    return NextResponse.json({ error: "Bukti pembayaran untuk order ini sudah tercatat." }, { status: 409 });
  }

  const orderDate = formatJakartaDate(new Date(order.created_at));
  const today = formatJakartaDate(new Date());
  if (
    ocrAmount !== order.amount ||
    !isReceiptDateValid(transactionDate, orderDate, today)
  ) {
    return NextResponse.json({ error: "Nominal atau tanggal bukti tidak cocok dengan order." }, { status: 400 });
  }

  const bytes = Buffer.from(await receipt.arrayBuffer());
  const image = detectReceiptImage(bytes);
  if (!image || image.mimeType !== receipt.type) {
    return NextResponse.json({ error: "Isi file harus berupa gambar JPG, PNG, atau WebP yang valid." }, { status: 415 });
  }

  const proofId = crypto.randomUUID();
  const storagePath = `${order.id}/${proofId}.${image.extension}`;
  const { error: uploadError } = await admin.storage.from("payment-proofs").upload(storagePath, bytes, {
    contentType: image.mimeType,
    upsert: false
  });
  if (uploadError) {
    console.error("payment_proof_storage_upload_failed", { orderId: order.id, message: uploadError.message });
    return NextResponse.json({ error: "Gambar bukti belum dapat disimpan. Coba lagi." }, { status: 500 });
  }

  const { data: proof, error: insertError } = await admin.from("payment_proofs").insert({
    id: proofId,
    payment_id: payment.id,
    order_id: order.id,
    storage_path: storagePath,
    ocr_amount: ocrAmount,
    ocr_transaction_date: transactionDate,
    review_status: "SUBMITTED"
  }).select("id,review_status,ocr_amount,ocr_transaction_date").single();
  if (insertError || !proof) {
    const { error: cleanupError } = await admin.storage.from("payment-proofs").remove([storagePath]);
    if (cleanupError) console.error("payment_proof_orphan_cleanup_failed", { proofId, message: cleanupError.message });
    console.error("payment_proof_insert_failed", { orderId: order.id, code: insertError?.code });
    return NextResponse.json({ error: "Bukti pembayaran gagal dicatat." }, { status: 500 });
  }

  const { data: confirmation, error: confirmationError } = await admin.rpc("auto_approve_manual_qris_proof", {
    p_proof_id: proof.id
  }).maybeSingle();
  if (confirmationError || !confirmation) {
    console.error("manual_qris_auto_approval_failed", {
      orderId: order.id,
      proofId: proof.id,
      code: confirmationError?.code
    });
    return NextResponse.json({
      error: "Bukti tersimpan, tetapi persetujuan otomatis gagal. Muat ulang halaman atau hubungi admin."
    }, { status: 500 });
  }

  return NextResponse.json({
    proof: { ...proof, review_status: "APPROVED" },
    payment_status: "PAID"
  }, { status: 201 });
}
