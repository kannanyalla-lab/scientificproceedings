import type { Metadata } from "next";
import Link from "next/link";
import type { Issue, PharmaUpdate } from "@/db/schema";
import { listIssues, listPharmaUpdates } from "@/lib/queries";
import { excerpt, issueShort } from "@/lib/format";

export const metadata: Metadata = { title: "Pharma Updates", description: "The latest in medicines, medication safety and treatment guidelines." };

function Card({ p, issue }: { p: PharmaUpdate; issue: Issue | null }) {
  return (
    <article className="card">
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
}

export default async function PharmaList({ searchParams }: PageProps<"/pharma-updates">) {
  const sp = await searchParams;
  const [items, allIssues] = await Promise.all([listPharmaUpdates(), listIssues()]);
  // Editions newest first (listIssues is ordered by year, volume and issue number), each with its updates.
  const groups = allIssues
    .map((issue) => ({ issue, items: items.filter((p) => p.issueId === issue.id) }))
    .filter((g) => g.items.length);
  const published = new Set(allIssues.map((i) => i.id));
  const loose = items.filter((p) => p.issueId == null || !published.has(p.issueId));
  const selected = typeof sp.issue === "string" ? groups.find((g) => g.issue.slug === sp.issue) : undefined;
  const shown = selected ? [selected] : groups;

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
        {groups.length > 1 ? (
          <nav className="tabs" aria-label="Choose edition">
            <Link href="/pharma-updates" aria-current={!selected ? "true" : undefined}>All editions</Link>
            {groups.map(({ issue }) => (
              <Link key={issue.id} href={`/pharma-updates?issue=${issue.slug}`} aria-current={selected?.issue.id === issue.id ? "true" : undefined}>
                {issue.month} {issue.year}
              </Link>
            ))}
          </nav>
        ) : null}
        {shown.map(({ issue, items: list }) => (
          <section key={issue.id} id={issue.slug} style={{ marginBottom: 40 }}>
            <h2 style={{ marginBottom: 4 }}>{issue.month} {issue.year}</h2>
            <p className="muted" style={{ marginTop: 0, marginBottom: 18 }}>
              {issueShort(issue)} · {list.length} update{list.length === 1 ? "" : "s"}
              {issue.pharmaContributors ? <> · Compiled by {issue.pharmaContributors}</> : null}
            </p>
            <div className="grid grid--3">
              {list.map((p) => <Card key={p.id} p={p} issue={issue} />)}
            </div>
          </section>
        ))}
        {!selected && loose.length ? (
          <section style={{ marginBottom: 40 }}>
            <h2>Other updates</h2>
            <div className="grid grid--3">{loose.map((p) => <Card key={p.id} p={p} issue={null} />)}</div>
          </section>
        ) : null}
      </div>
    </>
  );
}
