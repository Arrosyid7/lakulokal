import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { landingContentSchema } from "@/lib/site-content";

export const runtime = "nodejs";

const hostByPlatform = {
  instagram_url: ["instagram.com"],
  facebook_url: ["facebook.com", "fb.com"],
  tiktok_url: ["tiktok.com"]
} as const;

const socialUrl = (hosts: readonly string[]) => z.string().trim().refine((value) => {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && hosts.some((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}, "Masukkan URL HTTPS dari platform sosial yang sesuai.");

const payloadSchema = z.discriminatedUnion("section", [
  z.object({ section: z.literal("landing"), content: landingContentSchema }),
  z.object({
    section: z.literal("social"),
    instagram_url: socialUrl(hostByPlatform.instagram_url),
    facebook_url: socialUrl(hostByPlatform.facebook_url),
    tiktok_url: socialUrl(hostByPlatform.tiktok_url)
  })
]);

export async function PUT(request: Request) {
  await requireAdmin();
  const payload: unknown = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data pengaturan tidak valid." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: existing, error: readError } = await admin.from("site_configuration")
    .select("id")
    .eq("id", "main")
    .maybeSingle();
  if (readError) {
    console.error("admin_site_configuration_query_failed", { code: readError.code });
    return NextResponse.json({ error: "Pengaturan gagal diperiksa." }, { status: 500 });
  }

  const update = parsed.data.section === "landing"
    ? { landing_content: parsed.data.content, updated_at: new Date().toISOString() }
    : {
        instagram_url: parsed.data.instagram_url || null,
        facebook_url: parsed.data.facebook_url || null,
        tiktok_url: parsed.data.tiktok_url || null,
        updated_at: new Date().toISOString()
      };
  const { error } = existing
    ? await admin.from("site_configuration").update(update).eq("id", "main")
    : await admin.from("site_configuration").insert({ id: "main", ...update });
  if (error) {
    console.error("admin_site_configuration_save_failed", { code: error.code });
    return NextResponse.json({ error: "Pengaturan gagal disimpan." }, { status: 500 });
  }
  return NextResponse.json({ saved: true });
}
