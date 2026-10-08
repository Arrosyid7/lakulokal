import { AdminNavigation } from "@/components/admin/admin-navigation";
import { requireAdmin } from "@/lib/auth";
import Image from "next/image";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireAdmin();
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar" aria-label="Navigasi panel admin">
        <Link className="admin-brand" href="/admin" aria-label="LakuLokal, ringkasan admin">
          <Image src="/brand/lakulokal-logo-light.svg" alt="LakuLokal" width={176} height={66} priority />
          <span>Panel admin</span>
        </Link>
        <AdminNavigation />
        <Link className="admin-site-link" href="/">Kembali ke situs</Link>
      </aside>
      <div className="admin-workspace">
        <header className="admin-topbar">
          <div>
            <p>LAKULOKAL / ADMIN</p>
            <span>Pengelolaan situs</span>
          </div>
          <Link href="/" aria-label="Buka situs LakuLokal">Lihat situs <span aria-hidden="true">↗</span></Link>
        </header>
        <div className="admin-shell-content">{children}</div>
      </div>
    </div>
  );
}
