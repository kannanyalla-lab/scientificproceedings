import "server-only";
import { spawn } from "node:child_process";
import { openSync } from "node:fs";
import { rm } from "node:fs/promises";
import path from "node:path";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { articles, issues, pharmaUpdates, scrambleItems, spotterCases } from "@/db/schema";
import type { Issue } from "@/db/schema";
import { slugify } from "@/lib/format";
import { assetFolder, jobDir, readJson, resultPath, writeStatus } from "./jobs";

type Bundle = {
  issue: Omit<typeof issues.$inferInsert, "id">;
  articles: Omit<typeof articles.$inferInsert, "id" | "slug" | "issueId">[];
  pharma: Omit<typeof pharmaUpdates.$inferInsert, "id" | "issueId">[];
  spotters: Omit<typeof spotterCases.$inferInsert, "id" | "issueId">[];
  scramble: Omit<typeof scrambleItems.$inferInsert, "id" | "issueId">[];
};

export const readResult = (id: string) => readJson<Bundle>(resultPath(id));

/** Starts the import worker for an import in the background. */
export function startWorker(id: string) {
  const cwd = process.cwd();
  const tsx = path.join(/*turbopackIgnore: true*/ cwd, "node_modules", "tsx", "dist", "cli.mjs");
  const script = path.join(/*turbopackIgnore: true*/ cwd, "scripts", "import-worker.ts");
  const log = openSync(path.join(jobDir(id), "worker.log"), "a");
  const child = spawn(process.execPath, [tsx, script, id], {
    cwd, env: process.env, detached: true, windowsHide: true, stdio: ["ignore", log, log],
  });
  child.unref();
}

async function uniqueSlug(q: Pick<typeof db, "select">, table: typeof articles | typeof pharmaUpdates, base: string, taken: Set<string>) {
  let slug = base || "item";
  for (let n = 2; ; n++) {
    if (!taken.has(slug)) {
      const [row] = await q.select({ id: table.id }).from(table).where(eq(table.slug, slug)).limit(1);
      if (!row) break;
    }
    slug = `${base}-${n}`;
  }
  taken.add(slug);
  return slug;
}

/** An issue already on the site with the same volume and number, if any. */
export async function existingIssue(b: Bundle): Promise<Issue | null> {
  const [row] = await db.select().from(issues)
    .where(and(eq(issues.volume, b.issue.volume), eq(issues.number, b.issue.number))).limit(1);
  if (row) return row;
  const [bySlug] = await db.select().from(issues).where(eq(issues.slug, b.issue.slug)).limit(1);
  return bySlug ?? null;
}

/** Whether the imported issue is newer than every issue on the site. */
export async function isNewest(b: Bundle) {
  const [latest] = await db.select().from(issues).orderBy(desc(issues.year), desc(issues.volume), desc(issues.number)).limit(1);
  if (!latest) return true;
  return b.issue.volume > latest.volume || (b.issue.volume === latest.volume && b.issue.number >= latest.number);
}

/** Puts an imported edition on the site, replacing an earlier copy of the same issue. */
export async function publishImport(id: string, makeCurrent: boolean) {
  const b = await readResult(id);
  if (!b) throw new Error("This import has no results to publish.");
  const old = await existingIssue(b);
  let description = b.issue.description;
  if (!description) {
    const [cur] = await db.select({ d: issues.description }).from(issues).orderBy(desc(issues.isCurrent), desc(issues.year)).limit(1);
    description = cur?.d ?? null;
  }

  const slug = await db.transaction(async (tx) => {
    if (old) {
      await tx.delete(articles).where(eq(articles.issueId, old.id));
      await tx.delete(pharmaUpdates).where(eq(pharmaUpdates.issueId, old.id));
      await tx.delete(spotterCases).where(eq(spotterCases.issueId, old.id));
      await tx.delete(scrambleItems).where(eq(scrambleItems.issueId, old.id));
      await tx.delete(issues).where(eq(issues.id, old.id));
    }
    const current = makeCurrent || !!old?.isCurrent;
    if (current) await tx.update(issues).set({ isCurrent: false });
    let issueSlug = b.issue.slug;
    const [clash] = await tx.select({ id: issues.id }).from(issues).where(eq(issues.slug, issueSlug)).limit(1);
    if (clash) issueSlug = `${issueSlug}-${id.slice(-4)}`;
    const [iss] = await tx.insert(issues).values({ ...b.issue, slug: issueSlug, description, isCurrent: current, published: true }).returning();

    const taken = new Set<string>();
    for (const a of b.articles) {
      const s = await uniqueSlug(tx, articles, slugify(a.title), taken);
      await tx.insert(articles).values({ ...a, slug: s, issueId: iss.id });
    }
    for (const p of b.pharma) {
      const s = await uniqueSlug(tx, pharmaUpdates, slugify(p.title), taken);
      await tx.insert(pharmaUpdates).values({ ...p, slug: s, issueId: iss.id });
    }
    if (b.spotters.length) await tx.insert(spotterCases).values(b.spotters.map((s) => ({ ...s, issueId: iss.id })));
    if (b.scramble.length) await tx.insert(scrambleItems).values(b.scramble.map((s) => ({ ...s, issueId: iss.id })));
    // If no issue is marked current any more (e.g. the current one was replaced and unticked), mark the newest.
    const [cur] = await tx.select({ id: issues.id }).from(issues).where(eq(issues.isCurrent, true)).limit(1);
    if (!cur) {
      const [newest] = await tx.select({ id: issues.id }).from(issues).orderBy(desc(issues.year), desc(issues.volume), desc(issues.number)).limit(1);
      if (newest) await tx.update(issues).set({ isCurrent: true }).where(eq(issues.id, newest.id));
    }
    return issueSlug;
  });
  await writeStatus(id, { state: "published", publishedSlug: slug, step: "Published" });
  return slug;
}

/** Deletes an import that was not published, with its page images and figures. */
export async function discardImport(id: string, keepAssets: boolean) {
  await rm(jobDir(id), { recursive: true, force: true });
  if (!keepAssets) await rm(assetFolder(id), { recursive: true, force: true });
}
