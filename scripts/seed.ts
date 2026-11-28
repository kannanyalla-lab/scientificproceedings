// Loads the bundled issues into DATABASE_URL. Usage: npm run seed [-- --force]
// --force replaces bundled issues that are already there (discarding admin edits to them).
import "dotenv/config";
import { createDb } from "../src/db/client";
import { seed } from "../src/db/seed";

const { db, close } = createDb();
seed(db, { force: process.argv.includes("--force") })
  .then((done) => console.log(done.length ? `Loaded: ${done.join(", ")}` : "All bundled issues are already loaded. Run `npm run seed -- --force` to reload them."))
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(close);
