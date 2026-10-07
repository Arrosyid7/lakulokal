import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Masuk",
  description: "Masuk ke akun LakuLokal untuk mengelola order dan hasil clip.",
  robots: { index: false, follow: false }
};

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
