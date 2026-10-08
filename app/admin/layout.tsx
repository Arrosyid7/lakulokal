import { AdminNavigation } from "@/components/admin/admin-navigation";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireAdmin();
  return (
    <>
      <div className="container admin-navigation-wrap">
        <AdminNavigation />
      </div>
      {children}
    </>
  );
}
