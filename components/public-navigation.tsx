"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { href: "#beranda", label: "Beranda" },
  { href: "#cara-kerja", label: "Cara kerja" },
  { href: "#harga", label: "Harga" },
  { href: "#faq", label: "FAQ" },
  { href: "#kontak", label: "Kontak" }
];

export function PublicNavigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const homePrefix = pathname === "/" ? "" : "/";

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <header className="site-header">
      <div className="container nav-row">
        <Link className="brand" href="/" aria-label="LakuLokal, beranda">LakuLokal</Link>
        <button
          className="menu-toggle"
          type="button"
          aria-expanded={open}
          aria-controls="public-navigation"
          onClick={() => setOpen((current) => !current)}
        >
          {open ? "Tutup menu" : "Menu"}
        </button>
        <nav
          id="public-navigation"
          className={`nav-links${open ? " nav-links-open" : ""}`}
          aria-label="Navigasi utama"
        >
          {links.map(({ href, label }) => (
            <a key={href} href={`${homePrefix}${href}`} onClick={() => setOpen(false)}>{label}</a>
          ))}
          <Link href="/artikel" onClick={() => setOpen(false)}>Artikel</Link>
          <span className="nav-account-links">
            <Link href="/login" onClick={() => setOpen(false)}>Masuk</Link>
            <Link className="button" href="/register" onClick={() => setOpen(false)}>Buat akun</Link>
          </span>
        </nav>
      </div>
    </header>
  );
}
