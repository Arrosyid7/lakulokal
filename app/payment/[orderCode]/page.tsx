import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PaymentStatus } from "@/components/orders/payment-status";
import { PaymentQrCode } from "@/components/orders/payment-qr-code";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Pembayaran Order",
  robots: { index: false, follow: true }
};

export default async function PaymentPage({ params }: { params: Promise<{ orderCode: string }> }) {
  const { supabase } = await requireUser();
  const { orderCode } = await params;
  const { data: order, error } = await supabase
    .from("orders")
    .select("id,order_code,amount,currency,payment_status,processing_status,dana_qr_content")
    .eq("order_code", orderCode)
    .maybeSingle();
  if (error) return <main className="container app-main"><p className="form-error">Informasi pembayaran gagal dimuat.</p></main>;
  if (!order) notFound();
  const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: order.currency, maximumFractionDigits: 0 }).format(order.amount);
  return (
    <main className="container app-main">
      <h1 className="page-title">Pembayaran {order.order_code}</h1>
      <p className="page-lead">Bayar sebesar {money} dengan memindai QRIS dari aplikasi pembayaran pilihan Anda. Status berubah setelah server memverifikasi pembayaran ke DANA.</p>
      <section className="panel stack">
        <p><strong>Total: {money}</strong></p>
        {order.payment_status === "PENDING" && order.dana_qr_content && (
          <PaymentQrCode value={order.dana_qr_content} amount={money} />
        )}
        {!order.dana_qr_content && order.payment_status === "PENDING" && (
          <p className="form-error">Kode QRIS belum tersedia. Jangan transfer di luar halaman pembayaran ini. Hubungi pengelola.</p>
        )}
        <PaymentStatus orderCode={order.order_code} initialStatus={order.payment_status} />
        <Link className="text-link" href={`/dashboard/orders/${encodeURIComponent(order.order_code)}`}>Buka detail order</Link>
      </section>
    </main>
  );
}
