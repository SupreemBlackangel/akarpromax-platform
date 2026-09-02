import assert from "node:assert/strict";
import test from "node:test";

import { pruneOrphanAdRequestAssets } from "../lib/ads/asset-retention.ts";

/**
 * Two production data problems, both measured before being fixed.
 *
 * 1. `CREATE TABLE IF NOT EXISTS` only checks the schema it would create in --
 *    the first entry of search_path -- not the whole path. search_path here is
 *    "public, akarpromax" while the ad tables were created in akarpromax, so
 *    the bootstrap created a second, EMPTY ad_impressions in public that then
 *    shadowed the real one holding 140 rows.
 *
 * 2. ad_request_assets stores raw image bytes and nothing ever deleted a row.
 */

// ---- a fake D1 that records what it was asked ------------------------------

function fakeDb({ tables = new Set(), rows = {} } = {}) {
  const deleted = [];
  const created = [];
  const db = {
    deleted,
    created,
    prepare(sql) {
      let bound = [];
      const stmt = {
        bind(...args) { bound = args; return stmt; },
        async all() {
          const probe = /^SELECT 1 FROM (\w+) WHERE 1 = 0$/.exec(sql);
          if (probe) {
            if (!tables.has(probe[1])) throw new Error(`relation "${probe[1]}" does not exist`);
            return { results: [] };
          }
          if (sql.startsWith("SELECT id FROM ad_request_assets")) return { results: rows.assets ?? [] };
          const col = /^SELECT (\w+) AS url FROM (\w+)$/.exec(sql);
          if (col) {
            if (!tables.has(col[2])) throw new Error(`relation "${col[2]}" does not exist`);
            return { results: (rows[col[2]] ?? []).map((r) => ({ url: r[col[1]] ?? null })) };
          }
          return { results: [] };
        },
        async first() { return null; },
        async run() {
          if (/^CREATE TABLE IF NOT EXISTS (\w+)/i.test(sql)) created.push(/^CREATE TABLE IF NOT EXISTS (\w+)/i.exec(sql)[1]);
          if (sql.startsWith("DELETE FROM ad_request_assets")) deleted.push(bound[0]);
          return {};
        },
      };
      return stmt;
    },
  };
  return db;
}

// ---- retention --------------------------------------------------------------

const ASSET_URL = (id) => `/api/ads/request-asset?id=${id}`;
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

test("an old upload nothing points at is removed", async () => {
  const db = fakeDb({
    tables: new Set(["ad_campaigns", "ad_creatives"]),
    rows: { assets: [{ id: A }], ad_campaigns: [], ad_creatives: [] },
  });
  const result = await pruneOrphanAdRequestAssets(db);
  assert.deepEqual(db.deleted, [A]);
  assert.equal(result.deleted, 1);
});

test("an upload a live campaign still renders is never deleted", async () => {
  const db = fakeDb({
    tables: new Set(["ad_campaigns", "ad_creatives"]),
    rows: {
      assets: [{ id: A }, { id: B }],
      ad_campaigns: [{ media_url: ASSET_URL(A) }],
      ad_creatives: [],
    },
  });
  const result = await pruneOrphanAdRequestAssets(db);
  assert.deepEqual(db.deleted, [B], "only the orphan goes");
  assert.equal(result.keptBecauseReferenced, 1, "deleting a referenced asset would blank a running ad");
});

test("a creative's own media counts as a reference", async () => {
  const db = fakeDb({
    tables: new Set(["ad_campaigns", "ad_creatives"]),
    rows: { assets: [{ id: A }], ad_campaigns: [], ad_creatives: [{ media_url: ASSET_URL(A.toUpperCase()) }] },
  });
  await pruneOrphanAdRequestAssets(db);
  assert.deepEqual(db.deleted, [], "the id comparison must not be case sensitive");
});

test("a missing referencing table does not turn the sweep destructive", async () => {
  // If ad_creatives cannot be read, its references are unknown -- and unknown
  // must not mean "unreferenced".
  const db = fakeDb({
    tables: new Set(["ad_campaigns"]),
    rows: { assets: [{ id: A }], ad_campaigns: [{ media_url: ASSET_URL(A) }] },
  });
  await pruneOrphanAdRequestAssets(db);
  assert.deepEqual(db.deleted, [], "the campaign reference still protects it");
});

test("nothing old means nothing read and nothing deleted", async () => {
  const db = fakeDb({ tables: new Set(["ad_campaigns", "ad_creatives"]), rows: { assets: [] } });
  const result = await pruneOrphanAdRequestAssets(db);
  assert.deepEqual(result, { examined: 0, deleted: 0, keptBecauseReferenced: 0 });
});

// ---- schema shadowing -------------------------------------------------------

test("the ad bootstrap does not recreate a table that already resolves", async () => {
  const { AD_TABLES_SQL } = await import("../lib/ad-schema.ts");
  const names = AD_TABLES_SQL.map((sql) => /CREATE TABLE IF NOT EXISTS\s+(\w+)/i.exec(sql)?.[1]);
  assert.deepEqual(
    names,
    ["ad_impressions", "ad_clicks", "ad_conversions", "ad_daily_statistics"],
    "the guard reads the table name out of each statement, so the names must stay parseable",
  );
});
