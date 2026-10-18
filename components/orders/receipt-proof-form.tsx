"use client";

import { useState, type FormEvent } from "react";
import { extractReceiptAmounts } from "@/lib/payment-proof";

type Props = {
  orderCode: string;
  amount: number;
  onSubmitted: (proof: { status: string; amount: number; paymentStatus: string }) => void;
};

const MAX_RECEIPT_SIZE = 5 * 1024 * 1024;
const MAX_COMPRESSED_RECEIPT_SIZE = 750 * 1024;

async function compressReceipt(source: File): Promise<File> {
  const bitmap = await createImageBitmap(source);
  try {
    const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Gambar bukti belum dapat diproses di browser ini.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.82, 0.72, 0.62]) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (blob && blob.size <= MAX_COMPRESSED_RECEIPT_SIZE) {
        return new File([blob], "bukti-pembayaran.jpg", { type: "image/jpeg" });
      }
    }
    throw new Error("Ukuran bukti setelah dikompres masih lebih dari 750 KB. Pilih gambar yang lebih kecil.");
  } finally {
    bitmap.close();
  }
}

export function ReceiptProofForm({ orderCode, amount, onSubmitted }: Props) {
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
    setMessage("Membaca nominal pada bukti...");
    let worker: import("tesseract.js").Worker | null = null;
    try {
      const { createWorker } = await import("tesseract.js");
      worker = await createWorker("eng+ind");
      const { data } = await worker.recognize(image);
      const recognizedAmount = extractReceiptAmounts(data.text).find((candidate) => candidate === amount);
      if (recognizedAmount === undefined) {
        throw new Error("Nominal pada bukti tidak terbaca cocok dengan total order.");
      }

      setMessage("Mengecilkan ukuran bukti...");
      const compressedImage = await compressReceipt(image);
      const payload = new FormData();
      payload.set("receipt", compressedImage);
      payload.set("ocrAmount", String(recognizedAmount));
      const response = await fetch(`/api/orders/${encodeURIComponent(orderCode)}/payment-proof`, {
        method: "POST",
        body: payload
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Bukti pembayaran belum dapat dikirim.");
      onSubmitted({
        status: result.proof.review_status,
        amount: result.proof.ocr_amount,
        paymentStatus: result.payment_status
      });
      form.reset();
      setMessage("Bukti terkirim dan menunggu pemeriksaan admin. Kredit masuk setelah pembayaran disetujui.");
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
          Pilih JPG, PNG, atau WebP maksimal 5 MB. Gambar akan dikompres menjadi JPG maksimal 750 KB sebelum disimpan.
        </small>
      </div>
      {message && <p className="muted" role="status" aria-live="polite">{message}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button-accent" type="submit" disabled={busy}>
        {busy ? "Mengirim bukti..." : "Kirim bukti pembayaran"}
      </button>
    </form>
  );
}
