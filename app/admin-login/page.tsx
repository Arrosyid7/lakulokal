import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Masuk Admin",
  description: "Masuk ke panel administrasi LakuLokal.",
  robots: { index: false, follow: false }
};

export default function AdminLoginPage() {
  return <AuthForm mode="admin" />;
}
