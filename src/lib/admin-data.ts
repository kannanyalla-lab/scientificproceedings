import "server-only";
import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { articles, issues, pharmaUpdates, scrambleItems, spotterCases, submissions } from "@/db/schema";
import { issueShort } from "./format";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ADMIN_TABLES: Record<string, any> = {
  issues, articles, pharma: pharmaUpdates, spotters: spotterCases, scramble: scrambleItems, submissions,
};

export async function issueOptions() {
  const rows = await db.select().from(issues).orderBy(desc(issues.year), desc(issues.volume), desc(issues.number));
  return rows.map((i) => ({ value: String(i.id), label: `${i.month} ${i.year} · ${issueShort(i)}`, isCurrent: i.isCurrent }));
}

export async function listRows(key: string, issueFilter?: number) {
  const t = ADMIN_TABLES[key];
  const opts = await issueOptions();
  const labels = new Map(opts.map((o) => [Number(o.value), o.label]));
  let q = db.select().from(t).$dynamic();
  if (issueFilter && "issueId" in t) q = q.where(eq(t.issueId, issueFilter));
  const order =
    key === "issues" ? [desc(issues.year), desc(issues.volume), desc(issues.number)]
    : key === "submissions" ? [desc(submissions.createdAt)]
    : key === "spotters" ? [desc(spotterCases.issueId), asc(spotterCases.caseNo)]
    : key === "scramble" ? [desc(scrambleItems.issueId), asc(scrambleItems.specialty), asc(scrambleItems.sortOrder)]
    : [desc(t.issueId), asc(t.sortOrder), asc(t.id)];
  const rows = (await q.orderBy(...order).limit(500)) as Record<string, unknown>[];
  return rows.map((r): Record<string, unknown> => ({
    ...r,
    issue: r.issueId ? labels.get(Number(r.issueId)) ?? "" : "",
    label: key === "issues" ? `${r.month} ${r.year} · Vol ${r.volume}, Issue ${String(r.number).padStart(2, "0")}` : undefined,
  }));
}

export async function getRow(key: string, id: number) {
  const t = ADMIN_TABLES[key];
  const rows = await db.select().from(t).where(eq(t.id, id)).limit(1);
  return (rows[0] as Record<string, unknown>) ?? null;
}

export async function dashboardStats() {
  const count = async (t: typeof issues | typeof articles | typeof submissions) =>
    (await db.select({ n: sql<number>`count(*)::int` }).from(t))[0].n;
  const [nIssues, nArticles, nSubs, newSubs, views] = await Promise.all([
    count(issues), count(articles), count(submissions),
    db.select({ n: sql<number>`count(*)::int` }).from(submissions).where(eq(submissions.status, "Received")).then((r) => r[0].n),
    db.select({ n: sql<number>`coalesce(sum(views),0)::int` }).from(articles).then((r) => r[0].n),
  ]);
  const top = await db.select({ id: articles.id, title: articles.title, views: articles.views }).from(articles).orderBy(desc(articles.views)).limit(5);
  const recent = await db.select().from(submissions).orderBy(desc(submissions.createdAt)).limit(5);
  return { nIssues, nArticles, nSubs, newSubs, views, top, recent };
}
