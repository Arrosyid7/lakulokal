import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const pageSize = 50;

type PageProps = {
  searchParams: Promise<{ page?: string; q?: string }>;
};

export default async function AdminAccountsPage({ searchParams }: PageProps) {
  await requireAdmin();
  const admin = createSupabaseAdminClient();
  const search = await searchParams;
  const parsedPage = Number.parseInt(search.page ?? "1", 10);
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const queryText = (search.q ?? "").trim().slice(0, 120);
  let query = admin.from("profiles")
    .select("id,email,full_name,created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (queryText) query = query.ilike("email", `%${queryText}%`);

  const { data: accounts, count, error: accountsError } = await query;
  const userIds = (accounts ?? []).map((account) => account.id);
  const { data: metrics, error: metricsError } = userIds.length
    ? await admin.rpc("admin_account_metrics", { p_user_ids: userIds })
    : { data: [], error: null };
  const failed = Boolean(accountsError || metricsError);
  if (accountsError) console.error("admin_accounts_load_failed", { code: accountsError.code });
  if (metricsError) console.error("admin_account_metrics_load_failed", { code: metricsError.code });

  const metricsByUser = new Map((metrics ?? []).map((metric) => [metric.user_id, metric]));
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / pageSize));
  const money = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  });
  const pageHref = (nextPage: number) => {
    const params = new URLSearchParams();
    params.set("page", String(nextPage));
    if (queryText) params.set("q", queryText);
    return `/admin/akun?${params.toString()}`;
  };

  return (
    <main className="container app-main">
      <h1 className="page-title">Data akun</h1>
      <p className="page-lead">
        Saldo kredit, clip yang tersimpan, dan pembayaran yang sudah diverifikasi. Pembayaran otomatis yang belum diverifikasi admin tidak masuk ke total.
      </p>
      <form className="admin-account-search" action="/admin/akun">
        <div className="field">
          <label htmlFor="account-search">Cari email akun</label>
          <input
            id="account-search"
            name="q"
            type="search"
            maxLength={120}
            defaultValue={queryText}
            placeholder="Masukkan email pengguna"
          />
        </div>
        <button className="button button-accent" type="submit">Cari akun</button>
      </form>
      {failed ? (
        <p className="form-error" role="alert">Data akun gagal dimuat. Periksa izin admin dan migrasi ringkasan akun.</p>
      ) : accounts?.length ? (
        <>
          <div className="table-wrap" tabIndex={0} aria-label="Tabel akun, geser secara horizontal untuk melihat semua kolom">
            <table className="data-table admin-account-table">
              <thead>
                <tr>
                  <th>Akun</th>
                  <th>Kredit tersedia</th>
                  <th>Clip selesai</th>
                  <th>Pembayaran terverifikasi</th>
                  <th>Total pembayaran</th>
                  <th>Terdaftar</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => {
                  const metric = metricsByUser.get(account.id);
                  return (
                    <tr key={account.id}>
                      <td>
                        <strong>{account.full_name}</strong>
                        <span className="admin-account-email">{account.email}</span>
                      </td>
                      <td>{metric?.credit_balance ?? 0} kredit</td>
                      <td>{metric?.completed_clips ?? 0} clip</td>
                      <td>{metric?.total_transactions ?? 0} transaksi</td>
                      <td>{money.format(metric?.total_paid_idr ?? 0)}</td>
                      <td><time dateTime={account.created_at}>{new Date(account.created_at).toLocaleDateString("id-ID")}</time></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <nav className="admin-pagination" aria-label="Halaman data akun">
            {page > 1 ? <Link className="button button-secondary" href={pageHref(page - 1)}>Sebelumnya</Link> : <span />}
            <span>Halaman {page} dari {totalPages}</span>
            {page < totalPages ? <Link className="button button-secondary" href={pageHref(page + 1)}>Berikutnya</Link> : <span />}
          </nav>
        </>
      ) : (
        <p className="empty-state">
          {queryText ? "Tidak ada akun dengan email tersebut." : "Belum ada akun pengguna. Akun akan muncul setelah pengguna mendaftar."}
        </p>
      )}
      <p className="admin-account-footnote">Daftar akun memuat hingga {pageSize} pengguna per halaman.</p>
    </main>
  );
}
