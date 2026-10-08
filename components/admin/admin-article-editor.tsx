"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Article, ArticleSection } from "@/lib/articles";

type FormArticle = {
  slug: string;
  title: string;
  seoTitle: string;
  description: string;
  keyphrase: string;
  intro: string;
  relatedSlugs: string;
  body: string;
  published: boolean;
};

function toMarkdown(sections: ArticleSection[]): string {
  return sections.map((section) => [
    `## ${section.heading}`,
    ...section.paragraphs,
    ...(section.bullets ?? []).map((bullet) => `- ${bullet}`),
    ...(section.resources ?? []).map((resource) => `resource: ${resource.label} | ${resource.href}`)
  ].join("\n\n")).join("\n\n");
}

function fromMarkdown(markdown: string): ArticleSection[] {
  const sections: ArticleSection[] = [];
  let current: ArticleSection | null = null;
  let paragraph: string[] = [];
  let bullets: string[] = [];
  let resources: { label: string; href: string }[] = [];

  const flushParagraph = () => {
    if (paragraph.length && current) current.paragraphs.push(paragraph.join(" ").trim());
    paragraph = [];
  };
  const flushBullets = () => {
    if (bullets.length && current) current.bullets = [...(current.bullets ?? []), ...bullets];
    bullets = [];
  };
  const flushSection = () => {
    flushParagraph();
    flushBullets();
    if (current && resources.length) current.resources = resources;
    if (current) sections.push(current);
    current = null;
    resources = [];
  };

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.startsWith("## ")) {
      flushSection();
      current = { heading: line.slice(3).trim(), paragraphs: [] };
    } else if (!line) {
      flushParagraph();
      flushBullets();
    } else if (line.startsWith("resource: ")) {
      flushParagraph();
      flushBullets();
      const match = /^resource:\s*(.*?)\s*\|\s*(https:\/\/\S+)$/.exec(line);
      if (match) resources.push({ label: match[1], href: match[2] });
    } else if (line.startsWith("- ")) {
      flushParagraph();
      bullets.push(line.slice(2).trim());
    } else {
      flushBullets();
      if (current) paragraph.push(line);
    }
  }
  flushSection();
  return sections;
}

function emptyArticle(): FormArticle {
  return {
    slug: "",
    title: "",
    seoTitle: "",
    description: "",
    keyphrase: "",
    intro: "",
    relatedSlugs: "",
    body: "## Bagian pertama\n\n",
    published: false
  };
}

function toFormArticle(article: Article): FormArticle {
  return {
    slug: article.slug,
    title: article.title,
    seoTitle: article.seoTitle,
    description: article.description,
    keyphrase: article.keyphrase,
    intro: article.intro,
    relatedSlugs: article.relatedSlugs.join(", "),
    body: toMarkdown(article.sections),
    published: article.published ?? true
  };
}

function slugify(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function AdminArticleEditor({ initialArticle }: { initialArticle?: Article }) {
  const router = useRouter();
  const [article, setArticle] = useState(() => initialArticle ? toFormArticle(initialArticle) : emptyArticle());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const checks = useMemo(() => {
    const normalizedKeyphrase = article.keyphrase.trim().toLocaleLowerCase("id");
    const bodyText = `${article.intro} ${article.body}`.toLocaleLowerCase("id");
    const wordCount = bodyText.trim().split(/\s+/).filter(Boolean).length;
    const headings = article.body.split(/\r?\n/).filter((line) => line.startsWith("## "));
    const tests = [
      ["Frasa kunci ada di judul SEO", Boolean(normalizedKeyphrase) && article.seoTitle.toLocaleLowerCase("id").includes(normalizedKeyphrase)],
      ["Frasa kunci ada di deskripsi pencarian", Boolean(normalizedKeyphrase) && article.description.toLocaleLowerCase("id").includes(normalizedKeyphrase)],
      ["Frasa kunci ada di slug", Boolean(normalizedKeyphrase) && article.slug.includes(slugify(normalizedKeyphrase))],
      ["Frasa kunci muncul di pembuka", Boolean(normalizedKeyphrase) && article.intro.toLocaleLowerCase("id").includes(normalizedKeyphrase)],
      ["Judul SEO berisi 30 sampai 60 karakter", article.seoTitle.length >= 30 && article.seoTitle.length <= 60],
      ["Deskripsi pencarian berisi 120 sampai 156 karakter", article.description.length >= 120 && article.description.length <= 156],
      ["Isi artikel minimal 300 kata", wordCount >= 300],
      ["Artikel memiliki subjudul", headings.length > 0],
      ["Setidaknya ada satu tautan internal", article.relatedSlugs.split(",").some((slug) => slug.trim().length > 0)]
    ] as const;
    return { tests, wordCount };
  }, [article]);

  function change<K extends keyof FormArticle>(key: K, value: FormArticle[K]) {
    setArticle((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const sections = fromMarkdown(article.body);
      if (!sections.length || sections.some((section) => !section.heading)) {
        throw new Error("Tambahkan setidaknya satu subjudul dengan format ## Judul bagian.");
      }
      const payload = {
        slug: article.slug,
        title: article.title,
        seo_title: article.seoTitle,
        description: article.description,
        keyphrase: article.keyphrase,
        intro: article.intro,
        related_slugs: article.relatedSlugs.split(",").map((slug) => slug.trim()).filter(Boolean),
        sections,
        published: article.published
      };
      const response = await fetch(initialArticle ? `/api/admin/articles/${encodeURIComponent(initialArticle.slug)}` : "/api/admin/articles", {
        method: initialArticle ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Artikel gagal disimpan.");
      setSaved(true);
      if (!initialArticle) router.replace(`/admin/artikel/${encodeURIComponent(result.slug)}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Artikel gagal disimpan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel admin-editor-form" onSubmit={save}>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="article-slug">Slug URL</label>
          <input
            id="article-slug"
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            value={article.slug}
            readOnly={Boolean(initialArticle)}
            onChange={(event) => change("slug", event.target.value)}
          />
          <small>Gunakan huruf kecil, angka, dan tanda hubung. Slug yang sudah disimpan tidak diubah agar tautan artikel tetap berlaku.</small>
        </div>
        <div className="field">
          <label htmlFor="article-title">Judul artikel</label>
          <input id="article-title" required maxLength={180} value={article.title} onChange={(event) => change("title", event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="article-seo-title">Judul SEO</label>
          <input id="article-seo-title" required maxLength={70} value={article.seoTitle} onChange={(event) => change("seoTitle", event.target.value)} />
          <small>{article.seoTitle.length}/70 karakter</small>
        </div>
        <div className="field">
          <label htmlFor="article-keyphrase">Frasa kunci utama</label>
          <input id="article-keyphrase" required maxLength={120} value={article.keyphrase} onChange={(event) => change("keyphrase", event.target.value)} />
        </div>
        <div className="field wide">
          <label htmlFor="article-description">Deskripsi pencarian</label>
          <textarea id="article-description" required maxLength={180} rows={3} value={article.description} onChange={(event) => change("description", event.target.value)} />
          <small>{article.description.length}/180 karakter</small>
        </div>
        <div className="field wide">
          <label htmlFor="article-intro">Pembuka artikel</label>
          <textarea id="article-intro" required maxLength={1000} rows={4} value={article.intro} onChange={(event) => change("intro", event.target.value)} />
        </div>
        <div className="field wide">
          <label htmlFor="article-related">Slug artikel terkait</label>
          <input id="article-related" value={article.relatedSlugs} onChange={(event) => change("relatedSlugs", event.target.value)} />
          <small>Pisahkan dengan koma. Tautan hanya muncul jika artikel terkait sudah terbit.</small>
        </div>
        <div className="field wide">
          <label htmlFor="article-body">Isi artikel</label>
          <textarea
            id="article-body"
            className="article-markdown"
            required
            rows={22}
            value={article.body}
            onChange={(event) => change("body", event.target.value)}
          />
          <small>Gunakan ## untuk subjudul, paragraf kosong untuk memisahkan paragraf, - untuk daftar, dan resource: label | https://... untuk rujukan.</small>
        </div>
      </div>

      <section className="seo-checklist" aria-labelledby="seo-checklist-title">
        <h2 id="seo-checklist-title">Checklist SEO bergaya Yoast</h2>
        <p>Checklist panduan bawaan LakuLokal, bukan plugin Yoast WordPress. Jumlah kata saat ini: {checks.wordCount}.</p>
        <ul>
          {checks.tests.map(([label, passed]) => (
            <li key={label} className={passed ? "seo-check-passed" : "seo-check-pending"}>
              <span aria-hidden="true">{passed ? "Lulus" : "Perlu diperiksa"}</span>
              <span>{label}</span>
            </li>
          ))}
        </ul>
      </section>

      <label className="admin-publish-toggle">
        <input type="checkbox" checked={article.published} onChange={(event) => change("published", event.target.checked)} />
        Terbitkan artikel di situs
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      {saved && <p className="form-success" role="status">Artikel sudah disimpan.</p>}
      <button className="button button-accent" type="submit" disabled={busy}>
        {busy ? "Menyimpan..." : "Simpan artikel"}
      </button>
    </form>
  );
}
