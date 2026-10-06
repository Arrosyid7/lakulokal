"""
speaker_detection.py
Modul deteksi pembicara aktif berdasarkan gerakan bibir menggunakan MediaPipe Face Mesh.
Digunakan untuk men-crop video 9:16 terfokus pada orang yang sedang berbicara.
"""

import cv2
import mediapipe as mp
import numpy as np
import subprocess
import os

# Indeks landmark bibir dari MediaPipe Face Mesh (468 titik)
# Bibir atas tengah: 13, Bibir bawah tengah: 14
# Sudut bibir kiri: 61, Sudut bibir kanan: 291
LIP_TOP = 13
LIP_BOTTOM = 14
LIP_LEFT = 61
LIP_RIGHT = 291

# Landmark untuk bounding box wajah (dahi atas dan dagu bawah)
FOREHEAD = 10
CHIN = 152
FACE_LEFT = 234
FACE_RIGHT = 454

mp_solutions = getattr(mp, 'solutions', None)
mp_face_mesh = getattr(mp_solutions, 'face_mesh', None) if mp_solutions else None


def get_lip_openness(landmarks, img_h, img_w):
    """Hitung rasio keterbukaan bibir (0.0 = tertutup, > 0.1 = bicara)."""
    top = landmarks[LIP_TOP]
    bottom = landmarks[LIP_BOTTOM]
    left = landmarks[LIP_LEFT]
    right = landmarks[LIP_RIGHT]

    mouth_height = abs(bottom.y - top.y) * img_h
    mouth_width = abs(right.x - left.x) * img_w

    if mouth_width == 0:
        return 0.0
    return mouth_height / mouth_width  # rasio bukaan relatif terhadap lebar mulut


def get_face_center(landmarks, img_h, img_w):
    """Dapatkan koordinat pixel pusat wajah."""
    forehead = landmarks[FOREHEAD]
    chin = landmarks[CHIN]
    face_left = landmarks[FACE_LEFT]
    face_right = landmarks[FACE_RIGHT]

    cx = int(((face_left.x + face_right.x) / 2) * img_w)
    cy = int(((forehead.y + chin.y) / 2) * img_h)
    face_h = int(abs(chin.y - forehead.y) * img_h)
    face_w = int(abs(face_right.x - face_left.x) * img_w)

    return cx, cy, max(face_w, face_h)  # pusat x, y, ukuran wajah


def smooth_position(history, new_val, alpha=0.15):
    """Exponential moving average untuk smoothing posisi crop."""
    if not history:
        return new_val
    return int(alpha * new_val + (1 - alpha) * history[-1])


def process_with_speaker_detection(input_path, output_path, status_callback=None):
    """
    Proses video dengan deteksi pembicara aktif.
    
    Args:
        input_path: Path ke video input
        output_path: Path ke video output
        status_callback: Fungsi callback(teks, progress_0_to_100) untuk update UI
    
    Returns:
        True jika berhasil, False jika gagal (akan fallback ke center crop)
    """
    try:
        if mp_face_mesh is None:
            return False

        cap = cv2.VideoCapture(input_path)
        if not cap.isOpened():
            return False

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        orig_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        orig_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        if total_frames == 0 or orig_w == 0 or orig_h == 0:
            cap.release()
            return False

        # Target ukuran output: 9:16 vertikal
        target_w = int(orig_h * 9 / 16)
        target_h = orig_h

        # Pastikan target_w tidak melebihi orig_w
        if target_w > orig_w:
            # Video sudah lebih sempit dari 9:16, crop secara vertikal
            target_w = orig_w
            target_h = int(orig_w * 16 / 9)

        temp_video_path = output_path.replace(".mp4", "_noaudio.mp4")

        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(temp_video_path, fourcc, fps, (target_w, target_h))

        # Sliding window untuk menentukan speaker dominan
        WINDOW_SIZE = max(int(fps * 1.5), 30)  # ~1.5 detik window
        lip_scores_window = []   # list of (face_idx, score) per frame
        speaker_cx_history = [] # history posisi X crop center

        # Default center
        default_cx = orig_w // 2

        if status_callback:
            status_callback("Menganalisis pembicara dalam video...", 72)

        face_mesh = mp_face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=6,
            refine_landmarks=False,
            min_detection_confidence=0.4,
            min_tracking_confidence=0.4
        )

        # Pre-scan: kumpulkan lip score semua frame untuk smooth tracking
        # Karena video bisa panjang, kita proses langsung saat write
        
        frame_idx = 0
        # Buffer untuk window smoothing
        recent_face_scores = []  # per-frame list of (cx, lip_score)
        crop_cx = default_cx  # current crop center x

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            frame_idx += 1

            # Update progress (72% → 95%)
            if status_callback and frame_idx % max(1, total_frames // 20) == 0:
                pct = 72 + int((frame_idx / total_frames) * 23)
                status_callback(
                    f"Mendeteksi pembicara... ({frame_idx}/{total_frames} frame)",
                    pct
                )

            # Deteksi wajah & lip score
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = face_mesh.process(rgb)

            frame_faces = []  # (cx, lip_score) untuk frame ini
            if results.multi_face_landmarks:
                for face_landmarks in results.multi_face_landmarks:
                    lm = face_landmarks.landmark
                    lip_open = get_lip_openness(lm, orig_h, orig_w)
                    fcx, fcy, fsize = get_face_center(lm, orig_h, orig_w)
                    frame_faces.append((fcx, lip_open))

            recent_face_scores.append(frame_faces)
            if len(recent_face_scores) > WINDOW_SIZE:
                recent_face_scores.pop(0)

            # Tentukan speaker dari window terakhir
            if recent_face_scores:
                # Kumpulkan total lip score per posisi-x (cluster wajah sederhana)
                # Wajah dengan total lip_score tertinggi = speaker
                face_accumulator = {}  # cx_bucket -> total_score
                BUCKET = target_w // 4 or 1  # toleransi posisi wajah

                for fframe in recent_face_scores:
                    for (fcx, fscore) in fframe:
                        bucket = (fcx // BUCKET) * BUCKET
                        face_accumulator[bucket] = face_accumulator.get(bucket, 0) + fscore

                if face_accumulator:
                    best_bucket = max(face_accumulator, key=face_accumulator.get)
                    target_cx = best_bucket + BUCKET // 2

                    # Smooth transisi
                    crop_cx = smooth_position(speaker_cx_history, target_cx, alpha=0.08)
                    speaker_cx_history.append(crop_cx)
                    if len(speaker_cx_history) > WINDOW_SIZE:
                        speaker_cx_history.pop(0)

            # Hitung koordinat crop
            half_w = target_w // 2
            x1 = crop_cx - half_w
            x2 = crop_cx + half_w

            # Clamp agar tidak keluar batas frame
            if x1 < 0:
                x1 = 0
                x2 = target_w
            if x2 > orig_w:
                x2 = orig_w
                x1 = orig_w - target_w

            x1 = max(0, x1)
            x2 = min(orig_w, x2)

            # Crop frame
            if target_h < orig_h:
                # Crop vertikal juga (center)
                y1 = (orig_h - target_h) // 2
                y2 = y1 + target_h
                cropped = frame[y1:y2, x1:x2]
            else:
                cropped = frame[0:orig_h, x1:x2]

            # Pastikan ukuran output konsisten
            if cropped.shape[1] != target_w or cropped.shape[0] != target_h:
                cropped = cv2.resize(cropped, (target_w, target_h))

            out.write(cropped)

        cap.release()
        out.release()
        face_mesh.close()

        if status_callback:
            status_callback("Menggabungkan audio...", 96)

        # Gabungkan video hasil crop dengan audio asli menggunakan ffmpeg
        ffmpeg_merge = [
            'ffmpeg', '-y',
            '-i', temp_video_path,
            '-i', input_path,
            '-map', '0:v:0',
            '-map', '1:a:0',
            '-c:v', 'libx264',
            '-crf', '20',
            '-preset', 'fast',
            '-c:a', 'aac',
            '-shortest',
            '-movflags', '+faststart',
            output_path
        ]
        subprocess.run(ffmpeg_merge, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        # Hapus file sementara
        if os.path.exists(temp_video_path):
            os.remove(temp_video_path)

        return True

    except Exception as e:
        # Cleanup jika ada error
        try:
            cap.release()
            out.release()
        except Exception:
            pass
        if os.path.exists(temp_video_path if 'temp_video_path' in dir() else ''):
            os.remove(temp_video_path)
        print(f"[speaker_detection] Error: {e}")
        return False
