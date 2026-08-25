// L1A correction F — the schema-truth verifier must be safe on a CONNECTED but
// broken/empty database, and must still fail loudly when the database is
// UNREACHABLE.
//
// Requires a real disposable PostgreSQL via L1A_TEST_DATABASE_URL; skipped
// otherwise. Never point this at production — it drops and recreates tables.
import assert from "node:assert/strict";
import test from "node:test";

import {
  FORWARD_MIGRATIONS_SCHEMA,
  FORWARD_MIGRATIONS_TABLE,
  openMigrationClient,
  verifyMarketSchemaTruth,
} from "../../lib/db/forward-migrations.ts";
import { assertLocalTestDatabaseUrl } from "./helpers/assert-local-test-database.mjs";

// SAFETY BARRIER: validated BEFORE any connection or destructive setup SQL.
// A non-loopback URL throws here, at module load, with the refusal sentinel.
const LIVE_URL = process.env.L1A_TEST_DATABASE_URL
  ? assertLocalTestDatabaseUrl(process.env.L1A_TEST_DATABASE_URL)
  : undefined;
const liveOptions = LIVE_URL
  ? {}
  : { skip: "set L1A_TEST_DATABASE_URL to a LOCAL DISPOSABLE PostgreSQL to run verifier safety tests" };

async function withClient(setupSql, fn) {
  // Guard first, connect second, destructive setup third.
  const url = assertLocalTestDatabaseUrl(LIVE_URL);
  const { default: postgres } = await import("postgres");
  const client = postgres(url, { ssl: false, prepare: false, max: 1 });
  try {
    if (setupSql) await client.unsafe(setupSql);
    return await fn(client);
  } finally {
    await client.end();
  }
}

const WIPE = `
DROP SCHEMA IF EXISTS akarpromax CASCADE;
DROP TABLE IF EXISTS streets, districts, cities, governorates, countries, currencies, decoy_codes CASCADE;
`;

test("9 — a completely empty database is REPORTED, not thrown", liveOptions, async () => {
  await withClient(WIPE, async (client) => {
    const truth = await verifyMarketSchemaTruth(client);
    assert.equal(truth.ready, false);
    assert.deepEqual([...truth.missingTables].sort(), ["countries", "currencies"]);
    assert.equal(truth.forwardLedgerPresent, false);
    assert.equal(truth.appliedForwardMigrations, 0);
    assert.ok(truth.problems.some((p) => p.includes("public.countries")));
    assert.ok(truth.problems.some((p) => p.includes("public.currencies")));
    assert.ok(
      truth.problems.some((p) => p.includes(`${FORWARD_MIGRATIONS_SCHEMA}.${FORWARD_MIGRATIONS_TABLE}`)),
    );
  });
});

test("9 — a missing countries table alone is reported without crashing", liveOptions, async () => {
  await withClient(
    `${WIPE}
     CREATE TABLE currencies (id text PRIMARY KEY, code text NOT NULL UNIQUE, symbol text NOT NULL,
       name_ar text NOT NULL, name_en text NOT NULL, name_tr text, is_active boolean DEFAULT true,
       is_default boolean DEFAULT false, display_order integer DEFAULT 0,
       created_at timestamp DEFAULT now(), updated_at timestamp DEFAULT now());`,
    async (client) => {
      const truth = await verifyMarketSchemaTruth(client);
      assert.deepEqual(truth.missingTables, ["countries"]);
      assert.equal(truth.ready, false);
      // countries-dependent probes are skipped, not attempted and crashed
      assert.deepEqual(truth.missingCountryColumns, []);
      assert.deepEqual(truth.missingCountryCodes, []);
      // currency probes DID run against the (empty) currencies table
      assert.ok(truth.missingCurrencyCodes.length > 0);
    },
  );
});

test("9 — a missing currencies table alone is reported without crashing", liveOptions, async () => {
  await withClient(
    `${WIPE}
     CREATE TABLE countries (id serial PRIMARY KEY, code text NOT NULL UNIQUE,
       name_ar text NOT NULL, name_en text NOT NULL);`,
    async (client) => {
      const truth = await verifyMarketSchemaTruth(client);
      assert.deepEqual(truth.missingTables, ["currencies"]);
      assert.equal(truth.ready, false);
      assert.ok(truth.missingCountryColumns.includes("flag_emoji"));
      assert.deepEqual(truth.missingCurrencyCodes, []);
      assert.deepEqual(truth.defaultFlaggedCurrencies, []);
    },
  );
});

test("9 — an absent forward ledger is reported, not thrown", liveOptions, async () => {
  await withClient(
    `${WIPE}
     CREATE TABLE countries (id serial PRIMARY KEY, code text NOT NULL UNIQUE,
       name_ar text NOT NULL, name_en text NOT NULL);
     CREATE TABLE currencies (id text PRIMARY KEY, code text NOT NULL UNIQUE, symbol text NOT NULL,
       name_ar text NOT NULL, name_en text NOT NULL, is_default boolean DEFAULT false);`,
    async (client) => {
      const truth = await verifyMarketSchemaTruth(client);
      assert.equal(truth.forwardLedgerPresent, false);
      assert.equal(truth.appliedForwardMigrations, 0);
      assert.ok(truth.problems.some((p) => p.includes("does not exist")));
    },
  );
});

test("9 — the verifier never mutates the database it inspects", liveOptions, async () => {
  await withClient(WIPE, async (client) => {
    const before = await client.unsafe(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`,
    );
    await verifyMarketSchemaTruth(client);
    const after = await client.unsafe(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`,
    );
    assert.deepEqual(after, before);
  });
});

test("9 — an UNREACHABLE database still throws; it is not reported as 'not ready'", async () => {
  // Port 1 is never a Postgres server. A dead database must never be able to
  // masquerade as a merely-unready one.
  const client = openMigrationClient("postgres://nobody@127.0.0.1:1/nothing");
  try {
    await assert.rejects(() => verifyMarketSchemaTruth(client));
  } finally {
    await client.end({ timeout: 1 }).catch(() => {});
  }
});

test("9 — a missing DATABASE_URL throws instead of silently connecting nowhere", () => {
  const saved = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    assert.throws(() => openMigrationClient(), /DATABASE_URL is required/);
  } finally {
    if (saved !== undefined) process.env.DATABASE_URL = saved;
  }
});
