import type { Metadata } from "next";
import Link from "next/link";
import JournalFacts from "@/components/JournalFacts";
import { getJournalConfig } from "@/lib/journal-config";

export const metadata: Metadata = { title: "Contact", alternates: { canonical: "/contact" } };

export default async function ContactPage() {
  const cfg = await getJournalConfig();
  const org = {
    "@context": "https://schema.org", "@type": "Organization", name: cfg.publisher, address: cfg.publisherAddress,
    email: cfg.contactEmail, telephone: cfg.contactPhone || undefined,
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(org).replace(/</g, "\\u003c") }} />
      <div className="page-head">
        <div className="container">
          <div className="crumbs"><Link href="/">Home</Link><span aria-hidden>›</span><span>Contact</span></div>
          <h1>Contact</h1>
          <p>Write to the editorial office about submissions, peer review, permissions or corrections.</p>
        </div>
      </div>
      <div className="section"><div className="container about-layout">
        <div className="prose">
          <h2>Editorial office</h2>
          <p>
            {cfg.title}<br />
            {cfg.editorInChief ? <>Editor-in-Chief: {cfg.editorInChief}<br /></> : null}
            {cfg.publisherAddress}
          </p>
          <p>
            Email: <a href={`mailto:${cfg.contactEmail}`}>{cfg.contactEmail}</a>
            {cfg.contactPhone ? <><br />Phone: {cfg.contactPhone}</> : null}
          </p>
          <h2>Submitting a manuscript</h2>
          <p>Please use the <Link href="/submit">manuscript submission form</Link> and read the <Link href="/policies/author-guidelines">author guidelines</Link> first.</p>
          <h2>Concerns about published work</h2>
          <p>Possible errors, ethical concerns or misconduct can be raised in confidence by email. They are handled as described in the <Link href="/policies/publication-ethics">publication ethics policy</Link>.</p>
        </div>
        <JournalFacts current="contact" />
      </div></div>
    </>
  );
}
