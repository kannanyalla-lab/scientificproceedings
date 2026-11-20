import { getArticleBySlug } from "@/lib/queries";
import { getJournalConfig, issns } from "@/lib/journal-config";
import { articleUrl } from "@/lib/indexing/common";

const MONTH_NUM: Record<string, string> = { January: "01", February: "02", March: "03", April: "04", May: "05", June: "06", July: "07", August: "08", September: "09", October: "10", November: "11", December: "12" };

/** Citation download for reference managers: ?format=ris (EndNote, Zotero, Mendeley) or ?format=bib (BibTeX). */
export async function GET(req: Request, ctx: RouteContext<"/article/[slug]/cite">) {
  const data = await getArticleBySlug((await ctx.params).slug);
  if (!data) return new Response("Not found", { status: 404 });
  const { article: a, issue } = data;
  const cfg = await getJournalConfig();
  const JOURNAL = cfg.title, JOURNAL_ABBR = cfg.abbrevTitle;
  const format = new URL(req.url).searchParams.get("format") === "bib" ? "bib" : "ris";
  const url = articleUrl(cfg, a);
  const sn = issns(cfg).map((x) => x.issn);
  const abs = a.abstract.map((s) => (s.heading ? `${s.heading}: ` : "") + s.text).join(" ");
  let body: string;
  if (format === "ris") {
    const L: string[] = ["TY  - JOUR", `TI  - ${a.title}`];
    for (const au of a.authors) L.push(`AU  - ${au.name}`);
    L.push(`JO  - ${JOURNAL}`, `JA  - ${JOURNAL_ABBR}`, `PB  - ${cfg.publisher}`);
    for (const x of sn) L.push(`SN  - ${x}`);
    if (issue) L.push(`PY  - ${issue.year}`, `DA  - ${issue.year}/${MONTH_NUM[issue.month] || "01"}`, `VL  - ${issue.volume}`, `IS  - ${issue.number}`);
    if (a.pageStart) L.push(`SP  - ${a.pageStart}`);
    if (a.pageEnd) L.push(`EP  - ${a.pageEnd}`);
    for (const k of a.keywords) L.push(`KW  - ${k}`);
    if (abs) L.push(`AB  - ${abs}`);
    if (a.doi) L.push(`DO  - ${a.doi}`);
    L.push(`UR  - ${url}`, "ER  - ", "");
    body = L.join("\r\n");
  } else {
    const key = (a.authors[0]?.name.split(/\s+/)[0] || "ksp").replace(/\W/g, "") + (issue?.year ?? "");
    const f = (k: string, v?: string | number | null) => (v === undefined || v === null || v === "" ? "" : `  ${k} = {${String(v).replace(/[{}]/g, "")}},\n`);
    body = `@article{${key},\n` + f("title", a.title) + f("author", a.authors.map((x) => x.name).join(" and ")) + f("journal", JOURNAL)
      + f("year", issue?.year) + f("month", issue?.month) + f("volume", issue?.volume) + f("number", issue?.number)
      + f("pages", a.pageStart && a.pageEnd ? `${a.pageStart}--${a.pageEnd}` : a.pageStart) + f("keywords", a.keywords.join(", "))
      + f("issn", sn.join(", ")) + f("publisher", cfg.publisher) + f("doi", a.doi) + f("url", url) + "}\n";
  }
  return new Response(body, {
    headers: {
      "Content-Type": format === "ris" ? "application/x-research-info-systems; charset=utf-8" : "application/x-bibtex; charset=utf-8",
      "Content-Disposition": `attachment; filename="${a.slug.slice(0, 60)}.${format}"`,
    },
  });
}
