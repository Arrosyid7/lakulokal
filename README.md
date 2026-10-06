# YouTube Clipper

Stack utama yang dipilih: Flask + HTML/CSS/JavaScript + FFmpeg + yt-dlp + Groq + Supabase + DOKU.

## Pilihan stack

- UI utama: public web form yang berjalan di server Flask
- Backend utama: Flask (`server.py`)
- Frontend: HTML, CSS, JavaScript di folder `landing/`
- Proses video: `ffmpeg` + `yt-dlp`
- AI segmentasi: Groq dan `groq_ai.py`
- Database: Supabase
- Payment: DOKU
- Runtime utama: web-only, tanpa dependency tambahan untuk UI pengguna

## Arsitektur utama

1. User mengakses halaman web di domain publik, misalnya `https://lakulokal.my.id`
2. Form web mengirim request ke API Flask
3. Backend membuat `job_id` dan memproses tugas di background thread
4. Output video disimpan di `outputs/<job_id>/`
5. Frontend polling ke `/api/status?id=<job_id>` untuk mengetahui hasil
6. Setelah selesai, user klik tombol download premium untuk mengambil file klip

## Jalankan server

```bash
python -m pip install -r requirements.txt
python server.py
```

## Struktur folder

```text
youtube-clipper/
├─ app/
│  ├─ __init__.py
│  └─ routes.py
├─ core/
│  ├─ clipper_core_adapter.py
│  └─ ...
├─ services/
│  ├─ doku_service.py
│  ├─ supabase_service.py
│  └─ ...
├─ landing/
│  ├─ index.html
│  ├─ coba.html
│  ├─ main.js
│  ├─ sukses.js
│  └─ blog/
├─ outputs/
├─ server.py
├─ clipper_core.py
├─ groq_ai.py
├─ requirements.txt
├─ .env
├─ README.md
├─ PROJECT_STRUCTURE.md
└─ supabase_schema.sql
```

## Keputusan final

Aplikasi utama berjalan sepenuhnya di web form. Semua pengalaman pengguna berpusat pada frontend web publik dan backend Flask.