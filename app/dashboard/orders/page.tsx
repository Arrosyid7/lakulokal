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
      <h1 className="page-title">Riwayat order</h1>
      <p className="page-lead">Halaman ini hanya menampilkan order milik akun Anda.</p>
      <nav className="app-nav-links" aria-label="Filter riwayat order">
        {Object.entries(filters).map(([key, filter]) => (
          <Link key={key} className={active === key ? "text-link" : "muted"} href={key === "all" ? "/dashboard/orders" : `/dashboard/orders?status=${key}`} aria-current={active === key ? "page" : undefined}>
            {filter.label}
          </Link>
        ))}
      </nav>
      <section className="panel" style={{ marginTop: 18 }}>
        {error ? <p className="form-error" role="alert">Riwayat order gagal dimuat. Coba muat ulang.</p> : !orders?.length ? (
          <p className="empty-state">Tidak ada order untuk filter ini. Pilih filter lain atau buat order baru.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Order</th><th>Paket</th><th>Clip</th><th>Harga</th><th>Pembayaran</th><th>Proses</th><th>Tanggal</th></tr></thead>
              <tbody>{orders.map((order) => (
                <tr key={order.id}>
                  <td><Link className="text-link" href={`/dashboard/orders/${encodeURIComponent(order.order_code)}`}>{order.order_code}</Link></td>
                  <td>{order.package_name}</td>
                  <td>{order.clip_count}</td>
                  <td>{money(Number(order.amount), order.currency)}</td>
                  <td>{order.payment_status}</td>
                  <td>{order.processing_status}</td>
                  <td><time dateTime={order.created_at}>{new Date(order.created_at).toLocaleString("id-ID")}</time></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
