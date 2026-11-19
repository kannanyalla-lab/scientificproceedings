import "server-only";
import { createDb, type DB } from "./client";
import * as schema from "./schema";

// Reuse one connection pool across hot reloads in development.
const g = globalThis as unknown as { __ksp_db?: DB };
export const db: DB = g.__ksp_db ?? (g.__ksp_db = createDb().db);

export { schema };
