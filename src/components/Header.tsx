"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { JOURNAL, LOGO_URL, TAGLINE } from "@/lib/site";
import HeaderSearch from "./search/HeaderSearch";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/issue/current", label: "Current Issue", match: "/issue" },
  { href: "/issues", label: "Archive" },
  { href: "/pharma-updates", label: "Pharma Updates" },
  { href: "/radiology-spotters", label: "Spotters" },
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
          <span className="topbar__tag">{TAGLINE}</span>
          <div className="topbar__right">
            <HeaderSearch />
            <Link href="/submit">Submit a manuscript</Link>
          </div>
        </div>
      </div>
      <header className="site-header">
        <div className="container site-header__row" style={{ position: "relative" }}>
          <Link href="/" className="brand" aria-label={`${JOURNAL} home`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_URL} alt={JOURNAL} />
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
          </nav>
        </div>
      </header>
    </>
  );
}
