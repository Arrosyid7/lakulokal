import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "Syarat Layanan LakuLokal" },
  description: "Syarat Layanan LakuLokal menjelaskan order clip video YouTube, pembayaran QRIS, tanggung jawab atas video, dan penyimpanan hasil.",
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Syarat Layanan LakuLokal",
    description: "Baca ketentuan order clip video YouTube, pembayaran, hak penggunaan video, dan penyimpanan hasil.",
    siteName: "LakuLokal",
    locale: "id_ID",
    type: "website",
    url: absoluteUrl("/terms")
  }
};

export default function TermsPage() {
  return (
    <main className="container app-main">
      <Link className="text-link" href="/">Kembali ke beranda</Link>
      <h1 className="page-title" style={{ marginTop: 18 }}>Syarat Layanan LakuLokal</h1>
      <p className="page-lead">Syarat Layanan LakuLokal menjelaskan order clip video, pembayaran, tanggung jawab pengguna, dan penyimpanan hasil.</p>
      <p className="page-lead">Berlaku mulai 7 Oktober 2026.</p>
      <article className="panel stack">
        <section>
          <h2>Tentang layanan</h2>
          <p>LakuLokal membantu pengguna membuat clip dari tautan video YouTube yang dapat diakses. Pengguna harus masuk ke akun sebelum membuat order.</p>
        </section>
        <section>
          <h2>Order dan pembayaran</h2>
          <p>Paket dan harga yang berlaku ditampilkan saat membuat order. Server mengambil harga dari paket aktif di database. Pembayaran menggunakan QRIS DANA dan hanya diproses setelah server memverifikasi status transaksi dari provider.</p>
          <p>Jika pembayaran berhasil tetapi hasil tidak dapat disediakan karena kesalahan sistem, permintaan pengembalian dana dapat diajukan dalam 24 jam melalui <a className="text-link" href="mailto:halo@lakulokal.id">halo@lakulokal.id</a>. Pengajuan akan diperiksa berdasarkan catatan transaksi. Kesalahan URL atau klip yang sudah berhasil diunduh tidak memenuhi kebijakan ini.</p>
        </section>
        <section>
          <h2>Konten dan hak penggunaan</h2>
          <p>Pengguna bertanggung jawab memastikan bahwa mereka memiliki hak atau izin yang diperlukan untuk memproses dan menggunakan video. Pengguna juga harus mematuhi <a className="text-link" href="https://www.youtube.com/t/terms?hl=id" target="_blank" rel="noreferrer">Ketentuan Layanan YouTube</a> dan peraturan yang berlaku.</p>
        </section>
        <section>
          <h2>Penyimpanan hasil</h2>
          <p>File hasil disimpan sementara di bucket private. Masa simpan mengikuti konfigurasi deployment, dengan nilai awal 72 jam setelah pemrosesan selesai. Setelah masa tersebut, file dihapus otomatis dan tautan unduhan tidak lagi tersedia.</p>
        </section>
        <section>
          <h2>Ketersediaan dan perubahan</h2>
          <p>Video privat, dibatasi usia, atau tidak tersedia untuk diunduh dapat gagal diproses. Ketersediaan layanan juga dapat berubah akibat gangguan provider, perubahan YouTube, atau pemeliharaan.</p>
          <p>Kami dapat memperbarui syarat ini. Versi terbaru akan ditampilkan di halaman ini.</p>
        </section>
      </article>
    </main>
  );
}
