"use client";

import { useState, type FormEvent } from "react";
import { BrowserCheckout } from "@/components/orders/browser-checkout";
import {
  CREDIT_PACKAGE_COUNT,
  CREDIT_PACKAGE_ID,
  CREDIT_PACKAGE_PRICE
} from "@/lib/credits";

type PackageOption = { id: string; name: string; clip_count: number; price: number; currency: string };
type CheckoutOrder = {
  orderCode: string;
  clipCount: number;
  amount: number;
  currency: string;
};

export function OrderForm({ product }: { product: PackageOption | null }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [checkout, setCheckout] = useState<CheckoutOrder | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!product) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package_id: CREDIT_PACKAGE_ID })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Order tidak dapat dibuat.");
      setCheckout({
        orderCode: result.order.order_code,
        clipCount: result.order.clip_count,
        amount: result.order.amount,
        currency: result.order.currency
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
        initialPaymentStatus="PENDING"
        initialProcessingStatus="WAITING_PAYMENT"
        isCreditPurchase
      />
    );
  }

  return (
    <form className="panel form-stack credit-purchase-form" onSubmit={submit}>
      <div className="credit-package">
        <p className="section-kicker">Paket kredit</p>
        <h2>{product?.name ?? "5 Kredit Clip"}</h2>
        <p>{CREDIT_PACKAGE_COUNT} clip, satu kredit untuk satu clip.</p>
        <strong>{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(CREDIT_PACKAGE_PRICE)}</strong>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {!product && <p className="form-error" role="status">Paket kredit belum tersedia. Muat ulang halaman atau coba lagi nanti.</p>}
      <button className="button button-accent" type="submit" disabled={busy || !product}>
        {busy ? "Membuat order..." : "Buat order QRIS"}
      </button>
      <p className="muted">Kredit masuk setelah admin memeriksa dan menyetujui bukti pembayaran.</p>
    </form>
  );
}
