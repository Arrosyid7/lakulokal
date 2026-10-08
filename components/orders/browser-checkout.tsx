"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { PaymentQrCode } from "@/components/orders/payment-qr-code";
import {
  getClipRanges,
  MAX_BROWSER_VIDEO_DURATION_SECONDS,
  readVideoDuration,
  validateBrowserVideo
} from "@/lib/browser-video";

type Download = { name: string; url: string };

type Props = {
  orderCode: string;
  clipCount: number;
  amount: number;
  currency: string;
  qrContent: string | null;
  initialPaymentStatus: string;
  initialProcessingStatus: string;
  initialFile?: File | null;
};

export function BrowserCheckout({
  orderCode,
  clipCount,
  amount,
  currency,
  qrContent,
  initialPaymentStatus,
  initialProcessingStatus,
  initialFile = null
}: Props) {
  const [paymentStatus, setPaymentStatus] = useState(initialPaymentStatus);
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

  useEffect(() => {
    if (paymentStatus !== "PENDING") return;
    let active = true;
    const checkPayment = async () => {
      try {
        const response = await fetch(`/api/orders/${encodeURIComponent(orderCode)}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Status pembayaran belum dapat diperbarui.");
        const result = await response.json();
        if (active) {
          setPaymentStatus(result.order.payment_status);
          setProcessingStatus(result.order.processing_status);
          setStatusError("");
        }
      } catch (error) {
        if (active) setStatusError(error instanceof Error ? error.message : "Status pembayaran gagal dimuat.");
      }
    };
    void checkPayment();
    const timer = window.setInterval(() => { void checkPayment(); }, 4000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [orderCode, paymentStatus]);

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
    downloads.forEach(({ url }) => URL.revokeObjectURL(url));
  }, [downloads]);

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    fileSelection.current += 1;
    const selection = fileSelection.current;
    const selected = event.currentTarget.files?.[0] ?? null;
    setFileError("");
    setDuration(null);
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
    setDownloads([]);
    progressRef.current = 0;
    const generated: Download[] = [];
    let ffmpeg: import("@ffmpeg/ffmpeg").FFmpeg | null = null;

    try {
      await updateServerStatus("PROCESSING", 1);
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
        generated.push({
          name: clipName,
          url: URL.createObjectURL(new Blob([bytes.buffer], { type: "video/mp4" }))
        });
        await ffmpeg.deleteFile(clipName);
        progressRef.current = index + 1;
        setProgress(Math.round(10 + ((index + 1) / clipCount) * 85));
        await updateServerStatus("PROCESSING", Math.min(95, Math.round(10 + ((index + 1) / clipCount) * 85)));
      }

      await updateServerStatus("COMPLETED", 100);
      setDownloads(generated);
      setStage("Klip siap diunduh. File tersimpan di perangkat Anda.");
    } catch (error) {
      generated.forEach(({ url }) => URL.revokeObjectURL(url));
      const message = (error instanceof Error ? error.message : "Pemrosesan video gagal.").slice(0, 400);
      setStage("");
      try {
        await updateServerStatus("FAILED", progress, message);
        setStatusError(message);
      } catch (statusError) {
        const saveError = statusError instanceof Error ? statusError.message : "Status gagal disimpan.";
        setStatusError(`${message} ${saveError}`);
      }
    } finally {
      ffmpeg?.terminate();
      setBusy(false);
    }
  }

  const money = new Intl.NumberFormat("id-ID", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  const canSelectFile = paymentStatus === "PAID" && !busy;

  return (
    <section className="panel stack" aria-labelledby="checkout-title">
      <h2 id="checkout-title">Order {orderCode}</h2>
      <p><strong>Total: {money}</strong></p>
      {paymentStatus === "PENDING" && qrContent && (
        <>
          <PaymentQrCode value={qrContent} amount={money} />
          <p aria-live="polite">Menunggu pembayaran QRIS. Halaman ini memeriksa status secara otomatis.</p>
        </>
      )}
      {paymentStatus === "PENDING" && !qrContent && (
        <p className="form-error" role="alert">QRIS belum tersedia. Jangan membayar di luar halaman ini. Hubungi pengelola.</p>
      )}
      {paymentStatus !== "PENDING" && (
        <p aria-live="polite">Status pembayaran: <strong>{paymentStatus}</strong></p>
      )}
      {paymentStatus === "PAID" && (
        <div className="browser-clip-workspace">
          <p>Pembayaran terverifikasi. Pilih file video untuk dibuat menjadi {clipCount} klip. File diproses di perangkat Anda dan tidak diunggah.</p>
          {processingStatus === "COMPLETED" && (
            <p className="form-success" role="status">Order ini sudah selesai. Hasil sebelumnya hanya tersimpan di perangkat saat itu. Pilih ulang video untuk membuat klip lagi tanpa membayar kembali.</p>
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
              <h3>Klip siap diunduh</h3>
              {downloads.map((item) => (
                <a className="button button-secondary" href={item.url} download={item.name} key={item.name}>
                  Unduh {item.name}
                </a>
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
    </section>
  );
}
