"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { BrowserCheckout } from "@/components/orders/browser-checkout";
import {
  MAX_BROWSER_VIDEO_DURATION_SECONDS,
  readVideoDuration,
  validateBrowserVideo
} from "@/lib/browser-video";

type PackageOption = { id: string; name: string; clip_count: number; price: number; currency: string };
type CheckoutOrder = {
  orderCode: string;
  clipCount: number;
  amount: number;
  currency: string;
  qrContent: string;
};

export function OrderForm({ packages }: { packages: PackageOption[] }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [checkout, setCheckout] = useState<CheckoutOrder | null>(null);
  const [checkingFile, setCheckingFile] = useState(false);
  const fileSelection = useRef(0);

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    fileSelection.current += 1;
    const selection = fileSelection.current;
    const selected = event.currentTarget.files?.[0] ?? null;
    setFileError("");
    setFile(null);
    if (!selected) {
      setCheckingFile(false);
      return;
    }
    const invalid = validateBrowserVideo(selected);
    if (invalid) {
      setCheckingFile(false);
      setFileError(invalid);
      return;
    }
    setCheckingFile(true);
    try {
      const duration = await readVideoDuration(selected);
      if (!Number.isFinite(duration) || duration < 1 || duration > MAX_BROWSER_VIDEO_DURATION_SECONDS) {
        throw new Error("Durasi video harus lebih dari satu detik dan tidak lebih dari dua jam.");
      }
      if (fileSelection.current === selection) setFile(selected);
    } catch (cause) {
      if (fileSelection.current === selection) {
        setFileError(cause instanceof Error ? cause.message : "Video tidak dapat dibaca.");
      }
    } finally {
      if (fileSelection.current === selection) setCheckingFile(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setFileError("Pilih file video terlebih dahulu.");
      return;
    }
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          package_id: form.get("package_id")
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Order tidak dapat dibuat.");
      setCheckout({
        orderCode: result.order.order_code,
        clipCount: result.order.clip_count,
        amount: result.order.amount,
        currency: result.order.currency,
        qrContent: result.payment.qr_content
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Order tidak dapat dibuat.");
    } finally {
      setBusy(false);
    }
  }

  if (checkout) {
    return (
      <BrowserCheckout
        orderCode={checkout.orderCode}
        clipCount={checkout.clipCount}
        amount={checkout.amount}
        currency={checkout.currency}
        qrContent={checkout.qrContent}
        initialPaymentStatus="PENDING"
        initialProcessingStatus="WAITING_PAYMENT"
        initialFile={file}
      />
    );
  }

  return (
    <form className="panel form-stack" onSubmit={submit}>
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
        {fileError && <p className="form-error" role="alert">{fileError}</p>}
      </div>
      <div className="field">
        <label htmlFor="package_id">Paket</label>
        <select id="package_id" name="package_id" required defaultValue="">
          <option value="" disabled>Pilih paket</option>
          {packages.map((item) => (
            <option value={item.id} key={item.id}>
              {item.name}, {item.clip_count} clip, {new Intl.NumberFormat("id-ID", { style: "currency", currency: item.currency, maximumFractionDigits: 0 }).format(item.price)}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {packages.length === 0 && <p className="form-error" role="status">Belum ada paket aktif. Hubungi <a className="text-link" href="mailto:halo@lakulokal.id">halo@lakulokal.id</a> untuk informasi.</p>}
      <button className="button button-accent" type="submit" disabled={busy || checkingFile || !file || packages.length === 0}>
        {checkingFile ? "Memeriksa video..." : busy ? "Membuat order..." : "Buat order dan tampilkan QRIS"}
      </button>
    </form>
  );
}
