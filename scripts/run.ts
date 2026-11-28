// `npm run dev` and `npm start` go through this script. It:
//  1. creates .env from .env.example on first run (with a random AUTH_SECRET),
//  2. if DATABASE_URL isn't set, starts a built-in Postgres (PGlite) stored in .data/db,
//  3. creates or updates the tables and loads the bundled issues that are missing,
//  4. starts Next.js.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const mode = process.argv[2] === "start" ? "start" : "dev";
const LOCAL_PORT = Number(process.env.LOCAL_DB_PORT || 54329);

if (!existsSync(".env") && existsSync(".env.example")) {
  const secret = randomBytes(32).toString("base64url");
  writeFileSync(".env", readFileSync(".env.example", "utf8").replace("replace-with-a-long-random-string", secret));
  console.log("Created .env with default settings. Editor login: editor@example.com / admin123");
}

async function main() {
  await import("dotenv/config");
  let stopDb: (() => Promise<void>) | null = null;

  if (!process.env.DATABASE_URL) {
    const { PGlite } = await import("@electric-sql/pglite");
    const { PGLiteSocketServer } = await import("@electric-sql/pglite-socket");
    const dir = path.join(process.cwd(), ".data", "db");
    mkdirSync(dir, { recursive: true });
    const pg = await PGlite.create(dir);
    const server = new PGLiteSocketServer({ db: pg, port: LOCAL_PORT, host: "127.0.0.1" });
    try {
      await server.start();
    } catch (e) {
      console.error(`Couldn't start the built-in database on port ${LOCAL_PORT}. Is the site already running in another window?`);
      throw e;
    }
    process.env.DATABASE_URL = `postgres://postgres:postgres@127.0.0.1:${LOCAL_PORT}/postgres`;
    process.env.KSP_LOCAL_DB = "1";
    stopDb = async () => { await server.stop(); await pg.close(); };
    console.log("Built-in database started (data is kept in .data/db).");
  }

  const { setupDatabase } = await import("./setup");
  await setupDatabase();

  const require = createRequire(import.meta.url);
  const nextBin = require.resolve("next/dist/bin/next");
  const child = spawn(process.execPath, [nextBin, mode], { stdio: "inherit", env: process.env });

  let stopping = false;
  const shutdown = async (code: number) => {
    if (stopping) return;
    stopping = true;
    if (!child.killed) child.kill("SIGTERM");
    if (stopDb) await stopDb().catch(() => {});
    process.exit(code);
  };
  child.on("exit", (code) => shutdown(code ?? 0));
  process.on("SIGINT", () => shutdown(0));
  process.on("SIGTERM", () => shutdown(0));
}

main().catch((e) => { console.error(e); process.exit(1); });
