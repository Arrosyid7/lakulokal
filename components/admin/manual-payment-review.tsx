"use client";

import Image from "next/image";
import { useState } from "react";

export type ManualPaymentReviewItem = {
  id: string;
  orderCode: string;
  userId: string;
  packageName: string;
  amount: number;
  currency: string;
  ocrAmount: number;
  transactionDate: string;
  submittedAt: string;
  imageUrl: string;
};

export function ManualPaymentReview({ initialItems }: { initialItems: ManualPaymentReviewItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

  async function review(item: ManualPaymentReviewItem, decision: "APPROVE" | "REJECT") {
    setBusyId(item.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/payment-proofs/${encodeURIComponent(item.id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note: notes[item.id] ?? "" })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Pemeriksaan bukti gagal disimpan.");
      setItems((current) => current.filter(({ id }) => id !== item.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Pemeriksaan bukti gagal disimpan.");
    } finally {
      setBusyId("");
    }
  }

  if (!items.length) {
    return <p className="empty-state">Tidak ada bukti pembayaran yang menunggu pemeriksaan.</p>;
  }

  return (
    <div className="payment-review-list">
      {error && <p className="form-error" role="alert">{error}</p>}
      {items.map((item) => (
        <article className="payment-review-item" key={item.id}>
          <div className="payment-review-evidence">
            <a href={item.imageUrl} target="_blank" rel="noreferrer" aria-label={`Buka bukti pembayaran order ${item.orderCode} di tab baru`}>
              <Image
                src={item.imageUrl}
                alt={`Bukti pembayaran untuk order ${item.orderCode}`}
                width={360}
                height={360}
                unoptimized
              />
            </a>
          </div>
          <div className="stack">
            <h3>{item.orderCode}</h3>
            <p>Paket: {item.packageName}</p>
            <p>Pemilik order: {item.userId}</p>
            <p>Nominal order: <strong>{money.format(item.amount)}</strong></p>
            <p>Hasil OCR: {money.format(item.ocrAmount)} · tanggal {item.transactionDate}</p>
            <p>Dikirim: <time dateTime={item.submittedAt}>{new Date(item.submittedAt).toLocaleString("id-ID")}</time></p>
            <p className="form-error" role="note">
              OCR tidak membuktikan dana masuk. Cocokkan transaksi langsung di rekening atau aplikasi merchant sebelum menyetujui. Pengguna sudah dapat mengunduh clip sebelum pemeriksaan ini.
            </p>
            <div className="field">
              <label htmlFor={`review-note-${item.id}`}>Catatan penolakan (opsional)</label>
              <textarea
                id={`review-note-${item.id}`}
                rows={2}
                maxLength={400}
                value={notes[item.id] ?? ""}
                onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))}
                disabled={busyId === item.id}
              />
            </div>
            <div className="row">
              <button className="button button-accent" type="button" disabled={busyId === item.id} onClick={() => void review(item, "APPROVE")}>
                {busyId === item.id ? "Menyimpan..." : "Konfirmasi pembayaran"}
              </button>
              <button className="button button-secondary" type="button" disabled={busyId === item.id} onClick={() => void review(item, "REJECT")}>
                Tolak bukti
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
