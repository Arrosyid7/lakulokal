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
  metaDescription: "Pilih video dari perangkat, bayar dengan QRIS, lalu buat clip langsung di browser.",
  heroKicker: "Untuk video yang layak ditonton lagi",
  heroTitle: "Ubah file video jadi clip.",
  heroDescription: "Pilih video dari perangkat, bayar lewat QRIS, lalu buat clip langsung di browser. Video tidak dikirim ke server.",
  primaryCta: "Buat akun untuk mulai",
  secondaryCta: "Lihat cara kerja",
  heroNote: "Clip hasil tersedia di riwayat akun selama 24 jam.",
  processKicker: "Cara kerja",
  processTitle: "Cara kerja clip video.",
  processDescription: "Akun mencatat order dan pembayaran. File video tetap berada di perangkat Anda.",
  processSteps: [
    { title: "Masuk atau buat akun", description: "Gunakan akun untuk membuat order dan melihat riwayat pembayaran." },
    { title: "Pilih file dan paket", description: "Pilih video dari perangkat. Browser membaca file secara lokal." },
    { title: "Selesaikan pembayaran", description: "Bayar dengan QRIS dan unggah bukti. Order disetujui otomatis jika OCR mencocokkan nominal dan tanggal." },
    { title: "Buat dan unduh clip", description: "Setiap clip tampil saat selesai. Hasil tersimpan di riwayat selama 24 jam." }
  ],
  pricingKicker: "Paket aktif",
  pricingTitle: "Harga layanan clip video.",
  pricingDescription: "Lihat rata-rata biaya per clip dan total setiap paket aktif. Harga order dikonfirmasi kembali oleh server.",
  faqKicker: "FAQ",
  faqTitle: "Yang perlu diketahui sebelum mulai.",
  questions: [
    {
      question: "Bagaimana cara membuat order clip?",
      answer: "Masuk ke akun, pilih file video dan paket, lalu bayar menggunakan QRIS. Order disetujui otomatis jika OCR mencocokkan nominal dan tanggal bukti. OCR tidak memastikan dana masuk."
    },
    {
      question: "Bagaimana pembayaran diproses?",
      answer: "Unggah bukti QRIS. Order disetujui otomatis jika nominal dan tanggal pada bukti cocok menurut OCR. Pemeriksaan ini tidak memverifikasi dana diterima, jadi bukti palsu dapat memberi akses ke layanan."
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
      answer: "Video sumber tetap di perangkat dan diproses di browser. File clip disimpan di riwayat order selama 24 jam, lalu dihapus otomatis."
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
