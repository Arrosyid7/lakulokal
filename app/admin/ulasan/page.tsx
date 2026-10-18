import { AdminReviewsManager } from "@/components/admin/admin-reviews-manager";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  await requireAdmin();
  const { data: reviews, error } = await createSupabaseAdminClient()
    .from("customer_reviews")
    .select("id,display_name,review_text,published,created_at,updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("admin_reviews_load_failed", { code: error.code });
  }

  return (
    <main className="container app-main">
      <h1 className="page-title">Ulasan pengguna</h1>
      <p className="page-lead">
        Masukkan ulasan asli yang sudah mendapat izin untuk ditampilkan. Ulasan tersimpan sebagai draf sampai Anda memilih untuk menerbitkannya.
      </p>
      {error ? (
        <p className="form-error" role="alert">Daftar ulasan gagal dimuat. Periksa migrasi ulasan dan izin database admin.</p>
      ) : (
        <AdminReviewsManager initialReviews={reviews ?? []} />
      )}
    </main>
  );
}
