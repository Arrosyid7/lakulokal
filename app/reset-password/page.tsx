import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { SiteFooter } from "@/components/site-footer";
import { getSocialLinks } from "@/lib/site-content";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Buat Password Baru",
  robots: { index: false, follow: true }
};

export default async function ResetPasswordPage() {
  const socialLinks = await getSocialLinks();
  return <><AuthForm mode="reset" /><SiteFooter socialLinks={socialLinks} /></>;
}
