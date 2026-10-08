"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { PaymentQrCode } from "@/components/orders/payment-qr-code";
import { ReceiptProofForm } from "@/components/orders/receipt-proof-form";
import { getPaymentStatusLabel, getProcessingStatusLabel, getStatusClassName } from "@/lib/order-presentation";
import { mergeOrderDownloads, type OrderDownload } from "@/lib/order-downloads";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  getClipRanges,
  MAX_BROWSER_VIDEO_DURATION_SECONDS,
  readVideoDuration,
  validateBrowserVideo
} from "@/lib/browser-video";

type Props = {
  orderCode: string;
  clipCount: number;
  amount: number;
  currency: string;
  orderCreatedAt: string;
  paymentProvider?: string;
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
  const [downloads, setDownloads] = useState<OrderDownload[]>([]);
  const [busy, setBusy] = useState(false);
  const progressRef = useRef(0);
  const [activeClipNumber, setActiveClipNumber] = useState(0);
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
          setDownloads((current) => mergeOrderDownloads(current, result.clips ?? []));
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

  async function uploadClip(clipNumber: number, clipName: string, blob: Blob, clipDuration: number) {
    const uploadInfoResponse = await fetch(`/api/orders/${encodeURIComponent(orderCode)}/clips`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phase: "sign",
        clip_number: clipNumber,
        file_name: clipName,
        size_bytes: blob.size,
        duration_seconds: clipDuration
      })
    });
    const uploadInfo = await uploadInfoResponse.json();
    if (!uploadInfoResponse.ok) throw new Error(uploadInfo.error || `Klip ${clipNumber} gagal disiapkan untuk disimpan.`);
    const { error: uploadError } = await createSupabaseBrowserClient()
      .storage.from("lakulokal-results")
      .uploadToSignedUrl(uploadInfo.path, uploadInfo.token, blob, { contentType: "video/mp4" });
    if (uploadError) throw new Error(`Klip ${clipNumber} gagal disimpan: ${uploadError.message}`);

    const finalizeResponse = await fetch(`/api/orders/${encodeURIComponent(orderCode)}/clips`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phase: "finalize",
        clip_number: clipNumber,
        file_name: clipName,
        size_bytes: blob.size,
        duration_seconds: clipDuration
      })
    });
    const finalized = await finalizeResponse.json();
    if (!finalizeResponse.ok) throw new Error(finalized.error || `Klip ${clipNumber} gagal dicatat.`);
  }

  async function processVideo() {
    if (!file || duration === null || busy) return;
    setBusy(true);
    setStatusError("");
    blobUrls.current.forEach((url) => URL.revokeObjectURL(url));
    blobUrls.current.clear();
    setDownloads([]);
    progressRef.current = 0;
    setActiveClipNumber(1);
    let ffmpeg: import("@ffmpeg/ffmpeg").FFmpeg | null = null;
    let pendingUpload: Promise<Error | null> | null = null;
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
        setActiveClipNumber(index + 1);
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
        const blob = new Blob([bytes.buffer], { type: "video/mp4" });
        const localUrl = URL.createObjectURL(blob);
        blobUrls.current.add(localUrl);
        setDownloads((current) => [...current, {
          name: clipName,
          url: localUrl,
          clipNumber: index + 1,
          local: true
        }]);
        progressRef.current = index + 1;
        const clipProgress = Math.round(10 + ((index + 1) / clipCount) * 85);
        setProgress(clipProgress);
        setStage(index + 1 < clipCount
          ? `Clip ${index + 1} siap ditonton. Proses lanjut ke clip ${index + 2}.`
          : `Clip ${index + 1} siap ditonton. Menyimpan hasil terakhir.`);
        await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
        await ffmpeg.deleteFile(clipName);
        await updateServerStatus("PROCESSING", Math.min(95, clipProgress));
        if (pendingUpload) {
          const uploadError = await pendingUpload;
          pendingUpload = null;
          if (uploadError) throw uploadError;
        }
        pendingUpload = uploadClip(index + 1, clipName, blob, range.duration)
          .then(() => null, (cause) => cause instanceof Error ? cause : new Error("Klip gagal disimpan."));
        if (index + 1 < clipCount) setStage(`Menyimpan clip ${index + 1} sambil membuat clip ${index + 2}...`);
      }

      if (pendingUpload) {
        const uploadError = await pendingUpload;
        pendingUpload = null;
        if (uploadError) throw uploadError;
      }
      await updateServerStatus("COMPLETED", 100);
      setActiveClipNumber(clipCount);
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
  const clipRunProgress = !busy && processingStatus === "COMPLETED" ? 100 : progress;
  const showClipRun = busy || (downloads.length > 0 && ["COMPLETED", "FAILED"].includes(processingStatus));
  const clipRunTitle = busy
    ? `Clip ${Math.max(1, activeClipNumber)} dari ${clipCount} sedang dibuat`
    : processingStatus === "COMPLETED"
      ? "Semua clip sudah selesai"
      : "Proses belum selesai";

  return (
    <section className={`panel browser-checkout${busy ? " browser-checkout-running" : ""}`} aria-labelledby="checkout-title">
      <div className="checkout-primary">
        <header className="checkout-heading">
          <p className="section-kicker">Pembayaran dan pemrosesan</p>
          <h2 id="checkout-title">Order {orderCode}</h2>
          <p className="checkout-total"><span>Total pembayaran</span><strong>{money}</strong></p>
        </header>
      {paymentStatus === "PENDING" && manualQris && (
        <>
          <PaymentQrCode amount={money} />
          <p>Bayar tepat sesuai nominal order ini, lalu unggah bukti transaksi. Nominal dan tanggal yang cocok menurut OCR akan menyetujui order secara otomatis.</p>
          {proofStatus === "SUBMITTED" && (
            <p className="form-success" role="status">Bukti sebelumnya menunggu pemeriksaan admin. Anda tetap dapat memproses clip, tetapi OCR tidak memastikan dana masuk.</p>
          )}
          {proofStatus === "REJECTED" && (
            <div className="form-error" role="status">
              <p>Bukti sebelumnya ditolak oleh admin. Periksa catatan, lalu unggah bukti pembayaran yang benar.</p>
              {proofNote && <p>Catatan admin: {proofNote}</p>}
            </div>
          )}
          {proofStatus !== "SUBMITTED" && (
            <ReceiptProofForm
              orderCode={orderCode}
              amount={amount}
              orderCreatedAt={orderCreatedAt}
              onSubmitted={(proof) => {
                setProofStatus(proof.status);
                setPaymentStatus(proof.paymentStatus);
              }}
            />
          )}
        </>
      )}
      {paymentStatus === "PENDING" && !manualQris && (
        <p className="form-error" role="alert">Metode pembayaran order lama sudah dihentikan. Jangan membayar untuk order ini. Hubungi pengelola untuk bantuan.</p>
      )}
      {paymentStatus !== "PENDING" && (
        <p className="checkout-status-line" aria-live="polite">
          Status pembayaran: <span className={getStatusClassName("payment", paymentStatus)}>{getPaymentStatusLabel(paymentStatus, manualQris && proofStatus === "APPROVED")}</span>
        </p>
      )}
      {canUseOrder && (
        <div className="browser-clip-workspace">
          {paymentStatus === "PAID" && manualQris && proofStatus === "APPROVED" ? (
            <p>Order disetujui otomatis setelah OCR mencocokkan nominal dan tanggal bukti. OCR tidak memastikan dana masuk. Pilih file video untuk dibuat menjadi {clipCount} klip. Video sumber diproses di perangkat Anda, sedangkan clip hasil disimpan di riwayat order selama 24 jam.</p>
          ) : paymentStatus === "PAID" ? (
            <p>Pembayaran sudah dikonfirmasi. Pilih file video untuk dibuat menjadi {clipCount} klip. Video sumber diproses di perangkat Anda, sedangkan clip hasil disimpan di riwayat order selama 24 jam.</p>
          ) : (
            <p className="form-error" role="status">
              Bukti QRIS belum disetujui admin. Anda tetap dapat memproses dan mengunduh clip sekarang. OCR hanya membaca gambar, bukan memastikan dana masuk.
            </p>
          )}
          {showClipRun && (
            <section className="clip-run-status" aria-labelledby="clip-run-title">
              <div className="clip-run-meter" aria-hidden="true">
                <svg viewBox="0 0 88 88">
                  <circle className="clip-run-track" cx="44" cy="44" r="35" />
                  <circle
                    className="clip-run-value"
                    cx="44"
                    cy="44"
                    r="35"
                    strokeDasharray={2 * Math.PI * 35}
                    strokeDashoffset={2 * Math.PI * 35 * (1 - clipRunProgress / 100)}
                  />
                </svg>
                <span>{clipRunProgress}%</span>
              </div>
              <h3 id="clip-run-title">{clipRunTitle}</h3>
              <p className="clip-run-intro">
                {busy
                  ? "Setiap clip langsung muncul untuk dipratinjau. Proses berlanjut ke clip berikutnya tanpa menunggu seluruh paket selesai."
                  : processingStatus === "COMPLETED"
                    ? "Semua hasil tersedia di bawah untuk ditonton dan diunduh selama 24 jam."
                    : "Hasil yang sudah selesai tetap dapat dipratinjau dan diunduh di bawah."}
              </p>
              <dl className="clip-run-details">
                <div><dt>Video</dt><dd>{file?.name || "Tidak tersedia"}</dd></div>
                <div><dt>Durasi sumber</dt><dd>{duration === null ? "Tidak tersedia" : `${Math.floor(duration / 60)} menit ${Math.round(duration % 60)} detik`}</dd></div>
                <div><dt>Biaya</dt><dd>{money}</dd></div>
              </dl>
              {busy && (
                <div className="browser-progress">
                  <p role="status" aria-live="polite">{stage}</p>
                  <progress value={progress} max={100} aria-label="Progress pembuatan clip">{progress}%</progress>
                  <span>{progress}%</span>
                </div>
              )}
              <p className="clip-run-count" role="status" aria-live="polite">{downloads.length} dari {clipCount} clip siap ditonton</p>
            </section>
          )}
          {!busy && (
            <div className="field">
              <label htmlFor={`video-${orderCode}`}>File video</label>
              <input
                id={`video-${orderCode}`}
                type="file"
                accept=".mp4,.mov,.m4v,.webm,video/mp4,video/quicktime,video/webm"
                onChange={chooseFile}
                disabled={!canSelectFile}
              />
              <small>MP4, MOV, M4V, atau WebM. Maksimal 250 MB dan dua jam. Biarkan halaman terbuka sampai clip selesai dibuat.</small>
            </div>
          )}
          {file && duration !== null && !busy && <p className="muted">Dipilih: {file.name} · {Math.ceil(duration / 60)} menit</p>}
          {fileError && <p className="form-error" role="alert">{fileError}</p>}
          {downloads.length > 0 && (
            <section className="browser-downloads" aria-labelledby="browser-downloads-title">
              <h3 id="browser-downloads-title">{busy ? "Preview clip yang sudah siap" : "Clip siap ditonton dan diunduh"}</h3>
              {[...downloads].sort((left, right) => (right.clipNumber ?? 0) - (left.clipNumber ?? 0)).map((item) => (
                <article className="browser-download-item" key={item.clipNumber ?? item.name}>
                  <div className="browser-download-copy">
                    <p className="section-kicker">Clip {item.clipNumber ?? ""} dari {clipCount}</p>
                    <h4>{item.name}</h4>
                    <p>{busy ? "Preview siap. Clip berikutnya diproses otomatis." : "Preview siap ditonton. Unduh file ini jika ingin menyimpannya sekarang."}</p>
                  </div>
                  <video controls playsInline preload="metadata" src={item.url} aria-label={`Pratinjau ${item.name}`} />
                  <a className="button button-secondary" href={item.downloadUrl ?? item.url} download={item.local ? item.name : undefined}>
                    Unduh {item.name}
                  </a>
                </article>
              ))}
            </section>
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
          <div><dt>Pembayaran</dt><dd><span className={getStatusClassName("payment", paymentStatus)}>{getPaymentStatusLabel(paymentStatus, manualQris && proofStatus === "APPROVED")}</span></dd></div>
          <div><dt>Status proses</dt><dd><span className={getStatusClassName("processing", processingStatus)}>{getProcessingStatusLabel(processingStatus)}</span></dd></div>
        </dl>
        <p>Video sumber diproses di perangkat ini. Clip hasil dapat ditonton dan diunduh dari riwayat order selama 24 jam.</p>
      </aside>
    </section>
  );
}
