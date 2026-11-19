import Link from "next/link";
import { JOURNAL, PUBLISHER } from "@/lib/site";

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
              <li><Link href="/radiology-spotters">Radiology Spotters</Link></li>
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
        <div className="footer-bottom">
          <span>Copyright © {year} KIMSHEALTH. All rights reserved.</span>
          <Link href="/admin">Editor login</Link>
        </div>
      </div>
    </footer>
  );
}
