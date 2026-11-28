import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import JournalFacts from "@/components/JournalFacts";
import { fillPolicy, getJournalConfig, getPolicy } from "@/lib/journal-config";
import { policyText, renderPolicy } from "@/lib/policies";
import { excerpt } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/policies/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [p, cfg] = await Promise.all([getPolicy(slug), getJournalConfig()]);
  if (!p) return { title: "Not found" };
  return { title: p.title, description: excerpt(policyText(fillPolicy(p.body, cfg)), 180), alternates: { canonical: `/policies/${p.slug}` } };
}

export default async function PolicyPage({ params }: PageProps<"/policies/[slug]">) {
  const { slug } = await params;
  const [p, cfg] = await Promise.all([getPolicy(slug), getJournalConfig()]);
  if (!p) notFound();
  return (
    <>
      <div className="page-head">
        <div className="container">
          <div className="crumbs"><Link href="/">Home</Link><span aria-hidden>›</span><Link href="/policies">Policies</Link><span aria-hidden>›</span><span>{p.title}</span></div>
          <h1>{p.title}</h1>
          <p>{p.summary}</p>
        </div>
      </div>
      <div className="section"><div className="container about-layout">
        <div className="prose" dangerouslySetInnerHTML={{ __html: renderPolicy(fillPolicy(p.body, cfg)) }} />
        <JournalFacts current={p.slug} />
      </div></div>
    </>
  );
}
