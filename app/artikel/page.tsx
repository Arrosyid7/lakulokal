import type { Metadata } from "next";
import Link from "next/link";
import { PublicNavigation } from "@/components/public-navigation";
import { SiteFooter } from "@/components/site-footer";
import { articles } from "@/lib/articles";

export const metadata: Metadata = {
  title: "Artikel tentang Clip Video dan Clipper",
  description: "Baca panduan memilih momen, membuat clip YouTube, memeriksa hak penggunaan, dan menyiapkan video untuk clip pendek.",
  alternates: { canonical: "/artikel" },
  openGraph: {
    title: "Artikel tentang Clip Video dan Clipper",
    description: "Panduan praktis untuk memilih momen dan menyiapkan video menjadi clip.",
    type: "website"
  }
};

export default function ArticlesPage() {
  return (
    <>
      <a className="skip-link" href="#konten-artikel">Lewati ke konten utama</a>
      <PublicNavigation />
      <main className="container editorial-main" id="konten-artikel">
        <header className="editorial-intro">
          <Link className="text-link" href="/">Kembali ke beranda</Link>
          <p className="section-kicker">Panduan LakuLokal</p>
          <h1 className="page-title">Artikel clip video</h1>
          <p className="page-lead">Catatan praktis untuk memilih momen, menyiapkan video, dan mengolah clip dengan tetap memperhatikan konteks serta hak penggunaan.</p>
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
      </main>
      <SiteFooter />
    </>
  );
}
