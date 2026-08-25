import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");

test("clean ad bootstrap creates tracking tables before ALTER repair", () => {
  const source = read("lib/ad-schema.ts");
  const fn = source.slice(source.indexOf("export async function ensureAdSchema"));
  assert.ok(fn.indexOf("for (const sql of AD_TABLES_SQL)") < fn.indexOf("for (const { table, column } of AD_TRACKING_NEW_COLUMNS)"));
});

test("PostgreSQL runtime translates SQLite datetime modifiers", async () => {
  const { translateSql } = await import("../lib/pg-runtime.ts");
  assert.equal(
    translateSql("SELECT datetime('now', '+7 days'), datetime('now', '-30 days'), datetime('now'), datetime(end_at)"),
    "SELECT (now() + INTERVAL '+7 days'), (now() + INTERVAL '-30 days'), now(), NULLIF(end_at::text, '')::timestamptz",
  );
});

test("Roles API enforces canonical permissions and retains its UI contract", () => {
  const route = read("app/api/admin/roles/route.ts");
  assert.match(route, /hasPermission\(identity, PERMISSIONS\.ROLES_VIEW\)/);
  assert.match(route, /hasPermission\(identity, PERMISSIONS\.ROLES_MANAGE\)/);
  assert.match(route, /FROM sponsor_access/);
  assert.match(route, /assignableRoles/);
  assert.doesNotMatch(route, /from ['"]@\/lib\/db['"]/);
});

test("legacy advertising endpoint delegates ad selection to canonical engine", () => {
  const route = read("app/api/advertising/match/route.ts");
  assert.match(route, /from ['"]@\/lib\/ads\/engine['"]/);
  assert.match(route, /matchAds\(runtimeDb, canonicalContext/);
  assert.doesNotMatch(route, /import \{ matchAds, matchNewsTicker/);
  assert.match(route, /toLegacyAdvertisingResult/);
});

test("all five advertising callers remain wired to the compatibility endpoint", () => {
  const files = [
    "components/advertising/placements/NewsTicker.tsx",
    "components/advertising/placements/FeaturedProperties.tsx",
    "components/advertising/placements/AdSidebar.tsx",
    "components/advertising/placements/AdHero.tsx",
    "components/advertising/placements/AdBottom.tsx",
  ];
  for (const file of files) assert.match(read(file), /\/api\/advertising\/match/);
  assert.equal(files.length, 5);
});

test("canonical forward stream contains the PASS C.1 lifecycle baseline", () => {
  const journal = JSON.parse(read("drizzle-pg-forward/meta/_journal.json"));
  assert.ok(journal.entries.some((entry) => entry.tag === "0005_pass_c1_runtime_lifecycle_baseline"));
  const migration = read("drizzle-pg-forward/0005_pass_c1_runtime_lifecycle_baseline.sql");
  for (const table of ["properties", "auction_bids", "auction_terms", "auction_awards", "auction_contracts", "auction_contract_signatures"]) {
    assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS \\"${table}\\"`));
  }
});

test("Identity V5 is canonical and the stale V4 expectation is gone", () => {
  assert.match(read("lib/db/pg-identity-schema.ts"), /PG_IDENTITY_SCHEMA_VERSION = 5/);
  assert.match(read("tests/organizations-hardening-f1.test.mjs"), /canonical version 5/);
  assert.doesNotMatch(read("tests/organizations-hardening-f1.test.mjs"), /VERSION = 4/);
});
