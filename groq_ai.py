"""
groq_ai.py
Transkripsi audio dengan Groq Whisper + analisis segmen dengan Groq Llama 3.
Keduanya menggunakan Groq API yang 100% gratis (tier gratis sangat besar).

Cara dapat API key gratis:
  1. Daftar di https://console.groq.com
  2. Buat API key baru di Settings → API Keys
  3. Taruh di .env: GROQ_API_KEY=gsk_...
"""

import os
import json
import subprocess
import tempfile
from groq import Groq

GROQ_CHAT_MODEL = os.getenv('GROQ_CHAT_MODEL', 'openai/gpt-oss-20b')


def extract_audio(video_path: str, audio_path: str) -> bool:
    """Ekstrak audio dari video ke MP3 untuk dikirim ke Whisper."""
    cmd = [
        'ffmpeg', '-y', '-i', video_path,
        '-vn', '-ar', '16000', '-ac', '1', '-b:a', '64k',
        audio_path
    ]
    try:
        subprocess.run(cmd, check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return os.path.exists(audio_path)
    except Exception as e:
        print(f'[groq_ai] extract_audio error: {e}')
        return False


def transcribe_audio(audio_path: str, client: Groq) -> dict | None:
    """
    Transkripsi audio dengan Groq Whisper (whisper-large-v3).
    Model ini gratis di Groq dengan limit yang sangat besar.
    Return: response object dengan .text dan .segments
    """
    try:
        with open(audio_path, 'rb') as f:
            transcription = client.audio.transcriptions.create(
                file=(os.path.basename(audio_path), f.read()),
                model='whisper-large-v3',
                response_format='verbose_json',  # include timestamps per segment
                language='id',  # Indonesia; ubah ke 'en' jika video bahasa Inggris
                temperature=0.0,
            )
        return transcription
    except Exception as e:
        print(f'[groq_ai] transcribe_audio error: {e}')
        return None


def analyze_segments(transcript_text: str, timestamps: list[dict],
                     max_clips: int, client: Groq) -> list[dict]:
    """
    Minta model chat Groq untuk menentukan titik potong yang natural berdasarkan transkrip.
    Model default: openai/gpt-oss-20b, model yang tersedia pada key Groq aktif saat ini.

    Args:
        transcript_text: teks transkrip lengkap
        timestamps: list of { start: float, end: float, text: str }
        max_clips: batas jumlah klip

    Returns:
        list of { start_sec: float, end_sec: float, title: str }
    """
    # Format timestamps untuk prompt
    ts_lines = '\n'.join(
        f'[{s["start"]:.1f}s - {s["end"]:.1f}s]: {s["text"].strip()}'
        for s in timestamps[:200]  # batasi agar tidak overflow konteks
    )

    prompt = f"""Kamu adalah editor video profesional. Diberikan transkrip video YouTube dengan timestamp berikut:

{ts_lines}

Tugasmu: tentukan maksimal {max_clips} segmen klip yang paling bermakna dan bisa berdiri sendiri. Setiap segmen harus:
- Memiliki pembuka dan penutup yang natural (tidak terpotong di tengah kalimat)
- Memiliki durasi antara 30 detik hingga 3 menit
- Mewakili satu topik atau momen yang utuh

Kembalikan HANYA JSON array, tanpa markdown, tanpa penjelasan:
[
  {{"start_sec": 12.5, "end_sec": 78.0, "title": "Judul singkat klip"}},
  ...
]"""

    try:
        response = client.chat.completions.create(
            model=GROQ_CHAT_MODEL,
            messages=[{'role': 'user', 'content': prompt}],
            temperature=0.2,
            max_tokens=1024,
        )
        raw = response.choices[0].message.content.strip()

        # Bersihkan jika ada markdown fence
        if raw.startswith('```'):
            raw = raw.split('```')[1]
            if raw.startswith('json'):
                raw = raw[4:]
        raw = raw.strip()

        segments = json.loads(raw)
        return segments[:max_clips]

    except Exception as e:
        print(f'[groq_ai] analyze_segments error: {e}')
        return []


def transcribe_and_segment(video_path: str, max_clips: int,
                           api_key: str) -> list[dict]:
    """
    Pipeline lengkap: video → transkripsi Whisper → analisis Llama 3 → segmen.

    Returns:
        list of { start_sec: float, end_sec: float, title: str }
        (kosong jika gagal)
    """
    client = Groq(api_key=api_key)

    # Ekstrak audio sementara
    audio_path = video_path.replace('.mp4', '_audio.mp3')
    if not extract_audio(video_path, audio_path):
        return []

    try:
        # Transkripsi
        print('[groq_ai] Mentranskripsi audio dengan Whisper...')
        transcription = transcribe_audio(audio_path, client)
        if not transcription:
            return []

        full_text = transcription.text
        # Ambil timestamps per kalimat dari verbose_json
        raw_segs = getattr(transcription, 'segments', []) or []
        timestamps = [
            {'start': s.get('start', 0), 'end': s.get('end', 0), 'text': s.get('text', '')}
            for s in raw_segs
        ]

        if not timestamps:
            # Fallback: tanpa timestamps, minta AI potong berdasarkan teks saja
            print('[groq_ai] Tidak ada timestamps, potong berdasarkan teks.')
            return []

        # Analisis dengan Llama 3
        print(f'[groq_ai] Menganalisis {len(timestamps)} segmen dengan Llama 3...')
        segments = analyze_segments(full_text, timestamps, max_clips, client)
        return segments

    finally:
        if os.path.exists(audio_path):
            os.remove(audio_path)
