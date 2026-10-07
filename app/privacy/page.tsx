import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="container app-main">
      <Link className="text-link" href="/">Kembali ke beranda</Link>
      <h1 className="page-title" style={{ marginTop: 18 }}>Kebijakan Privasi</h1>
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
          <p>Supabase menyediakan autentikasi, database, dan penyimpanan file. DANA memproses pembayaran QRIS. Google Cloud menjalankan pemrosesan video. Vercel menyajikan aplikasi web. Setiap penyedia menerima data yang diperlukan untuk menjalankan layanannya.</p>
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
