import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { PublicNavigation } from "@/components/public-navigation";
import { ProcessCarousel } from "@/components/process-carousel";
import { SiteFooter } from "@/components/site-footer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { absoluteUrl } from "@/lib/site";
import { getLandingContent, getSocialLinks } from "@/lib/site-content";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getLandingContent();
  return {
    title: { absolute: content.metaTitle },
    description: content.metaDescription,
    alternates: { canonical: "/" },
    robots: { index: true, follow: true },
    openGraph: {
      title: content.metaTitle,
      description: content.metaDescription,
      type: "website",
      url: absoluteUrl("/")
    }
  };
}

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

export default async function HomePage() {
  const content = await getLandingContent();
  const socialLinks = await getSocialLinks();
  const structuredData = {
    mainEntity: content.questions.map(({ question, answer }) => ({
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
            <p className="hero-kicker">{content.heroKicker}</p>
            <h1>{content.heroTitle}</h1>
            <p className="hero-copy">
              {content.heroDescription}
            </p>
            <div className="cta-row">
              <Link className="button button-accent" href="/register">{content.primaryCta}</Link>
              <Link className="text-link hero-secondary-link" href="#cara-kerja">{content.secondaryCta}</Link>
            </div>
            <p className="hero-note">{content.heroNote}</p>
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
        <div className="home-cut-divider container" aria-hidden="true"><span /></div>

        <section className="section process-section" id="cara-kerja">
          <div className="container process-layout">
            <div className="section-intro">
              <p className="section-kicker">{content.processKicker}</p>
              <h2>{content.processTitle}</h2>
              <p>{content.processDescription}</p>
            </div>
            <ProcessCarousel content={content.processSteps} />
          </div>
        </section>
        <div className="home-cut-divider container" aria-hidden="true"><span /></div>

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
                <p className="section-kicker">{content.pricingKicker}</p>
                <h2>{content.pricingTitle}</h2>
                <p>{content.pricingDescription}</p>
              </div>
              <Suspense fallback={<PricingLoading />}>
                <PricingList />
              </Suspense>
            </div>
          </div>
        </section>
        <div className="home-cut-divider container" aria-hidden="true"><span /></div>

        <section className="section faq-section" id="faq">
          <div className="container faq-layout">
            <div className="section-intro">
              <p className="section-kicker">{content.faqKicker}</p>
              <h2>{content.faqTitle}</h2>
            </div>
            <div className="faq-list">
              {content.questions.map(({ question, answer }) => (
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
        <div className="home-cut-divider container" aria-hidden="true"><span /></div>
      </main>

      <SiteFooter contactId="kontak" socialLinks={socialLinks} />
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
