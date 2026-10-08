import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { PublicNavigation } from "@/components/public-navigation";
import { SiteFooter } from "@/components/site-footer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Layanan Clip Video | LakuLokal" },
  description: "Pilih video dari perangkat, bayar dengan QRIS, lalu buat clip langsung di browser.",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Layanan Clip Video | LakuLokal",
    description: "Pilih video dari perangkat, bayar dengan QRIS, lalu buat clip langsung di browser.",
    type: "website",
    url: absoluteUrl("/")
  }
};

const questions = [
  {
    question: "Bagaimana cara membuat order clip?",
    answer: "Masuk ke akun, pilih file video dan paket, lalu bayar menggunakan QRIS. Setelah pembayaran terverifikasi, browser membuat clip."
  },
  {
    question: "Bagaimana pembayaran diproses?",
    answer: "Pembayaran order menggunakan QRIS DANA. Server memeriksa status transaksi ke provider sebelum order ditandai lunas."
  },
  {
    question: "File video apa yang dapat diproses?",
    answer: "Pilih file MP4, MOV, M4V, atau WebM berukuran maksimal 250 MB dan berdurasi tidak lebih dari dua jam."
  },
  {
    question: "Apa yang perlu diperiksa sebelum memilih video?",
    answer: "Pastikan Anda memiliki hak atau izin yang diperlukan untuk memproses dan menggunakan video, serta mematuhi Ketentuan Layanan YouTube dan aturan yang berlaku."
  },
  {
    question: "Apakah video dan hasilnya disimpan?",
    answer: "Video diproses langsung di browser dan tidak diunggah ke server. Clip diunduh ke perangkat dan tidak tersimpan di riwayat akun."
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
            <h1>Ubah file video jadi clip.</h1>
            <p className="hero-copy">
              Pilih video dari perangkat, bayar lewat QRIS, lalu buat clip langsung di browser. Video tidak dikirim ke server.
            </p>
            <div className="cta-row">
              <Link className="button button-accent" href="/register">Buat akun untuk mulai</Link>
              <Link className="text-link hero-secondary-link" href="#cara-kerja">Lihat cara kerja</Link>
            </div>
            <p className="hero-note">Hasil clip diunduh ke perangkat dan tidak tersimpan di akun.</p>
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
              <h2>Cara kerja clip video.</h2>
              <p>Akun mencatat order dan pembayaran. File video tetap berada di perangkat Anda.</p>
            </div>
            <ol className="process-steps">
              <li>
                <Image className="process-step-character" src="/brand/characters/creator-hijab-phone.png" alt="" aria-hidden="true" width={207} height={364} />
                <div className="process-step-copy"><span className="step-number">01</span><h3>Masuk atau buat akun</h3><p>Gunakan akun untuk membuat order dan menyimpan riwayat pribadi.</p></div>
              </li>
              <li>
                <Image className="process-step-character" src="/brand/characters/creator-camera.png" alt="" aria-hidden="true" width={312} height={355} />
                <div className="process-step-copy"><span className="step-number">02</span><h3>Pilih file dan paket</h3><p>Pilih video dari perangkat. Browser membaca file secara lokal.</p></div>
              </li>
              <li>
                <Image className="process-step-character" src="/brand/characters/creator-mobile-phone.png" alt="" aria-hidden="true" width={211} height={353} />
                <div className="process-step-copy"><span className="step-number">03</span><h3>Selesaikan pembayaran</h3><p>Pindai QRIS DANA. Order diproses setelah pembayaran diverifikasi.</p></div>
              </li>
              <li>
                <Image className="process-step-character" src="/brand/characters/creator-seated-editor.png" alt="" aria-hidden="true" width={324} height={371} />
                <div className="process-step-copy"><span className="step-number">04</span><h3>Buat dan unduh clip</h3><p>Biarkan halaman terbuka sampai clip siap diunduh ke perangkat.</p></div>
              </li>
            </ol>
          </div>
        </section>

        <section className="section pricing-section" id="harga">
          <div className="container pricing-layout">
            <div className="pricing-visual">
              <Image
                className="pricing-character"
                src="/brand/characters/creator-coffee-video.png"
                alt=""
                aria-hidden="true"
                width={280}
                height={377}
                sizes="(max-width: 680px) 58vw, (max-width: 920px) 30vw, 25vw"
              />
            </div>
            <div className="pricing-content">
              <div className="section-intro">
                <p className="section-kicker">Paket aktif</p>
                <h2>Harga layanan clip video.</h2>
                <p>Lihat rata-rata biaya per clip dan total setiap paket aktif. Harga order dikonfirmasi kembali oleh server.</p>
              </div>
              <Suspense fallback={<PricingLoading />}>
                <PricingList />
              </Suspense>
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
              <p className="faq-source">
                Sebelum memproses video, baca juga{" "}
                <a className="text-link" href="https://www.youtube.com/t/terms?hl=id" target="_blank" rel="noreferrer">
                  Ketentuan Layanan YouTube
                </a>{" "}
                dan <Link className="text-link" href="/artikel/hak-cipta-clip-video">panduan hak cipta clip video</Link>.
              </p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter contactId="kontak" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                "@id": absoluteUrl("/#organization"),
                name: "LakuLokal",
                url: absoluteUrl("/"),
                logo: {
                  "@type": "ImageObject",
                  url: absoluteUrl("/brand/lakulokal-icon.svg")
                }
              },
              {
                "@type": "WebSite",
                "@id": absoluteUrl("/#website"),
                name: "LakuLokal",
                url: absoluteUrl("/"),
                inLanguage: "id-ID",
                publisher: { "@id": absoluteUrl("/#organization") }
              },
              {
                "@type": "Service",
                name: "Layanan clip video",
                description: "Pilih file video, bayar dengan QRIS, lalu buat clip di browser.",
                url: absoluteUrl("/"),
                provider: { "@id": absoluteUrl("/#organization") }
              },
              {
                "@type": "FAQPage",
                ...structuredData,
                inLanguage: "id-ID"
              }
            ]
          }).replace(/</g, "\\u003c")
        }}
      />
    </>
  );
}
