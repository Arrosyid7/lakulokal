"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type PackageOption = { id: string; name: string; clip_count: number; price: number; currency: string };

export function OrderForm({ packages }: { packages: PackageOption[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          youtube_url: form.get("youtube_url"),
          package_id: form.get("package_id")
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Order tidak dapat dibuat.");
      router.push(`/payment/${encodeURIComponent(result.order.order_code)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Order tidak dapat dibuat.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="panel form-stack" onSubmit={submit}>
      <div className="field">
        <label htmlFor="youtube_url">URL video YouTube</label>
        <input id="youtube_url" name="youtube_url" type="url" placeholder="https://www.youtube.com/watch?v=..." required />
      </div>
      <div className="field">
        <label htmlFor="package_id">Paket</label>
        <select id="package_id" name="package_id" required defaultValue="">
          <option value="" disabled>Pilih paket</option>
          {packages.map((item) => (
            <option value={item.id} key={item.id}>
              {item.name}, {item.clip_count} clip, {new Intl.NumberFormat("id-ID", { style: "currency", currency: item.currency, maximumFractionDigits: 0 }).format(item.price)}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {packages.length === 0 && <p className="form-error">Belum ada paket yang aktif. Silakan hubungi pengelola.</p>}
      <button className="button button-accent" type="submit" disabled={busy || packages.length === 0}>
        {busy ? "Membuat order..." : "Buat order dan lanjut ke DANA"}
      </button>
    </form>
  );
}
