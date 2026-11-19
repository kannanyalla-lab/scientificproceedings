// Creates the database connection. Uses Postgres when DATABASE_URL is set, otherwise
// an embedded Postgres (PGlite) stored in ./.data/db, so the site runs locally with
// nothing else installed.
import path from "node:path";
import { mkdirSync } from "node:fs";
import { drizzle as drizzlePg, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { drizzle as drizzleLite } from "drizzle-orm/pglite";
import postgres from "postgres";
import { PGlite } from "@electric-sql/pglite";
import * as schema from "./schema";

export type DB = PostgresJsDatabase<typeof schema>;
export const LOCAL_DB_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), ".data", "db");

export function createDb(): { db: DB; kind: "postgres" | "pglite"; close: () => Promise<void> } {
  const url = process.env.DATABASE_URL;
  if (url) {
    const client = postgres(url, { max: process.env.VERCEL ? 1 : 10, onnotice: () => {} });
    return { db: drizzlePg(client, { schema }), kind: "postgres", close: () => client.end() };
  }
  mkdirSync(LOCAL_DB_DIR, { recursive: true });
  const client = new PGlite(LOCAL_DB_DIR);
  return { db: drizzleLite(client, { schema }) as unknown as DB, kind: "pglite", close: () => client.close() };
}
