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
          <p>LakuLokal menyimpan nama dan email akun, tautan YouTube yang dikirim, paket dan harga order, status pembayaran, referensi transaksi provider, status pemrosesan, serta file clip yang dihasilkan.</p>
        </section>
        <section>
          <h2>Tujuan penggunaan</h2>
          <p>Data digunakan untuk mengelola sesi akun, membuat dan menampilkan order milik pengguna, memverifikasi pembayaran, menjalankan pemrosesan video, menyediakan hasil unduhan, menjaga keamanan, dan menangani permintaan bantuan.</p>
        </section>
        <section>
          <h2>Penyedia layanan</h2>
          <p>
            <a className="text-link" href="https://supabase.com/privacy" target="_blank" rel="noreferrer">Supabase</a> menyediakan autentikasi, database, dan penyimpanan file. DANA memproses pembayaran QRIS.{" "}
            <a className="text-link" href="https://cloud.google.com/terms/cloud-privacy-notice" target="_blank" rel="noreferrer">Google Cloud</a> menjalankan pemrosesan video.{" "}
            <a className="text-link" href="https://vercel.com/legal/privacy-notice" target="_blank" rel="noreferrer">Vercel</a> menyajikan aplikasi web. Setiap penyedia menerima data yang diperlukan untuk menjalankan layanannya.
          </p>
          <p>Password akun dikelola Supabase Auth dan tidak disimpan pada tabel aplikasi LakuLokal. Informasi pembayaran seperti nomor kartu atau kredensial dompet ditangani oleh provider pembayaran. LakuLokal menyimpan jumlah dan referensi transaksi untuk mencocokkan pembayaran dengan order.</p>
        </section>
        <section>
          <h2>Masa penyimpanan</h2>
          <p>Riwayat akun dan order disimpan agar pengguna dapat mengakses dashboard. File clip dan ZIP dihapus setelah masa simpan yang dikonfigurasi, dengan nilai awal 72 jam setelah pemrosesan selesai. Log operasional mengikuti kebijakan layanan hosting yang digunakan.</p>
        </section>
        <section>
          <h2>Kontrol akses dan permintaan data</h2>
          <p>Pengguna hanya dapat membaca order dan hasil miliknya. Akses administratif memakai role pada profil akun. Untuk meminta koreksi atau penghapusan akun, hubungi <a className="text-link" href="mailto:halo@lakulokal.id">halo@lakulokal.id</a>. Penghapusan dapat memengaruhi akses ke riwayat order.</p>
        </section>
      </article>
    </main>
  );
}
