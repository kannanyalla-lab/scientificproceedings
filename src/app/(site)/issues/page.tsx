import type { Metadata } from "next";
import Link from "next/link";
import { articleCounts, listIssues } from "@/lib/queries";
import { pad2 } from "@/lib/format";

export const metadata: Metadata = { title: "Archive", description: "Every published issue of KIMSHEALTH Scientific Proceedings." };

export default async function ArchivePage() {
  const [issues, counts] = await Promise.all([listIssues(), articleCounts()]);
  const years = new Map<number, typeof issues>();
  for (const i of issues) {
    if (!years.has(i.year)) years.set(i.year, []);
    years.get(i.year)!.push(i);
  }
  return (
    <>
      <div className="page-head">
        <div className="container">
          <div className="crumbs"><Link href="/">Home</Link><span aria-hidden>›</span><span>Archive</span></div>
          <h1>Archive</h1>
          <p>Browse every published issue, newest first.</p>
        </div>
      </div>
      <div className="container section">
        {issues.length === 0 ? <p className="notice">No issues have been published yet.</p> : null}
        {[...years.entries()].map(([year, list]) => (
          <div key={year} className="year-block">
            <h2>{year}</h2>
            <div className="grid grid--3">
              {list.map((i) => (
                <Link key={i.id} href={`/issue/${i.slug}`} className="issue-tile">
                  {i.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.coverUrl} alt="" />
                  ) : <div className="ph">{i.volume}</div>}
                  <div>
                    <strong style={{ fontFamily: "var(--serif)", fontSize: "1.1rem" }}>{i.month} {i.year}</strong>
                    <div className="muted" style={{ fontSize: ".9rem" }}>Volume {i.volume} · Issue {pad2(i.number)}</div>
                    <div style={{ fontSize: ".85rem", marginTop: 8 }}>{counts.get(i.id) ?? 0} articles</div>
                    {i.isCurrent ? <span className="badge" style={{ marginTop: 8 }}>Current</span> : null}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
