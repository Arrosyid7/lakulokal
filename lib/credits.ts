import type { Json } from "@/lib/supabase/database.types";

export const CREDIT_PACKAGES = [
  { id: "00000000-0000-4000-8000-000000000005", name: "5 Kredit Clip", clipCount: 5, price: 1000, qrImage: "/payment/qris-1000.jpg" },
  { id: "00000000-0000-4000-8000-000000000010", name: "10 Kredit Clip", clipCount: 10, price: 2000, qrImage: "/payment/qris-2000.jpg" },
  { id: "00000000-0000-4000-8000-000000000015", name: "15 Kredit Clip", clipCount: 15, price: 3000, qrImage: "/payment/qris-3000.jpg" },
  { id: "00000000-0000-4000-8000-000000000020", name: "20 Kredit Clip", clipCount: 20, price: 4000, qrImage: "/payment/qris-4000.jpg" },
  { id: "00000000-0000-4000-8000-000000000025", name: "25 Kredit Clip", clipCount: 25, price: 5000, qrImage: "/payment/qris-5000.jpg" }
] as const;

export type CreditPackage = (typeof CREDIT_PACKAGES)[number];
export type CreditPackageRow = {
  id: string;
  name: string;
  clip_count: number;
  price: number;
  currency: string;
};

export function getCreditPackage(id: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((product) => product.id === id);
}

export function getCreditPackageByPrice(price: number): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((product) => product.price === price);
}

export function isConfiguredCreditPackage(row: CreditPackageRow): boolean {
  const product = getCreditPackage(row.id);
  return Boolean(
    product &&
    product.name === row.name &&
    product.clipCount === row.clip_count &&
    product.price === row.price &&
    row.currency === "IDR"
  );
}

export function isCreditPurchase(metadata: Json): boolean {
  return typeof metadata === "object" && metadata !== null && !Array.isArray(metadata)
    && metadata.order_type === "CREDIT_PURCHASE";
}

export function isCreditClipRun(metadata: Json): boolean {
  return typeof metadata === "object" && metadata !== null && !Array.isArray(metadata)
    && metadata.order_type === "CREDIT_CLIP_RUN";
}
