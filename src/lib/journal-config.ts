// Journal-wide details that indexing services read: ISSN, DOI prefix, licence,
// publisher, contact. Editors change them in Editor panel > Journal settings;
// they are kept in the site_settings table (key "journal"). Anything not set
// falls back to DEFAULT_CONFIG.
import "server-only";
import { cache } from "react";
import { eq, like } from "drizzle-orm";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { JOURNAL, JOURNAL_ABBR, SITE_URL } from "./site";
import { DEFAULT_POLICIES, type PolicyDef } from "./policies";

export type JournalConfig = {
  title: string;
  abbrevTitle: string;
  publisher: string;
  publisherAddress: string;
  country: string;
  /** Two-letter language code of the articles (ISO 639-1). */
  language: string;
  issnPrint: string;
  issnOnline: string;
  frequency: string;
  editorInChief: string;
  contactEmail: string;
  contactPhone: string;
  /** Public web address of the live site, e.g. https://proceedings.kimshealth.org (no trailing slash). */
  siteUrl: string;
  /** Crossref DOI prefix, e.g. 10.12345. */
  doiPrefix: string;
  /** How new DOIs are built: {prefix} {year} {volume} {issue} {seq} {page}. */
  doiPattern: string;
  /** Licence key from LICENCES. */
  licence: string;
  copyrightHolder: string;
  /** Statement about author fees (DOAJ asks for one). */
  feesStatement: string;
  crossrefDepositorName: string;
  crossrefDepositorEmail: string;
  googleVerification: string;
  bingVerification: string;
};

export const LICENCES: Record<string, { label: string; url: string; short: string }> = {
  "CC BY 4.0": { label: "Creative Commons Attribution 4.0 International (CC BY 4.0)", url: "https://creativecommons.org/licenses/by/4.0/", short: "CC BY 4.0" },
  "CC BY-SA 4.0": { label: "Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)", url: "https://creativecommons.org/licenses/by-sa/4.0/", short: "CC BY-SA 4.0" },
  "CC BY-NC 4.0": { label: "Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)", url: "https://creativecommons.org/licenses/by-nc/4.0/", short: "CC BY-NC 4.0" },
  "CC BY-NC-SA 4.0": { label: "Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)", url: "https://creativecommons.org/licenses/by-nc-sa/4.0/", short: "CC BY-NC-SA 4.0" },
  "CC BY-NC-ND 4.0": { label: "Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International (CC BY-NC-ND 4.0)", url: "https://creativecommons.org/licenses/by-nc-nd/4.0/", short: "CC BY-NC-ND 4.0" },
};

export const DEFAULT_CONFIG: JournalConfig = {
  title: JOURNAL,
  abbrevTitle: JOURNAL_ABBR,
  publisher: "KIMSHEALTH",
  publisherAddress: "KIMSHEALTH, P.B. No.1, Anayara P.O., Trivandrum 695029, Kerala, India",
  country: "India",
  language: "en",
  issnPrint: "",
  issnOnline: "",
  frequency: "Quarterly",
  editorInChief: "",
  contactEmail: "kimsproceedings@kimsglobal.com",
  contactPhone: "",
  siteUrl: "",
  doiPrefix: "",
  doiPattern: "{prefix}/ksp.{year}.{volume}.{issue}.{seq}",
  licence: "CC BY-NC 4.0",
  copyrightHolder: "The Authors",
  feesStatement: "The journal does not charge authors any submission, processing or publication fees.",
  crossrefDepositorName: "",
  crossrefDepositorEmail: "",
  googleVerification: "",
  bingVerification: "",
};

/** Fields the settings form shows, in order, with plain-language help. */
export const CONFIG_FIELDS: { name: keyof JournalConfig; label: string; hint?: string; group: string; type?: "select" | "textarea"; half?: boolean }[] = [
  { group: "Journal", name: "title", label: "Journal title" },
  { group: "Journal", name: "abbrevTitle", label: "Abbreviated title", hint: "ISO 4 / NLM style abbreviation used in citations.", half: true },
  { group: "Journal", name: "frequency", label: "Publication frequency", hint: "e.g. Quarterly", half: true },
  { group: "Journal", name: "issnPrint", label: "Print ISSN", hint: "From the ISSN National Centre, e.g. 1234-5678. Leave blank until assigned.", half: true },
  { group: "Journal", name: "issnOnline", label: "Online ISSN (e-ISSN)", hint: "A separate ISSN for this website edition.", half: true },
  { group: "Journal", name: "editorInChief", label: "Editor-in-Chief", half: true },
  { group: "Journal", name: "language", label: "Language code", hint: "en = English", half: true },
  { group: "Publisher and contact", name: "publisher", label: "Publisher", half: true },
  { group: "Publisher and contact", name: "country", label: "Country", half: true },
  { group: "Publisher and contact", name: "publisherAddress", label: "Postal address" },
  { group: "Publisher and contact", name: "contactEmail", label: "Editorial email", half: true },
  { group: "Publisher and contact", name: "contactPhone", label: "Phone", half: true },
  { group: "Website", name: "siteUrl", label: "Public website address", hint: "The address of the live site, e.g. https://proceedings.kimshealth.org. Indexers are given links that start with this. Leave blank while testing on this computer." },
  { group: "Website", name: "googleVerification", label: "Google Search Console code", hint: "Only the code from the google-site-verification tag.", half: true },
  { group: "Website", name: "bingVerification", label: "Bing Webmaster code", hint: "Only the code from the msvalidate.01 tag.", half: true },
  { group: "Licence and fees", name: "licence", label: "Licence for articles", type: "select", hint: "Creative Commons licence that readers may reuse articles under. DOAJ prefers CC BY." },
  { group: "Licence and fees", name: "copyrightHolder", label: "Copyright holder", hint: "Usually \"The Authors\" for open access journals.", half: true },
  { group: "Licence and fees", name: "feesStatement", label: "Author fees statement", type: "textarea", hint: "Shown on the Open Access page. Change it if the journal charges any fee." },
  { group: "DOIs (Crossref)", name: "doiPrefix", label: "DOI prefix", hint: "Given by Crossref when the publisher joins, e.g. 10.12345.", half: true },
  { group: "DOIs (Crossref)", name: "doiPattern", label: "DOI pattern for new articles", hint: "{prefix} {year} {volume} {issue} {seq} {page}", half: true },
  { group: "DOIs (Crossref)", name: "crossrefDepositorName", label: "Crossref depositor name", hint: "Person or office named in deposit files.", half: true },
  { group: "DOIs (Crossref)", name: "crossrefDepositorEmail", label: "Crossref depositor email", hint: "Crossref sends deposit results here.", half: true },
];

async function readSetting<T>(key: string): Promise<T | null> {
  try {
    const rows = await db.select().from(siteSettings).where(eq(siteSettings.key, key)).limit(1);
    return (rows[0]?.value as T) ?? null;
  } catch {
    return null; // table missing during a first build: use defaults
  }
}

export async function writeSetting(key: string, value: unknown) {
  await db.insert(siteSettings).values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedAt: new Date() } });
}

export const getJournalConfig = cache(async (): Promise<JournalConfig> => {
  const saved = (await readSetting<Partial<JournalConfig>>("journal")) || {};
  const out = { ...DEFAULT_CONFIG };
  for (const k of Object.keys(DEFAULT_CONFIG) as (keyof JournalConfig)[]) {
    const v = saved[k];
    if (typeof v === "string") out[k] = v.trim();
  }
  if (!LICENCES[out.licence]) out.licence = DEFAULT_CONFIG.licence;
  out.siteUrl = out.siteUrl.replace(/\/+$/, "");
  return out;
});

/** Base address used in links given to indexers. */
export function baseUrl(cfg: JournalConfig) {
  return cfg.siteUrl || SITE_URL;
}

export function licenceOf(cfg: JournalConfig) {
  return LICENCES[cfg.licence] || LICENCES[DEFAULT_CONFIG.licence];
}

export function issns(cfg: JournalConfig) {
  return [cfg.issnPrint && { issn: cfg.issnPrint, type: "print" as const }, cfg.issnOnline && { issn: cfg.issnOnline, type: "electronic" as const }].filter(Boolean) as { issn: string; type: "print" | "electronic" }[];
}

// ---- Policy pages -------------------------------------------------------

export type Policy = PolicyDef & { approved: boolean; edited: boolean; updatedAt: string | null };
type SavedPolicy = { title?: string; body?: string; approved?: boolean; updatedAt?: string };

export const getPolicies = cache(async (): Promise<Policy[]> => {
  let rows: { key: string; value: unknown }[] = [];
  try {
    rows = await db.select({ key: siteSettings.key, value: siteSettings.value }).from(siteSettings).where(like(siteSettings.key, "policy:%"));
  } catch { /* defaults */ }
  const saved = new Map(rows.map((r) => [r.key.slice(7), r.value as SavedPolicy]));
  return DEFAULT_POLICIES.map((d) => {
    const s = saved.get(d.slug);
    return {
      ...d,
      title: s?.title || d.title,
      body: s?.body ?? d.body,
      approved: !!s?.approved,
      edited: s?.body != null && s.body !== d.body,
      updatedAt: s?.updatedAt ?? null,
    };
  });
});

export async function getPolicy(slug: string) {
  return (await getPolicies()).find((p) => p.slug === slug) ?? null;
}

export async function savePolicy(slug: string, v: { title: string; body: string; approved: boolean }) {
  await writeSetting(`policy:${slug}`, { ...v, updatedAt: new Date().toISOString() });
}

/** Fills {{placeholders}} in policy text from the journal settings. */
export function fillPolicy(text: string, cfg: JournalConfig) {
  const lic = licenceOf(cfg);
  const issn = [cfg.issnPrint && `${cfg.issnPrint} (print)`, cfg.issnOnline && `${cfg.issnOnline} (online)`].filter(Boolean).join(", ") || "to be assigned";
  const map: Record<string, string> = {
    journal: cfg.title, abbrev: cfg.abbrevTitle, publisher: cfg.publisher, address: cfg.publisherAddress,
    email: cfg.contactEmail, phone: cfg.contactPhone, licence: lic.label, licenceShort: lic.short, licenceUrl: lic.url,
    copyright: cfg.copyrightHolder, fees: cfg.feesStatement, issn, frequency: cfg.frequency, editor: cfg.editorInChief || "the Editor-in-Chief",
  };
  return text.replace(/\{\{(\w+)\}\}/g, (m, k: string) => (k in map ? map[k] : m));
}
