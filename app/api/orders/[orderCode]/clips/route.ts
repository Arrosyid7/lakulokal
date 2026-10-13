import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Unggahan clip ke server sudah dinonaktifkan. Unduh hasil langsung dari halaman pemrosesan." },
    { status: 410 }
  );
}
