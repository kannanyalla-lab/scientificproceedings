"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { KIND_BADGES, queryWords } from "@/lib/search-shared";
import Highlight from "./Highlight";
import { useLiveSearch } from "./useLiveSearch";

/** The search box in the top bar: results drop down underneath while you type. */
export default function HeaderSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState("");
  // The panel belongs to the page it was opened on, so it closes by itself after navigating.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (v: boolean) => setOpenOn(v ? pathname : null);
  const box = useRef<HTMLDivElement>(null);
  const listId = useId();
  const { data, loading, error } = useLiveSearch(q, { limit: "8" });
  const results = data?.results ?? [];
  // The highlighted row resets whenever a new set of results arrives.
  const [sel, setSel] = useState<{ for: unknown; i: number }>({ for: null, i: -1 });
  const active = sel.for === data ? sel.i : -1;
  const setActive = (f: number | ((a: number) => number)) => setSel({ for: data, i: typeof f === "function" ? f(active) : f });
  const words = queryWords(q);
  const allHref = `/search?q=${encodeURIComponent(q.trim())}`;

  // Close when clicking elsewhere.
  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpenOn(null); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const go = (href: string) => { setOpen(false); router.push(href); };
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, results.length)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
    else if (e.key === "Escape") { setOpen(false); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && active < results.length) go(results[active].url);
      else if (q.trim()) go(allHref);
    }
  };
  const show = open && q.trim().length > 0;

  return (
    <div className="hsearch" ref={box}>
      <form action="/search" className="search-mini" role="search" onSubmit={(e) => { e.preventDefault(); if (q.trim()) go(allHref); }}>
        <label htmlFor="q-mini" className="sr-only">Search the site</label>
        <input
          id="q-mini" name="q" type="search" placeholder="Search the journal" autoComplete="off"
          value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={onKey}
          role="combobox" aria-expanded={show} aria-controls={listId} aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        />
        <button type="submit" aria-label="Search">⌕</button>
      </form>
      {show ? (
        <div className="hsearch__panel" id={listId} role="listbox" aria-label="Search results">
          {error ? <p className="hsearch__note">Search is unavailable right now. Please try again.</p>
            : !data && loading ? <p className="hsearch__note">Searching…</p>
            : data && !results.length ? <p className="hsearch__note">No matches for “{q.trim()}”. Try fewer or different words.</p>
            : results.map((r, i) => (
              <Link
                key={r.url} id={`${listId}-${i}`} href={r.url} role="option" aria-selected={i === active}
                className={`hsearch__item ${i === active ? "is-active" : ""}`} onMouseEnter={() => setActive(i)} onClick={() => setOpen(false)}
              >
                <span className={`kind kind--${r.kind}`}>{r.kind === "article" && r.articleType ? r.articleType : KIND_BADGES[r.kind]}</span>
                <strong><Highlight text={r.title} words={words} /></strong>
                <small>{r.meta && r.kind !== "article" ? r.meta : r.meta.split(" · ").slice(1).join(" · ")}</small>
              </Link>
            ))}
          {data && data.total > 0 ? (
            <Link href={allHref} className={`hsearch__all ${active === results.length ? "is-active" : ""}`} onClick={() => setOpen(false)}>
              See all {data.total} result{data.total === 1 ? "" : "s"} →
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
