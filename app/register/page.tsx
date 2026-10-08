import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { SiteFooter } from "@/components/site-footer";
import { getSocialLinks } from "@/lib/site-content";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Buat Akun",
  description: "Buat akun LakuLokal untuk memilih video, membayar QRIS, dan membuat clip di browser.",
  robots: { index: false, follow: true }
};

export default async function RegisterPage() {
  const socialLinks = await getSocialLinks();
  return <><AuthForm mode="register" /><SiteFooter socialLinks={socialLinks} /></>;
}
