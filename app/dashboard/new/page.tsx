import Link from "next/link";
import { OrderForm } from "@/components/orders/order-form";
import { requireUser } from "@/lib/auth";

export default async function NewOrderPage() {
  const { supabase } = await requireUser();
  const { data: packages, error } = await supabase
    .from("packages")
    .select("id,name,clip_count,price,currency")
    .eq("active", true)
    .order("price");
  return (
    <main id="account-content" className="container app-main">
      <header className="dashboard-page-heading">
        <p className="section-kicker">Order baru</p>
        <h1 className="page-title">Siapkan video untuk dibuat clip.</h1>
        <p className="page-lead">Pilih file video dan paket. Setelah OCR mencocokkan nominal serta tanggal bukti QRIS, order disetujui otomatis. OCR tidak memverifikasi dana masuk.</p>
      </header>
      {error ? <p className="form-error" role="alert">Daftar paket gagal dimuat. Muat ulang halaman. Jika masalah berlanjut, hubungi <a href="mailto:halo@lakulokal.id">halo@lakulokal.id</a>.</p> : (
        <div className="new-order-layout">
          <OrderForm packages={packages ?? []} />
          <aside className="profile-note">
            <h2>Sebelum memilih video</h2>
            <ul>
              <li>Gunakan file MP4, MOV, M4V, atau WebM berukuran maksimal 250 MB.</li>
              <li>Pastikan Anda memiliki hak atau izin untuk memproses dan menggunakan video.</li>
              <li>Biarkan halaman terbuka sampai klip selesai dibuat dan diunduh.</li>
            </ul>
            <Link className="text-link" href="/artikel/hak-cipta-clip-video">Baca panduan hak penggunaan</Link>
          </aside>
        </div>
      )}
    </main>
  );
}
