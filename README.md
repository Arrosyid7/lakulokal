# LakuLokal

LakuLokal membuat klip video vertikal dari file yang dipilih pengguna. Pengguna memilih paket, membayar lewat QRIS statis, lalu mengunggah bukti. OCR mencocokkan nominal, kemudian admin memeriksa transaksi sebelum menyetujui pembayaran. Clip diproses di browser dan diunduh langsung oleh pengguna; file hasil baru tidak diunggah atau disimpan di server maupun riwayat order. Aplikasi tidak membutuhkan VPS atau Cloud Run untuk pemrosesan video.

## Menjalankan lokal

1. Pasang Node.js versi 20 atau lebih baru.
2. Salin `.env.example` menjadi `.env.local`, lalu isi Supabase.
3. Jalankan `npm install`. Script `postinstall` menyalin FFmpeg WebAssembly ke `public/ffmpeg/`.
4. Untuk database baru, terapkan `supabase_schema.sql`, lalu migration `20261008085000_manual_qris_payment_proofs.sql` dan semua migration setelahnya secara berurutan. Untuk database yang sudah digunakan, terapkan migration yang belum pernah dijalankan.
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
- `20261008120000_single_admin_account.sql`
- `20261008130000_fix_browser_processing_with_payment_proof.sql`
- `20261008140000_auto_approve_manual_qris_proofs.sql`
- `20261012000000_credit_based_clip_creation.sql`
- `20261012010000_refresh_credit_clip_content.sql`
- `20261013000000_make_payment_proof_ocr_date_optional.sql`
- `20261013010000_add_order_metadata.sql`
- `20261013020000_add_payments_updated_at.sql`
- `20261013030000_fix_credit_clip_count_ambiguity.sql`
- `20261013040000_fix_credit_clip_created_at_ambiguity.sql`
- `20261014000000_local_clip_downloads.sql`
- `20261018100000_reviews_account_metrics_and_small_payment_proofs.sql`

Jangan memberikan akses `service_role` ke browser atau memberikan grant update untuk status pembayaran kepada pengguna.

Bucket privat `lakulokal-results` hanya diperlukan untuk mengakses atau membersihkan clip dari order lama. Pemrosesan baru tidak mengunggah file clip ke bucket; status order dan jumlah clip yang selesai tetap dicatat di database.

## Pembayaran QRIS dan bukti transfer

Order baru menampilkan QRIS statis dari `public/payment/qris-lakulokal.png`. Pengguna memasukkan nominal order dan mengunggah gambar bukti. OCR di browser mencocokkan nominal saja. Aplikasi mengecilkan bukti menjadi JPG maksimal 750 KB sebelum mengirimnya ke bucket Storage privat; database hanya menyimpan lokasi file dan data pemeriksaannya. Admin harus memeriksa transaksi langsung di rekening atau aplikasi merchant dan menyetujui bukti sebelum order dinyatakan lunas.

Peringatan: aplikasi tidak menghubungi bank atau penyedia pembayaran untuk memeriksa transfer. OCR hanya membaca teks dan hasilnya berasal dari browser, sehingga bukti palsu atau manipulasi permintaan dapat memberi akses layanan tanpa dana diterima. Audit log mencatat persetujuan otomatis sebagai `MANUAL_QRIS_AUTO_APPROVED`; dashboard admin tidak memasukkan order tersebut sebagai pendapatan terverifikasi.

Integrasi DANA, callback, dan rekonsiliasi otomatis sudah dihapus. Kolom serta migration historis DANA dipertahankan agar skema database lama dan riwayat order tidak rusak. Order DANA lama yang masih menunggu pembayaran tidak lagi dapat dibayar melalui aplikasi.

## Pemrosesan video di browser

File video diproses secara lokal dengan FFmpeg WebAssembly. Format yang diterima: MP4, MOV, M4V, dan WebM. Ukuran maksimal 250 MB, durasi maksimal dua jam, dan setiap klip berdurasi hingga 60 detik. Klip dipilih berdasarkan jarak waktu merata, bukan deteksi highlight. Bukti pembayaran gambar disimpan privat untuk pemeriksaan admin; hanya OCR nominal dan tanggal yang dijalankan di browser.

Video sumber dan hasil clip baru tidak diunggah ke server. Setiap clip muncul di halaman pemrosesan sebagai unduhan lokal. Pengguna harus tetap di halaman sampai proses selesai dan mengunduh setiap clip sebelum keluar; jika halaman ditutup atau dimuat ulang, hasil lokal yang belum diunduh tidak dapat dipulihkan. Database tetap menyimpan status order dan jumlah clip selesai. Vercel Cron membersihkan file serta catatan hasil lama yang masih ada di Supabase Storage. Browser membutuhkan memori yang cukup dan dukungan WebAssembly. Aplikasi menyajikan file FFmpeg dari domain sendiri, bukan mengambilnya dari CDN saat pengguna membuat klip.

Panel admin dibuka dari `/admin` dan memakai halaman masuk khusus di `/admin-login`, terpisah dari login serta pendaftaran pengguna. Buat satu akun admin dari Supabase Dashboard pada Authentication > Users, lalu tetapkan role `ADMIN` untuk profil akun tersebut melalui SQL Editor. Database membatasi hanya satu profil admin; aplikasi tidak menyediakan pendaftaran admin. Admin menggunakan email dan password yang ditetapkan saat akun Auth dibuat. Panel mengelola ringkasan akun, saldo kredit dan aktivitas clip, bukti pembayaran, ulasan beranda, teks landing page, artikel beserta checklist SEO bergaya Yoast, serta tautan Instagram/Facebook/TikTok. Ulasan baru berstatus draf sampai admin memilih untuk menampilkannya. Checklist SEO dibuat di aplikasi, bukan integrasi plugin Yoast WordPress.

Paket `@ffmpeg/core` menggunakan lisensi GPL-2.0-or-later. Lihat lisensi paket dan sumber FFmpeg sebelum mendistribusikan aplikasi.

## Deploy aplikasi

1. Deploy Next.js ke Vercel.
2. Atur variabel Supabase dari `.env.example`. Jangan menaruh secret di variable `NEXT_PUBLIC_*`.
3. Pastikan `npm install`/`npm ci` menjalankan `postinstall`, sehingga aset FFmpeg tersedia di `public/ffmpeg/` saat build.
4. Aktifkan Vercel Cron untuk pembersihan hasil order lama, lalu isi `CRON_SECRET`.
5. Terapkan migration baru, pastikan bucket `payment-proofs` privat (dan `lakulokal-results` privat jika masih ada file hasil lama), serta verifikasi file QRIS yang dipasang sebelum melayani order.
6. Buat user Auth admin di Supabase Dashboard, lalu jalankan SQL berikut dengan email yang dipakai admin:

   ```sql
   update public.profiles p
   set role = 'ADMIN'
   from auth.users u
   where p.id = u.id
     and lower(u.email) = lower('email-admin@example.com');
   ```

   Pastikan query memperbarui satu profil. Buka `/admin` dan masuk dengan email serta password akun Auth tersebut. Jangan buat admin kedua.
7. Uji unggah bukti, penyaringan OCR, pemeriksaan admin, pemrosesan browser, unduhan tiap clip, status selesai/refund kredit, pembersihan file order lama, panel admin, dan tampilan mobile.

Vercel menyajikan aplikasi dan aset FFmpeg. Pemrosesan video menggunakan CPU serta memori perangkat pengguna, bukan server.

## Pemeriksaan

```bash
npm run typecheck
npm run lint
npm test
npm run build
```
