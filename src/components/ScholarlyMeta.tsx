// Bibliographic <meta> tags for one article, read by indexing services:
//  - Highwire Press citation_* tags (Google Scholar, Semantic Scholar, Zotero, Mendeley)
//  - Dublin Core DC.* tags (OJS-style; BASE, CORE, library discovery tools)
//  - PRISM prism.* tags (EBSCO, ProQuest, Crossref crawlers)
// React places these in <head>. They are rendered in order so that each
// citation_author is followed by its own citation_author_institution, as
// Google Scholar's inclusion guidelines require.
import type { Article, Issue } from "@/db/schema";
import type { JournalConfig } from "@/lib/journal-config";
import { abstractPlain, articleUrl, authorRecords, isoMonth, licenceInfo, pdfUrl } from "@/lib/indexing/common";
import { plain } from "@/lib/importer/markup";

export default function ScholarlyMeta({ article: a, issue, cfg }: { article: Article; issue: Issue | null; cfg: JournalConfig }) {
  const url = articleUrl(cfg, a);
  const pdf = pdfUrl(cfg, a, issue);
  const lic = licenceInfo(cfg);
  const abs = abstractPlain(a);
  const tags: [string, string][] = [];
  const t = (name: string, content?: string | number | null) => { if (content !== undefined && content !== null && String(content) !== "") tags.push([name, String(content)]); };

  // Highwire Press / Google Scholar
  t("citation_title", a.title);
  for (const au of authorRecords(a)) {
    t("citation_author", au.name);
    for (const af of au.affs) t("citation_author_institution", af);
    if (au.email) t("citation_author_email", au.email);
  }
  if (issue) t("citation_publication_date", issue.year);
  t("citation_journal_title", cfg.title);
  t("citation_journal_abbrev", cfg.abbrevTitle);
  t("citation_publisher", cfg.publisher);
  t("citation_issn", cfg.issnPrint);
  t("citation_issn", cfg.issnOnline);
  if (issue) { t("citation_volume", issue.volume); t("citation_issue", issue.number); }
  t("citation_firstpage", a.pageStart);
  t("citation_lastpage", a.pageEnd);
  t("citation_doi", a.doi);
  t("citation_article_type", a.articleType);
  t("citation_language", cfg.language);
  for (const k of a.keywords) t("citation_keywords", k);
  t("citation_abstract_html_url", url);
  t("citation_fulltext_html_url", a.bodyHtml ? url : null);
  t("citation_pdf_url", pdf);
  for (const r of a.refs) t("citation_reference", plain(r.replace(/<[^>]+>/g, "")));

  // Dublin Core
  t("DC.Title", a.title);
  for (const au of authorRecords(a)) t("DC.Creator.PersonalName", au.name);
  for (const k of a.keywords) t("DC.Subject", k);
  t("DC.Description", abs);
  t("DC.Publisher", cfg.publisher);
  if (issue) t("DC.Date.issued", isoMonth(issue));
  t("DC.Type", "Text");
  t("DC.Type.articleType", a.articleType);
  t("DC.Format", "text/html");
  t("DC.Identifier.URI", url);
  t("DC.Identifier.DOI", a.doi);
  if (a.pageStart) t("DC.Identifier.pageNumber", a.pageEnd ? `${a.pageStart}-${a.pageEnd}` : a.pageStart);
  t("DC.Source", cfg.title);
  t("DC.Source.ISSN", cfg.issnPrint || cfg.issnOnline);
  if (issue) { t("DC.Source.Volume", issue.volume); t("DC.Source.Issue", issue.number); }
  t("DC.Source.URI", `${url.replace(/\/article\/.*$/, "")}/`);
  t("DC.Language", cfg.language);
  t("DC.Rights", lic.url);

  // PRISM
  t("prism.publicationName", cfg.title);
  t("prism.issn", cfg.issnPrint);
  t("prism.eIssn", cfg.issnOnline);
  if (issue) { t("prism.volume", issue.volume); t("prism.number", issue.number); t("prism.publicationDate", isoMonth(issue)); }
  t("prism.startingPage", a.pageStart);
  t("prism.endingPage", a.pageEnd);
  t("prism.doi", a.doi);
  t("prism.url", url);
  t("prism.section", a.articleType);
  t("prism.copyright", lic.short);

  return (
    <>
      <link rel="schema.DC" href="http://purl.org/dc/elements/1.1/" />
      <link rel="alternate" type="application/xml" title="JATS XML" href={`/article/${a.slug}/jats`} />
      <link rel="license" href={lic.url} />
      {tags.map(([name, content], i) => <meta key={i} name={name} content={content} />)}
    </>
  );
}
