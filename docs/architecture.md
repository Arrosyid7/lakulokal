# Arsitektur LakuLokal

Next.js App Router berjalan di Vercel. Supabase Auth dan PostgreSQL menyimpan akun, order, pembayaran, dan status proses. DANA menyediakan QRIS. Browser pengguna memproses file video dengan FFmpeg WebAssembly.

## Alur order

1. Pengguna memilih file video dan paket. API membuat order dan QRIS, tetapi tidak menerima file video.
2. Finish Notify DANA memicu verifikasi status pembayaran dari server sebelum order ditandai PAID.
3. Setelah pembayaran terverifikasi, browser memproses video menjadi segmen vertikal berdasarkan jarak waktu yang merata.
4. Browser mengunduh setiap klip langsung ke perangkat. File video dan hasil klip tidak disimpan oleh LakuLokal.
5. Dashboard menyimpan status order, bukan file video. Pengguna dapat memilih ulang file pada order yang sudah lunas untuk membuat klip lagi.

## Batas pemrosesan lokal

- Input yang didukung: MP4, MOV, M4V, dan WebM. Maksimal 250 MB dan dua jam.
- Klip berdurasi hingga 60 detik, dipotong merata sesuai jumlah paket.
- Tab harus tetap terbuka. Kecepatan dan keberhasilan proses bergantung pada browser, memori, dan performa perangkat.
- FFmpeg WebAssembly disajikan dari domain aplikasi. File video tidak dikirim ke server.

Terapkan migration `20261008000000_enable_browser_video_processing.sql` pada database yang sudah berjalan. Jangan memberikan Supabase service role ke browser.
