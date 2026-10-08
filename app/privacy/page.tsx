import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "Kebijakan Privasi LakuLokal" },
  description: "Kebijakan Privasi LakuLokal menjelaskan penggunaan data akun, order, pembayaran, pemrosesan video, dan permintaan data.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Kebijakan Privasi LakuLokal",
    description: "Pelajari data akun dan order yang digunakan untuk menyediakan layanan clip video LakuLokal.",
    siteName: "LakuLokal",
    locale: "id_ID",
    type: "website",
    url: absoluteUrl("/privacy")
  }
};

export default function PrivacyPage() {
  return (
    <main className="container app-main">
      <Link className="text-link" href="/">Kembali ke beranda</Link>
      <h1 className="page-title" style={{ marginTop: 18 }}>Kebijakan Privasi LakuLokal</h1>
      <p className="page-lead">Kebijakan Privasi LakuLokal menjelaskan data akun, order, bukti pembayaran, dan permintaan pengguna yang terkait dengan layanan clip video.</p>
      <p className="page-lead">Terakhir diperbarui 8 Oktober 2026.</p>
      <article className="panel stack">
        <section>
          <h2>Data yang digunakan</h2>
          <p>LakuLokal menyimpan nama dan email akun, paket dan harga order, status pembayaran, referensi transaksi, status pemrosesan, gambar bukti pembayaran yang diunggah, serta file clip hasil. File video sumber tetap berada di perangkat dan tidak dikirim ke server.</p>
        </section>
        <section>
          <h2>Tujuan penggunaan</h2>
          <p>Data digunakan untuk mengelola sesi akun, membuat dan menampilkan order milik pengguna, menyaring serta memeriksa bukti pembayaran, mencatat status proses browser, menyimpan clip sementara agar dapat diunduh kembali, menjaga keamanan, dan menangani permintaan bantuan. Browser mengolah file video dan menjalankan OCR bukti pembayaran pada perangkat pengguna.</p>
        </section>
        <section>
          <h2>Penyedia layanan</h2>
          <p>
            <a className="text-link" href="https://supabase.com/privacy" target="_blank" rel="noreferrer">Supabase</a> menyediakan autentikasi, database, dan penyimpanan privat untuk bukti pembayaran serta clip hasil. OCR berjalan di browser; gambar bukti kemudian dikirim ke Supabase agar admin dapat memeriksanya.{" "}
            <a className="text-link" href="https://vercel.com/legal/privacy-notice" target="_blank" rel="noreferrer">Vercel</a> menyajikan aplikasi web. Setiap penyedia menerima data yang diperlukan untuk menjalankan layanannya.
          </p>
          <p>Password akun dikelola Supabase Auth dan tidak disimpan pada tabel aplikasi LakuLokal. LakuLokal menggunakan QRIS statis dan pemeriksaan bukti oleh admin. Hasil OCR hanya membaca teks pada gambar dan bukan konfirmasi bahwa dana telah diterima.</p>
        </section>
        <section>
          <h2>Masa penyimpanan</h2>
          <p>Riwayat akun dan order disimpan agar pengguna dapat mengakses dashboard. Bukti pembayaran disimpan privat untuk pemeriksaan dan pencatatan transaksi. File clip disimpan di penyimpanan privat selama 24 jam setelah proses selesai, lalu dihapus otomatis. File video sumber tetap di perangkat dan tidak disimpan oleh LakuLokal.</p>
        </section>
        <section>
          <h2>Kontrol akses dan permintaan data</h2>
          <p>Pengguna hanya dapat membaca order dan hasil miliknya. Akses administratif memakai role pada profil akun. Untuk meminta koreksi atau penghapusan akun, hubungi <a className="text-link" href="mailto:halo@lakulokal.id">halo@lakulokal.id</a>. Penghapusan dapat memengaruhi akses ke riwayat order.</p>
        </section>
      </article>
    </main>
  );
}
