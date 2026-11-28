import Link from "next/link";
import { TypeBadge } from "@/components/ArticleCard";
import {
  articleCounts, getCurrentIssue, getIssueArticles, getScramble, getSpotters, issuesById, listIssues, listPharmaUpdates, mostRead,
} from "@/lib/queries";
import { anchorId, articlePdfHref, excerpt, groupByType, issueLabel, journalRef, pagesOf, typePlural } from "@/lib/format";
import { JOURNAL, JOURNAL_ABBR, TAGLINE } from "@/lib/site";

function shortAuthors(names: string[], max: number) {
  return names.length > max ? `${names.slice(0, max).join(", ")} et al.` : names.join(", ");
}
import { baseUrl, getJournalConfig, issns, licenceOf } from "@/lib/journal-config";

export default async function HomePage() {
  const issue = await getCurrentIssue();
  const [articles, allIssues, pharma] = await Promise.all([
    issue ? getIssueArticles(issue.id) : Promise.resolve([]),
    listIssues(),
    listPharmaUpdates(),
  ]);

  const [popular, counts, spots, scramble] = await Promise.all([
    mostRead(5),
    articleCounts(),
    issue ? getSpotters(issue.id) : Promise.resolve([]),
    issue ? getScramble(issue.id) : Promise.resolve([]),
  ]);
  const popularIssues = await issuesById(popular.map((a) => a.issueId));
  const spot = spots.find((c) => c.imageUrl) ?? spots[0];
  const scr = [...scramble].sort((a, b) => a.scrambled.length - b.scrambled.length)[0];

  // Editor's picks: featured articles first, then original research, then anything with a picture. No repeats.
  const rank = (a: (typeof articles)[number]) => (a.featured ? 0 : a.articleType === "Original Research" ? 1 : a.imageUrl ? 2 : 3);
  const ordered = [...articles].sort((a, b) => rank(a) - rank(b));
  const lead = ordered[0];
  const picks = ordered.slice(1).filter((a) => a.imageUrl).slice(0, 3);
  const leadAbstract = lead ? excerpt(lead.abstract.map((s) => s.text).join(" "), 320) : "";

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

      {articles.length && issue ? (
        <section className="section home-main">
          <div className="container home-layout">
            <div className="home-col">
              {lead ? (
                <div className="home-block">
                  <div className="home-block__head">
                    <div><span className="eyebrow">Featured in this issue</span><h2>Editor&apos;s picks</h2></div>
                  </div>
                  <article className="card lead-card">
                    {lead.imageUrl ? (
                      <Link className="lead-card__img" href={`/article/${lead.slug}`} tabIndex={-1} aria-hidden="true">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={lead.imageUrl} alt="" />
                      </Link>
                    ) : null}
                    <div className="card__body">
                      <div><TypeBadge type={lead.articleType} /></div>
                      <h3 className="lead-card__title"><Link href={`/article/${lead.slug}`}>{lead.title}</Link></h3>
                      <p className="card__authors">{shortAuthors(lead.authors.map((x) => x.name), 4)}</p>
                      {leadAbstract ? <p className="lead-card__abs">{leadAbstract}</p> : null}
                      <p className="card__meta"><em>{JOURNAL_ABBR}.</em> {journalRef(lead, issue)}</p>
                      <div className="card__actions">
                        <Link href={`/article/${lead.slug}`}>Read the article →</Link>
                        {articlePdfHref(lead, issue) ? <a href={articlePdfHref(lead, issue)!} target="_blank" rel="noopener">PDF</a> : null}
                      </div>
                    </div>
                  </article>
                  {picks.length ? (
                    <div className="pick-grid">
                      {picks.map((a) => (
                        <Link key={a.id} className="pick" href={`/article/${a.slug}`}>
                          <span className="pick__img">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img loading="lazy" src={a.imageUrl!} alt="" />
                          </span>
                          <span className="pick__type">{a.articleType}</span>
                          <strong>{a.title}</strong>
                          <small>{shortAuthors(a.authors.map((x) => x.name), 2)}</small>
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="home-block">
                <div className="home-block__head">
                  <div><span className="eyebrow">{issue.month} {issue.year} · Volume {issue.volume}, Issue {String(issue.number).padStart(2, "0")}</span><h2>In this issue</h2></div>
                  <Link href={`/issue/${issue.slug}`}>Full table of contents →</Link>
                </div>
                <div className="home-toc">
                  {groupByType(articles).map(([type, list]) => (
                    <div key={type} className="home-toc__group">
                      <h3>
                        <Link href={`/issue/${issue.slug}#${anchorId(type)}`}>{typePlural(type)}</Link>
                        <span>{list.length}</span>
                      </h3>
                      <ul>
                        {list.map((a) => {
                          const pdf = articlePdfHref(a, issue);
                          return (
                            <li key={a.id}>
                              <Link className="home-toc__title" href={`/article/${a.slug}`}>{a.title}</Link>
                              <span className="home-toc__meta">
                                {shortAuthors(a.authors.map((x) => x.name), 3)}
                                {pagesOf(a) ? <> · pp. {pagesOf(a)}</> : null}
                              </span>
                              <span className="home-toc__links">
                                <Link href={`/article/${a.slug}#abstract`}>Abstract</Link>
                                {pdf ? <a href={pdf} target="_blank" rel="noopener">PDF</a> : null}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <aside className="home-side">
              <form className="side-box home-search" action="/search" role="search">
                <h3>Search the journal</h3>
                <div>
                  <input type="search" name="q" placeholder="Title, author, keyword…" aria-label="Search the journal" />
                  <button className="btn btn--primary btn--sm" type="submit">Search</button>
                </div>
                <p>Try: <Link href="/search?q=sepsis">sepsis</Link>, <Link href="/search?q=stroke">stroke</Link>, <Link href="/search?q=paediatric">paediatric</Link></p>
              </form>

              <div className="side-box cta-box">
                <h3>Call for papers</h3>
                <p className="cta-box__big">Publish your research with us</p>
                <p>We welcome original research, case reports, reviews and clinical audits. {cfg.feesStatement}</p>
                <div className="cta-box__actions">
                  <Link className="btn btn--primary btn--sm" href="/submit">Submit a manuscript</Link>
                  <Link href="/policies/author-guidelines">Author guidelines →</Link>
                </div>
              </div>

              {popular.length ? (
                <div className="side-box">
                  <h3>{popular[0].views > 0 ? "Most read" : "Recently published"}</h3>
                  <ol className="rank-list">
                    {popular.map((a) => (
                      <li key={a.id}>
                        <Link href={`/article/${a.slug}`}>{a.title}</Link>
                        <small>{a.articleType}{popularIssues.get(a.issueId ?? -1) ? ` · ${popularIssues.get(a.issueId!)!.month} ${popularIssues.get(a.issueId!)!.year}` : ""}</small>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}

              <div className="side-box">
                <h3>Journal at a glance</h3>
                <dl className="journal-facts">
                  <dt>Frequency</dt><dd>{cfg.frequency}</dd>
                  {cfg.issnPrint ? <><dt>ISSN</dt><dd>{cfg.issnPrint}</dd></> : null}
                  {cfg.issnOnline ? <><dt>e-ISSN</dt><dd>{cfg.issnOnline}</dd></> : null}
                  <dt>Access</dt><dd>Free, open access</dd>
                  <dt>Review</dt><dd><Link href="/policies/peer-review">Peer reviewed</Link></dd>
                  <dt>Licence</dt><dd><a href={licenceOf(cfg).url} target="_blank" rel="license noopener">{licenceOf(cfg).short}</a></dd>
                  <dt>Publisher</dt><dd>{cfg.publisher}, {cfg.country}</dd>
                </dl>
                <p className="side-more"><Link href="/about">About the journal →</Link> · <Link href="/editorial-board">Editorial board →</Link></p>
              </div>

              <div className="side-box">
                <h3>Browse the archive</h3>
                <div className="mini-issues">
                  {allIssues.slice(0, 4).map((i) => (
                    <Link key={i.id} href={`/issue/${i.slug}`} className="mini-issue">
                      {i.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img loading="lazy" src={i.coverUrl} alt="" />
                      ) : <span className="mini-issue__ph">{i.volume}</span>}
                      <span><strong>{i.month} {i.year}</strong><small>Vol {i.volume} · Issue {String(i.number).padStart(2, "0")}{counts.get(i.id) ? ` · ${counts.get(i.id)} articles` : ""}</small></span>
                    </Link>
                  ))}
                </div>
                <p className="side-more"><Link href="/issues">All issues →</Link></p>
              </div>
            </aside>
          </div>
        </section>
      ) : (
        <section className="section"><div className="container"><p className="notice">No articles have been published yet. Editors can add them from the admin panel.</p></div></section>
      )}

      <section className="section section--tint">
        <div className="container">
          <div className="section__head">
            <div>
              <span className="eyebrow">Learn and test yourself</span>
              <h2>Beyond the research</h2>
            </div>
          </div>
          <div className="tiles beyond">
            <div className="tile">
              <span className="tile__icon" aria-hidden>℞</span>
              <h3><Link href="/pharma-updates">Pharma Updates</Link></h3>
              <p>The latest in medicines, safety alerts and treatment guidelines.</p>
              <ul className="beyond__list">
                {pharma.slice(0, 4).map((p) => <li key={p.id}><Link href={`/pharma-updates/${p.slug}`}>{p.title}</Link></li>)}
              </ul>
              <Link className="tile__go" href="/pharma-updates">All {pharma.length} updates →</Link>
            </div>
            <div className="tile">
              {spot?.imageUrl ? (
                <Link className="beyond__img" href="/radiology-spotters" tabIndex={-1} aria-hidden="true">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img loading="lazy" src={spot.imageUrl} alt="" />
                </Link>
              ) : <span className="tile__icon" aria-hidden>◐</span>}
              <h3><Link href="/radiology-spotters">Spotters</Link></h3>
              <p>{spot ? excerpt(spot.question, 120) : "Case-based image quizzes in radiology and dermatology."} Make your call, then reveal the answer.</p>
              <Link className="tile__go" href="/radiology-spotters">Take the quiz →</Link>
            </div>
            <div className="tile">
              <span className="tile__icon" aria-hidden>⁂</span>
              <h3><Link href="/scramble">Scramble</Link></h3>
              {scr ? (
                <div className="beyond__scr">
                  <span className="beyond__letters">
                    {scr.scrambled.toUpperCase().split(/\s+/).map((w, j) => (
                      <span key={j}>{w.split("").map((ch, k) => <b key={k}>{ch}</b>)}</span>
                    ))}
                  </span>
                  <small>{scr.specialty}: {excerpt(scr.clue, 90)}</small>
                </div>
              ) : null}
              <p>Unjumble the letters to reveal medical terms across specialties.</p>
              <Link className="tile__go" href="/scramble">Play now →</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
