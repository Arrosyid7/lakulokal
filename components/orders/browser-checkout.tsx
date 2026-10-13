"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { PaymentQrCode } from "@/components/orders/payment-qr-code";
import { ReceiptProofForm } from "@/components/orders/receipt-proof-form";
import { getPaymentStatusLabel, getProcessingStatusLabel, getStatusClassName } from "@/lib/order-presentation";
import { mergeOrderDownloads, type OrderDownload } from "@/lib/order-downloads";
import {
  getClipRanges,
  MAX_BROWSER_VIDEO_DURATION_SECONDS,
  readVideoDuration,
  validateBrowserVideo,
  type ClipRange
} from "@/lib/browser-video";

type Props = {
  orderCode: string;
  clipCount: number;
  amount: number;
  currency: string;
  paymentProvider?: string;
  initialPaymentStatus: string;
  initialProcessingStatus: string;
  initialFile?: File | null;
  initialRanges?: ClipRange[];
  isCreditPurchase?: boolean;
  isCreditRun?: boolean;
};

export function BrowserCheckout({
  orderCode,
  clipCount,
  amount,
  currency,
  paymentProvider = "MANUAL_QRIS",
  initialPaymentStatus,
  initialProcessingStatus,
  initialFile = null,
  initialRanges,
  isCreditPurchase = false,
  isCreditRun = false
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
  const ffmpegRef = useRef<import("@ffmpeg/ffmpeg").FFmpeg | null>(null);
  const leavingPage = useRef(false);

  const updateServerStatus = useCallback(async (
    status: "PROCESSING" | "COMPLETED" | "FAILED",
    nextProgress: number,
    errorMessage?: string,
    completedClips = progressRef.current
  ) => {
    const response = await fetch(`/api/orders/${encodeURIComponent(orderCode)}/browser-processing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        progress: nextProgress,
        completed_clips: completedClips,
        error_message: errorMessage ?? null
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Status pemrosesan gagal disimpan.");
    setProcessingStatus(status);
    setProgress(nextProgress);
  }, [orderCode]);

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
    const shouldPoll = isCreditPurchase
      ? paymentStatus === "PENDING"
      : paymentStatus === "PENDING" || !["COMPLETED", "FAILED"].includes(processingStatus);
    if (!shouldPoll) return () => { active = false; };
    const timer = window.setInterval(() => { void checkPayment(); }, 4000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [isCreditPurchase, orderCode, paymentStatus, processingStatus]);

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

  useEffect(() => {
    if (!busy) return;

    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const markInterrupted = () => {
      if (leavingPage.current) return;
      void fetch(`/api/orders/${encodeURIComponent(orderCode)}/browser-processing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "FAILED",
          progress,
          completed_clips: progressRef.current,
          error_message: "Proses terhenti karena halaman ditutup."
        }),
        keepalive: true
      }).catch((error: unknown) => {
        console.error("browser_processing_leave_update_failed", error);
      });
    };
    const confirmInternalNavigation = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;

      const destination = new URL(link.href, window.location.href);
      if (
        destination.origin !== window.location.origin ||
        (destination.pathname === window.location.pathname && destination.search === window.location.search)
      ) return;

      event.preventDefault();
      event.stopPropagation();
      if (!window.confirm("Clip masih diproses. Jika meninggalkan halaman, proses akan dihentikan. Unduh clip yang sudah siap sebelum keluar. Lanjutkan?")) return;
      if (leavingPage.current) return;
      leavingPage.current = true;
      ffmpegRef.current?.terminate();
      void updateServerStatus("FAILED", progress, "Proses dihentikan karena halaman ditinggalkan.", progressRef.current)
        .then(() => window.location.assign(destination.href))
        .catch((error: unknown) => {
          leavingPage.current = false;
          const message = error instanceof Error ? error.message : "Status proses gagal diperbarui.";
          setStatusError(`Tidak dapat meninggalkan proses dengan aman. ${message}`);
        });
    };

    window.addEventListener("beforeunload", warnBeforeUnload);
    window.addEventListener("pagehide", markInterrupted);
    document.addEventListener("click", confirmInternalNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeUnload);
      window.removeEventListener("pagehide", markInterrupted);
      document.removeEventListener("click", confirmInternalNavigation, true);
    };
  }, [busy, orderCode, progress, updateServerStatus]);

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
    let processingStarted = false;
    leavingPage.current = false;

    try {
      await updateServerStatus("PROCESSING", 1, undefined, 0);
      processingStarted = true;
      setStage("Memuat pemroses video...");
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      ffmpeg = new FFmpeg();
      ffmpegRef.current = ffmpeg;
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
      const ranges = initialRanges ?? getClipRanges(duration, clipCount);

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
          ? `Clip ${index + 1} siap diunduh. Proses lanjut ke clip ${index + 2}.`
          : `Clip ${index + 1} siap diunduh.`);
        await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
        await ffmpeg.deleteFile(clipName);
        await updateServerStatus("PROCESSING", Math.min(95, clipProgress), undefined, index + 1);
      }

      await updateServerStatus("COMPLETED", 100, undefined, clipCount);
      setActiveClipNumber(clipCount);
      setStage("Semua clip siap diunduh. Hasil tidak disimpan di server atau riwayat.");
    } catch (error) {
      if (leavingPage.current) return;
      const message = (error instanceof Error ? error.message : "Pemrosesan video gagal.").slice(0, 400);
      setStage("");
      if (!processingStarted) {
        setStatusError(message);
      } else {
        try {
          await updateServerStatus("FAILED", progress, message, progressRef.current);
          setStatusError(message);
        } catch (statusError) {
          const saveError = statusError instanceof Error ? statusError.message : "Status gagal disimpan.";
          setStatusError(message === saveError ? message : `${message} ${saveError}`);
        }
      }
    } finally {
      ffmpeg?.terminate();
      ffmpegRef.current = null;
      setBusy(false);
    }
  }

  const money = new Intl.NumberFormat("id-ID", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  const manualQris = paymentProvider === "MANUAL_QRIS";
  const canUseOrder = !isCreditPurchase && paymentStatus === "PAID";
  const detachedProcessing = !busy && processingStatus === "PROCESSING";
  const canSelectFile = canUseOrder && !busy && !detachedProcessing && !(isCreditRun && ["COMPLETED", "FAILED"].includes(processingStatus));
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
          <p className="section-kicker">{isCreditRun ? "Pemakaian kredit" : "Pembayaran dan pemrosesan"}</p>
          <h2 id="checkout-title">Order {orderCode}</h2>
          <p className="checkout-total">
            <span>{isCreditRun ? "Kredit digunakan" : "Total pembayaran"}</span>
            <strong>{isCreditRun ? `${clipCount} kredit` : money}</strong>
          </p>
        </header>
      {paymentStatus === "PENDING" && manualQris && (
        <>
          {proofStatus !== "SUBMITTED" && (
            <>
              <PaymentQrCode amount={money} />
              <p>Bayar tepat sesuai nominal order ini, lalu unggah bukti. Admin memeriksa transaksi sebelum kredit diberikan.</p>
            </>
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
              onSubmitted={(proof) => {
                setProofStatus(proof.status);
                setPaymentStatus(proof.paymentStatus);
              }}
            />
          )}
          {proofStatus === "SUBMITTED" && (
            <p className="checkout-status-line" role="status" aria-live="polite">
              Bukti sudah dikirim. Kredit akan masuk setelah admin mengonfirmasi pembayaran.
            </p>
          )}
        </>
      )}
      {paymentStatus === "PENDING" && !manualQris && (
        <p className="form-error" role="alert">Metode pembayaran order lama sudah dihentikan. Jangan membayar untuk order ini. Hubungi pengelola untuk bantuan.</p>
      )}
      {paymentStatus !== "PENDING" && (
        !isCreditRun && <p className="checkout-status-line" aria-live="polite">
          Status pembayaran: <span className={getStatusClassName("payment", paymentStatus)}>{getPaymentStatusLabel(paymentStatus, manualQris && proofStatus === "APPROVED")}</span>
        </p>
      )}
      {isCreditPurchase && paymentStatus === "PAID" && (
        <section className="checkout-status-line" role="status" aria-live="polite">
          Pembayaran disetujui. {clipCount} kredit sudah ditambahkan ke saldo Anda.
          {" "}<a className="text-link" href="/dashboard/clip">Buat clip</a>
        </section>
      )}
      {canUseOrder && (
        <div className="browser-clip-workspace">
          {paymentStatus === "PAID" ? (
            <p>{isCreditRun ? `${clipCount} kredit digunakan untuk membuat clip ini.` : "Pembayaran sudah dikonfirmasi."} Pilih file video untuk dibuat menjadi {clipCount} klip. Video sumber dan hasil clip diproses di perangkat Anda.</p>
          ) : null}
          {detachedProcessing && (
            <p className="checkout-status-line" role="status">
              Order ini masih berstatus diproses, tetapi halaman ini tidak dapat melanjutkan proses lama. Kembali ke tab asal jika masih terbuka. Jika tidak, muat ulang nanti untuk melihat status terbaru; file hasil yang belum diunduh tidak dapat dipulihkan.
            </p>
          )}
          {(["WAITING_PAYMENT", "QUEUED", "PROCESSING"].includes(processingStatus) || busy) && (
            <p className="checkout-status-line" role="note">
              Hasil clip tidak disimpan di server atau riwayat order. Jangan pindah menu atau menutup halaman saat proses berjalan. Unduh setiap clip dari tombolnya sebelum meninggalkan halaman.
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
                  ? "Setiap clip muncul di bawah setelah selesai dibuat. Unduh clip yang sudah siap sebelum proses berlanjut."
                  : processingStatus === "COMPLETED"
                    ? downloads.length > 0
                      ? "Unduh setiap clip sekarang. File hanya tersedia selama halaman ini terbuka."
                      : "Proses selesai, tetapi file hasil tidak disimpan di riwayat. Buat clip baru untuk mendapatkan file lagi."
                    : "Unduh clip yang sudah siap dari halaman ini. File tidak disimpan di riwayat."}
              </p>
              <dl className="clip-run-details">
                <div><dt>Video</dt><dd>{file?.name || "Tidak tersedia"}</dd></div>
                <div><dt>Durasi sumber</dt><dd>{duration === null ? "Tidak tersedia" : `${Math.floor(duration / 60)} menit ${Math.round(duration % 60)} detik`}</dd></div>
                <div><dt>Biaya</dt><dd>{isCreditRun ? `${clipCount} kredit` : money}</dd></div>
              </dl>
              {busy && (
                <div className="browser-progress">
                  <p role="status" aria-live="polite">{stage}</p>
                  <progress value={progress} max={100} aria-label="Progress pembuatan clip">{progress}%</progress>
                  <span>{progress}%</span>
                </div>
              )}
              <p className="clip-run-count" role="status" aria-live="polite">{downloads.length} dari {clipCount} clip siap diunduh</p>
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
                disabled={!canSelectFile || (isCreditRun && Boolean(file))}
              />
              <small>MP4, MOV, M4V, atau WebM. Maksimal 250 MB dan dua jam. Hasil hanya tersedia di halaman ini, jadi unduh setiap clip sebelum keluar.</small>
            </div>
          )}
          {file && duration !== null && !busy && <p className="muted">Dipilih: {file.name} · {Math.ceil(duration / 60)} menit</p>}
          {fileError && <p className="form-error" role="alert">{fileError}</p>}
          {downloads.length > 0 && (
            <section className="browser-downloads" aria-labelledby="browser-downloads-title">
              <h3 id="browser-downloads-title">{busy ? "Clip siap diunduh" : "Unduh hasil clip"}</h3>
              {[...downloads].sort((left, right) => (right.clipNumber ?? 0) - (left.clipNumber ?? 0)).map((item) => (
                <article className="browser-download-item" key={item.clipNumber ?? item.name}>
                  <div className="browser-download-copy">
                    <p className="section-kicker">Clip {item.clipNumber ?? ""} dari {clipCount}</p>
                    <h4>{item.name}</h4>
                    <p>
                      {busy
                        ? "Unduh clip ini sebelum proses berlanjut."
                        : item.local
                          ? "File ini hanya tersedia selama halaman ini terbuka."
                          : "Ini hasil dari order lama. Unduh sekarang karena tautan akses dibuat sementara."}
                    </p>
                  </div>
                  <video controls playsInline preload="metadata" src={item.url} aria-label={`Pratinjau ${item.name}`} />
                  <a className="button button-secondary" href={item.downloadUrl ?? item.url} download={item.local ? item.name : undefined}>
                    Unduh {item.name}
                  </a>
                </article>
              ))}
            </section>
          )}
          {!busy && file && duration !== null && !(isCreditRun && processingStatus === "FAILED") && (
            <button className="button button-accent" type="button" onClick={processVideo}>
              Buat klip di perangkat ini
            </button>
          )}
          {!busy && isCreditRun && processingStatus === "FAILED" && (
            <p className="checkout-status-line" role="status">
              Proses terhenti. Clip yang sudah siap tetap bisa diunduh di halaman ini. Kredit untuk clip yang belum selesai dikembalikan jika berlaku.{" "}
              <a className="text-link" href="/dashboard/clip">Mulai clip baru</a>
            </p>
          )}
          {!busy && isCreditRun && processingStatus === "COMPLETED" && (
            <p className="checkout-status-line">
              {downloads.length > 0 ? "Unduh clip yang sudah siap sebelum meninggalkan halaman. " : "File hasil tidak tersimpan di riwayat. Buat clip baru untuk mendapatkan file lagi. "}
              <a className="text-link" href="/dashboard/clip">Buat clip berikutnya dengan 1 kredit</a>
            </p>
          )}
          {!busy && !isCreditPurchase && !isCreditRun && processingStatus === "COMPLETED" && (
            <p className="checkout-status-line" role="status">
              {downloads.length > 0
                ? "Unduh setiap clip yang sudah siap sebelum meninggalkan halaman."
                : "Order selesai, tetapi file hasil tidak tersimpan di riwayat. Jika halaman proses sudah ditutup, buat clip baru untuk mendapatkan file lagi."}
            </p>
          )}
        </div>
      )}
      {statusError && <p className="form-error" role="alert">{statusError}</p>}
      </div>
      <aside className="checkout-aside" aria-label="Ringkasan order">
        <p className="section-kicker">{isCreditRun ? "Saldo akun" : "Ringkasan"}</p>
        <h3>{isCreditRun ? "Pemakaian clip" : "Order ini mencakup"}</h3>
        <dl className="checkout-facts">
          <div><dt>Jumlah clip</dt><dd>{clipCount} clip</dd></div>
          {isCreditRun
            ? <div><dt>Kredit dipakai</dt><dd>{clipCount} kredit</dd></div>
            : <div><dt>Pembayaran</dt><dd><span className={getStatusClassName("payment", paymentStatus)}>{getPaymentStatusLabel(paymentStatus, manualQris && proofStatus === "APPROVED")}</span></dd></div>}
          {!isCreditPurchase && <div><dt>Status proses</dt><dd><span className={getStatusClassName("processing", processingStatus)}>{getProcessingStatusLabel(processingStatus)}</span></dd></div>}
        </dl>
        <p>Video sumber dan clip hasil hanya berada di perangkat Anda. Unduh setiap clip sebelum meninggalkan halaman. LakuLokal tidak menyimpan file hasil di server atau riwayat order.</p>
      </aside>
    </section>
  );
}
