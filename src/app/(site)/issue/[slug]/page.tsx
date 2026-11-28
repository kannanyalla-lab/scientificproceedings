import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Authors from "@/components/Authors";
import { getCurrentIssue, getIssueArticles, getIssueBySlug, getScramble, getSpotters, listPharmaUpdates } from "@/lib/queries";
import { articlePdfHref, issueLabel, pagesOf } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/issue/[slug]">): Promise<Metadata> {
  const issue = await getIssueBySlug((await params).slug);
  if (!issue) return { title: "Issue not found" };
  return { title: `${issue.month} ${issue.year} · Volume ${issue.volume}, Issue ${issue.number}`, description: issue.description || undefined, openGraph: { images: issue.coverUrl ? [issue.coverUrl] : [] } };
}

export default async function IssuePage({ params }: PageProps<"/issue/[slug]">) {
  const issue = await getIssueBySlug((await params).slug);
  if (!issue) notFound();
  const [articles, current, pharma, spotters, scramble] = await Promise.all([
    getIssueArticles(issue.id), getCurrentIssue(), listPharmaUpdates(issue.id), getSpotters(issue.id), getScramble(issue.id),
  ]);
  const spotterGroups = [...new Set(spotters.map((s) => s.category))].map((cat) => [cat, spotters.filter((s) => s.category === cat).length] as const);
  const toc = [...articles].sort((x, y) => (parseInt(x.pageStart || "", 10) || 999) - (parseInt(y.pageStart || "", 10) || 999) || x.sortOrder - y.sortOrder);
  const hasPages = issue.pageImages.length > 0;

  return (
    <>
      <div className="page-head">
        <div className="container">
          <div className="crumbs"><Link href="/">Home</Link><span aria-hidden>›</span><Link href="/issues">Archive</Link><span aria-hidden>›</span><span>{issue.month} {issue.year}</span></div>
          <span className="eyebrow">{current?.id === issue.id ? "Current issue" : "Past issue"}</span>
          <h1>{issue.month} {issue.year}</h1>
          <p>{issueLabel(issue)} · {articles.length} article{articles.length === 1 ? "" : "s"}</p>
          {hasPages || issue.pdfUrl ? (
            <div className="article-actions">
              {hasPages ? <Link className="btn btn--primary" href={`/issue/${issue.slug}/read`}>Read the printed issue</Link> : null}
              <a className="btn btn--ghost" href={`/issue/${issue.slug}/pdf?download`}>Download full issue (PDF)</a>
            </div>
          ) : null}
        </div>
      </div>
      <div className="container issue-layout">
        <aside className="issue-aside">
          {issue.coverUrl ? (
            <Link href={hasPages ? `/issue/${issue.slug}/read` : `/issue/${issue.slug}`} className="issue-cover">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={issue.coverUrl} alt={`Cover of ${issueLabel(issue)}`} />
            </Link>
          ) : null}
          {issue.highlights.length ? (
            <div className="side-box">
              <h3>Issue highlights</h3>
              <ul className="highlights">{issue.highlights.map((h) => <li key={h}>{h}</li>)}</ul>
            </div>
          ) : null}
          <div className="side-box">
            <h3>In this issue</h3>
            <nav className="issue-aside__nav" aria-label="Sections in this issue">
              <a href="#contents"><span>Articles</span><span className="muted">{articles.length}</span></a>
              {pharma.length ? <a href="#pharma"><span>Pharma Updates</span><span className="muted">{pharma.length}</span></a> : null}
              {spotterGroups.map(([cat, n]) => <a key={cat} href={`#spotters-${cat.toLowerCase()}`}><span>{cat} Spotters</span><span className="muted">{n}</span></a>)}
              {scramble.length ? <a href="#scramble"><span>Scramble</span><span className="muted">{scramble.length}</span></a> : null}
              {issue.editorialBoard.length ? <Link href={`/about#board`}><span>Editorial board</span></Link> : null}
            </nav>
          </div>
        </aside>
        <div>
          <section id="contents" className="issue-group">
            <h2>Contents</h2>
            {toc.length === 0 ? <p className="notice">Articles for this issue will appear here soon.</p> : null}
            {toc.map((a) => {
              const pdf = articlePdfHref(a, issue);
              return (
                <article key={a.id} className={`toc-row${a.imageUrl ? "" : " toc-row--simple"}`}>
                  <div>
                    <span className="toc-row__type">{a.articleType}</span>
                    <h3><Link href={`/article/${a.slug}`}>{a.title}</Link></h3>
                    <p className="card__authors"><Authors authors={a.authors} /></p>
                    <div className="card__actions">
                      <Link href={`/article/${a.slug}#abstract`}>Abstract</Link>
                      <Link href={`/article/${a.slug}`}>Full text</Link>
                      {pdf ? <a href={pdf} target="_blank" rel="noopener">PDF{pagesOf(a) ? ` (pp. ${pagesOf(a)})` : ""}</a> : null}
                    </div>
                  </div>
                  {a.imageUrl ? (
                    <Link href={`/article/${a.slug}`} className="toc-row__img" tabIndex={-1} aria-hidden="true">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img loading="lazy" src={a.imageUrl} alt="" />
                    </Link>
                  ) : null}
                </article>
              );
            })}
          </section>

          {pharma.length ? (
            <section id="pharma" className="issue-group">
              <h2>Pharma Updates</h2>
              {issue.pharmaContributors ? <p className="muted">{issue.pharmaContributors}</p> : null}
              {pharma.map((p) => (
                <article key={p.id} className="toc-row toc-row--simple">
                  <div>
                    <h3><Link href={`/pharma-updates/${p.slug}`}>{p.title}</Link></h3>
                    {p.summary ? <p className="card__authors">{p.summary}</p> : null}
                  </div>
                </article>
              ))}
            </section>
          ) : null}

          {spotterGroups.map(([cat, n]) => (
            <section key={cat} id={`spotters-${cat.toLowerCase()}`} className="issue-group">
              <h2>{cat} Spotters</h2>
              {(cat === "Radiology" ? issue.spotterContributors : issue.dermSpotterContributors) ? <p className="muted">{cat === "Radiology" ? issue.spotterContributors : issue.dermSpotterContributors}</p> : null}
              <p>{cat === "Radiology" ? "A case-based quiz on diagnostic imaging" : `A case-based quiz featuring clinical images in ${cat}`}: {n} cases. <Link href={`/radiology-spotters?issue=${issue.slug}#${cat.toLowerCase()}`}>Take the quiz →</Link></p>
            </section>
          ))}

          {scramble.length ? (
            <section id="scramble" className="issue-group">
              <h2>Scramble</h2>
              {issue.scrambleContributors ? <p className="muted">{issue.scrambleContributors}</p> : null}
              <p>Unscramble {scramble.length} medical terms across {new Set(scramble.map((s) => s.specialty)).size} specialties. <Link href={`/scramble?issue=${issue.slug}`}>Play now →</Link></p>
            </section>
          ) : null}
          <p className="no-print"><a href="#main">↑ Back to top</a></p>
        </div>
      </div>
    </>
  );
}
