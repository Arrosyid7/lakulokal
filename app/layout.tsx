import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "LakuLokal | Clip Video YouTube",
    template: "%s | LakuLokal"
  },
  description: "Pilih paket, kirim tautan YouTube, lalu pantau pembayaran dan hasil clip dari satu akun LakuLokal.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://lakulokal.vercel.app"),
  applicationName: "LakuLokal",
  openGraph: {
    siteName: "LakuLokal",
    locale: "id_ID",
    type: "website"
  },
  twitter: {
    card: "summary"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&family=Nunito+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,500;1,600;1,700;1,800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
