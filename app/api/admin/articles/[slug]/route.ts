import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { siteArticleSchema } from "@/lib/site-content";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ slug: string }> };

export async function PUT(request: Request, { params }: RouteContext) {
  await requireAdmin();
  const { slug } = await params;
  const payload: unknown = await request.json().catch(() => null);
  const parsed = siteArticleSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data artikel tidak valid." }, { status: 400 });
  }
  if (parsed.data.slug !== slug) return NextResponse.json({ error: "Slug tidak dapat diubah saat mengedit artikel." }, { status: 400 });

  const { error } = await createSupabaseAdminClient().from("site_articles").upsert({
    ...parsed.data,
    updated_at: new Date().toISOString()
  }, { onConflict: "slug" });
  if (error) {
    console.error("admin_article_update_failed", { slug, code: error.code });
    return NextResponse.json({ error: "Artikel gagal disimpan." }, { status: 500 });
  }
  return NextResponse.json({ slug });
}
