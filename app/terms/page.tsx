import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Syarat Layanan",
  description: "Syarat penggunaan LakuLokal untuk order clip video YouTube dan pembayaran.",
  alternates: { canonical: "/terms" }
};

export default function TermsPage() {
  return (
    <main className="container app-main">
      <Link className="text-link" href="/">Kembali ke beranda</Link>
      <h1 className="page-title" style={{ marginTop: 18 }}>Syarat Layanan</h1>
      <p className="page-lead">Berlaku mulai 7 Oktober 2026.</p>
      <article className="panel stack">
        <section>
          <h2>Tentang layanan</h2>
          <p>LakuLokal membantu pengguna membuat clip dari tautan video YouTube yang dapat diakses. Pengguna harus masuk ke akun sebelum membuat order.</p>
        </section>
        <section>
          <h2>Order dan pembayaran</h2>
          <p>Paket awal berisi 5 clip dengan harga Rp1.000. Harga yang berlaku ditentukan server dari paket aktif di database saat order dibuat. Pembayaran menggunakan QRIS DANA dan hanya diproses setelah server memverifikasi status transaksi dari provider.</p>
          <p>Jika pembayaran berhasil tetapi hasil tidak dapat disediakan karena kesalahan sistem, permintaan pengembalian dana dapat diajukan dalam 24 jam melalui <a className="text-link" href="mailto:halo@lakulokal.id">halo@lakulokal.id</a>. Pengajuan akan diperiksa berdasarkan catatan transaksi. Kesalahan URL atau klip yang sudah berhasil diunduh tidak memenuhi kebijakan ini.</p>
        </section>
        <section>
          <h2>Konten dan hak penggunaan</h2>
          <p>Pengguna bertanggung jawab memastikan bahwa mereka memiliki hak atau izin yang diperlukan untuk memproses dan menggunakan video. Pengguna juga harus mematuhi Ketentuan Layanan YouTube dan peraturan yang berlaku.</p>
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
