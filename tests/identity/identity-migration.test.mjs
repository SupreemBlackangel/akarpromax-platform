// L1B — forward migration 0001 + identity truth, against a REAL disposable
// LOCAL PostgreSQL. Reuses the L1A safety barrier: a non-loopback URL refuses
// at module load with the sentinel, before any connection or destructive SQL.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { assertLocalTestDatabaseUrl } from "../market/helpers/assert-local-test-database.mjs";
import {
  FORWARD_MIGRATIONS_FOLDER,
  FORWARD_MIGRATIONS_SCHEMA,
  FORWARD_MIGRATIONS_TABLE,
  verifyIdentitySchemaTruth,
} from "../../lib/db/forward-migrations.ts";
import { applyPgIdentitySchema } from "../../lib/db/pg-identity-schema.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const JOURNAL = JSON.parse(
  readFileSync(path.join(ROOT, FORWARD_MIGRATIONS_FOLDER, "meta", "_journal.json"), "utf8"),
);
const L1B_SQL = readFileSync(
  path.join(ROOT, FORWARD_MIGRATIONS_FOLDER, "0001_l1b_identity_registration.sql"),
  "utf8",
);
const L1B_BODY = L1B_SQL.split("\n").filter((line) => !line.trim().startsWith("--")).join("\n");

/* ------------------------------------------------ structural (no DB) ------ */

test("journal: 0001 follows 0000, nothing rewritten, nothing backfilled", () => {
  const tags = JOURNAL.entries.map((entry) => entry.tag);
  assert.equal(tags[0], "0000_l1a_global_market_foundation");
  assert.equal(tags[1], "0001_l1b_identity_registration");
  // contiguous, strictly increasing stream — later migrations may follow
  assert.deepEqual(
    JOURNAL.entries.map((entry) => entry.idx),
    JOURNAL.entries.map((_, index) => index),
  );
  for (let index = 1; index < JOURNAL.entries.length; index += 1) {
    assert.ok(
      JOURNAL.entries[index].when > JOURNAL.entries[index - 1].when,
      `entry ${index} must be newer than ${index - 1} for the migrator watermark`,
    );
  }
});

test("0001 is additive only — no destructive DDL, no legacy ledger contact", () => {
  for (const pattern of [
    /\bDROP\s+TABLE\b/i, /\bDROP\s+COLUMN\b/i, /\bTRUNCATE\b/i,
    /\bDELETE\s+FROM\b/i, /\bDROP\s+SCHEMA\b/i, /\bUPDATE\s+users\b/i,
  ]) {
    assert.equal(pattern.test(L1B_BODY), false, `destructive/unexpected statement matched ${pattern}`);
  }
  assert.equal(/__drizzle_migrations/.test(L1B_BODY), false);
  assert.equal(/\bdrizzle\./.test(L1B_BODY), false);
});

test("0001 adds no market/country default to the human identity", () => {
  assert.equal(/preferred_market[^,\n]*DEFAULT/i.test(L1B_BODY), false);
  for (const literal of ["'OM'", "'SA'", "'OMR'", "'SAR'"]) {
    assert.equal(L1B_BODY.includes(literal), false, `${literal} must not appear`);
  }
});

/* ------------------------------------------------ behavioural (local PG) -- */

// Identity tests run in their OWN database (derived name) so that market and
// identity test files can never clobber each other when the runner executes
// test files concurrently against the same local instance.
function identityDbUrl(baseUrl) {
  const url = new URL(baseUrl);
  url.pathname = `${url.pathname.replace(/\/+$/, "")}_identity`;
  return url.toString();
}

async function ensureIdentityDatabase(baseUrl) {
  const target = new URL(identityDbUrl(baseUrl));
  const dbName = target.pathname.slice(1);
  if (!/^[a-z0-9_]+$/.test(dbName)) throw new Error(`unsafe test database name: ${dbName}`);
  const { default: postgres } = await import("postgres");
  const admin = postgres(baseUrl, { ssl: false, prepare: false, max: 1 });
  try {
    await admin.unsafe(`CREATE DATABASE "${dbName}"`);
  } catch (error) {
    if (error?.code !== "42P04") throw error; // 42P04 = already exists
  } finally {
    await admin.end();
  }
  return target.toString();
}

const LIVE_URL = process.env.L1A_TEST_DATABASE_URL
  ? assertLocalTestDatabaseUrl(process.env.L1A_TEST_DATABASE_URL)
  : undefined;
const liveOptions = LIVE_URL
  ? {}
  : { skip: "set L1A_TEST_DATABASE_URL to a LOCAL DISPOSABLE PostgreSQL to run identity migration tests" };

// Recreates the known live baseline: L1A market tables + identity tables as
// ensurePgIdentitySchema historically built them (WITHOUT the L1B columns —
// simulated by dropping them after bootstrap, as the live DB predates them).
const MARKET_BASELINE = `
DROP SCHEMA IF EXISTS akarpromax CASCADE;
DROP TABLE IF EXISTS streets, districts, cities, governorates, countries, currencies, decoy_codes CASCADE;
DROP TABLE IF EXISTS user_oauth_accounts, reputation_history, reputation_evaluations, reputation_profiles,
  verification_records, organization_branches, organization_members, organizations,
  session_revocations, verification_challenges, audit_events, users, ak_identity_schema_meta CASCADE;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE,
  name_ar text NOT NULL, name_en text NOT NULL, name_tr text, phone_code text,
  currency_code text DEFAULT 'OMR', is_active boolean DEFAULT true, display_order integer DEFAULT 0,
  created_at timestamp DEFAULT now(), updated_at timestamp DEFAULT now());
CREATE TABLE currencies (
  id text PRIMARY KEY, code text NOT NULL UNIQUE, symbol text NOT NULL,
  name_ar text NOT NULL, name_en text NOT NULL, name_tr text,
  exchange_rate_to_usd numeric(18,8) NOT NULL DEFAULT '1', is_active boolean DEFAULT true,
  is_default boolean DEFAULT false, display_order integer DEFAULT 0,
  created_at timestamp DEFAULT now(), updated_at timestamp DEFAULT now());
`;

const SIMULATE_PRE_L1B = `
ALTER TABLE users DROP COLUMN IF EXISTS updated_at;
ALTER TABLE users DROP COLUMN IF EXISTS preferred_market;
DROP INDEX IF EXISTS users_email_lower_unique;
`;

async function withIdentityDb(fn, { preL1b = true } = {}) {
  const url = assertLocalTestDatabaseUrl(await ensureIdentityDatabase(LIVE_URL));
  const { default: postgres } = await import("postgres");
  const client = postgres(url, { ssl: false, prepare: false, max: 1 });
  try {
    await client.unsafe(MARKET_BASELINE);
    await applyPgIdentitySchema(client);
    if (preL1b) await client.unsafe(SIMULATE_PRE_L1B);
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

test("0001 reconciles a pre-L1B users table and is idempotent", liveOptions, async () => {
  await withIdentityDb(async (client) => {
    await client.unsafe(
      `INSERT INTO users (email, password_hash, name) VALUES ('existing@akar.com', 'hash', 'Existing Human')`,
    );

    const before = await verifyIdentitySchemaTruth(client);
    assert.equal(before.ready, false);
    assert.ok(before.missingUserColumns.includes("updated_at"));
    assert.ok(before.missingUserColumns.includes("preferred_market"));

    await applyForward(client);

    const after = await verifyIdentitySchemaTruth(client);
    assert.deepEqual(after.problems, [], "identity truth must be clean after 0001");
    assert.equal(after.ready, true);
    assert.equal(after.emailLowerUniqueIndexPresent, true);

    // existing users preserved, byte for byte where it matters
    const rows = await client.unsafe(
      `SELECT email, password_hash, name, preferred_market FROM users ORDER BY email`,
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].email, "existing@akar.com");
    assert.equal(rows[0].password_hash, "hash");
    assert.equal(rows[0].preferred_market, null, "no market was invented for existing humans");

    // second run: no error, no duplicate ledger rows
    const ledgerBefore = await client.unsafe(
      `SELECT count(*)::int AS n FROM "akarpromax"."forward_migrations"`,
    );
    await applyForward(client);
    const ledgerAfter = await client.unsafe(
      `SELECT count(*)::int AS n FROM "akarpromax"."forward_migrations"`,
    );
    assert.equal(ledgerAfter[0].n, ledgerBefore[0].n);
    assert.equal(ledgerAfter[0].n, JOURNAL.entries.length);
  });
});

test("race-safe email identity: mixed-case duplicates are impossible after 0001", liveOptions, async () => {
  await withIdentityDb(async (client) => {
    await applyForward(client);
    await client.unsafe(
      `INSERT INTO users (email, password_hash) VALUES ('human@akar.com', 'h1')`,
    );
    await assert.rejects(
      () => client.unsafe(`INSERT INTO users (email, password_hash) VALUES ('Human@Akar.com', 'h2')`),
      /users_email_lower_unique/,
      "User@Example.com and user@example.com must never become separate humans",
    );
    // and the plain-cased duplicate also stays blocked (existing constraint)
    await assert.rejects(
      () => client.unsafe(`INSERT INTO users (email, password_hash) VALUES ('human@akar.com', 'h3')`),
    );
  });
});

test("pre-existing mixed-case duplicates: migration succeeds, index skipped, truth reports", liveOptions, async () => {
  await withIdentityDb(async (client) => {
    await client.unsafe(`
      INSERT INTO users (email, password_hash) VALUES ('dup@akar.com', 'h1'), ('Dup@Akar.com', 'h2')
    `);
    await applyForward(client); // must not crash and must not delete either row
    const rows = await client.unsafe(`SELECT count(*)::int AS n FROM users`);
    assert.equal(rows[0].n, 2, "no row may ever be auto-deleted");
    const truth = await verifyIdentitySchemaTruth(client);
    assert.equal(truth.ready, false);
    assert.equal(truth.emailLowerUniqueIndexPresent, false);
    assert.deepEqual(truth.caseInsensitiveDuplicateEmails, ["dup@akar.com"]);
    assert.ok(truth.problems.some((p) => p.includes("never auto-deleted")));
  });
});

test("legacy drizzle ledger is untouched by the identity migration", liveOptions, async () => {
  await withIdentityDb(async (client) => {
    await client.unsafe(`CREATE SCHEMA IF NOT EXISTS drizzle`);
    await client.unsafe(
      `CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id serial primary key, hash text not null, created_at bigint)`,
    );
    await client.unsafe(`DELETE FROM drizzle.__drizzle_migrations`);
    await client.unsafe(
      `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ('legacy-0000', 1), ('legacy-0001', 2)`,
    );
    const before = await client.unsafe(`SELECT hash FROM drizzle.__drizzle_migrations ORDER BY id`);
    await applyForward(client);
    const after = await client.unsafe(`SELECT hash FROM drizzle.__drizzle_migrations ORDER BY id`);
    assert.deepEqual(after, before);
  });
});

test("fresh-DB bootstrap path (ensurePgIdentitySchema) converges on the same shape", liveOptions, async () => {
  // No SIMULATE_PRE_L1B: the transitional runtime DDL now also carries the
  // L1B columns, so a fresh database matches what 0001 produces on a live one.
  await withIdentityDb(
    async (client) => {
      const truth = await verifyIdentitySchemaTruth(client);
      assert.deepEqual(truth.missingUserColumns, [], "fresh bootstrap must include L1B columns");
      assert.equal(truth.emailLowerUniqueIndexPresent, true);
      // forward migrations still apply cleanly on top (their DDL is idempotent)
      await applyForward(client);
      const after = await verifyIdentitySchemaTruth(client);
      assert.equal(after.ready, true);
    },
    { preL1b: false },
  );
});

test("identity truth: a missing users table is reported, not thrown", liveOptions, async () => {
  const url = assertLocalTestDatabaseUrl(await ensureIdentityDatabase(LIVE_URL));
  const { default: postgres } = await import("postgres");
  const client = postgres(url, { ssl: false, prepare: false, max: 1 });
  try {
    await client.unsafe(MARKET_BASELINE); // drops users, creates only market tables
    const truth = await verifyIdentitySchemaTruth(client);
    assert.equal(truth.ready, false);
    assert.equal(truth.usersTablePresent, false);
    assert.ok(truth.problems.some((p) => p.includes("public.users")));
  } finally {
    await client.end();
  }
});
