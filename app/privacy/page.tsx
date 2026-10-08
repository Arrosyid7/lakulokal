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
      <p className="page-lead">Kebijakan Privasi LakuLokal menjelaskan data akun, order, dan permintaan pengguna yang terkait dengan layanan clip video.</p>
      <p className="page-lead">Terakhir diperbarui 7 Oktober 2026.</p>
      <article className="panel stack">
        <section>
          <h2>Data yang digunakan</h2>
          <p>LakuLokal menyimpan nama dan email akun, paket dan harga order, status pembayaran, referensi transaksi provider, serta status pemrosesan. File video dan clip tidak dikirim ke server LakuLokal.</p>
        </section>
        <section>
          <h2>Tujuan penggunaan</h2>
          <p>Data digunakan untuk mengelola sesi akun, membuat dan menampilkan order milik pengguna, memverifikasi pembayaran, mencatat status proses browser, menjaga keamanan, dan menangani permintaan bantuan. Browser mengolah file pada perangkat pengguna.</p>
        </section>
        <section>
          <h2>Penyedia layanan</h2>
          <p>
            <a className="text-link" href="https://supabase.com/privacy" target="_blank" rel="noreferrer">Supabase</a> menyediakan autentikasi dan database. DANA memproses pembayaran QRIS.{" "}
            <a className="text-link" href="https://vercel.com/legal/privacy-notice" target="_blank" rel="noreferrer">Vercel</a> menyajikan aplikasi web. Setiap penyedia menerima data yang diperlukan untuk menjalankan layanannya.
          </p>
          <p>Password akun dikelola Supabase Auth dan tidak disimpan pada tabel aplikasi LakuLokal. Informasi pembayaran seperti nomor kartu atau kredensial dompet ditangani oleh provider pembayaran. LakuLokal menyimpan jumlah dan referensi transaksi untuk mencocokkan pembayaran dengan order.</p>
        </section>
        <section>
          <h2>Masa penyimpanan</h2>
          <p>Riwayat akun dan order disimpan agar pengguna dapat mengakses dashboard. File video dan clip hanya berada di perangkat selama proses dan tidak tersedia kembali setelah halaman ditutup. Pengguna bertanggung jawab menyimpan file hasil unduhan.</p>
        </section>
        <section>
          <h2>Kontrol akses dan permintaan data</h2>
          <p>Pengguna hanya dapat membaca order dan hasil miliknya. Akses administratif memakai role pada profil akun. Untuk meminta koreksi atau penghapusan akun, hubungi <a className="text-link" href="mailto:halo@lakulokal.id">halo@lakulokal.id</a>. Penghapusan dapat memengaruhi akses ke riwayat order.</p>
        </section>
      </article>
    </main>
  );
}
