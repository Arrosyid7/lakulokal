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
          <h1 className="page-title">Halo, {profile?.full_name || user.email || "Pengguna"}</h1>
          <p className="page-lead">Ringkasan order dan hasil clip untuk akun Anda.</p>
        </div>
        <Link className="button button-accent" href="/dashboard/new">Buat order</Link>
      </div>
      {failures.length > 0 ? (
        <section className="panel form-error" role="alert">Ringkasan dashboard gagal dimuat. Muat ulang halaman atau coba lagi nanti.</section>
      ) : (
        <>
          <section className="stats-grid" aria-label="Statistik akun">
            <article className="stat"><div className="stat-label">Total order</div><div className="stat-value">{totalCount ?? 0}</div></article>
            <article className="stat"><div className="stat-label">Order selesai</div><div className="stat-value">{completedCount ?? 0}</div></article>
            <article className="stat"><div className="stat-label">Sedang diproses</div><div className="stat-value">{processingCount ?? 0}</div></article>
            <article className="stat"><div className="stat-label">Clip tersedia</div><div className="stat-value">{clipCount ?? 0}</div></article>
          </section>
          <section className="panel" style={{ marginTop: 18 }}>
            <div className="row">
              <div>
                <h2 style={{ margin: 0 }}>Pembayaran terverifikasi</h2>
                <p className="muted" style={{ marginBottom: 0 }}>Total dari order dengan status PAID.</p>
              </div>
              <strong>{money(paidTotal)}</strong>
            </div>
          </section>
          <section className="panel" style={{ marginTop: 18 }}>
            <div className="row">
              <h2 style={{ margin: 0 }}>Order terbaru</h2>
              <Link className="text-link" href="/dashboard/orders">Lihat riwayat</Link>
            </div>
            {!orders?.length ? (
              <p className="empty-state">Belum ada order. Buat order untuk mulai menyimpan riwayat dan hasil clip.</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Order</th><th>Paket</th><th>Total</th><th>Pembayaran</th><th>Proses</th></tr></thead>
                  <tbody>{orders.map((order) => (
                    <tr key={order.id}>
                      <td><Link className="text-link" href={`/dashboard/orders/${encodeURIComponent(order.order_code)}`}>{order.order_code}</Link></td>
                      <td>{order.package_name}</td>
                      <td>{money(Number(order.amount))}</td>
                      <td><span className="status">{order.payment_status}</span></td>
                      <td><span className="status">{order.processing_status}</span></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
