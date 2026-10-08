import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const pageSize = 50;
const paymentStatuses = ["PENDING", "PAID", "FAILED", "EXPIRED", "CANCELLED"] as const;

type PageProps = {
  searchParams: Promise<{ page?: string; q?: string; payment?: string }>;
};

export default async function AdminTransactionsPage({ searchParams }: PageProps) {
  const { supabase } = await requireAdmin();
  const search = await searchParams;
  const parsedPage = Number.parseInt(search.page ?? "1", 10);
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const queryText = (search.q ?? "").trim().slice(0, 80);
  const paymentFilter = paymentStatuses.find((status) => status === search.payment);
  let query = supabase.from("orders")
    .select("id,order_code,user_id,package_name,amount,currency,payment_status,processing_status,created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (queryText) query = query.ilike("order_code", `%${queryText}%`);
  if (paymentFilter) query = query.eq("payment_status", paymentFilter);

  const { data: orders, count, error } = await query;
  const userIds = [...new Set((orders ?? []).map((order) => order.user_id))];
  const orderIds = (orders ?? []).map((order) => order.id);
  const [{ data: profiles, error: profilesError }, { data: payments, error: paymentsError }, { data: autoApprovedProofs, error: proofError }] = await Promise.all([
    userIds.length
      ? supabase.from("profiles").select("id,email").in("id", userIds)
      : Promise.resolve({ data: [], error: null }),
    orderIds.length
      ? supabase.from("payments").select("order_id,provider,provider_reference,status,paid_at").in("order_id", orderIds)
      : Promise.resolve({ data: [], error: null }),
    orderIds.length
      ? supabase.from("payment_proofs").select("order_id").eq("review_status", "APPROVED").is("reviewed_by", null).in("order_id", orderIds)
      : Promise.resolve({ data: [], error: null })
  ]);

  const failed = Boolean(error || profilesError || paymentsError || proofError);
  const emails = new Map((profiles ?? []).map((profile) => [profile.id, profile.email]));
  const paymentsByOrder = new Map((payments ?? []).map((payment) => [payment.order_id, payment]));
  const autoApprovedOrderIds = new Set((autoApprovedProofs ?? []).map((proof) => proof.order_id));
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / pageSize));
  const money = (amount: number, currency: string) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  const pageHref = (nextPage: number) => {
    const params = new URLSearchParams();
    params.set("page", String(nextPage));
    if (queryText) params.set("q", queryText);
    if (paymentFilter) params.set("payment", paymentFilter);
    return `/admin/transaksi?${params.toString()}`;
  };

  return (
    <main className="container app-main">
      <h1 className="page-title">Transaksi dan order</h1>
      <p className="page-lead">Cari order berdasarkan kode dan saring menurut status pembayaran. Tabel memuat hingga {pageSize} baris per halaman.</p>
      <form className="admin-transaction-filters" action="/admin/transaksi">
        <div className="field">
          <label htmlFor="transaction-search">Kode order</label>
          <input id="transaction-search" name="q" maxLength={80} defaultValue={queryText} placeholder="Contoh: LL-..." />
        </div>
        <div className="field">
          <label htmlFor="transaction-payment">Status pembayaran</label>
          <select id="transaction-payment" name="payment" defaultValue={paymentFilter ?? ""}>
            <option value="">Semua status</option>
            {paymentStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </div>
        <button className="button button-accent" type="submit">Tampilkan transaksi</button>
      </form>
      {failed ? (
        <p className="form-error" role="alert">Daftar transaksi gagal dimuat. Muat ulang halaman atau periksa izin database admin.</p>
      ) : orders?.length ? (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order</th><th>Akun</th><th>Paket</th><th>Nominal</th><th>Pembayaran</th><th>Referensi</th><th>Pemrosesan</th><th>Dibuat</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const payment = paymentsByOrder.get(order.id);
                  return (
                    <tr key={order.id}>
                      <td>{order.order_code}</td>
                      <td>{emails.get(order.user_id) ?? "Email tidak tersedia"}</td>
                      <td>{order.package_name}</td>
                      <td>{money(order.amount, order.currency)}</td>
                      <td>{autoApprovedOrderIds.has(order.id) ? "Disetujui otomatis (OCR)" : order.payment_status}</td>
                      <td>{payment ? `${payment.provider}: ${payment.provider_reference}` : "Belum tercatat"}</td>
                      <td>{order.processing_status}</td>
                      <td><time dateTime={order.created_at}>{new Date(order.created_at).toLocaleString("id-ID")}</time></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <nav className="admin-pagination" aria-label="Halaman transaksi">
            {page > 1 ? <Link className="button button-secondary" href={pageHref(page - 1)}>Lebih baru</Link> : <span />}
            <span>Halaman {page} dari {totalPages}</span>
            {page < totalPages ? <Link className="button button-secondary" href={pageHref(page + 1)}>Lebih lama</Link> : <span />}
          </nav>
        </>
      ) : (
        <p className="empty-state">Tidak ada order yang cocok. Hapus kata pencarian atau pilih status pembayaran lain.</p>
      )}
    </main>
  );
}
