import type { Metadata } from "next";
import { AppNavigation } from "@/components/dashboard/app-navigation";
import { SiteFooter } from "@/components/site-footer";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: { index: false, follow: true }
};

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase.from("profiles").select("full_name,role").eq("id", user.id).maybeSingle();
  return (
    <>
      <AppNavigation fullName={profile?.full_name || user.email || "Akun"} isAdmin={profile?.role === "ADMIN"} />
      {children}
      <SiteFooter />
    </>
  );
}
