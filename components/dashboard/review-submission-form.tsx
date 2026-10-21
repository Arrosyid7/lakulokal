"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function ReviewSubmissionForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/reviews", { method: "POST", body: values });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Ulasan belum dapat dikirim.");
      setNotice("Ulasan terkirim. Admin akan memeriksa ulasan dan foto sebelum menampilkannya.");
      form.reset();
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ulasan belum dapat dikirim.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel review-form" onSubmit={submit}>
      <div className="field">
        <label htmlFor="review-display-name">Nama yang ditampilkan</label>
        <input id="review-display-name" name="displayName" autoComplete="name" maxLength={80} required disabled={busy} />
      </div>
      <div className="field">
        <label htmlFor="review-text">Ulasan</label>
        <textarea id="review-text" name="reviewText" rows={4} minLength={1} maxLength={600} required disabled={busy} />
        <small>Maksimal 600 karakter. Ceritakan pengalaman menggunakan LakuLokal.</small>
      </div>
      <fieldset className="review-star-options">
        <legend>Penilaian bintang</legend>
        {[1, 2, 3, 4, 5].map((rating) => (
          <label className="review-star-option" key={rating}>
            <input type="radio" name="rating" value={rating} aria-label={`${rating} bintang`} required disabled={busy} />
            <span aria-hidden="true">★</span>
          </label>
        ))}
      </fieldset>
      <div className="field">
        <label htmlFor="review-photo">Foto terkait pengalaman dengan LakuLokal</label>
        <input
          id="review-photo"
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          disabled={busy}
          aria-describedby="review-photo-help"
        />
        <small id="review-photo-help">
          Wajib. Unggah screenshot halaman atau hasil LakuLokal, atau foto lain yang menunjukkan penggunaan LakuLokal. JPG, PNG, atau WebP maksimal 5 MB. Admin memeriksa foto sebelum ulasan ditampilkan.
        </small>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && <p className="form-success" role="status" aria-live="polite">{notice}</p>}
      <button className="button button-accent" type="submit" disabled={busy}>
        {busy ? "Mengirim ulasan..." : "Kirim ulasan"}
      </button>
    </form>
  );
}

export type ReviewSubmissionRow = {
  id: string;
  display_name: string;
  review_text: string;
  rating: number | null;
  image_path: string | null;
  review_status: "SUBMITTED" | "PUBLISHED" | "REJECTED";
  created_at: string;
};

export function ReviewSubmissionHistory({ reviews }: { reviews: ReviewSubmissionRow[] }) {
  if (!reviews.length) {
    return <p className="empty-state">Belum ada ulasan yang dikirim. Setelah mengirim, status pemeriksaannya tampil di sini.</p>;
  }

  return (
    <div className="review-owner-items">
      {reviews.map((review) => (
        <article className="review-owner-item" key={review.id}>
          <p className="review-owner-status">
            {review.review_status === "PUBLISHED"
              ? "Disetujui dan ditampilkan"
              : review.review_status === "REJECTED"
                ? "Tidak dapat ditampilkan"
                : "Menunggu pemeriksaan admin"}
          </p>
          {review.rating !== null && <p aria-label={`Penilaian ${review.rating} dari 5 bintang`}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</p>}
          <p>{review.review_text}</p>
          <time dateTime={review.created_at}>{new Date(review.created_at).toLocaleDateString("id-ID")}</time>
        </article>
      ))}
    </div>
  );
}
