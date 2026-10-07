import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let packages: { id: string; name: string; clip_count: number; price: number; currency: string }[] = [];
  let packageLoadFailed = false;
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("packages").select("id,name,clip_count,price,currency").eq("active", true).order("price");
    if (error) packageLoadFailed = true;
    else packages = data ?? [];
  } catch {
    packageLoadFailed = true;
  }
  const money = (amount: number, currency: string) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);

  return (
    <>
      <header className="site-header">
        <div className="container nav-row">
          <Link className="brand" href="/" aria-label="LakuLokal, beranda">LakuLokal</Link>
          <nav className="nav-links" aria-label="Navigasi utama">
            <a href="#cara-kerja">Cara kerja</a>
            <a href="#harga">Harga</a>
            <Link href="/login">Masuk</Link>
            <Link className="button" href="/register">Buat akun</Link>
          </nav>
        </div>
      </header>
      <main>
        <section className="container hero">
          <div className="hero-grid">
            <div>
              <div className="eyebrow">Layanan video short untuk creator & bisnis</div>
              <h1>Ubah video menjadi <span>clip siap upload.</span></h1>
              <p className="hero-copy">
                Masukkan tautan YouTube, pilih paket clip, lalu lihat status order dari dashboard akun Anda.
              </p>
              <ul className="hero-points" aria-label="Keuntungan LakuLokal">
                <li>Hasil siap pakai untuk kanal sosial</li>
                <li>Order dan pembayaran terintegrasi</li>
                <li>Monitoring status real-time</li>
              </ul>
              <div className="cta-row">
                <Link className="button button-accent" href="/login?next=%2Fdashboard%2Fnew">Masuk untuk membuat clip</Link>
                <Link className="button button-secondary" href="/register">Daftar akun</Link>
              </div>
            </div>
            <aside id="harga" className="price-panel" aria-labelledby="price-title">
              <div className="panel-head">
                <p id="price-title">Paket yang tersedia</p>
                <span className="mini-badge">Terjangkau</span>
              </div>
              {packageLoadFailed ? <p className="form-error" role="status">Daftar paket belum dapat dimuat. Coba kembali nanti.</p> : packages.length === 0 ? (
                <p className="empty-state">Belum ada paket aktif.</p>
              ) : packages.map((item) => (
                <div key={item.id} className="price-item">
                  <div className="price-meta">
                    <span>{item.name}</span>
                    <strong>{item.clip_count} clip</strong>
                  </div>
                  <h2 className="price">{money(item.price, item.currency)}</h2>
                  <Link className="button button-compact" href="/login?next=%2Fdashboard%2Fnew">Pilih paket</Link>
                </div>
              ))}
            </aside>
          </div>
        </section>

        <section className="section section-soft" id="cara-kerja">
          <div className="container">
            <div className="section-heading">
              <p className="section-kicker">Kenapa orang pilih kami</p>
              <h2>Alur order yang sederhana dan jelas</h2>
            </div>
            <div className="process-list">
              <article className="process-item">
                <span className="step-number">01</span>
                <h3>Masuk ke akun</h3>
                <p>Riwayat dan hasil order tersimpan untuk akun yang sedang digunakan.</p>
              </article>
              <article className="process-item">
                <span className="step-number">02</span>
                <h3>Kirim tautan video</h3>
                <p>Backend memeriksa URL dan mengambil harga paket dari database.</p>
              </article>
              <article className="process-item">
                <span className="step-number">03</span>
                <h3>Pantau order</h3>
                <p>Status pembayaran dan proses clip dapat dilihat dari halaman order.</p>
              </article>
            </div>
          </div>
        </section>
      </main>
      <footer className="footer">
        <div className="container row">
          <span>LakuLokal. Ubah Video Menjadi Clip Siap Upload.</span>
          <span style={{ display: "flex", gap: 16 }}>
            <Link href="/terms">Syarat Layanan</Link>
            <Link href="/privacy">Kebijakan Privasi</Link>
          </span>
        </div>
      </footer>
    </>
  );
}
