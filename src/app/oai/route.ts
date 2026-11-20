// OAI-PMH 2.0 endpoint (https://www.openarchives.org/OAI/openarchivesprotocol.html).
// Lets DOAJ, BASE, CORE, OpenAIRE, Google Scholar and library catalogues harvest
// the journal's article metadata. Formats: oai_dc (Dublin Core) and jats.
// Sets: one per issue (issue:<slug>) and one per article type (type:<type>).
import { getJournalConfig, baseUrl, type JournalConfig } from "@/lib/journal-config";
import { articleTypesInUse, countPublished, earliestDatestamp, publishedArticles, publishedIssues, type ArticleWithIssue } from "@/lib/indexing/data";
import { dublinCore } from "@/lib/indexing/exports";
import { jatsArticle } from "@/lib/indexing/jats";
import { xml } from "@/lib/indexing/common";
import { issueLabel, slugify } from "@/lib/format";

export const dynamic = "force-dynamic";

const PAGE = 50;
const FORMATS = {
  oai_dc: { schema: "http://www.openarchives.org/OAI/2.0/oai_dc.xsd", ns: "http://www.openarchives.org/OAI/2.0/oai_dc/" },
  jats: { schema: "https://jats.nlm.nih.gov/publishing/1.3/xsd/JATS-journalpublishing1-3.xsd", ns: "https://jats.nlm.nih.gov/publishing/1.3/" },
} as const;
type Prefix = keyof typeof FORMATS;

const isoSec = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "Z");

class OaiError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

function repoId(cfg: JournalConfig) {
  try { return new URL(baseUrl(cfg)).hostname; } catch { return "localhost"; }
}
const oaiId = (cfg: JournalConfig, slug: string) => `oai:${repoId(cfg)}:article/${slug}`;

function parseDate(v: string | null, end: boolean) {
  if (!v) return undefined;
  const m = v.match(/^(\d{4}-\d{2}-\d{2})(T\d{2}:\d{2}:\d{2}Z)?$/);
  if (!m) throw new OaiError("badArgument", `Bad date: ${v}`);
  const d = new Date(m[2] ? v : `${m[1]}T${end ? "23:59:59" : "00:00:00"}Z`);
  if (isNaN(+d)) throw new OaiError("badArgument", `Bad date: ${v}`);
  return { date: d, gran: m[2] ? "s" : "d" };
}

type Query = { prefix: Prefix; set?: string; from?: string; until?: string; offset: number };
const encodeToken = (q: Query) => Buffer.from(JSON.stringify(q)).toString("base64url");
function decodeToken(t: string): Query {
  try {
    const q = JSON.parse(Buffer.from(t, "base64url").toString("utf8")) as Query;
    if (!(q.prefix in FORMATS) || typeof q.offset !== "number") throw new Error();
    return q;
  } catch { throw new OaiError("badResumptionToken", "The resumption token is invalid or has expired."); }
}

async function setFilter(set?: string) {
  if (!set) return {};
  if (set.startsWith("issue:")) return { issueSlug: set.slice(6) };
  if (set.startsWith("type:")) {
    const types = await articleTypesInUse();
    const t = types.find((x) => slugify(x) === set.slice(5));
    if (!t) throw new OaiError("noRecordsMatch", "No records in that set.");
    return { type: t };
  }
  throw new OaiError("noRecordsMatch", "Unknown set.");
}

function header(cfg: JournalConfig, r: ArticleWithIssue) {
  const sets = [r.issue ? `<setSpec>issue:${xml(r.issue.slug)}</setSpec>` : "", `<setSpec>type:${xml(slugify(r.article.articleType))}</setSpec>`].join("");
  return `<header><identifier>${xml(oaiId(cfg, r.article.slug))}</identifier><datestamp>${isoSec(r.article.updatedAt)}</datestamp>${sets}</header>`;
}

function metadata(cfg: JournalConfig, r: ArticleWithIssue, prefix: Prefix) {
  return prefix === "oai_dc" ? dublinCore(r.article, r.issue, cfg) : jatsArticle(r.article, r.issue, cfg, { doctype: false });
}

async function handle(params: URLSearchParams, cfg: JournalConfig): Promise<{ attrs: Record<string, string>; body: string }> {
  const verb = params.get("verb") || "";
  const allowed: Record<string, string[]> = {
    Identify: [], ListMetadataFormats: ["identifier"], ListSets: ["resumptionToken"],
    GetRecord: ["identifier", "metadataPrefix"], ListIdentifiers: ["metadataPrefix", "from", "until", "set", "resumptionToken"],
    ListRecords: ["metadataPrefix", "from", "until", "set", "resumptionToken"],
  };
  if (!(verb in allowed)) throw new OaiError("badVerb", "Illegal or missing verb.");
  const attrs: Record<string, string> = { verb };
  for (const [k, v] of params) {
    if (k === "verb") continue;
    if (!allowed[verb].includes(k)) throw new OaiError("badArgument", `Illegal argument: ${k}`);
    if (params.getAll(k).length > 1) throw new OaiError("badArgument", `Repeated argument: ${k}`);
    attrs[k] = v;
  }

  if (verb === "Identify") {
    const earliest = await earliestDatestamp();
    return {
      attrs,
      body: `<Identify>
<repositoryName>${xml(cfg.title)}</repositoryName>
<baseURL>${xml(baseUrl(cfg))}/oai</baseURL>
<protocolVersion>2.0</protocolVersion>
<adminEmail>${xml(cfg.contactEmail)}</adminEmail>
<earliestDatestamp>${isoSec(earliest)}</earliestDatestamp>
<deletedRecord>transient</deletedRecord>
<granularity>YYYY-MM-DDThh:mm:ssZ</granularity>
<description><oai-identifier xmlns="http://www.openarchives.org/OAI/2.0/oai-identifier" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/oai-identifier http://www.openarchives.org/OAI/2.0/oai-identifier.xsd"><scheme>oai</scheme><repositoryIdentifier>${xml(repoId(cfg))}</repositoryIdentifier><delimiter>:</delimiter><sampleIdentifier>${xml(oaiId(cfg, "article-slug"))}</sampleIdentifier></oai-identifier></description>
</Identify>`,
    };
  }

  if (verb === "ListMetadataFormats") {
    if (attrs.identifier) await getOne(cfg, attrs.identifier);
    return {
      attrs,
      body: `<ListMetadataFormats>${Object.entries(FORMATS).map(([p, f]) => `<metadataFormat><metadataPrefix>${p}</metadataPrefix><schema>${f.schema}</schema><metadataNamespace>${f.ns}</metadataNamespace></metadataFormat>`).join("")}</ListMetadataFormats>`,
    };
  }

  if (verb === "ListSets") {
    if (attrs.resumptionToken) throw new OaiError("badResumptionToken", "This list is never split.");
    const [iss, types] = await Promise.all([publishedIssues(), articleTypesInUse()]);
    const sets = [
      ...iss.map((i) => `<set><setSpec>issue:${xml(i.slug)}</setSpec><setName>${xml(issueLabel(i))}</setName></set>`),
      ...types.map((t) => `<set><setSpec>type:${xml(slugify(t))}</setSpec><setName>${xml(t)}</setName></set>`),
    ];
    return { attrs, body: `<ListSets>${sets.join("")}</ListSets>` };
  }

  if (verb === "GetRecord") {
    if (!attrs.identifier || !attrs.metadataPrefix) throw new OaiError("badArgument", "identifier and metadataPrefix are required.");
    if (!(attrs.metadataPrefix in FORMATS)) throw new OaiError("cannotDisseminateFormat", "Unsupported metadataPrefix.");
    const r = await getOne(cfg, attrs.identifier);
    return { attrs, body: `<GetRecord><record>${header(cfg, r)}<metadata>${metadata(cfg, r, attrs.metadataPrefix as Prefix)}</metadata></record></GetRecord>` };
  }

  // ListIdentifiers / ListRecords
  let q: Query;
  if (attrs.resumptionToken) {
    if (Object.keys(attrs).length > 2) throw new OaiError("badArgument", "resumptionToken is an exclusive argument.");
    q = decodeToken(attrs.resumptionToken);
  } else {
    if (!attrs.metadataPrefix) throw new OaiError("badArgument", "metadataPrefix is required.");
    if (!(attrs.metadataPrefix in FORMATS)) throw new OaiError("cannotDisseminateFormat", "Unsupported metadataPrefix.");
    q = { prefix: attrs.metadataPrefix as Prefix, set: attrs.set, from: attrs.from, until: attrs.until, offset: 0 };
  }
  const from = parseDate(q.from ?? null, false), until = parseDate(q.until ?? null, true);
  if (from && until && from.gran !== until.gran) throw new OaiError("badArgument", "from and until must have the same granularity.");
  if (from && until && from.date > until.date) throw new OaiError("badArgument", "from is after until.");
  const filter = { ...(await setFilter(q.set)), from: from?.date, until: until?.date };
  const total = await countPublished(filter);
  const rows = await publishedArticles({ ...filter, limit: PAGE, offset: q.offset });
  if (!rows.length) throw new OaiError("noRecordsMatch", "No records match the request.");
  const next = q.offset + rows.length;
  const token = next < total
    ? `<resumptionToken completeListSize="${total}" cursor="${q.offset}">${encodeToken({ ...q, offset: next })}</resumptionToken>`
    : q.offset > 0 ? `<resumptionToken completeListSize="${total}" cursor="${q.offset}"/>` : "";
  const items = rows.map((r) => (verb === "ListIdentifiers" ? header(cfg, r) : `<record>${header(cfg, r)}<metadata>${metadata(cfg, r, q.prefix)}</metadata></record>`));
  return { attrs, body: `<${verb}>${items.join("\n")}${token}</${verb}>` };
}

async function getOne(cfg: JournalConfig, identifier: string) {
  const prefix = `oai:${repoId(cfg)}:article/`;
  if (!identifier.startsWith(prefix)) throw new OaiError("idDoesNotExist", "Unknown identifier.");
  const slug = identifier.slice(prefix.length);
  const rows = (await publishedArticles()).filter((r) => r.article.slug === slug);
  if (!rows.length) throw new OaiError("idDoesNotExist", "Unknown identifier.");
  return rows[0];
}

async function respond(params: URLSearchParams) {
  const cfg = await getJournalConfig();
  let inner: string;
  try {
    const { attrs, body } = await handle(params, cfg);
    inner = `<request ${Object.entries(attrs).map(([k, v]) => `${k}="${xml(v)}"`).join(" ")}>${xml(baseUrl(cfg))}/oai</request>\n${body}`;
  } catch (e) {
    if (!(e instanceof OaiError)) throw e;
    // Per the spec, the request element echoes arguments only when the request was valid.
    const echo = e.code === "badVerb" || e.code === "badArgument" ? "" : ` verb="${xml(params.get("verb"))}"`;
    inner = `<request${echo}>${xml(baseUrl(cfg))}/oai</request>\n<error code="${e.code}">${xml(e.message)}</error>`;
  }
  const doc = `<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">
<responseDate>${isoSec(new Date())}</responseDate>
${inner}
</OAI-PMH>
`;
  return new Response(doc, { headers: { "Content-Type": "text/xml; charset=utf-8" } });
}

export async function GET(req: Request) {
  return respond(new URL(req.url).searchParams);
}

export async function POST(req: Request) {
  const text = await req.text();
  return respond(new URLSearchParams(text));
}
