import Link from "next/link";
import { ClipCreationForm } from "@/components/orders/clip-creation-form";
import { requireUser } from "@/lib/auth";

export default async function CreateClipPage() {
  const { supabase, user } = await requireUser();
  const { data: credits, error } = await supabase
    .from("user_credit_balances")
    .select("balance")
    .eq("user_id", user.id)
    .maybeSingle();
  const availableCredits = credits?.balance ?? 0;

  return (
    <main id="account-content" className="container app-main">
      <header className="dashboard-page-heading">
        <p className="section-kicker">Ruang potong</p>
        <h1 className="page-title">Tentukan bagian video.</h1>
        <p className="page-lead">
          Saldo: {error ? "belum dapat dimuat" : `${availableCredits} kredit`}.
          {" "}Satu clip memakai satu kredit.
        </p>
      </header>
      {error ? (
        <p className="form-error" role="alert">Saldo kredit gagal dimuat. Muat ulang halaman untuk mencoba lagi.</p>
      ) : (
        <div className="new-order-layout">
          <ClipCreationForm availableCredits={availableCredits} />
          <aside className="profile-note">
            <h2>Pilih cara memotong</h2>
            <ul>
              <li>Untuk clip manual, buat satu clip dengan waktu mulai dan selesai pilihan Anda. Ulangi proses ini untuk clip berikutnya, satu kredit per clip.</li>
              <li>Untuk lima clip sekaligus, sistem memilih lima bagian video yang dibagi merata dan memakai lima kredit.</li>
              <li>Kredit yang belum dipakai tetap tersimpan di saldo akun Anda.</li>
              <li>Unduh setiap clip sebelum meninggalkan halaman. File hasil tidak disimpan di server atau riwayat order.</li>
            </ul>
            {availableCredits < 1 && <Link className="button button-small" href="/dashboard/new">Beli 5 kredit seharga Rp1.000</Link>}
          </aside>
        </div>
      )}
    </main>
  );
}
