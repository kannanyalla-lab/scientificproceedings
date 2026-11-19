import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleRow } from "@/components/ArticleCard";
import { getIssueArticles, getIssueBySlug, getCurrentIssue } from "@/lib/queries";
import { anchorId, groupByType, issueLabel, typePlural } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/issue/[slug]">): Promise<Metadata> {
  const issue = await getIssueBySlug((await params).slug);
  if (!issue) return { title: "Issue not found" };
  return { title: `${issue.month} ${issue.year} · Volume ${issue.volume}, Issue ${issue.number}`, description: issue.description || undefined, openGraph: { images: issue.coverUrl ? [issue.coverUrl] : [] } };
}

export default async function IssuePage({ params }: PageProps<"/issue/[slug]">) {
  const issue = await getIssueBySlug((await params).slug);
  if (!issue) notFound();
  const [articles, current] = await Promise.all([getIssueArticles(issue.id), getCurrentIssue()]);
  const groups = groupByType(articles);

  return (
    <>
      <div className="page-head">
        <div className="container">
          <div className="crumbs"><Link href="/">Home</Link><span aria-hidden>›</span><Link href="/issues">Archive</Link><span aria-hidden>›</span><span>{issue.month} {issue.year}</span></div>
          <span className="eyebrow">{current?.id === issue.id ? "Current issue" : "Past issue"}</span>
          <h1>{issue.month} {issue.year}</h1>
          <p>{issueLabel(issue)} · {articles.length} article{articles.length === 1 ? "" : "s"}</p>
        </div>
      </div>
      <div className="container issue-layout">
        <aside className="issue-aside">
          {issue.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={issue.coverUrl} alt={`Cover of ${issueLabel(issue)}`} />
          ) : null}
          <div>
            <h3 style={{ fontSize: "1rem" }}>Table of contents</h3>
            <nav aria-label="Sections in this issue">
              {groups.map(([type, list]) => (
                <a key={type} href={`#${anchorId(type)}`}><span>{typePlural(type)}</span><span className="muted">{list.length}</span></a>
              ))}
            </nav>
          </div>
        </aside>
        <div>
          {issue.description ? <p className="prose">{issue.description}</p> : null}
          {groups.length === 0 ? <p className="notice">Articles for this issue will appear here soon.</p> : null}
          {groups.map(([type, list]) => (
            <section key={type} id={anchorId(type)} className="issue-group">
              <h2>{typePlural(type)}</h2>
              {list.map((a) => <ArticleRow key={a.id} a={a} issue={issue} />)}
            </section>
          ))}
          <p className="no-print"><a href="#main">↑ Back to top</a></p>
        </div>
      </div>
    </>
  );
}
