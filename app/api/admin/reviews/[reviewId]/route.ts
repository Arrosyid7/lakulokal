import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const reviewIdSchema = z.string().uuid();
const decisionSchema = z.object({ decision: z.enum(["APPROVE", "REJECT"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ reviewId: string }> }) {
  await requireAdmin();
  const { reviewId } = await params;
  if (!reviewIdSchema.safeParse(reviewId).success) {
    return NextResponse.json({ error: "ID ulasan tidak valid." }, { status: 400 });
  }

  const payload: unknown = await request.json().catch(() => null);
  const parsed = decisionSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data ulasan tidak valid." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  if (parsed.data.decision === "APPROVE") {
    const { data: review, error: queryError } = await admin.from("customer_reviews")
      .select("user_id,rating,image_path")
      .eq("id", reviewId)
      .maybeSingle();
    if (queryError) {
      console.error("admin_review_approval_query_failed", { reviewId, code: queryError.code });
      return NextResponse.json({ error: "Data ulasan gagal diperiksa." }, { status: 500 });
    }
    if (!review) return NextResponse.json({ error: "Ulasan tidak ditemukan." }, { status: 404 });
    if (!review.user_id || review.rating === null || !review.image_path) {
      return NextResponse.json({ error: "Ulasan lama tanpa foto dan penilaian tidak dapat diterbitkan." }, { status: 409 });
    }
  }

  const { data, error } = await admin.from("customer_reviews").update({
    published: parsed.data.decision === "APPROVE",
    review_status: parsed.data.decision === "APPROVE" ? "PUBLISHED" : "REJECTED",
    updated_at: new Date().toISOString()
  }).eq("id", reviewId).select("id").maybeSingle();
  if (error) {
    console.error("admin_review_update_failed", { reviewId, code: error.code });
    return NextResponse.json({ error: "Ulasan gagal diperbarui." }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Ulasan tidak ditemukan." }, { status: 404 });
  return NextResponse.json({ saved: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ reviewId: string }> }) {
  await requireAdmin();
  const { reviewId } = await params;
  if (!reviewIdSchema.safeParse(reviewId).success) {
    return NextResponse.json({ error: "ID ulasan tidak valid." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: review, error: queryError } = await admin.from("customer_reviews")
    .select("image_path")
    .eq("id", reviewId)
    .maybeSingle();
  if (queryError) {
    console.error("admin_review_delete_query_failed", { reviewId, code: queryError.code });
    return NextResponse.json({ error: "Ulasan gagal diperiksa sebelum dihapus." }, { status: 500 });
  }
  if (!review) return NextResponse.json({ error: "Ulasan tidak ditemukan." }, { status: 404 });

  const { data, error } = await admin.from("customer_reviews").delete().eq("id", reviewId).select("id").maybeSingle();
  if (error) {
    console.error("admin_review_delete_failed", { reviewId, code: error.code });
    return NextResponse.json({ error: "Ulasan gagal dihapus." }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Ulasan tidak ditemukan." }, { status: 404 });
  if (review.image_path) {
    const { error: storageError } = await admin.storage.from("customer-review-images").remove([review.image_path]);
    if (storageError) console.error("admin_review_image_delete_failed", { reviewId, message: storageError.message });
  }
  return NextResponse.json({ deleted: true });
}
