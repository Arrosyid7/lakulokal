import os
import re
import subprocess
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

import yt_dlp
from supabase import create_client

MAX_DURATION_SECONDS = int(os.getenv("MAX_VIDEO_DURATION", "7200"))
MAX_CLIPS = int(os.getenv("MAX_CLIPS_PER_ORDER", "20"))
BUCKET = os.getenv("STORAGE_BUCKET", "lakulokal-results")


def required_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"{name} belum dikonfigurasi")
    return value


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def youtube_url_is_valid(value: str) -> bool:
    parsed = urlparse(value)
    return parsed.scheme == "https" and parsed.hostname in {
        "youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"
    }


def update_order(client, order_id: str, **values) -> None:
    response = client.table("orders").update(values).eq("id", order_id).execute()
    if not response.data:
        raise RuntimeError("Perubahan order tidak berhasil disimpan")


def set_job(client, order_id: str, **values) -> None:
    response = client.table("processing_jobs").update(values).eq("order_id", order_id).execute()
    if not response.data:
        raise RuntimeError("Status job tidak berhasil disimpan")


def run_ffmpeg(source: Path, destination: Path, start: float, duration: float) -> None:
    command = [
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-ss", f"{start:.3f}", "-i", str(source), "-t", f"{duration:.3f}",
        "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart",
        "-max_muxing_queue_size", "1024", str(destination)
    ]
    subprocess.run(command, check=True, capture_output=True, text=True, timeout=900)


def process(order_id: str) -> None:
    client = create_client(required_env("SUPABASE_URL"), required_env("SUPABASE_SERVICE_ROLE_KEY"))
    result = client.table("orders").select(
        "id,user_id,youtube_url,clip_count,payment_status,processing_status"
    ).eq("id", order_id).single().execute()
    order = result.data
    if order["payment_status"] != "PAID":
        raise RuntimeError("Order belum berstatus PAID")
    if order["processing_status"] == "COMPLETED":
        return
    if not youtube_url_is_valid(order["youtube_url"]):
        raise RuntimeError("URL video bukan tautan YouTube HTTPS yang diizinkan")

    count = int(order["clip_count"])
    if count < 1 or count > MAX_CLIPS:
        raise RuntimeError("Jumlah clip order melewati batas pemrosesan")
    update_order(client, order_id, processing_status="DOWNLOADING", processing_started_at=utc_now())
    set_job(client, order_id, status="DOWNLOADING", progress=5, started_at=utc_now())
    with tempfile.TemporaryDirectory(prefix="lakulokal-") as temp_dir:
        work = Path(temp_dir)
        source_template = work / "source.%(ext)s"
        options = {
            "format": "bestvideo[height<=1080]+bestaudio/best[height<=1080]/best",
            "outtmpl": str(source_template),
            "merge_output_format": "mp4",
            "noplaylist": True,
            "max_filesize": 2 * 1024 * 1024 * 1024,
            "match_filter": yt_dlp.utils.match_filter_func(f"duration < {MAX_DURATION_SECONDS}"),
            "quiet": True,
            "no_warnings": True
        }
        with yt_dlp.YoutubeDL(options) as downloader:
            metadata = downloader.extract_info(order["youtube_url"], download=True)
            if not metadata or not metadata.get("duration"):
                raise RuntimeError("Durasi video tidak dapat ditentukan")
            duration = float(metadata["duration"])
        if duration > MAX_DURATION_SECONDS:
            raise RuntimeError("Durasi video melewati batas yang diizinkan")
        sources = list(work.glob("source.*"))
        if not sources:
            raise RuntimeError("Video tidak berhasil diunduh")
        source = sources[0]

        update_order(client, order_id, processing_status="PROCESSING")
        set_job(client, order_id, status="PROCESSING", progress=15)
        clip_duration = min(60.0, duration / count)
        if clip_duration < 1:
            raise RuntimeError("Video terlalu singkat untuk dibuat menjadi clip")
        latest_start = max(0.0, duration - clip_duration)
        positions = [latest_start * index / max(1, count - 1) for index in range(count)]
        generated = []
        for index, start in enumerate(positions, start=1):
            file_name = f"clip_{index:02d}.mp4"
            output = work / file_name
            run_ffmpeg(source, output, start, clip_duration)
            generated.append((index, file_name, output))

        update_order(client, order_id, processing_status="UPLOADING")
        set_job(client, order_id, status="UPLOADING", progress=70)
        uploaded = []
        for index, file_name, output in generated:
            storage_path = f"{order['user_id']}/{order_id}/{file_name}"
            with output.open("rb") as video:
                client.storage.from_(BUCKET).upload(
                    storage_path,
                    video,
                    {"content-type": "video/mp4", "upsert": "true"}
                )
            uploaded.append({
                "order_id": order_id,
                "clip_number": index,
                "storage_path": storage_path,
                "file_name": file_name,
                "content_type": "video/mp4",
                "size_bytes": output.stat().st_size,
                "duration_seconds": round(clip_duration, 2)
            })
            set_job(client, order_id, progress=min(90, 70 + index * 4))

        client.table("clips").upsert(uploaded, on_conflict="order_id,clip_number").execute()
        archive = work / "result.zip"
        with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as result_zip:
            for _, file_name, output in generated:
                result_zip.write(output, arcname=file_name)
        zip_path = f"{order['user_id']}/{order_id}/result.zip"
        with archive.open("rb") as archive_file:
            client.storage.from_(BUCKET).upload(
                zip_path,
                archive_file,
                {"content-type": "application/zip", "upsert": "true"}
            )
        set_job(client, order_id, status="COMPLETED", progress=100, finished_at=utc_now())
        update_order(
            client,
            order_id,
            processing_status="COMPLETED",
            processing_completed_at=utc_now(),
            result_zip_path=zip_path,
            error_message=None
        )
        client.table("audit_logs").insert({
            "action": "PROCESSING_COMPLETED",
            "entity_type": "order",
            "entity_id": order_id,
            "metadata": {"clip_count": len(uploaded)}
        }).execute()


if __name__ == "__main__":
    order_id = required_env("ORDER_ID")
    if not re.fullmatch(r"[0-9a-fA-F-]{36}", order_id):
        raise RuntimeError("ORDER_ID tidak valid")
    try:
        process(order_id)
    except Exception as error:
        message = str(error)[:400]
        try:
            supabase = create_client(required_env("SUPABASE_URL"), required_env("SUPABASE_SERVICE_ROLE_KEY"))
            supabase.table("processing_jobs").update({
                "status": "FAILED",
                "error_message": message,
                "finished_at": utc_now()
            }).eq("order_id", order_id).execute()
            supabase.table("orders").update({
                "processing_status": "FAILED",
                "error_message": message
            }).eq("id", order_id).eq("payment_status", "PAID").execute()
            supabase.table("audit_logs").insert({
                "action": "PROCESSING_FAILED",
                "entity_type": "order",
                "entity_id": order_id,
                "metadata": {"error": message}
            }).execute()
        except Exception as persist_error:
            raise RuntimeError(f"Processing gagal dan status error tidak tersimpan: {persist_error}") from error
        raise
