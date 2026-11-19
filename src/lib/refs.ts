/** Finds identifiers in a printed reference so it can link out, as journal sites do. */
export type RefInfo = { doi?: string; pmid?: string; pmcid?: string; url?: string };

export function parseRef(text: string): RefInfo {
  const info: RefInfo = {};
  const doi = text.match(/\b(?:doi:\s*|https?:\/\/(?:dx\.)?doi\.org\/)(10\.\d{4,9}\/[^\s,;]+)/i) || text.match(/\b(10\.\d{4,9}\/[^\s,;]+)/);
  if (doi) info.doi = doi[1].replace(/[.)\]]+$/, "");
  const pmid = text.match(/\bPMID:?\s*(\d{6,9})\b/i);
  if (pmid) info.pmid = pmid[1];
  const pmc = text.match(/\b(PMC\d{6,9})\b/);
  if (pmc) info.pmcid = pmc[1];
  const url = text.match(/https?:\/\/[^\s<>"]+/);
  if (url && !/doi\.org\//i.test(url[0])) info.url = url[0].replace(/[.,;)\]]+$/, "");
  return info;
}

/** Title-ish text to search for: the part after the author list, without identifiers. */
export function refQuery(text: string) {
  const clean = text.replace(/\b(doi|PMID|PMCID)[:\s].*$/i, "").replace(/https?:\/\/\S+/g, "").trim();
  const parts = clean.split(/\.\s+/);
  const title = parts.length > 2 ? parts[1] : clean;
  return title.length > 20 ? title : clean.slice(0, 250);
}

export function refLinks(text: string) {
  const r = parseRef(text);
  const q = encodeURIComponent(refQuery(text));
  const links: { label: string; href: string }[] = [];
  if (r.doi) links.push({ label: "DOI", href: `https://doi.org/${r.doi}` });
  if (r.url) links.push({ label: "Link", href: r.url });
  if (r.pmid) links.push({ label: "PubMed", href: `https://pubmed.ncbi.nlm.nih.gov/${r.pmid}/` });
  // Only journal articles (year;volume or a DOI) are worth a PubMed search.
  else if (r.doi || /\b(19|20)\d{2}[^;]{0,20};\s*\d+/.test(text)) links.push({ label: "PubMed", href: `https://pubmed.ncbi.nlm.nih.gov/?term=${q}` });
  if (r.pmcid) links.push({ label: "PMC", href: `https://www.ncbi.nlm.nih.gov/pmc/articles/${r.pmcid}/` });
  links.push({ label: "Google Scholar", href: `https://scholar.google.com/scholar?q=${q}` });
  return links;
}
