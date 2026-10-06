# Struktur Proyek yang Rapi

Tujuan: satu folder untuk satu fungsi, supaya project lebih mudah dibaca, diuji, dan dikembangkan.

## Stack final yang dipilih

- Backend: Flask
- Frontend: HTML, CSS, JavaScript (di `landing/`)
- Video processing: FFmpeg + yt-dlp
- AI: Groq
- Database: Supabase
- Payment: DOKU

## Struktur proyek

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
│  ├─ blog/
│  └─ assets/
├─ docs/
│  └─ architecture.md
├─ outputs/
├─ server.py
├─ clipper_core.py
├─ groq_ai.py
├─ requirements.txt
├─ .env
├─ .env.example
├─ supabase_schema.sql
├─ README.md
└─ PROJECT_STRUCTURE.md
```

## Aturan pembagian folder

- app/: routing dan API web
- core/: logika video, AI, segmentasi, encoder
- services/: integrasi Supabase, DOKU, dan job processing
- landing/: file frontend public
- outputs/: hasil klip yang dihasilkan user
- docs/: dokumentasi arsitektur dan flow sistem

## Prinsip desain

1. Semua UI utama hidup di web form
2. Semua proses produksi lewat Flask backend
3. Frontend selalu polling status hasil proses ke API backend
4. Database/payment hanya menjadi layer tambahan, bukan dependency utama untuk local dev
5. Semua entry point user sepenuhnya web-first dan konsisten

## Keputusan final

Proyek ini sepenuhnya di-set sebagai web-first app dan tidak lagi memiliki dependency runtime tambahan untuk UI pengguna.