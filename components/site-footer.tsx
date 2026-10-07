import Link from "next/link";

export function SiteFooter({ contactId }: { contactId?: string }) {
  return (
    <footer className="site-footer" id={contactId}>
      <div className="container footer-layout">
        <div>
          <Link className="brand" href="/">LakuLokal</Link>
          <p>Kelola order clip YouTube dari satu akun.</p>
          <a className="footer-contact" href="mailto:halo@lakulokal.id">halo@lakulokal.id</a>
        </div>
        <nav aria-label="Navigasi footer">
          <Link href="/artikel">Artikel</Link>
          <Link href="/#cara-kerja">Cara kerja</Link>
          <Link href="/#harga">Harga</Link>
          <Link href="/terms">Syarat Layanan</Link>
          <Link href="/privacy">Kebijakan Privasi</Link>
        </nav>
      </div>
    </footer>
  );
}
