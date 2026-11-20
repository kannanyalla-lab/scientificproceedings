"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { KIND_BADGES, KIND_LABELS, SEARCH_KINDS, queryWords, type SearchKind, type SearchResponse } from "@/lib/search-shared";
import Highlight from "./Highlight";
import { useLiveSearch } from "./useLiveSearch";

type Props = { initialQ: string; initialKind: string; initialType: string; initial: SearchResponse | null; articleTypes: readonly string[] };

const EXAMPLES = ["diabetes", "case report", "stroke", "sepsis", "radiology"];

/** The /search page: results update as you type, and the address bar keeps the query so it can be shared. */
export default function SearchClient({ initialQ, initialKind, initialType, initial, articleTypes }: Props) {
  const [q, setQ] = useState(initialQ);
  const [kind, setKind] = useState(initialKind);
  const [type, setType] = useState(initialType);
  const live = useLiveSearch(q, { kind: kind || undefined, type: type || undefined, limit: "200" }, 150);
  const fresh = q === initialQ && kind === initialKind && type === initialType;
  const data = live.data ?? (fresh ? initial : null);
  const words = queryWords(q);

  useEffect(() => {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    if (kind) sp.set("kind", kind);
    if (type) sp.set("type", type);
    const url = `/search${sp.size ? `?${sp}` : ""}`;
    window.history.replaceState(window.history.state, "", url);
  }, [q, kind, type]);

  const setTab = (k: string) => { setKind(k); if (k !== "article") setType(""); };
  const total = data ? SEARCH_KINDS.reduce((n, k) => n + data.counts[k], 0) : 0;

  return (
    <>
      <div className="page-head">
        <div className="container">
          <div className="crumbs"><Link href="/">Home</Link><span aria-hidden>›</span><span>Search</span></div>
          <h1>Search the journal</h1>
          <p>Results appear as you type. Search article titles, authors, keywords, abstracts and full text, plus issues, Pharma Updates, Spotters, Scramble and site pages.</p>
          <form className="search-big" role="search" onSubmit={(e) => e.preventDefault()}>
            <label htmlFor="q" className="sr-only">Search terms</label>
            <span className="search-big__icon" aria-hidden>⌕</span>
            <input
              id="q" type="search" value={q} onChange={(e) => setQ(e.target.value)} autoFocus autoComplete="off"
              placeholder="Try a topic, author, keyword or drug name"
            />
            {live.loading ? <span className="search-big__spin" aria-label="Searching" /> : null}
            {q ? <button type="button" className="search-big__clear" onClick={() => setQ("")} aria-label="Clear search">×</button> : null}
          </form>
          {!q.trim() ? (
            <p className="search-examples">Try: {EXAMPLES.map((x) => <button key={x} type="button" onClick={() => setQ(x)}>{x}</button>)}</p>
          ) : null}
        </div>
      </div>

      <div className="container section">
        {q.trim() ? (
          <>
            <div className="search-tabs" role="tablist" aria-label="Filter results">
              <button role="tab" aria-selected={!kind} className={!kind ? "is-on" : ""} onClick={() => setTab("")}>All <span>{total}</span></button>
              {SEARCH_KINDS.map((k) => (
                <button key={k} role="tab" aria-selected={kind === k} className={kind === k ? "is-on" : ""} onClick={() => setTab(k)} disabled={!data?.counts[k] && kind !== k}>
                  {KIND_LABELS[k]} <span>{data?.counts[k] ?? 0}</span>
                </button>
              ))}
              {kind === "article" || type ? (
                <select aria-label="Article type" value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="">All article types</option>
                  {articleTypes.map((t) => <option key={t}>{t}</option>)}
                </select>
              ) : null}
            </div>

            <p className="muted" aria-live="polite">
              {live.error ? "Search is unavailable right now. Please try again."
                : !data ? "Searching…"
                : <>{data.total} result{data.total === 1 ? "" : "s"} for “<strong>{q.trim()}</strong>”{kind ? ` in ${KIND_LABELS[kind as SearchKind]}` : ""}{type ? ` · ${type}` : ""}</>}
            </p>

            {data && data.results.length ? (
              <ol className="search-results">
                {data.results.map((r) => (
                  <li key={r.url} className="sresult">
                    <span className={`kind kind--${r.kind}`}>{r.kind === "article" && r.articleType ? r.articleType : KIND_BADGES[r.kind]}</span>
                    <h3><Link href={r.url}><Highlight text={r.title} words={words} /></Link></h3>
                    {r.meta ? <p className="sresult__meta">{r.kind === "article" ? r.meta.split(" · ").slice(1).join(" · ") : r.meta}</p> : null}
                    {r.snippet ? <p className="sresult__snip"><Highlight text={r.snippet} words={words} /></p> : null}
                  </li>
                ))}
              </ol>
            ) : data && !data.total ? (
              <div className="notice">No matches. Check the spelling, try fewer words, or search for an author&apos;s surname.</div>
            ) : null}
          </>
        ) : (
          <p className="muted">Start typing above to search everything on the site.</p>
        )}
      </div>
    </>
  );
}
