// Runs automatically before `npm run dev` / `npm start`:
//  1. creates .env from .env.example on first run (with a random AUTH_SECRET),
//  2. creates or updates the database tables,
//  3. loads the sample March 2026 issue if the database is empty.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

if (!existsSync(".env") && existsSync(".env.example")) {
  const secret = randomBytes(32).toString("base64url");
  writeFileSync(".env", readFileSync(".env.example", "utf8").replace("replace-with-a-long-random-string", secret));
  console.log("Created .env with default settings (editor login: editor@example.com / admin123).");
}

async function main() {
  await import("dotenv/config");
  const { createDb } = await import("../src/db/client");
  const { seed } = await import("../src/db/seed");
  const { issues } = await import("../src/db/schema");
  const { db, kind, close } = createDb();
  try {
    if (kind === "pglite") {
      const { migrate } = await import("drizzle-orm/pglite/migrator");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await migrate(db as any, { migrationsFolder: "drizzle" });
    } else {
      const { migrate } = await import("drizzle-orm/postgres-js/migrator");
      await migrate(db, { migrationsFolder: "drizzle" });
    }
    const any = await db.select({ id: issues.id }).from(issues).limit(1);
    if (!any.length) {
      await seed(db);
      console.log("Loaded the sample March 2026 issue.");
    }
    console.log(`Database ready (${kind === "pglite" ? "built-in local database in .data/db" : "Postgres"}).`);
  } finally {
    await close();
  }
}

main().catch((e) => { console.error("Database setup failed:", e); process.exit(1); });
