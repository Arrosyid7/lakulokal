import type { MetadataRoute } from "next";
import { articles } from "@/lib/articles";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://lakulokal.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const publicPages = ["/", "/artikel", "/terms", "/privacy"];
  return [
    ...publicPages.map((path) => ({
      url: new URL(path, baseUrl).toString(),
      changeFrequency: path === "/" || path === "/artikel" ? "weekly" as const : "yearly" as const,
      priority: path === "/" ? 1 : path === "/artikel" ? 0.8 : 0.4
    })),
    ...articles.map((article) => ({
      url: new URL(`/artikel/${article.slug}`, baseUrl).toString(),
      changeFrequency: "monthly" as const,
      priority: 0.7
    }))
  ];
}
