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
          <a className="footer-contact" href="mailto:halo@lakulokal.id">halo@lakulokal.id</a>
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
              {socialLinks?.instagramUrl && <a href={socialLinks.instagramUrl} target="_blank" rel="noreferrer" aria-label="Instagram LakuLokal, buka tab baru">Instagram</a>}
              {socialLinks?.facebookUrl && <a href={socialLinks.facebookUrl} target="_blank" rel="noreferrer" aria-label="Facebook LakuLokal, buka tab baru">Facebook</a>}
              {socialLinks?.tiktokUrl && <a href={socialLinks.tiktokUrl} target="_blank" rel="noreferrer" aria-label="TikTok LakuLokal, buka tab baru">TikTok</a>}
            </nav>
          )}
        </div>
      </div>
    </footer>
  );
}
