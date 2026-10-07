import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicNavigation } from "@/components/public-navigation";
import { SiteFooter } from "@/components/site-footer";
import { articles, getArticle } from "@/lib/articles";
import { absoluteUrl } from "@/lib/site";

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
    alternates: { canonical: `/artikel/${article.slug}` },
    robots: { index: true, follow: true },
    openGraph: {
      title: article.seoTitle,
      description: article.description,
      type: "article",
      siteName: "LakuLokal",
      locale: "id_ID",
      url: absoluteUrl(`/artikel/${article.slug}`)
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

  const articleUrl = absoluteUrl(`/artikel/${article.slug}`);
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: article.title,
        description: article.description,
        inLanguage: "id-ID",
        mainEntityOfPage: articleUrl,
        publisher: {
          "@type": "Organization",
          name: "LakuLokal",
          url: absoluteUrl("/"),
          logo: {
            "@type": "ImageObject",
            url: absoluteUrl("/brand/lakulokal-icon.svg")
          }
        }
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Beranda", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "Artikel", item: absoluteUrl("/artikel") },
          { "@type": "ListItem", position: 3, name: article.title, item: articleUrl }
        ]
      }
    ]
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
          <p className="article-official-source">
            Rujukan resmi:{" "}
            <a className="text-link" href="https://www.youtube.com/t/terms?hl=id" target="_blank" rel="noreferrer">
              Ketentuan Layanan YouTube
            </a>.
          </p>
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
