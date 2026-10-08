# LakuLokal

LakuLokal membuat klip video vertikal dari file yang dipilih pengguna. Pengguna memilih paket, membayar melalui QRIS DANA, lalu browser memproses video dan mengunduh klip langsung ke perangkat. Aplikasi tidak membutuhkan VPS atau Cloud Run untuk pemrosesan video.

## Menjalankan lokal

1. Pasang Node.js versi 20 atau lebih baru.
2. Salin `.env.example` menjadi `.env.local`, lalu isi Supabase dan DANA.
3. Jalankan `npm install`. Script `postinstall` menyalin FFmpeg WebAssembly ke `public/ffmpeg/`.
4. Terapkan `supabase_schema.sql` pada database baru, atau jalankan migration untuk database yang sudah digunakan.
5. Jalankan `npm run dev`.

Order hanya dapat dibuat bila Supabase service role dan konfigurasi DANA tersedia. Tidak ada status pembayaran simulasi.

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

Jangan memberikan akses `service_role` ke browser atau memberikan grant update untuk status pembayaran kepada pengguna.

## DANA

Integrasi memakai SDK `dana-node` untuk membuat QRIS, memeriksa status pembayaran, dan memvalidasi Finish Notify. Lengkapi kredensial di `.env.example`. Daftarkan URL HTTPS berikut sebagai Finish Payment URL di Merchant Portal DANA:

```text
https://domain-anda/api/payment/dana/notify
```

Jangan aktifkan production sebelum callback, query pembayaran, dan alur order diuji melalui UAT DANA.

## Pemrosesan video di browser

File video diproses secara lokal dengan FFmpeg WebAssembly. Format yang diterima: MP4, MOV, M4V, dan WebM. Ukuran maksimal 250 MB, durasi maksimal dua jam, dan setiap klip berdurasi hingga 60 detik. Klip dipilih berdasarkan jarak waktu merata, bukan deteksi highlight.

Video tidak diunggah ke server. Klip diunduh ke perangkat dan tidak disimpan di riwayat akun. Browser harus tetap terbuka selama pemrosesan; hasil dapat gagal jika perangkat kehabisan memori atau browser tidak mendukung WebAssembly. Aplikasi menyajikan file FFmpeg dari domain sendiri, bukan mengambilnya dari CDN saat pengguna membuat klip.

Paket `@ffmpeg/core` menggunakan lisensi GPL-2.0-or-later. Lihat lisensi paket dan sumber FFmpeg sebelum mendistribusikan aplikasi.

## Deploy aplikasi

1. Deploy Next.js ke Vercel.
2. Atur variabel Supabase dan DANA dari `.env.example`. Jangan menaruh secret di variable `NEXT_PUBLIC_*`.
3. Pastikan `npm install`/`npm ci` menjalankan `postinstall`, sehingga aset FFmpeg tersedia di `public/ffmpeg/` saat build.
4. Aktifkan Vercel Cron untuk rekonsiliasi pembayaran dan pembersihan hasil lama, lalu isi `CRON_SECRET`.
5. Uji pembayaran QRIS sandbox, pemrosesan browser, unduhan, dan tampilan di perangkat mobile sebelum melayani order sungguhan.

Vercel menyajikan aplikasi dan aset FFmpeg. Pemrosesan video menggunakan CPU serta memori perangkat pengguna, bukan server.

## Pemeriksaan

```bash
npm run typecheck
npm run lint
npm test
npm run build
```
