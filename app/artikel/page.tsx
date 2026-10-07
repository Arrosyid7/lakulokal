import type { Metadata } from "next";
import Link from "next/link";
import { PublicNavigation } from "@/components/public-navigation";
import { SiteFooter } from "@/components/site-footer";
import { articles } from "@/lib/articles";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Artikel Clip Video YouTube",
  description: "Artikel clip video YouTube tentang memilih momen, menjaga konteks, memeriksa hak penggunaan, dan menyiapkan video.",
  alternates: { canonical: "/artikel" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Artikel Clip Video YouTube | Panduan LakuLokal",
    description: "Artikel clip video YouTube tentang memilih momen, menjaga konteks, memeriksa hak penggunaan, dan menyiapkan video.",
    siteName: "LakuLokal",
    locale: "id_ID",
    type: "website",
    url: absoluteUrl("/artikel")
  }
};

export default function ArticlesPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Artikel Clip Video YouTube",
    description: "Panduan memilih momen, menjaga konteks, memeriksa hak penggunaan, dan menyiapkan video untuk clip.",
    url: absoluteUrl("/artikel"),
    inLanguage: "id-ID",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: articles.map((article, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: article.title,
        url: absoluteUrl(`/artikel/${article.slug}`)
      }))
    }
  };

  return (
    <>
      <a className="skip-link" href="#konten-artikel">Lewati ke konten utama</a>
      <PublicNavigation />
      <main className="container editorial-main" id="konten-artikel">
        <header className="editorial-intro">
          <Link className="text-link" href="/">Kembali ke beranda</Link>
          <p className="section-kicker">Panduan LakuLokal</p>
          <h1 className="page-title">Artikel Clip Video YouTube</h1>
          <p className="page-lead">Artikel clip video YouTube ini membahas cara memilih momen, menyiapkan video, dan menjaga konteks serta hak penggunaan.</p>
        </header>
        <section className="article-list" aria-label="Daftar artikel">
          {articles.map((article, index) => (
            <article className="article-preview" key={article.slug}>
              <p className="article-index">0{index + 1}</p>
              <div>
                <h2><Link href={`/artikel/${article.slug}`}>{article.title}</Link></h2>
                <p>{article.description}</p>
                <Link className="text-link" href={`/artikel/${article.slug}`}>Baca artikel</Link>
              </div>
            </article>
          ))}
        </section>
        <p className="page-lead">
          Sebelum mengolah video, baca{" "}
          <a className="text-link" href="https://www.youtube.com/t/terms?hl=id" target="_blank" rel="noreferrer">
            Ketentuan Layanan YouTube
          </a>.
        </p>
      </main>
      <SiteFooter />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
    </>
  );
}
