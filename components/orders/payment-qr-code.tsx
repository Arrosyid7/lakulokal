import Image from "next/image";

export function PaymentQrCode({ amount }: { amount: string }) {
  return (
    <div className="payment-qr">
      <Image
        className="qr-image"
        src="/payment/qris-lakulokal.png"
        alt="QRIS LakuLokal untuk menerima pembayaran"
        width={410}
        height={410}
        priority
      />
      <p>Pindai QRIS, masukkan nominal tepat {amount}, lalu selesaikan pembayaran.</p>
    </div>
  );
}
