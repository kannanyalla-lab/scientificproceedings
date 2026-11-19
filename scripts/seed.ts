// Reloads the sample March 2026 issue into DATABASE_URL. Usage: npm run seed [-- --force]
import "dotenv/config";
import { createDb } from "../src/db/client";
import { seed } from "../src/db/seed";

const { db, close } = createDb();
seed(db, { force: process.argv.includes("--force") })
  .then((done) => console.log(done ? "Sample issue loaded." : "Sample issue already exists. Run `npm run seed -- --force` to replace it."))
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(close);
