# Production deployment guide

Domain utama:
- https://lakulokal.my.id
- https://www.lakulokal.my.id

## DNS
Tambahkan record berikut ke provider DNS kamu:

- A record: lakulokal.my.id -> IP VPS
- A record: www.lakulokal.my.id -> IP VPS

## Nginx
Gunakan file konfigurasi contoh di folder ini untuk reverse proxy ke Flask.

- Web utama: port 5000

## Service runtime
Jalankan Flask dengan Gunicorn atau uWSGI.

```bash
gunicorn server:app --bind 0.0.0.0:5000 --workers 2
```

## Contoh deployment
1. Clone project ke VPS
2. Isi file .env dengan credential asli
3. Install dependency dari requirements.txt
4. Jalankan Gunicorn untuk Flask
5. Konfigurasi Nginx reverse proxy
6. Aktifkan SSL Let's Encrypt

## SSL
Gunakan Certbot:

```bash
sudo certbot --nginx -d lakulokal.my.id -d www.lakulokal.my.id
```

## Safety note
Jangan gunakan localhost untuk production. Pastikan semua callback, webhook, dan API base selalu menggunakan domain publik.
