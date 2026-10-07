import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasAdminRole } from "@/lib/authorization";

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return { supabase, user };
}

export async function requireUser() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  return current;
}

export async function requireAdmin() {
  const { supabase, user } = await requireUser();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (error || !hasAdminRole(profile?.role)) redirect("/dashboard");
  return { supabase, user };
}
