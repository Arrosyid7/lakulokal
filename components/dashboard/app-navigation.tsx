"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AppNavigation({ fullName, isAdmin }: { fullName: string; isAdmin: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  async function signOut() {
    const { error } = await createSupabaseBrowserClient().auth.signOut();
    if (error) {
      setLogoutError("Logout gagal. Silakan coba lagi.");
      return;
    }
    setOpen(false);
    router.replace("/login");
    router.refresh();
  }
  const linkClass = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`))
      ? "current"
      : undefined;

  return (
    <header className="app-header">
      <div className="container app-nav">
        <Link className="brand" href="/dashboard">LakuLokal</Link>
        <button
          className="app-menu-toggle"
          type="button"
          aria-expanded={open}
          aria-controls="account-navigation"
          onClick={() => setOpen((current) => !current)}
        >
          {open ? "Tutup menu" : "Menu akun"}
        </button>
        <nav
          id="account-navigation"
          className={`app-nav-links${open ? " app-nav-links-open" : ""}`}
          aria-label="Navigasi akun"
        >
          <Link className={linkClass("/dashboard")} aria-current={linkClass("/dashboard") ? "page" : undefined} href="/dashboard" onClick={() => setOpen(false)}>Dashboard</Link>
          <Link className={linkClass("/dashboard/new")} aria-current={linkClass("/dashboard/new") ? "page" : undefined} href="/dashboard/new" onClick={() => setOpen(false)}>Buat clip</Link>
          <Link className={linkClass("/dashboard/orders")} aria-current={linkClass("/dashboard/orders") ? "page" : undefined} href="/dashboard/orders" onClick={() => setOpen(false)}>Riwayat</Link>
          <Link className={linkClass("/dashboard/profile")} aria-current={linkClass("/dashboard/profile") ? "page" : undefined} href="/dashboard/profile" onClick={() => setOpen(false)}>Profil</Link>
          {isAdmin && <Link className={linkClass("/admin")} aria-current={linkClass("/admin") ? "page" : undefined} href="/admin" onClick={() => setOpen(false)}>Admin</Link>}
          <span className="muted">{fullName}</span>
          <button className="button button-secondary" type="button" onClick={signOut}>Keluar</button>
        </nav>
        {logoutError && <p className="form-error" role="alert">{logoutError}</p>}
      </div>
    </header>
  );
}
