import { describe, expect, it } from "vitest";
import {
  CREDIT_PACKAGES,
  getCreditPackage,
  getCreditPackageByPrice,
  isConfiguredCreditPackage
} from "@/lib/credits";

describe("credit purchase packages", () => {
  it("maps each supported price to five credits per thousand rupiah", () => {
    expect(CREDIT_PACKAGES.map(({ price, clipCount }) => [price, clipCount])).toEqual([
      [1000, 5],
      [2000, 10],
      [3000, 15],
      [4000, 20],
      [5000, 25]
    ]);
  });

  it("returns only package ids from the supported set", () => {
    expect(getCreditPackage(CREDIT_PACKAGES[2].id)?.price).toBe(3000);
    expect(getCreditPackage("not-a-package")).toBeUndefined();
    expect(getCreditPackageByPrice(5000)?.clipCount).toBe(25);
    expect(getCreditPackageByPrice(6000)).toBeUndefined();
  });

  it("rejects database package rows that do not match their configured price and credit count", () => {
    const product = CREDIT_PACKAGES[4];
    expect(isConfiguredCreditPackage({
      id: product.id,
      name: product.name,
      clip_count: product.clipCount,
      price: product.price,
      currency: "IDR"
    })).toBe(true);
    expect(isConfiguredCreditPackage({
      id: product.id,
      name: product.name,
      clip_count: product.clipCount,
      price: 1000,
      currency: "IDR"
    })).toBe(false);
  });
});
