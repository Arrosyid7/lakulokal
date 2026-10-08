import { AdminSocialForm } from "@/components/admin/admin-social-form";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SocialLinks } from "@/lib/site-content";

export const dynamic = "force-dynamic";

export default async function AdminSocialPage() {
  const { data, error } = await createSupabaseAdminClient().from("site_configuration")
    .select("instagram_url,facebook_url,tiktok_url")
    .eq("id", "main")
    .maybeSingle();
  const links: SocialLinks = {
    instagramUrl: data?.instagram_url ?? "",
    facebookUrl: data?.facebook_url ?? "",
    tiktokUrl: data?.tiktok_url ?? ""
  };
  return (
    <main className="container app-main">
      <h1 className="page-title">Tautan media sosial</h1>
      <p className="page-lead">Tautan yang diisi akan tampil di footer situs. Kolom kosong tidak menampilkan tautan.</p>
      {error ? (
        <p className="form-error" role="alert">Pengaturan sosial gagal dimuat. Periksa migrasi pengelolaan konten.</p>
      ) : (
        <AdminSocialForm initialLinks={links} />
      )}
    </main>
  );
}
