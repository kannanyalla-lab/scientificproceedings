import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getIssueArticles, getIssueBySlug } from "@/lib/queries";
import { issueLabel } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/issue/[slug]/read">): Promise<Metadata> {
  const issue = await getIssueBySlug((await params).slug);
  return { title: issue ? `Read the printed issue · ${issue.month} ${issue.year}` : "Issue not found" };
}

/** The printed issue page by page, as it appears in the flipbook. */
export default async function ReadIssuePage({ params }: PageProps<"/issue/[slug]/read">) {
  const issue = await getIssueBySlug((await params).slug);
  if (!issue || !issue.pageImages.length) notFound();
  const articles = await getIssueArticles(issue.id);
  const label = (i: number) => {
    const p = i + 1 - issue.pageOffset;
    if (i === 0) return "Cover";
    if (i === issue.pageImages.length - 1) return "Back cover";
    return p > 0 ? `Page ${p}` : "Inside cover";
  };

  return (
    <>
      <div className="page-head">
        <div className="container">
          <div className="crumbs"><Link href="/">Home</Link><span aria-hidden>›</span><Link href={`/issue/${issue.slug}`}>{issue.month} {issue.year}</Link><span aria-hidden>›</span><span>Printed issue</span></div>
          <h1>Printed issue</h1>
          <p>{issueLabel(issue)} · {issue.pageImages.length} pages</p>
          <div className="article-actions">
            <a className="btn btn--primary" href={`/issue/${issue.slug}/pdf?download`}>Download full issue (PDF)</a>
            <a className="btn btn--ghost" href={`/issue/${issue.slug}/pdf`} target="_blank" rel="noopener">Open PDF</a>
            <Link className="btn btn--ghost" href={`/issue/${issue.slug}`}>Table of contents</Link>
          </div>
        </div>
      </div>
      <div className="container reader">
        <nav className="reader__nav" aria-label="Jump to an article">
          <h3>Jump to</h3>
          <a href="#img-1">Cover</a>
          {articles.filter((a) => a.pageStart).map((a) => (
            <a key={a.id} href={`#img-${parseInt(a.pageStart!, 10) + issue.pageOffset}`}>
              <span className="reader__pg">{a.pageStart}</span> {a.title}
            </a>
          ))}
        </nav>
        <div className="reader__pages">
          {issue.pageImages.map((src, i) => (
            <figure key={src} id={`img-${i + 1}`} className="reader__page">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`${label(i)} of ${issueLabel(issue)}`} loading={i < 2 ? "eager" : "lazy"} width={1053} height={1406} />
              <figcaption>{label(i)}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </>
  );
}
