r"""
server.py
Flask backend untuk lakulokal:
  - GET  /                   → serve landing/index.html
  - GET  /coba.html etc.     → serve file dari folder landing/
  - POST /api/webhook/doku   → terima notifikasi pembayaran dari DOKU
  - GET  /api/status?id=...  → polling status order dari sukses.html
  - GET  /api/download/<id>/<n> → download file klip

Jalankan: .venv\Scripts\python.exe server.py
"""

import os
import uuid
import json
import threading
import time
from pathlib import Path
from typing import Any

import requests
from flask import Flask, request, jsonify, send_file, send_from_directory, redirect
from flask_cors import CORS
from dotenv import load_dotenv

from app.routes import api_bp
from core.clipper_core_adapter import run_clip_task
from services.doku_service import create_payment, is_doku_ready
from services.supabase_service import save_order, is_supabase_ready

try:
    from supabase import create_client
except Exception:  # pragma: no cover
    create_client = None

load_dotenv()  # baca .env

LANDING_DIR = Path(__file__).parent / 'landing'
PUBLIC_BASE_URL = os.getenv('PUBLIC_BASE_URL') or os.getenv('APP_BASE_URL') or os.getenv('SITE_URL') or 'https://lakulokal.my.id'
APP_NAME = os.getenv('APP_NAME', 'lakulokal')
APP_MODE = os.getenv('APP_MODE', 'public')

app = Flask(__name__, static_folder=None)
CORS(app, resources={r'/*': {'origins': '*'}})

# ── Direktori output ──────────────────────────────────────────────────────
OUTPUT_DIR = Path('outputs')
OUTPUT_DIR.mkdir(exist_ok=True)

# ── In-memory job store ───────────────────────────────────────────────────
# Format: { job_id: { status, clips, error, created_at, order } }
# Production: ganti dengan Redis atau SQLite
jobs: dict = {}
jobs_lock = threading.Lock()
JOB_HISTORY_LIMIT = 12

GROQ_API_KEY = os.getenv('GROQ_API_KEY', '')
DOKU_CLIENT_ID = os.getenv('DOKU_CLIENT_ID', '')
DOKU_SECRET_KEY = os.getenv('DOKU_SECRET_KEY', '')
DOKU_BASE_URL = os.getenv('DOKU_BASE_URL', 'https://api.doku.com')
DOKU_WEBHOOK_SECRET = os.getenv('DOKU_WEBHOOK_SECRET', '')
APP_BASE_URL = os.getenv('APP_BASE_URL', 'https://lakulokal.my.id')
SUPABASE_URL = os.getenv('SUPABASE_URL', '')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '') or os.getenv('SUPABASE_KEY', '')
SUPABASE_READY = bool(SUPABASE_URL and SUPABASE_KEY and create_client)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_READY else None
app.register_blueprint(api_bp)


# ── Helpers ───────────────────────────────────────────────────────────────
def set_job(job_id: str, data: dict):
    with jobs_lock:
        jobs[job_id] = data

def get_job(job_id: str) -> dict | None:
    with jobs_lock:
        return jobs.get(job_id)

def update_job(job_id: str, **kwargs):
    with jobs_lock:
        if job_id in jobs:
            jobs[job_id].update(kwargs)


def build_job_summary(job_id: str, job: dict) -> dict:
    """Ringkas status job untuk history list di frontend."""
    order = job.get('order') or {}
    clips = job.get('clips') or []
    first_clip = clips[0] if clips else None
    url = (order.get('url') or '').strip()
    return {
        'job_id': job_id,
        'status': job.get('status', 'pending'),
        'created_at': job.get('created_at'),
        'url': url,
        'title': order.get('title') or 'Video YouTube',
        'mode': order.get('mode', 'custom'),
        'clip_count': len(clips),
        'preview_url': first_clip.get('url') if first_clip else None,
        'download_url': first_clip.get('url') if first_clip else None,
    }


def parse_ref(ref_raw: str | None) -> dict:
    """Decode ?ref= yang dikirim dari main.js."""
    if not ref_raw:
        return {}
    try:
        from urllib.parse import unquote
        return json.loads(unquote(ref_raw))
    except Exception:
        return {}


def persist_order_to_supabase(order_id: str, data: dict):
    """Simpan order ke Supabase bila konfigurasi tersedia."""
    if not is_supabase_ready():
        return None
    try:
        payload = {
            'id': order_id,
            'user_id': data.get('user_id'),
            'url': data.get('url', ''),
            'mode': data.get('mode', 'custom'),
            'status': data.get('status', 'pending'),
            'payment_status': data.get('payment_status', 'unpaid'),
            'amount': float(data.get('amount', 0)),
            'currency': data.get('currency', 'IDR'),
            'metadata': data.get('metadata', {}),
            'created_at': data.get('created_at') or time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            'updated_at': data.get('updated_at') or time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        }
        return save_order(order_id, payload)
    except Exception as exc:
        print(f'[supabase] order persist failed: {exc}')
        return None


def create_doku_payment(order: dict):
    """Membuat checkout/redirect di DOKU bila credential tersedia."""
    return create_payment(order)


# ── Background worker ─────────────────────────────────────────────────────
def run_job(job_id: str, order: dict):
    """Jalankan pemrosesan klip di thread terpisah."""
    job_output_dir = OUTPUT_DIR / job_id
    job_output_dir.mkdir(exist_ok=True)

    update_job(job_id, status='processing')

    try:
        url = order.get('url', '')
        mode = order.get('mode', 'custom')
        payload = {
            'segments': order.get('segments', [{'start': None, 'end': None}]),
            'max_clips': int(order.get('max_clips', order.get('max', 5)) or 5),
            'groq_key': GROQ_API_KEY,
        }

        result_files = run_clip_task(url, mode, str(job_output_dir), **payload)

        if result_files:
            clip_list = [
                {
                    'filename': Path(f).name,
                    'url': f'/api/download/{job_id}/{Path(f).name}',
                    'size_mb': round(os.path.getsize(f) / 1_000_000, 1)
                }
                for f in result_files if os.path.exists(f)
            ]
            update_job(job_id, status='done', clips=clip_list)
        else:
            update_job(job_id, status='error',
                       error='Tidak ada klip yang berhasil diproses. Cek apakah video dapat diakses.')

    except Exception as e:
        update_job(job_id, status='error', error=str(e))
        print(f'[run_job] Error job {job_id}: {e}')


# ── Routes ────────────────────────────────────────────────────────────────

# ── Static file serving (landing page) ────────────────────────────────────
@app.route('/')
def index():
    return send_from_directory(str(LANDING_DIR), 'index.html')

@app.route('/blog')
def blog_redirect():
    return redirect('/blog/', code=302)

@app.route('/coba')
def coba_redirect():
    return redirect('/coba.html', code=302)

@app.route('/syarat')
def syarat_redirect():
    return redirect('/syarat.html', code=302)

@app.route('/privasi')
def privasi_redirect():
    return redirect('/privasi.html', code=302)

@app.route('/sukses')
def sukses_redirect():
    return redirect('/sukses.html', code=302)

@app.route('/<path:filename>')
def static_landing(filename):
    target = LANDING_DIR / filename

    if target.is_dir() and (target / 'index.html').exists():
        return send_from_directory(str(target), 'index.html')

    if target.exists():
        return send_from_directory(str(LANDING_DIR), filename)

    html_candidate = LANDING_DIR / f'{filename}.html'
    if html_candidate.exists():
        return send_from_directory(str(LANDING_DIR), f'{filename}.html')

    return jsonify({'error': 'Not found'}), 404


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'app': APP_NAME,
        'mode': APP_MODE,
        'runtime': 'web-form',
        'status': 'ok',
        'public_ready': APP_MODE == 'public',
        'public_base_url': PUBLIC_BASE_URL,
        'groq_ready': bool(GROQ_API_KEY),
        'supabase_ready': bool(SUPABASE_READY),
    })


@app.route('/api/public-config', methods=['GET'])
def public_config():
    return jsonify({
        'app_name': APP_NAME,
        'mode': APP_MODE,
        'base_url': PUBLIC_BASE_URL,
        'is_public': APP_MODE == 'public',
        'payment_ready': is_doku_ready(),
        'database_ready': is_supabase_ready(),
    })


@app.route('/api/supabase-status', methods=['GET'])
def supabase_status():
    return jsonify({
        'ready': bool(SUPABASE_READY),
        'configured': bool(SUPABASE_URL and SUPABASE_KEY),
        'url': SUPABASE_URL or None,
        'provider': 'supabase'
    })


@app.route('/api/process-direct', methods=['POST'])
def process_direct():
    """
    Direct processing endpoint for local demo & presentation (bypasses payment).
    """
    payload = request.get_json(silent=True) or {}
    url = payload.get('url')
    if not url:
        return jsonify({'error': 'URL YouTube wajib diisi'}), 400

    job_id = f"demo_{uuid.uuid4().hex[:8]}"
    set_job(job_id, {
        'status':     'queue',
        'clips':      [],
        'error':      None,
        'created_at': time.time(),
        'order':      payload,
    })

    t = threading.Thread(target=run_job, args=(job_id, payload), daemon=True)
    t.start()

    return jsonify({'job_id': job_id, 'status': 'queue'}), 200


@app.route('/api/jobs', methods=['GET'])
def list_jobs():
    """Ambil ringkasan job terbaru untuk history panel frontend."""
    with jobs_lock:
        entries = [build_job_summary(job_id, job) for job_id, job in jobs.items()]

    entries.sort(key=lambda item: float(item.get('created_at') or 0), reverse=True)
    return jsonify({'jobs': entries[:JOB_HISTORY_LIMIT]})


@app.route('/api/job/<job_id>', methods=['GET'])
def get_job_detail(job_id: str):
    """Detail lengkap satu job untuk polling/refresh history."""
    job = get_job(job_id)
    if not job:
        return jsonify({'error': 'Job tidak ditemukan'}), 404

    detail = {
        'job_id': job_id,
        'status': job.get('status', 'pending'),
        'created_at': job.get('created_at'),
        'url': (job.get('order') or {}).get('url'),
        'mode': (job.get('order') or {}).get('mode', 'custom'),
        'clips': job.get('clips', []),
        'error': job.get('error')
    }
    return jsonify(detail)


@app.route('/api/webhook/doku', methods=['POST'])
def doku_webhook():
    """Webhook DOKU untuk notifikasi pembayaran berhasil atau gagal."""
    if DOKU_WEBHOOK_SECRET:
        signature = request.headers.get('X-DOKU-Signature') or request.headers.get('Authorization', '').replace('Bearer ', '')
        if signature != DOKU_WEBHOOK_SECRET:
            return jsonify({'error': 'Unauthorized'}), 401

    payload = request.get_json(silent=True) or {}
    event = payload.get('event') or payload.get('status') or 'payment.success'
    data = payload.get('data') or payload

    if event not in ('payment.success', 'success', 'paid'):
        return jsonify({'received': True}), 200

    tx_id = data.get('transaction_id') or data.get('id') or str(uuid.uuid4())
    ref_raw = (data.get('metadata') or {}).get('ref') or data.get('ref') or ''
    order = parse_ref(ref_raw)

    if not order.get('url'):
        return jsonify({'error': 'ref tidak mengandung URL YouTube'}), 400

    job_id = tx_id
    set_job(job_id, {
        'status': 'queue',
        'clips': [],
        'error': None,
        'created_at': time.time(),
        'order': order,
    })

    t = threading.Thread(target=run_job, args=(job_id, order), daemon=True)
    t.start()

    return jsonify({'job_id': job_id, 'status': 'processing'}), 202


@app.route('/api/status', methods=['GET'])
def check_status():
    """
    Polling endpoint untuk sukses.js.
    GET /api/status?id=<job_id>

    Response:
      { status: 'processing' }
      { status: 'done', clips: [{filename, url, size_mb}, ...] }
      { status: 'error', error: '...' }
    """
    job_id = request.args.get('id', '').strip()
    if not job_id:
        return jsonify({'error': 'Parameter id diperlukan'}), 400

    job = get_job(job_id)
    if not job:
        return jsonify({'status': 'not_found',
                        'error': 'Job tidak ditemukan. Mungkin server baru restart.'}), 404

    resp = {'status': job['status']}
    if job['status'] == 'done':
        resp['clips'] = job.get('clips', [])
    elif job['status'] == 'error':
        resp['error'] = job.get('error', 'Unknown error')
    return jsonify(resp)


@app.route('/api/create-order', methods=['POST'])
def create_order():
    """API siap produksi untuk order baru. Bekerja dengan mode lokal jika DOKU/Supabase belum aktif."""
    payload = request.get_json(silent=True) or {}
    url = (payload.get('url') or '').strip()
    if not url:
        return jsonify({'error': 'URL YouTube wajib diisi'}), 400

    order_id = f"ord_{uuid.uuid4().hex[:12]}"
    amount = float(payload.get('amount', 25000) or 25000)
    order = {
        'id': order_id,
        'url': url,
        'mode': payload.get('mode', 'custom'),
        'amount': amount,
        'currency': payload.get('currency', 'IDR'),
        'status': 'pending',
        'payment_status': 'pending' if (DOKU_CLIENT_ID and DOKU_SECRET_KEY) else 'unpaid',
        'metadata': {
            'segments': payload.get('segments', []),
            'max_clips': int(payload.get('max_clips', 5) or 5),
            'title': payload.get('title')
        },
        'created_at': time.time(),
        'order': payload,
    }

    set_job(order_id, {
        'status': 'queue',
        'clips': [],
        'error': None,
        'created_at': time.time(),
        'order': payload,
    })

    persist_order_to_supabase(order_id, order)

    if is_doku_ready():
        payment_data, err = create_payment(order)
        if err:
            return jsonify({'error': f'Gagal membuat payment: {err}'}), 500
        return jsonify({
            'order_id': order_id,
            'status': 'pending',
            'payment_status': 'pending',
            'payment_url': payment_data.get('payment_url'),
            'payment_id': payment_data.get('payment_id'),
        }), 200

    # Fallback tanpa DOKU: langsung proses demo
    job_id = f"demo_{uuid.uuid4().hex[:8]}"
    set_job(job_id, {
        'status': 'processing',
        'clips': [],
        'error': None,
        'created_at': time.time(),
        'order': payload,
    })
    t = threading.Thread(target=run_job, args=(job_id, payload), daemon=True)
    t.start()

    return jsonify({
        'order_id': order_id,
        'status': 'processing',
        'payment_status': 'unpaid',
        'job_id': job_id,
    }), 200


@app.route('/api/orders/<order_id>', methods=['GET'])
def get_order(order_id: str):
    """Ambil detail order untuk frontend polling."""
    order = get_job(order_id)
    if order is None:
        return jsonify({'error': 'Order tidak ditemukan'}), 404

    return jsonify({
        'order_id': order_id,
        'status': order.get('status', 'pending'),
        'error': order.get('error'),
        'clips': order.get('clips', []),
        'created_at': order.get('created_at')
    })


@app.route('/api/download/<job_id>/<filename>', methods=['GET'])
def download_clip(job_id: str, filename: str):
    """Unduh file klip yang sudah diproses."""
    # Sanitasi path
    safe_filename = Path(filename).name
    file_path = OUTPUT_DIR / job_id / safe_filename

    if not file_path.exists():
        return jsonify({'error': 'File tidak ditemukan atau sudah kedaluwarsa'}), 404

    # Cek apakah sudah > 24 jam
    age_hours = (time.time() - file_path.stat().st_mtime) / 3600
    if age_hours > 24:
        file_path.unlink(missing_ok=True)
        return jsonify({'error': 'File sudah kedaluwarsa (>24 jam)'}), 410

    return send_file(str(file_path), as_attachment=True,
                     download_name=safe_filename, mimetype='video/mp4')


# ── Cleanup job yang sudah > 25 jam ──────────────────────────────────────
def cleanup_worker():
    while True:
        time.sleep(3600)  # setiap jam
        now = time.time()
        with jobs_lock:
            expired = [jid for jid, j in jobs.items()
                       if now - j.get('created_at', now) > 25 * 3600]
        for jid in expired:
            import shutil
            shutil.rmtree(OUTPUT_DIR / jid, ignore_errors=True)
            with jobs_lock:
                jobs.pop(jid, None)

threading.Thread(target=cleanup_worker, daemon=True).start()


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    public_url = PUBLIC_BASE_URL.rstrip('/') if PUBLIC_BASE_URL else f'https://lakulokal.my.id'
    print(f'lakulokal API berjalan di {public_url}:{port}' if '://' not in public_url else f'lakulokal API berjalan di {public_url}')
    print(f'GROQ_API_KEY: {"✓ tersedia" if GROQ_API_KEY else "✗ BELUM diset di .env"}')
    app.run(host='0.0.0.0', port=port, debug=False)
