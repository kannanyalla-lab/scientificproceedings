import { eq, inArray } from "drizzle-orm";
import type { DB } from "./client";
import { articles, issues, pharmaUpdates, scrambleItems, spotterCases } from "./schema";
import { slugify } from "../lib/format";
import september2026 from "./content/2026-09.json";
import june2026 from "./content/2026-06.json";

/**
 * Issues bundled with the site, built from content/<yyyy-mm>/ by
 * `python3 scripts/build-issue.py <yyyy-mm>`. Add new editions here.
 */
export const bundledIssues = [september2026, june2026];

/** Sample issues from earlier versions of the site that are removed on setup. */
const retiredSlugs = ["march-2026-volume-12-issue-01"];

type Bundle = (typeof bundledIssues)[number];

async function removeIssue(db: DB, id: number) {
  await db.delete(articles).where(eq(articles.issueId, id));
  await db.delete(pharmaUpdates).where(eq(pharmaUpdates.issueId, id));
  await db.delete(issues).where(eq(issues.id, id));
}

async function loadIssue(db: DB, b: Bundle) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { assetBase, ...issue } = b.issue;
  if (issue.isCurrent) await db.update(issues).set({ isCurrent: false });
  const [iss] = await db.insert(issues).values(issue).returning();
  for (const a of b.articles) {
    const slug = slugify(a.title);
    await db.delete(articles).where(eq(articles.slug, slug));
    await db.insert(articles).values({ ...a, pageStart: String(a.pageStart ?? ""), pageEnd: String(a.pageEnd ?? ""), slug, issueId: iss.id });
  }
  for (const p of b.pharma ?? []) {
    await db.delete(pharmaUpdates).where(eq(pharmaUpdates.slug, p.slug));
    await db.insert(pharmaUpdates).values({ ...p, issueId: iss.id });
  }
  if (b.spotters?.length) await db.insert(spotterCases).values(b.spotters.map((s) => ({ ...s, issueId: iss.id })));
  if (b.scramble?.length) await db.insert(scrambleItems).values(b.scramble.map((s) => ({ ...s, issueId: iss.id })));
}

/**
 * Removes retired sample issues and loads any bundled issue that is missing.
 * With force, bundled issues are deleted and loaded again (this discards
 * admin edits to them). Returns the slugs that were loaded.
 */
export async function seed(db: DB, { force = false } = {}) {
  const retired = await db.select({ id: issues.id }).from(issues).where(inArray(issues.slug, retiredSlugs));
  for (const r of retired) await removeIssue(db, r.id);

  const loaded: string[] = [];
  for (const b of bundledIssues) {
    const [existing] = await db.select({ id: issues.id }).from(issues).where(eq(issues.slug, b.issue.slug));
    if (existing && !force) continue;
    if (existing) await removeIssue(db, existing.id);
    await loadIssue(db, b);
    loaded.push(b.issue.slug);
  }
  if (retired.length) {
    const [cur] = await db.select({ id: issues.id }).from(issues).where(eq(issues.isCurrent, true));
    if (!cur) await db.update(issues).set({ isCurrent: true }).where(eq(issues.slug, bundledIssues[0].issue.slug));
  }
  return loaded;
}
