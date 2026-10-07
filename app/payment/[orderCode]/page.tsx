import Link from "next/link";
import { notFound } from "next/navigation";
import { PaymentStatus } from "@/components/orders/payment-status";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PaymentPage({ params }: { params: Promise<{ orderCode: string }> }) {
  const { supabase } = await requireUser();
  const { orderCode } = await params;
  const { data: order, error } = await supabase
    .from("orders")
    .select("id,order_code,amount,currency,payment_status,processing_status,dana_checkout_url")
    .eq("order_code", orderCode)
    .maybeSingle();
  if (error) return <main className="container app-main"><p className="form-error">Informasi pembayaran gagal dimuat.</p></main>;
  if (!order) notFound();
  const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: order.currency, maximumFractionDigits: 0 }).format(order.amount);
  return (
    <main className="container app-main">
      <h1 className="page-title">Pembayaran {order.order_code}</h1>
      <p className="page-lead">Bayar sebesar {money}. Status pembayaran hanya berubah setelah server memverifikasi notifikasi dan status dari DANA.</p>
      <section className="panel stack">
        <p><strong>Total: {money}</strong></p>
        {order.payment_status === "PENDING" && order.dana_checkout_url && (
          <a
            className="button button-accent"
            href={order.dana_checkout_url}
            rel="noreferrer"
          >
            Lanjutkan pembayaran di DANA
          </a>
        )}
        {!order.dana_checkout_url && order.payment_status === "PENDING" && (
          <p className="form-error">Link checkout belum tersedia. Jangan transfer di luar halaman pembayaran ini. Hubungi pengelola.</p>
        )}
        <PaymentStatus orderCode={order.order_code} initialStatus={order.payment_status} />
        <Link className="text-link" href={`/dashboard/orders/${encodeURIComponent(order.order_code)}`}>Buka detail order</Link>
      </section>
    </main>
  );
}
