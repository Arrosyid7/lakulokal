"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = [
  {
    label: "OPERASIONAL",
    links: [
      { href: "/admin", label: "Ringkasan" },
      { href: "/admin/transaksi", label: "Transaksi" }
    ]
  },
  {
    label: "KONTEN",
    links: [
      { href: "/admin/landing", label: "Landing page" },
      { href: "/admin/artikel", label: "Artikel" },
      { href: "/admin/sosial", label: "Media sosial" }
    ]
  }
];

export function AdminNavigation() {
  const pathname = usePathname();
  return (
    <>
      <nav className="admin-navigation" aria-label="Navigasi administrasi">
        <NavigationSections pathname={pathname} />
      </nav>
      <details className="admin-mobile-navigation">
        <summary>Menu admin</summary>
        <nav aria-label="Navigasi administrasi">
          <NavigationSections pathname={pathname} />
        </nav>
      </details>
    </>
  );
}

function NavigationSections({ pathname }: { pathname: string }) {
  return sections.map((section) => (
    <div className="admin-navigation-section" key={section.label}>
      <p>{section.label}</p>
      {section.links.map(({ href, label }) => (
        <Link
          href={href}
          key={href}
          aria-current={pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`)) ? "page" : undefined}
        >
          {label}
        </Link>
      ))}
    </div>
  ));
}
