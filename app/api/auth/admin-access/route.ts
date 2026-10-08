import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasAdminRole } from "@/lib/authorization";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST() {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Autentikasi diperlukan." }, { status: 401 });

  const admin = createSupabaseAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("role")
    .eq("id", current.user.id)
    .maybeSingle();
  if (error) {
    console.error("admin_login_role_check_failed", { code: error.code });
    return NextResponse.json({ error: "Akses admin gagal diverifikasi." }, { status: 500 });
  }
  if (!hasAdminRole(profile?.role)) {
    return NextResponse.json({ error: "Akun ini tidak memiliki akses admin." }, { status: 403 });
  }
  return NextResponse.json({ authorized: true });
}
