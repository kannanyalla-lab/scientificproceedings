import { ARTICLE_TYPES, MONTHS, SUBMISSION_STATUSES } from "./site";

export type FieldType =
  | "text" | "textarea" | "html" | "number" | "checkbox" | "select" | "issue"
  | "file" | "authors" | "affiliations" | "abstract" | "lines" | "keywords" | "readonly";

export type Field = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: readonly string[];
  hint?: string;
  accept?: string;
  half?: boolean;
};

export type EntityConfig = {
  key: string;
  label: string;
  plural: string;
  fields: Field[];
  listColumns: { name: string; label: string }[];
  canCreate?: boolean;
  publicPath?: (row: Record<string, unknown>) => string | null;
};

const IMG = "image/jpeg,image/png,image/webp,image/gif";

export const ENTITIES: Record<string, EntityConfig> = {
  issues: {
    key: "issues", label: "Issue", plural: "Issues", canCreate: true,
    publicPath: (r) => `/issue/${r.slug}`,
    listColumns: [{ name: "label", label: "Issue" }, { name: "isCurrent", label: "Current" }, { name: "published", label: "Status" }],
    fields: [
      { name: "volume", label: "Volume", type: "number", required: true, half: true },
      { name: "number", label: "Issue number", type: "number", required: true, half: true },
      { name: "month", label: "Month", type: "select", options: MONTHS, required: true, half: true },
      { name: "year", label: "Year", type: "number", required: true, half: true },
      { name: "slug", label: "URL slug", type: "text", hint: "Leave blank to generate one, e.g. march-2026-volume-12-issue-01." },
      { name: "coverUrl", label: "Cover image", type: "file", accept: IMG },
      { name: "description", label: "Editor's note / description", type: "textarea" },
      { name: "spotterContributors", label: "Radiology Spotters contributors", type: "text" },
      { name: "scrambleContributors", label: "Scramble compiled by", type: "text" },
      { name: "isCurrent", label: "This is the current issue (shown on the home page)", type: "checkbox" },
      { name: "published", label: "Published (visible on the site)", type: "checkbox" },
    ],
  },
  articles: {
    key: "articles", label: "Article", plural: "Articles", canCreate: true,
    publicPath: (r) => `/article/${r.slug}`,
    listColumns: [{ name: "title", label: "Title" }, { name: "articleType", label: "Type" }, { name: "issue", label: "Issue" }, { name: "views", label: "Views" }, { name: "published", label: "Status" }],
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "issueId", label: "Issue", type: "issue", half: true },
      { name: "articleType", label: "Article type", type: "select", options: ARTICLE_TYPES, required: true, half: true },
      { name: "authors", label: "Authors", type: "authors", hint: "One per line as  Name | affiliation letter, e.g.  Greeshma Baby | a" },
      { name: "affiliations", label: "Affiliations", type: "affiliations", hint: "One per line as  letter | text, e.g.  a | Department of Pediatric Neurology, KIMSHEALTH, Trivandrum" },
      { name: "correspondingAuthor", label: "Corresponding author", type: "text", half: true },
      { name: "correspondingEmail", label: "Corresponding author email", type: "text", half: true },
      { name: "keywords", label: "Keywords", type: "keywords", hint: "Comma separated." },
      { name: "abstract", label: "Abstract", type: "abstract", hint: "Start each section with a heading line like  ## Background  then the text below it." },
      { name: "bodyHtml", label: "Full text (HTML)", type: "html", hint: "Use <h2 id=\"introduction\">Introduction</h2> for sections (they appear in 'On this page'), <p> for paragraphs and <figure><img src=…><figcaption>…</figcaption></figure> for figures." },
      { name: "refs", label: "References", type: "lines", hint: "One reference per line, in citation order." },
      { name: "imageUrl", label: "Thumbnail image", type: "file", accept: IMG },
      { name: "pdfUrl", label: "PDF", type: "file", accept: "application/pdf" },
      { name: "pageStart", label: "First page", type: "text", half: true },
      { name: "pageEnd", label: "Last page", type: "text", half: true },
      { name: "doi", label: "DOI", type: "text", half: true },
      { name: "sortOrder", label: "Order within issue", type: "number", half: true },
      { name: "slug", label: "URL slug", type: "text", hint: "Leave blank to generate from the title." },
      { name: "featured", label: "Feature in home page highlights", type: "checkbox" },
      { name: "published", label: "Published (visible on the site)", type: "checkbox" },
    ],
  },
  pharma: {
    key: "pharma", label: "Pharma update", plural: "Pharma Updates", canCreate: true,
    publicPath: (r) => `/pharma-updates/${r.slug}`,
    listColumns: [{ name: "title", label: "Title" }, { name: "issue", label: "Issue" }, { name: "published", label: "Status" }],
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "issueId", label: "Issue", type: "issue", half: true },
      { name: "sortOrder", label: "Order", type: "number", half: true },
      { name: "summary", label: "Summary (shown on cards)", type: "textarea" },
      { name: "bodyHtml", label: "Full text (HTML)", type: "html" },
      { name: "imageUrl", label: "Image", type: "file", accept: IMG },
      { name: "slug", label: "URL slug", type: "text", hint: "Leave blank to generate from the title." },
      { name: "published", label: "Published", type: "checkbox" },
    ],
  },
  spotters: {
    key: "spotters", label: "Spotter case", plural: "Radiology Spotters", canCreate: true,
    publicPath: () => "/radiology-spotters",
    listColumns: [{ name: "caseNo", label: "Case" }, { name: "diagnosis", label: "Diagnosis" }, { name: "issue", label: "Issue" }],
    fields: [
      { name: "issueId", label: "Issue", type: "issue", required: true, half: true },
      { name: "caseNo", label: "Case number", type: "number", required: true, half: true },
      { name: "imageUrl", label: "Image", type: "file", accept: IMG },
      { name: "question", label: "Case description", type: "textarea", required: true },
      { name: "diagnosis", label: "Diagnosis (answer)", type: "text", required: true },
      { name: "findings", label: "Imaging findings", type: "textarea", hint: "One finding per line." },
    ],
  },
  scramble: {
    key: "scramble", label: "Scramble word", plural: "Scramble", canCreate: true,
    publicPath: () => "/scramble",
    listColumns: [{ name: "answer", label: "Answer" }, { name: "specialty", label: "Specialty" }, { name: "issue", label: "Issue" }],
    fields: [
      { name: "issueId", label: "Issue", type: "issue", required: true, half: true },
      { name: "specialty", label: "Specialty", type: "text", required: true, half: true },
      { name: "clue", label: "Clue", type: "textarea", required: true },
      { name: "answer", label: "Answer", type: "text", required: true, half: true },
      { name: "scrambled", label: "Scrambled letters", type: "text", hint: "Leave blank to shuffle the answer automatically.", half: true },
      { name: "sortOrder", label: "Order", type: "number", half: true },
    ],
  },
  submissions: {
    key: "submissions", label: "Submission", plural: "Submissions", canCreate: false,
    listColumns: [{ name: "title", label: "Manuscript" }, { name: "name", label: "Author" }, { name: "createdAt", label: "Received" }, { name: "status", label: "Status" }],
    fields: [
      { name: "title", label: "Manuscript title", type: "readonly" },
      { name: "name", label: "Corresponding author", type: "readonly", half: true },
      { name: "email", label: "Email", type: "readonly", half: true },
      { name: "phone", label: "Phone", type: "readonly", half: true },
      { name: "affiliation", label: "Affiliation", type: "readonly", half: true },
      { name: "articleType", label: "Article type", type: "readonly", half: true },
      { name: "createdAt", label: "Received", type: "readonly", half: true },
      { name: "abstract", label: "Abstract", type: "readonly" },
      { name: "fileUrl", label: "Manuscript file", type: "readonly" },
      { name: "status", label: "Status", type: "select", options: SUBMISSION_STATUSES },
      { name: "notes", label: "Editorial notes (private)", type: "textarea" },
    ],
  },
};

// ---- Form value conversion (shared by the form renderer and the save action) ----

type Row = Record<string, unknown>;

export function toFormString(field: Field, value: unknown): string {
  if (value == null) return "";
  switch (field.type) {
    case "authors":
      return (value as { name: string; aff?: string }[]).map((a) => (a.aff ? `${a.name} | ${a.aff}` : a.name)).join("\n");
    case "affiliations":
      return (value as { key: string; text: string }[]).map((a) => `${a.key} | ${a.text}`).join("\n");
    case "abstract":
      return (value as { heading: string; text: string }[]).map((s) => (s.heading ? `## ${s.heading}\n${s.text}` : s.text)).join("\n\n");
    case "lines":
      return (value as string[]).join("\n");
    case "keywords":
      return (value as string[]).join(", ");
    default:
      return value instanceof Date ? value.toISOString().slice(0, 16).replace("T", " ") : String(value);
  }
}

export function parseFormValue(field: Field, raw: string): unknown {
  const v = raw.replace(/\r\n/g, "\n");
  const lines = () => v.split("\n").map((l) => l.trim()).filter(Boolean);
  switch (field.type) {
    case "number":
      return v.trim() === "" ? (field.required ? 0 : 0) : Number(v);
    case "issue":
      return v.trim() === "" ? null : Number(v);
    case "authors":
      return lines().map((l) => { const [name, aff] = l.split("|").map((s) => s.trim()); return aff ? { name, aff } : { name }; });
    case "affiliations":
      return lines().map((l) => { const i = l.indexOf("|"); return i < 0 ? { key: "", text: l } : { key: l.slice(0, i).trim(), text: l.slice(i + 1).trim() }; });
    case "abstract": {
      const out: { heading: string; text: string }[] = [];
      let cur: { heading: string; text: string } | null = null;
      for (const line of v.split("\n")) {
        const m = line.match(/^##\s*(.+)$/);
        if (m) { cur = { heading: m[1].trim(), text: "" }; out.push(cur); continue; }
        if (!cur) { cur = { heading: "", text: "" }; out.push(cur); }
        cur.text += (cur.text ? "\n" : "") + line;
      }
      return out.map((s) => ({ ...s, text: s.text.trim() })).filter((s) => s.heading || s.text);
    }
    case "lines":
      return lines();
    case "keywords":
      return v.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
    default:
      return v.trim() === "" ? null : v.trim();
  }
}

export function isRow(x: unknown): x is Row { return typeof x === "object" && x !== null; }
