import Link from "next/link";
import ArticleCard from "@/components/ArticleCard";
import { getCurrentIssue, getIssueArticles, listIssues, listPharmaUpdates } from "@/lib/queries";
import { anchorId, excerpt, groupByType, issueLabel, typePlural } from "@/lib/format";
import { JOURNAL, TAGLINE } from "@/lib/site";
import { baseUrl, getJournalConfig, issns, licenceOf } from "@/lib/journal-config";

export default async function HomePage() {
  const issue = await getCurrentIssue();
  const [articles, allIssues, pharma] = await Promise.all([
    issue ? getIssueArticles(issue.id) : Promise.resolve([]),
    listIssues(),
    listPharmaUpdates(),
  ]);

  // Highlights: featured articles first, otherwise the first few of each type. No repeats.
  const groups = groupByType(articles).map(([type, list]) => {
    const featured = list.filter((a) => a.featured);
    return [type, (featured.length ? featured : list).slice(0, 3)] as const;
  });

  const cfg = await getJournalConfig();
  const periodical = {
    "@context": "https://schema.org",
    "@type": "Periodical",
    "@id": `${baseUrl(cfg)}/#journal`,
    name: cfg.title,
    alternateName: cfg.abbrevTitle,
    issn: issns(cfg).map((x) => x.issn),
    url: baseUrl(cfg) + "/",
    publisher: { "@type": "Organization", name: cfg.publisher, address: cfg.publisherAddress, email: cfg.contactEmail },
    inLanguage: cfg.language,
    license: licenceOf(cfg).url,
    isAccessibleForFree: true,
    publishingPrinciples: `${baseUrl(cfg)}/policies/publication-ethics`,
    hasPart: issue ? { "@type": "PublicationIssue", issueNumber: issue.number, url: `${baseUrl(cfg)}/issue/${issue.slug}` } : undefined,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(periodical).replace(/</g, "\\u003c") }} />
      <section className="hero">
        <div className="container">
          <div>
            <span className="eyebrow">{TAGLINE}</span>
            <h1>{JOURNAL}</h1>
            <p className="lead">
              Peer-reviewed original research, case reports and clinical updates from the doctors, nurses and
              scientists of KIMSHEALTH.
            </p>
            <div className="hero__actions">
              <Link className="btn btn--primary" href="/issue/current">Read the current issue</Link>
              <Link className="btn btn--light" href="/submit">Submit a manuscript</Link>
            </div>
            <div className="hero__stats">
              <div><strong>{issue ? issue.volume : "–"}</strong><span>Volume</span></div>
              <div><strong>{allIssues.length}</strong><span>Issues online</span></div>
              <div><strong>{articles.length}</strong><span>Articles this issue</span></div>
            </div>
          </div>
          {issue ? (
            <div className="cover-card">
              {issue.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={issue.coverUrl} alt={`Cover of ${issueLabel(issue)}`} />
              ) : <div className="issue-tile"><div className="ph">{issue.volume}</div></div>}
              <div>
                <span className="eyebrow">Current issue</span>
                <h2>{issue.month} {issue.year}</h2>
                <p>Volume {issue.volume} · Issue {String(issue.number).padStart(2, "0")}</p>
                {issue.highlights.length ? (
                  <ul className="hero-highlights">{issue.highlights.slice(0, 5).map((h) => <li key={h}>{h}</li>)}</ul>
                ) : issue.description ? <p style={{ fontSize: ".92rem", color: "#c6d6e2" }}>{excerpt(issue.description, 140)}</p> : null}
                <Link href={`/issue/${issue.slug}`}>Table of contents →</Link>
                {issue.pageImages.length ? <> · <Link href={`/issue/${issue.slug}/read`}>Printed issue →</Link></> : null}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {groups.length ? (
        groups.map(([type, list], idx) => (
          <section key={type} className={`section ${idx % 2 ? "section--tint" : ""}`}>
            <div className="container">
              <div className="section__head">
                <div>
                  <span className="eyebrow">Issue highlights</span>
                  <h2>{typePlural(type)}</h2>
                </div>
                {issue ? <Link href={`/issue/${issue.slug}#${anchorId(type)}`}>View all {typePlural(type).toLowerCase()} →</Link> : null}
              </div>
              <div className="grid grid--3">
                {list.map((a) => <ArticleCard key={a.id} a={a} issue={issue} />)}
              </div>
            </div>
          </section>
        ))
      ) : (
        <section className="section"><div className="container"><p className="notice">No articles have been published yet. Editors can add them from the admin panel.</p></div></section>
      )}

      <section className="section">
        <div className="container">
          <div className="section__head">
            <div>
              <span className="eyebrow">Learn and test yourself</span>
              <h2>Beyond the research</h2>
            </div>
          </div>
          <div className="tiles">
            <Link className="tile" href="/pharma-updates">
              <span className="tile__icon" aria-hidden>℞</span>
              <h3>Pharma Updates</h3>
              <p>Stay informed with the latest in medicines, safety alerts and treatment guidelines.</p>
              <span className="tile__go">{pharma.length} updates →</span>
            </Link>
            <Link className="tile" href="/radiology-spotters">
              <span className="tile__icon" aria-hidden>◐</span>
              <h3>Spotters</h3>
              <p>Case-based image quizzes in radiology and dermatology. Study the image, make your call, then reveal the answer.</p>
              <span className="tile__go">Take the quiz →</span>
            </Link>
            <Link className="tile" href="/scramble">
              <span className="tile__icon" aria-hidden>⁂</span>
              <h3>Scramble</h3>
              <p>Use the jumbled letters and clues to reveal medical terms across specialties.</p>
              <span className="tile__go">Play now →</span>
            </Link>
          </div>
        </div>
      </section>

      {pharma.length ? (
        <section className="section section--tint">
          <div className="container">
            <div className="section__head">
              <div><span className="eyebrow">Pharma Updates</span><h2>Latest from the pharmacy</h2></div>
              <Link href="/pharma-updates">All updates →</Link>
            </div>
            <div className="grid grid--3">
              {pharma.slice(0, 3).map((p) => (
                <article key={p.id} className="card">
                  <div className="card__body">
                    <h3 className="card__title"><Link href={`/pharma-updates/${p.slug}`}>{p.title}</Link></h3>
                    <p className="card__authors">{excerpt(p.summary, 160)}</p>
                    <div className="card__actions"><Link href={`/pharma-updates/${p.slug}`}>Read more</Link></div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
