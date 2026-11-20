import "server-only";
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { articles, issues, type Article, type Issue } from "@/db/schema";

export type ArticleWithIssue = { article: Article; issue: Issue | null };

/** Published articles (in published issues), newest issue first. */
export async function publishedArticles(opts: { from?: Date; until?: Date; issueSlug?: string; type?: string; limit?: number; offset?: number } = {}) {
  const conds = [eq(articles.published, true), sql`(${issues.id} IS NULL OR ${issues.published} = true)`];
  if (opts.from) conds.push(gte(articles.updatedAt, opts.from));
  if (opts.until) conds.push(lte(articles.updatedAt, opts.until));
  if (opts.issueSlug) conds.push(eq(issues.slug, opts.issueSlug));
  if (opts.type) conds.push(eq(articles.articleType, opts.type));
  let q = db.select({ article: articles, issue: issues }).from(articles).leftJoin(issues, eq(articles.issueId, issues.id))
    .where(and(...conds))
    .orderBy(desc(issues.year), desc(issues.volume), desc(issues.number), asc(articles.sortOrder), asc(articles.id))
    .$dynamic();
  if (opts.limit) q = q.limit(opts.limit);
  if (opts.offset) q = q.offset(opts.offset);
  return (await q) as ArticleWithIssue[];
}

export async function countPublished(opts: { from?: Date; until?: Date; issueSlug?: string; type?: string } = {}) {
  const conds = [eq(articles.published, true), sql`(${issues.id} IS NULL OR ${issues.published} = true)`];
  if (opts.from) conds.push(gte(articles.updatedAt, opts.from));
  if (opts.until) conds.push(lte(articles.updatedAt, opts.until));
  if (opts.issueSlug) conds.push(eq(issues.slug, opts.issueSlug));
  if (opts.type) conds.push(eq(articles.articleType, opts.type));
  const r = await db.select({ n: sql<number>`count(*)::int` }).from(articles).leftJoin(issues, eq(articles.issueId, issues.id)).where(and(...conds));
  return r[0]?.n ?? 0;
}

export async function earliestDatestamp() {
  const r = await db.select({ d: sql<Date | null>`min(${articles.updatedAt})` }).from(articles);
  const d = r[0]?.d;
  return d ? new Date(d) : new Date();
}

export async function articleTypesInUse() {
  const r = await db.selectDistinct({ t: articles.articleType }).from(articles).where(eq(articles.published, true));
  return r.map((x) => x.t).sort();
}

export async function publishedIssues() {
  return db.select().from(issues).where(eq(issues.published, true)).orderBy(desc(issues.year), desc(issues.volume), desc(issues.number));
}
