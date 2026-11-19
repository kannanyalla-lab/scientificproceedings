"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { JOURNAL, LOGO_URL, TAGLINE } from "@/lib/site";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/issue/current", label: "Current Issue", match: "/issue" },
  { href: "/issues", label: "Archive" },
  { href: "/pharma-updates", label: "Pharma Updates" },
  { href: "/radiology-spotters", label: "Radiology Spotters" },
  { href: "/scramble", label: "Scramble" },
  { href: "/about", label: "About" },
];

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string, match?: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(match || href);

  return (
    <>
      <div className="topbar">
        <div className="container">
          <span>{TAGLINE}</span>
          <span>
            <Link href="/submit">Submit a manuscript</Link>
          </span>
        </div>
      </div>
      <header className="site-header">
        <div className="container site-header__row" style={{ position: "relative" }}>
          <Link href="/" className="brand" aria-label={`${JOURNAL} home`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_URL} alt="KIMSHEALTH" />
            <span className="brand__text">
              <span className="brand__name">Scientific Proceedings</span>
              <span className="brand__tag">Clinical &amp; Scientific Research Journal</span>
            </span>
          </Link>
          <button className="menu-toggle" aria-expanded={open} aria-controls="site-nav" onClick={() => setOpen(!open)}>
            {open ? "Close" : "Menu"}
          </button>
          <nav id="site-nav" className={`nav ${open ? "is-open" : ""}`} aria-label="Main" onClick={() => setOpen(false)}>
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} aria-current={isActive(n.href, n.match) ? "page" : undefined}>
                {n.label}
              </Link>
            ))}
            <form action="/search" className="search-mini" role="search" onClick={(e) => e.stopPropagation()}>
              <label htmlFor="q-mini" className="sr-only">Search articles</label>
              <input id="q-mini" name="q" type="search" placeholder="Search articles" />
              <button type="submit" aria-label="Search">⌕</button>
            </form>
          </nav>
        </div>
      </header>
    </>
  );
}
