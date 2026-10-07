import type { Metadata } from "next";
import Link from "next/link";
import { PublicNavigation } from "@/components/public-navigation";
import { SiteFooter } from "@/components/site-footer";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Clip Video YouTube | LakuLokal" },
  description: "Buat clip video YouTube lewat LakuLokal. Kirim tautan, pilih paket, lalu pantau pembayaran dan hasil dari satu akun.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Clip Video YouTube | LakuLokal",
    description: "Kelola order clip video YouTube, pembayaran QRIS, dan hasilnya melalui dashboard LakuLokal.",
    type: "website"
  }
};

const questions = [
  {
    question: "Bagaimana cara membuat order clip?",
    answer: "Masuk ke akun, buka menu Buat clip, kirim tautan video YouTube, lalu pilih paket yang aktif. Harga paket diperiksa server ketika order dibuat."
  },
  {
    question: "Bagaimana pembayaran diproses?",
    answer: "Pembayaran order menggunakan QRIS DANA. Server memeriksa status transaksi ke provider sebelum order ditandai lunas."
  },
  {
    question: "Apakah semua video YouTube dapat diproses?",
    answer: "Tidak selalu. Video privat, dibatasi usia, atau tidak tersedia untuk diunduh dapat gagal diproses. Pastikan tautan merujuk ke video yang dapat diakses."
  },
  {
    question: "Apa yang perlu diperiksa sebelum mengirim video?",
    answer: "Pastikan Anda memiliki hak atau izin yang diperlukan untuk memproses dan menggunakan video, serta mematuhi Ketentuan Layanan YouTube dan aturan yang berlaku."
  },
  {
    question: "Di mana saya melihat hasil dan status order?",
    answer: "Status pembayaran, proses, dan hasil unduhan tersedia pada dashboard akun serta halaman detail order."
  }
];

type Package = { id: string; name: string; clip_count: number; price: number; currency: string };

async function getPackages(): Promise<{ packages: Package[]; failed: boolean }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("packages")
      .select("id,name,clip_count,price,currency")
      .eq("active", true)
      .order("price");
    if (error) {
      console.error("landing_packages_load_failed", { code: error.code });
      return { packages: [], failed: true };
    }
    return { packages: data ?? [], failed: false };
  } catch (error) {
    console.error("landing_packages_load_failed", {
      message: error instanceof Error ? error.message : "unknown"
    });
    return { packages: [], failed: true };
  }
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(amount);
}

export default async function HomePage() {
  const { packages, failed } = await getPackages();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer }
    }))
  };

  return (
    <>
      <a className="skip-link" href="#konten-utama">Lewati ke konten utama</a>
      <PublicNavigation />
      <main id="konten-utama">
        <section className="container hero" id="beranda">
          <div className="hero-copy-column">
            <p className="hero-kicker">Untuk video yang layak ditonton lagi</p>
            <h1>Kelola clip video YouTube dari tautan sampai hasil.</h1>
            <p className="hero-copy">
              Buat clip video YouTube dengan mengirim tautan, memilih paket, lalu mengikuti pembayaran dan proses dari akun LakuLokal.
            </p>
            <div className="cta-row">
              <Link className="button button-accent" href="/register">Buat akun untuk mulai</Link>
              <Link className="text-link hero-secondary-link" href="#cara-kerja">Lihat cara kerja</Link>
            </div>
            <p className="hero-note">Butuh akun untuk membuat order dan melihat hasil clip.</p>
          </div>
          <aside className="hero-side" aria-label="Ringkasan alur LakuLokal">
            <div className="clip-diagram" role="img" aria-label="Skema video sumber yang ditandai menjadi beberapa potongan clip">
              <p>Skema garis edit</p>
              <div className="clip-frame" aria-hidden="true">
                <span className="clip-frame-block clip-frame-block-one" />
                <span className="clip-frame-block clip-frame-block-two" />
                <span className="clip-frame-block clip-frame-block-three" />
              </div>
              <div className="clip-track-labels" aria-hidden="true"><span>Video sumber</span><strong>Pilihan momen</strong></div>
              <div className="clip-track" aria-hidden="true">
                <span className="clip-track-source" />
                <span className="clip-track-selected" />
                <span className="clip-track-end" />
              </div>
            </div>
            <p className="hero-side-label">Satu alur untuk order</p>
            <ol className="hero-timeline">
              <li><span>01</span><div><strong>Kirim tautan</strong><p>Pilih video YouTube dan paket aktif.</p></div></li>
              <li><span>02</span><div><strong>Bayar dengan QRIS</strong><p>Status pembayaran diperiksa oleh server.</p></div></li>
              <li><span>03</span><div><strong>Pantau hasil</strong><p>Lihat proses dan unduhan di dashboard.</p></div></li>
            </ol>
            <Link className="text-link" href="/artikel">Baca panduan clip video</Link>
          </aside>
        </section>

        <section className="section process-section" id="cara-kerja">
          <div className="container process-layout">
            <div className="section-intro">
              <p className="section-kicker">Cara kerja</p>
              <h2>Mulai dari sumber videomu.</h2>
              <p>Order, pembayaran, dan hasil clip terhubung ke akun yang sama supaya mudah ditinjau kembali.</p>
            </div>
            <ol className="process-steps">
              <li><span className="step-number">01</span><div><h3>Masuk atau buat akun</h3><p>Gunakan akun untuk membuat order dan menyimpan riwayat pribadi.</p></div></li>
              <li><span className="step-number">02</span><div><h3>Kirim URL dan pilih paket</h3><p>Server mengambil jumlah clip dan harga dari paket aktif saat order dibuat.</p></div></li>
              <li><span className="step-number">03</span><div><h3>Selesaikan pembayaran</h3><p>Pindai QRIS DANA. Order diproses setelah pembayaran diverifikasi.</p></div></li>
              <li><span className="step-number">04</span><div><h3>Pantau status dan unduh</h3><p>Buka detail order untuk melihat proses dan mengambil hasil saat tersedia.</p></div></li>
            </ol>
          </div>
        </section>

        <section className="section pricing-section" id="harga">
          <div className="container pricing-layout">
            <div className="section-intro">
              <p className="section-kicker">Paket aktif</p>
              <h2>Harga yang ditetapkan dari paket.</h2>
              <p>Daftar ini mengikuti paket aktif di database. Harga pada saat order dibuat dikonfirmasi kembali oleh server.</p>
            </div>
            <div className="pricing-list" aria-live="polite">
              {failed ? (
                <p className="form-error" role="alert">Paket belum dapat dimuat. Coba beberapa saat lagi atau hubungi <a href="mailto:halo@lakulokal.id">halo@lakulokal.id</a>.</p>
              ) : packages.length === 0 ? (
                <p className="empty-state">Belum ada paket aktif. Silakan periksa kembali nanti.</p>
              ) : packages.map((item) => (
                <article className="pricing-item" key={item.id}>
                  <div>
                    <h3>{item.name}</h3>
                    <p>{item.clip_count} clip</p>
                  </div>
                  <strong>{formatMoney(item.price, item.currency)}</strong>
                  <Link className="button button-small" href="/login?next=%2Fdashboard%2Fnew">Pilih paket</Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section faq-section" id="faq">
          <div className="container faq-layout">
            <div className="section-intro">
              <p className="section-kicker">FAQ</p>
              <h2>Yang perlu diketahui sebelum mulai.</h2>
            </div>
            <div className="faq-list">
              {questions.map(({ question, answer }) => (
                <details key={question}>
                  <summary>{question}</summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter contactId="kontak" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
    </>
  );
}
