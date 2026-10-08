import type { MetadataRoute } from "next";
import { getSiteArticles } from "@/lib/site-content";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await getSiteArticles();
  const publicPages = ["/", "/artikel", "/terms", "/privacy"];
  return [
    ...publicPages.map((path) => ({
      url: absoluteUrl(path)
    })),
    ...articles.map((article) => ({
      url: absoluteUrl(`/artikel/${article.slug}`)
    }))
  ];
}
