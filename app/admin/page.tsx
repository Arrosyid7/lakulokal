import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { RetryOrderButton } from "@/components/dashboard/retry-order-button";
import { ManualPaymentReview, type ManualPaymentReviewItem } from "@/components/admin/manual-payment-review";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Administrasi LakuLokal",
  robots: { index: false, follow: true }
};

export default async function AdminPage() {
  const { supabase } = await requireAdmin();
  const [
    { data: totals, error: statsError },
    { data: orders, error: ordersError },
    { data: recentUsers, error: recentUsersError },
    { data: proofs, error: proofsError }
  ] = await Promise.all([
    supabase.rpc("admin_dashboard_stats").maybeSingle(),
    supabase.from("orders").select("id,order_code,user_id,youtube_url,package_name,amount,payment_status,processing_status,created_at").order("created_at", { ascending: false }).limit(20),
    supabase.from("profiles").select("id,email,full_name,created_at").order("created_at", { ascending: false }).limit(8),
    supabase.from("payment_proofs")
      .select("id,order_id,storage_path,ocr_amount,ocr_transaction_date,submitted_at")
      .eq("review_status", "SUBMITTED")
      .order("submitted_at", { ascending: true })
      .limit(50)
  ]);
  const rows = orders ?? [];
  const rowOrderIds = rows.map((order) => order.id);
  const { data: autoApprovedProofs, error: autoApprovalError } = rowOrderIds.length
    ? await supabase.from("payment_proofs").select("order_id")
      .eq("review_status", "APPROVED").is("reviewed_by", null).in("order_id", rowOrderIds)
    : { data: [], error: null };
  const autoApprovedOrderIds = new Set((autoApprovedProofs ?? []).map((proof) => proof.order_id));
  const error = statsError || ordersError || recentUsersError || autoApprovalError;
  const stats = totals;
  let paymentReviewError = proofsError !== null;
  let reviewItems: ManualPaymentReviewItem[] = [];
  if (proofs?.length) {
    const orderIds = [...new Set(proofs.map((proof) => proof.order_id))];
    const { data: proofOrders, error: proofOrdersError } = await supabase.from("orders")
      .select("id,order_code,user_id,package_name,amount,currency")
      .in("id", orderIds);
    if (proofOrdersError) {
      paymentReviewError = true;
      console.error("admin_payment_proof_orders_load_failed", { code: proofOrdersError.code });
    } else if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      paymentReviewError = true;
    } else {
      const ordersById = new Map((proofOrders ?? []).map((order) => [order.id, order]));
      const storage = createSupabaseAdminClient().storage.from("payment-proofs");
      const signedProofs = await Promise.all(proofs.map(async (proof) => {
        const order = ordersById.get(proof.order_id);
        if (!order) return null;
        const { data: signed, error: signedError } = await storage.createSignedUrl(proof.storage_path, 120);
        if (signedError || !signed?.signedUrl) {
          console.error("admin_payment_proof_sign_failed", { proofId: proof.id, message: signedError?.message });
          return null;
        }
        return {
          id: proof.id,
          orderCode: order.order_code,
          userId: order.user_id,
          packageName: order.package_name,
          amount: order.amount,
          currency: order.currency,
          ocrAmount: proof.ocr_amount,
          transactionDate: proof.ocr_transaction_date,
          submittedAt: proof.submitted_at,
          imageUrl: signed.signedUrl
        };
      }));
      reviewItems = signedProofs.filter((item): item is ManualPaymentReviewItem => item !== null);
      if (reviewItems.length !== proofs.length) paymentReviewError = true;
    }
  }
  const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
  return (
    <main className="container app-main">
      <div className="admin-page-heading">
        <p className="section-kicker">RINGKASAN</p>
        <h1 className="page-title">Admin LakuLokal</h1>
        <p className="page-lead">Pantau order, pembayaran, dan aktivitas terbaru dari satu tempat.</p>
      </div>
      {error ? <p className="form-error" role="alert">Data admin gagal dimuat.</p> : (
        <>
          <section className="admin-overview" aria-label="Statistik admin">
            <article className="admin-revenue">
              <p>Pendapatan terverifikasi</p>
              <strong>{money.format(Number(stats?.revenue_idr ?? 0))}</strong>
              <span>Dari pembayaran yang sudah dikonfirmasi</span>
            </article>
            <div className="admin-overview-metrics">
              <Metric label="Total order" value={stats?.total_orders ?? 0} />
              <Metric label="Total user" value={stats?.total_users ?? 0} />
              <Metric label="Pembayaran terverifikasi" value={stats?.paid_orders ?? 0} />
              <Metric label="Sedang diproses" value={stats?.processing_orders ?? 0} />
              <Metric label="Selesai" value={stats?.completed_orders ?? 0} />
              <Metric label="Gagal" value={stats?.failed_orders ?? 0} />
              <Metric label="Total clip" value={stats?.total_clips ?? 0} />
            </div>
          </section>
          <section className="panel admin-content-panel">
            <div className="admin-section-heading">
              <div>
                <p className="section-kicker">PEMBAYARAN</p>
                <h2>Bukti QRIS lama menunggu pemeriksaan</h2>
              </div>
              {!paymentReviewError && <span className="admin-count">{reviewItems.length} menunggu</span>}
            </div>
            <p className="admin-section-description">
            Bukti baru disetujui otomatis saat OCR mencocokkan nominal dan tanggal. OCR tidak memverifikasi dana masuk. Tabel ini hanya menampilkan bukti lama yang masih menunggu pemeriksaan.
            </p>
            {paymentReviewError ? (
              <p className="form-error" role="alert">Bukti pembayaran gagal dimuat. Periksa migrasi bukti QRIS, storage privat, dan konfigurasi server.</p>
            ) : (
              <ManualPaymentReview initialItems={reviewItems} />
            )}
          </section>
          <section className="panel admin-content-panel">
            <div className="row">
              <div>
                <p className="section-kicker">AKTIVITAS</p>
                <h2>Order terbaru</h2>
              </div>
              <Link className="text-link" href="/admin/transaksi">Lihat semua transaksi</Link>
            </div>
            {!rows.length ? <p className="empty-state">Belum ada order.</p> : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Order</th><th>User ID</th><th>Paket</th><th>Jumlah</th><th>Pembayaran</th><th>Proses</th><th>Aksi</th></tr></thead>
                  <tbody>{rows.map((order) => (
                    <tr key={order.id}><td>{order.order_code}</td><td>{order.user_id}</td><td>{order.package_name}</td><td>{money.format(order.amount)}</td><td>{autoApprovedOrderIds.has(order.id) ? "Disetujui otomatis (OCR)" : order.payment_status}</td><td>{order.processing_status}</td><td>{order.youtube_url === null && order.processing_status === "FAILED" && order.payment_status === "PAID" ? <RetryOrderButton orderCode={order.order_code} /> : "Tidak perlu"}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </section>
          <section className="panel admin-content-panel">
            <div>
              <p className="section-kicker">AKUN</p>
              <h2>User terbaru</h2>
            </div>
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
  return <article className="admin-overview-metric"><div>{label}</div><strong>{value}</strong></article>;
}
