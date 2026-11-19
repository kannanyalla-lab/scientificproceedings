import type { Article, Issue } from "@/db/schema";
import { ARTICLE_TYPES, JOURNAL_ABBR } from "./site";

export function slugify(s: string) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export const pad2 = (n: number) => String(n).padStart(2, "0");

type IssueLike = Pick<Issue, "volume" | "number" | "month" | "year">;

export function issueLabel(i?: IssueLike | null) {
  if (!i) return "";
  return `Volume ${i.volume} · Issue ${pad2(i.number)} · ${i.month} ${i.year}`;
}

export function issueShort(i?: IssueLike | null) {
  if (!i) return "";
  return `Vol ${i.volume}, Issue ${pad2(i.number)}`;
}

export function pagesOf(a: Pick<Article, "pageStart" | "pageEnd">) {
  if (a.pageStart && a.pageEnd) return `${a.pageStart}–${a.pageEnd}`;
  return a.pageStart || "";
}

/** Short journal reference, e.g. "KIMSHEALTH Sci Proc. 12(1):77–84, March 2026" */
export function journalRef(a: Pick<Article, "pageStart" | "pageEnd">, i?: IssueLike | null) {
  if (!i) return JOURNAL_ABBR;
  const pages = pagesOf(a);
  return `${i.volume}(${i.number})${pages ? ":" + pages : ""}, ${i.month} ${i.year}`;
}

/** Vancouver-style citation built from the article's real issue. */
export function citation(a: Pick<Article, "authors" | "title" | "pageStart" | "pageEnd" | "doi">, i?: IssueLike | null) {
  const names = (a.authors || []).map((x) => x.name);
  const auth = names.length > 6 ? names.slice(0, 6).join(", ") + ", et al" : names.join(", ");
  const title = String(a.title || "").replace(/\.$/, "");
  let c = `${auth ? auth + ". " : ""}${title}. ${JOURNAL_ABBR}.`;
  if (i) c += ` ${i.year} ${i.month.slice(0, 3)};${i.volume}(${i.number})`;
  const pages = pagesOf(a);
  if (pages) c += `:${pages}`;
  c += ".";
  if (a.doi) c += ` doi:${a.doi}`;
  return c;
}

export function excerpt(text: string | null | undefined, n = 200) {
  const t = String(text || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, "") + "…" : t;
}

export function typePlural(t: string) {
  const map: Record<string, string> = {
    "Case Report": "Case Reports",
    "Review Article": "Review Articles",
    Editorial: "Editorials",
    "Letter to the Editor": "Letters to the Editor",
    "Short Communication": "Short Communications",
  };
  return map[t] || t;
}

export function typeOrder(t: string) {
  const i = (ARTICLE_TYPES as readonly string[]).indexOf(t);
  return i < 0 ? 99 : i;
}

export function groupByType<T extends Pick<Article, "articleType" | "sortOrder" | "id">>(list: T[]) {
  const sorted = [...list].sort(
    (x, y) => typeOrder(x.articleType) - typeOrder(y.articleType) || x.sortOrder - y.sortOrder || x.id - y.id,
  );
  const groups = new Map<string, T[]>();
  for (const a of sorted) {
    if (!groups.has(a.articleType)) groups.set(a.articleType, []);
    groups.get(a.articleType)!.push(a);
  }
  return [...groups.entries()];
}

export function anchorId(s: string) {
  return slugify(s) || "section";
}
