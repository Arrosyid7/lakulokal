"""
clipper_core.py
Logika inti pemotongan klip untuk dipanggil dari backend web.
"""

import os
import subprocess
import tempfile
import yt_dlp

# Coba import speaker detection (opsional)
try:
    from speaker_detection import process_with_speaker_detection
    SPEAKER_DETECTION_AVAILABLE = True
except Exception:
    SPEAKER_DETECTION_AVAILABLE = False


def parse_seconds(time_str: str) -> float:
    """Konversi HH:MM:SS atau MM:SS ke detik."""
    parts = list(map(float, time_str.split(':')))
    if len(parts) == 3:
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
    elif len(parts) == 2:
        return parts[0] * 60 + parts[1]
    return float(parts[0])


def download_segment(url: str, start: str | None, end: str | None, out_path: str) -> bool:
    """
    Unduh video dari YouTube ke out_path.
    Untuk segmen custom, unduh seluruh video dulu lalu potong pakai ffmpeg.
    """
    temp_source = out_path
    if start and end:
        temp_source = out_path + '.full.mp4'

    ydl_opts = {
        'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        'outtmpl': temp_source,
        'force_overwrites': True,
        'quiet': True,
        'no_warnings': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        if start and end:
            ffmpeg_cmd = [
                'ffmpeg', '-y',
                '-ss', str(parse_seconds(start)),
                '-to', str(parse_seconds(end)),
                '-i', temp_source,
                '-c:v', 'libx264', '-preset', 'fast', '-crf', '20',
                '-c:a', 'aac',
                out_path,
            ]
            subprocess.run(ffmpeg_cmd, check=True,
                           stdout=subprocess.DEVNULL,
                           stderr=subprocess.DEVNULL)
            if os.path.exists(temp_source):
                os.remove(temp_source)

        return os.path.exists(out_path)
    except Exception as e:
        print(f'[download_segment] Error: {e}')
        return False


def cut_and_crop(input_path: str, output_path: str,
                 start_sec: float | None = None,
                 end_sec: float | None = None) -> bool:
    """
    Potong input_path (opsional: start/end dalam detik) lalu crop ke 9:16.
    Gunakan speaker detection jika tersedia, fallback ke center crop.
    """
    # Jika ada start/end, potong dulu dengan ffmpeg
    source = input_path
    temp_cut = None

    if start_sec is not None and end_sec is not None:
        temp_cut = input_path.replace('.mp4', '_cut.mp4')
        ffmpeg_cut = [
            'ffmpeg', '-y',
            '-ss', str(start_sec),
            '-to', str(end_sec),
            '-i', input_path,
            '-c', 'copy',
            temp_cut
        ]
        try:
            subprocess.run(ffmpeg_cut, check=True,
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            source = temp_cut
        except Exception as e:
            print(f'[cut_and_crop] ffmpeg cut error: {e}')
            return False

    # Crop ke 9:16
    success = False
    if SPEAKER_DETECTION_AVAILABLE:
        success = process_with_speaker_detection(
            input_path=source,
            output_path=output_path
        )

    if not success:
        # Fallback: center crop
        ffmpeg_crop = [
            'ffmpeg', '-y', '-i', source,
            '-vf', 'crop=ih*(9/16):ih',
            '-c:v', 'libx264', '-crf', '20', '-preset', 'fast',
            '-c:a', 'aac', output_path
        ]
        try:
            subprocess.run(ffmpeg_crop, check=True,
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            success = os.path.exists(output_path)
        except Exception as e:
            print(f'[cut_and_crop] ffmpeg crop error: {e}')
            success = False

    if temp_cut and os.path.exists(temp_cut):
        os.remove(temp_cut)

    return success


def process_custom_order(url: str, segments: list[dict], output_dir: str) -> list[str]:
    """
    Proses mode Custom: potong setiap segmen dari URL.

    Args:
        segments: list of { start: 'mm:ss'|None, end: 'mm:ss'|None }
        output_dir: direktori untuk menyimpan hasil

    Returns:
        list of output file paths (kosong jika semua gagal)
    """
    results = []
    for i, seg in enumerate(segments):
        start = seg.get('start') or None
        end   = seg.get('end')   or None
        out   = os.path.join(output_dir, f'klip_{i + 1:02d}.mp4')
        temp  = os.path.join(output_dir, f'raw_{i:02d}.mp4')

        ok = download_segment(url, start, end, temp)
        if ok:
            ok = cut_and_crop(temp, out)
            if os.path.exists(temp):
                os.remove(temp)
        if ok:
            results.append(out)

    return results


def process_auto_order(url: str, max_clips: int, output_dir: str,
                       groq_api_key: str) -> list[str]:
    """
    Proses mode Potong AI:
    1. Unduh seluruh video
    2. Transkripsi dengan Groq Whisper
    3. Analisis segmen dengan Groq Llama 3
    4. Potong dan crop setiap segmen
    """
    from groq_ai import transcribe_and_segment

    temp_full = os.path.join(output_dir, 'full_video.mp4')

    # 1. Unduh video
    ok = download_segment(url, None, None, temp_full)
    if not ok:
        return []

    # 2 & 3. Transkripsi + analisis AI → list of {start_sec, end_sec, title}
    segments = transcribe_and_segment(temp_full, max_clips, groq_api_key)
    if not segments:
        os.remove(temp_full)
        return []

    # 4. Potong dan crop tiap segmen
    results = []
    for i, seg in enumerate(segments):
        out = os.path.join(output_dir, f'klip_{i + 1:02d}.mp4')
        ok  = cut_and_crop(temp_full, out,
                           start_sec=seg['start_sec'],
                           end_sec=seg['end_sec'])
        if ok:
            results.append(out)

    if os.path.exists(temp_full):
        os.remove(temp_full)

    return results
