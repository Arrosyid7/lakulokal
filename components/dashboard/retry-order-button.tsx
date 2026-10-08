"use client";

import { useState } from "react";

export function RetryOrderButton({ orderCode }: { orderCode: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function retry() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderCode)}/retry`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Job tidak dapat dijalankan ulang.");
      setMessage("Order siap. Minta pemiliknya membuka detail order dan memilih ulang video.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Job tidak dapat dijalankan ulang.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <button className="button button-secondary" type="button" onClick={retry} disabled={busy}>
        {busy ? "Mengirim..." : "Coba ulang"}
      </button>
      {message && <p className="muted" role="status">{message}</p>}
    </div>
  );
}
