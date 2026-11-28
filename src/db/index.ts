import "server-only";
import { createDb, type DB } from "./client";
import * as schema from "./schema";

// Connect lazily (so `next build` works without a database) and reuse one
// connection pool across hot reloads in development.
const g = globalThis as unknown as { __ksp_db?: DB };
function real(): DB {
  return (g.__ksp_db ??= createDb().db);
}

export const db = new Proxy({} as DB, {
  get(_t, prop) {
    const target = real();
    const value = Reflect.get(target, prop, target);
    return typeof value === "function" ? value.bind(target) : value;
  },
});

export { schema };
