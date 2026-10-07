"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Props = { orderCode: string; initialStatus: string };

export function PaymentStatus({ orderCode, initialStatus }: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState("");
  useEffect(() => {
    if (status === "PAID" || status === "FAILED" || status === "EXPIRED" || status === "CANCELLED") return;
    let active = true;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/orders/${encodeURIComponent(orderCode)}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Status pembayaran belum dapat diperbarui.");
        const data = await response.json();
        if (active) {
          setStatus(data.order.payment_status);
          setError("");
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Status gagal dimuat.");
      }
    }, 4000);
    return () => { active = false; window.clearInterval(timer); };
  }, [orderCode, status]);

  return (
    <div className="stack">
      <p aria-live="polite">Status pembayaran: <strong>{status}</strong></p>
      {status === "PAID" ? <p>Pembayaran terverifikasi. Order masuk ke antrean pemrosesan.</p> : <p>Halaman ini memeriksa status pembayaran dari server. Jangan mengirim ulang pembayaran jika status sedang diperbarui.</p>}
      {error && <p className="form-error" role="status">{error}</p>}
      <Link className="text-link" href={`/dashboard/orders/${encodeURIComponent(orderCode)}`}>Lihat detail order</Link>
    </div>
  );
}
