// L1A — canonical forward migration: shape, idempotency, and data preservation.
//
// The structural assertions always run. The behavioural assertions (I, J) need
// a REAL, DISPOSABLE PostgreSQL instance and are skipped unless
// L1A_TEST_DATABASE_URL is set. They must never be pointed at production.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { COUNTRY_CODES } from "../../lib/market/country-registry.ts";
import { ACTIVE_CURRENCY_CODES } from "../../lib/market/currency-registry.ts";
import {
  FORWARD_MIGRATIONS_FOLDER,
  FORWARD_MIGRATIONS_SCHEMA,
  FORWARD_MIGRATIONS_TABLE,
} from "../../lib/db/forward-migrations.ts";
import { assertLocalTestDatabaseUrl } from "./helpers/assert-local-test-database.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const JOURNAL = JSON.parse(readFileSync(path.join(ROOT, FORWARD_MIGRATIONS_FOLDER, "meta", "_journal.json"), "utf8"));
const MIGRATION_SQL = readFileSync(
  path.join(ROOT, FORWARD_MIGRATIONS_FOLDER, `${JOURNAL.entries[0].tag}.sql`),
  "utf8",
);

/** Executable statements only — `--` comment lines are not SQL. */
const MIGRATION_BODY = MIGRATION_SQL.split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n");

/** The whole forward stream (0000..n) — later registry additions (e.g. ILS in
 *  0002) are seeded by their own migration, never by editing live 0000. */
const FORWARD_STREAM_BODY = JOURNAL.entries
  .map((entry) => readFileSync(path.join(ROOT, FORWARD_MIGRATIONS_FOLDER, `${entry.tag}.sql`), "utf8"))
  .join("\n")
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n");

test("the forward stream is separate from the legacy drizzle ledger", () => {
  assert.equal(FORWARD_MIGRATIONS_FOLDER, "drizzle-pg-forward");
  assert.equal(FORWARD_MIGRATIONS_SCHEMA, "akarpromax");
  assert.equal(FORWARD_MIGRATIONS_TABLE, "forward_migrations");
  assert.notEqual(FORWARD_MIGRATIONS_SCHEMA, "drizzle");
  assert.notEqual(FORWARD_MIGRATIONS_TABLE, "__drizzle_migrations");
});

test("the forward journal is well formed and complete", () => {
  assert.equal(JOURNAL.dialect, "postgresql");
  assert.ok(Array.isArray(JOURNAL.entries) && JOURNAL.entries.length >= 1);
  const idx = JOURNAL.entries.map((e) => e.idx);
  assert.deepEqual(idx, [...idx].sort((a, b) => a - b), "journal entries must be ordered");
  assert.equal(new Set(idx).size, idx.length, "duplicate journal idx");
});

test("the forward migration never backfills or rewrites legacy history", () => {
  assert.equal(/__drizzle_migrations/i.test(MIGRATION_BODY), false);
  assert.equal(/\bdrizzle\./i.test(MIGRATION_BODY), false);
});

test("the forward migration is additive only — no destructive DDL", () => {
  const forbidden = [
    /\bDROP\s+TABLE\b/i,
    /\bDROP\s+COLUMN\b/i,
    /\bTRUNCATE\b/i,
    /\bDELETE\s+FROM\b/i,
    /\bDROP\s+DATABASE\b/i,
    /\bDROP\s+SCHEMA\b/i,
  ];
  for (const pattern of forbidden) {
    assert.equal(pattern.test(MIGRATION_BODY), false, `destructive statement matched ${pattern}`);
  }
  // Dropping a *column default* is not destructive to data and is required.
  assert.match(MIGRATION_BODY, /ALTER\s+COLUMN\s+currency_code\s+DROP\s+DEFAULT/i);
});

test("every registry code appears in the forward migration stream", () => {
  for (const code of COUNTRY_CODES) {
    assert.ok(MIGRATION_BODY.includes(`('${code}',`), `country ${code} not seeded`);
  }
  for (const code of ACTIVE_CURRENCY_CODES) {
    assert.ok(FORWARD_STREAM_BODY.includes(`('${code}', '${code}',`), `currency ${code} not seeded`);
  }
  // 0000 stays frozen: ILS entered via its own migration, not by editing 0000.
  assert.equal(MIGRATION_BODY.includes(`('ILS', 'ILS',`), false);
});

test("D — the migration never inserts GLOBAL as a country row", () => {
  assert.equal(/'GLOBAL'/.test(MIGRATION_BODY), false);
  assert.equal(/'ALL'/.test(MIGRATION_BODY), false);
  // and it installs the guard that makes such a row impossible
  assert.match(MIGRATION_BODY, /countries_code_iso_alpha2_chk/);
});

test("the seed statements are upserts, so re-running cannot duplicate rows", () => {
  const inserts = MIGRATION_BODY.match(/INSERT\s+INTO/gi) ?? [];
  const conflicts = MIGRATION_BODY.match(/ON\s+CONFLICT/gi) ?? [];
  assert.ok(inserts.length > 0);
  assert.equal(inserts.length, conflicts.length, "every INSERT must have an ON CONFLICT clause");
});

/* --- Correction A/B: generation scope + generation policy ---------------- */

const FORWARD_CONFIG = readFileSync(path.join(ROOT, "drizzle.forward.config.ts"), "utf8");
const RECONCILED_SCHEMAS = [
  "./lib/db/schemas/geo-schema.ts",
  "./lib/db/schemas/currency-schema.ts",
];
const UNRECONCILED_SCHEMAS = [
  "./lib/db/schema.ts",
  "properties-schema",
  "services-schema",
  "messages-schema",
  "community-schema",
  "knowledge-schema",
  "advertising-schema",
  "auctions-schema",
  "roles-schema",
  "leads-schema",
  "land-schema",
  "offer-types-schema",
];

test("1 — the forward config covers only the reconciled L1A schema scope", () => {
  const schemaBlock = FORWARD_CONFIG.slice(
    FORWARD_CONFIG.indexOf("schema: ["),
    FORWARD_CONFIG.indexOf("]", FORWARD_CONFIG.indexOf("schema: [")),
  );
  for (const entry of RECONCILED_SCHEMAS) {
    assert.ok(schemaBlock.includes(entry), `forward config must include ${entry}`);
  }
  for (const entry of UNRECONCILED_SCHEMAS) {
    assert.equal(
      schemaBlock.includes(entry),
      false,
      `unreconciled schema ${entry} must not be in the forward generation scope`,
    );
  }
  const entries = schemaBlock.match(/"\.\/[^"]+"/g) ?? [];
  assert.equal(entries.length, RECONCILED_SCHEMAS.length, `forward scope is ${entries.join(", ")}`);
});

test("B — no snapshot exists, so drizzle-kit generate stays disabled", () => {
  // drizzle-kit 0.31.10 prepareOutFolder() treats every meta/ file not starting
  // with "_" as a snapshot, and preparePrevSnapshot() falls back to an EMPTY
  // schema when the list is empty. A fabricated snapshot is forbidden, so
  // generation must remain off for this stream.
  const metaFiles = readdirSync(path.join(ROOT, FORWARD_MIGRATIONS_FOLDER, "meta"));
  assert.deepEqual(metaFiles, ["_journal.json"], `unexpected meta contents: ${metaFiles.join(", ")}`);
  assert.equal(
    metaFiles.some((f) => !f.startsWith("_")),
    false,
    "a snapshot must never be fabricated for the forward stream",
  );
  assert.match(FORWARD_CONFIG, /DISABLED/, "the config must state that generation is disabled");
});

test("B — package.json exposes no forward generate script while generation is off", () => {
  const pkg = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8"));
  const scripts = pkg.scripts ?? {};
  for (const [name, body] of Object.entries(scripts)) {
    assert.equal(
      /drizzle-kit\s+generate[^\n]*drizzle\.forward\.config/.test(String(body)),
      false,
      `script "${name}" would run disabled forward generation`,
    );
  }
});

test("4 — the constraint check is scoped to public.countries, not conname alone", () => {
  const start = MIGRATION_BODY.indexOf("DO $$");
  const block = MIGRATION_BODY.slice(start, MIGRATION_BODY.indexOf("$$;", start) + 3);
  assert.ok(block.includes("countries_code_iso_alpha2_chk"), "constraint block not found");
  assert.match(block, /FROM\s+pg_constraint/i);
  assert.match(block, /JOIN\s+pg_class/i);
  assert.match(block, /JOIN\s+pg_namespace/i);
  assert.match(block, /rel\.relname\s*=\s*'countries'/i);
  assert.match(block, /nsp\.nspname\s*=\s*'public'/i);
  // the naive form must be gone
  assert.equal(
    /FROM\s+pg_constraint\s+WHERE\s+conname\s*=/i.test(MIGRATION_BODY),
    false,
    "constraint lookup must not test conname alone",
  );
});

/* ------------------------------------------------------------------ */
/* Behavioural: requires a real disposable PostgreSQL                   */
/* ------------------------------------------------------------------ */

// SAFETY BARRIER: the URL is validated BEFORE any connection is opened and
// before any destructive statement below can run. A non-loopback URL (Neon,
// remote IP, any DNS host) makes this throw at module load — the destructive
// tests then FAIL loudly instead of running against a remote database.
// There is no bypass.
const LIVE_URL = process.env.L1A_TEST_DATABASE_URL
  ? assertLocalTestDatabaseUrl(process.env.L1A_TEST_DATABASE_URL)
  : undefined;
const liveOptions = LIVE_URL
  ? {}
  : { skip: "set L1A_TEST_DATABASE_URL to a LOCAL DISPOSABLE PostgreSQL to run migration behaviour tests" };

/** Recreates the KNOWN LIVE baseline: countries with only its 11 columns. */
const BASELINE_SQL = `
DROP SCHEMA IF EXISTS akarpromax CASCADE;
DROP TABLE IF EXISTS streets, districts, cities, governorates, countries, currencies CASCADE;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  name_tr text,
  phone_code text,
  currency_code text DEFAULT 'OMR',
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
CREATE TABLE governorates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id uuid NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  code text, name_ar text NOT NULL, name_en text NOT NULL, name_tr text,
  is_active boolean DEFAULT true, display_order integer DEFAULT 0,
  created_at timestamp DEFAULT now(), updated_at timestamp DEFAULT now()
);
CREATE TABLE cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  governorate_id uuid NOT NULL REFERENCES governorates(id) ON DELETE CASCADE,
  code text, name_ar text NOT NULL, name_en text NOT NULL, name_tr text,
  latitude text, longitude text,
  is_active boolean DEFAULT true, display_order integer DEFAULT 0,
  created_at timestamp DEFAULT now(), updated_at timestamp DEFAULT now()
);
CREATE TABLE districts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  code text, name_ar text NOT NULL, name_en text NOT NULL, name_tr text,
  is_active boolean DEFAULT true, display_order integer DEFAULT 0,
  created_at timestamp DEFAULT now(), updated_at timestamp DEFAULT now()
);
CREATE TABLE streets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id uuid NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
  code text, name_ar text NOT NULL, name_en text NOT NULL, name_tr text,
  is_active boolean DEFAULT true, display_order integer DEFAULT 0,
  created_at timestamp DEFAULT now(), updated_at timestamp DEFAULT now()
);
CREATE TABLE currencies (
  id text PRIMARY KEY,
  code text NOT NULL UNIQUE,
  symbol text NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  name_tr text,
  exchange_rate_to_usd numeric(18,8) NOT NULL DEFAULT '1',
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
INSERT INTO countries (code, name_ar, name_en, name_tr, phone_code, currency_code)
VALUES ('SA', 'السعودية', 'Saudi Arabia', 'Suudi Arabistan', '+966', 'SAR'),
       ('om', 'سلطنة عمان', 'Oman', NULL, '+968', 'OMR');
INSERT INTO governorates (country_id, code, name_ar, name_en)
SELECT id, 'RIYADH', 'الرياض', 'Riyadh' FROM countries WHERE code = 'SA';
INSERT INTO cities (governorate_id, code, name_ar, name_en)
SELECT id, 'RIYADH', 'الرياض', 'Riyadh' FROM governorates WHERE code = 'RIYADH';
INSERT INTO districts (city_id, code, name_ar, name_en)
SELECT id, 'OLAYA', 'العليا', 'Olaya' FROM cities WHERE code = 'RIYADH';
INSERT INTO streets (district_id, name_ar, name_en)
SELECT id, 'طريق الملك فهد', 'King Fahd Road' FROM districts WHERE code = 'OLAYA';
INSERT INTO currencies (id, code, symbol, name_ar, name_en, is_default)
VALUES ('SAR', 'SAR', 'ر.س', 'ريال سعودي', 'Saudi Riyal', true),
       ('OMR', 'OMR', 'ر.ع', 'ريال عماني', 'Omani Rial', false);
`;

async function withLiveDb(fn) {
  // Re-validated at every use: guard first, connect second, destructive
  // baseline third. Never connect-then-validate.
  const url = assertLocalTestDatabaseUrl(LIVE_URL);
  const { default: postgres } = await import("postgres");
  const client = postgres(url, { ssl: false, prepare: false, max: 1 });
  try {
    await client.unsafe(BASELINE_SQL);
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function applyForward(client) {
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  await migrate(drizzle(client), {
    migrationsFolder: path.join(ROOT, FORWARD_MIGRATIONS_FOLDER),
    migrationsSchema: FORWARD_MIGRATIONS_SCHEMA,
    migrationsTable: FORWARD_MIGRATIONS_TABLE,
  });
}

test("I — the forward migration reconciles the known live state and is idempotent", liveOptions, async () => {
  await withLiveDb(async (client) => {
    const { verifyMarketSchemaTruth } = await import("../../lib/db/forward-migrations.ts");

    const before = await verifyMarketSchemaTruth(client);
    assert.equal(before.ready, false, "baseline must start out of sync");
    assert.ok(before.missingCountryColumns.includes("flag_emoji"));
    assert.equal(before.currencyCodeHasDefault, true);

    await applyForward(client);
    const first = await verifyMarketSchemaTruth(client);
    assert.deepEqual(first.problems, [], "schema should be truthful after one run");
    assert.equal(first.ready, true);
    assert.equal(first.appliedForwardMigrations, JOURNAL.entries.length);

    const countsAfterFirst = await client.unsafe(
      "SELECT (SELECT count(*) FROM countries) AS countries, (SELECT count(*) FROM currencies) AS currencies",
    );

    // Second run: no error, no duplicates, no extra ledger rows.
    await applyForward(client);
    const second = await verifyMarketSchemaTruth(client);
    assert.equal(second.ready, true);
    assert.equal(second.appliedForwardMigrations, first.appliedForwardMigrations);

    const countsAfterSecond = await client.unsafe(
      "SELECT (SELECT count(*) FROM countries) AS countries, (SELECT count(*) FROM currencies) AS currencies",
    );
    assert.deepEqual(countsAfterSecond, countsAfterFirst, "re-running duplicated rows");

    assert.equal(Number(countsAfterSecond[0].countries), COUNTRY_CODES.length);
    assert.equal(Number(countsAfterSecond[0].currencies), ACTIVE_CURRENCY_CODES.length);
  });
});

test("I — the legacy drizzle ledger is left completely untouched", liveOptions, async () => {
  await withLiveDb(async (client) => {
    await client.unsafe(`CREATE SCHEMA IF NOT EXISTS drizzle`);
    await client.unsafe(
      `CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id serial primary key, hash text not null, created_at bigint)`,
    );
    await client.unsafe(
      `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ('legacy-0000', 1), ('legacy-0001', 2)`,
    );
    const before = await client.unsafe(`SELECT hash FROM drizzle.__drizzle_migrations ORDER BY id`);

    await applyForward(client);

    const after = await client.unsafe(`SELECT hash FROM drizzle.__drizzle_migrations ORDER BY id`);
    assert.deepEqual(after, before, "legacy ledger must not be backfilled or modified");
  });
});

test("J — the existing SA geo hierarchy survives the migration untouched", liveOptions, async () => {
  await withLiveDb(async (client) => {
    const before = await client.unsafe(`
      SELECT c.id AS country_id, g.id AS gov_id, ci.id AS city_id, d.id AS district_id, s.id AS street_id
      FROM countries c
      JOIN governorates g ON g.country_id = c.id
      JOIN cities ci ON ci.governorate_id = g.id
      JOIN districts d ON d.city_id = ci.id
      JOIN streets s ON s.district_id = d.id
      WHERE c.code = 'SA'
    `);
    assert.equal(before.length, 1);

    await applyForward(client);

    const after = await client.unsafe(`
      SELECT c.id AS country_id, g.id AS gov_id, ci.id AS city_id, d.id AS district_id, s.id AS street_id
      FROM countries c
      JOIN governorates g ON g.country_id = c.id
      JOIN cities ci ON ci.governorate_id = g.id
      JOIN districts d ON d.city_id = ci.id
      JOIN streets s ON s.district_id = d.id
      WHERE c.code = 'SA'
    `);
    assert.deepEqual(after, before, "SA hierarchy ids must be preserved, not re-created");

    const sa = await client.unsafe(`SELECT code, currency_code, flag_emoji FROM countries WHERE code = 'SA'`);
    assert.equal(sa[0].currency_code, "SAR", "SA must keep its own currency");

    // The legacy lowercase 'om' row is normalised in place, not duplicated.
    const oman = await client.unsafe(`SELECT code, currency_code FROM countries WHERE upper(code) = 'OM'`);
    assert.equal(oman.length, 1);
    assert.equal(oman[0].code, "OM");
    assert.equal(oman[0].currency_code, "OMR");
  });
});

test("D — a fake GLOBAL country row is structurally impossible after migration", liveOptions, async () => {
  await withLiveDb(async (client) => {
    await applyForward(client);
    await assert.rejects(
      () => client.unsafe(`INSERT INTO countries (code, name_ar, name_en) VALUES ('GLOBAL', 'عالمي', 'Global')`),
      /countries_code_iso_alpha2_chk/,
    );
  });
});

test("4 — a same-named constraint on another table does not suppress creation", liveOptions, async () => {
  await withLiveDb(async (client) => {
    // A decoy constraint with the identical name on an unrelated table.
    await client.unsafe(`
      CREATE TABLE IF NOT EXISTS decoy_codes (code text);
      ALTER TABLE decoy_codes DROP CONSTRAINT IF EXISTS countries_code_iso_alpha2_chk;
      ALTER TABLE decoy_codes ADD CONSTRAINT countries_code_iso_alpha2_chk CHECK (code IS NOT NULL);
    `);

    await applyForward(client);

    const rows = await client.unsafe(`
      SELECT rel.relname AS table_name
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE con.conname = 'countries_code_iso_alpha2_chk' AND nsp.nspname = 'public'
      ORDER BY rel.relname
    `);
    const tables = rows.map((r) => r.table_name);
    assert.ok(tables.includes("countries"), `constraint missing on countries; found on ${tables.join(", ")}`);
    assert.ok(tables.includes("decoy_codes"), "the decoy constraint should have been left alone");

    // ...and it really is enforcing on countries
    await assert.rejects(
      () => client.unsafe(`INSERT INTO countries (code, name_ar, name_en) VALUES ('GLOBAL', 'ع', 'G')`),
      /countries_code_iso_alpha2_chk/,
    );
  });
});
