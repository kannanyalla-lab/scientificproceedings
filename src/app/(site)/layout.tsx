import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { baseUrl, getJournalConfig } from "@/lib/journal-config";

// Pages read live content from the database on every request.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getJournalConfig();
  const verification: Metadata["verification"] = {};
  if (cfg.googleVerification) verification.google = cfg.googleVerification;
  if (cfg.bingVerification) verification.other = { "msvalidate.01": cfg.bingVerification };
  return {
    metadataBase: new URL(baseUrl(cfg)),
    verification,
    alternates: { types: { "application/rss+xml": [{ url: "/feed.xml", title: `${cfg.title}: latest articles` }] } },
  };
}

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-frame">
      <a className="skip" href="#main">Skip to content</a>
      <div className="site-box">
        <Header />
        <main id="main">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
