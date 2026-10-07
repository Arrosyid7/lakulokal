import Link from "next/link";
import { requireUser } from "@/lib/auth";
import type { PaymentStatus, ProcessingStatus } from "@/lib/supabase/database.types";

const filters: Record<string, {
  label: string;
  paymentStatuses?: PaymentStatus[];
  processingStatuses?: ProcessingStatus[];
}> = {
  all: { label: "Semua" },
  pending: { label: "Menunggu pembayaran", paymentStatuses: ["PENDING"] },
  processing: { label: "Diproses", processingStatuses: ["QUEUED", "DOWNLOADING", "PROCESSING", "UPLOADING"] },
  completed: { label: "Selesai", processingStatuses: ["COMPLETED"] },
  failed: { label: "Gagal" }
};

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { supabase } = await requireUser();
  const query = await searchParams;
  const active = filters[query.status || "all"] ? query.status || "all" : "all";
  let request = supabase
    .from("orders")
    .select("id,order_code,package_name,clip_count,amount,currency,payment_status,processing_status,created_at")
    .order("created_at", { ascending: false });
  const selected = filters[active];
  if (selected.paymentStatuses?.length) {
    request = request.eq("payment_status", selected.paymentStatuses[0]);
  } else if (active === "failed") {
    request = request.or("processing_status.eq.FAILED,payment_status.eq.FAILED,payment_status.eq.EXPIRED,payment_status.eq.CANCELLED");
  } else if (selected.processingStatuses?.length) {
    request = request.in("processing_status", selected.processingStatuses);
  }
  const { data: orders, error } = await request;
  const money = (amount: number, currency: string) => new Intl.NumberFormat("id-ID", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  return (
    <main className="container app-main">
      <div className="row">
        <div>
          <h1 className="page-title">Riwayat order</h1>
          <p className="page-lead">Order dan status pembayaran untuk akun Anda.</p>
        </div>
        <Link className="button button-accent" href="/dashboard/new">Buat clip</Link>
      </div>
      <nav className="filter-nav" aria-label="Filter riwayat order">
        {Object.entries(filters).map(([key, filter]) => (
          <Link key={key} href={key === "all" ? "/dashboard/orders" : `/dashboard/orders?status=${key}`} aria-current={active === key ? "page" : undefined}>
            {filter.label}
          </Link>
        ))}
      </nav>
      <section className="panel" aria-label="Order pada filter terpilih">
        {error ? <p className="form-error" role="alert">Riwayat order gagal dimuat. Coba muat ulang.</p> : !orders?.length ? (
          <div className="empty-state-block">
            <h2>{active === "all" ? "Belum ada order" : "Tidak ada order pada filter ini"}</h2>
            <p>{active === "all" ? "Order clip yang Anda buat akan muncul di sini." : "Pilih filter lain untuk melihat order dengan status berbeda."}</p>
            {active === "all" && <Link className="button" href="/dashboard/new">Buat order pertama</Link>}
          </div>
        ) : (
          <div className="order-list">
            {orders.map((order) => (
              <article className="order-row" key={order.id}>
                <div className="order-field">
                  <span className="order-field-label">Order</span>
                  <Link className="text-link order-field-value" href={`/dashboard/orders/${encodeURIComponent(order.order_code)}`}>{order.order_code}</Link>
                </div>
                <div className="order-field"><span className="order-field-label">Paket</span><span className="order-field-value">{order.package_name} · {order.clip_count} clip</span></div>
                <div className="order-field"><span className="order-field-label">Total</span><span className="order-field-value">{money(Number(order.amount), order.currency)}</span></div>
                <div className="order-field"><span className="order-field-label">Pembayaran</span><span className="status">{order.payment_status}</span></div>
                <div className="order-field"><span className="order-field-label">Proses</span><span className="status">{order.processing_status}</span></div>
                <div className="order-field"><span className="order-field-label">Dibuat</span><time className="order-field-value" dateTime={order.created_at}>{new Date(order.created_at).toLocaleString("id-ID")}</time></div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
