import Link from "next/link";
import { requireUser } from "@/lib/auth";

export default async function DashboardPage() {
  const { supabase, user } = await requireUser();
  const [
    { data: profile, error: profileError },
    { count: totalCount, error: totalError },
    { data: orders, error: orderError },
    { count: completedCount, error: completedError },
    { count: processingCount, error: processingError },
    { count: clipCount, error: clipError },
    { data: paidOrders, error: paidError }
  ] = await Promise.all([
    supabase.from("profiles").select("full_name,email").eq("id", user.id).maybeSingle(),
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id,order_code,package_name,amount,currency,payment_status,processing_status,created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("processing_status", "COMPLETED"),
    supabase.from("orders").select("id", { count: "exact", head: true }).in("processing_status", ["QUEUED", "DOWNLOADING", "PROCESSING", "UPLOADING"]),
    supabase.from("clips").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("amount").eq("payment_status", "PAID")
  ]);
  const failures = [profileError, totalError, orderError, completedError, processingError, clipError, paidError].filter(Boolean);
  const paidTotal = paidOrders?.reduce((total, row) => total + Number(row.amount), 0) ?? 0;
  const money = (amount: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);

  return (
    <main className="container app-main">
      <div className="row">
        <div>
          <p className="section-kicker">Ruang kerja Anda</p>
          <h1 className="page-title">Halo, {profile?.full_name || user.email || "Pengguna"}.</h1>
          <p className="page-lead">Lihat status order terakhir atau mulai menyiapkan video berikutnya.</p>
        </div>
        <Link className="button button-accent" href="/dashboard/new">Buat clip</Link>
      </div>
      {failures.length > 0 ? (
        <section className="panel form-error" role="alert">Ringkasan dashboard gagal dimuat. Muat ulang halaman atau coba lagi nanti.</section>
      ) : (
        <>
          <section className="account-metrics" aria-label="Ringkasan jumlah order">
            <article className="account-metric"><span>Total order</span><strong>{totalCount ?? 0}</strong></article>
            <article className="account-metric"><span>Order selesai</span><strong>{completedCount ?? 0}</strong></article>
            <article className="account-metric"><span>Sedang diproses</span><strong>{processingCount ?? 0}</strong></article>
            <article className="account-metric"><span>Clip tersedia</span><strong>{clipCount ?? 0}</strong></article>
          </section>
          <section className="dashboard-summary">
            <div className="row">
              <div>
                <h2 style={{ margin: 0 }}>Pembayaran terverifikasi</h2>
                <p className="muted" style={{ marginBottom: 0 }}>Total dari order dengan status PAID.</p>
              </div>
              <strong>{money(paidTotal)}</strong>
            </div>
          </section>
          <section className="panel recent-orders">
            <div className="row">
              <h2 style={{ margin: 0 }}>Order terbaru</h2>
              <Link className="text-link" href="/dashboard/orders">Lihat riwayat</Link>
            </div>
            {!orders?.length ? (
              <div className="empty-state-block">
                <p>Belum ada order. Setelah membuat order, status pembayaran dan hasil clip akan tampil di sini.</p>
                <Link className="button" href="/dashboard/new">Buat order pertama</Link>
              </div>
            ) : (
              <div className="recent-order-list">
                {orders.map((order) => (
                  <article className="recent-order" key={order.id}>
                    <div>
                      <Link className="text-link" href={`/dashboard/orders/${encodeURIComponent(order.order_code)}`}>{order.order_code}</Link>
                      <p>{order.package_name} · {money(Number(order.amount))}</p>
                    </div>
                    <div className="status-pair">
                      <span className="status">{order.payment_status}</span>
                      <span className="status">{order.processing_status}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
