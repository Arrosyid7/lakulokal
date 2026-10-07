import type { MetadataRoute } from "next";
import { articles } from "@/lib/articles";
import { absoluteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
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
