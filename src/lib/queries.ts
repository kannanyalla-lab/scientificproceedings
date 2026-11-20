import "server-only";
import { and, asc, desc, eq, sql, inArray } from "drizzle-orm";
import { db } from "@/db";
import { articles, issues, pharmaUpdates, scrambleItems, spotterCases } from "@/db/schema";

export async function getCurrentIssue() {
  const rows = await db.select().from(issues)
    .where(eq(issues.published, true))
    .orderBy(desc(issues.isCurrent), desc(issues.year), desc(issues.volume), desc(issues.number))
    .limit(1);
  return rows[0] ?? null;
}

export async function getIssueBySlug(slug: string) {
  const rows = await db.select().from(issues).where(and(eq(issues.slug, slug), eq(issues.published, true))).limit(1);
  return rows[0] ?? null;
}

export async function listIssues() {
  return db.select().from(issues).where(eq(issues.published, true))
    .orderBy(desc(issues.year), desc(issues.volume), desc(issues.number));
}

export async function articleCounts() {
  const rows = await db.select({ issueId: articles.issueId, n: sql<number>`count(*)::int` })
    .from(articles).where(eq(articles.published, true)).groupBy(articles.issueId);
  return new Map(rows.map((r) => [r.issueId, r.n]));
}

export async function getIssueArticles(issueId: number) {
  return db.select().from(articles)
    .where(and(eq(articles.issueId, issueId), eq(articles.published, true)))
    .orderBy(asc(articles.sortOrder), asc(articles.id));
}

export async function getArticleBySlug(slug: string) {
  const rows = await db.select().from(articles).where(and(eq(articles.slug, slug), eq(articles.published, true))).limit(1);
  const a = rows[0];
  if (!a) return null;
  const issue = a.issueId ? (await db.select().from(issues).where(eq(issues.id, a.issueId)).limit(1))[0] ?? null : null;
  return { article: a, issue };
}

export async function incrementViews(id: number) {
  await db.update(articles).set({ views: sql`${articles.views} + 1` }).where(eq(articles.id, id));
}

export async function issuesById(ids: (number | null)[]) {
  const clean = [...new Set(ids.filter((x): x is number => x != null))];
  if (!clean.length) return new Map<number, typeof issues.$inferSelect>();
  const rows = await db.select().from(issues).where(inArray(issues.id, clean));
  return new Map(rows.map((r) => [r.id, r]));
}

export async function listPharmaUpdates(issueId?: number) {
  return db.select().from(pharmaUpdates)
    .where(issueId ? and(eq(pharmaUpdates.published, true), eq(pharmaUpdates.issueId, issueId)) : eq(pharmaUpdates.published, true))
    .orderBy(desc(pharmaUpdates.issueId), asc(pharmaUpdates.sortOrder), asc(pharmaUpdates.id));
}

export async function getPharmaUpdate(slug: string) {
  const rows = await db.select().from(pharmaUpdates).where(and(eq(pharmaUpdates.slug, slug), eq(pharmaUpdates.published, true))).limit(1);
  return rows[0] ?? null;
}

export async function getSpotters(issueId: number) {
  const rows = await db.select().from(spotterCases).where(eq(spotterCases.issueId, issueId)).orderBy(asc(spotterCases.caseNo), asc(spotterCases.id));
  // Radiology first, then other quizzes (e.g. Dermatology), as in print.
  const rank = (c: string) => (c === "Radiology" ? 0 : 1);
  return rows.sort((a, b) => rank(a.category) - rank(b.category) || a.category.localeCompare(b.category) || a.caseNo - b.caseNo);
}

export async function getScramble(issueId: number) {
  return db.select().from(scrambleItems).where(eq(scrambleItems.issueId, issueId)).orderBy(asc(scrambleItems.sortOrder), asc(scrambleItems.id));
}

/** Issues that have at least one row in the given quiz table, newest first. */
export async function issuesWith(kind: "spotters" | "scramble") {
  const table = kind === "spotters" ? spotterCases : scrambleItems;
  const ids = await db.selectDistinct({ id: table.issueId }).from(table);
  const map = await issuesById(ids.map((r) => r.id));
  return [...map.values()].filter((i) => i.published).sort((a, b) => b.year - a.year || b.volume - a.volume || b.number - a.number);
}
