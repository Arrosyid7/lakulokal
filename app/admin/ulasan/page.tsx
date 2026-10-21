import { AdminReviewsManager } from "@/components/admin/admin-reviews-manager";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  await requireAdmin();
  const admin = createSupabaseAdminClient();
  const { data: reviews, error } = await admin
    .from("customer_reviews")
    .select("id,user_id,display_name,review_text,rating,image_path,review_status,published,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("admin_reviews_load_failed", { code: error.code });
  }
  let preparedReviews = null;
  let imageError = false;
  if (reviews && !error) {
    try {
      const storage = admin.storage.from("customer-review-images");
      preparedReviews = await Promise.all(reviews.map(async (review) => {
        let image_url: string | null = null;
        if (review.image_path) {
          const { data, error: signedError } = await storage.createSignedUrl(review.image_path, 300);
          if (signedError || !data?.signedUrl) throw new Error(`Customer review image URL unavailable: ${review.id}`);
          image_url = data.signedUrl;
        }
        return { ...review, image_url };
      }));
    } catch (cause) {
      imageError = true;
      console.error("admin_reviews_image_signing_failed", {
        message: cause instanceof Error ? cause.message : "unknown"
      });
    }
  }

  return (
    <main className="container app-main">
      <h1 className="page-title">Ulasan pengguna</h1>
      <p className="page-lead">
        Periksa nama, ulasan, penilaian, dan foto kiriman pengguna. Hanya kiriman yang disetujui ditampilkan di beranda. Ulasan lama tanpa foto tidak dapat diterbitkan.
      </p>
      {error ? (
        <p className="form-error" role="alert">Daftar ulasan gagal dimuat. Periksa migrasi ulasan dan izin database admin.</p>
      ) : imageError ? (
        <p className="form-error" role="alert">Foto ulasan gagal dimuat untuk pemeriksaan. Periksa bucket customer-review-images, lalu muat ulang.</p>
      ) : (
        <AdminReviewsManager initialReviews={preparedReviews ?? []} />
      )}
    </main>
  );
}
