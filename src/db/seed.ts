import { eq } from "drizzle-orm";
import type { DB } from "./client";
import { articles, issues, pharmaUpdates, scrambleItems, spotterCases } from "./schema";
import { slugify } from "../lib/format";
import * as data from "./seed-data";

/** Loads the March 2026 sample issue. Returns false if it was already there (unless force). */
export async function seed(db: DB, { force = false } = {}) {
  const existing = await db.select().from(issues).where(eq(issues.slug, data.issue.slug));
  if (existing.length && !force) return false;
  if (existing.length) await db.delete(issues).where(eq(issues.id, existing[0].id));

  await db.update(issues).set({ isCurrent: false });
  const [iss] = await db.insert(issues).values(data.issue).returning();
  for (const a of data.articles) {
    const slug = slugify(a.title);
    await db.delete(articles).where(eq(articles.slug, slug));
    await db.insert(articles).values({ ...a, slug, issueId: iss.id });
  }
  for (const p of data.pharma) {
    const slug = slugify(p.title);
    await db.delete(pharmaUpdates).where(eq(pharmaUpdates.slug, slug));
    await db.insert(pharmaUpdates).values({ ...p, slug, issueId: iss.id });
  }
  await db.insert(spotterCases).values(data.spotters.map((s) => ({ ...s, issueId: iss.id })));
  await db.insert(scrambleItems).values(data.scramble.map((s) => ({ ...s, issueId: iss.id })));
  return true;
}
