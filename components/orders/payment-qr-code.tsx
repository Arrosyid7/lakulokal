import Image from "next/image";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function PaymentQrCode({ amount, value = null }: { amount: string; value?: string | null }) {
  const [image, setImage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!value) return;
    let active = true;
    QRCode.toDataURL(value, { errorCorrectionLevel: "M", margin: 2, width: 320 })
      .then((dataUrl) => { if (active) setImage(dataUrl); })
      .catch(() => { if (active) setError("QR pembayaran lama gagal ditampilkan. Muat ulang halaman."); });
    return () => { active = false; };
  }, [value]);

  return (
    <div className="payment-qr">
      {value ? image ? (
        <Image className="qr-image" src={image} alt={`QR pembayaran sebesar ${amount}`} width={320} height={320} unoptimized />
      ) : error ? (
        <p className="form-error" role="alert">{error}</p>
      ) : (
        <p role="status">Menyiapkan QR pembayaran...</p>
      ) : (
        <Image
          className="qr-image"
          src="/payment/qris-lakulokal.png"
          alt="QRIS LakuLokal untuk menerima pembayaran"
          width={410}
          height={410}
          priority
        />
      )}
      <p>Pindai QRIS, masukkan nominal tepat {amount}, lalu selesaikan pembayaran.</p>
    </div>
  );
}
