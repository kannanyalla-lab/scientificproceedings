import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { articles, issues, pharmaUpdates, scrambleItems, spotterCases } from "../src/db/schema";
import { slugify } from "../src/lib/format";
import * as data from "./seed-data";

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client);

async function main() {
  const existing = await db.select().from(issues).where(eq(issues.slug, data.issue.slug));
  if (existing.length && !process.argv.includes("--force")) {
    console.log("Sample issue already exists. Run with --force to replace it.");
    return;
  }
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
  console.log(`Seeded ${data.articles.length} articles, ${data.pharma.length} pharma updates, ${data.spotters.length} spotter cases and ${data.scramble.length} scramble words.`);
}

main().then(() => client.end()).catch((e) => { console.error(e); client.end(); process.exit(1); });
