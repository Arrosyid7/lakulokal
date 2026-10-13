import "server-only";
import { z } from "zod";
import { articles as defaultArticles, type Article, type ArticleSection } from "@/lib/articles";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const questionSchema = z.object({
  question: z.string().trim().min(1).max(180),
  answer: z.string().trim().min(1).max(800)
});

const processStepSchema = z.object({
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(300)
});

export const landingContentSchema = z.object({
  metaTitle: z.string().trim().min(1).max(70),
  metaDescription: z.string().trim().min(1).max(180),
  heroKicker: z.string().trim().min(1).max(100),
  heroTitle: z.string().trim().min(1).max(100),
  heroDescription: z.string().trim().min(1).max(400),
  primaryCta: z.string().trim().min(1).max(60),
  secondaryCta: z.string().trim().min(1).max(60),
  heroNote: z.string().trim().min(1).max(180),
  processKicker: z.string().trim().min(1).max(60),
  processTitle: z.string().trim().min(1).max(100),
  processDescription: z.string().trim().min(1).max(300),
  processSteps: z.array(processStepSchema).length(4),
  pricingKicker: z.string().trim().min(1).max(60),
  pricingTitle: z.string().trim().min(1).max(100),
  pricingDescription: z.string().trim().min(1).max(300),
  faqKicker: z.string().trim().min(1).max(60),
  faqTitle: z.string().trim().min(1).max(100),
  questions: z.array(questionSchema).min(1).max(12)
});

export type LandingContent = z.infer<typeof landingContentSchema>;

export const DEFAULT_LANDING_CONTENT: LandingContent = {
  metaTitle: "Layanan Clip Video | LakuLokal",
  metaDescription: "Beli 5 kredit seharga Rp1.000 lewat QRIS, tunggu persetujuan admin, lalu buat clip dari video di perangkat Anda.",
  heroKicker: "Untuk video yang layak ditonton lagi",
  heroTitle: "Ubah file video jadi clip.",
  heroDescription: "Beli 5 kredit seharga Rp1.000 lewat QRIS. Setelah admin menyetujui pembayaran, buat satu clip dengan waktu pilihan sendiri atau lima clip sekaligus.",
  primaryCta: "Buat akun untuk mulai",
  secondaryCta: "Lihat cara kerja",
  heroNote: "Hasil hanya tersedia di halaman pemrosesan. Unduh sebelum keluar.",
  processKicker: "Cara kerja",
  processTitle: "Cara kerja clip video.",
  processDescription: "Kredit masuk setelah pembayaran QRIS disetujui admin. Pilih satu clip atau lima clip dari video yang ada di perangkat Anda.",
  processSteps: [
    { title: "Masuk atau buat akun", description: "Gunakan akun untuk membeli kredit, melihat saldo, dan menyimpan riwayat order." },
    { title: "Bayar Rp1.000 dengan QRIS", description: "Pembayaran membeli 5 kredit. Unggah bukti QRIS pada halaman order agar admin dapat memeriksanya." },
    { title: "Tunggu persetujuan admin", description: "Order tetap menunggu selama pemeriksaan. Saldo bertambah 5 kredit setelah pembayaran disetujui." },
    { title: "Pilih video dan jumlah clip", description: "Buat satu clip dengan rentang waktu manual memakai 1 kredit, lalu ulangi untuk clip berikutnya. Atau buat lima clip sekaligus dengan 5 kredit." }
  ],
  pricingKicker: "Paket aktif",
  pricingTitle: "Harga layanan clip video.",
  pricingDescription: "Bayar Rp1.000 untuk 5 kredit. Setiap clip menggunakan 1 kredit.",
  faqKicker: "FAQ",
  faqTitle: "Yang perlu diketahui sebelum mulai.",
  questions: [
    {
      question: "Berapa harga kredit clip?",
      answer: "Rp1.000 membeli 5 kredit. Setiap clip menggunakan 1 kredit, jadi satu pembelian cukup untuk membuat lima clip."
    },
    {
      question: "Bagaimana pembayaran diproses?",
      answer: "Bayar melalui QRIS, lalu unggah bukti pada halaman order. Status order menunggu pemeriksaan admin. Kredit baru masuk ke saldo setelah admin menyetujui pembayaran."
    },
    {
      question: "Bagaimana cara membuat satu clip atau lima clip?",
      answer: "Pilih file video dari perangkat. Untuk clip manual, masukkan waktu mulai dan selesai dalam detik. Satu proses membuat satu clip dan memakai 1 kredit; mulai proses baru untuk membuat clip manual berikutnya. Pilihan lima clip membuat lima bagian yang dibagi merata sekaligus dan memakai 5 kredit."
    },
    {
      question: "Apakah kredit yang belum dipakai tetap tersimpan?",
      answer: "Ya. Kredit yang belum digunakan tetap tersimpan di saldo akun Anda. Saldo berkurang sesuai clip yang diproses: 1 kredit untuk satu clip atau 5 kredit untuk lima clip."
    },
    {
      question: "Apa yang terjadi jika pembuatan clip gagal?",
      answer: "Kredit untuk clip yang belum berhasil dibuat dikembalikan ke saldo. Clip yang sudah selesai tetap menggunakan kredit; unduh clip tersebut sebelum meninggalkan halaman."
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
      answer: "Video sumber dan clip hasil diproses di browser, bukan disimpan di server. Unduh setiap clip sebelum meninggalkan halaman; status order tetap terlihat di riwayat."
    }
  ]
};

const articleSectionSchema = z.object({
  heading: z.string().trim().min(1).max(180),
  paragraphs: z.array(z.string().trim().min(1).max(4000)),
  bullets: z.array(z.string().trim().min(1).max(500)).optional(),
  resources: z.array(z.object({
    label: z.string().trim().min(1).max(160),
    href: z.string().url().max(2048)
  })).optional()
});

const articleRecordSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(1).max(180),
  seo_title: z.string().trim().min(1).max(70),
  description: z.string().trim().min(1).max(180),
  keyphrase: z.string().trim().min(1).max(120),
  intro: z.string().trim().min(1).max(1000),
  related_slugs: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)),
  sections: z.array(articleSectionSchema).min(1).max(40),
  published: z.boolean()
});

function getRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  return {};
}

export function parseLandingContent(value: unknown): LandingContent | null {
  const parsed = landingContentSchema.partial().safeParse({
    ...DEFAULT_LANDING_CONTENT,
    ...getRecord(value)
  });
  if (!parsed.success) return null;
  return { ...DEFAULT_LANDING_CONTENT, ...parsed.data };
}

export async function getLandingContent(): Promise<LandingContent> {
  try {
    const { data, error } = await createSupabaseAdminClient()
      .from("site_configuration")
      .select("landing_content")
      .eq("id", "main")
      .maybeSingle();
    if (error) {
      console.error("site_landing_content_load_failed", { code: error.code });
      return DEFAULT_LANDING_CONTENT;
    }
    const parsed = parseLandingContent(data?.landing_content);
    if (!parsed) {
      console.error("site_landing_content_invalid");
      return DEFAULT_LANDING_CONTENT;
    }
    return parsed;
  } catch (error) {
    console.error("site_landing_content_load_failed", {
      message: error instanceof Error ? error.message : "unknown"
    });
    return DEFAULT_LANDING_CONTENT;
  }
}

export type SocialLinks = {
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
};

function safeSocialUrl(value: string | null | undefined, hosts: readonly string[]): string {
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" && hosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))
      ? url.toString()
      : "";
  } catch {
    return "";
  }
}

export async function getSocialLinks(): Promise<SocialLinks> {
  try {
    const { data, error } = await createSupabaseAdminClient()
      .from("site_configuration")
      .select("instagram_url,facebook_url,tiktok_url")
      .eq("id", "main")
      .maybeSingle();
    if (error) {
      console.error("site_social_links_load_failed", { code: error.code });
      return { instagramUrl: "", facebookUrl: "", tiktokUrl: "" };
    }
    return {
      instagramUrl: safeSocialUrl(data?.instagram_url, ["instagram.com"]),
      facebookUrl: safeSocialUrl(data?.facebook_url, ["facebook.com", "fb.com"]),
      tiktokUrl: safeSocialUrl(data?.tiktok_url, ["tiktok.com"])
    };
  } catch (error) {
    console.error("site_social_links_load_failed", {
      message: error instanceof Error ? error.message : "unknown"
    });
    return { instagramUrl: "", facebookUrl: "", tiktokUrl: "" };
  }
}

function toArticle(value: unknown): Article | null {
  const parsed = articleRecordSchema.safeParse(value);
  if (!parsed.success) return null;
  const sections: ArticleSection[] = parsed.data.sections;
  return {
    slug: parsed.data.slug,
    title: parsed.data.title,
    seoTitle: parsed.data.seo_title,
    description: parsed.data.description,
    keyphrase: parsed.data.keyphrase,
    intro: parsed.data.intro,
    relatedSlugs: parsed.data.related_slugs,
    sections,
    published: parsed.data.published
  };
}

function mergeArticles(
  rows: { slug: string; published: boolean }[],
  includeUnpublished: boolean
): Article[] {
  const bySlug = new Map(defaultArticles.map((article) => [article.slug, article]));
  for (const row of rows) {
    const article = toArticle(row);
    if (!article) {
      console.error("site_article_invalid", { slug: row.slug });
      continue;
    }
    if (row.published || includeUnpublished) bySlug.set(article.slug, article);
    else bySlug.delete(article.slug);
  }
  return [...bySlug.values()];
}

export async function getAdminSiteArticles(): Promise<{ articles: Article[]; error: boolean }> {
  try {
    const { data, error } = await createSupabaseAdminClient()
      .from("site_articles")
      .select("slug,title,seo_title,description,keyphrase,intro,related_slugs,sections,published")
      .order("updated_at", { ascending: false });
    if (error) {
      console.error("site_articles_load_failed", { code: error.code });
      return { articles: [], error: true };
    }
    return { articles: mergeArticles(data ?? [], true), error: false };
  } catch (error) {
    console.error("site_articles_load_failed", {
      message: error instanceof Error ? error.message : "unknown"
    });
    return { articles: [], error: true };
  }
}

export async function getSiteArticles(): Promise<Article[]> {
  try {
    const { data, error } = await createSupabaseAdminClient()
      .from("site_articles")
      .select("slug,title,seo_title,description,keyphrase,intro,related_slugs,sections,published")
      .order("updated_at", { ascending: false });
    if (error) {
      console.error("site_articles_load_failed", { code: error.code });
      return defaultArticles;
    }
    return mergeArticles(data ?? [], false);
  } catch (error) {
    console.error("site_articles_load_failed", {
      message: error instanceof Error ? error.message : "unknown"
    });
    return defaultArticles;
  }
}

export const siteArticleSchema = articleRecordSchema;
