import { notFound } from "next/navigation";
import { AdminArticleEditor } from "@/components/admin/admin-article-editor";
import { getAdminSiteArticles } from "@/lib/site-content";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

export default async function EditArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const { articles, error } = await getAdminSiteArticles();
  if (error) {
    return (
      <main className="container app-main">
        <h1 className="page-title">Artikel</h1>
        <p className="form-error" role="alert">Artikel gagal dimuat. Periksa migrasi pengelolaan konten.</p>
      </main>
    );
  }
  const article = articles.find((item) => item.slug === slug);
  if (!article) notFound();
  return (
    <main className="container app-main">
      <h1 className="page-title">Edit artikel</h1>
      <p className="page-lead">Perubahan judul, isi, metadata, dan status publikasi langsung digunakan oleh halaman artikel.</p>
      <AdminArticleEditor initialArticle={article} />
    </main>
  );
}
