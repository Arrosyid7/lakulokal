"use client";

import { useState, type FormEvent } from "react";
import { z } from "zod";

type Review = {
  id: string;
  display_name: string;
  review_text: string;
  published: boolean;
  created_at: string;
  updated_at: string;
};

type ReviewDraft = Pick<Review, "display_name" | "review_text" | "published">;

const createdReviewSchema = z.object({
  review: z.object({
    id: z.string(),
    display_name: z.string(),
    review_text: z.string(),
    published: z.boolean(),
    created_at: z.string(),
    updated_at: z.string()
  })
});

export function AdminReviewsManager({ initialReviews }: { initialReviews: Review[] }) {
  const [reviews, setReviews] = useState(initialReviews);
  const [draft, setDraft] = useState<ReviewDraft>({ display_name: "", review_text: "", published: false });
  const [edits, setEdits] = useState<Record<string, ReviewDraft>>({});
  const [busyId, setBusyId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function addReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: draft.display_name,
          reviewText: draft.review_text,
          published: draft.published
        })
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message = result && typeof result === "object" && "error" in result && typeof result.error === "string"
          ? result.error
          : "Ulasan gagal disimpan.";
        throw new Error(message);
      }
      const createdReview = createdReviewSchema.safeParse(result);
      if (!createdReview.success) {
        throw new Error("Ulasan tersimpan, tetapi respons server tidak valid. Muat ulang halaman untuk memeriksa data.");
      }
      setReviews((current) => [createdReview.data.review, ...current]);
      setDraft({ display_name: "", review_text: "", published: false });
      setNotice("Ulasan berhasil disimpan.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ulasan gagal disimpan.");
    } finally {
      setBusy(false);
    }
  }

  async function saveReview(review: Review) {
    const next = edits[review.id] ?? review;
    setBusyId(review.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/reviews/${encodeURIComponent(review.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: next.display_name,
          reviewText: next.review_text,
          published: next.published
        })
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message = result && typeof result === "object" && "error" in result && typeof result.error === "string"
          ? result.error
          : "Ulasan gagal diperbarui.";
        throw new Error(message);
      }
      setReviews((current) => current.map((item) => item.id === review.id
        ? { ...item, ...next, updated_at: new Date().toISOString() }
        : item));
      setEdits((current) => {
        const updated = { ...current };
        delete updated[review.id];
        return updated;
      });
      setNotice("Perubahan ulasan berhasil disimpan.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ulasan gagal diperbarui.");
    } finally {
      setBusyId("");
    }
  }

  async function deleteReview(review: Review) {
    if (!window.confirm(`Hapus ulasan dari ${review.display_name}?`)) return;
    setBusyId(review.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/reviews/${encodeURIComponent(review.id)}`, { method: "DELETE" });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message = result && typeof result === "object" && "error" in result && typeof result.error === "string"
          ? result.error
          : "Ulasan gagal dihapus.";
        throw new Error(message);
      }
      setReviews((current) => current.filter((item) => item.id !== review.id));
      setEdits((current) => {
        const updated = { ...current };
        delete updated[review.id];
        return updated;
      });
      setNotice("Ulasan berhasil dihapus.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ulasan gagal dihapus.");
    } finally {
      setBusyId("");
    }
  }

  function updateEdit(review: Review, key: keyof ReviewDraft, value: string | boolean) {
    setEdits((current) => ({
      ...current,
      [review.id]: {
        ...(current[review.id] ?? review),
        [key]: value
      }
    }));
  }

  return (
    <div className="admin-reviews">
      <form className="panel admin-editor-form" onSubmit={addReview}>
        <h2>Tambah ulasan</h2>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="review-display-name">Nama tampilan</label>
            <input
              id="review-display-name"
              maxLength={80}
              required
              value={draft.display_name}
              onChange={(event) => setDraft((current) => ({ ...current, display_name: event.target.value }))}
              placeholder="Nama yang disetujui pengguna"
            />
          </div>
          <div className="field wide">
            <label htmlFor="review-text">Isi ulasan</label>
            <textarea
              id="review-text"
              rows={4}
              maxLength={600}
              required
              value={draft.review_text}
              onChange={(event) => setDraft((current) => ({ ...current, review_text: event.target.value }))}
              placeholder="Masukkan ulasan asli dari pengguna."
            />
          </div>
        </div>
        <label className="review-publish-option">
          <input
            type="checkbox"
            checked={draft.published}
            onChange={(event) => setDraft((current) => ({ ...current, published: event.target.checked }))}
          />
          Tampilkan ulasan di beranda
        </label>
        <button className="button button-accent" type="submit" disabled={busy}>
          {busy ? "Menyimpan..." : "Simpan ulasan"}
        </button>
      </form>

      <section className="admin-review-list" aria-labelledby="admin-review-list-title">
        <div className="admin-section-heading">
          <div>
            <p className="section-kicker">TERSIMPAN</p>
            <h2 id="admin-review-list-title">Ulasan yang sudah diinput</h2>
          </div>
          <span className="admin-count">{reviews.length} ulasan</span>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {notice && <p className="form-success" role="status">{notice}</p>}
        {!reviews.length ? (
          <p className="empty-state">Belum ada ulasan. Tambahkan ulasan asli setelah mendapat izin pengguna.</p>
        ) : (
          <div className="admin-review-items">
            {reviews.map((review) => {
              const current = edits[review.id] ?? review;
              const isBusy = busyId === review.id;
              return (
                <article className="admin-review-item" key={review.id}>
                  <div className="admin-review-item-heading">
                    <div>
                      <p className="section-kicker">{current.published ? "DITAMPILKAN DI BERANDA" : "DRAF"}</p>
                      <h3>{review.display_name}</h3>
                    </div>
                    <time dateTime={review.created_at}>{new Date(review.created_at).toLocaleDateString("id-ID")}</time>
                  </div>
                  <div className="field">
                    <label htmlFor={`review-name-${review.id}`}>Nama tampilan</label>
                    <input
                      id={`review-name-${review.id}`}
                      maxLength={80}
                      value={current.display_name}
                      onChange={(event) => updateEdit(review, "display_name", event.target.value)}
                      disabled={isBusy}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor={`review-copy-${review.id}`}>Isi ulasan</label>
                    <textarea
                      id={`review-copy-${review.id}`}
                      rows={3}
                      maxLength={600}
                      value={current.review_text}
                      onChange={(event) => updateEdit(review, "review_text", event.target.value)}
                      disabled={isBusy}
                    />
                  </div>
                  <label className="review-publish-option">
                    <input
                      type="checkbox"
                      checked={current.published}
                      onChange={(event) => updateEdit(review, "published", event.target.checked)}
                      disabled={isBusy}
                    />
                    Tampilkan di beranda
                  </label>
                  <div className="row">
                    <button className="button button-accent" type="button" disabled={isBusy} onClick={() => void saveReview(review)}>
                      {isBusy ? "Menyimpan..." : "Simpan perubahan"}
                    </button>
                    <button className="button button-secondary" type="button" disabled={isBusy} onClick={() => void deleteReview(review)}>
                      Hapus ulasan
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
