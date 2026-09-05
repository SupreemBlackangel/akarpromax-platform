// AkarProMax L1C-0.5B1 — the two prepared Services migration artifacts.
//
// 0003 (Services forward baseline), 0004 (demo graph cleanup), 0005
// (runtime baseline) and 0006 (independent direct booking)
// (runtime lifecycle baseline) are the armed canonical continuation of the
// forward stream. The drizzle migrator executes these journalled files in
// order. These tests hold three properties:
//
//   1. the canonical artifacts remain journalled in their approved order,
//   2. the baseline still describes the canonical runtime Services schema
//      exactly — 25 tables, 42 indexes, no fabricated shape,
//   3. the cleanup stays scoped: no broad DELETE, nothing aimed at the
//      preserved tables, and every certified precondition still stated.
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { SERVICES_TABLES_SQL, SERVICES_INDEXES_SQL } from "../lib/services-schema.ts";
import {
  SERVICES_MARKETPLACE_TABLES_SQL,
  SERVICES_MARKETPLACE_INDEXES_SQL,
} from "../lib/services-marketplace-schema.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFile(path.join(ROOT, rel), "utf8");

const BASELINE = "drizzle-pg-forward/0003_l1c_services_baseline.sql";
const CLEANUP = "drizzle-pg-forward/0004_l1c_services_demo_cleanup.sql";
const DIRECT_BOOKING = "drizzle-pg-forward/0006_pass_cs1b_direct_booking.sql";
const GEO_LAUNCH = "drizzle-pg-forward/0007_geo_hierarchy_launch.sql";

const nameOf = (sql, re) => re.exec(sql)[1];

test("both artifacts exist in the canonical forward-migration folder", async () => {
  assert.match(await read(BASELINE), /AKARPROMAX FORWARD MIGRATION 0003/);
  assert.match(await read(CLEANUP), /AKARPROMAX FORWARD MIGRATION 0004/);
  assert.match(await read(DIRECT_BOOKING), /AKARPROMAX FORWARD MIGRATION 0006/);
  assert.match(await read(GEO_LAUNCH), /AKARPROMAX FORWARD MIGRATION 0007/);
});

/**
 * The canonical stream, through 0007. It is a PREFIX, not the whole journal:
 * migrations are added after it as the platform grows (0008 leads, 0009 direct
 * messaging, 0010 land registry, 0011 oauth accounts, 0012 service timestamps
 * are all applied in production).
 *
 * This assertion used to be a deepEqual against exactly these eight, which is
 * the one thing a migration journal may never be — frozen. It went red the day
 * 0008 was journalled and stayed red, hiding whatever it was meant to catch.
 * What it is meant to catch is a canonical migration being renamed, reordered
 * or dropped, and that is what it checks now. That the journal matches the
 * files on disk is guarded by tests/schema-lineage.test.mjs.
 */
const CANONICAL_STREAM = [
  "0000_l1a_global_market_foundation",
  "0001_l1b_identity_registration",
  "0002_l1a_currency_registry_ils",
  "0003_l1c_services_baseline",
  "0004_l1c_services_demo_cleanup",
  "0005_pass_c1_runtime_lifecycle_baseline",
  "0006_pass_cs1b_direct_booking",
  "0007_geo_hierarchy_launch",
];

test("the forward journal includes the canonical Services and runtime migrations", async () => {
  const journal = JSON.parse(await read("drizzle-pg-forward/meta/_journal.json"));
  const tags = journal.entries.map((e) => e.tag);

  assert.deepEqual(
    tags.slice(0, CANONICAL_STREAM.length),
    CANONICAL_STREAM,
    "the canonical forward stream must open the journal, complete and in order",
  );

  // Whatever came later must still be an ordered, contiguous, unique stream:
  // the migrator runs the journal top to bottom and records each tag once.
  assert.equal(new Set(tags).size, tags.length, "a tag is journalled twice");
  journal.entries.forEach((entry, position) => {
    assert.equal(entry.idx, position, `entry ${entry.tag} is out of order`);
    assert.match(entry.tag, /^\d{4}_/, `entry ${entry.tag} is not numbered`);
    assert.equal(
      entry.tag.slice(0, 4),
      String(position).padStart(4, "0"),
      `entry ${entry.tag} does not carry its own index`,
    );
  });
});

test("the baseline creates exactly the 25 canonical Services tables", async () => {
  const sql = await read(BASELINE);
  const created = [...sql.matchAll(/^CREATE TABLE IF NOT EXISTS (\w+)/gm)].map((m) => m[1]);
  const canonical = [...SERVICES_TABLES_SQL, ...SERVICES_MARKETPLACE_TABLES_SQL]
    .map((s) => nameOf(s, /CREATE TABLE IF NOT EXISTS (\w+)/));
  assert.equal(created.length, 25);
  assert.deepEqual([...created].sort(), [...canonical].sort());
});

test("the baseline declares exactly the 42 canonical application indexes", async () => {
  const sql = await read(BASELINE);
  const declared = [...sql.matchAll(/^CREATE (?:UNIQUE )?INDEX IF NOT EXISTS (\w+)/gm)].map((m) => m[1]);
  const canonical = [...SERVICES_INDEXES_SQL, ...SERVICES_MARKETPLACE_INDEXES_SQL]
    .map((s) => nameOf(s, /INDEX IF NOT EXISTS (\w+)/));
  assert.equal(declared.length, 42);
  assert.deepEqual([...declared].sort(), [...canonical].sort());
});

test("the baseline is non-destructive and inserts no data", async () => {
  const sql = (await read(BASELINE)).replace(/^--.*$/gm, "");
  for (const forbidden of [/\bDROP\s+TABLE\b/i, /\bDROP\s+INDEX\b/i, /\bTRUNCATE\b/i, /\bDELETE\s+FROM\b/i, /\bINSERT\s+INTO\b/i, /\bALTER\s+COLUMN\b/i]) {
    assert.doesNotMatch(sql, forbidden, `the baseline must not contain ${forbidden}`);
  }
  assert.doesNotMatch(sql, /taxonomy_v2/i, "no parallel taxonomy");
});

test("the baseline asserts the canonical shapes that must not drift", async () => {
  const sql = await read(BASELINE);
  assert.match(sql, /unexpected extra service_\* table\(s\)/, "extra-table drift guard");
  assert.match(sql, /missing Services index\(es\)/, "missing-index drift guard");
  assert.match(sql, /not VARCHAR\(36\)/, "ownership width drift guard");
  assert.match(sql, /pre-M3 shape/, "currency shape drift guard");
  assert.match(sql, /composite \(thread_type, thread_id\) primary key/);
});

test("the cleanup never targets the preserved tables", async () => {
  const sql = (await read(CLEANUP)).replace(/^\s*--.*$/gm, "");
  for (const preserved of ["service_categories", "service_marketplace_settings", "users", "sponsor_access"]) {
    assert.doesNotMatch(
      sql,
      new RegExp(`DELETE\\s+FROM\\s+(public\\.)?${preserved}\\b`, "i"),
      `${preserved} must never be deleted from`,
    );
  }
  assert.doesNotMatch(sql, /\bTRUNCATE\b/i, "no TRUNCATE anywhere");
  assert.doesNotMatch(sql, /\bDROP\s+(TABLE|COLUMN|INDEX)\b/i, "the cleanup changes no schema");
});

test("every cleanup DELETE is scoped by a resolved demo identity", async () => {
  const sql = await read(CLEANUP);
  const deletes = [...sql.matchAll(/^\s*DELETE FROM (\w+)([^;]*);/gm)];
  assert.equal(deletes.length, 12, "exactly the 12 demo-graph tables are deleted from");
  for (const [statement, table, rest] of deletes) {
    assert.match(
      rest,
      /WHERE\s+(id|order_id|request_id|provider_id)\s*=\s*ANY\s*\((order_ids|request_ids|profile_ids)\)/,
      `DELETE FROM ${table} must be scoped by a resolved demo id array, got: ${statement.trim()}`,
    );
  }
});

test("the cleanup states every certified precondition before deleting", async () => {
  const sql = await read(CLEANUP);
  const firstDelete = sql.search(/^\s*DELETE FROM /m);
  const preconditions = sql.slice(0, firstDelete);

  const counts = [
    ["service_provider_profiles", 4],
    ["service_provider_categories", 16],
    ["service_provider_documents", 4],
    ["service_provider_portfolio", 4],
    ["service_requests", 5],
    ["service_request_answers", 18],
    ["service_request_matches", 4],
    ["service_request_status_history", 5],
    ["service_offers", 1],
    ["service_orders", 1],
    ["service_reviews", 2],
    ["service_job_timeline", 4],
  ];
  for (const [table, expected] of counts) {
    assert.match(
      preconditions,
      new RegExp(`${table} = % \\(expected ${expected}\\)`),
      `the ${table} = ${expected} precondition must be asserted before any DELETE`,
    );
  }

  for (const empty of [
    "service_listings",
    "service_messages",
    "service_disputes",
    "service_bookmarks",
    "service_request_attachments",
    "service_offer_revisions",
    "service_reports",
    "service_notifications",
    "service_message_threads",
    "service_message_participants",
    "service_outbox_events",
  ]) {
    assert.match(preconditions, new RegExp(`'${empty}'`), `${empty} must be asserted empty before any DELETE`);
  }

  for (const identity of [
    "provider1@localhost.akarpromax",
    "provider2@localhost.akarpromax",
    "provider3@localhost.akarpromax",
    "provider4@localhost.akarpromax",
    "customer@localhost.akarpromax",
    "SR-2026-1001",
    "SR-2026-1002",
    "SR-2026-1003",
    "SR-2026-1004",
  ]) {
    assert.match(preconditions, new RegExp(identity.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("the cleanup asserts the post-state and the preserved tables", async () => {
  const sql = await read(CLEANUP);
  const lastDelete = sql.lastIndexOf("DELETE FROM");
  const after = sql.slice(lastDelete);
  assert.match(after, /still holds % row\(s\) after cleanup/, "post-cleanup emptiness assertion");
  assert.match(after, /service_categories changed/, "service_categories preservation assertion");
  assert.match(after, /service_marketplace_settings changed/, "settings preservation assertion");
  assert.match(after, /users changed/, "users preservation assertion");
  assert.match(after, /sponsor_access changed/, "sponsor_access preservation assertion");
});

// ===========================================================================
// L1C-0.5B1-R1 corrections
// ===========================================================================

test("R1-1: the outside-graph emptiness check runs BEFORE the already-clean return", async () => {
  const sql = await read(CLEANUP);
  const outsideCheck = sql.indexOf("'service_outbox_events'");
  const noopReturn = sql.indexOf("RETURN;");
  const firstDelete = sql.search(/^\s*DELETE FROM /m);
  assert.ok(outsideCheck > 0, "the outside-graph table list is present");
  assert.ok(noopReturn > 0, "the already-clean short-circuit is present");
  assert.ok(
    outsideCheck < noopReturn,
    "R1 FIX: a core-empty database holding an outside-graph row (e.g. one service_outbox_events row) must RAISE, so the emptiness check cannot sit after the no-op RETURN",
  );
  assert.ok(noopReturn < firstDelete, "the short-circuit still precedes every DELETE");

  // the short-circuit predicate must cover all 12 core tables
  const predicate = sql.slice(sql.indexOf("IF n_profiles = 0"), noopReturn);
  for (const counter of [
    "n_profiles", "n_prov_cats", "n_prov_docs", "n_portfolio", "n_requests", "n_answers",
    "n_matches", "n_history", "n_offers", "n_orders", "n_reviews", "n_timeline",
  ]) {
    assert.match(predicate, new RegExp(`\\b${counter} = 0\\b`), `${counter} must be part of the already-clean predicate`);
  }
});

test("R1-2: every outside-graph table is asserted empty unconditionally", async () => {
  const sql = await read(CLEANUP);
  const noopReturn = sql.indexOf("RETURN;");
  const beforeReturn = sql.slice(0, noopReturn);
  for (const empty of [
    "service_listings",
    "service_messages",
    "service_disputes",
    "service_bookmarks",
    "service_request_attachments",
    "service_offer_revisions",
    "service_reports",
    "service_notifications",
    "service_message_threads",
    "service_message_participants",
    "service_outbox_events",
  ]) {
    assert.match(beforeReturn, new RegExp(`'${empty}'`), `${empty} must be asserted empty before the already-clean return`);
  }
});

test("R1-2: the exact seed-graph identity assertions are stated before any DELETE", async () => {
  const sql = await read(CLEANUP);
  const preconditions = sql.slice(0, sql.search(/^\s*DELETE FROM /m));

  // the seed identities the assertions are built on
  assert.match(preconditions, /demo_job_provider\s+text\s+:= 'provider1@localhost\.akarpromax'/);
  assert.match(preconditions, /demo_job_request_ref text\s+:= 'SR-2026-1001'/);

  const required = [
    [/service_request_status_history\.changed_by must be the seed customer/, "history actor = seed customer"],
    [/single service_offers row is not owned by the seed job provider/, "offer provider = provider1"],
    [/single service_orders row is not the certified seed job/, "order customer/provider/request/offer linkage"],
    [/o\.offer_id = seed_offer_id/, "order.offer_id = the single seed offer"],
    [/o\.request_id = \(SELECT f\.request_id FROM service_offers f WHERE f\.id = seed_offer_id\)/, "offer.request_id = order.request_id"],
    [/service_job_timeline\.actor_user_id must be %/, "all 4 timeline actors = provider1"],
    [/service_reviews rows are not the reciprocal seed pair/, "reciprocal review pair"],
    [/service_provider_documents must carry uploaded_by IS NULL and verified_by IS NULL/, "document actors NULL"],
  ];
  for (const [re, label] of required) {
    assert.match(preconditions, re, `missing identity assertion: ${label}`);
  }
});

test("R1-3: the baseline verifies index SHAPE from catalog truth, not just names", async () => {
  const sql = await read(BASELINE);
  assert.match(sql, /index shape drift/, "the shape assertion must exist");
  for (const catalog of ["pg_index", "pg_class", "pg_namespace", "pg_attribute", "indisunique", "indkey"]) {
    assert.match(sql, new RegExp(catalog), `the shape assertion must read ${catalog}`);
  }
  // every one of the 42 canonical indexes appears in the expected-shape VALUES list
  const shapeBlock = sql.slice(sql.indexOf("-- 4.2b"));
  const canonical = [...SERVICES_INDEXES_SQL, ...SERVICES_MARKETPLACE_INDEXES_SQL].map((s) => {
    const m = /^CREATE (UNIQUE )?INDEX IF NOT EXISTS (\w+) ON (\w+) \(([^)]+)\)$/.exec(s.trim());
    return { name: m[2], uniq: Boolean(m[1]), table: m[3], cols: m[4].split(",").map((c) => c.trim()).join(",") };
  });
  assert.equal(canonical.length, 42);
  for (const c of canonical) {
    assert.match(
      shapeBlock,
      new RegExp(`\\('${c.name}', ${c.uniq}, '${c.table}', '${c.cols.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}'\\)`),
      `index ${c.name} must declare its expected uniqueness, table and ordered columns`,
    );
  }
});

test("R1-4: the plan document carries no stale ACTIVE R1 strategy references", async () => {
  const doc = await read("docs/refactor/L1C05B_SERVICES_MIGRATION_PLAN.md");
  const lines = doc.split("\n");

  // The R1 A–J step letters are gone entirely; R2 uses numbered steps.
  const stepRefs = lines.filter((l) => /\bstep [A-J]\b/.test(l));
  assert.deepEqual(stepRefs, [], "R1 step letters (step D / step G / step J) must not survive as references");

  // These may only appear where they are explicitly negated or marked historical.
  // A wrapped markdown paragraph puts the marker on a neighbouring line, so the
  // context under test is the matching line plus the lines either side of it.
  const SUPERSEDED = /SUPERSEDE|supersede[sd]?|\bR1\b|\bR2\b|\*\*NO\*\*|\bnever\b|\bremoved\b|\bno rows to map\b|\bnone\b/i;
  for (const token of [/services_identity_map/, /services_orphan_ownership/, /dual.write/i, /companion column/i, /shadow.column/i, /legacy resolver/i]) {
    lines.forEach((line, i) => {
      if (!token.test(line)) return;
      const context = lines.slice(Math.max(0, i - 2), i + 3).join(" ");
      assert.match(
        context,
        SUPERSEDED,
        `${token} may only appear as superseded/negated history, found active use: ${line.trim().slice(0, 120)}`,
      );
    });
  }

  // service_disputes must be excluded with no value migration.
  assert.match(doc, /EXCLUDED FROM M1 ENTIRELY/);
  assert.doesNotMatch(doc, /migrate the column value/, "the contradictory dispute value-migration phrase must be gone");
  assert.match(doc, /Value migration \| \*\*none\*\*/);
  assert.match(doc, /UUID type change \| \*\*none\*\*/);

  // the R2 sequence is what removes the re-key machinery
  assert.match(doc, /step 11 of the R2 sequence/);
});
