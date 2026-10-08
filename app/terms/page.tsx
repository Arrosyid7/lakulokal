import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "Syarat Layanan LakuLokal" },
  description: "Syarat Layanan LakuLokal menjelaskan order clip video, pembayaran QRIS, dan pemrosesan lokal di browser.",
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Syarat Layanan LakuLokal",
    description: "Baca ketentuan order clip video, pembayaran, dan hak penggunaan video.",
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
          <p>LakuLokal membantu pengguna membuat clip dari file video yang dipilih pada perangkat. Pengguna harus masuk ke akun sebelum membuat order.</p>
        </section>
        <section>
          <h2>Order dan pembayaran</h2>
          <p>Paket dan harga yang berlaku ditampilkan saat membuat order. Server mengambil harga dari paket aktif di database. Pembayaran menggunakan QRIS DANA dan hanya diproses setelah server memverifikasi status transaksi dari provider.</p>
          <p>Jika pembayaran berhasil tetapi hasil tidak dapat disediakan karena kesalahan sistem, permintaan pengembalian dana dapat diajukan dalam 24 jam melalui <a className="text-link" href="mailto:halo@lakulokal.id">halo@lakulokal.id</a>. Pengajuan akan diperiksa berdasarkan catatan transaksi.</p>
        </section>
        <section>
          <h2>Konten dan hak penggunaan</h2>
          <p>Pengguna bertanggung jawab memastikan bahwa mereka memiliki hak atau izin yang diperlukan untuk memproses dan menggunakan video. Pengguna juga harus mematuhi <a className="text-link" href="https://www.youtube.com/t/terms?hl=id" target="_blank" rel="noreferrer">Ketentuan Layanan YouTube</a> dan peraturan yang berlaku.</p>
        </section>
        <section>
          <h2>Penyimpanan hasil</h2>
          <p>Browser memproses video di perangkat pengguna. Video dan clip tidak diunggah atau disimpan di server LakuLokal. Pengguna perlu mengunduh dan menyimpan hasilnya sendiri.</p>
        </section>
        <section>
          <h2>Ketersediaan dan perubahan</h2>
          <p>Pemrosesan membutuhkan browser dan perangkat yang mendukung WebAssembly. Halaman harus tetap terbuka sampai clip selesai dibuat. File besar atau perangkat yang kehabisan memori dapat gagal diproses.</p>
          <p>Kami dapat memperbarui syarat ini. Versi terbaru akan ditampilkan di halaman ini.</p>
        </section>
      </article>
    </main>
  );
}
