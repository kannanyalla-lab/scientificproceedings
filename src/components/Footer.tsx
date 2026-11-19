import Link from "next/link";
import { JOURNAL, PUBLISHER } from "@/lib/site";

const CORPORATE_LOGOS = [
  { src: "/brand/aster.png", alt: "Aster DM Healthcare", w: 548 },
  { src: "/brand/care.png", alt: "CARE Hospitals", w: 194 },
  { src: "/brand/evercare.png", alt: "Evercare", w: 281 },
  { src: "/brand/kimshealth.png", alt: "KIMSHEALTH", w: 229 },
];

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <h4>{JOURNAL}</h4>
            <p>A peer-reviewed clinical and scientific research journal published by {PUBLISHER}.</p>
          </div>
          <div>
            <h4>Journal</h4>
            <ul>
              <li><Link href="/issue/current">Current issue</Link></li>
              <li><Link href="/issues">Archive</Link></li>
              <li><Link href="/search">Search articles</Link></li>
              <li><Link href="/about">About the journal</Link></li>
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
              <li><Link href="/about#guidelines">Author guidelines</Link></li>
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
          <span>Copyright © {year} KIMSHEALTH. All rights reserved.</span>
          <Link href="/admin">Editor login</Link>
        </div>
      </div>
    </footer>
  );
}
