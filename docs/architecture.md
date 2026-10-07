# Arsitektur LakuLokal

Next.js App Router adalah aplikasi web utama. Vercel menyajikan halaman dan API; Supabase mengelola autentikasi, PostgreSQL, dan penyimpanan privat; Cloud Run Jobs menjalankan pemrosesan video setelah pembayaran diverifikasi.

## Struktur kode aktif

```text
app/                  Halaman Next.js dan route handler API
components/           Form autentikasi, dashboard, order, dan pembayaran
lib/                  Supabase, otorisasi, validasi, DANA, Cloud Run
worker/               Worker Python, FFmpeg, yt-dlp, dan Dockerfile
supabase_schema.sql   Schema, RLS, trigger, RPC, bucket, dan paket awal
vercel.json           Framework dan jadwal cron Vercel
```

## Alur request dan pemrosesan

1. Supabase Auth memverifikasi sesi. RLS dan pemeriksaan server membatasi data ke pemilik order atau admin.
2. Route handler membuat order dengan harga dari database, lalu meminta QRIS ke DANA.
3. Notifikasi DANA memicu pemeriksaan status pembayaran dari server sebelum order ditandai lunas.
4. Job yang sudah dibayar dikirim ke Cloud Run. Worker memeriksa kembali status lunas sebelum memproses video.
5. Worker menyimpan clip dan ZIP di bucket privat. API hanya mengeluarkan signed URL setelah memeriksa sesi, kepemilikan, dan status order.
6. Cron merekonsiliasi pembayaran dan membersihkan hasil yang melewati masa simpan.

Worker dibangun dan dideploy terpisah dari aplikasi Next.js. Jangan menaruh kredensial worker atau Supabase service role pada variabel `NEXT_PUBLIC_*`.

## Kesiapan operasional

- Worker saat ini menghasilkan segmen berdasarkan jarak waktu yang merata, bukan memilih highlight berdasarkan isi video dan tidak membuat subtitle otomatis.
- Deployment Cloud Run Job, secret, izin service account, koneksi storage, serta uji proses end-to-end tetap perlu dilakukan pada project Google Cloud dan Supabase target.
- Klaim dispatch yang tetap berstatus `DISPATCHING` lebih dari 15 menit dikembalikan ke antrean oleh RPC dispatcher. Terapkan migration `20261007080000_recover_stale_cloud_run_dispatch.sql` pada database yang sudah berjalan.
