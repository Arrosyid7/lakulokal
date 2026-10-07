"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function PaymentQrCode({ value, amount }: { value: string; amount: string }) {
  const [image, setImage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setImage("");
    setError("");
    QRCode.toDataURL(value, { errorCorrectionLevel: "M", margin: 2, width: 320 })
      .then((dataUrl) => {
        if (active) setImage(dataUrl);
      })
      .catch(() => {
        if (active) setError("QRIS gagal ditampilkan. Muat ulang halaman pembayaran.");
      });
    return () => { active = false; };
  }, [value]);

  return (
    <div className="payment-qr">
      {image ? (
        <Image
          className="qr-image"
          src={image}
          alt={`QRIS pembayaran sebesar ${amount}`}
          width={320}
          height={320}
          unoptimized
        />
      ) : error ? (
        <p className="form-error" role="alert">{error}</p>
      ) : (
        <p role="status">Menyiapkan QRIS...</p>
      )}
      <p>Pindai QRIS ini dari aplikasi bank atau dompet digital yang mendukung QRIS.</p>
    </div>
  );
}
