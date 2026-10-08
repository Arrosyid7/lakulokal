"use client";

import { useState, type FormEvent } from "react";
import {
  extractReceiptAmounts,
  extractReceiptDate,
  formatJakartaDate,
  isReceiptDateValid
} from "@/lib/payment-proof";

type Props = {
  orderCode: string;
  amount: number;
  orderCreatedAt: string;
  onSubmitted: (proof: { status: string; amount: number; date: string; paymentStatus: string }) => void;
};

const MAX_RECEIPT_SIZE = 5 * 1024 * 1024;

export function ReceiptProofForm({ orderCode, amount, orderCreatedAt, onSubmitted }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = form.elements.namedItem("receipt") as HTMLInputElement | null;
    const image = file?.files?.[0];
    setError("");
    setMessage("");
    if (!image) {
      setError("Pilih gambar bukti pembayaran terlebih dahulu.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(image.type) || image.size > MAX_RECEIPT_SIZE) {
      setError("Gunakan gambar JPG, PNG, atau WebP maksimal 5 MB.");
      return;
    }

    setBusy(true);
    setMessage("Membaca nominal dan tanggal pada bukti...");
    let worker: import("tesseract.js").Worker | null = null;
    try {
      const { createWorker } = await import("tesseract.js");
      worker = await createWorker("eng+ind");
      const { data } = await worker.recognize(image);
      const recognizedAmount = extractReceiptAmounts(data.text).find((candidate) => candidate === amount);
      if (recognizedAmount === undefined) {
        throw new Error("Nominal pada bukti tidak terbaca cocok dengan total order.");
      }

      const transactionDate = extractReceiptDate(data.text);
      if (!transactionDate) {
        throw new Error("Tanggal transaksi tidak terbaca. Unggah bukti yang menampilkan tanggal dengan jelas.");
      }
      const orderDate = formatJakartaDate(new Date(orderCreatedAt));
      const today = formatJakartaDate(new Date());
      if (!isReceiptDateValid(transactionDate, orderDate, today)) {
        throw new Error("Tanggal transaksi harus pada atau setelah tanggal order dan tidak boleh di masa depan.");
      }

      const payload = new FormData();
      payload.set("receipt", image);
      payload.set("ocrAmount", String(recognizedAmount));
      payload.set("ocrTransactionDate", transactionDate);
      const response = await fetch(`/api/orders/${encodeURIComponent(orderCode)}/payment-proof`, {
        method: "POST",
        body: payload
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Bukti pembayaran belum dapat dikirim.");
      onSubmitted({
        status: result.proof.review_status,
        amount: result.proof.ocr_amount,
        date: result.proof.ocr_transaction_date,
        paymentStatus: result.payment_status
      });
      form.reset();
      setMessage("Nominal dan tanggal cocok menurut OCR. Order disetujui otomatis. OCR tidak memverifikasi dana masuk.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Bukti pembayaran gagal diperiksa.");
      setMessage("");
    } finally {
      if (worker) await worker.terminate();
      setBusy(false);
    }
  }

  return (
    <form className="form-stack" onSubmit={submit}>
      <div className="field">
        <label htmlFor={`receipt-${orderCode}`}>Bukti pembayaran</label>
        <input
          id={`receipt-${orderCode}`}
          name="receipt"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          disabled={busy}
          aria-describedby={`receipt-help-${orderCode}`}
        />
        <small id={`receipt-help-${orderCode}`}>
          JPG, PNG, atau WebP maksimal 5 MB. OCR mencocokkan nominal dan tanggal, lalu order disetujui otomatis. Pemeriksaan ini tidak memastikan dana diterima.
        </small>
      </div>
      {message && <p className="muted" role="status" aria-live="polite">{message}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button-accent" type="submit" disabled={busy}>
        {busy ? "Memeriksa bukti..." : "Periksa bukti dan setujui order"}
      </button>
    </form>
  );
}
