# LakuLokal

LakuLokal membuat klip video vertikal dari file yang dipilih pengguna. Pengguna memilih paket, membayar lewat QRIS statis, mengunggah bukti untuk penyaringan OCR dan pemeriksaan admin, lalu browser memproses video. Setiap clip muncul saat selesai dan disimpan privat agar dapat diakses dari riwayat order selama 24 jam. Aplikasi tidak membutuhkan VPS atau Cloud Run untuk pemrosesan video.

## Menjalankan lokal

1. Pasang Node.js versi 20 atau lebih baru.
2. Salin `.env.example` menjadi `.env.local`, lalu isi Supabase.
3. Jalankan `npm install`. Script `postinstall` menyalin FFmpeg WebAssembly ke `public/ffmpeg/`.
4. Untuk database baru, terapkan `supabase_schema.sql`, lalu migration QRIS di bawah. Untuk database yang sudah digunakan, terapkan migration sesuai urutan.
5. Jalankan `npm run dev`.

Order hanya dapat dibuat bila Supabase service role dan migration QRIS sudah tersedia. Gambar `public/payment/qris-lakulokal.png` adalah QRIS statis yang ditampilkan kepada pengguna.

## Supabase

Jalankan `supabase_schema.sql` pada SQL Editor atau melalui Supabase CLI untuk instalasi baru. Untuk database lama, terapkan migration sesuai urutan yang belum pernah dijalankan:

- `20260413000000_fix_confirm_paid_order_payment_reference.sql`
- `20261007000000_add_dana_checkout_urls.sql`
- `20261007010000_add_dana_partner_reference_no.sql`
- `20261007020000_add_missing_order_columns.sql`
- `20261007030000_make_legacy_order_url_nullable.sql`
- `20261007040000_make_legacy_order_mode_nullable.sql`
- `20261007050000_restore_missing_user_profiles.sql`
- `20261007060000_fix_orders_user_profile_foreign_key.sql`
- `20261007070000_add_dana_qris_code_columns.sql`
- `20261008000000_enable_browser_video_processing.sql`
- `20261008085000_manual_qris_payment_proofs.sql`
- `20261008100000_store_browser_clips.sql`
- `20261008110000_admin_content_management.sql`

Jangan memberikan akses `service_role` ke browser atau memberikan grant update untuk status pembayaran kepada pengguna.

Buat bucket Storage privat bernama `lakulokal-results` untuk file clip. Unggahan clip memakai signed upload URL, sedangkan tautan tonton dan unduh dibuat singkat untuk pemilik order. Terapkan migration sebelum mengaktifkan halaman hasil atau panel admin.

## Pembayaran QRIS dan bukti transfer

Order baru menampilkan QRIS statis dari `public/payment/qris-lakulokal.png`. Pengguna memasukkan nominal order, mengunggah gambar bukti, lalu OCR di browser menyaring nominal dan tanggal transaksi sebelum bukti disimpan dalam bucket privat Supabase Storage. Admin tetap harus mencocokkan transaksi secara terpisah pada rekening atau aplikasi merchant.

Setelah OCR cocok, pengguna boleh memproses dan mengunduh clip sebelum admin mengonfirmasi pembayaran. Artinya bukti palsu atau transfer yang tidak ditemukan dapat menyebabkan layanan sudah diberikan tanpa dana diterima. OCR bukan verifikasi transaksi dan tidak boleh dianggap sebagai konfirmasi pembayaran.

Integrasi DANA dan Finish Notify dipertahankan untuk order lama. Kredensial DANA hanya diperlukan selama order lama masih membutuhkan callback atau rekonsiliasi.

## Pemrosesan video di browser

File video diproses secara lokal dengan FFmpeg WebAssembly. Format yang diterima: MP4, MOV, M4V, dan WebM. Ukuran maksimal 250 MB, durasi maksimal dua jam, dan setiap klip berdurasi hingga 60 detik. Klip dipilih berdasarkan jarak waktu merata, bukan deteksi highlight. Bukti pembayaran gambar disimpan privat untuk pemeriksaan admin; hanya OCR nominal dan tanggal yang dijalankan di browser.

Video sumber tidak diunggah ke server. Setiap clip ditampilkan segera setelah selesai, lalu file clip disimpan di Supabase Storage privat dan catatannya di database sampai 24 jam setelah pemrosesan berakhir. Endpoint hasil menolak akses setelah batas 24 jam. Vercel Cron menghapus file serta catatan yang kedaluwarsa setiap hari; penghapusan fisik dapat menyusul hingga sekitar 24 jam setelah hasil tidak lagi bisa diakses. Browser harus tetap terbuka selama pemrosesan; hasil dapat gagal jika perangkat kehabisan memori atau browser tidak mendukung WebAssembly. Aplikasi menyajikan file FFmpeg dari domain sendiri, bukan mengambilnya dari CDN saat pengguna membuat klip.

Panel admin dibuka dari `/admin` dan memakai halaman masuk khusus di `/admin-login`, terpisah dari login serta pendaftaran pengguna. Buat satu akun admin dari Supabase Dashboard pada Authentication > Users, lalu tetapkan role `ADMIN` untuk profil akun tersebut melalui SQL Editor. Database membatasi hanya satu profil admin; aplikasi tidak menyediakan pendaftaran admin. Admin menggunakan email dan password yang ditetapkan saat akun Auth dibuat. Panel mengelola teks dan metadata landing page, artikel beserta checklist SEO bergaya Yoast, tautan Instagram/Facebook/TikTok, serta daftar transaksi. Checklist SEO dibuat di aplikasi, bukan integrasi plugin Yoast WordPress.

Paket `@ffmpeg/core` menggunakan lisensi GPL-2.0-or-later. Lihat lisensi paket dan sumber FFmpeg sebelum mendistribusikan aplikasi.

## Deploy aplikasi

1. Deploy Next.js ke Vercel.
2. Atur variabel Supabase dari `.env.example`. Jangan menaruh secret di variable `NEXT_PUBLIC_*`.
3. Pastikan `npm install`/`npm ci` menjalankan `postinstall`, sehingga aset FFmpeg tersedia di `public/ffmpeg/` saat build.
4. Aktifkan Vercel Cron untuk rekonsiliasi pembayaran dan pembersihan hasil lama, lalu isi `CRON_SECRET`. Kedua cron berjalan sekali sehari agar sesuai dengan batas jadwal plan Vercel Hobby.
5. Terapkan migration baru, pastikan bucket `payment-proofs` dan `lakulokal-results` privat, dan verifikasi file QRIS yang dipasang sebelum melayani order.
6. Buat user Auth admin di Supabase Dashboard, lalu jalankan SQL berikut dengan email yang dipakai admin:

   ```sql
   update public.profiles p
   set role = 'ADMIN'
   from auth.users u
   where p.id = u.id
     and lower(u.email) = lower('email-admin@example.com');
   ```

   Pastikan query memperbarui satu profil. Buka `/admin` dan masuk dengan email serta password akun Auth tersebut. Jangan buat admin kedua.
7. Uji unggah bukti, penyaringan OCR, pemeriksaan admin, pemrosesan browser, pratinjau clip bertahap, penghapusan setelah masa simpan, panel admin, dan tampilan mobile.

Vercel menyajikan aplikasi dan aset FFmpeg. Pemrosesan video menggunakan CPU serta memori perangkat pengguna, bukan server.

## Pemeriksaan

```bash
npm run typecheck
npm run lint
npm test
npm run build
```
