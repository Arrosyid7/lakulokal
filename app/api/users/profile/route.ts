import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";

const profileSchema = z.object({ full_name: z.string().trim().min(1).max(120) });

export async function PATCH(request: Request) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Autentikasi diperlukan." }, { status: 401 });
  const { supabase, user } = current;
  const input = await request.json().catch(() => null);
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return NextResponse.json({ error: "Nama wajib diisi, maksimal 120 karakter." }, { status: 400 });
  const { data, error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.full_name })
    .eq("id", user.id)
    .select("id,full_name,email")
    .single();
  if (error) return NextResponse.json({ error: "Profil gagal disimpan." }, { status: 500 });
  return NextResponse.json({ profile: data });
}
