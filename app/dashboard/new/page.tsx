import Link from "next/link";
import { OrderForm } from "@/components/orders/order-form";
import { requireUser } from "@/lib/auth";
import { CREDIT_PACKAGES, isConfiguredCreditPackage } from "@/lib/credits";

export default async function NewOrderPage() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("packages")
    .select("id,name,clip_count,price,currency")
    .in("id", CREDIT_PACKAGES.map((product) => product.id))
    .eq("active", true)
    .order("price", { ascending: true });
  const products = (data ?? [])
    .filter(isConfiguredCreditPackage)
    .sort((a, b) => a.price - b.price);
  return (
    <main id="account-content" className="container app-main">
      <header className="dashboard-page-heading">
        <p className="section-kicker">Beli kredit</p>
        <h1 className="page-title">Isi saldo clip.</h1>
        <p className="page-lead">Pilih nominal Rp1.000 sampai Rp5.000. Setiap Rp1.000 memberi 5 kredit. Admin memeriksa bukti QRIS sebelum kredit masuk ke saldo.</p>
      </header>
      {error
        ? <p className="form-error" role="alert">Informasi paket kredit gagal dimuat. Muat ulang halaman untuk mencoba lagi.</p>
        : <div className="new-order-layout">
            <OrderForm products={products} />
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
