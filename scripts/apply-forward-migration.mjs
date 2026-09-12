/**
 * Apply one forward migration by tag, whatever the ledger claims.
 *
 * Why this exists: `forward_migrations` on production carries more rows than
 * `drizzle-pg-forward/meta/_journal.json` has entries, so the runner believes
 * every migration is applied and skips them all in silence. On 2026-09-12 that
 * shipped a build whose schema declares `properties.village` / `village_id`
 * and a `villages` table against a database that has none of them — every
 * request to /api/properties answered 500 with `column "village" does not
 * exist`, which is the whole listings page for every visitor.
 *
 * The migrations are written idempotently (CREATE TABLE IF NOT EXISTS, ADD
 * COLUMN IF NOT EXISTS, CREATE INDEX IF NOT EXISTS), so re-running one is safe
 * and is the fastest way back. This does NOT touch the ledger: it repairs the
 * database, and the ledger drift is a separate fix so the next migration is
 * not skipped the same way.
 *
 * Dry run (prints the statements, writes nothing):
 *   node --env-file=.env --import tsx scripts/apply-forward-migration.mjs 0014
 *
 * Apply:
 *   node --env-file=.env --import tsx scripts/apply-forward-migration.mjs 0014 --apply
 */
import postgres from "postgres";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const APPLY = process.argv.includes("--apply");
const tag = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
if (!tag) {
  console.error("usage: apply-forward-migration.mjs <tag-or-prefix> [--apply]");
  process.exit(2);
}

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "drizzle-pg-forward");
const file = fs.readdirSync(dir).find((name) => name.endsWith(".sql") && name.startsWith(tag));
if (!file) {
  console.error(`no migration in drizzle-pg-forward/ starts with "${tag}"`);
  process.exit(2);
}

// Comments are stripped per statement so a `--` line cannot swallow the SQL
// that follows it on the wire.
const statements = fs
  .readFileSync(path.join(dir, file), "utf8")
  .split("--> statement-breakpoint")
  .map((chunk) => chunk.split("\n").filter((line) => !line.trim().startsWith("--")).join("\n").trim())
  .filter(Boolean);

console.log(`${file}: ${statements.length} statement(s)\n`);

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(2);
}
const sql = postgres(url, { ssl: "require", prepare: false });

const summary = (statement) => statement.split("\n")[0].slice(0, 78);

try {
  if (!APPLY) {
    for (const statement of statements) console.log("  would run:", summary(statement));
    console.log("\nDry run. Re-run with --apply to execute.");
  } else {
    let ok = 0;
    const failures = [];
    for (const statement of statements) {
      try {
        await sql.unsafe(statement);
        ok += 1;
        console.log("  ok  ", summary(statement));
      } catch (error) {
        failures.push({ statement: summary(statement), message: error.message });
        console.log("  ERR ", summary(statement), "->", error.message);
      }
    }
    console.log(`\n${ok}/${statements.length} statement(s) applied.`);
    if (failures.length) process.exitCode = 1;
  }
} finally {
  await sql.end();
}
