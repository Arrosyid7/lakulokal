# LakuLokal

LakuLokal mengubah video YouTube menjadi clip siap upload. Aplikasi web menggunakan Next.js App Router, TypeScript, Tailwind CSS, Supabase Auth/PostgreSQL/Storage, DANA Dynamic QRIS, dan Google Cloud Run Jobs.

## Arsitektur

- Next.js menangani halaman web dan API server-side. Deploy target: Vercel.
- Supabase Auth menangani password dan sesi. Password tidak disimpan di tabel aplikasi.
- PostgreSQL menyimpan profil, paket, order, pembayaran, antrean kerja, hasil clip, dan audit.
- Bucket `lakulokal-results` bersifat private. API hanya menerbitkan signed URL singkat setelah memeriksa sesi, kepemilikan order, dan status selesai.
- DANA QR dibuat server-side. Notifikasi hanya menjadi pemicu rekonsiliasi; server mengambil status pembayaran dari API DANA dan mencocokkan referensi, merchant, dan jumlah sebelum menandai PAID.
- Cloud Run Job mengunduh video dengan yt-dlp, menghasilkan lima clip vertikal dengan FFmpeg, lalu mengunggah clip dan ZIP ke Supabase Storage.
- Scheduled routes merekonsiliasi pembayaran, mengirim antrean ke Cloud Run, dan menghapus hasil setelah masa simpan.

Dokumentasi struktur route dan alur data tersedia di [docs/architecture.md](./docs/architecture.md). Worker dideploy terpisah sebagai Cloud Run Job dari folder `worker/`.

## Menjalankan lokal

1. Pasang Node.js versi 20 atau lebih baru.
2. Salin `.env.example` menjadi `.env.local`, lalu isi Supabase.
3. Terapkan `supabase_schema.sql` ke project Supabase.
4. Atur URL callback Auth di Supabase ke `http://localhost:3000/auth/callback` dan `http://localhost:3000/reset-password`.
5. Jalankan:

```bash
npm install
npm run dev
```

Order creation akan mengembalikan `503` sampai seluruh konfigurasi Supabase service-role dan DANA tersedia. Tidak ada status pembayaran simulasi.

## Supabase

Jalankan `supabase_schema.sql` pada SQL Editor atau melalui Supabase CLI. Script membuat tabel, role, trigger profil Auth, RLS, paket awal `5 Clip`, audit log, limit order per user, RPC transaksi pembayaran, dan bucket private. Jika schema sudah pernah diterapkan, jalankan migration `supabase/migrations/20260413000000_fix_confirm_paid_order_payment_reference.sql` untuk memperbaiki pembaruan status payment saat Finish Notify diterima.

Setelah membuat serta memverifikasi akun administrator, ubah role melalui Supabase SQL Editor:

```sql
update public.profiles set role = 'ADMIN' where email = 'alamat-admin-yang-sudah-diverifikasi@example.com';
```

Jangan memberikan akses `service_role` ke browser. Jangan memberikan grant update untuk status order kepada user.

## DANA dan batas kesiapan produksi

Integrasi memakai SDK resmi `dana-node` untuk DANA Gapura Custom Checkout: Create Order API dengan metode QRIS, Query Payment API, dan `WebhookParser` untuk memverifikasi Finish Notify memakai signature SNAP dan public key DANA. Aplikasi mengambil ulang status pembayaran dari DANA sebelum order dinyatakan lunas.

```text
https://domain-anda/api/payment/dana/notify
```

Daftarkan URL HTTPS publik tersebut sebagai Notification URL di konfigurasi merchant DANA. `DANA_PARTNER_ID`, `DANA_PRIVATE_KEY`, `DANA_MERCHANT_ID`, dan `DANA_MCC` harus berasal dari onboarding DANA. SDK menggunakan public key sandbox bawaan ketika `DANA_ENV=sandbox`; untuk production, isi `DANA_PUBLIC_KEY` dengan public key notifikasi dari DANA. Jangan mengaktifkan production sebelum callback, query, dan pembayaran diuji melalui skenario merchant/UAT DANA.

## Worker Cloud Run

Bangun image dari direktori `worker/` dan deploy sebagai Cloud Run Job bernama sesuai `CLOUD_RUN_JOB_NAME`. Konfigurasikan service account job agar dapat membaca order dan mengunggah file ke bucket Supabase. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STORAGE_BUCKET`, dan `MAX_VIDEO_DURATION` sebagai secret/environment job. Next.js mengirim `ORDER_ID` sebagai override saat pembayaran terverifikasi.

Worker memeriksa kembali status `PAID` sebelum mengunduh, membatasi video maksimal dua jam secara default, menghasilkan MP4 H.264/AAC berukuran 1080x1920, dan menyimpan lima segmen yang tersebar sepanjang video. Pastikan penggunaan video mematuhi hak cipta serta ketentuan YouTube.

## Deploy Vercel

1. Hubungkan repository ke Vercel dengan framework Next.js.
2. Isi environment variables dari `.env.example` di Vercel. Jangan menaruh service-role key, private key, public verification key, atau service-account JSON pada variable `NEXT_PUBLIC_*`.
3. Pasang migrations/schema ke Supabase dan deploy Cloud Run Job.
4. Konfigurasikan Notification URL DANA dan public key Finish Notify sesuai environment sandbox atau production.
5. Aktifkan Vercel Cron untuk `/api/cron/reconcile-payments` dan `/api/cron/cleanup-results`, serta set `CRON_SECRET`.
6. Pastikan paket Vercel mendukung jadwal cron yang dipakai dan uji callback/payment query di sandbox sebelum beralih ke production.

`GOOGLE_SERVICE_ACCOUNT_JSON` harus berisi credential service account server-side dengan izin minimum untuk menjalankan Cloud Run Job. Jika deployment Anda memakai Workload Identity Federation, ganti helper Cloud Run agar memakai penyedia identitas deployment tersebut.

## Pemeriksaan

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Integrasi live tetap membutuhkan project Supabase, akun merchant DANA, project Google Cloud, dan uji callback dari sandbox. Tidak ada credential tersebut di repository.
