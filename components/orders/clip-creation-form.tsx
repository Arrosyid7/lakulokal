"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { BrowserCheckout } from "@/components/orders/browser-checkout";
import {
  getClipRanges,
  getManualClipRange,
  MAX_BROWSER_VIDEO_DURATION_SECONDS,
  readVideoDuration,
  validateBrowserVideo
} from "@/lib/browser-video";

type CheckoutOrder = {
  orderCode: string;
  clipCount: number;
  file: File;
  ranges: { start: number; duration: number }[];
};

export function ClipCreationForm({ availableCredits }: { availableCredits: number }) {
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [clipCount, setClipCount] = useState(1);
  const [startTime, setStartTime] = useState("0");
  const [endTime, setEndTime] = useState("60");
  const [checkingFile, setCheckingFile] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [checkout, setCheckout] = useState<CheckoutOrder | null>(null);
  const fileSelection = useRef(0);

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    fileSelection.current += 1;
    const selection = fileSelection.current;
    const selected = event.currentTarget.files?.[0] ?? null;
    setError("");
    setFile(null);
    setDuration(null);
    if (!selected) {
      setCheckingFile(false);
      return;
    }
    const invalid = validateBrowserVideo(selected);
    if (invalid) {
      setCheckingFile(false);
      setError(invalid);
      return;
    }
    setCheckingFile(true);
    try {
      const videoDuration = await readVideoDuration(selected);
      if (!Number.isFinite(videoDuration) || videoDuration < 1 || videoDuration > MAX_BROWSER_VIDEO_DURATION_SECONDS) {
        throw new Error("Durasi video harus lebih dari satu detik dan tidak lebih dari dua jam.");
      }
      if (fileSelection.current === selection) {
        setFile(selected);
        setDuration(videoDuration);
        setStartTime("0");
        setEndTime(String(Math.min(videoDuration, 60)));
      }
    } catch (cause) {
      if (fileSelection.current === selection) {
        setError(cause instanceof Error ? cause.message : "Video tidak dapat dibaca.");
      }
    } finally {
      if (fileSelection.current === selection) setCheckingFile(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || duration === null) {
      setError("Pilih file video yang dapat dibaca terlebih dahulu.");
      return;
    }
    let ranges: { start: number; duration: number }[];
    try {
      ranges = clipCount === 1
        ? [getManualClipRange(Number(startTime), Number(endTime), duration)]
        : getClipRanges(duration, 5);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Rentang clip tidak valid.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/clip-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clip_count: clipCount })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Clip belum dapat dimulai.");
      setCheckout({
        orderCode: result.order.order_code,
        clipCount: result.order.clip_count,
        file,
        ranges
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Clip belum dapat dimulai.");
    } finally {
      setBusy(false);
    }
  }

  if (checkout) {
    return (
      <BrowserCheckout
        key={checkout.orderCode}
        orderCode={checkout.orderCode}
        clipCount={checkout.clipCount}
        amount={0}
        currency="IDR"
        initialPaymentStatus="PAID"
        initialProcessingStatus="WAITING_PAYMENT"
        initialFile={checkout.file}
        initialRanges={checkout.ranges}
        isCreditRun
      />
    );
  }

  return (
    <form className="panel form-stack clip-creation-form" onSubmit={submit}>
      <div className="field">
        <label htmlFor="video_file">File video</label>
        <input
          id="video_file"
          name="video_file"
          type="file"
          accept=".mp4,.mov,.m4v,.webm,video/mp4,video/quicktime,video/webm"
          onChange={selectFile}
          required
          aria-describedby="video-file-help"
        />
        <small id="video-file-help">MP4, MOV, M4V, atau WebM. Maksimal 250 MB dan dua jam. Video tetap di perangkat Anda.</small>
      </div>
      <fieldset className="field clip-count-choice">
        <legend>Jumlah clip</legend>
        <label>
          <input type="radio" name="clip_count" value="1" checked={clipCount === 1} onChange={() => setClipCount(1)} />
          <span>1 clip manual per proses. Pilih waktu sendiri. 1 kredit</span>
        </label>
        <label>
          <input type="radio" name="clip_count" value="5" checked={clipCount === 5} onChange={() => setClipCount(5)} />
          <span>5 clip sekaligus, waktu dibagi merata. 5 kredit</span>
        </label>
      </fieldset>
      {clipCount === 1 && (
        <div className="clip-time-fields">
          <div className="field">
            <label htmlFor="clip-start">Mulai (detik)</label>
            <input id="clip-start" type="number" min="0" max={duration ?? undefined} step="0.1" value={startTime} onChange={(event) => setStartTime(event.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="clip-end">Selesai (detik)</label>
            <input id="clip-end" type="number" min="0.1" max={duration ?? undefined} step="0.1" value={endTime} onChange={(event) => setEndTime(event.target.value)} required />
          </div>
          <small>Durasi satu clip maksimal 60 detik.</small>
        </div>
      )}
      {clipCount === 5 && <p className="muted">Lima bagian dipilih merata dari video. Durasi tiap clip maksimal 60 detik.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button-accent" type="submit" disabled={busy || checkingFile || !file || availableCredits < clipCount}>
        {checkingFile ? "Memeriksa video..." : busy ? "Menyiapkan clip..." : `Buat ${clipCount} clip`}
      </button>
      {availableCredits < clipCount && (
        <p className="form-error" role="status">
          Saldo belum cukup untuk pilihan ini. <Link className="text-link" href="/dashboard/new">Beli 5 kredit seharga Rp1.000</Link>
        </p>
      )}
    </form>
  );
}
