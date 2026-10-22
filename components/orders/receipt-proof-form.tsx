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

type DecodedReceiptImage = {
  image: CanvasImageSource;
  width: number;
  height: number;
  dispose: () => void;
};

async function decodeWithImageElement(source: Blob): Promise<DecodedReceiptImage> {
  const url = URL.createObjectURL(source);
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Gambar bukti tidak dapat dibaca browser."));
      image.src = url;
    });
    if (!image.naturalWidth || !image.naturalHeight) {
      throw new Error("Gambar bukti tidak dapat dibaca browser.");
    }
    return {
      image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      dispose: () => URL.revokeObjectURL(url)
    };
  } catch {
    URL.revokeObjectURL(url);
    throw new Error("Gambar bukti tidak dapat dibaca browser. Simpan ulang sebagai JPG, PNG, atau WebP lalu coba lagi.");
  }
}

async function decodeReceiptImage(source: Blob): Promise<DecodedReceiptImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(source);
      return {
        image: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        dispose: () => bitmap.close()
      };
    } catch {
      return decodeWithImageElement(source);
    }
  }
  return decodeWithImageElement(source);
}

function prepareReceiptForOcr(source: DecodedReceiptImage, enhance = false): HTMLCanvasElement {
  const scale = Math.min(2, 2200 / Math.max(source.width, source.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Gambar bukti belum dapat diproses di browser ini.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  if (enhance) context.filter = "grayscale(1) contrast(1.2)";
  context.drawImage(source.image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

async function compressReceipt(source: DecodedReceiptImage): Promise<File> {
  const scale = Math.min(1, 1400 / Math.max(source.width, source.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Gambar bukti belum dapat diproses di browser ini.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(source.image, 0, 0, canvas.width, canvas.height);

  for (const quality of [0.82, 0.72, 0.62]) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (blob && blob.size <= MAX_COMPRESSED_RECEIPT_SIZE) {
      return new File([blob], "bukti-pembayaran.jpg", { type: "image/jpeg" });
    }
  }
  throw new Error("Ukuran bukti setelah dikompres masih lebih dari 750 KB. Pilih gambar yang lebih kecil.");
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
    let decodedImage: DecodedReceiptImage | null = null;
    try {
      const { createWorker } = await import("tesseract.js");
      const ocrWorker = await createWorker("eng+ind");
      worker = ocrWorker;
      decodedImage = await decodeReceiptImage(image);
      const receiptCanvas = prepareReceiptForOcr(decodedImage);
      const { data } = await ocrWorker.recognize(receiptCanvas);
      let recognizedAmount = extractReceiptAmounts(data.text).find((candidate) => candidate === amount);
      if (recognizedAmount === undefined) {
        setMessage("Nominal belum cocok, mencoba membaca ulang bukti...");
        const enhancedCanvas = prepareReceiptForOcr(decodedImage, true);
        const retry = await ocrWorker.recognize(enhancedCanvas);
        recognizedAmount = extractReceiptAmounts(retry.data.text).find((candidate) => candidate === amount);
      }
      if (recognizedAmount === undefined) {
        throw new Error("Nominal pada bukti tidak terbaca cocok dengan total order.");
      }

      setMessage("Mengecilkan ukuran bukti...");
      const compressedImage = await compressReceipt(decodedImage);
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
      decodedImage?.dispose();
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
