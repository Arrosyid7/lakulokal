import type { PaymentStatus, ProcessingStatus } from "@/lib/supabase/database.types";

const paymentLabels: Record<PaymentStatus, string> = {
  PENDING: "Menunggu pembayaran",
  PAID: "Lunas",
  FAILED: "Pembayaran gagal",
  EXPIRED: "Kedaluwarsa",
  CANCELLED: "Dibatalkan"
};

const processingLabels: Record<ProcessingStatus, string> = {
  WAITING_PAYMENT: "Menunggu pembayaran",
  QUEUED: "Dalam antrean",
  DOWNLOADING: "Menyiapkan video",
  PROCESSING: "Sedang membuat clip",
  UPLOADING: "Menyimpan clip",
  COMPLETED: "Selesai",
  FAILED: "Proses gagal"
};

export function getPaymentStatusLabel(status: string, autoApproved = false): string {
  if (autoApproved) return "Disetujui otomatis (OCR)";
  return paymentLabels[status as PaymentStatus] ?? status;
}

export function getProcessingStatusLabel(status: string): string {
  return processingLabels[status as ProcessingStatus] ?? status;
}

export function getStatusClassName(kind: "payment" | "processing", status: string): string {
  const isSuccess = kind === "payment" ? status === "PAID" : status === "COMPLETED";
  const isFailure = kind === "payment"
    ? ["FAILED", "EXPIRED", "CANCELLED"].includes(status)
    : status === "FAILED";
  return `status${isSuccess ? " status-good" : isFailure ? " status-error" : " status-pending"}`;
}
