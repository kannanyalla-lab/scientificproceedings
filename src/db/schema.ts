import {
  pgTable, bigserial, bigint, text, integer, boolean, timestamp, jsonb, index,
} from "drizzle-orm/pg-core";

export type Author = { name: string; aff?: string };
export type Affiliation = { key: string; text: string };
export type AbstractSection = { heading: string; text: string };
/** One group on the issue masthead, e.g. "Associate Editors". */
export type BoardGroup = { role: string; members: { name: string; title?: string }[] };

const timestamps = {
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
};

export const issues = pgTable("issues", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  slug: text("slug").notNull().unique(),
  volume: integer("volume").notNull(),
  number: integer("number").notNull(),
  month: text("month").notNull(),
  year: integer("year").notNull(),
  coverUrl: text("cover_url"),
  description: text("description"),
  spotterContributors: text("spotter_contributors"),
  dermSpotterContributors: text("derm_spotter_contributors"),
  scrambleContributors: text("scramble_contributors"),
  pharmaContributors: text("pharma_contributors"),
  /** Short lines shown on the cover under "Issue Highlights". */
  highlights: jsonb("highlights").$type<string[]>().notNull().default([]),
  /** The masthead printed inside the front cover of this issue. */
  editorialBoard: jsonb("editorial_board").$type<BoardGroup[]>().notNull().default([]),
  /** Full-issue PDF, and the scanned page images of the printed issue (in page order). */
  pdfUrl: text("pdf_url"),
  pageImages: jsonb("page_images").$type<string[]>().notNull().default([]),
  /** Page image number of printed page 0, so printed page p is image p + pageOffset (1-based). */
  pageOffset: integer("page_offset").notNull().default(0),
  isCurrent: boolean("is_current").notNull().default(false),
  published: boolean("published").notNull().default(true),
  ...timestamps,
});

export const articles = pgTable("articles", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  issueId: bigint("issue_id", { mode: "number" }).references(() => issues.id, { onDelete: "set null" }),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  articleType: text("article_type").notNull().default("Original Research"),
  authors: jsonb("authors").$type<Author[]>().notNull().default([]),
  affiliations: jsonb("affiliations").$type<Affiliation[]>().notNull().default([]),
  correspondingAuthor: text("corresponding_author"),
  correspondingEmail: text("corresponding_email"),
  keywords: jsonb("keywords").$type<string[]>().notNull().default([]),
  abstract: jsonb("abstract").$type<AbstractSection[]>().notNull().default([]),
  bodyHtml: text("body_html"),
  refs: jsonb("refs").$type<string[]>().notNull().default([]),
  imageUrl: text("image_url"),
  pdfUrl: text("pdf_url"),
  /** Declarations and other end matter (consent, conflicts, funding), as HTML. */
  notesHtml: text("notes_html"),
  pageStart: text("page_start"),
  pageEnd: text("page_end"),
  doi: text("doi"),
  featured: boolean("featured").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  views: integer("views").notNull().default(0),
  published: boolean("published").notNull().default(true),
  ...timestamps,
}, (t) => [index("idx_articles_issue").on(t.issueId, t.sortOrder)]);

export const pharmaUpdates = pgTable("pharma_updates", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  issueId: bigint("issue_id", { mode: "number" }).references(() => issues.id, { onDelete: "set null" }),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  summary: text("summary"),
  bodyHtml: text("body_html"),
  imageUrl: text("image_url"),
  refs: jsonb("refs").$type<string[]>().notNull().default([]),
  sortOrder: integer("sort_order").notNull().default(0),
  published: boolean("published").notNull().default(true),
  ...timestamps,
});

export const spotterCases = pgTable("spotter_cases", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  issueId: bigint("issue_id", { mode: "number" }).references(() => issues.id, { onDelete: "cascade" }),
  caseNo: integer("case_no").notNull().default(1),
  /** Spotter quiz the case belongs to: "Radiology" or "Dermatology". */
  category: text("category").notNull().default("Radiology"),
  /** Multiple-choice options, when the printed quiz offers them. */
  options: jsonb("options").$type<string[]>().notNull().default([]),
  imageUrl: text("image_url"),
  question: text("question").notNull(),
  diagnosis: text("diagnosis").notNull(),
  findings: text("findings"),
  /** Extra images for cases that show more than one view. */
  images: jsonb("images").$type<string[]>().notNull().default([]),
  ...timestamps,
});

export const scrambleItems = pgTable("scramble_items", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  issueId: bigint("issue_id", { mode: "number" }).references(() => issues.id, { onDelete: "cascade" }),
  specialty: text("specialty").notNull(),
  clue: text("clue").notNull(),
  scrambled: text("scrambled").notNull(),
  answer: text("answer").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

export const submissions = pgTable("submissions", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  affiliation: text("affiliation"),
  title: text("title").notNull(),
  articleType: text("article_type"),
  abstract: text("abstract"),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  status: text("status").notNull().default("Received"),
  notes: text("notes"),
  ...timestamps,
});

export type Issue = typeof issues.$inferSelect;
export type Article = typeof articles.$inferSelect;
export type PharmaUpdate = typeof pharmaUpdates.$inferSelect;
export type SpotterCase = typeof spotterCases.$inferSelect;
export type ScrambleItem = typeof scrambleItems.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
