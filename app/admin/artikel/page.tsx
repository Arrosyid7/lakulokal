import Link from "next/link";
import { getAdminSiteArticles } from "@/lib/site-content";

export const dynamic = "force-dynamic";

export default async function AdminArticlesPage() {
  const { articles, error } = await getAdminSiteArticles();
  return (
    <main className="container app-main">
      <div className="row">
        <div>
          <h1 className="page-title">Artikel</h1>
          <p className="page-lead">Tulis artikel, atur metadata pencarian, dan periksa checklist SEO sebelum publikasi.</p>
        </div>
        <Link className="button" href="/admin/artikel/buat">Tulis artikel</Link>
      </div>
      {error ? (
        <p className="form-error" role="alert">Daftar artikel gagal dimuat. Periksa migrasi pengelolaan konten.</p>
      ) : articles.length ? (
        <div className="admin-article-list">
          {articles.map((article) => (
            <article className="admin-article-row" key={article.slug}>
              <div>
                <h2>{article.title}</h2>
                <p>{article.slug}</p>
                <p className={article.published === false ? "status status-draft" : "status"}>
                  {article.published === false ? "Draft" : "Terbit"}
                </p>
              </div>
              <Link className="button button-secondary" href={`/admin/artikel/${article.slug}`}>Edit artikel</Link>
            </article>
          ))}
        </div>
      ) : (
        <p className="empty-state">Belum ada artikel. Tulis artikel pertama untuk mulai mengisi halaman panduan.</p>
      )}
    </main>
  );
}
