import { OrderForm } from "@/components/orders/order-form";
import { requireUser } from "@/lib/auth";

export default async function NewOrderPage() {
  const { supabase } = await requireUser();
  const { data: packages, error } = await supabase
    .from("packages")
    .select("id,name,clip_count,price,currency")
    .eq("active", true)
    .order("price");
  return (
    <main className="container app-main">
      <h1 className="page-title">Buat order clip</h1>
      <p className="page-lead">Harga dan jumlah clip diambil ulang dari paket aktif di database saat order dibuat.</p>
      {error ? <p className="form-error" role="alert">Daftar paket gagal dimuat. Coba muat ulang halaman.</p> : <OrderForm packages={packages ?? []} />}
    </main>
  );
}
