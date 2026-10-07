import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicNavigation } from "@/components/public-navigation";
import { SiteFooter } from "@/components/site-footer";
import { articles, getArticle } from "@/lib/articles";

type ArticlePageProps = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return articles.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return {};

  return {
    title: article.seoTitle,
    description: article.description,
    keywords: [article.keyphrase, "LakuLokal", "clip video"],
    alternates: { canonical: `/artikel/${article.slug}` },
    openGraph: {
      title: article.seoTitle,
      description: article.description,
      type: "article",
      url: `/artikel/${article.slug}`
    }
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();
  const relatedArticles = article.relatedSlugs
    .map((relatedSlug) => getArticle(relatedSlug))
    .filter((relatedArticle) => relatedArticle !== undefined);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    inLanguage: "id-ID",
    mainEntityOfPage: new URL(`/artikel/${article.slug}`, process.env.NEXT_PUBLIC_SITE_URL || "https://lakulokal.vercel.app").toString(),
    publisher: { "@type": "Organization", name: "LakuLokal" }
  };

  return (
    <>
      <a className="skip-link" href="#konten-artikel">Lewati ke konten utama</a>
      <PublicNavigation />
      <main className="container editorial-main" id="konten-artikel">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">Beranda</Link><span aria-hidden="true">/</span><Link href="/artikel">Artikel</Link>
        </nav>
        <article className="article-body">
          <header className="article-heading">
            <p className="section-kicker">Panduan LakuLokal</p>
            <h1 className="page-title">{article.title}</h1>
            <p className="article-intro">{article.intro}</p>
          </header>
          <div className="article-content">
            {article.sections.map((section) => (
              <section key={section.heading}>
                <h2>{section.heading}</h2>
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.bullets && (
                  <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
                )}
                {section.resources && (
                  <ul className="article-resources">
                    {section.resources.map((resource) => (
                      <li key={resource.href}>
                        <a className="text-link" href={resource.href} target="_blank" rel="noreferrer">{resource.label}</a>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
          <aside className="article-next">
            <p>Kelola order clip video YouTube Anda di LakuLokal.</p>
            <Link className="button" href="/register">Buat akun LakuLokal</Link>
          </aside>
          <nav className="related-articles" aria-label="Artikel terkait">
            <h2>Lanjutkan membaca</h2>
            {relatedArticles.map((relatedArticle) => (
              <Link className="text-link" href={`/artikel/${relatedArticle.slug}`} key={relatedArticle.slug}>{relatedArticle.title}</Link>
            ))}
          </nav>
        </article>
      </main>
      <SiteFooter />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
    </>
  );
}
