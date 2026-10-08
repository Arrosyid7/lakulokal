import { describe, expect, it } from "vitest";
import {
  extractReceiptAmounts,
  extractReceiptDate,
  formatJakartaDate,
  isReceiptDateValid
} from "@/lib/payment-proof";

describe("payment proof OCR parsing", () => {
  it("extracts Indonesian rupiah amounts from labeled receipt lines", () => {
    expect(extractReceiptAmounts("Total Pembayaran\nRp 1.000")).toContain(1000);
    expect(extractReceiptAmounts("Amount: IDR 125.000,00")).toContain(125000);
  });

  it("extracts ISO, Indonesian numeric, and named-month dates", () => {
    expect(extractReceiptDate("Payment date: 2026-10-08")).toBe("2026-10-08");
    expect(extractReceiptDate("Tanggal: 08/10/2026")).toBe("2026-10-08");
    expect(extractReceiptDate("8 Oktober 2026")).toBe("2026-10-08");
  });

  it("rejects impossible and out-of-window transaction dates", () => {
    expect(extractReceiptDate("31/02/2026")).toBeNull();
    expect(isReceiptDateValid("2026-02-31", "2026-02-01", "2026-03-01")).toBe(false);
    expect(isReceiptDateValid("2026-10-07", "2026-10-08", "2026-10-08")).toBe(false);
    expect(isReceiptDateValid("2026-10-09", "2026-10-08", "2026-10-08")).toBe(false);
    expect(isReceiptDateValid("2026-10-08", "2026-10-08", "2026-10-08")).toBe(true);
  });

  it("formats dates in Jakarta time rather than UTC", () => {
    expect(formatJakartaDate(new Date("2026-10-07T18:00:00.000Z"))).toBe("2026-10-08");
  });
});
