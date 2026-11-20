// Shared helpers for the machine-readable outputs that indexing services use
// (Google Scholar meta tags, OAI-PMH, JATS, Crossref, DOAJ, RSS).
import type { Article, Issue } from "@/db/schema";
import { plain } from "@/lib/importer/markup";
import { MONTHS } from "@/lib/site";
import { articlePdfHref } from "@/lib/format";
import { baseUrl, licenceOf, type JournalConfig } from "@/lib/journal-config";

export const xml = (s: unknown) =>
  String(s ?? "")
    // Characters XML 1.0 does not allow.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const monthNum = (m?: string | null) => {
  const i = MONTHS.indexOf(String(m || ""));
  return i < 0 ? null : i + 1;
};
export const pad2 = (n: number) => String(n).padStart(2, "0");

/** "2026-09" (or "2026" when the month is unknown). */
export function isoMonth(issue?: Pick<Issue, "year" | "month"> | null) {
  if (!issue) return "";
  const m = monthNum(issue.month);
  return m ? `${issue.year}-${pad2(m)}` : String(issue.year);
}

/** Splits a display name into given name(s) and surname, the way it would be cited.
 *  South Indian names written with a trailing initial ("Saifudeen A") keep the
 *  initial as the given name, as Vancouver citations do. */
export function splitName(full: string) {
  const name = full.replace(/^(dr|prof|mr|mrs|ms|col|lt|maj|brig|gen)\.?\s+/i, "").replace(/\s+/g, " ").trim();
  const parts = name.split(" ");
  if (parts.length === 1) return { given: "", surname: parts[0] };
  const last = parts[parts.length - 1];
  if (/^([A-Z]\.?){1,3}$/.test(last)) return { given: last.replace(/\./g, ""), surname: parts.slice(0, -1).join(" ") };
  return { given: parts.slice(0, -1).join(" "), surname: last };
}

export type AuthorRec = { name: string; given: string; surname: string; affs: string[]; affKeys: string[]; email?: string; corresponding: boolean };

export function authorRecords(a: Pick<Article, "authors" | "affiliations" | "correspondingAuthor" | "correspondingEmail">): AuthorRec[] {
  const affMap = new Map(a.affiliations.map((x) => [x.key.trim(), x.text.trim()]));
  const corr = (a.correspondingAuthor || "").toLowerCase();
  let corrFound = false;
  return a.authors.map((au) => {
    const keys = (au.aff || "").split(/[,\s]+/).map((k) => k.trim()).filter(Boolean);
    const affs = keys.map((k) => affMap.get(k)).filter((x): x is string => !!x);
    // Articles with one affiliation and no letters: everyone shares it.
    if (!affs.length && a.affiliations.length === 1) affs.push(a.affiliations[0].text);
    const isCorr = !corrFound && !!corr && corr.startsWith(au.name.toLowerCase().replace(/^dr\.?\s+/, ""));
    if (isCorr) corrFound = true;
    return { name: au.name, ...splitName(au.name), affs, affKeys: keys, corresponding: isCorr, email: isCorr ? a.correspondingEmail || undefined : undefined };
  });
}

export function abstractPlain(a: Pick<Article, "abstract">) {
  return a.abstract.map((s) => (s.heading ? `${s.heading}: ` : "") + plain(s.text)).join(" ").trim();
}

export function articleUrl(cfg: JournalConfig, a: Pick<Article, "slug">) {
  return `${baseUrl(cfg)}/article/${a.slug}`;
}

export function absUrl(cfg: JournalConfig, u?: string | null) {
  if (!u) return "";
  try { return new URL(u, baseUrl(cfg) + "/").toString(); } catch { return u; }
}

export function pdfUrl(cfg: JournalConfig, a: Pick<Article, "slug" | "pdfUrl" | "pageStart">, issue?: Pick<Issue, "pageImages"> | null) {
  const h = articlePdfHref(a, issue);
  return h ? absUrl(cfg, h) : "";
}

/** JATS article-type for each of the journal's article types. */
export function jatsType(t: string) {
  const map: Record<string, string> = {
    "Original Research": "research-article", "Case Report": "case-report", "Case Series": "case-report",
    "Review Article": "review-article", "Clinical Review": "review-article", Editorial: "editorial",
    "Letter to the Editor": "letter", "Short Communication": "brief-report", "Images in Medicine": "other",
  };
  return map[t] || "other";
}

/** Pulls a DOI out of a reference, if it has one. */
export function doiIn(ref: string) {
  const m = ref.match(/\b(10\.\d{4,9}\/[^\s"<>]+?)(?=[.,;)]?(\s|$))/i);
  return m ? m[1] : null;
}
export function pmidIn(ref: string) {
  const m = ref.match(/\bPMID:?\s*(\d{5,9})\b/i);
  return m ? m[1] : null;
}

/** DOI for an article that doesn't have one yet, from Journal settings > DOI pattern. */
export function suggestDoi(cfg: JournalConfig, issue: Pick<Issue, "year" | "volume" | "number">, a: Pick<Article, "pageStart">, seq: number) {
  if (!cfg.doiPrefix) return "";
  const prefix = cfg.doiPrefix.replace(/^https?:\/\/(dx\.)?doi\.org\//, "").replace(/\/+$/, "");
  return (cfg.doiPattern || "{prefix}/ksp.{year}.{volume}.{issue}.{seq}")
    .replace("{prefix}", prefix).replace("{year}", String(issue.year)).replace("{volume}", String(issue.volume))
    .replace("{issue}", pad2(issue.number)).replace("{seq}", String(seq).padStart(3, "0"))
    .replace("{page}", String(a.pageStart || seq));
}

export function licenceInfo(cfg: JournalConfig) {
  return licenceOf(cfg);
}

/** ISO 639-2 three-letter code (DOAJ). */
export function lang3(code: string) {
  const m: Record<string, string> = { en: "eng", hi: "hin", ml: "mal", ta: "tam", fr: "fre", de: "ger", es: "spa", ar: "ara" };
  return m[code] || code;
}
