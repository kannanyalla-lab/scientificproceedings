import type { Metadata } from "next";
import Link from "next/link";
import { inline } from "@/lib/importer/markup";
import { notFound } from "next/navigation";
import { after } from "next/server";
import Authors from "@/components/Authors";
import { TypeBadge } from "@/components/ArticleCard";
import CopyButton from "@/components/CopyButton";
import PrintButton from "@/components/PrintButton";
import ShareButton from "@/components/ShareButton";
import References from "@/components/References";
import { getArticleBySlug, getIssueArticles, incrementViews } from "@/lib/queries";
import { anchorId, articlePdfHref, citation, excerpt, issueLabel, pagesOf } from "@/lib/format";
import { JOURNAL, SITE_URL } from "@/lib/site";
import ScholarlyMeta from "@/components/ScholarlyMeta";
import { getJournalConfig, issns } from "@/lib/journal-config";
import { abstractPlain, articleUrl, authorRecords, isoMonth, licenceInfo, pdfUrl as absPdfUrl } from "@/lib/indexing/common";


export async function generateMetadata({ params }: PageProps<"/article/[slug]">): Promise<Metadata> {
  const data = await getArticleBySlug((await params).slug);
  if (!data) return { title: "Article not found" };
  const { article: a } = data;
  const description = excerpt(a.abstract.map((s) => s.text).join(" ") || a.title, 180);
  const abs = (u?: string | null) => (u ? new URL(u, SITE_URL).toString() : undefined);
  return {
    title: a.title,
    description,
    keywords: a.keywords,
    alternates: { canonical: `/article/${a.slug}` },
    openGraph: { type: "article", title: a.title, description, images: a.imageUrl ? [abs(a.imageUrl)!] : [] },
    twitter: { card: a.imageUrl ? "summary_large_image" : "summary" },
  };
}

export default async function ArticlePage({ params, searchParams }: PageProps<"/article/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const data = await getArticleBySlug(slug);
  if (!data) notFound();
  const { article: a, issue } = data;
  after(() => incrementViews(a.id));

  const siblings = issue ? await getIssueArticles(issue.id) : [];
  const idx = siblings.findIndex((x) => x.id === a.id);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;

  const cite = citation(a, issue);
  const pdf = articlePdfHref(a, issue);
  const printedPage = issue && a.pageStart && issue.pageImages.length ? parseInt(a.pageStart, 10) + issue.pageOffset : null;
  const pages = pagesOf(a);
  const headings = [...(a.bodyHtml || "").matchAll(/<h2[^>]*id="([^"]+)"[^>]*>(.*?)<\/h2>/g)].map((m) => ({ id: m[1], text: m[2].replace(/<[^>]+>/g, "") }));

  const cfg = await getJournalConfig();
  const lic = licenceInfo(cfg);
  const absText = abstractPlain(a);
  const pdfAbs = absPdfUrl(cfg, a, issue);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ScholarlyArticle",
    "@id": articleUrl(cfg, a),
    headline: a.title.length > 110 ? undefined : a.title,
    name: a.title,
    author: authorRecords(a).map((x) => ({
      "@type": "Person", name: x.name, givenName: x.given || undefined, familyName: x.surname,
      affiliation: x.affs.length ? x.affs.map((n) => ({ "@type": "Organization", name: n })) : undefined,
      email: x.email,
    })),
    abstract: absText || undefined,
    description: absText ? excerpt(absText, 300) : undefined,
    keywords: a.keywords.join(", ") || undefined,
    genre: a.articleType,
    inLanguage: cfg.language,
    datePublished: issue ? isoMonth(issue) : undefined,
    identifier: a.doi ? { "@type": "PropertyValue", propertyID: "DOI", value: a.doi } : undefined,
    sameAs: a.doi ? `https://doi.org/${a.doi}` : undefined,
    isPartOf: issue ? {
      "@type": "PublicationIssue", issueNumber: issue.number, datePublished: isoMonth(issue),
      isPartOf: { "@type": "PublicationVolume", volumeNumber: issue.volume, isPartOf: { "@type": "Periodical", name: cfg.title, issn: issns(cfg).map((x) => x.issn), publisher: { "@type": "Organization", name: cfg.publisher } } },
    } : undefined,
    pageStart: a.pageStart || undefined,
    pageEnd: a.pageEnd || undefined,
    pagination: pages || undefined,
    publisher: { "@type": "Organization", name: cfg.publisher },
    license: lic.url,
    isAccessibleForFree: true,
    copyrightHolder: cfg.copyrightHolder,
    copyrightYear: issue?.year,
    image: a.imageUrl ? new URL(a.imageUrl, SITE_URL).toString() : undefined,
    url: articleUrl(cfg, a),
    encoding: pdfAbs ? { "@type": "MediaObject", contentUrl: pdfAbs, encodingFormat: "application/pdf" } : undefined,
    citation: a.refs.length ? a.refs.map((r) => ({ "@type": "CreativeWork", name: r.replace(/<[^>]+>/g, "") })) : undefined,
  };

  return (
    <>
      <ScholarlyMeta article={a} issue={issue} cfg={cfg} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="article-head">
        <div className="container">
          <div className="crumbs no-print">
            <Link href="/">Home</Link><span aria-hidden>›</span>
            {issue ? <><Link href={`/issue/${issue.slug}`}>{issue.month} {issue.year}</Link><span aria-hidden>›</span><Link href={`/issue/${issue.slug}#${anchorId(a.articleType)}`}>{a.articleType}</Link></> : <span>{a.articleType}</span>}
          </div>
          <p className="print-only"><strong>{JOURNAL}</strong></p>
          <TypeBadge type={a.articleType} />
          <h1>{a.title}</h1>
          <p className="article-authors"><Authors authors={a.authors} /></p>
          <p className="article-meta"><em>{JOURNAL}</em>{issue ? ` · ${issueLabel(issue)}` : ""}{pages ? ` · Pages ${pages}` : ""}{a.doi ? <> · DOI <a href={`https://doi.org/${a.doi}`}>{a.doi}</a></> : null}</p>
          <div className="article-actions">
            <a className="btn btn--ghost" href="#abstract">Abstract</a>
            {pdf ? <a className="btn btn--primary" href={pdf} target="_blank" rel="noopener">PDF</a> : null}
            {printedPage ? <Link className="btn btn--ghost" href={`/issue/${issue!.slug}/read#img-${printedPage}`}>View printed pages</Link> : null}
            <PrintButton auto={sp.mode === "print"} />
            <ShareButton path={`/article/${a.slug}`} title={a.title} className="btn btn--ghost" />
            <CopyButton text={cite} label="Cite" className="btn btn--ghost" />
          </div>
        </div>
      </div>

      <div className="container article-layout">
        <div className="article-body">
          <section id="abstract" className="abstract">
            <h2>Abstract</h2>
            {a.abstract.length ? a.abstract.map((s, i) => (
              <div key={i}>
                {s.heading ? <h3>{s.heading}</h3> : null}
                <p dangerouslySetInnerHTML={{ __html: inline(s.text) }} />
              </div>
            )) : <p className="muted">The abstract for this article is available in the {pdf ? <a href={pdf} target="_blank" rel="noopener">PDF</a> : "PDF"}.</p>}
            {a.keywords.length ? (
              <p style={{ marginTop: 14, marginBottom: 0 }}>
                <strong style={{ fontSize: ".85rem" }}>Keywords: </strong>
                {a.keywords.map((k) => <Link key={k} className="chip" href={`/search?q=${encodeURIComponent(k)}`}>{k}</Link>)}
              </p>
            ) : null}
          </section>

          {a.bodyHtml ? <div dangerouslySetInnerHTML={{ __html: a.bodyHtml }} /> : (
            pdf ? <p className="notice no-print">The full text of this article is available as a <a href={pdf} target="_blank" rel="noopener">PDF</a>.</p> : null
          )}

          {a.notesHtml ? (
            <section className="declarations">
              <h2 id="declarations">Declarations</h2>
              <div dangerouslySetInnerHTML={{ __html: a.notesHtml }} />
            </section>
          ) : null}

          {a.refs.length ? (
            <section>
              <h2 id="references">References</h2>
              <References refs={a.refs} />
            </section>
          ) : null}

          <nav className="no-print" style={{ display: "flex", justifyContent: "space-between", gap: 16, marginTop: 40, borderTop: "1px solid var(--line)", paddingTop: 20 }} aria-label="More from this issue">
            <div style={{ maxWidth: "48%" }}>{prev ? <><div className="muted" style={{ fontSize: ".8rem" }}>← Previous</div><Link href={`/article/${prev.slug}`}>{prev.title}</Link></> : null}</div>
            <div style={{ maxWidth: "48%", textAlign: "right" }}>{next ? <><div className="muted" style={{ fontSize: ".8rem" }}>Next →</div><Link href={`/article/${next.slug}`}>{next.title}</Link></> : null}</div>
          </nav>
        </div>

        <aside className="article-side">
          <div className="side-box">
            <h3>Article info</h3>
            <dl>
              <dt>Type</dt><dd>{a.articleType}</dd>
              {issue ? <><dt>Issue</dt><dd><Link href={`/issue/${issue.slug}`}>Vol {issue.volume}, Issue {issue.number}</Link></dd><dt>Published</dt><dd>{issue.month} {issue.year}</dd></> : null}
              {pages ? <><dt>Pages</dt><dd>{pages}</dd></> : null}
              <dt>Views</dt><dd>{a.views + 1}</dd>
            </dl>
          </div>
          {a.affiliations.length ? (
            <div className="side-box">
              <h3>Author affiliations</h3>
              {a.affiliations.map((af) => <p key={af.key} style={{ marginBottom: 8 }}><sup>{af.key}</sup> {af.text}</p>)}
            </div>
          ) : null}
          {a.correspondingAuthor ? (
            <div className="side-box">
              <h3>Corresponding author</h3>
              <p style={{ marginBottom: 6 }}>{a.correspondingAuthor}</p>
              {a.correspondingEmail ? <a href={`mailto:${a.correspondingEmail}`}>{a.correspondingEmail}</a> : null}
            </div>
          ) : null}
          {headings.length ? (
            <div className="side-box no-print">
              <h3>On this page</h3>
              <nav style={{ display: "grid", gap: 4 }}>
                <a href="#abstract">Abstract</a>
                {headings.map((h) => <a key={h.id} href={`#${h.id}`}>{h.text}</a>)}
                {a.notesHtml ? <a href="#declarations">Declarations</a> : null}
                {a.refs.length ? <a href="#references">References</a> : null}
              </nav>
            </div>
          ) : null}
          <div className="side-box no-print">
            <h3>How to cite</h3>
            <div className="cite-box">{cite}</div>
            <div className="cite-actions">
              <CopyButton text={cite} label="Copy citation" />
              <a href={`/article/${a.slug}/cite?format=ris`}>RIS</a>
              <a href={`/article/${a.slug}/cite?format=bib`}>BibTeX</a>
              <a href={`/article/${a.slug}/jats?download`} title="JATS XML (for indexing services)">JATS XML</a>
            </div>
          </div>
          <div className="side-box licence-box">
            <h3>Open access</h3>
            <p style={{ marginBottom: 8 }}>
              © {issue?.year ?? ""} {cfg.copyrightHolder}. Published under the <a href={lic.url} target="_blank" rel="license noopener">{lic.label}</a> licence.
            </p>
            <Link href="/policies/open-access">Open access and licensing policy</Link>
          </div>
        </aside>
      </div>
    </>
  );
}
