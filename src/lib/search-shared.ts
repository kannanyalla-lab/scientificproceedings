/** Search types and labels shared by the server index and the browser search boxes. */

export const SEARCH_KINDS = ["article", "issue", "pharma", "spotter", "scramble", "page"] as const;
export type SearchKind = (typeof SEARCH_KINDS)[number];

export const KIND_LABELS: Record<SearchKind, string> = {
  article: "Articles",
  issue: "Issues",
  pharma: "Pharma Updates",
  spotter: "Spotters",
  scramble: "Scramble",
  page: "Pages",
};

/** Singular label shown on each result's tag. */
export const KIND_BADGES: Record<SearchKind, string> = {
  article: "Article",
  issue: "Issue",
  pharma: "Pharma Update",
  spotter: "Spotter",
  scramble: "Scramble",
  page: "Page",
};

export type SearchHit = {
  kind: SearchKind;
  title: string;
  url: string;
  /** Small grey line under the title: type, issue, authors. */
  meta: string;
  /** Article type, for the article-type filter. */
  articleType?: string;
  snippet: string;
  score: number;
};

export type SearchResponse = {
  q: string;
  total: number;
  counts: Record<SearchKind, number>;
  results: SearchHit[];
};


/** Words of the query, for highlighting matches in results (same splitting as the server). */
export function queryWords(q: string) {
  const out: string[] = [];
  const re = /"([^"]+)"|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(q))) {
    for (const w of (m[1] ?? m[2]).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z0-9]+/)) if (w) out.push(w);
  }
  return [...new Set(out)].sort((a, b) => b.length - a.length);
}
