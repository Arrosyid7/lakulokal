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
              <li>Untuk satu clip, isi waktu mulai dan selesai sendiri.</li>
              <li>Untuk lima clip, sistem membagi pilihan waktu dari video secara merata.</li>
              <li>Hasil clip disimpan di riwayat order selama 24 jam.</li>
            </ul>
            {availableCredits < 1 && <Link className="button button-small" href="/dashboard/new">Beli 5 kredit seharga Rp1.000</Link>}
          </aside>
        </div>
      )}
    </main>
  );
}
