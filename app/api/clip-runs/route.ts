import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const clipRunSchema = z.object({ clip_count: z.union([z.literal(1), z.literal(5)]) });

export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Autentikasi diperlukan." }, { status: 401 });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Pembuatan clip belum dikonfigurasi." }, { status: 503 });
  }
  const payload: unknown = await request.json().catch(() => null);
  const parsed = clipRunSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Jumlah clip harus satu atau lima." }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { data: withinLimit, error: rateLimitError } = await admin.rpc("consume_user_rate_limit", {
    p_user_id: current.user.id,
    p_action: "create_clip_run",
    p_limit: 3,
    p_window_seconds: 60
  });
  if (rateLimitError) {
    console.error("clip_run_rate_limit_failed", { code: rateLimitError.code });
    return NextResponse.json({ error: "Clip belum dapat dimulai. Coba lagi sebentar." }, { status: 503 });
  }
  if (!withinLimit) return NextResponse.json({ error: "Batas pembuatan clip tercapai. Coba lagi setelah satu menit." }, { status: 429 });

  const { data, error } = await admin.rpc("create_credit_clip_order", {
    p_user_id: current.user.id,
    p_clip_count: parsed.data.clip_count
  });
  if (error) {
    console.error("credit_clip_run_create_failed", {
      userId: current.user.id,
      clipCount: parsed.data.clip_count,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    });
    if (error.code === "22003") {
      return NextResponse.json({ error: "Kredit Anda belum cukup untuk pilihan ini." }, { status: 402 });
    }
    if (error.code === "P0002") {
      return NextResponse.json({ error: "Paket kredit belum tersedia. Coba lagi nanti." }, { status: 503 });
    }
    if (error.code === "PGRST202") {
      return NextResponse.json({
        error: "Fitur clip belum tersedia di database. Pastikan migration 20261012000000_credit_based_clip_creation.sql sudah diterapkan.",
        errorCode: error.code
      }, { status: 503 });
    }
    if (error.code === "42702" && error.message.includes("clip_count")) {
      return NextResponse.json({
        error: "Fitur clip perlu diperbarui di database. Pastikan migration 20261013030000_fix_credit_clip_count_ambiguity.sql sudah diterapkan.",
        errorCode: error.code
      }, { status: 503 });
    }
    return NextResponse.json({
      error: "Clip belum dapat dimulai. Periksa log server untuk detail kegagalan.",
      errorCode: error.code ?? "UNKNOWN"
    }, { status: 500 });
  }
  const order = data?.[0];
  if (!order) {
    console.error("credit_clip_run_create_missing_result", { userId: current.user.id });
    return NextResponse.json({ error: "Clip belum dapat dimulai. Muat ulang lalu coba lagi." }, { status: 500 });
  }
  return NextResponse.json({ order }, { status: 201 });
}
