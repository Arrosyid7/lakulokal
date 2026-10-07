import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Buat Akun",
  description: "Buat akun LakuLokal untuk mengirim video YouTube dan memantau order clip.",
  robots: { index: false, follow: false }
};

export default function RegisterPage() {
  return <AuthForm mode="register" />;
}
