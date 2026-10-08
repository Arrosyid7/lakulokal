"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { PaymentQrCode } from "@/components/orders/payment-qr-code";
import { ReceiptProofForm } from "@/components/orders/receipt-proof-form";
import { getPaymentStatusLabel, getProcessingStatusLabel, getStatusClassName } from "@/lib/order-presentation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  getClipRanges,
  MAX_BROWSER_VIDEO_DURATION_SECONDS,
  readVideoDuration,
  validateBrowserVideo
} from "@/lib/browser-video";

type Download = {
  name: string;
  url: string;
  downloadUrl?: string;
  clipNumber?: number;
  expiresAt?: number;
  local?: boolean;
};

type Props = {
  orderCode: string;
  clipCount: number;
  amount: number;
  currency: string;
  orderCreatedAt: string;
  paymentProvider?: string;
  qrContent?: string | null;
  initialPaymentStatus: string;
  initialProcessingStatus: string;
  initialFile?: File | null;
};

export function BrowserCheckout({
  orderCode,
  clipCount,
  amount,
  currency,
  orderCreatedAt,
  paymentProvider = "MANUAL_QRIS",
  qrContent = null,
  initialPaymentStatus,
  initialProcessingStatus,
  initialFile = null
}: Props) {
  const [paymentStatus, setPaymentStatus] = useState(initialPaymentStatus);
  const [proofStatus, setProofStatus] = useState<string | null>(null);
  const [proofNote, setProofNote] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState(initialProcessingStatus);
  const [file, setFile] = useState<File | null>(initialFile);
  const [duration, setDuration] = useState<number | null>(null);
  const [fileError, setFileError] = useState("");
  const [statusError, setStatusError] = useState("");
  const [stage, setStage] = useState("");
  const [progress, setProgress] = useState(0);
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [busy, setBusy] = useState(false);
  const progressRef = useRef(0);
  const fileSelection = useRef(0);
  const blobUrls = useRef(new Set<string>());

  useEffect(() => {
    let active = true;
    const checkPayment = async () => {
      try {
        const response = await fetch(`/api/orders/${encodeURIComponent(orderCode)}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Status pembayaran belum dapat diperbarui.");
        const result = await response.json();
        if (active) {
          setPaymentStatus(result.order.payment_status);
          setProcessingStatus(result.order.processing_status);
          setProofStatus(result.proof?.review_status ?? null);
          setProofNote(result.proof?.review_note ?? null);
          setDownloads((current) => {
            const byClipNumber = new Map(current.filter((item) => item.clipNumber !== undefined).map((item) => [item.clipNumber, item]));
            return (result.clips ?? []).map((clip: {
              clip_number: number;
              file_name: string;
              preview_url: string;
              download_url: string;
            }) => {
              const existing = byClipNumber.get(clip.clip_number);
              if (existing?.local || (existing?.expiresAt && existing.expiresAt > Date.now())) return existing;
              return {
                name: clip.file_name,
                url: clip.preview_url,
                downloadUrl: clip.download_url,
                clipNumber: clip.clip_number,
                expiresAt: Date.now() + 240_000
              };
            });
          });
          setStatusError("");
        }
      } catch (error) {
        if (active) setStatusError(error instanceof Error ? error.message : "Status pembayaran gagal dimuat.");
      }
    };
    void checkPayment();
    const shouldPoll = paymentStatus === "PENDING" || !["COMPLETED", "FAILED"].includes(processingStatus);
    if (!shouldPoll) return () => { active = false; };
    const timer = window.setInterval(() => { void checkPayment(); }, 4000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [orderCode, paymentStatus, processingStatus]);

  useEffect(() => {
    let active = true;
    async function inspectInitialFile() {
      if (!initialFile) return;
      const invalid = validateBrowserVideo(initialFile);
      if (invalid) {
        setFile(null);
        setFileError(invalid);
        return;
      }
      try {
        const videoDuration = await readVideoDuration(initialFile);
        if (!Number.isFinite(videoDuration) || videoDuration < 1 || videoDuration > MAX_BROWSER_VIDEO_DURATION_SECONDS) {
          throw new Error("Durasi video harus lebih dari satu detik dan tidak lebih dari dua jam.");
        }
        if (active) {
          setFile(initialFile);
          setDuration(videoDuration);
        }
      } catch (error) {
        if (active) {
          setFile(null);
          setFileError(error instanceof Error ? error.message : "Video tidak dapat dibaca.");
        }
      }
    }
    void inspectInitialFile();
    return () => { active = false; };
  }, [initialFile]);

  useEffect(() => () => {
    blobUrls.current.forEach((url) => URL.revokeObjectURL(url));
    blobUrls.current.clear();
  }, []);

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    fileSelection.current += 1;
    const selection = fileSelection.current;
    const selected = event.currentTarget.files?.[0] ?? null;
    setFileError("");
    setDuration(null);
    blobUrls.current.forEach((url) => URL.revokeObjectURL(url));
    blobUrls.current.clear();
    setDownloads([]);
    if (!selected) {
      setFile(null);
      return;
    }
    const invalid = validateBrowserVideo(selected);
    if (invalid) {
      setFile(null);
      setFileError(invalid);
      return;
    }
    try {
      const videoDuration = await readVideoDuration(selected);
      if (!Number.isFinite(videoDuration) || videoDuration < 1 || videoDuration > MAX_BROWSER_VIDEO_DURATION_SECONDS) {
        throw new Error("Durasi video harus lebih dari satu detik dan tidak lebih dari dua jam.");
      }
      if (fileSelection.current === selection) {
        setFile(selected);
        setDuration(videoDuration);
      }
    } catch (error) {
      if (fileSelection.current === selection) {
        setFile(null);
        setFileError(error instanceof Error ? error.message : "Video tidak dapat dibaca.");
      }
    }
  }

  async function updateServerStatus(status: "PROCESSING" | "COMPLETED" | "FAILED", nextProgress: number, errorMessage?: string) {
    const response = await fetch(`/api/orders/${encodeURIComponent(orderCode)}/browser-processing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        progress: nextProgress,
        error_message: errorMessage ?? null
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Status pemrosesan gagal disimpan.");
    setProcessingStatus(status);
    setProgress(nextProgress);
  }

  async function processVideo() {
    if (!file || duration === null || busy) return;
    setBusy(true);
    setStatusError("");
    blobUrls.current.forEach((url) => URL.revokeObjectURL(url));
    blobUrls.current.clear();
    setDownloads([]);
    progressRef.current = 0;
    let ffmpeg: import("@ffmpeg/ffmpeg").FFmpeg | null = null;
    let processingStarted = false;

    try {
      await updateServerStatus("PROCESSING", 1);
      processingStarted = true;
      setStage("Memuat pemroses video...");
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      ffmpeg = new FFmpeg();
      ffmpeg.on("progress", ({ progress: clipProgress }) => {
        const next = Math.min(95, 10 + Math.round(((progressRef.current + clipProgress) / clipCount) * 85));
        setProgress(next);
      });
      await ffmpeg.load({
        coreURL: "/ffmpeg/ffmpeg-core.js",
        wasmURL: "/ffmpeg/ffmpeg-core.wasm"
      });

      const extension = file.name.split(".").pop()?.toLowerCase() || "mp4";
      const sourceName = `source.${extension}`;
      await ffmpeg.writeFile(sourceName, new Uint8Array(await file.arrayBuffer()));
      const ranges = getClipRanges(duration, clipCount);

      for (const [index, range] of ranges.entries()) {
        const clipName = `clip_${String(index + 1).padStart(2, "0")}.mp4`;
        setStage(`Membuat klip ${index + 1} dari ${clipCount}...`);
        const exitCode = await ffmpeg.exec([
          "-y",
          "-ss", range.start.toFixed(3),
          "-i", sourceName,
          "-t", range.duration.toFixed(3),
          "-map", "0:v:0",
          "-map", "0:a:0?",
          "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1",
          "-c:v", "libx264",
          "-pix_fmt", "yuv420p",
          "-preset", "veryfast",
          "-crf", "23",
          "-c:a", "aac",
          "-b:a", "128k",
          "-movflags", "+faststart",
          clipName
        ]);
        if (exitCode !== 0) throw new Error(`Klip ${index + 1} gagal dibuat. Coba file video lain.`);

        const data = await ffmpeg.readFile(clipName);
        if (typeof data === "string") throw new Error(`Data klip ${index + 1} tidak valid.`);
        const bytes = new Uint8Array(data.byteLength);
        bytes.set(data);
        const localUrl = URL.createObjectURL(new Blob([bytes.buffer], { type: "video/mp4" }));
        blobUrls.current.add(localUrl);
        setDownloads((current) => [...current, {
          name: clipName,
          url: localUrl,
          clipNumber: index + 1,
          local: true
        }]);
        await ffmpeg.deleteFile(clipName);
        progressRef.current = index + 1;
        setProgress(Math.round(10 + ((index + 1) / clipCount) * 85));
        await updateServerStatus("PROCESSING", Math.min(95, Math.round(10 + ((index + 1) / clipCount) * 85)));
        setStage(`Menyimpan klip ${index + 1} dari ${clipCount}...`);
        const uploadInfoResponse = await fetch(`/api/orders/${encodeURIComponent(orderCode)}/clips`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phase: "sign",
            clip_number: index + 1,
            file_name: clipName,
            size_bytes: bytes.byteLength,
            duration_seconds: range.duration
          })
        });
        const uploadInfo = await uploadInfoResponse.json();
        if (!uploadInfoResponse.ok) throw new Error(uploadInfo.error || `Klip ${index + 1} gagal disiapkan untuk disimpan.`);
        const { error: uploadError } = await createSupabaseBrowserClient()
          .storage.from("lakulokal-results")
          .uploadToSignedUrl(
            uploadInfo.path,
            uploadInfo.token,
            new Blob([bytes.buffer], { type: "video/mp4" }),
            { contentType: "video/mp4" }
          );
        if (uploadError) throw new Error(`Klip ${index + 1} gagal disimpan: ${uploadError.message}`);
        const finalizeResponse = await fetch(`/api/orders/${encodeURIComponent(orderCode)}/clips`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phase: "finalize",
            clip_number: index + 1,
            file_name: clipName,
            size_bytes: bytes.byteLength,
            duration_seconds: range.duration
          })
        });
        const finalized = await finalizeResponse.json();
        if (!finalizeResponse.ok) throw new Error(finalized.error || `Klip ${index + 1} gagal dicatat.`);
      }

      await updateServerStatus("COMPLETED", 100);
      setStage("Klip siap ditonton dan diunduh. Hasil tersimpan selama 24 jam.");
    } catch (error) {
      const message = (error instanceof Error ? error.message : "Pemrosesan video gagal.").slice(0, 400);
      setStage("");
      if (!processingStarted) {
        setStatusError(message);
      } else {
        try {
          await updateServerStatus("FAILED", progress, message);
          setStatusError(message);
        } catch (statusError) {
          const saveError = statusError instanceof Error ? statusError.message : "Status gagal disimpan.";
          setStatusError(message === saveError ? message : `${message} ${saveError}`);
        }
      }
    } finally {
      ffmpeg?.terminate();
      setBusy(false);
    }
  }

  const money = new Intl.NumberFormat("id-ID", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  const manualQris = paymentProvider === "MANUAL_QRIS";
  const canUseOrder = paymentStatus === "PAID" || (manualQris && (proofStatus === "SUBMITTED" || proofStatus === "REJECTED"));
  const canSelectFile = canUseOrder && !busy;

  return (
    <section className="panel browser-checkout" aria-labelledby="checkout-title">
      <div className="checkout-primary">
        <header className="checkout-heading">
          <p className="section-kicker">Pembayaran dan pemrosesan</p>
          <h2 id="checkout-title">Order {orderCode}</h2>
          <p className="checkout-total"><span>Total pembayaran</span><strong>{money}</strong></p>
        </header>
      {paymentStatus === "PENDING" && (manualQris || (paymentProvider === "DANA" && qrContent)) && (
        <>
          <PaymentQrCode amount={money} value={manualQris ? null : qrContent} />
          {manualQris ? <p>Bayar tepat sesuai nominal order ini. Setelah membayar, unggah bukti transaksi untuk pemeriksaan OCR.</p> : (
            <p aria-live="polite">Menunggu pembayaran QRIS. Halaman ini memeriksa status transaksi secara otomatis.</p>
          )}
          {manualQris && proofStatus === "SUBMITTED" ? (
            <p className="form-success" role="status">
              Bukti sudah lolos penyaringan OCR dan menunggu pemeriksaan admin. Status pembayaran tetap menunggu konfirmasi.
            </p>
          ) : manualQris && proofStatus === "REJECTED" ? (
            <div className="form-error" role="status">
              <p>Bukti sebelumnya ditolak oleh admin. Periksa catatan, lalu unggah bukti pembayaran yang benar.</p>
              {proofNote && <p>Catatan admin: {proofNote}</p>}
            </div>
          ) : manualQris ? (
            <ReceiptProofForm
              orderCode={orderCode}
              amount={amount}
              orderCreatedAt={orderCreatedAt}
              onSubmitted={(proof) => setProofStatus(proof.status)}
            />
          ) : null}
          {manualQris && proofStatus === "REJECTED" && (
            <ReceiptProofForm
              orderCode={orderCode}
              amount={amount}
              orderCreatedAt={orderCreatedAt}
              onSubmitted={(proof) => setProofStatus(proof.status)}
            />
          )}
        </>
      )}
      {paymentStatus === "PENDING" && paymentProvider === "DANA" && !qrContent && (
        <p className="form-error" role="alert">QR pembayaran lama tidak tersedia. Jangan membayar melalui QRIS lain. Hubungi pengelola.</p>
      )}
      {paymentStatus !== "PENDING" && (
        <p className="checkout-status-line" aria-live="polite">
          Status pembayaran: <span className={getStatusClassName("payment", paymentStatus)}>{getPaymentStatusLabel(paymentStatus)}</span>
        </p>
      )}
      {canUseOrder && (
        <div className="browser-clip-workspace">
          {paymentStatus === "PAID" ? (
            <p>Pembayaran sudah dikonfirmasi admin. Pilih file video untuk dibuat menjadi {clipCount} klip. Video sumber diproses di perangkat Anda, sedangkan clip hasil disimpan di riwayat order selama 24 jam.</p>
          ) : (
            <p className="form-error" role="status">
              Pembayaran belum dikonfirmasi admin. Kamu tetap dapat memproses dan mengunduh clip sekarang. OCR hanya membaca gambar, bukan memastikan dana masuk; jika bukti palsu atau transfer tidak ditemukan, layanan sudah terpakai sebelum pembayaran dikonfirmasi.
            </p>
          )}
          {processingStatus === "COMPLETED" && (
            <p className="form-success" role="status">Order ini sudah selesai. Clip yang tersimpan dapat ditonton dan diunduh dari halaman ini selama 24 jam. Pilih ulang video jika ingin membuat clip lagi.</p>
          )}
          <div className="field">
            <label htmlFor={`video-${orderCode}`}>File video</label>
            <input
              id={`video-${orderCode}`}
              type="file"
              accept=".mp4,.mov,.m4v,.webm,video/mp4,video/quicktime,video/webm"
              onChange={chooseFile}
              disabled={!canSelectFile}
            />
            <small>MP4, MOV, M4V, atau WebM. Maksimal 250 MB dan dua jam. Biarkan halaman terbuka selama proses.</small>
          </div>
          {file && duration !== null && <p className="muted">Dipilih: {file.name} · {Math.ceil(duration / 60)} menit</p>}
          {fileError && <p className="form-error" role="alert">{fileError}</p>}
          {busy && (
            <div className="browser-progress">
              <p role="status" aria-live="polite">{stage}</p>
              <progress value={progress} max={100} aria-label="Progress pembuatan klip">{progress}%</progress>
              <span>{progress}%</span>
            </div>
          )}
          {downloads.length > 0 && (
            <div className="browser-downloads">
              <h3>Klip yang sudah selesai</h3>
              {downloads.map((item) => (
                <article className="browser-download-item" key={item.clipNumber ?? item.name}>
                  <h4>{item.name}</h4>
                  <video controls playsInline preload="metadata" src={item.url} aria-label={`Pratinjau ${item.name}`} />
                  <a className="button button-secondary" href={item.downloadUrl ?? item.url} download={item.local ? item.name : undefined}>
                    Unduh {item.name}
                  </a>
                </article>
              ))}
            </div>
          )}
          {!busy && file && duration !== null && (
            <button className="button button-accent" type="button" onClick={processVideo}>
              Buat klip di perangkat ini
            </button>
          )}
        </div>
      )}
      {statusError && <p className="form-error" role="alert">{statusError}</p>}
      </div>
      <aside className="checkout-aside" aria-label="Ringkasan order">
        <p className="section-kicker">Ringkasan</p>
        <h3>Order ini mencakup</h3>
        <dl className="checkout-facts">
          <div><dt>Jumlah clip</dt><dd>{clipCount} clip</dd></div>
          <div><dt>Pembayaran</dt><dd><span className={getStatusClassName("payment", paymentStatus)}>{getPaymentStatusLabel(paymentStatus)}</span></dd></div>
          <div><dt>Status proses</dt><dd><span className={getStatusClassName("processing", processingStatus)}>{getProcessingStatusLabel(processingStatus)}</span></dd></div>
        </dl>
        <p>Video sumber diproses di perangkat ini. Clip hasil dapat ditonton dan diunduh dari riwayat order selama 24 jam.</p>
      </aside>
    </section>
  );
}
