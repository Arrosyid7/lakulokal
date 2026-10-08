import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { SiteFooter } from "@/components/site-footer";
import { getSocialLinks } from "@/lib/site-content";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Masuk",
  description: "Masuk ke akun LakuLokal untuk mengelola order dan melihat status pembayaran.",
  robots: { index: false, follow: true }
};

export default async function LoginPage() {
  const socialLinks = await getSocialLinks();
  return <><AuthForm mode="login" /><SiteFooter socialLinks={socialLinks} /></>;
}
