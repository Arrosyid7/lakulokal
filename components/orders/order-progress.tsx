"use client";

import { useEffect, useState } from "react";

const labels: Record<string, string> = {
  WAITING_PAYMENT: "Menunggu pembayaran",
  QUEUED: "Masuk antrean",
  DOWNLOADING: "Mengunduh video",
  PROCESSING: "Membuat clip",
  UPLOADING: "Menyimpan hasil",
  COMPLETED: "Selesai",
  FAILED: "Gagal"
};

export function OrderProgress({ orderCode, initialStatus }: { orderCode: string; initialStatus: string }) {
  const [status, setStatus] = useState(initialStatus);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  useEffect(() => {
    if (status === "COMPLETED" || status === "FAILED") return;
    let active = true;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/orders/${encodeURIComponent(orderCode)}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Status proses belum dapat diperbarui.");
        const result = await response.json();
        if (active) {
          setStatus(result.order.processing_status);
          setProgress(result.progress ?? 0);
          setError("");
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Status proses gagal dimuat.");
      }
    }, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [orderCode, status]);

  return (
    <div>
      <strong>Pemrosesan</strong>
      <p className="muted" aria-live="polite">{labels[status] || status}{status !== "COMPLETED" && status !== "FAILED" ? `, ${progress}%` : ""}</p>
      {error && <p className="form-error" role="status">{error}</p>}
    </div>
  );
}
