"use client";

import { useState } from "react";

type Download = { file_name: string; url: string };

export function DownloadLinks({ orderCode, clipCount }: { orderCode: string; clipCount: number }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [zip, setZip] = useState<Download | null>(null);
  async function createLinks() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderCode)}/download`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Tautan unduhan gagal dibuat.");
      setDownloads(result.downloads);
      setZip(result.zip);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Tautan unduhan gagal dibuat.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="stack">
      <p className="muted">{clipCount} file clip tersedia. Tautan berlaku selama 5 menit.</p>
      <button className="button button-accent" type="button" disabled={busy} onClick={createLinks}>
        {busy ? "Menyiapkan tautan..." : "Buat tautan unduhan"}
      </button>
      {error && <p className="form-error" role="alert">{error}</p>}
      {downloads.length > 0 && (
        <ul className="stack">
          {downloads.map((download) => (
            <li key={download.file_name}>
              <a className="text-link" href={download.url}>{download.file_name}</a>
            </li>
          ))}
          {zip && <li><a className="text-link" href={zip.url}>Unduh semua clip (ZIP)</a></li>}
        </ul>
      )}
    </div>
  );
}
