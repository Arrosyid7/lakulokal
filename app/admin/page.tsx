import { requireAdmin } from "@/lib/auth";
import { RetryOrderButton } from "@/components/dashboard/retry-order-button";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { supabase } = await requireAdmin();
  const [
    { data: totals, error: statsError },
    { data: orders, error: ordersError },
    { data: recentUsers, error: recentUsersError }
  ] = await Promise.all([
    supabase.rpc("admin_dashboard_stats").maybeSingle(),
    supabase.from("orders").select("id,order_code,user_id,package_name,amount,payment_status,processing_status,created_at").order("created_at", { ascending: false }).limit(20),
    supabase.from("profiles").select("id,email,full_name,created_at").order("created_at", { ascending: false }).limit(8)
  ]);
  const error = statsError || ordersError || recentUsersError;
  const rows = orders ?? [];
  const stats = totals;
  const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
  return (
    <main className="container app-main">
      <h1 className="page-title">Admin LakuLokal</h1>
      <p className="page-lead">Ringkasan ini hanya tersedia untuk akun dengan role ADMIN yang tersimpan di profiles.</p>
      {error ? <p className="form-error" role="alert">Data admin gagal dimuat.</p> : (
        <>
          <section className="stats-grid" aria-label="Statistik admin">
            <Metric label="Total user" value={stats?.total_users ?? 0} />
            <Metric label="Total order" value={stats?.total_orders ?? 0} />
            <Metric label="Pembayaran PAID" value={stats?.paid_orders ?? 0} />
            <Metric label="Sedang diproses" value={stats?.processing_orders ?? 0} />
            <Metric label="Selesai" value={stats?.completed_orders ?? 0} />
            <Metric label="Gagal" value={stats?.failed_orders ?? 0} />
            <Metric label="Total clip" value={stats?.total_clips ?? 0} />
            <Metric label="Pendapatan terverifikasi" value={money.format(Number(stats?.revenue_idr ?? 0))} />
          </section>
          <section className="panel" style={{ marginTop: 18 }}>
            <h2>Order terbaru</h2>
            {!rows.length ? <p className="empty-state">Belum ada order.</p> : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Order</th><th>User ID</th><th>Paket</th><th>Jumlah</th><th>Pembayaran</th><th>Proses</th><th>Aksi</th></tr></thead>
                  <tbody>{rows.map((order) => (
                    <tr key={order.id}><td>{order.order_code}</td><td>{order.user_id}</td><td>{order.package_name}</td><td>{money.format(order.amount)}</td><td>{order.payment_status}</td><td>{order.processing_status}</td><td>{order.processing_status === "FAILED" && order.payment_status === "PAID" ? <RetryOrderButton orderCode={order.order_code} /> : "Tidak perlu"}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </section>
          <section className="panel" style={{ marginTop: 18 }}>
            <h2>User terbaru</h2>
            {!recentUsers?.length ? <p className="empty-state">Belum ada user.</p> : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Nama</th><th>Email</th><th>Terdaftar</th></tr></thead>
                  <tbody>{recentUsers.map((profile) => (
                    <tr key={profile.id}><td>{profile.full_name}</td><td>{profile.email}</td><td><time dateTime={profile.created_at}>{new Date(profile.created_at).toLocaleString("id-ID")}</time></td></tr>
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

function Metric({ label, value }: { label: string; value: string | number }) {
  return <article className="stat"><div className="stat-label">{label}</div><div className="stat-value">{value}</div></article>;
}
