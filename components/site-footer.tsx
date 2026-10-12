import Link from "next/link";
import Image from "next/image";
import type { SocialLinks } from "@/lib/site-content";

export function SiteFooter({ contactId, socialLinks }: { contactId?: string; socialLinks?: SocialLinks }) {
  return (
    <footer className="site-footer" id={contactId}>
      <div className="container footer-layout">
        <div>
          <Link className="brand brand-logo-link" href="/" aria-label="LakuLokal, beranda">
            <Image className="brand-logo" src="/brand/lakulokal-logo-dark.svg" alt="" width={420} height={156} />
          </Link>
          <p>Pilih video dari perangkat, lalu unduh clip yang dibuat di browser.</p>
        </div>
        <div className="footer-links">
          <nav aria-label="Navigasi footer">
            <Link href="/artikel">Artikel</Link>
            <Link href="/#cara-kerja">Cara kerja</Link>
            <Link href="/#harga">Harga</Link>
            <Link href="/terms">Syarat Layanan</Link>
            <Link href="/privacy">Kebijakan Privasi</Link>
          </nav>
          {(socialLinks?.instagramUrl || socialLinks?.facebookUrl || socialLinks?.tiktokUrl) && (
            <nav className="footer-socials" aria-label="Media sosial LakuLokal">
              {socialLinks?.instagramUrl && (
                <a href={socialLinks.instagramUrl} target="_blank" rel="noreferrer" aria-label="Instagram LakuLokal, buka tab baru">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="18" cy="6" r="1.25" fill="currentColor" /></svg>
                </a>
              )}
              {socialLinks?.facebookUrl && (
                <a href={socialLinks.facebookUrl} target="_blank" rel="noreferrer" aria-label="Facebook LakuLokal, buka tab baru">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.6 21v-8h2.7l.4-3.1h-3.1v-2c0-.9.3-1.5 1.6-1.5h1.7V3.6c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.1H7.4V13h2.8v8z" /></svg>
                </a>
              )}
              {socialLinks?.tiktokUrl && (
                <a href={socialLinks.tiktokUrl} target="_blank" rel="noreferrer" aria-label="TikTok LakuLokal, buka tab baru">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19.6 8.2a6.7 6.7 0 0 1-4.1-1.4v7.1a5.7 5.7 0 1 1-5-5.7v3.6a2.2 2.2 0 1 0 1.5 2.1V2.5H15a4.9 4.9 0 0 0 4.6 4.9z" /></svg>
                </a>
              )}
            </nav>
          )}
        </div>
      </div>
    </footer>
  );
}
