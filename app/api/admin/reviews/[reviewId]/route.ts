import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const reviewIdSchema = z.string().uuid();
const updateSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  reviewText: z.string().trim().min(1).max(600),
  published: z.boolean()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ reviewId: string }> }) {
  await requireAdmin();
  const { reviewId } = await params;
  if (!reviewIdSchema.safeParse(reviewId).success) {
    return NextResponse.json({ error: "ID ulasan tidak valid." }, { status: 400 });
  }

  const payload: unknown = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data ulasan tidak valid." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("customer_reviews").update({
    display_name: parsed.data.displayName,
    review_text: parsed.data.reviewText,
    published: parsed.data.published,
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
  const { data, error } = await admin.from("customer_reviews").delete().eq("id", reviewId).select("id").maybeSingle();
  if (error) {
    console.error("admin_review_delete_failed", { reviewId, code: error.code });
    return NextResponse.json({ error: "Ulasan gagal dihapus." }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Ulasan tidak ditemukan." }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
