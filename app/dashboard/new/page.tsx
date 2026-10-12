import Link from "next/link";
import { OrderForm } from "@/components/orders/order-form";
import { requireUser } from "@/lib/auth";
import { CREDIT_PACKAGE_ID } from "@/lib/credits";

export default async function NewOrderPage() {
  const { supabase } = await requireUser();
  const { data: product, error } = await supabase
    .from("packages")
    .select("id,name,clip_count,price,currency")
    .eq("id", CREDIT_PACKAGE_ID)
    .eq("active", true)
    .maybeSingle();
  return (
    <main id="account-content" className="container app-main">
      <header className="dashboard-page-heading">
        <p className="section-kicker">Beli kredit</p>
        <h1 className="page-title">Isi saldo clip.</h1>
        <p className="page-lead">Bayar Rp1.000 untuk 5 kredit. Admin memeriksa bukti QRIS, lalu kredit masuk ke akun setelah disetujui.</p>
      </header>
      {error
        ? <p className="form-error" role="alert">Informasi paket kredit gagal dimuat. Muat ulang halaman untuk mencoba lagi.</p>
        : <div className="new-order-layout">
            <OrderForm product={product} />
            <aside className="profile-note">
              <h2>Setelah pembayaran</h2>
              <ul>
                <li>Unggah bukti pembayaran QRIS pada halaman order.</li>
                <li>Tunggu admin memeriksa transaksi.</li>
                <li>Kredit baru tersedia setelah pembayaran disetujui.</li>
              </ul>
              <Link className="text-link" href="/dashboard/clip">Buat clip dengan saldo yang tersedia</Link>
            </aside>
          </div>}
    </main>
  );
}
