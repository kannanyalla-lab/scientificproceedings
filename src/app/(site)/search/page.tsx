import type { Metadata } from "next";
import Link from "next/link";
import { ArticleRow } from "@/components/ArticleCard";
import { issuesById, searchArticles } from "@/lib/queries";
import { ARTICLE_TYPES } from "@/lib/site";

export const metadata: Metadata = { title: "Search articles" };

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 200) : "";
  const type = typeof sp.type === "string" && (ARTICLE_TYPES as readonly string[]).includes(sp.type) ? sp.type : "";
  const results = q || type ? await searchArticles(q, type || undefined) : [];
  const issues = await issuesById(results.map((r) => r.issueId));

  return (
    <>
      <div className="page-head">
        <div className="container">
          <div className="crumbs"><Link href="/">Home</Link><span aria-hidden>›</span><span>Search</span></div>
          <h1>Search articles</h1>
          <form action="/search" className="form" style={{ maxWidth: 760, marginTop: 14 }} role="search">
            <div className="form-row" style={{ gridTemplateColumns: "1fr 220px auto" }}>
              <div className="field">
                <label htmlFor="q" className="sr-only">Search terms</label>
                <input id="q" type="text" name="q" defaultValue={q} placeholder="Title, author, keyword or topic" autoFocus />
              </div>
              <div className="field">
                <label htmlFor="type" className="sr-only">Article type</label>
                <select id="type" name="type" defaultValue={type}>
                  <option value="">All article types</option>
                  {ARTICLE_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <button className="btn btn--primary" type="submit">Search</button>
            </div>
          </form>
        </div>
      </div>
      <div className="container section">
        {q || type ? (
          <p className="muted">{results.length} result{results.length === 1 ? "" : "s"}{q ? <> for “<strong>{q}</strong>”</> : null}{type ? ` in ${type}` : ""}</p>
        ) : <p className="muted">Search across titles, authors, keywords and abstracts in every issue.</p>}
        <div className="panel" style={{ padding: "0 24px", display: results.length ? "block" : "none" }}>
          {results.map((a) => <ArticleRow key={a.id} a={a} issue={a.issueId ? issues.get(a.issueId) : null} />)}
        </div>
      </div>
    </>
  );
}
