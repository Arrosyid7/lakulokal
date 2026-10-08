import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BrowserCheckout } from "@/components/orders/browser-checkout";
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
    .select("id,order_code,amount,currency,clip_count,payment_status,processing_status,dana_qr_content,youtube_url")
    .eq("order_code", orderCode)
    .maybeSingle();
  if (error) return <main className="container app-main"><p className="form-error">Informasi pembayaran gagal dimuat.</p></main>;
  if (!order) notFound();
  return (
    <main className="container app-main">
      <h1 className="page-title">Pembayaran order</h1>
      <p className="page-lead">
        {order.youtube_url === null
          ? "Bayar dengan QRIS, lalu pilih ulang file video jika halaman order sebelumnya sudah ditutup."
          : "Periksa informasi bantuan untuk order yang dibuat dengan alur lama."}
      </p>
      {order.youtube_url === null ? (
        <BrowserCheckout
          orderCode={order.order_code}
          clipCount={order.clip_count}
          amount={order.amount}
          currency={order.currency}
          qrContent={order.dana_qr_content}
          initialPaymentStatus={order.payment_status}
          initialProcessingStatus={order.processing_status}
        />
      ) : (
        <section className="panel stack">
          <p className="form-error" role="alert">
            {order.payment_status === "PENDING"
              ? "Order ini menggunakan alur video lama dan tidak dapat diproses di browser. Jangan lakukan pembayaran untuk order ini. Hubungi "
              : "Order ini menggunakan alur video lama dan tidak dapat diproses di browser. Buka detail order untuk melihat hasil lama jika tersedia, atau hubungi "}
            <a className="text-link" href="mailto:halo@lakulokal.id">halo@lakulokal.id</a> untuk bantuan.
          </p>
        </section>
      )}
      <p style={{ marginTop: 18 }}>
        <Link className="text-link" href={`/dashboard/orders/${encodeURIComponent(order.order_code)}`}>Buka detail order</Link>
      </p>
    </main>
  );
}
