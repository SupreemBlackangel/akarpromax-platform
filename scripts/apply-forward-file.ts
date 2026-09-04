import { readFileSync } from "node:fs";
import postgres from "postgres";

/**
 * Apply ONE forward migration .sql file, on its own, idempotently.
 *
 * The full `db:migrate:forward` runs every migration in one transaction and,
 * on this database, cannot complete: the connection role `akarpromax` owns
 * every table it created, but `properties` (and its siblings) are owned by
 * `postgres`, so `CREATE INDEX ON properties` fails with 42501 "must be owner"
 * and rolls the whole run back. That is why `akarpromax.forward_migrations`
 * has never held a row. Fixing that ownership needs a superuser and is its own
 * task.
 *
 * This is the way to land a single additive migration in the meantime -- e.g.
 * 0010, the land registry, whose four tables are new and reference only tables
 * `akarpromax` already owns. It executes the file statement by statement and
 * treats "already exists" as success, so re-running it is safe and so is
 * running it before the ledger is ever repaired.
 *
 * It does NOT write akarpromax.forward_migrations. It is a targeted apply, not
 * a substitute for the migrator; when ownership is fixed and the migrator can
 * run, it will re-apply these same statements harmlessly (IF NOT EXISTS) and
 * record them.
 *
 *   node --env-file=.env --import tsx scripts/apply-forward-file.ts drizzle-pg-forward/0010_land_registry_baseline.sql
 */

const ALREADY_EXISTS = new Set([
  "42P07", // relation already exists
  "42710", // object (constraint/extension) already exists
  "42701", // column already exists
  "42P06", // schema already exists
  "42723", // function already exists
]);

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error("[apply-forward-file] DATABASE_URL is not set. Run through --env-file=.env.");
    process.exit(1);
  }

  const file = process.argv[2];
  if (!file) {
    console.error("[apply-forward-file] usage: apply-forward-file.ts <path-to-.sql>");
    process.exit(1);
  }

  const ddl = readFileSync(file, "utf8");
  // Drizzle's own `--> statement-breakpoint` markers start with `--`, so they
  // fall out with the line comments; splitting on `;` is safe because these
  // baseline files carry no dollar-quoted bodies.
  const statements = ddl
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const client = postgres(url, { ssl: "require", prepare: false, onnotice: () => {} });
  let applied = 0;
  let skipped = 0;
  try {
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const label = stmt.slice(0, 60).replace(/\s+/g, " ");
      try {
        await client.unsafe(stmt);
        applied++;
        console.log(`  [${i + 1}/${statements.length}] OK    ${label}`);
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code ?? "";
        if (ALREADY_EXISTS.has(code)) {
          skipped++;
          console.log(`  [${i + 1}/${statements.length}] SKIP  ${label}  (${code}, already there)`);
        } else {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`  [${i + 1}/${statements.length}] FAIL  ${label}\n    ${message}`);
          process.exit(1);
        }
      }
    }
    console.log(`\n[apply-forward-file] ${file}: ${applied} applied, ${skipped} already present. Done.`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
