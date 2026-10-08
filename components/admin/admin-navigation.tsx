"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Ringkasan" },
  { href: "/admin/transaksi", label: "Transaksi" },
  { href: "/admin/landing", label: "Landing page" },
  { href: "/admin/artikel", label: "Artikel" },
  { href: "/admin/sosial", label: "Media sosial" }
];

export function AdminNavigation() {
  const pathname = usePathname();
  return (
    <nav className="admin-navigation" aria-label="Navigasi administrasi">
      {links.map(({ href, label }) => (
        <Link
          href={href}
          key={href}
          aria-current={pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`)) ? "page" : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
