import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Pulihkan Akses Akun",
  robots: { index: false, follow: true }
};

export default function ForgotPasswordPage() {
  return <AuthForm mode="forgot" />;
}
