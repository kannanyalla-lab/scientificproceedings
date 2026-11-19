// Creates or updates the database tables and loads the sample March 2026 issue
// if the database is empty. Run automatically by `npm run dev` / `npm start`;
// run it directly with `npm run setup` when using your own Postgres.
import "dotenv/config";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDb } from "../src/db/client";
import { seed } from "../src/db/seed";
import { issues } from "../src/db/schema";

export async function setupDatabase(url?: string) {
  const { db, close } = createDb(url);
  try {
    await migrate(db, { migrationsFolder: "drizzle" });
    const any = await db.select({ id: issues.id }).from(issues).limit(1);
    if (!any.length) {
      await seed(db);
      console.log("Loaded the sample March 2026 issue.");
    }
  } finally {
    await close();
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/setup.ts")) {
  setupDatabase().then(() => console.log("Database ready.")).catch((e) => { console.error("Database setup failed:", e); process.exit(1); });
}
