# Arsitektur proyek final

## Tujuan
Website publik menjadi UI utama dan satu-satunya entry point pengguna. Semua proses diproses melalui backend web Kubernetes-friendly yang konsisten dan siap dikembangkan lebih lanjut.

## Stack yang dipilih

- Backend: Flask
- Frontend: HTML, CSS, JavaScript di `landing/`
- Video processing: FFmpeg + yt-dlp
- AI/segmentasi: Groq + `groq_ai.py`
- Database: Supabase
- Payment: DOKU

## Struktur utama

```text
youtube-clipper/
├─ app/
│  ├─ __init__.py
│  └─ routes.py
├─ core/
│  ├─ clipper_core_adapter.py
│  ├─ processor.py
│  └─ ...
├─ services/
│  ├─ doku_service.py
│  ├─ supabase_service.py
│  └─ jobs.py
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
├─ supabase_schema.sql
├─ .env
├─ requirements.txt
├─ README.md
├─ PROJECT_STRUCTURE.md
└─ docs/
   └─ architecture.md
```

## Flow utama

1. User membuka domain publik seperti `https://lakulokal.my.id`
2. Form web menerima URL video dan mode processing
3. Flask backend membuat `job_id`
4. Worker memproses video di background thread
5. Frontend polling ke `/api/status?id=<job_id>`
6. Hasil klip ditampilkan di halaman web sebagai card dan tombol download premium

## Prinsip
- Web-first app
- Backend centric
- Frontend custom dan cepat
- Database/payment bersifat tambahan untuk production, bukan syarat utama di local dev
```