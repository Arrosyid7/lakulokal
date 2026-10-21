import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import Image from "next/image";
import Link from "next/link";

export async function HomeReviews() {
  let reviews: { id: string; display_name: string; review_text: string; rating: number; imageUrl: string }[] | null = null;
  let failed = false;
  let signedIn = false;
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError && userError.name !== "AuthSessionMissingError") throw userError;
    signedIn = Boolean(user);
    const result = await supabase.from("customer_reviews")
      .select("id,display_name,review_text,rating,image_path")
      .eq("published", true)
      .eq("review_status", "PUBLISHED")
      .not("rating", "is", null)
      .not("image_path", "is", null)
      .order("created_at", { ascending: false })
      .limit(6);
    if (result.error) {
      console.error("home_reviews_load_failed", { code: result.error.code });
      failed = true;
    } else {
      const admin = createSupabaseAdminClient();
      const storage = admin.storage.from("customer-review-images");
      reviews = await Promise.all((result.data ?? []).map(async (review) => {
        if (!review.image_path || review.rating === null) {
          throw new Error(`Published customer review ${review.id} is missing required display data.`);
        }
        const { data: signed, error: signedError } = await storage.createSignedUrl(review.image_path, 300);
        if (signedError || !signed?.signedUrl) {
          throw new Error(`Review image URL could not be created: ${review.id}`);
        }
        return { ...review, rating: review.rating, imageUrl: signed.signedUrl };
      }));
    }
  } catch (error) {
    failed = true;
    console.error("home_reviews_load_failed", {
      message: error instanceof Error ? error.message : "unknown"
    });
  }

  return (
    <section className="section review-section" id="ulasan" aria-labelledby="review-section-title">
      <div className="container review-layout">
        <div className="section-intro">
          <p className="section-kicker">ULASAN</p>
          <h2 id="review-section-title">Ulasan pengguna LakuLokal.</h2>
        </div>
        {failed ? (
          <p className="form-error" role="alert">Ulasan belum dapat dimuat. Muat ulang halaman untuk mencoba kembali.</p>
        ) : reviews?.length ? (
          <div className="review-cards">
            {reviews.map((review) => (
              <article className="review-card" key={review.id}>
                  <Image
                    className="review-card-image"
                    src={review.imageUrl}
                    alt={`Foto bukti pengalaman LakuLokal dari ${review.display_name}`}
                    width={360}
                    height={280}
                    unoptimized
                  />
                  <p className="review-rating" aria-label={`Penilaian ${review.rating} dari 5 bintang`}>
                    {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                  </p>
                  <blockquote>
                    <p>{review.review_text}</p>
                    <footer><cite>{review.display_name}</cite></footer>
                </blockquote>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-state">Belum ada ulasan pengguna yang ditampilkan. Kirim ulasan beserta foto terkait LakuLokal untuk diajukan ke admin.</p>
        )}
        <Link className="review-submit-link" href={signedIn ? "/dashboard/review" : "/login?next=%2Fdashboard%2Freview"}>
          Kirim ulasan
        </Link>
      </div>
    </section>
  );
}

export function HomeReviewsLoading() {
  return (
    <section className="section review-section" id="ulasan" aria-labelledby="review-section-title">
      <div className="container review-layout">
        <div className="section-intro">
          <p className="section-kicker">ULASAN</p>
          <h2 id="review-section-title">Ulasan pengguna LakuLokal.</h2>
        </div>
        <p className="muted" role="status" aria-live="polite">Memuat ulasan pengguna...</p>
      </div>
    </section>
  );
}
