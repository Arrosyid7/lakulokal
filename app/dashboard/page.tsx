import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getPaymentStatusLabel, getProcessingStatusLabel, getStatusClassName } from "@/lib/order-presentation";
import { isCreditClipRun } from "@/lib/credits";

export default async function DashboardPage() {
  const { supabase, user } = await requireUser();
  const [
    { data: profile, error: profileError },
    { count: totalCount, error: totalError },
    { data: orders, error: orderError },
    { count: completedCount, error: completedError },
    { count: processingCount, error: processingError },
    { count: clipCount, error: clipError },
    { data: paidOrders, error: paidError },
    { data: creditBalance, error: creditError }
  ] = await Promise.all([
    supabase.from("profiles").select("full_name,email").eq("id", user.id).maybeSingle(),
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id,order_code,package_name,clip_count,amount,currency,payment_status,processing_status,created_at,metadata").order("created_at", { ascending: false }).limit(5),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("processing_status", "COMPLETED"),
    supabase.from("orders").select("id", { count: "exact", head: true }).in("processing_status", ["QUEUED", "DOWNLOADING", "PROCESSING", "UPLOADING"]),
    supabase.from("clips").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id,amount").eq("payment_status", "PAID"),
    supabase.from("user_credit_balances").select("balance").eq("user_id", user.id).maybeSingle()
  ]);
  const paidOrderIds = paidOrders?.map((order) => order.id) ?? [];
  const { data: autoApprovedProofs, error: autoProofError } = paidOrderIds.length
    ? await supabase.from("payment_proofs").select("order_id")
      .eq("review_status", "APPROVED").is("reviewed_by", null).in("order_id", paidOrderIds)
    : { data: [], error: null };
  const autoApprovedOrderIds = new Set((autoApprovedProofs ?? []).map((proof) => proof.order_id));
  const failures = [profileError, totalError, orderError, completedError, processingError, clipError, paidError, creditError, autoProofError].filter(Boolean);
  const paidTotal = paidOrders?.filter((order) => !autoApprovedOrderIds.has(order.id))
    .reduce((total, row) => total + Number(row.amount), 0) ?? 0;
  const availableCredits = creditBalance?.balance ?? 0;
  const money = (amount: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);

  return (
    <main id="account-content" className="container app-main">
      <header className="account-welcome">
        <div className="account-welcome-copy">
          <p className="section-kicker">Ruang kerja Anda</p>
          <h1 className="page-title">Halo, {profile?.full_name || user.email || "Pengguna"}.</h1>
          <p className="page-lead">Lihat status order terakhir atau mulai menyiapkan video berikutnya.</p>
        </div>
        <div className="cta-row">
          {creditError ? (
            <Link className="button button-accent" href="/dashboard/clip">Periksa saldo kredit</Link>
          ) : availableCredits > 0 ? (
            <>
              <Link className="button button-accent" href="/dashboard/clip">Buat clip</Link>
              <Link className="text-link" href="/dashboard/new">Beli kredit</Link>
            </>
          ) : (
            <>
              <Link className="button button-accent" href="/dashboard/new">Beli 5 kredit</Link>
              <Link className="text-link" href="/dashboard/orders">Lihat order</Link>
            </>
          )}
        </div>
        <span className="account-cut-mark" aria-hidden="true" />
      </header>
      {failures.length > 0 ? (
        <section className="panel form-error" role="alert">Ringkasan dashboard gagal dimuat. Muat ulang halaman atau coba lagi nanti.</section>
      ) : (
        <>
          <section className="account-metrics" aria-label="Ringkasan akun">
            <article className="account-metric"><span>Kredit tersedia</span><strong>{availableCredits}</strong><small>Siap dipakai untuk clip</small></article>
            <article className="account-metric"><span>Total order</span><strong>{totalCount ?? 0}</strong><small>Semua order akun</small></article>
            <article className="account-metric"><span>Order selesai</span><strong>{completedCount ?? 0}</strong><small>Berhasil diproses</small></article>
            <article className="account-metric"><span>Sedang diproses</span><strong>{processingCount ?? 0}</strong><small>Masih berjalan</small></article>
            <article className="account-metric"><span>Hasil lama tersimpan</span><strong>{clipCount ?? 0}</strong><small>File dari order sebelumnya</small></article>
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
            <div className="row recent-orders-heading">
              <div>
                <p className="section-kicker">Aktivitas</p>
                <h2 style={{ margin: 0 }}>Order terbaru</h2>
              </div>
              <Link className="text-link" href="/dashboard/orders">Lihat riwayat</Link>
            </div>
            {!orders?.length ? (
              <div className="empty-state-block">
                <p>Belum ada order. Riwayat pembayaran tampil di sini, sedangkan hasil clip diunduh langsung ke perangkat.</p>
                <Link className="button" href="/dashboard/new">Beli 5 kredit</Link>
              </div>
            ) : (
              <div className="recent-order-list">
                {orders.map((order) => (
                  <article className="recent-order" key={order.id}>
                    <div>
                      <Link className="text-link" href={`/dashboard/orders/${encodeURIComponent(order.order_code)}`}>{order.order_code}</Link>
                      <p>{isCreditClipRun(order.metadata)
                        ? `${order.clip_count} clip · ${order.clip_count} kredit digunakan`
                        : `${order.package_name} · ${money(Number(order.amount))}`}</p>
                    </div>
                    <div className="status-pair">
                      {!isCreditClipRun(order.metadata) && <span className={getStatusClassName("payment", order.payment_status)}>{getPaymentStatusLabel(order.payment_status, autoApprovedOrderIds.has(order.id))}</span>}
                      <span className={getStatusClassName("processing", order.processing_status)}>{getProcessingStatusLabel(order.processing_status)}</span>
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
