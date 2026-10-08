import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { siteArticleSchema } from "@/lib/site-content";

export const runtime = "nodejs";

export async function POST(request: Request) {
  await requireAdmin();
  const payload: unknown = await request.json().catch(() => null);
  const parsed = siteArticleSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data artikel tidak valid." }, { status: 400 });
  }
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("site_articles").insert({
    ...parsed.data,
    updated_at: new Date().toISOString()
  });
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Slug artikel sudah digunakan." }, { status: 409 });
    console.error("admin_article_create_failed", { code: error.code });
    return NextResponse.json({ error: "Artikel gagal disimpan." }, { status: 500 });
  }
  return NextResponse.json({ slug: parsed.data.slug }, { status: 201 });
}
