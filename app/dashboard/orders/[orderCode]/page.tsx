import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { DownloadLinks } from "@/components/orders/download-links";
import { OrderProgress } from "@/components/orders/order-progress";

type PageProps = { params: Promise<{ orderCode: string }> };

export default async function OrderDetailPage({ params }: PageProps) {
  const { supabase } = await requireUser();
  const { orderCode } = await params;
  const { data: order, error } = await supabase.from("orders").select("*").eq("order_code", orderCode).maybeSingle();
  if (error) return <main className="container app-main"><p className="form-error">Detail order gagal dimuat.</p></main>;
  if (!order) notFound();
  const { data: clips, error: clipsError } = order.processing_status === "COMPLETED"
    ? await supabase.from("clips").select("id,clip_number,file_name,size_bytes,duration_seconds").eq("order_id", order.id).order("clip_number")
    : { data: [], error: null };
  const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: order.currency, maximumFractionDigits: 0 }).format(order.amount);
  return (
    <main className="container app-main">
      <Link className="text-link" href="/dashboard/orders">Kembali ke riwayat</Link>
      <h1 className="page-title" style={{ marginTop: 14 }}>{order.order_code}</h1>
      <p className="page-lead">{order.package_name} · {money} · {order.clip_count} clip</p>
      <section className="panel stack">
        <div><strong>Pembayaran</strong><p className="muted">{order.payment_status}</p></div>
        <OrderProgress orderCode={order.order_code} initialStatus={order.processing_status} />
        <div><strong>URL YouTube</strong><p><a className="text-link" href={order.youtube_url} target="_blank" rel="noreferrer">{order.youtube_url}</a></p></div>
        <div><strong>Dibuat</strong><p className="muted">{new Date(order.created_at).toLocaleString("id-ID")}</p></div>
        {order.paid_at && <div><strong>Dibayar</strong><p className="muted">{new Date(order.paid_at).toLocaleString("id-ID")}</p></div>}
        {order.error_message && <p className="form-error">{order.error_message}</p>}
        {order.payment_status === "PENDING" && <Link className="button" href={`/payment/${encodeURIComponent(order.order_code)}`}>Lihat QR pembayaran</Link>}
      </section>
      {clipsError ? <p className="form-error" style={{ marginTop: 18 }}>Hasil clip gagal dimuat.</p> : order.processing_status === "COMPLETED" ? (
        <section className="panel" style={{ marginTop: 18 }}>
          <h2>Hasil clip</h2>
          {(clips?.length ?? 0) > 0
            ? <DownloadLinks orderCode={order.order_code} clipCount={clips?.length ?? 0} />
            : <p className="empty-state">Order berstatus selesai, tetapi daftar file masih kosong. Hubungi pengelola untuk pemeriksaan.</p>}
        </section>
      ) : (
        <section className="panel" style={{ marginTop: 18 }}>
          <h2>Status proses</h2>
          <p className="muted">Hasil unduhan akan muncul setelah order selesai diproses.</p>
        </section>
      )}
    </main>
  );
}
