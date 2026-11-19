// The parts of an import that need reading comprehension: working out where
// each article starts and ends, and transcribing articles, Pharma Updates,
// Spotters and Scramble into the site's structure. Uses the Claude API.
import Anthropic from "@anthropic-ai/sdk";
import type { PdfPage } from "./pdf";
import { ARTICLE_TYPES } from "../site";

import { DEFAULT_MODEL } from "./constants";
export { DEFAULT_MODEL };

const TYPES = [...ARTICLE_TYPES];

export type Usage = { input: number; output: number };

type Json = Record<string, unknown>;
const str = { type: "string" } as const;
const int = { type: "integer" } as const;
const arr = (items: Json) => ({ type: "array", items });
const obj = (properties: Record<string, Json>): Json => ({
  type: "object", properties, required: Object.keys(properties), additionalProperties: false,
});

const SYSTEM = `You convert the PDF of an edition of "KIMSHEALTH Scientific Proceedings", a clinical and scientific research journal, into structured data for the journal's website.

You are given the pages you need as images, each with the text layer extracted from the PDF (which can be empty for scanned pages, or out of order in multi-column layouts: trust the image for reading order, the text layer for exact spelling). Transcribe faithfully: never summarise, shorten, correct or invent content, and never add text that is not printed. Leave out running headers and footers, page numbers, the journal name and issue line printed on every page, and any text that belongs to a different article on a shared page.

Rich text fields use this markup:
- Paragraphs are separated by a blank line. Join the lines of a paragraph into one line and rejoin words hyphenated at a line break.
- "## Heading" for section headings, "### Subheading" for subsections. Do not include the article title or the word "Abstract" as a heading.
- "- item" for bullet lists, "1. item" for numbered lists, one item per line.
- Citations to the reference list: ^1^, ^1,2^, ^4-8^ placed where the superscript is printed. Other superscripts: ^2^ (e.g. mm^3^); subscripts: ~2~ (e.g. CO~2~). **bold** and *italic* where printed.
- A figure: one line "!fig REF | Figure 1: caption text" placed where the figure appears in the reading flow. REF is a picture id from the list given for each page (like p12i1); several pictures of one figure are separated by commas (p12i1, p12i2). When a figure is not in the list (a chart or diagram drawn as vector graphics, or a scanned page), give its box instead as p12@x0/y0/x1/y1 with fractions of the page width and height measured from the top-left corner, covering the picture only, not its caption.
- A table:
!table
caption: Table 1: caption text
Header 1 | Header 2 | Header 3
cell | cell | cell
!end
Cells are separated by " | ". Every row has the same number of cells as the header (use empty cells where needed). A row written starting with " | " continues the cell above in the first column.
- A boxed panel or sidebar: "!box Title" on its own line, then its content, then "!endbox".
- "> text" for a single highlighted line.`;

function client(apiKey: string) {
  return new Anthropic({ apiKey, maxRetries: 4, timeout: 15 * 60 * 1000 });
}

type ImageBlock = { type: "image"; source: { type: "base64"; media_type: "image/jpeg"; data: string } };
type TextBlock = { type: "text"; text: string };
export type Content = (ImageBlock | TextBlock)[];

export const imageBlock = (jpeg: Buffer): ImageBlock => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: jpeg.toString("base64") } });
export const textBlock = (text: string): TextBlock => ({ type: "text", text });

/** Describes a page for the model: its number, extracted text and the pictures on it. */
export function pageLabel(p: PdfPage, withText = true, maxText = 12000) {
  const pics = p.images.length
    ? p.images.map((i) => `${i.id} at x ${i.x0}-${i.x1}, y ${i.y0}-${i.y1}`).join("; ")
    : "none found";
  const text = withText ? (p.text ? p.text.slice(0, maxText) : "(no text layer: read the image)") : "";
  return `=== PDF page ${p.n} ===\nPictures on this page: ${pics}${withText ? `\nText layer:\n${text}` : ""}`;
}

async function ask<T>(apiKey: string, model: string, content: Content, schema: Json, maxTokens: number, usage: Usage): Promise<T> {
  const params = {
    model,
    max_tokens: maxTokens,
    system: [{ type: "text" as const, text: SYSTEM, cache_control: { type: "ephemeral" as const } }],
    messages: [{ role: "user" as const, content }],
    thinking: { type: "adaptive" as const },
    output_config: { effort: "medium" as const, format: { type: "json_schema" as const, schema } },
  };
  // On the default model, let the API retry on a fallback model if a safety
  // classifier declines (medical text sometimes trips these).
  const msg = model === DEFAULT_MODEL
    ? await client(apiKey).beta.messages.stream({ ...params, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" }).finalMessage()
    : await client(apiKey).beta.messages.stream(params).finalMessage();
  usage.input += (msg.usage.input_tokens ?? 0) + (msg.usage.cache_creation_input_tokens ?? 0) + (msg.usage.cache_read_input_tokens ?? 0);
  usage.output += msg.usage.output_tokens ?? 0;
  if (msg.stop_reason === "refusal") throw new Error("Claude declined to process these pages.");
  if (msg.stop_reason === "max_tokens") throw new Error("The answer was too long and got cut off.");
  const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Claude's answer could not be read (not valid JSON).");
  }
}

/* ---------------------------------------------------------------- plan */

export type Plan = {
  volume: number; number: number; month: string; year: number;
  description: string;
  highlights: string[];
  editorialBoard: { role: string; members: { name: string; title: string }[] }[];
  pageOffset: number;
  articles: { title: string; articleType: string; pdfStart: number; pdfEnd: number; printedStart: string; printedEnd: string }[];
  featurePages: { pharma: number[]; radiologySpotters: number[]; dermatologySpotters: number[]; scramble: number[]; answers: number[] };
  contributors: { pharma: string; radiologySpotters: string; dermatologySpotters: string; scramble: string };
};

const planSchema = obj({
  volume: int, number: int, month: str, year: int,
  description: str,
  highlights: arr(str),
  editorialBoard: arr(obj({ role: str, members: arr(obj({ name: str, title: str })) })),
  pageOffset: int,
  articles: arr(obj({ title: str, articleType: { type: "string", enum: TYPES }, pdfStart: int, pdfEnd: int, printedStart: str, printedEnd: str })),
  featurePages: obj({ pharma: arr(int), radiologySpotters: arr(int), dermatologySpotters: arr(int), scramble: arr(int), answers: arr(int) }),
  contributors: obj({ pharma: str, radiologySpotters: str, dermatologySpotters: str, scramble: str }),
});

export function planEdition(apiKey: string, model: string, content: Content, usage: Usage) {
  content.push(textBlock(`Work out the structure of this edition. Return:
- volume, number (issue number), month (full English month name) and year, from the cover or masthead.
- description: the "about the journal" paragraph if one is printed, else "".
- highlights: the short lines printed on the cover under "Issue Highlights" or similar (empty if none).
- editorialBoard: the masthead (Editor-in-Chief, Executive Editor, Editorial Board Members, Associate Editors and so on), each group with its members' names and titles as printed (title "" if none).
- pageOffset: PDF page number minus printed page number (the number printed in the page footer). For example if printed page 1 is PDF page 3, pageOffset is 2. Use 0 if pages are not numbered.
- articles: every scholarly item in reading order (editorials, original research, reviews, case reports, audits, perspectives and similar), with its title exactly as printed, its type (pick the closest from the list), the PDF pages it starts and ends on, and its printed start and end page numbers ("" if not printed). Use the table of contents to help, but trust the pages. Do not list Pharma Updates, Radiology/Dermatology Spotters, Scramble, answer pages, adverts, the masthead or the contents page as articles.
- featurePages: PDF page numbers of the Pharma Updates section, the Radiology Spotters, the Dermatology Spotters, the Scramble puzzle, and any pages printing answers to the spotters or scramble (empty lists for sections the edition does not have).
- contributors: the people credited for compiling each of those sections, as printed (e.g. "Compiled by Dr. X, Department of Y"), or "".`));
  return ask<Plan>(apiKey, model, content, planSchema, 32000, usage);
}

/* ------------------------------------------------------------- article */

export type ArticleOut = {
  title: string; articleType: string;
  authors: { name: string; aff: string }[];
  affiliations: { key: string; text: string }[];
  correspondingAuthor: string; correspondingEmail: string;
  keywords: string[];
  abstract: { heading: string; text: string }[];
  body: string; notes: string; refs: string[];
  doi: string; printedStart: string; printedEnd: string;
  mainImage: string;
};

const articleSchema = obj({
  title: str, articleType: { type: "string", enum: TYPES },
  authors: arr(obj({ name: str, aff: str })),
  affiliations: arr(obj({ key: str, text: str })),
  correspondingAuthor: str, correspondingEmail: str,
  keywords: arr(str),
  abstract: arr(obj({ heading: str, text: str })),
  body: str, notes: str, refs: arr(str),
  doi: str, printedStart: str, printedEnd: str,
  mainImage: str,
});

export function extractArticle(apiKey: string, model: string, content: Content, hint: Plan["articles"][number], usage: Usage) {
  content.push(textBlock(`Transcribe the article titled "${hint.title}" (${hint.articleType}) from these pages, in full. Return:
- title exactly as printed (sentence case as printed, no trailing full stop), and the article type.
- authors in printed order: name without degrees or titles, and aff = the affiliation marker(s) printed after the name (e.g. "a" or "1,2"; "" if none).
- affiliations: each affiliation with its marker as key. If the article prints affiliations without markers, key them "a", "b", ... in order and give each author the matching key.
- correspondingAuthor (name and address as printed) and correspondingEmail, or "".
- keywords as printed (empty if none).
- abstract: for a structured abstract one entry per printed heading (Background, Methods, Results, Conclusion...); for an unstructured abstract one entry with heading "". Plain text with ^n^ citations. Empty list if the article has no abstract (common for editorials).
- body: everything after the abstract and keywords up to the references, in the markup. Include every figure and table.
- notes: end matter that is not references (acknowledgements, conflict of interest, funding, consent, author contributions), in the markup, or "".
- refs: the reference list, one entry per reference, without its leading number, exactly as printed (include DOIs and URLs).
- doi of the article if printed, else "".
- printedStart and printedEnd: printed page numbers of the article's first and last page ("" if not printed).
- mainImage: the figure REF that best represents the article (usually Figure 1), or "" if it has no figures.`));
  return ask<ArticleOut>(apiKey, model, content, articleSchema, 64000, usage);
}

/* ------------------------------------------------------------ features */

export type FeaturesOut = {
  pharma: { title: string; summary: string; body: string; image: string; refs: string[] }[];
  spotters: { category: "Radiology" | "Dermatology"; caseNo: number; question: string; options: string[]; diagnosis: string; findings: string; images: string[] }[];
  scramble: { specialty: string; clue: string; scrambled: string; answer: string }[];
};

const featuresSchema = obj({
  pharma: arr(obj({ title: str, summary: str, body: str, image: str, refs: arr(str) })),
  spotters: arr(obj({ category: { type: "string", enum: ["Radiology", "Dermatology"] }, caseNo: int, question: str, options: arr(str), diagnosis: str, findings: str, images: arr(str) })),
  scramble: arr(obj({ specialty: str, clue: str, scrambled: str, answer: str })),
});

export function extractFeatures(apiKey: string, model: string, content: Content, usage: Usage) {
  content.push(textBlock(`These pages hold the edition's regular sections. Return:
- pharma: each Pharma Update (drug news item): title, summary (its first sentence, as printed), body in the markup (without the title), image = the REF of its picture or "", refs = its references without numbers.
- spotters: each Radiology or Dermatology Spotter case: category, caseNo, question (the clinical history and the question asked), options (multiple-choice options as printed, e.g. "A. Psoriasis"; empty if none), diagnosis (the answer, from the answer page if it is printed separately), findings (the explanation printed with the answer: imaging findings, differentials, teaching points; use a new line between parts), images = REFs of the case's pictures.
- scramble: each scrambled word: specialty (the heading it is under), clue, scrambled (the jumbled letters exactly as printed), answer (from the answers page; if no answer is printed, solve it from the clue and the letters).
Use empty lists for sections that are not on these pages.`));
  return ask<FeaturesOut>(apiKey, model, content, featuresSchema, 48000, usage);
}
