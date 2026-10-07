"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AppNavigation({ fullName, isAdmin }: { fullName: string; isAdmin: boolean }) {
  const router = useRouter();
  const [logoutError, setLogoutError] = useState("");
  async function signOut() {
    const { error } = await createSupabaseBrowserClient().auth.signOut();
    if (error) {
      setLogoutError("Logout gagal. Silakan coba lagi.");
      return;
    }
    router.replace("/login");
    router.refresh();
  }
  return (
    <header className="app-header">
      <div className="container app-nav">
        <Link className="brand" href="/dashboard">LakuLokal</Link>
        <nav className="app-nav-links" aria-label="Navigasi akun">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/dashboard/new">Buat clip</Link>
          <Link href="/dashboard/orders">Riwayat</Link>
          <Link href="/dashboard/profile">Profil</Link>
          {isAdmin && <Link href="/admin">Admin</Link>}
          <span className="muted">{fullName}</span>
          <button className="button button-secondary" type="button" onClick={signOut}>Keluar</button>
        </nav>
        {logoutError && <p className="form-error" role="alert">{logoutError}</p>}
      </div>
    </header>
  );
}
