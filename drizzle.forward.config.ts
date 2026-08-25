import { defineConfig } from "drizzle-kit";

/**
 * Canonical AkarProMax FORWARD migration config — L1A SCOPE ONLY.
 *
 * ============================================================
 * AUTOMATIC `drizzle-kit generate` IS **DISABLED** FOR THIS STREAM
 * ============================================================
 *
 * Verified against the installed drizzle-kit 0.31.10 (`bin.cjs`):
 *
 *   prepareOutFolder(out, dialect) collects snapshots as
 *     readdirSync(meta).filter((it) => !it.startsWith("_"))
 *
 *   preparePrevSnapshot(snapshots, defaultPrev) {
 *     if (snapshots.length === 0) prevSnapshot = defaultPrev;   // <-- dryPg
 *     ...
 *   }
 *
 * `drizzle-pg-forward/meta/` intentionally contains only `_journal.json` and
 * NO `*_snapshot.json`. With zero snapshots drizzle-kit diffs the configured
 * schema against an EMPTY database and emits `CREATE TABLE` for every table in
 * scope. Running `generate` today would therefore produce a migration that is
 * wrong for any existing database — silently, without an error at generate
 * time. A snapshot must never be fabricated to paper over that.
 *
 * So for L1A:
 *   EXECUTION  : the supported drizzle-orm migrator (see lib/db/forward-migrations.ts)
 *   AUTHORING  : hand-reviewed forward SQL, committed with the journal entry
 *   GENERATION : disabled until a deliberate whole-schema baseline exists
 *
 * One trusted execution ledger matters more than automatic generation.
 *
 * ------------------------------------------------------------
 * SCOPE
 * ------------------------------------------------------------
 * Only schemas that have passed L1A schema-truth reconciliation appear below.
 * The wider application schema is NOT reconciled: many tables are still created
 * by runtime `ensure*` SQL, several Drizzle-declared tables have no trusted
 * migration creator, and duplicate/incompatible declarations still exist.
 * Including them here would bake that mess into a baseline.
 *
 * FK dependency check (performed, not assumed): the geo tables reference only
 * each other (countries -> governorates -> cities -> districts -> streets) and
 * `currencies` references nothing. Neither has a foreign key into
 * lib/db/schema.ts or into any domain schema, so no unreconciled schema needs
 * to be retained here.
 *
 * Domain schemas (properties, services, messages, community, knowledge,
 * advertising, auctions, roles, leads, land, offer-types, and lib/db/schema.ts)
 * join this stream only after their own reconciliation phase.
 */
export default defineConfig({
  out: "./drizzle-pg-forward",
  schema: [
    "./lib/db/schemas/geo-schema.ts",
    "./lib/db/schemas/currency-schema.ts",
  ],
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  migrations: {
    schema: "akarpromax",
    table: "forward_migrations",
  },
});
