import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const MAX_REVIEW_IMAGE_BYTES = 5 * 1024 * 1024;
const reviewFieldsSchema = z.object({
  displayName: z.string().trim().min(1, "Nama wajib diisi.").max(80, "Nama maksimal 80 karakter."),
  reviewText: z.string().trim().min(1, "Ulasan wajib diisi.").max(600, "Ulasan maksimal 600 karakter."),
  rating: z.coerce.number().int().min(1).max(5)
});

type ReviewImage = { mimeType: string; extension: string };

function detectReviewImage(bytes: Buffer): ReviewImage | null {
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

export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Masuk ke akun untuk mengirim ulasan." }, { status: 401 });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Pengiriman ulasan belum dikonfigurasi." }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Form ulasan tidak valid." }, { status: 400 });
  }

  const parsed = reviewFieldsSchema.safeParse({
    displayName: form.get("displayName"),
    reviewText: form.get("reviewText"),
    rating: form.get("rating")
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data ulasan tidak valid." }, { status: 400 });
  }

  const photo = form.get("photo");
  if (!(photo instanceof File)) return NextResponse.json({ error: "Foto terkait LakuLokal wajib diunggah." }, { status: 400 });
  if (photo.size < 1 || photo.size > MAX_REVIEW_IMAGE_BYTES) {
    return NextResponse.json({ error: "Ukuran foto harus lebih dari 0 dan maksimal 5 MB." }, { status: 413 });
  }

  const admin = createSupabaseAdminClient();
  const { data: withinLimit, error: rateLimitError } = await admin.rpc("consume_user_rate_limit", {
    p_user_id: current.user.id,
    p_action: "customer_review",
    p_limit: 3,
    p_window_seconds: 600
  });
  if (rateLimitError) {
    console.error("customer_review_rate_limit_failed", { code: rateLimitError.code });
    return NextResponse.json({ error: "Ulasan belum dapat dikirim. Coba lagi nanti." }, { status: 503 });
  }
  if (!withinLimit) return NextResponse.json({ error: "Batas pengiriman ulasan tercapai. Coba lagi sepuluh menit lagi." }, { status: 429 });

  const bytes = Buffer.from(await photo.arrayBuffer());
  const image = detectReviewImage(bytes);
  if (!image || image.mimeType !== photo.type) {
    return NextResponse.json({ error: "Foto harus berupa JPG, PNG, atau WebP yang valid." }, { status: 415 });
  }

  const reviewId = crypto.randomUUID();
  const imagePath = `${current.user.id}/${reviewId}.${image.extension}`;
  const { error: uploadError } = await admin.storage.from("customer-review-images").upload(imagePath, bytes, {
    contentType: image.mimeType,
    upsert: false
  });
  if (uploadError) {
    console.error("customer_review_image_upload_failed", { userId: current.user.id, message: uploadError.message });
    return NextResponse.json({ error: "Foto ulasan belum dapat disimpan. Coba lagi." }, { status: 500 });
  }

  const { data: review, error: insertError } = await admin.from("customer_reviews").insert({
    id: reviewId,
    user_id: current.user.id,
    display_name: parsed.data.displayName,
    review_text: parsed.data.reviewText,
    rating: parsed.data.rating,
    image_path: imagePath,
    review_status: "SUBMITTED",
    published: false
  }).select("id,review_status,published,created_at").single();

  if (insertError || !review) {
    const { error: cleanupError } = await admin.storage.from("customer-review-images").remove([imagePath]);
    if (cleanupError) console.error("customer_review_orphan_image_cleanup_failed", { reviewId, message: cleanupError.message });
    console.error("customer_review_insert_failed", { userId: current.user.id, code: insertError?.code });
    return NextResponse.json({ error: "Ulasan gagal dicatat." }, { status: 500 });
  }

  return NextResponse.json({ review }, { status: 201 });
}
