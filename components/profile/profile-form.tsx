"use client";

import { useState, type FormEvent } from "react";

export function ProfileForm({ fullName, email }: { fullName: string; email: string }) {
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setFailed(false);
    const full_name = String(new FormData(event.currentTarget).get("full_name") || "").trim();
    try {
      const response = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Profil gagal disimpan.");
      setMessage("Nama profil berhasil disimpan.");
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "Profil gagal disimpan.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="panel form-stack" onSubmit={submit}>
      <div className="field">
        <label htmlFor="full_name">Nama</label>
        <input id="full_name" name="full_name" defaultValue={fullName} required maxLength={120} />
      </div>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" value={email} readOnly aria-describedby="email-note" />
        <small id="email-note" className="muted">Perubahan email harus melalui verifikasi Supabase Auth.</small>
      </div>
      {message && <p className={failed ? "form-error" : "form-success"} role="status">{message}</p>}
      <button className="button" type="submit" disabled={busy}>{busy ? "Menyimpan..." : "Simpan perubahan"}</button>
    </form>
  );
}
