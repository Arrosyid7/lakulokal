import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { DownloadLinks } from "@/components/orders/download-links";
import { BrowserCheckout } from "@/components/orders/browser-checkout";
import { getPaymentStatusLabel, getProcessingStatusLabel, getStatusClassName } from "@/lib/order-presentation";

type PageProps = { params: Promise<{ orderCode: string }> };

export default async function OrderDetailPage({ params }: PageProps) {
  const { supabase } = await requireUser();
  const { orderCode } = await params;
  const { data: order, error } = await supabase.from("orders").select("*").eq("order_code", orderCode).maybeSingle();
  if (error) return <main id="account-content" className="container app-main"><p className="form-error">Detail order gagal dimuat.</p></main>;
  if (!order) notFound();
  const { data: payment, error: paymentError } = await supabase.from("payments")
    .select("provider")
    .eq("order_id", order.id)
    .maybeSingle();
  if (paymentError) return <main id="account-content" className="container app-main"><p className="form-error">Metode pembayaran gagal dimuat.</p></main>;
  const { data: clips, error: clipsError } = order.processing_status === "COMPLETED"
    ? await supabase.from("clips").select("id,clip_number,file_name,size_bytes,duration_seconds").eq("order_id", order.id).order("clip_number")
    : { data: [], error: null };
  const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: order.currency, maximumFractionDigits: 0 }).format(order.amount);
  return (
    <main id="account-content" className="container app-main">
      <Link className="text-link" href="/dashboard/orders">Kembali ke riwayat</Link>
      <header className="account-order-heading">
        <p className="section-kicker">Rincian order</p>
        <h1 className="page-title">{order.order_code}</h1>
      <p className="page-lead">{order.package_name} · {money} · {order.clip_count} clip</p>
      </header>
      {order.youtube_url === null ? (
        <BrowserCheckout
          orderCode={order.order_code}
          clipCount={order.clip_count}
          amount={order.amount}
          currency={order.currency}
          orderCreatedAt={order.created_at}
          paymentProvider={payment?.provider ?? "UNKNOWN"}
          initialPaymentStatus={order.payment_status}
          initialProcessingStatus={order.processing_status}
        />
      ) : (
        <section className="panel stack">
          <div><strong>Pembayaran</strong><p><span className={getStatusClassName("payment", order.payment_status)}>{getPaymentStatusLabel(order.payment_status)}</span></p></div>
          <div><strong>Proses</strong><p><span className={getStatusClassName("processing", order.processing_status)}>{getProcessingStatusLabel(order.processing_status)}</span></p></div>
          <div><strong>URL video lama</strong><p>{order.youtube_url}</p></div>
          <div><strong>Dibuat</strong><p className="muted">{new Date(order.created_at).toLocaleString("id-ID")}</p></div>
          {order.paid_at && <div><strong>Dibayar</strong><p className="muted">{new Date(order.paid_at).toLocaleString("id-ID")}</p></div>}
          {order.error_message && <p className="form-error">{order.error_message}</p>}
          {order.processing_status !== "COMPLETED" && (
            <p className="form-error" role="status">
              Order ini dibuat dengan alur video lama dan tidak dapat diproses melalui browser. Hubungi{" "}
              <a className="text-link" href="mailto:halo@lakulokal.id">halo@lakulokal.id</a> sebelum membayar atau membuat order baru.
            </p>
          )}
        </section>
      )}
      {order.youtube_url === null ? null : clipsError ? <p className="form-error" style={{ marginTop: 18 }}>Hasil clip gagal dimuat.</p> : order.processing_status === "COMPLETED" ? (
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
