import { describe, expect, it } from "vitest";
import { getPaymentStatusLabel } from "@/lib/order-presentation";

describe("payment status labels", () => {
  it("distinguishes OCR auto-approval from provider-verified payment", () => {
    expect(getPaymentStatusLabel("PAID", true)).toBe("Disetujui otomatis (OCR)");
    expect(getPaymentStatusLabel("PAID")).toBe("Lunas");
  });
});
