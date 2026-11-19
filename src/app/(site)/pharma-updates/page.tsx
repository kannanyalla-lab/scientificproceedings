import type { Metadata } from "next";
import Link from "next/link";
import { issuesById, listPharmaUpdates } from "@/lib/queries";
import { excerpt, issueShort } from "@/lib/format";

export const metadata: Metadata = { title: "Pharma Updates", description: "The latest in medicines, medication safety and treatment guidelines." };

export default async function PharmaList() {
  const items = await listPharmaUpdates();
  const issues = await issuesById(items.map((i) => i.issueId));
  return (
    <>
      <div className="page-head">
        <div className="container">
          <div className="crumbs"><Link href="/">Home</Link><span aria-hidden>›</span><span>Pharma Updates</span></div>
          <h1>Pharma Updates</h1>
          <p>Stay informed with the latest in medicines, medication safety and treatment guidelines, from the KIMSHEALTH pharmacy team.</p>
        </div>
      </div>
      <div className="container section">
        {items.length === 0 ? <p className="notice">No updates yet.</p> : null}
        <div className="grid grid--3">
          {items.map((p) => {
            const issue = p.issueId ? issues.get(p.issueId) : null;
            return (
              <article key={p.id} className="card">
                {p.imageUrl ? (
                  <Link className="card__img" href={`/pharma-updates/${p.slug}`} tabIndex={-1} aria-hidden="true">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.imageUrl} alt="" loading="lazy" />
                  </Link>
                ) : null}
                <div className="card__body">
                  {issue ? <span className="card__meta">{issue.month} {issue.year} · {issueShort(issue)}</span> : null}
                  <h3 className="card__title"><Link href={`/pharma-updates/${p.slug}`}>{p.title}</Link></h3>
                  <p className="card__authors">{excerpt(p.summary, 180)}</p>
                  <div className="card__actions"><Link href={`/pharma-updates/${p.slug}`}>Read more</Link></div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </>
  );
}
