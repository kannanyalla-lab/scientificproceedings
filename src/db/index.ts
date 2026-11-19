import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");

// Reuse one connection pool across hot reloads in development.
const g = globalThis as unknown as { __ksp_sql?: ReturnType<typeof postgres> };
const client = g.__ksp_sql ?? postgres(url, { max: 10 });
if (process.env.NODE_ENV !== "production") g.__ksp_sql = client;

export const db = drizzle(client, { schema });
export { schema };
