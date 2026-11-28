import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type DB = PostgresJsDatabase<typeof schema>;

export function createDb(url = process.env.DATABASE_URL) {
  if (!url) {
    throw new Error("DATABASE_URL is not set. Start the site with `npm run dev`, which starts a built-in database for you, or set DATABASE_URL in .env.");
  }
  // The built-in local database (scripts/run.ts) handles one connection at a time.
  const local = process.env.KSP_LOCAL_DB === "1";
  const client = postgres(url, {
    max: local || process.env.VERCEL ? 1 : 10,
    prepare: !local,
    onnotice: () => {},
  });
  return { db: drizzle(client, { schema }), close: () => client.end() };
}
