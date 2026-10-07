export const siteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL || "https://lakulokal.vercel.app"
).origin;

export function absoluteUrl(path: string) {
  return new URL(path, `${siteUrl}/`).toString();
}
