import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function HomeReviews() {
  let reviews: { id: string; display_name: string; review_text: string }[] | null = null;
  let failed = false;
  try {
    const supabase = await createSupabaseServerClient();
    const result = await supabase.from("customer_reviews")
      .select("id,display_name,review_text")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(6);
    reviews = result.data;
    failed = Boolean(result.error);
    if (result.error) console.error("home_reviews_load_failed", { code: result.error.code });
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
                <blockquote>
                  <p>{review.review_text}</p>
                  <footer><cite>{review.display_name}</cite></footer>
                </blockquote>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-state">Belum ada ulasan yang dipublikasikan. Ulasan akan muncul di sini setelah admin menambahkannya.</p>
        )}
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
