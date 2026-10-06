/* lakulokal — sukses.js
   Manages the three states of the post-payment page:
   - processing: polling backend for clip status
   - success: show download button + 24h expiry countdown
   - error: show error reason + refund link
*/

// ── Read query params from DOKU redirect / backend order flow ───────────
const params = new URLSearchParams(window.location.search);
const txId = params.get('id') || params.get('trx_id') || null;
const refRaw = params.get('ref') || null;
const orderId = params.get('order_id') || params.get('orderId') || null;
const paymentStatus = params.get('status') || 'paid';

let orderData = { url: null, start: null, end: null };
let resolvedJobId = orderId || txId;
try {
  if (refRaw) orderData = JSON.parse(decodeURIComponent(refRaw));
} catch (_) {
  // ref tidak terbaca, tampilkan tetap berjalan
}

// ── CONFIG ────────────────────────────────────────────────────────────────
// Production-ready: gunakan origin yang sama bila domain publik aktif.
const API_BASE = (() => {
  const protocol = window.location.protocol || 'http:';
  const host = window.location.hostname || 'localhost';
  const port = window.location.port ? `:${window.location.port}` : '';
  return `${protocol}//${host}${port}`;
})();
// ─────────────────────────────────────────────────────────────────────────


// ── DOM refs ──────────────────────────────────────────────────────────────
const stateProcessing = document.getElementById('state-processing');
const stateSuccess    = document.getElementById('state-success');
const stateError      = document.getElementById('state-error');

const displayUrl          = document.getElementById('display-url');
const displayDuration     = document.getElementById('display-duration');
const displayUrlSuccess   = document.getElementById('display-url-success');
const displayDurSuccess   = document.getElementById('display-duration-success');
const progressFill        = document.getElementById('progress-fill');
const progressWrap        = document.getElementById('progress-wrap');
const progressStepLabel   = document.getElementById('progress-step-label');
const progressPct         = document.getElementById('progress-pct');
const timerDisplay        = document.getElementById('timer-display');
const downloadBtn         = document.getElementById('download-btn');
const expiryCountdown     = document.getElementById('expiry-countdown');
const errorDetail         = document.getElementById('error-detail');
const refundEmailLink     = document.getElementById('refund-email-link');


// ── Helpers ───────────────────────────────────────────────────────────────
function showState(name) {
  [stateProcessing, stateSuccess, stateError].forEach(el => {
    el.classList.toggle('active', el.id === `state-${name}`);
  });
}

function shortUrl(url) {
  if (!url) return '(tidak tersedia)';
  try {
    const u = new URL(url);
    const v = u.searchParams.get('v');
    return v ? `youtube.com/watch?v=${v}` : url.slice(0, 40) + '…';
  } catch (_) {
    return url.length > 40 ? url.slice(0, 40) + '…' : url;
  }
}

function formatDuration(start, end) {
  if (!start && !end) return '(seluruh durasi)';
  if (start && end)  return `${start} – ${end}`;
  if (start)         return `mulai ${start}`;
  return `sampai ${end}`;
}

function pad(n) { return String(n).padStart(2, '0'); }

function formatHms(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return h > 0
    ? `${pad(h)}:${pad(m)}:${pad(s)}`
    : `${pad(m)}:${pad(s)}`;
}


// ── Fill order detail display ──────────────────────────────────────────────
function fillOrderDisplay() {
  const short    = shortUrl(orderData.url);
  const duration = formatDuration(orderData.start, orderData.end);

  if (displayUrl)       displayUrl.textContent       = short;
  if (displayDuration)  displayDuration.textContent  = duration;
  if (displayUrlSuccess) displayUrlSuccess.textContent = short;
  if (displayDurSuccess) displayDurSuccess.textContent = duration;
}

fillOrderDisplay();


// ── Animated progress bar (visual feedback during processing) ─────────────
// Purpose: reduce perceived wait time; steps map to real backend phases.
const STEPS = [
  { pct: 8,  label: 'Memverifikasi pembayaran...',   secs: 3  },
  { pct: 25, label: 'Mengunduh segmen video...',      secs: 12 },
  { pct: 55, label: 'Memotong klip...',               secs: 18 },
  { pct: 80, label: 'Mengonversi ke MP4...',          secs: 10 },
  { pct: 92, label: 'Menyiapkan link unduhan...',     secs: 5  },
];

let stepIndex = 0;
let currentPct = 0;

function advanceProgress() {
  if (stepIndex >= STEPS.length) return;
  const step = STEPS[stepIndex];
  currentPct = step.pct;

  if (progressFill) {
    progressFill.style.width = currentPct + '%';
    progressWrap.setAttribute('aria-valuenow', currentPct);
  }
  if (progressStepLabel) progressStepLabel.textContent = step.label;
  if (progressPct)       progressPct.textContent       = currentPct + '%';

  stepIndex++;
  if (stepIndex < STEPS.length) {
    setTimeout(advanceProgress, STEPS[stepIndex - 1].secs * 1000);
  }
}

advanceProgress();


// ── Countdown timer (processing screen) ───────────────────────────────────
let timerSecs = 48; // perkiraan total waktu proses
const timerInterval = setInterval(() => {
  timerSecs--;
  if (timerSecs <= 0) {
    clearInterval(timerInterval);
    if (timerDisplay) timerDisplay.textContent = 'sebentar lagi…';
  } else {
    if (timerDisplay) timerDisplay.textContent = timerSecs + ' detik';
  }
}, 1000);


// ── SUCCESS state (multi-clip) ────────────────────────────────────────────
function enterSuccess(clips) {
  clearInterval(timerInterval);
  clearInterval(pollInterval);

  const downloadBtn  = document.getElementById('download-btn');
  const expiryNote   = document.getElementById('expiry-note');

  if (clips.length === 1) {
    // Single clip: tombol unduh biasa
    if (downloadBtn) {
      downloadBtn.href = `${API_BASE}${clips[0].url}`;
      downloadBtn.setAttribute('download', clips[0].filename || 'klip.mp4');
      downloadBtn.textContent = 'Unduh Klip Sekarang';
    }
  } else {
    // Multi-clip: ganti tombol dengan daftar
    if (downloadBtn) {
      downloadBtn.style.display = 'none';
    }
    const successEl = document.getElementById('state-success');
    if (successEl) {
      const listWrap = document.createElement('div');
      listWrap.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin-bottom:12px;width:100%;';
      clips.forEach((clip, i) => {
        const a = document.createElement('a');
        a.href = `${API_BASE}${clip.url}`;
        a.setAttribute('download', clip.filename || `klip_${i+1}.mp4`);
        a.className = 'btn-download';
        a.style.cssText = 'background:#16a34a;color:#fff;font-weight:700;padding:12px 20px;border-radius:10px;display:flex;align-items:center;gap:8px;text-decoration:none;justify-content:center;font-size:0.9375rem;';
        a.innerHTML = `<svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 3v10M6 9l4 4 4-4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 16h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg> Klip ${i+1}${clip.size_mb ? ` &middot; ${clip.size_mb} MB` : ''}`;
        listWrap.appendChild(a);
      });
      // Sisipkan sebelum expiry note
      if (expiryNote) {
        successEl.insertBefore(listWrap, expiryNote);
      } else {
        successEl.appendChild(listWrap);
      }
    }
  }

  showState('success');

  const targetJobId = resolvedJobId || orderId || txId;
  if (targetJobId) {
    const resultsUrl = new URL('coba.html', window.location.href);
    resultsUrl.searchParams.set('job_id', targetJobId);
    resultsUrl.hash = 'job-history-panel';
    setTimeout(() => window.location.assign(resultsUrl), 2500);
  }

  // 24-hour expiry countdown
  let expirySecs = 24 * 60 * 60;
  const expiryInterval = setInterval(() => {
    expirySecs--;
    const countdownEl = document.getElementById('expiry-countdown');
    if (expirySecs <= 0) {
      clearInterval(expiryInterval);
      if (countdownEl) countdownEl.textContent = 'Kedaluwarsa';
    } else {
      if (countdownEl) countdownEl.textContent = formatHms(expirySecs);
    }
  }, 1000);
}


// ── ERROR state ───────────────────────────────────────────────────────────
function enterError(reason) {
  clearInterval(timerInterval);
  clearInterval(pollInterval);

  if (errorDetail) errorDetail.textContent = reason ||
    'Sistem tidak dapat memproses klip ini. Kemungkinan penyebab: video dibatasi atau sudah tidak tersedia di YouTube.';

  // Pre-fill email body with transaction ID for easier support
  if (refundEmailLink && txId) {
    refundEmailLink.href = `mailto:halo@lakulokal.id?subject=Refund%20lakulokal&body=ID%20Transaksi%3A%20${encodeURIComponent(txId)}`;
  }

  showState('error');
}


// ── Backend polling ───────────────────────────────────────────────────────
// Polls GET /api/status?id=[txId] every 4 seconds.
// Expected response:
//   { status: 'processing' }  → keep polling
//   { status: 'done', downloadUrl: 'https://...' }  → enterSuccess()
//   { status: 'error', error: 'reason string' }     → enterError()
//
// If txId is missing (e.g. testing the page directly), we run a demo simulation.

const POLL_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS  = 5 * 60 * 1000; // 5 menit batas maksimum polling
const pollStart        = Date.now();
let pollInterval;

async function findLinkedJobId(orderId) {
  const response = await fetch(`${API_BASE}/api/jobs`);
  if (!response.ok) return null;

  const jobs = (await response.json()).jobs || [];
  const order = jobs.find(job => job.job_id === orderId);
  if (!order) return null;

  const orderCreatedAt = Number(order.created_at || 0);
  const candidates = jobs.filter(job => (
    job.job_id !== orderId
    && job.url === order.url
    && job.mode === order.mode
    && Math.abs(Number(job.created_at || 0) - orderCreatedAt) <= 5
    && ['queue', 'processing', 'done', 'error'].includes(job.status)
  ));

  candidates.sort((a, b) => {
    const priority = { processing: 0, done: 1, queue: 2, error: 3 };
    return priority[a.status] - priority[b.status]
      || Math.abs(Number(a.created_at || 0) - orderCreatedAt)
        - Math.abs(Number(b.created_at || 0) - orderCreatedAt);
  });
  return candidates[0]?.job_id || null;
}

async function pollStatus() {
  if (Date.now() - pollStart > POLL_TIMEOUT_MS) {
    enterError('Waktu pemrosesan melebihi batas. Hubungi kami dengan ID transaksi kamu.');
    return;
  }

  const targetId = orderId || txId;

  if (!targetId) {
    runDemoSimulation();
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/orders/${encodeURIComponent(targetId)}`);
    if (!res.ok) {
      const legacy = await fetch(`${API_BASE}/api/status?id=${encodeURIComponent(targetId)}`);
      if (!legacy.ok) throw new Error(`HTTP ${res.status}`);
      const data = await legacy.json();

      if (data.status === 'done' && data.clips && data.clips.length > 0) {
        enterSuccess(data.clips);
      } else if (data.status === 'done' && data.downloadUrl) {
        enterSuccess([{ url: data.downloadUrl, filename: 'klip.mp4' }]);
      } else if (data.status === 'error') {
        enterError(data.error || 'Terjadi kesalahan saat memproses video.');
      } else {
        const nextPct = Math.min(95, currentPct + 5);
        currentPct = nextPct;
        if (progressFill) progressFill.style.width = nextPct + '%';
        if (progressPct) progressPct.textContent = nextPct + '%';
        setTimeout(pollStatus, POLL_INTERVAL_MS);
      }
      return;
    }

    let data = await res.json();

    if (['queue', 'pending'].includes(data.status) && orderId) {
      const linkedJobId = await findLinkedJobId(orderId);
      if (linkedJobId && linkedJobId !== orderId) {
        resolvedJobId = linkedJobId;
        const jobResponse = await fetch(`${API_BASE}/api/status?id=${encodeURIComponent(linkedJobId)}`);
        if (jobResponse.ok) data = await jobResponse.json();
      }
    }

    if (data.status === 'completed' && data.clips && data.clips.length > 0) {
      enterSuccess(data.clips);
    } else if (data.status === 'processing' || data.status === 'pending') {
      const nextPct = Math.min(95, currentPct + 5);
      currentPct = nextPct;
      if (progressFill) progressFill.style.width = nextPct + '%';
      if (progressPct) progressPct.textContent = nextPct + '%';
      setTimeout(pollStatus, POLL_INTERVAL_MS);
    } else if (data.status === 'error' || data.error) {
      enterError(data.error || 'Terjadi kesalahan saat memproses video.');
    } else if (data.status === 'done' && data.clips && data.clips.length > 0) {
      enterSuccess(data.clips);
    } else {
      setTimeout(pollStatus, POLL_INTERVAL_MS);
    }
  } catch (err) {
    console.warn('Poll error:', err.message);
    setTimeout(pollStatus, POLL_INTERVAL_MS);
  }
}

// Start polling after short initial delay (payment webhook needs a moment)
pollInterval = setInterval(pollStatus, POLL_INTERVAL_MS);
setTimeout(pollStatus, 1500); // first check after 1.5s


// ── Demo simulation (no backend / direct page visit) ─────────────────────
// Simulates: 8s processing → success with a placeholder download URL.
// Remove this function once backend is live.
function runDemoSimulation() {
  clearInterval(pollInterval);

  setTimeout(() => {
    enterSuccess([{ url: '#demo', filename: 'demo_klip.mp4', size_mb: null }]);

    // Override klik download karena ini hanya demo
    const allDlBtns = document.querySelectorAll('.btn-download, a[download]');
    allDlBtns.forEach(btn => {
      if (btn.href && btn.href.includes('#demo')) {
        btn.addEventListener('click', e => {
          e.preventDefault();
          alert('Demo: backend belum terhubung. Jalankan jalankan_server.bat agar unduhan asli tersedia.');
        });
      }
    });
  }, 8000);
}


// ── Handle DOKU returning with non-paid status ───────────────────────────
// Jika DOKU mengirim status gagal atau dibatalkan, langsung error.
if (paymentStatus && paymentStatus !== 'paid' && paymentStatus !== 'success') {
  setTimeout(() => {
    enterError(
      paymentStatus === 'cancelled'
        ? 'Pembayaran dibatalkan. Tidak ada biaya yang dikenakan.'
        : 'Pembayaran tidak berhasil dikonfirmasi. Tidak ada biaya yang dikenakan. Coba lagi atau hubungi kami.'
    );
  }, 400);
}
