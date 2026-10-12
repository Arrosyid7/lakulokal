import type { Json } from "@/lib/supabase/database.types";

export const CREDIT_PACKAGE_ID = "00000000-0000-4000-8000-000000000005";
export const CREDIT_PACKAGE_NAME = "5 Kredit Clip";
export const CREDIT_PACKAGE_COUNT = 5;
export const CREDIT_PACKAGE_PRICE = 1000;

export function isCreditPurchase(metadata: Json): boolean {
  return typeof metadata === "object" && metadata !== null && !Array.isArray(metadata)
    && metadata.order_type === "CREDIT_PURCHASE";
}

export function isCreditClipRun(metadata: Json): boolean {
  return typeof metadata === "object" && metadata !== null && !Array.isArray(metadata)
    && metadata.order_type === "CREDIT_CLIP_RUN";
}
