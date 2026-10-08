import { AdminArticleEditor } from "@/components/admin/admin-article-editor";

export const dynamic = "force-dynamic";

export default function CreateArticlePage() {
  return (
    <main className="container app-main">
      <h1 className="page-title">Tulis artikel</h1>
      <p className="page-lead">Isi naskah dan metadata. Artikel baru tidak tampil di situs sampai status publikasi diaktifkan.</p>
      <AdminArticleEditor />
    </main>
  );
}
