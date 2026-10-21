import { ReviewSubmissionForm, ReviewSubmissionHistory } from "@/components/dashboard/review-submission-form";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const { supabase, user } = await requireUser();
  const { data: reviews, error } = await supabase.from("customer_reviews")
    .select("id,display_name,review_text,rating,image_path,review_status,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <main id="account-content" className="container app-main">
      <header className="dashboard-page-heading">
        <p className="section-kicker">Pengalaman pengguna</p>
        <h1 className="page-title">Kirim ulasan.</h1>
        <p className="page-lead">Ulasan dan foto wajib diperiksa admin sebelum ditampilkan di beranda.</p>
      </header>
      <div className="new-order-layout">
        <ReviewSubmissionForm />
        <aside className="profile-note">
          <h2>Status ulasan</h2>
          {error
            ? <p className="form-error" role="alert">Status ulasan gagal dimuat. Muat ulang halaman untuk mencoba lagi.</p>
            : <ReviewSubmissionHistory reviews={reviews ?? []} />}
        </aside>
      </div>
    </main>
  );
}
