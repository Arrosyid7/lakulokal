# Arsitektur LakuLokal

Next.js App Router berjalan di Vercel. Supabase Auth dan PostgreSQL menyimpan akun, order, pembayaran, dan status proses. Pengguna membayar melalui QRIS statis dan mengirim bukti. Browser memproses file video dengan FFmpeg WebAssembly.

## Alur order

1. Pengguna memilih file video dan paket. API membuat order dan QRIS, tetapi tidak menerima file video.
2. Browser menjalankan OCR pada bukti QRIS. Jika nominal dan tanggal cocok, aplikasi menyetujui order secara otomatis tanpa verifikasi ke bank atau penyedia pembayaran.
3. Setelah persetujuan, browser memproses video menjadi segmen vertikal berdasarkan jarak waktu yang merata.
4. Setiap clip segera tampil sebagai preview dan diunggah ke penyimpanan privat untuk riwayat order.
5. Dashboard menyimpan status order dan clip hasil selama 24 jam, bukan file sumber.

## Pembayaran QRIS

- QRIS statis ditampilkan pada order baru. Pengguna harus memasukkan nominal order yang tepat.
- OCR hanya mencocokkan nominal dan tanggal yang terbaca. Aplikasi tidak memeriksa mutasi rekening atau memastikan dana diterima.
- Persetujuan otomatis dapat memberi akses layanan tanpa pembayaran. Admin melihat tanda persetujuan OCR dan tidak memasukkan order tersebut sebagai pendapatan terverifikasi.
- Integrasi DANA sudah dihapus. Kolom database lama tetap ada untuk menjaga riwayat dan migration yang sudah diterapkan.

## Batas pemrosesan lokal

- Input yang didukung: MP4, MOV, M4V, dan WebM. Maksimal 250 MB dan dua jam.
- Klip berdurasi hingga 60 detik, dipotong merata sesuai jumlah paket.
- Tab harus tetap terbuka. Kecepatan dan keberhasilan proses bergantung pada browser, memori, dan performa perangkat.
- FFmpeg WebAssembly disajikan dari domain aplikasi. File video tidak dikirim ke server.

Terapkan migration `20261008000000_enable_browser_video_processing.sql` pada database yang sudah berjalan. Jangan memberikan Supabase service role ke browser.
