import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const reviewSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  reviewText: z.string().trim().min(1).max(600),
  published: z.boolean()
});

export async function POST(request: Request) {
  await requireAdmin();
  const payload: unknown = await request.json().catch(() => null);
  const parsed = reviewSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data ulasan tidak valid." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("customer_reviews").insert({
    display_name: parsed.data.displayName,
    review_text: parsed.data.reviewText,
    published: parsed.data.published
  }).select("id,display_name,review_text,published,created_at,updated_at").single();
  if (error || !data) {
    console.error("admin_review_create_failed", { code: error?.code });
    return NextResponse.json({ error: "Ulasan gagal disimpan." }, { status: 500 });
  }
  return NextResponse.json({ review: data }, { status: 201 });
}
