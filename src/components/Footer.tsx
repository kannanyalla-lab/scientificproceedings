import Link from "next/link";
import { getJournalConfig, licenceOf } from "@/lib/journal-config";

const CORPORATE_LOGOS = [
  { src: "/brand/aster.png", alt: "Aster DM Healthcare", w: 548 },
  { src: "/brand/care.png", alt: "CARE Hospitals", w: 194 },
  { src: "/brand/evercare.png", alt: "Evercare", w: 281 },
  { src: "/brand/kimshealth.png", alt: "KIMSHEALTH", w: 229 },
];

export default async function Footer() {
  const year = new Date().getFullYear();
  const cfg = await getJournalConfig();
  const lic = licenceOf(cfg);
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <h4>{cfg.title}</h4>
            <p>A peer-reviewed, open access clinical and scientific research journal published by {cfg.publisher}, {cfg.country}.</p>
            {cfg.issnPrint || cfg.issnOnline ? (
              <p className="footer-issn">
                {cfg.issnPrint ? <span>ISSN {cfg.issnPrint} (Print)</span> : null}
                {cfg.issnOnline ? <span>e-ISSN {cfg.issnOnline} (Online)</span> : null}
              </p>
            ) : null}
            <p className="footer-licence">
              <a href={lic.url} target="_blank" rel="license noopener">{lic.short}</a> · Articles are free to read and share under this licence.
            </p>
          </div>
          <div>
            <h4>Journal</h4>
            <ul>
              <li><Link href="/issue/current">Current issue</Link></li>
              <li><Link href="/issues">Archive</Link></li>
              <li><Link href="/search">Search articles</Link></li>
              <li><Link href="/about">About the journal</Link></li>
              <li><Link href="/editorial-board">Editorial board</Link></li>
              <li><Link href="/contact">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4>Learn</h4>
            <ul>
              <li><Link href="/pharma-updates">Pharma Updates</Link></li>
              <li><Link href="/radiology-spotters">Spotters</Link></li>
              <li><Link href="/scramble">Scramble</Link></li>
            </ul>
          </div>
          <div>
            <h4>Authors</h4>
            <ul>
              <li><Link href="/submit">Submit a manuscript</Link></li>
              <li><Link href="/policies/author-guidelines">Author guidelines</Link></li>
              <li><Link href="/policies/peer-review">Peer review</Link></li>
              <li><Link href="/policies/publication-ethics">Publication ethics</Link></li>
              <li><Link href="/policies/open-access">Open access and licence</Link></li>
              <li><Link href="/policies">All policies</Link></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="footer-logos">
        <div className="container footer-logos__row">
          {CORPORATE_LOGOS.map((l) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={l.src} src={l.src} alt={l.alt} width={l.w} height={160} loading="lazy" />
          ))}
        </div>
      </div>
      <div className="container">
        <div className="footer-bottom">
          <span>© {year} {cfg.publisher}. Articles © their authors, published under {lic.short}.</span>
          <span className="footer-feeds"><a href="/feed.xml">RSS</a> · <a href="/oai?verb=Identify">OAI-PMH</a> · <a href="/sitemap.xml">Sitemap</a></span>
          <Link href="/admin">Editor login</Link>
        </div>
      </div>
    </footer>
  );
}
