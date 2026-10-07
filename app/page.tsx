import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
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

function formatUnitMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(amount);
}

async function PricingList() {
  const { packages, failed } = await getPackages();

  return (
    <div className="pricing-list" aria-live="polite">
      {failed ? (
        <p className="form-error" role="alert">Paket belum dapat dimuat. Coba beberapa saat lagi atau hubungi <a href="mailto:halo@lakulokal.id">halo@lakulokal.id</a>.</p>
      ) : packages.length === 0 ? (
        <p className="empty-state">Belum ada paket aktif. Silakan periksa kembali nanti.</p>
      ) : packages.map((item) => (
        <article className="pricing-item" key={item.id}>
          <div className="pricing-item-summary">
            <h3>{item.name}</h3>
            <p>{item.clip_count} clip</p>
          </div>
          <p className="pricing-unit">
            <span>Rata-rata per clip</span>
            <strong>
              {item.clip_count > 0
                ? formatUnitMoney(item.price / item.clip_count, item.currency)
                : "Tidak tersedia"}
            </strong>
          </p>
          <p className="pricing-total">
            <span>Total paket</span>
            <strong>{formatMoney(item.price, item.currency)}</strong>
          </p>
          <Link className="button button-small" href="/login?next=%2Fdashboard%2Fnew">Pilih paket</Link>
        </article>
      ))}
    </div>
  );
}

function PricingLoading() {
  return (
    <div className="pricing-list" role="status" aria-live="polite">
      <p className="empty-state">Memuat paket aktif...</p>
    </div>
  );
}

export default function HomePage() {
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
          <div className="hero-character-stage">
            <Image
              className="hero-character"
              src="/brand/characters/creator-seated-laptop.png"
              alt="Kreator duduk menggunakan laptop"
              width={215}
              height={363}
              priority
              sizes="(max-width: 680px) 70vw, (max-width: 920px) 36vw, 28vw"
            />
          </div>
        </section>

        <section className="section process-section" id="cara-kerja">
          <div className="container process-layout">
            <div className="section-intro">
              <p className="section-kicker">Cara kerja</p>
              <h2>Mulai dari sumber videomu.</h2>
              <p>Order, pembayaran, dan hasil clip terhubung ke akun yang sama supaya mudah ditinjau kembali.</p>
            </div>
            <ol className="process-steps">
              <li>
                <Image className="process-step-character" src="/brand/characters/creator-hijab-phone.png" alt="" aria-hidden="true" width={207} height={364} />
                <div className="process-step-copy"><span className="step-number">01</span><h3>Masuk atau buat akun</h3><p>Gunakan akun untuk membuat order dan menyimpan riwayat pribadi.</p></div>
              </li>
              <li>
                <Image className="process-step-character" src="/brand/characters/creator-camera.png" alt="" aria-hidden="true" width={312} height={355} />
                <div className="process-step-copy"><span className="step-number">02</span><h3>Kirim URL dan pilih paket</h3><p>Server mengambil jumlah clip dan harga dari paket aktif saat order dibuat.</p></div>
              </li>
              <li>
                <Image className="process-step-character" src="/brand/characters/creator-mobile-phone.png" alt="" aria-hidden="true" width={211} height={353} />
                <div className="process-step-copy"><span className="step-number">03</span><h3>Selesaikan pembayaran</h3><p>Pindai QRIS DANA. Order diproses setelah pembayaran diverifikasi.</p></div>
              </li>
              <li>
                <Image className="process-step-character" src="/brand/characters/creator-seated-editor.png" alt="" aria-hidden="true" width={324} height={371} />
                <div className="process-step-copy"><span className="step-number">04</span><h3>Pantau status dan unduh</h3><p>Buka detail order untuk melihat proses dan mengambil hasil saat tersedia.</p></div>
              </li>
            </ol>
          </div>
        </section>

        <section className="section pricing-section" id="harga">
          <div className="container pricing-layout">
            <div className="section-intro">
              <p className="section-kicker">Paket aktif</p>
              <h2>Harga jelas, dihitung per clip.</h2>
              <p>Lihat rata-rata biaya per clip dan total setiap paket aktif. Harga order dikonfirmasi kembali oleh server.</p>
              <Image
                className="pricing-character"
                src="/brand/characters/creator-coffee-video.png"
                alt=""
                aria-hidden="true"
                width={280}
                height={377}
                sizes="(max-width: 680px) 34vw, 180px"
              />
            </div>
            <Suspense fallback={<PricingLoading />}>
              <PricingList />
            </Suspense>
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
