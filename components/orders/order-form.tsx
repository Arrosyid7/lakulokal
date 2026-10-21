"use client";

import { useState, type FormEvent } from "react";
import { BrowserCheckout } from "@/components/orders/browser-checkout";
import { CREDIT_PACKAGES, type CreditPackageRow } from "@/lib/credits";

type CheckoutOrder = {
  orderCode: string;
  clipCount: number;
  amount: number;
  currency: string;
};

function formatMoney(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(amount);
}

export function OrderForm({ products }: { products: CreditPackageRow[] }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [checkout, setCheckout] = useState<CheckoutOrder | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState(products[0]?.id ?? "");
  const selectedPackage = products.find((product) => product.id === selectedPackageId);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPackage) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package_id: selectedPackage.id })
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
      <fieldset className="credit-package-options">
        <legend>Pilih nominal pembayaran</legend>
        {products.map((product) => {
          const configured = CREDIT_PACKAGES.find((option) => option.id === product.id);
          if (!configured) return null;
          return (
            <label className="credit-package-option" key={product.id}>
              <input
                type="radio"
                name="package_id"
                value={product.id}
                checked={selectedPackageId === product.id}
                onChange={() => setSelectedPackageId(product.id)}
                disabled={busy}
              />
              <span className="credit-package-option-details">
                <strong>{configured.clipCount} kredit</strong>
                <small>{configured.clipCount} clip, satu kredit untuk satu clip</small>
              </span>
              <span className="credit-package-option-price">{formatMoney(configured.price)}</span>
            </label>
          );
        })}
      </fieldset>
      {error && <p className="form-error" role="alert">{error}</p>}
      {products.length === 0 && <p className="form-error" role="status">Paket kredit belum tersedia. Muat ulang halaman atau coba lagi nanti.</p>}
      <button className="button button-accent" type="submit" disabled={busy || !selectedPackage}>
        {busy ? "Membuat order..." : selectedPackage ? `Buat order QRIS ${formatMoney(selectedPackage.price)}` : "Pilih paket kredit"}
      </button>
      <p className="muted">Kredit masuk setelah admin memeriksa dan menyetujui bukti pembayaran.</p>
    </form>
  );
}
