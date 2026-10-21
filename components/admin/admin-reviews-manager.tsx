"use client";

import Image from "next/image";
import { useState } from "react";

export type AdminReview = {
  id: string;
  user_id: string | null;
  display_name: string;
  review_text: string;
  rating: number | null;
  image_path: string | null;
  image_url: string | null;
  review_status: "SUBMITTED" | "PUBLISHED" | "REJECTED";
  published: boolean;
  created_at: string;
};

export function AdminReviewsManager({ initialReviews }: { initialReviews: AdminReview[] }) {
  const [reviews, setReviews] = useState(initialReviews);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function review(item: AdminReview, decision: "APPROVE" | "REJECT") {
    setBusyId(item.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/reviews/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Keputusan ulasan gagal disimpan.");
      setReviews((current) => current.map((entry) => entry.id === item.id
        ? {
            ...entry,
            published: decision === "APPROVE",
            review_status: decision === "APPROVE" ? "PUBLISHED" : "REJECTED"
          }
        : entry));
      setNotice(decision === "APPROVE" ? "Ulasan disetujui dan ditampilkan." : "Ulasan ditolak.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Keputusan ulasan gagal disimpan.");
    } finally {
      setBusyId("");
    }
  }

  async function deleteReview(item: AdminReview) {
    if (!window.confirm(`Hapus ulasan dari ${item.display_name}?`)) return;
    setBusyId(item.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/reviews/${encodeURIComponent(item.id)}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Ulasan gagal dihapus.");
      setReviews((current) => current.filter((entry) => entry.id !== item.id));
      setNotice("Ulasan dihapus.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ulasan gagal dihapus.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <section className="admin-review-list" aria-labelledby="admin-review-list-title">
      <div className="admin-section-heading">
        <div>
          <p className="section-kicker">KIRIMAN PENGGUNA</p>
          <h2 id="admin-review-list-title">Ulasan untuk diperiksa</h2>
        </div>
        <span className="admin-count">{reviews.length} ulasan</span>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && <p className="form-success" role="status">{notice}</p>}
      {!reviews.length ? (
        <p className="empty-state">Belum ada kiriman ulasan. Ulasan pengguna akan tampil di sini untuk diperiksa.</p>
      ) : (
        <div className="admin-review-items">
          {reviews.map((item) => {
            const isBusy = busyId === item.id;
            return (
              <article className="admin-review-item" key={item.id}>
                <div className="admin-review-item-heading">
                  <div>
                    <p className="section-kicker">
                      {item.review_status === "PUBLISHED" ? "DITAMPILKAN DI BERANDA"
                        : item.review_status === "REJECTED" ? "DITOLAK" : "MENUNGGU PEMERIKSAAN"}
                    </p>
                    <h3>{item.display_name}</h3>
                  </div>
                  <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleDateString("id-ID")}</time>
                </div>
                {item.user_id && <p className="muted">Akun pengirim: {item.user_id}</p>}
                {item.rating !== null
                  ? <p aria-label={`Penilaian ${item.rating} dari 5 bintang`}>{"★".repeat(item.rating)}{"☆".repeat(5 - item.rating)}</p>
                  : <p className="muted">Ulasan lama, tanpa penilaian bintang.</p>}
                <p>{item.review_text}</p>
                {item.image_url
                  ? <Image className="admin-review-image" src={item.image_url} alt={`Foto dari ${item.display_name} untuk ulasan LakuLokal`} width={360} height={360} unoptimized />
                  : <p className="form-error" role="note">Foto tidak tersedia. Ulasan ini tidak dapat ditampilkan sebagai kiriman baru.</p>}
                <div className="row">
                  {item.review_status !== "PUBLISHED" && item.image_url && item.rating !== null && (
                    <button className="button button-accent" type="button" disabled={isBusy} onClick={() => void review(item, "APPROVE")}>
                      {isBusy ? "Menyimpan..." : "Setujui dan tampilkan"}
                    </button>
                  )}
                  {item.review_status !== "REJECTED" && (
                    <button className="button button-secondary" type="button" disabled={isBusy} onClick={() => void review(item, "REJECT")}>
                      Tolak ulasan
                    </button>
                  )}
                  <button className="button button-secondary" type="button" disabled={isBusy} onClick={() => void deleteReview(item)}>
                    Hapus ulasan
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
