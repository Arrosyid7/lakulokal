import { AdminLandingForm } from "@/components/admin/admin-landing-form";
import { DEFAULT_LANDING_CONTENT, parseLandingContent } from "@/lib/site-content";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminLandingPage() {
  const { data, error } = await createSupabaseAdminClient().from("site_configuration")
    .select("landing_content")
    .eq("id", "main")
    .maybeSingle();
  const content = parseLandingContent(data?.landing_content);
  return (
    <main className="container app-main">
      <h1 className="page-title">Konten landing page</h1>
      <p className="page-lead">Ubah teks, metadata pencarian, FAQ, dan langkah kerja. Susunan bagian serta gambar tetap mengikuti desain situs.</p>
      {error ? (
        <p className="form-error" role="alert">Konten landing page gagal dimuat. Periksa migrasi pengelolaan konten.</p>
      ) : content ? (
        <AdminLandingForm initialContent={content} />
      ) : (
        <div className="stack">
          <p className="form-error" role="alert">Konten landing page tersimpan tidak valid. Muat ulang data bawaan setelah memeriksa isi database.</p>
          <AdminLandingForm initialContent={DEFAULT_LANDING_CONTENT} />
        </div>
      )}
    </main>
  );
}
