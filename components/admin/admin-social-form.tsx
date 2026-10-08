"use client";

import { useState } from "react";
import type { SocialLinks } from "@/lib/site-content";

export function AdminSocialForm({ initialLinks }: { initialLinks: SocialLinks }) {
  const [links, setLinks] = useState(initialLinks);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const response = await fetch("/api/admin/site-configuration", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "social",
          instagram_url: links.instagramUrl,
          facebook_url: links.facebookUrl,
          tiktok_url: links.tiktokUrl
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Tautan media sosial gagal disimpan.");
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Tautan media sosial gagal disimpan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel form-stack admin-social-form" onSubmit={save}>
      {([
        ["instagramUrl", "Instagram", "https://www.instagram.com/akun"],
        ["facebookUrl", "Facebook", "https://www.facebook.com/akun"],
        ["tiktokUrl", "TikTok", "https://www.tiktok.com/@akun"]
      ] as const).map(([key, label, placeholder]) => (
        <div className="field" key={key}>
          <label htmlFor={`social-${key}`}>{label}</label>
          <input
            id={`social-${key}`}
            type="url"
            inputMode="url"
            autoComplete="url"
            placeholder={placeholder}
            value={links[key]}
            onChange={(event) => {
              setLinks((current) => ({ ...current, [key]: event.target.value }));
              setSaved(false);
            }}
          />
          <small>Gunakan alamat HTTPS profil {label} yang benar. Kolom kosong akan menyembunyikan tautan dari footer.</small>
        </div>
      ))}
      {error && <p className="form-error" role="alert">{error}</p>}
      {saved && <p className="form-success" role="status">Tautan media sosial sudah disimpan.</p>}
      <button className="button button-accent" type="submit" disabled={busy}>
        {busy ? "Menyimpan..." : "Simpan tautan sosial"}
      </button>
    </form>
  );
}
