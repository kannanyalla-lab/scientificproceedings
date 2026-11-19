// Creates or updates the database tables, removes the old March 2026 sample
// and loads any bundled issue (currently September 2026) that is missing. Run automatically by `npm run dev` / `npm start`;
// run it directly with `npm run setup` when using your own Postgres.
import "dotenv/config";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDb } from "../src/db/client";
import { seed } from "../src/db/seed";

export async function setupDatabase(url?: string) {
  const { db, close } = createDb(url);
  try {
    await migrate(db, { migrationsFolder: "drizzle" });
    const loaded = await seed(db);
    if (loaded.length) console.log(`Loaded issue: ${loaded.join(", ")}`);
  } finally {
    await close();
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/setup.ts")) {
  setupDatabase().then(() => console.log("Database ready.")).catch((e) => { console.error("Database setup failed:", e); process.exit(1); });
}
