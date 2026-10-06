/* lakulokal — main.js
   Handles: mobile nav, FAQ accordion, scroll reveal,
             mode toggle (custom / auto), dynamic segments,
             direct demo processing, DOKU payment redirect,
             inline clip results on coba.html.
*/

// ── CONFIG ─────────────────────────────────────────────────────────────────
const DOKU_CHECKOUT_URL = 'https://checkout.doku.com'; // ganti dengan link checkout DOKU kamu

const basePath  = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
const SITE_URL  = window.location.origin + basePath;
const RETURN_URL = SITE_URL + 'sukses.html';

// Production-ready: gunakan host yang sama untuk API bila domain publik aktif.
const API_BASE = (() => {
  const protocol = window.location.protocol || 'http:';
  const host = window.location.hostname || 'localhost';
  const port = window.location.port ? `:${window.location.port}` : '';
  return `${protocol}//${host}${port}`;
})();

// ──────────────────────────────────────────────────────────────────────────


// ── Mobile navigation ─────────────────────────────────────────────────────
const hamburger = document.getElementById('hamburger-btn');
const navEl     = hamburger ? document.querySelector('header nav') : null;
const navLinks  = document.querySelectorAll('.nav-link, .nav-cta');

function setNavOpen(open) {
  if (!hamburger || !navEl) return;
  hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
  navEl.classList.toggle('open', open);
}

if (hamburger) {
  hamburger.addEventListener('click', () => {
    setNavOpen(hamburger.getAttribute('aria-expanded') !== 'true');
  });
}

navLinks.forEach(link => link.addEventListener('click', () => setNavOpen(false)));
document.addEventListener('keydown', e => { if (e.key === 'Escape') setNavOpen(false); });


// ── FAQ accordion ─────────────────────────────────────────────────────────
const faqButtons = document.querySelectorAll('.faq-question');

faqButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const isExpanded = btn.getAttribute('aria-expanded') === 'true';
    const answerId   = btn.getAttribute('aria-controls');
    const answerEl   = document.getElementById(answerId);

    faqButtons.forEach(b => {
      b.setAttribute('aria-expanded', 'false');
      const a = document.getElementById(b.getAttribute('aria-controls'));
      if (a) a.hidden = true;
    });

    if (!isExpanded) {
      btn.setAttribute('aria-expanded', 'true');
      if (answerEl) answerEl.hidden = false;
    }
  });
});


// ── Scroll reveal ─────────────────────────────────────────────────────────
const revealTargets = document.querySelectorAll(
  '.step-item, .pricing-card, .faq-item, .hero-content, .converter-form-wrap, .converter-copy'
);
revealTargets.forEach(el => el.classList.add('reveal'));

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  revealTargets.forEach(el => observer.observe(el));
} else {
  revealTargets.forEach(el => el.classList.add('visible'));
}


// ── Mode toggle (Custom / Otomatis) ──────────────────────────────────────
const modeCustomBtn = document.getElementById('mode-custom');
const modeAutoBtn   = document.getElementById('mode-auto');
const panelCustom   = document.getElementById('panel-custom');
const panelAuto     = document.getElementById('panel-auto');

let currentMode = 'custom'; // 'custom' | 'auto'

function setMode(mode) {
  currentMode = mode;

  if (modeCustomBtn) {
    modeCustomBtn.classList.toggle('active', mode === 'custom');
    modeCustomBtn.setAttribute('aria-pressed', mode === 'custom' ? 'true' : 'false');
  }
  if (modeAutoBtn) {
    modeAutoBtn.classList.toggle('active', mode === 'auto');
    modeAutoBtn.setAttribute('aria-pressed', mode === 'auto' ? 'true' : 'false');
  }
  if (panelCustom) panelCustom.hidden = mode !== 'custom';
  if (panelAuto)   panelAuto.hidden   = mode !== 'auto';
}

if (modeCustomBtn) modeCustomBtn.addEventListener('click', () => { setMode('custom'); updateLivePrice(); });
if (modeAutoBtn)   modeAutoBtn.addEventListener('click',   () => { setMode('auto');   updateLivePrice(); });


// ── Pricing formula ───────────────────────────────────────────────────────
function calcPrice(clipCount) {
  if (clipCount < 1) clipCount = 1;
  return Math.ceil(clipCount / 5) * 1000;
}

function formatRupiah(n) {
  return 'Rp' + n.toLocaleString('id-ID');
}

const clipCountTag = document.getElementById('clip-count-tag');
const livePriceEl  = document.getElementById('live-price');

function updateLivePrice() {
  let count;
  if (currentMode === 'custom') {
    const rows = segmentsList ? segmentsList.querySelectorAll('.segment-row') : [];
    count = rows.length || 1;
  } else {
    const autoMaxEl = document.getElementById('auto-max');
    count = autoMaxEl ? parseInt(autoMaxEl.value, 10) : 5;
  }
  const price = calcPrice(count);
  if (clipCountTag) clipCountTag.textContent = count + ' klip';
  if (livePriceEl)  livePriceEl.textContent  = formatRupiah(price);
  updateLivePreview();
}


// ── Dynamic segments (Custom mode) ────────────────────────────────────────
const segmentsList   = document.getElementById('segments-list');
const addSegmentBtn  = document.getElementById('add-segment-btn');
let segmentCount = 1;

function createSegmentRow(index) {
  const row = document.createElement('div');
  row.className  = 'segment-row';
  row.dataset.index = index;
  row.setAttribute('role', 'listitem');

  row.innerHTML = `
    <span class="segment-badge" aria-hidden="true">Klip ${index + 1}</span>
    <button
      type="button"
      class="btn-remove-segment"
      aria-label="Hapus segmen klip ${index + 1}"
      title="Hapus segmen ini"
    >&times;</button>
    <div class="form-row segment-inputs">
      <div class="form-group">
        <label class="form-label" for="seg-start-${index}">Mulai</label>
        <input type="text" id="seg-start-${index}" class="form-input seg-start"
               placeholder="00:00" pattern="[0-9]{1,2}:[0-5][0-9]" />
      </div>
      <div class="form-group">
        <label class="form-label" for="seg-end-${index}">Selesai</label>
        <input type="text" id="seg-end-${index}" class="form-input seg-end"
               placeholder="01:00" pattern="[0-9]{1,2}:[0-5][0-9]" />
      </div>
    </div>
  `;

  row.querySelector('.btn-remove-segment').addEventListener('click', () => {
    row.remove();
    renumberSegments();
    updateLivePrice();
  });

  return row;
}

function renumberSegments() {
  if (!segmentsList) return;
  const rows = segmentsList.querySelectorAll('.segment-row');
  rows.forEach((row, i) => {
    const badge = row.querySelector('.segment-badge');
    if (badge) badge.textContent = `Klip ${i + 1}`;
    const removeBtn = row.querySelector('.btn-remove-segment');
    if (removeBtn) removeBtn.setAttribute('aria-label', `Hapus segmen klip ${i + 1}`);
  });
}

if (addSegmentBtn) {
  addSegmentBtn.addEventListener('click', () => {
    const newRow = createSegmentRow(segmentCount);
    segmentsList.appendChild(newRow);
    segmentCount++;
    updateLivePrice();
    const firstInput = newRow.querySelector('.seg-start');
    if (firstInput) firstInput.focus();
  });
}

const autoMaxSelect = document.getElementById('auto-max');
if (autoMaxSelect) autoMaxSelect.addEventListener('change', updateLivePrice);

updateLivePrice();


// ── Form helpers ──────────────────────────────────────────────────────────
function showInputError(input, msg) {
  input.style.borderColor = '#c62828';
  input.setAttribute('aria-invalid', 'true');
  let errEl = input.parentElement.querySelector('.field-error');
  if (!errEl) {
    errEl = document.createElement('span');
    errEl.className = 'field-error';
    errEl.style.cssText = 'font-size:0.8rem;color:#c62828;margin-top:4px;display:block;';
    errEl.setAttribute('role', 'alert');
    input.parentElement.appendChild(errEl);
  }
  errEl.textContent = msg;
}

function clearInputError(input) {
  input.style.borderColor = '';
  input.removeAttribute('aria-invalid');
  const errEl = input.parentElement.querySelector('.field-error');
  if (errEl) errEl.remove();
}

function isYTUrl(val) {
  return /youtube\.com\/watch|youtu\.be\//.test(val);
}

function isTimeFormat(val) {
  return val === '' || /^\d{1,2}:[0-5]\d$/.test(val);
}

function timeToSeconds(val) {
  if (!val) return null;
  const [m, s] = val.split(':').map(Number);
  return m * 60 + s;
}

function buildDokuUrl(payload, price) {
  let count = payload.mode === 'custom'
    ? (payload.segments ? payload.segments.length : 1)
    : (payload.max || 5);
  const qty = Math.ceil(count / 5);
  const ref = encodeURIComponent(JSON.stringify(payload));
  const sep = DOKU_CHECKOUT_URL.includes('?') ? '&' : '?';
  return `${DOKU_CHECKOUT_URL}${sep}amount=${price}&quantity=${qty}&ref=${ref}&return_url=${encodeURIComponent(RETURN_URL)}`;
}


// ── Live Preview Panel (kanan) ────────────────────────────────────────────
function getYTVideoId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?.*v=|shorts\/|embed\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function updateLivePreview() {
  const urlInput           = document.getElementById('yt-url');
  const previewImg         = document.getElementById('preview-img');
  const previewPlaceholder = document.getElementById('preview-placeholder');
  const previewOverlay     = document.getElementById('preview-overlay');
  const previewVideoTitle  = document.getElementById('preview-video-title');
  const statusText         = document.getElementById('preview-status-text');
  const statusDot          = document.getElementById('preview-status-dot');
  const clipsBreakdown     = document.getElementById('preview-clips-breakdown');
  const clipsCountBadge    = document.getElementById('preview-clips-count-badge');

  if (!urlInput) return;

  const videoId = getYTVideoId(urlInput.value.trim());

  if (videoId) {
    if (previewImg) {
      previewImg.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      previewImg.style.display = 'block';
    }
    if (previewPlaceholder) previewPlaceholder.style.display = 'none';
    if (previewOverlay)     previewOverlay.style.display     = 'block';
    if (previewVideoTitle)  previewVideoTitle.textContent    = `Video YouTube (ID: ${videoId})`;
    if (statusText)         statusText.textContent           = 'Link Valid & Siap';
    if (statusDot)          statusDot.style.background       = '#10b981';
  } else {
    if (previewImg)         previewImg.style.display         = 'none';
    if (previewPlaceholder) previewPlaceholder.style.display = 'flex';
    if (previewOverlay)     previewOverlay.style.display     = 'none';
    if (statusText)         statusText.textContent           = 'Menunggu Link';
    if (statusDot)          statusDot.style.background       = '#f59e0b';
  }

  // Update clips breakdown list
  if (clipsBreakdown) {
    clipsBreakdown.innerHTML = '';
    if (currentMode === 'custom') {
      const rows  = segmentsList ? segmentsList.querySelectorAll('.segment-row') : [];
      const count = rows.length || 1;
      if (clipsCountBadge) clipsCountBadge.textContent = `${count} Klip`;

      rows.forEach((row, idx) => {
        const startVal = row.querySelector('.seg-start')?.value.trim() || '00:00';
        const endVal   = row.querySelector('.seg-end')?.value.trim()   || '01:00';
        const card = document.createElement('div');
        card.className = 'clip-summary-card';
        card.innerHTML = `
          <div class="clip-summary-info">
            <span class="clip-summary-name">Klip #${idx + 1}</span>
            <span class="clip-summary-time">Durasi: ${startVal} — ${endVal}</span>
          </div>
          <span class="clip-summary-badge">MP4 1080p</span>
        `;
        clipsBreakdown.appendChild(card);
      });

    } else {
      const maxCount = document.getElementById('auto-max')?.value || '5';
      if (clipsCountBadge) clipsCountBadge.textContent = `${maxCount} Klip AI`;
      const card = document.createElement('div');
      card.className = 'clip-summary-card';
      card.innerHTML = `
        <div class="clip-summary-info">
          <span class="clip-summary-name">${maxCount} Klip Otomatis AI</span>
          <span class="clip-summary-time">Whisper Transkripsi + Gemini Semantik</span>
        </div>
        <span class="clip-summary-badge">MP4 1080p</span>
      `;
      clipsBreakdown.appendChild(card);
    }
  }
}


// ── Processing overlay helpers ────────────────────────────────────────────
const PROC_STEPS = [
  { pct: 8,  label: 'Memverifikasi permintaan...', secs: 2  },
  { pct: 20, label: 'Mengunduh segmen video...',   secs: 10 },
  { pct: 50, label: 'Memotong klip...',             secs: 15 },
  { pct: 78, label: 'Mengonversi ke MP4 9:16...',  secs: 10 },
  { pct: 92, label: 'Menyiapkan file hasil...',    secs: 4  },
];

let procStepIndex = 0;
let procStepTimer = null;

function startProcessingOverlay() {
  const overlay   = document.getElementById('processing-overlay');
  const fill      = document.getElementById('proc-progress-fill');
  const stepLabel = document.getElementById('proc-step-label');
  if (overlay) overlay.classList.add('active');

  procStepIndex = 0;
  advanceProcStep(fill, stepLabel);
}

function advanceProcStep(fill, stepLabel) {
  if (procStepIndex >= PROC_STEPS.length) return;
  const step = PROC_STEPS[procStepIndex];
  if (fill) {
    fill.style.width = step.pct + '%';
    const wrap = document.getElementById('proc-progress-wrap');
    if (wrap) wrap.setAttribute('aria-valuenow', step.pct);
  }
  if (stepLabel) stepLabel.textContent = step.label;
  procStepIndex++;
  if (procStepIndex < PROC_STEPS.length) {
    procStepTimer = setTimeout(() => advanceProcStep(fill, stepLabel), step.secs * 1000);
  }
}

function stopProcessingOverlay() {
  const overlay = document.getElementById('processing-overlay');
  if (overlay) overlay.classList.remove('active');
  if (procStepTimer) { clearTimeout(procStepTimer); procStepTimer = null; }
}


function setJobStatus(status, title, message) {
  const pill = document.getElementById('job-status-pill');
  const titleEl = document.getElementById('job-status-title');
  const textEl = document.getElementById('job-status-text');

  if (!pill || !titleEl || !textEl) return;

  pill.className = `status-pill ${status}`;
  pill.textContent = status === 'queue' ? 'Queue' : status === 'processing' ? 'Processing' : status === 'done' ? 'Done' : 'Failed';
  titleEl.textContent = title;
  textEl.textContent = message;
}

function showClipResults(clips) {
  const section    = document.getElementById('clip-results-section');
  const body       = document.getElementById('results-body');
  const countBadge = document.getElementById('results-count-badge');

  if (!section) return;

  section.classList.add('active');
  setJobStatus('done', 'Proses selesai', 'Klip siap diunduh dan siap dibagikan.');

  if (countBadge) countBadge.textContent = `${clips.length} Klip Selesai`;

  if (body) {
    body.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'clip-results-grid';

    clips.forEach((clip, i) => {
      const card = document.createElement('div');
      card.className = 'clip-result-card';

      const downloadHref = clip.url.startsWith('http') ? clip.url : `${API_BASE}${clip.url}`;
      const previewUrl = clip.preview_url || `${clip.url}${clip.url.includes('?') ? '&' : '?'}inline=1`;
      const previewHref = previewUrl.startsWith('http') ? previewUrl : `${API_BASE}${previewUrl}`;

      card.innerHTML = `
        <video class="clip-result-video" src="${previewHref}" controls preload="metadata" playsinline aria-label="Preview Klip ${i + 1}"></video>
        <div class="clip-result-info">
          <div class="clip-result-name">Klip ${i + 1}${clip.filename ? ` — ${clip.filename}` : ''}</div>
          <div class="clip-result-meta">${clip.size_mb ? `${clip.size_mb} MB · ` : ''}MP4 · 9:16</div>
          <a
            href="${downloadHref}"
            download="${clip.filename || `klip_${i+1}.mp4`}"
            class="clip-download-btn"
            aria-label="Unduh Klip ${i + 1}"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M10 3v10M6 9l4 4 4-4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M3 16h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
            </svg>
            Unduh Klip ${i + 1}
          </a>
        </div>
      `;
      grid.appendChild(card);
    });

    body.appendChild(grid);
  }

  // Scroll ke hasil
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showResultsError(msg) {
  const section = document.getElementById('clip-results-section');
  const body    = document.getElementById('results-body');
  const countBadge = document.getElementById('results-count-badge');
  if (!section || !body) return;

  section.classList.add('active');
  if (countBadge) countBadge.textContent = '0 Klip';
  setJobStatus('failed', 'Proses gagal', msg || 'Terjadi kesalahan saat memproses video.');
  body.innerHTML = `
    <div class="results-error" role="alert">
      <strong style="display:block;margin-bottom:4px;">Proses gagal</strong>
      ${msg || 'Terjadi kesalahan saat memproses video. Coba lagi atau periksa URL YouTube.'}
    </div>
  `;
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideClipResults() {
  const section = document.getElementById('clip-results-section');
  if (section) section.classList.remove('active');
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatHistoryStatus(status) {
  switch (status) {
    case 'queue': return 'Queue';
    case 'processing': return 'Processing';
    case 'done': return 'Done';
    case 'failed': return 'Failed';
    case 'error': return 'Gagal';
    case 'pending': return 'Pending';
    default: return 'Unknown';
  }
}

function renderJobHistory(jobs = []) {
  const list = document.getElementById('job-history-list');
  const countBadge = document.getElementById('history-count-badge');
  if (!list) return;

  if (countBadge) countBadge.textContent = `${jobs.length} Job`;

  if (!jobs.length) {
    list.innerHTML = '<div class="history-empty">Belum ada job yang diproses. Hasil terbaru akan muncul di sini.</div>';
    return;
  }

  list.innerHTML = jobs.map(job => {
    const status = job.status || 'queue';
    const statusClass = status === 'error' ? 'failed' : status;
    const title = escapeHtml(job.title || 'Video YouTube');
    const url = escapeHtml(job.url || '');
    const errorMessage = escapeHtml(job.error || '');
    const timeLabel = new Date(job.created_at * 1000 || Date.now()).toLocaleString('id-ID', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const downloadMarkup = status === 'done' && job.download_url
      ? `<a class="history-download-btn" href="${job.download_url.startsWith('http') ? job.download_url : `${API_BASE}${job.download_url}`}" download>
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M10 3v10M6 9l4 4 4-4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M3 16h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
          </svg>
          Download Premium
        </a>`
      : `<span class="history-status ${statusClass}">${formatHistoryStatus(status)}</span>`;
    const previewMarkup = status === 'done' && job.preview_url
      ? `<video class="history-preview" src="${job.preview_url.startsWith('http') ? job.preview_url : `${API_BASE}${job.preview_url}`}" controls preload="metadata" playsinline aria-label="Preview klip hasil"></video>`
      : '';
    const errorMarkup = status === 'error' && errorMessage
      ? `<div class="history-error" role="alert">${errorMessage}</div>`
      : '';

    return `
      <article class="history-item">
        <div class="history-head">
          <div class="history-title" title="${title}">${title}</div>
          <span class="history-status ${statusClass}">${formatHistoryStatus(status)}</span>
        </div>
        <div class="history-meta">
          <span>${timeLabel}</span>
          <span>•</span>
          <span>${job.clip_count || 0} klip</span>
          <span>•</span>
          <span>${escapeHtml(job.mode || 'custom')}</span>
        </div>
        <div class="history-url" title="${url}">${url || 'URL tidak tersedia'}</div>
        ${errorMarkup}
        ${previewMarkup}
        <div class="history-actions">
          ${downloadMarkup}
        </div>
      </article>
    `;
  }).join('');
}

async function loadJobHistory() {
  const list = document.getElementById('job-history-list');
  if (!list) return;

  try {
    const res = await fetch(`${API_BASE}/api/jobs`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderJobHistory(data.jobs || []);
  } catch (err) {
    console.warn('[history] gagal memuat job detail:', err.message);
  }
}


// ── Backend polling ───────────────────────────────────────────────────────
const POLL_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS  = 5 * 60 * 1000;

function pollUntilDone(jobId, startedAt) {
  if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
    setJobStatus('failed', 'Waktu proses habis', 'Waktu proses melebihi 5 menit. Silakan coba video yang lebih pendek atau ulangi permintaan.');
    stopProcessingOverlay();
    showResultsError('Waktu proses melebihi 5 menit. Cek koneksi atau coba video yang lebih pendek.');
    return;
  }

  setJobStatus('processing', 'Memproses video', 'Mengunduh, mengekstrak, dan menyusun klip yang siap dipakai.');

  fetch(`${API_BASE}/api/status?id=${encodeURIComponent(jobId)}`)
    .then(r => r.json())
    .then(data => {
      if (data.status === 'done' && data.clips && data.clips.length > 0) {
        stopProcessingOverlay();
        loadJobHistory();
        showClipResults(data.clips);
      } else if (data.status === 'done' && data.downloadUrl) {
        stopProcessingOverlay();
        loadJobHistory();
        showClipResults([{ url: data.downloadUrl, filename: 'klip.mp4' }]);
      } else if (data.status === 'error') {
        stopProcessingOverlay();
        loadJobHistory();
        showResultsError(data.error || 'Proses gagal tanpa detail error.');
      } else {
        loadJobHistory();
        setTimeout(() => pollUntilDone(jobId, startedAt), POLL_INTERVAL_MS);
      }
    })
    .catch(err => {
      console.warn('[poll] error:', err.message);
      setTimeout(() => pollUntilDone(jobId, startedAt), POLL_INTERVAL_MS);
    });
}


// ── Validate and submit ───────────────────────────────────────────────────
const submitDirectBtn  = document.getElementById('submit-direct-btn');
const submitConvertBtn = document.getElementById('submit-convert-btn');
const ytUrlInput       = document.getElementById('yt-url');

function validateForm() {
  if (!ytUrlInput) return null;
  clearInputError(ytUrlInput);

  const urlVal = ytUrlInput.value.trim();
  if (!urlVal) {
    showInputError(ytUrlInput, 'Link YouTube wajib diisi.');
    ytUrlInput.focus();
    return null;
  }
  if (!isYTUrl(urlVal)) {
    showInputError(ytUrlInput, 'Pastikan ini URL YouTube yang valid (youtube.com/watch atau youtu.be).');
    ytUrlInput.focus();
    return null;
  }

  let payload;
  if (currentMode === 'custom') {
    const rows     = segmentsList ? segmentsList.querySelectorAll('.segment-row') : [];
    const segments = [];
    let valid      = true;

    rows.forEach(row => {
      const startInput = row.querySelector('.seg-start');
      const endInput   = row.querySelector('.seg-end');
      const startVal   = startInput.value.trim();
      const endVal     = endInput.value.trim();

      clearInputError(startInput);
      clearInputError(endInput);

      if (!isTimeFormat(startVal)) { showInputError(startInput, 'Format: mm:ss'); valid = false; }
      if (!isTimeFormat(endVal))   { showInputError(endInput,   'Format: mm:ss'); valid = false; }

      if (valid && startVal && endVal) {
        if (timeToSeconds(endVal) <= timeToSeconds(startVal)) {
          showInputError(endInput, 'Waktu selesai harus lebih besar dari mulai.');
          valid = false;
        }
      }
      if (valid) segments.push({ start: startVal || null, end: endVal || null });
    });

    if (!valid) return null;
    payload = { mode: 'custom', url: urlVal, segments };

  } else {
    const autoMaxEl = document.getElementById('auto-max');
    payload = { mode: 'auto', url: urlVal, method: 'whisper-gemini', max: parseInt(autoMaxEl?.value || '5', 10) };
  }

  return payload;
}

if (document.getElementById('job-history-list')) {
  loadJobHistory();
  setInterval(loadJobHistory, 8000);
}

if (ytUrlInput) {
  ytUrlInput.addEventListener('input', () => {
    clearInputError(ytUrlInput);
    updateLivePreview();
  });

  if (segmentsList) {
    segmentsList.addEventListener('input', e => {
      if (e.target.classList.contains('seg-start') || e.target.classList.contains('seg-end')) {
        updateLivePreview();
      }
    });
  }

  updateLivePreview();

  // 1. DIRECT DEMO PROCESS (NO PAYMENT)
  if (submitDirectBtn) {
    submitDirectBtn.addEventListener('click', async () => {
      const payload = validateForm();
      if (!payload) return;

      hideClipResults();
      setJobStatus('queue', 'Antrian diterima', 'Permintaan kamu sudah masuk dalam antrian proses.');
      submitDirectBtn.textContent = '⏳ Memulai pemrosesan...';
      submitDirectBtn.disabled    = true;
      startProcessingOverlay();

      try {
        const res = await fetch(`${API_BASE}/api/process-direct`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Server error ${res.status}`);
        }

        const data  = await res.json();
        const jobId = data.job_id;
        loadJobHistory();

        // Mulai polling — overlay tetap tampil
        pollUntilDone(jobId, Date.now());

      } catch (err) {
        stopProcessingOverlay();
        showResultsError('Gagal menghubungi server: ' + err.message + '. Pastikan Flask server berjalan (jalankan_server.bat).');
      } finally {
        submitDirectBtn.textContent = '🚀 Potong Video Sekarang (Demo Gratis)';
        submitDirectBtn.disabled    = false;
      }
    });
  }

  // 2. DOKU PAYMENT REDIRECT via backend order API
  if (submitConvertBtn) {
    submitConvertBtn.addEventListener('click', async () => {
      const payload = validateForm();
      if (!payload) return;

      const clipCount = currentMode === 'custom' ? (payload.segments?.length || 1) : (payload.max || 5);
      const totalPrice = calcPrice(clipCount);

      submitConvertBtn.textContent = 'Membuat order & mengarah ke pembayaran...';
      submitConvertBtn.disabled = true;

      try {
        const res = await fetch(`${API_BASE}/api/create-order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, amount: totalPrice })
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || `Server error ${res.status}`);
        }

        if (data.payment_url) {
          loadJobHistory();
          window.location.href = data.payment_url;
          return;
        }

        if (data.order_id) {
          loadJobHistory();
          window.location.href = `sukses.html?order_id=${encodeURIComponent(data.order_id)}`;
          return;
        }

        throw new Error('Response order tidak valid.');
      } catch (err) {
        alert('Gagal membuat order pembayaran: ' + err.message);
        submitConvertBtn.textContent = '💳 Bayar via DOKU';
        submitConvertBtn.disabled = false;
      }
    });
  }
}

// ── "Potong Lagi" button ─────────────────────────────────────────────────
const potongLagiBtn = document.getElementById('potong-lagi-btn');
if (potongLagiBtn) {
  potongLagiBtn.addEventListener('click', () => {
    hideClipResults();
    // Scroll ke atas form
    const toolPanel = document.querySelector('.coba-tool-panel');
    if (toolPanel) toolPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (ytUrlInput) { ytUrlInput.value = ''; ytUrlInput.focus(); }
    updateLivePreview();
  });
}
