import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { articles, issues, pharmaUpdates, scrambleItems, spotterCases } from "@/db/schema";
import type { Issue } from "@/db/schema";
import { issueShort, pagesOf } from "./format";

/**
 * Site-wide search. Everything a reader can see is gathered into one small
 * in-memory index (rebuilt at most every few seconds, so edits in the editor
 * panel show up almost at once), then each query is matched against it.
 * The journal is a few hundred items, so this is fast and needs no extra
 * database extensions.
 */

import { SEARCH_KINDS, type SearchHit, type SearchKind, type SearchResponse } from "./search-shared";

export { SEARCH_KINDS };
export type { SearchHit, SearchKind, SearchResponse };

type Field = { text: string; norm: string; weight: number; snippet?: boolean };
type Doc = { kind: SearchKind; title: string; url: string; meta: string; articleType?: string; date: number; fields: Field[]; fallback: string };

/** Lower-case, strip accents and fold punctuation to spaces so "Covid-19" matches "covid 19". */
export function normalize(s: string) {
  return ` ${String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()} `;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", deg: "°", plusmn: "±", micro: "µ", times: "×" };
export function htmlToText(html: string | null | undefined) {
  return String(html || "")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, "") // citation numbers
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
      if (e[0] === "#") {
        const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(n) ? String.fromCodePoint(n) : " ";
      }
      return ENTITIES[e.toLowerCase()] ?? m;
    })
    .replace(/\s+/g, " ")
    .trim();
}

const field = (text: string | null | undefined, weight: number, snippet = false): Field => {
  // Abstracts use *asterisks* for italics; drop them so snippets read cleanly.
  const t = String(text || "").replace(/\*+/g, "").replace(/\s+/g, " ").trim();
  return { text: t, norm: normalize(t), weight, snippet };
};

const issueDate = (i?: Pick<Issue, "year" | "number"> | null) => (i ? i.year * 100 + i.number : 0);

const STATIC_PAGES: { title: string; url: string; meta: string; text: string }[] = [
  { title: "Home", url: "/", meta: "Page", text: "KIMSHEALTH Scientific Proceedings home clinical and scientific research journal current issue highlights" },
  { title: "Current Issue", url: "/issue/current", meta: "Page", text: "Latest issue table of contents" },
  { title: "Archive of past issues", url: "/issues", meta: "Page", text: "Archive all issues back issues previous editions volumes" },
  { title: "Pharma Updates", url: "/pharma-updates", meta: "Page", text: "Pharma updates new drugs approvals pharmacology" },
  { title: "Spotters", url: "/radiology-spotters", meta: "Page", text: "Radiology spotters dermatology spotters image quiz cases" },
  { title: "Scramble", url: "/scramble", meta: "Page", text: "Scramble medical word puzzle unscramble game" },
  { title: "About the journal", url: "/about", meta: "Page", text: "About the journal aims and scope article types open access licence publisher KIMSHEALTH Trivandrum Kerala" },
  { title: "Guidelines for authors", url: "/about#guidelines", meta: "About", text: "Author guidelines instructions for authors abstract keywords affiliations corresponding author references Vancouver figures ethics consent conflicts of interest funding" },
  { title: "Editorial board", url: "/about#board", meta: "About", text: "Editorial board editors chief editor associate editors" },
  { title: "Contact the editorial office", url: "/about#contact", meta: "About", text: "Contact address email kimsproceedings@kimsglobal.com Anayara Trivandrum 695029 Kerala India phone" },
  { title: "Submit a manuscript", url: "/submit", meta: "Page", text: "Submit a manuscript submission send paper upload author" },
];

async function buildIndex(): Promise<Doc[]> {
  const [iss, arts, pharma, spots, scr] = await Promise.all([
    db.select().from(issues).where(eq(issues.published, true)),
    db.select().from(articles).where(eq(articles.published, true)),
    db.select().from(pharmaUpdates).where(eq(pharmaUpdates.published, true)),
    db.select().from(spotterCases),
    db.select().from(scrambleItems),
  ]);
  const byId = new Map(iss.map((i) => [i.id, i]));
  const when = (i?: Issue | null) => (i ? `${i.month} ${i.year}` : "");
  const docs: Doc[] = [];

  for (const i of iss) {
    const board = i.editorialBoard.flatMap((g) => [g.role, ...g.members.map((m) => `${m.name} ${m.title || ""}`)]).join(" · ");
    const contributors = [i.spotterContributors, i.dermSpotterContributors, i.scrambleContributors, i.pharmaContributors].filter(Boolean).join(" · ");
    const title = `${i.month} ${i.year} issue`;
    docs.push({
      kind: "issue", title, url: `/issue/${i.slug}`, meta: `${issueShort(i)}${i.isCurrent ? " · Current issue" : ""}`, date: issueDate(i),
      fallback: i.description || i.highlights.join(" · "),
      fields: [
        field(`${title} ${i.month} ${i.year} volume ${i.volume} issue ${i.number} vol ${i.volume} no ${i.number} ${i.isCurrent ? "current latest" : ""}`, 10),
        field(i.highlights.join(" · "), 3, true),
        field(i.description, 2, true),
        field(board, 2, true),
        field(contributors, 2, true),
      ],
    });
  }

  for (const a of arts) {
    const issue = a.issueId ? byId.get(a.issueId) : null;
    if (a.issueId && !issue) continue; // belongs to an unpublished issue
    const names = a.authors.map((x) => x.name);
    const pages = pagesOf(a);
    const shortAuthors = names.length > 3 ? `${names.slice(0, 3).join(", ")} et al.` : names.join(", ");
    docs.push({
      kind: "article", title: a.title, url: `/article/${a.slug}`, articleType: a.articleType, date: issueDate(issue),
      meta: [a.articleType, shortAuthors, [when(issue), pages ? `pp. ${pages}` : ""].filter(Boolean).join(", ")].filter(Boolean).join(" · "),
      fallback: a.abstract.map((s) => s.text).join(" ") || htmlToText(a.bodyHtml).slice(0, 400),
      fields: [
        field(a.title, 12),
        field(names.join(", "), 8, true),
        field(a.keywords.join(", "), 6, true),
        field(a.articleType, 3),
        field(a.correspondingAuthor, 4, true),
        field(a.abstract.map((s) => (s.heading ? `${s.heading}: ${s.text}` : s.text)).join(" "), 2, true),
        field(a.affiliations.map((x) => x.text).join(" · "), 1.5, true),
        field(a.doi, 4),
        field(htmlToText(a.bodyHtml), 1, true),
        field(htmlToText(a.notesHtml), 0.5, true),
        field(a.refs.map(htmlToText).join(" · "), 0.4, true),
      ],
    });
  }

  for (const p of pharma) {
    const issue = p.issueId ? byId.get(p.issueId) : null;
    if (p.issueId && !issue) continue;
    docs.push({
      kind: "pharma", title: p.title, url: `/pharma-updates/${p.slug}`, date: issueDate(issue),
      meta: when(issue),
      fallback: p.summary || htmlToText(p.bodyHtml).slice(0, 400),
      fields: [
        field(p.title, 12),
        field("pharma update drug", 1),
        field(p.summary, 3, true),
        field(htmlToText(p.bodyHtml), 1, true),
        field(p.refs.map(htmlToText).join(" · "), 0.4, true),
      ],
    });
  }

  for (const c of spots) {
    const issue = c.issueId ? byId.get(c.issueId) : null;
    if (!issue) continue;
    const anchor = c.category === "Radiology" ? `case-${c.caseNo}` : `${c.category.toLowerCase()}-${c.caseNo}`;
    docs.push({
      kind: "spotter", title: `${c.category} Spotter · Case ${c.caseNo}`, url: `/radiology-spotters?issue=${issue.slug}#${anchor}`, date: issueDate(issue),
      meta: `${c.category} Spotters · ${when(issue)}`,
      fallback: c.question,
      // The answer is searchable, but snippets only ever show the question so the quiz is not spoiled.
      fields: [
        field(`${c.category} spotter spotters case ${c.caseNo} quiz`, 4),
        field(c.question, 3, true),
        field(c.options.join(" "), 1),
        field(c.diagnosis, 2),
        field(c.findings, 1),
      ],
    });
  }

  for (const s of scr) {
    const issue = s.issueId ? byId.get(s.issueId) : null;
    if (!issue) continue;
    docs.push({
      kind: "scramble", title: `Scramble · ${s.specialty}`, url: `/scramble?issue=${issue.slug}#s-${s.id}`, date: issueDate(issue),
      meta: `Scramble puzzle · ${when(issue)}`,
      fallback: s.clue,
      fields: [
        field(`${s.specialty} scramble puzzle`, 4),
        field(s.clue, 3, true),
        field(s.scrambled, 2),
        field(s.answer, 2),
      ],
    });
  }

  for (const p of STATIC_PAGES) {
    docs.push({ kind: "page", title: p.title, url: p.url, meta: p.meta, date: 0, fallback: "", fields: [field(p.title, 12), field(p.text, 3)] });
  }
  return docs;
}

const TTL_MS = 5_000;
const g = globalThis as unknown as { __ksp_search?: { at: number; docs: Promise<Doc[]> } };
function getIndex() {
  const now = Date.now();
  if (!g.__ksp_search || now - g.__ksp_search.at > TTL_MS) {
    const docs = buildIndex();
    g.__ksp_search = { at: now, docs };
    docs.catch(() => { g.__ksp_search = undefined; });
  }
  return g.__ksp_search.docs;
}

/** Split a query into normalised words; quoted text is kept together as a phrase. */
export function parseQuery(q: string) {
  const terms: string[] = [];
  const re = /"([^"]+)"|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(q))) {
    const t = normalize(m[1] ?? m[2]).trim();
    if (t) terms.push(t);
  }
  return [...new Set(terms)].slice(0, 12);
}

/** Find a word-start match (" term") first, falling back to any substring match. */
function find(norm: string, term: string) {
  // Numbers must match whole ("issue 2" should not match "2026").
  if (/^\d+$/.test(term)) {
    const at = norm.indexOf(` ${term} `);
    return at >= 0 ? { at: at + 1, wordStart: true, whole: true } : null;
  }
  const w = norm.indexOf(` ${term}`);
  if (w >= 0) return { at: w + 1, wordStart: true, whole: norm.startsWith(`${term} `, w + 1) };
  const s = norm.indexOf(term);
  return s >= 0 ? { at: s, wordStart: false, whole: false } : null;
}

/** Map a position in a field's normalised text back to roughly the same place in the original text. */
function snippetFrom(f: Field, terms: string[]) {
  const words = f.text.split(/\s+/);
  const normWords = words.map((w) => normalize(w).trim());
  let hit = 0;
  for (let i = 0; i < normWords.length; i++) {
    if (terms.some((t) => normWords[i].includes(t.split(" ")[0]))) { hit = i; break; }
  }
  const start = Math.max(0, hit - 10);
  const end = Math.min(words.length, start + 34);
  return `${start > 0 ? "… " : ""}${words.slice(start, end).join(" ")}${end < words.length ? " …" : ""}`;
}

function clip(raw: string, n = 220) {
  const s = raw.replace(/\*+/g, "");
  return s.length > n ? `${s.slice(0, n).replace(/\s+\S*$/, "")} …` : s;
}

export async function siteSearch(q: string, opts: { kind?: SearchKind; articleType?: string; limit?: number } = {}): Promise<SearchResponse> {
  const counts = Object.fromEntries(SEARCH_KINDS.map((k) => [k, 0])) as Record<SearchKind, number>;
  const terms = parseQuery(q);
  if (!terms.length) return { q, total: 0, counts, results: [] };
  const docs = await getIndex();
  const hits: SearchHit[] = [];

  for (const d of docs) {
    if (opts.articleType && d.articleType !== opts.articleType) continue;
    let score = 0;
    let ok = true;
    let best: { f: Field; s: number } | null = null;
    for (const t of terms) {
      let termScore = 0;
      for (const f of d.fields) {
        const m = find(f.norm, t);
        if (!m) continue;
        const s = f.weight * (m.whole ? 3 : m.wordStart ? 2 : 1);
        termScore = Math.max(termScore, s);
        if (f.snippet && (!best || s > best.s)) best = { f, s };
      }
      if (!termScore) { ok = false; break; }
      score += termScore;
    }
    if (!ok) continue;
    // The whole query found as a phrase (e.g. "case report") ranks above scattered words.
    const phrase = terms.join(" ");
    if (terms.length > 1) {
      let ph = 0;
      for (const f of d.fields) if (f.norm.includes(` ${phrase} `)) ph = Math.max(ph, f.weight * 3);
      score += ph;
    }
    const tn = normalize(d.title);
    if (terms.length > 1 && tn.includes(phrase)) score += 20;
    if (tn.trim().startsWith(phrase)) score += 8;
    counts[d.kind]++;
    if (opts.kind && d.kind !== opts.kind) continue;
    const titleHit = terms.every((t) => tn.includes(t));
    const snippet = best && !(titleHit && d.fallback) ? snippetFrom(best.f, terms) : clip(d.fallback);
    hits.push({ kind: d.kind, title: d.title, url: d.url, meta: d.meta, articleType: d.articleType, snippet, score: score + d.date / 1e7 });
  }

  hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  const total = hits.length;
  return { q, total, counts, results: hits.slice(0, opts.limit ?? 50) };
}
