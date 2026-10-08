import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Buat Akun",
  description: "Buat akun LakuLokal untuk memilih video, membayar QRIS, dan membuat clip di browser.",
  robots: { index: false, follow: true }
};

export default function RegisterPage() {
  return <AuthForm mode="register" />;
}
