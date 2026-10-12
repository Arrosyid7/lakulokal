import { describe, expect, it } from "vitest";
import { extractReceiptAmounts } from "@/lib/payment-proof";

describe("payment proof OCR parsing", () => {
  it("extracts Indonesian rupiah amounts from labeled receipt lines", () => {
    expect(extractReceiptAmounts("Total Pembayaran\nRp 1.000")).toContain(1000);
    expect(extractReceiptAmounts("Amount: IDR 125.000,00")).toContain(125000);
  });

  it("ignores transaction dates and unrelated numeric references", () => {
    expect(extractReceiptAmounts("Tanggal transaksi: 12/10/2026\nNomor referensi: 12345")).toEqual([]);
    expect(extractReceiptAmounts("Total pembayaran: Rp 1.000\nTanggal transaksi: 12/10/2026")).toEqual([1000]);
    expect(extractReceiptAmounts("Date 12/10/2026 · Total Rp 1.000")).toContain(1000);
  });
});
