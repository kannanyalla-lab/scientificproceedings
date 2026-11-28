// Metadata exports for indexing services: Dublin Core (OAI-PMH), Crossref
// deposit XML (DOI registration), DOAJ article upload XML and an RSS feed.
import type { Article, Issue } from "@/db/schema";
import { plain } from "@/lib/importer/markup";
import { baseUrl, issns, type JournalConfig } from "@/lib/journal-config";
import {
  abstractPlain, articleUrl, authorRecords, doiIn, isoMonth, lang3, licenceInfo, monthNum, pad2, pdfUrl, suggestDoi, xml,
} from "./common";

// ---- Dublin Core (oai_dc) ------------------------------------------------

export function dublinCore(a: Article, issue: Issue | null, cfg: JournalConfig) {
  const L: string[] = [
    `<oai_dc:dc xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/oai_dc/ http://www.openarchives.org/OAI/2.0/oai_dc.xsd">`,
    `<dc:title xml:lang="${xml(cfg.language)}">${xml(a.title)}</dc:title>`,
  ];
  for (const au of authorRecords(a)) L.push(`<dc:creator>${xml(au.given ? `${au.surname}, ${au.given}` : au.surname)}</dc:creator>`);
  for (const k of a.keywords) L.push(`<dc:subject xml:lang="${xml(cfg.language)}">${xml(k)}</dc:subject>`);
  const abs = abstractPlain(a);
  if (abs) L.push(`<dc:description xml:lang="${xml(cfg.language)}">${xml(abs)}</dc:description>`);
  L.push(`<dc:publisher>${xml(cfg.publisher)}</dc:publisher>`);
  if (issue) L.push(`<dc:date>${isoMonth(issue)}</dc:date>`);
  L.push(`<dc:type>info:eu-repo/semantics/article</dc:type>`, `<dc:type>${xml(a.articleType)}</dc:type>`, `<dc:type>Text</dc:type>`);
  L.push(`<dc:format>text/html</dc:format>`);
  const pdf = pdfUrl(cfg, a, issue);
  if (pdf) L.push(`<dc:format>application/pdf</dc:format>`);
  L.push(`<dc:identifier>${xml(articleUrl(cfg, a))}</dc:identifier>`);
  if (a.doi) L.push(`<dc:identifier>https://doi.org/${xml(a.doi)}</dc:identifier>`);
  if (issue) L.push(`<dc:source>${xml(cfg.title)}; Vol. ${issue.volume} No. ${issue.number} (${issue.year})${a.pageStart ? `: ${xml(a.pageStart)}${a.pageEnd ? "-" + xml(a.pageEnd) : ""}` : ""}</dc:source>`);
  for (const i of issns(cfg)) L.push(`<dc:source>${xml(i.issn)}</dc:source>`);
  L.push(`<dc:language>${xml(lang3(cfg.language))}</dc:language>`);
  if (pdf) L.push(`<dc:relation>${xml(pdf)}</dc:relation>`);
  L.push(`<dc:rights>${xml(licenceInfo(cfg).url)}</dc:rights>`);
  L.push(`<dc:rights>Copyright (c) ${issue?.year ?? ""} ${xml(cfg.copyrightHolder)}</dc:rights>`);
  L.push("</oai_dc:dc>");
  return L.join("\n");
}

// ---- Crossref ------------------------------------------------------------

export type DoiPlan = { article: Article; doi: string; existing: boolean };

/** The DOI each article in an issue has, or would get from the DOI pattern. */
export function planDois(issue: Issue, list: Article[], cfg: JournalConfig): DoiPlan[] {
  return list.map((a, i) => ({ article: a, doi: a.doi || suggestDoi(cfg, issue, a, i + 1), existing: !!a.doi }));
}

const ts = () => new Date().toISOString().replace(/\D/g, "").slice(0, 14);

export function crossrefXml(issue: Issue, list: Article[], cfg: JournalConfig) {
  const warnings: string[] = [];
  if (!cfg.doiPrefix) warnings.push("No DOI prefix is set in Journal settings.");
  if (!issns(cfg).length) warnings.push("Crossref needs at least one ISSN for a journal. Add it in Journal settings.");
  if (!cfg.crossrefDepositorEmail) warnings.push("No Crossref depositor email is set in Journal settings.");
  const m = monthNum(issue.month);
  const date = (media: string) => `<publication_date media_type="${media}">${m ? `<month>${pad2(m)}</month>` : ""}<year>${issue.year}</year></publication_date>`;
  const lic = licenceInfo(cfg);
  const items: string[] = [];
  for (const { article: a, doi } of planDois(issue, list, cfg)) {
    if (!doi) { warnings.push(`"${a.title}" has no DOI and none can be made (no DOI prefix).`); continue; }
    const authors = authorRecords(a);
    const L: string[] = [`<journal_article publication_type="full_text" language="${xml(cfg.language)}">`];
    L.push(`<titles><title>${xml(a.title)}</title></titles>`);
    if (authors.length) {
      L.push("<contributors>");
      authors.forEach((au, i) => {
        L.push(`<person_name sequence="${i === 0 ? "first" : "additional"}" contributor_role="author">`
          + (au.given ? `<given_name>${xml(au.given)}</given_name>` : "") + `<surname>${xml(au.surname)}</surname>`
          + (au.affs.length ? `<affiliations>${au.affs.map((x) => `<institution><institution_name>${xml(x)}</institution_name></institution>`).join("")}</affiliations>` : "")
          + "</person_name>");
      });
      L.push("</contributors>");
    }
    const abs = a.abstract.map((s) => `<jats:p>${s.heading ? `${xml(s.heading)}: ` : ""}${xml(plain(s.text))}</jats:p>`).join("");
    if (abs) L.push(`<jats:abstract>${abs}</jats:abstract>`);
    L.push(date("online"));
    if (a.pageStart) L.push(`<pages><first_page>${xml(a.pageStart)}</first_page>${a.pageEnd ? `<last_page>${xml(a.pageEnd)}</last_page>` : ""}</pages>`);
    L.push(`<publisher_item><identifier id_type="other">${xml(a.slug)}</identifier></publisher_item>`);
    L.push(`<ai:program name="AccessIndicators"><ai:free_to_read/><ai:license_ref applies_to="vor">${xml(lic.url)}</ai:license_ref></ai:program>`);
    const pdf = pdfUrl(cfg, a, issue);
    L.push(`<doi_data><doi>${xml(doi)}</doi><resource>${xml(articleUrl(cfg, a))}</resource>`
      + (pdf ? `<collection property="crawler-based"><item crawler="iParadigms"><resource>${xml(pdf)}</resource></item></collection>`
        + `<collection property="text-mining"><item><resource mime_type="application/pdf">${xml(pdf)}</resource></item></collection>` : "")
      + "</doi_data>");
    if (a.refs.length) {
      L.push("<citation_list>");
      a.refs.forEach((r, i) => {
        const d = doiIn(r);
        L.push(`<citation key="ref${i + 1}">${d ? `<doi>${xml(d)}</doi>` : ""}<unstructured_citation>${xml(plain(r.replace(/<[^>]+>/g, "")))}</unstructured_citation></citation>`);
      });
      L.push("</citation_list>");
    }
    L.push("</journal_article>");
    items.push(L.join("\n"));
  }
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<doi_batch version="5.3.1" xmlns="http://www.crossref.org/schema/5.3.1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:jats="http://www.ncbi.nlm.nih.gov/JATS1" xmlns:ai="http://www.crossref.org/AccessIndicators.xsd" xsi:schemaLocation="http://www.crossref.org/schema/5.3.1 https://www.crossref.org/schemas/crossref5.3.1.xsd">
<head>
<doi_batch_id>ksp-${issue.year}-${issue.volume}-${issue.number}-${ts()}</doi_batch_id>
<timestamp>${ts()}</timestamp>
<depositor><depositor_name>${xml(cfg.crossrefDepositorName || cfg.publisher)}</depositor_name><email_address>${xml(cfg.crossrefDepositorEmail || cfg.contactEmail)}</email_address></depositor>
<registrant>${xml(cfg.publisher)}</registrant>
</head>
<body>
<journal>
<journal_metadata language="${xml(cfg.language)}">
<full_title>${xml(cfg.title)}</full_title>
<abbrev_title>${xml(cfg.abbrevTitle)}</abbrev_title>
${issns(cfg).map((i) => `<issn media_type="${i.type}">${xml(i.issn)}</issn>`).join("\n")}
</journal_metadata>
<journal_issue>
${date("print")}
<journal_volume><volume>${issue.volume}</volume></journal_volume>
<issue>${issue.number}</issue>
</journal_issue>
${items.join("\n")}
</journal>
</body>
</doi_batch>
`;
  return { xml: body, warnings };
}

// ---- DOAJ article upload ---------------------------------------------------

export function doajXml(issue: Issue, list: Article[], cfg: JournalConfig) {
  const lang = lang3(cfg.language);
  const recs = list.map((a) => {
    const authors = authorRecords(a);
    const affs = [...new Set(authors.flatMap((x) => x.affs))];
    const L: string[] = ["<record>", `<language>${lang}</language>`, `<publisher>${xml(cfg.publisher)}</publisher>`, `<journalTitle>${xml(cfg.title)}</journalTitle>`];
    if (cfg.issnPrint) L.push(`<issn>${xml(cfg.issnPrint)}</issn>`);
    if (cfg.issnOnline) L.push(`<eissn>${xml(cfg.issnOnline)}</eissn>`);
    L.push(`<publicationDate>${isoMonth(issue)}</publicationDate>`, `<volume>${issue.volume}</volume>`, `<issue>${issue.number}</issue>`);
    if (a.pageStart) L.push(`<startPage>${xml(a.pageStart)}</startPage>`);
    if (a.pageEnd) L.push(`<endPage>${xml(a.pageEnd)}</endPage>`);
    if (a.doi) L.push(`<doi>${xml(a.doi)}</doi>`);
    L.push(`<publisherRecordId>${xml(a.slug)}</publisherRecordId>`, `<documentType>${xml(a.articleType)}</documentType>`);
    L.push(`<title language="${lang}">${xml(a.title)}</title>`);
    if (authors.length) {
      L.push("<authors>");
      for (const au of authors) {
        L.push(`<author><name>${xml(au.name)}</name>${au.email ? `<email>${xml(au.email)}</email>` : ""}${au.affs[0] ? `<affiliationId>${affs.indexOf(au.affs[0]) + 1}</affiliationId>` : ""}</author>`);
      }
      L.push("</authors>");
    }
    if (affs.length) L.push(`<affiliationsList>${affs.map((x, i) => `<affiliationName affiliationId="${i + 1}">${xml(x)}</affiliationName>`).join("")}</affiliationsList>`);
    const abs = abstractPlain(a);
    if (abs) L.push(`<abstract language="${lang}">${xml(abs)}</abstract>`);
    L.push(`<fullTextUrl format="html">${xml(articleUrl(cfg, a))}</fullTextUrl>`);
    if (a.keywords.length) L.push(`<keywords language="${lang}">${a.keywords.map((k) => `<keyword>${xml(k)}</keyword>`).join("")}</keywords>`);
    L.push("</record>");
    return L.join("\n");
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<records xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="https://doaj.org/static/doaj/doajArticles.xsd">
${recs.join("\n")}
</records>
`;
}

// ---- RSS -----------------------------------------------------------------

export function rssXml(rows: { article: Article; issue: Issue | null }[], cfg: JournalConfig) {
  const site = baseUrl(cfg);
  const items = rows.map(({ article: a, issue }) => {
    const url = articleUrl(cfg, a);
    const m = monthNum(issue?.month);
    const date = issue ? new Date(Date.UTC(issue.year, (m || 1) - 1, 1)) : a.createdAt;
    return [
      "<item>",
      `<title>${xml(a.title)}</title>`,
      `<link>${xml(url)}</link>`,
      `<guid isPermaLink="true">${xml(url)}</guid>`,
      `<pubDate>${date.toUTCString()}</pubDate>`,
      `<category>${xml(a.articleType)}</category>`,
      `<description>${xml(abstractPlain(a) || a.title)}</description>`,
      ...a.authors.map((x) => `<dc:creator>${xml(x.name)}</dc:creator>`),
      issue ? `<dc:date>${isoMonth(issue)}</dc:date>` : "",
      `<prism:publicationName>${xml(cfg.title)}</prism:publicationName>`,
      cfg.issnPrint ? `<prism:issn>${xml(cfg.issnPrint)}</prism:issn>` : "",
      cfg.issnOnline ? `<prism:eIssn>${xml(cfg.issnOnline)}</prism:eIssn>` : "",
      issue ? `<prism:volume>${issue.volume}</prism:volume><prism:number>${issue.number}</prism:number>` : "",
      a.pageStart ? `<prism:startingPage>${xml(a.pageStart)}</prism:startingPage>` : "",
      a.pageEnd ? `<prism:endingPage>${xml(a.pageEnd)}</prism:endingPage>` : "",
      a.doi ? `<prism:doi>${xml(a.doi)}</prism:doi>` : "",
      `<prism:url>${xml(url)}</prism:url>`,
      "</item>",
    ].filter(Boolean).join("\n");
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:prism="http://prismstandard.org/namespaces/basic/2.0/">
<channel>
<title>${xml(cfg.title)}</title>
<link>${xml(site)}/</link>
<atom:link href="${xml(site)}/feed.xml" rel="self" type="application/rss+xml"/>
<description>Latest articles published in ${xml(cfg.title)}</description>
<language>${xml(cfg.language)}</language>
<copyright>${xml(licenceInfo(cfg).label)}</copyright>
<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items.join("\n")}
</channel>
</rss>
`;
}
