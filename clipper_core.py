"""
clipper_core.py
Logika inti pemotongan klip untuk dipanggil dari backend web.
"""

import os
import subprocess
import tempfile
import glob
import yt_dlp
from yt_dlp.utils import download_range_func

# Coba import speaker detection (opsional)
try:
    from speaker_detection import process_with_speaker_detection
    SPEAKER_DETECTION_AVAILABLE = True
except Exception:
    SPEAKER_DETECTION_AVAILABLE = False


def parse_seconds(time_str: str | float | int) -> float:
    """Konversi HH:MM:SS atau MM:SS ke detik."""
    if isinstance(time_str, (int, float)):
        return float(time_str)
    parts = list(map(float, time_str.split(':')))
    if len(parts) == 3:
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
    elif len(parts) == 2:
        return parts[0] * 60 + parts[1]
    return float(parts[0])


def download_audio(url: str, out_path: str) -> bool:
    source_template = out_path[:-4] + '.source.%(ext)s' if out_path.endswith('.mp3') else out_path + '.source.%(ext)s'
    ydl_opts = {
        'format': 'bestaudio[abr<=96]/bestaudio',
        'outtmpl': source_template,
        'force_overwrites': True,
        'quiet': True,
        'no_warnings': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        sources = [
            path for path in glob.glob(source_template.replace('%(ext)s', '*'))
            if not path.endswith(('.part', '.ytdl'))
        ]
        if not sources:
            return False

        subprocess.run(
            ['ffmpeg', '-y', '-i', sources[0], '-vn', '-ar', '16000', '-ac', '1', '-b:a', '32k', out_path],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        return os.path.exists(out_path)
    except Exception as e:
        print(f'[download_audio] Error: {e}')
        return False
    finally:
        for source in glob.glob(source_template.replace('%(ext)s', '*')):
            if os.path.isfile(source):
                os.remove(source)


def download_segment(url: str, start: str | None, end: str | None, out_path: str) -> bool:
    """
    Unduh video dari YouTube ke out_path.
    Untuk segmen custom, unduh seluruh video dulu lalu potong pakai ffmpeg.
    """
    if start is not None and end is not None:
        start_sec = parse_seconds(start)
        end_sec = parse_seconds(end)
        if start_sec < 0 or end_sec <= start_sec:
            return False

        section_template = out_path[:-4] + '.section.%(ext)s' if out_path.endswith('.mp4') else out_path + '.section.%(ext)s'
        section_options = {
            'format': 'bestvideo[height<=720]+bestaudio/best[height<=720]',
            'outtmpl': section_template,
            'merge_output_format': 'mp4',
            'download_ranges': download_range_func(None, [(start_sec, end_sec)]),
            'force_keyframes_at_cuts': True,
            'force_overwrites': True,
            'quiet': True,
            'no_warnings': True,
        }

        try:
            with yt_dlp.YoutubeDL(section_options) as ydl:
                ydl.download([url])

            sections = [
                path for path in glob.glob(section_template.replace('%(ext)s', '*'))
                if not path.endswith(('.part', '.ytdl'))
            ]
            merged = next((path for path in sections if path.endswith('.section.mp4')), None)
            if not merged:
                return False

            os.replace(merged, out_path)
            return os.path.exists(out_path)
        except Exception as e:
            print(f'[download_segment] Section download error: {e}')
            return False
        finally:
            for section in glob.glob(section_template.replace('%(ext)s', '*')):
                if os.path.isfile(section):
                    os.remove(section)

    temp_source = out_path

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

        return os.path.exists(out_path)
    except Exception as e:
        print(f'[download_segment] Error: {e}')
        return False


def download_full_video_720(url: str, out_path: str) -> bool:
    ydl_opts = {
        'format': 'bestvideo[height<=720]+bestaudio/best[height<=720]',
        'outtmpl': out_path,
        'merge_output_format': 'mp4',
        'force_overwrites': True,
        'quiet': True,
        'no_warnings': True,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        return os.path.exists(out_path)
    except Exception as e:
        print(f'[download_full_video_720] Error: {e}')
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
            '-c:a', 'aac', '-movflags', '+faststart', output_path
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
    fallback_source = os.path.join(output_dir, 'fallback_full_720.mp4')
    fallback_attempted = False

    try:
        for i, seg in enumerate(segments):
            start = seg.get('start') or None
            end = seg.get('end') or None
            out = os.path.join(output_dir, f'klip_{i + 1:02d}.mp4')
            temp = os.path.join(output_dir, f'raw_{i:02d}.mp4')

            ok = download_segment(url, start, end, temp)
            if ok:
                ok = cut_and_crop(temp, out)

            if not ok and start is not None and end is not None:
                if not fallback_attempted:
                    fallback_attempted = True
                    print('[process_custom_order] Section download failed; retrying from full 720p source.')
                    if not download_full_video_720(url, fallback_source):
                        fallback_source = None

                if fallback_source and os.path.exists(fallback_source):
                    ok = cut_and_crop(
                        fallback_source,
                        out,
                        start_sec=parse_seconds(start),
                        end_sec=parse_seconds(end),
                    )

            if ok:
                results.append(out)
            elif os.path.exists(out):
                os.remove(out)

            if os.path.exists(temp):
                os.remove(temp)
    finally:
        if fallback_source and os.path.exists(fallback_source):
            os.remove(fallback_source)

    return results


def process_auto_order(url: str, max_clips: int, output_dir: str,
                       groq_api_key: str) -> list[str]:
    """
    Proses mode Potong AI:
    1. Unduh audio saja untuk transkripsi
    2. Transkripsi dengan Groq Whisper
    3. Analisis segmen dengan Groq Llama 3
    4. Unduh rentang video terpilih dan crop
    """
    from groq_ai import transcribe_and_segment

    temp_audio = os.path.join(output_dir, 'full_audio.mp3')

    ok = download_audio(url, temp_audio)
    if not ok:
        return []

    try:
        segments = transcribe_and_segment(temp_audio, max_clips, groq_api_key)
    finally:
        if os.path.exists(temp_audio):
            os.remove(temp_audio)
    if not segments:
        return []

    results = []
    for i, seg in enumerate(segments):
        out = os.path.join(output_dir, f'klip_{i + 1:02d}.mp4')
        temp = os.path.join(output_dir, f'raw_{i:02d}.mp4')
        ok = download_segment(url, seg['start_sec'], seg['end_sec'], temp)
        if ok:
            ok = cut_and_crop(temp, out)
        if os.path.exists(temp):
            os.remove(temp)
        if ok:
            results.append(out)

    return results
