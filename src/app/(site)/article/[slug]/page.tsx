import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import Authors from "@/components/Authors";
import { TypeBadge } from "@/components/ArticleCard";
import CopyButton from "@/components/CopyButton";
import PrintButton from "@/components/PrintButton";
import ShareButton from "@/components/ShareButton";
import { getArticleBySlug, getIssueArticles, incrementViews } from "@/lib/queries";
import { anchorId, citation, excerpt, issueLabel, pagesOf } from "@/lib/format";
import { JOURNAL, SITE_URL } from "@/lib/site";

const MONTH_NUM: Record<string, string> = { January: "01", February: "02", March: "03", April: "04", May: "05", June: "06", July: "07", August: "08", September: "09", October: "10", November: "11", December: "12" };

export async function generateMetadata({ params }: PageProps<"/article/[slug]">): Promise<Metadata> {
  const data = await getArticleBySlug((await params).slug);
  if (!data) return { title: "Article not found" };
  const { article: a, issue } = data;
  const description = excerpt(a.abstract.map((s) => s.text).join(" ") || a.title, 180);
  const abs = (u?: string | null) => (u ? new URL(u, SITE_URL).toString() : undefined);
  const other: Record<string, string | string[]> = {
    citation_title: a.title,
    citation_author: a.authors.map((x) => x.name),
    citation_journal_title: JOURNAL,
    citation_publisher: "KIMSHEALTH",
  };
  if (issue) {
    other.citation_volume = String(issue.volume);
    other.citation_issue = String(issue.number);
    other.citation_publication_date = `${issue.year}/${MONTH_NUM[issue.month] || "01"}`;
  }
  if (a.pageStart) other.citation_firstpage = a.pageStart;
  if (a.pageEnd) other.citation_lastpage = a.pageEnd;
  if (a.pdfUrl) other.citation_pdf_url = abs(a.pdfUrl)!;
  if (a.doi) other.citation_doi = a.doi;
  if (a.keywords.length) other.citation_keywords = a.keywords.join("; ");
  return {
    title: a.title,
    description,
    keywords: a.keywords,
    alternates: { canonical: `/article/${a.slug}` },
    openGraph: { type: "article", title: a.title, description, images: a.imageUrl ? [abs(a.imageUrl)!] : [] },
    twitter: { card: a.imageUrl ? "summary_large_image" : "summary" },
    other,
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
  const pages = pagesOf(a);
  const headings = [...(a.bodyHtml || "").matchAll(/<h2[^>]*id="([^"]+)"[^>]*>(.*?)<\/h2>/g)].map((m) => ({ id: m[1], text: m[2].replace(/<[^>]+>/g, "") }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ScholarlyArticle",
    headline: a.title,
    author: a.authors.map((x) => ({ "@type": "Person", name: x.name })),
    keywords: a.keywords.join(", "),
    isPartOf: issue ? { "@type": "PublicationIssue", issueNumber: issue.number, datePublished: `${issue.year}-${MONTH_NUM[issue.month] || "01"}`, isPartOf: { "@type": "PublicationVolume", volumeNumber: issue.volume, isPartOf: { "@type": "Periodical", name: JOURNAL } } } : undefined,
    pagination: pages || undefined,
    image: a.imageUrl || undefined,
    url: `${SITE_URL}/article/${a.slug}`,
  };

  return (
    <>
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
            {a.pdfUrl ? <a className="btn btn--primary" href={a.pdfUrl} target="_blank" rel="noopener">Download PDF</a> : null}
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
                <p>{s.text}</p>
              </div>
            )) : <p className="muted">The abstract for this article is available in the {a.pdfUrl ? <a href={a.pdfUrl} target="_blank" rel="noopener">PDF</a> : "PDF"}.</p>}
            {a.keywords.length ? (
              <p style={{ marginTop: 14, marginBottom: 0 }}>
                <strong style={{ fontSize: ".85rem" }}>Keywords: </strong>
                {a.keywords.map((k) => <Link key={k} className="chip" href={`/search?q=${encodeURIComponent(k)}`}>{k}</Link>)}
              </p>
            ) : null}
          </section>

          {a.bodyHtml ? <div dangerouslySetInnerHTML={{ __html: a.bodyHtml }} /> : (
            a.pdfUrl ? <p className="notice no-print">The full text of this article is available as a <a href={a.pdfUrl} target="_blank" rel="noopener">PDF</a>.</p> : null
          )}

          {a.refs.length ? (
            <section>
              <h2 id="references">References</h2>
              <ol className="refs">{a.refs.map((r, i) => <li key={i}>{r}</li>)}</ol>
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
                {a.refs.length ? <a href="#references">References</a> : null}
              </nav>
            </div>
          ) : null}
          <div className="side-box no-print">
            <h3>How to cite</h3>
            <div className="cite-box">{cite}</div>
            <CopyButton text={cite} label="Copy citation" />
          </div>
        </aside>
      </div>
    </>
  );
}
