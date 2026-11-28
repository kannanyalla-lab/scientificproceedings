import Link from "next/link";
import type { Article, Issue } from "@/db/schema";
import { articlePdfHref, journalRef } from "@/lib/format";
import { JOURNAL_ABBR } from "@/lib/site";
import Authors from "./Authors";
import ShareButton from "./ShareButton";

export function TypeBadge({ type }: { type: string }) {
  return <span className={`badge ${type.startsWith("Case") ? "badge--case" : ""}`}>{type}</span>;
}

function Actions({ a, issue }: { a: Article; issue?: Issue | null }) {
  const pdf = articlePdfHref(a, issue);
  return (
    <div className="card__actions">
      <Link href={`/article/${a.slug}#abstract`}>Abstract</Link>
      {pdf ? <a href={pdf} target="_blank" rel="noopener">PDF</a> : null}
      <Link href={`/article/${a.slug}?mode=print`}>Print</Link>
      <ShareButton path={`/article/${a.slug}`} title={a.title} />
    </div>
  );
}

export default function ArticleCard({ a, issue }: { a: Article; issue?: Issue | null }) {
  return (
    <article className="card">
      {a.imageUrl ? (
        <Link className="card__img" href={`/article/${a.slug}`} tabIndex={-1} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img loading="lazy" src={a.imageUrl} alt="" />
        </Link>
      ) : null}
      <div className="card__body">
        <div><TypeBadge type={a.articleType} /></div>
        <h3 className="card__title"><Link href={`/article/${a.slug}`}>{a.title}</Link></h3>
        <p className="card__authors"><Authors authors={a.authors} /></p>
        <p className="card__meta"><em>{JOURNAL_ABBR}.</em> {journalRef(a, issue)}</p>
        <Actions a={a} issue={issue} />
      </div>
    </article>
  );
}

export function ArticleRow({ a, issue }: { a: Article; issue?: Issue | null }) {
  return (
    <article className={`toc-item ${a.imageUrl ? "" : "toc-item--noimg"}`}>
      {a.imageUrl ? (
        <Link href={`/article/${a.slug}`} className="toc-item__img" tabIndex={-1} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img loading="lazy" src={a.imageUrl} alt="" />
        </Link>
      ) : null}
      <div>
        <TypeBadge type={a.articleType} />
        <h3><Link href={`/article/${a.slug}`}>{a.title}</Link></h3>
        <p className="card__authors"><Authors authors={a.authors} /></p>
        <p className="card__meta"><em>{JOURNAL_ABBR}.</em> {journalRef(a, issue)}</p>
        <Actions a={a} issue={issue} />
      </div>
    </article>
  );
}
