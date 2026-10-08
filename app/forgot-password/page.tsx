import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { SiteFooter } from "@/components/site-footer";
import { getSocialLinks } from "@/lib/site-content";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Pulihkan Akses Akun",
  robots: { index: false, follow: true }
};

export default async function ForgotPasswordPage() {
  const socialLinks = await getSocialLinks();
  return <><AuthForm mode="forgot" /><SiteFooter socialLinks={socialLinks} /></>;
}
