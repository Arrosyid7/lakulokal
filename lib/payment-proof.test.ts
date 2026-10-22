import { describe, expect, it } from "vitest";
import { extractReceiptAmounts } from "@/lib/payment-proof";

describe("payment proof OCR parsing", () => {
  it("extracts Indonesian rupiah amounts from labeled receipt lines", () => {
    expect(extractReceiptAmounts("Total Pembayaran\nRp 1.000")).toContain(1000);
    expect(extractReceiptAmounts("Amount: IDR 125.000,00")).toContain(125000);
  });

  it("extracts amounts when the label, currency, and value are split across lines", () => {
    expect(extractReceiptAmounts("Nominal\nRp\n12.000")).toContain(12000);
    expect(extractReceiptAmounts("Total transaksi\n15.000")).toContain(15000);
  });

  it("extracts amounts when rupiah is directly joined to the digits", () => {
    expect(extractReceiptAmounts("Rp1.000\nID Transaksi\n261021-NV66-YCUTDJ")).toEqual([1000]);
  });

  it("reads the decimal rupiah totals shown on a BYOND BSI QRIS receipt", () => {
    const receiptText = [
      "Transaksi pembayaran",
      "QRIS kamu berhasil",
      "Nominal Transaksi Rp 1.000,00",
      "Nama Merchant Toko Zanzum",
      "MPAN 9360091530201643868",
      "Nominal Transaksi Rp1000,00",
      "Total Rp1000,00",
      "RRN 0000000927A8"
    ].join("\n");

    expect(extractReceiptAmounts(receiptText)).toContain(1000);
  });

  it("ignores transaction dates and unrelated numeric references", () => {
    expect(extractReceiptAmounts("Tanggal transaksi: 12/10/2026\nNomor referensi: 12345")).toEqual([]);
    expect(extractReceiptAmounts("Total pembayaran: Rp 1.000\nTanggal transaksi: 12/10/2026")).toEqual([1000]);
    expect(extractReceiptAmounts("Date 12/10/2026 · Total Rp 1.000")).toContain(1000);
    expect(extractReceiptAmounts("Total\nNomor referensi\n12345")).toEqual([]);
  });
});
