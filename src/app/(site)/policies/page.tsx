import type { Metadata } from "next";
import Link from "next/link";
import { getPolicies } from "@/lib/journal-config";

export const metadata: Metadata = { title: "Journal policies", alternates: { canonical: "/policies" } };

export default async function PoliciesPage() {
  const policies = await getPolicies();
  return (
    <>
      <div className="page-head">
        <div className="container">
          <div className="crumbs"><Link href="/">Home</Link><span aria-hidden>›</span><span>Policies</span></div>
          <h1>Journal policies</h1>
          <p>How the journal handles submissions, peer review, ethics, open access and the preservation of its content.</p>
        </div>
      </div>
      <div className="section"><div className="container">
        <div className="policy-list">
          <Link className="policy-card" href="/editorial-board"><h2>Editorial board</h2><p>The editors responsible for the journal.</p></Link>
          {policies.map((p) => (
            <Link key={p.slug} className="policy-card" href={`/policies/${p.slug}`}><h2>{p.title}</h2><p>{p.summary}</p></Link>
          ))}
          <Link className="policy-card" href="/contact"><h2>Contact</h2><p>How to reach the editorial office.</p></Link>
        </div>
      </div></div>
    </>
  );
}
