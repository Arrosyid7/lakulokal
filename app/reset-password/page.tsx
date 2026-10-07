import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Buat Password Baru",
  robots: { index: false, follow: true }
};

export default function ResetPasswordPage() {
  return <AuthForm mode="reset" />;
}
