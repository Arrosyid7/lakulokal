import Image from "next/image";
import { getCreditPackageByPrice } from "@/lib/credits";

export function PaymentQrCode({ amount }: { amount: number }) {
  const product = getCreditPackageByPrice(amount);
  if (!product) {
    return (
      <p className="form-error" role="alert">
        QRIS untuk nominal order ini tidak tersedia. Jangan lakukan pembayaran. Hubungi{" "}
        <a href="mailto:halo@lakulokal.id">halo@lakulokal.id</a> untuk bantuan.
      </p>
    );
  }

  return (
    <div className="payment-qr">
      <Image
        className="qr-image"
        src={product.qrImage}
        alt={`QRIS Toko Zanzum untuk pembayaran ${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount)}`}
        width={768}
        height={1024}
        priority
      />
      <p>Pindai QRIS ini dan bayar tepat {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount)}. Setelah transaksi berhasil, unggah bukti pembayaran.</p>
    </div>
  );
}
