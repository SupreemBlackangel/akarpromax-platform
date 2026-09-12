// An audit row has to answer what changed, and why.
//
// It answered WHO, WHAT and WHEN, and stopped there. `before`, `after` and
// `reason` were left to whatever each call site chose to put in `metadata`, so
// they were mostly not written at all: `setProviderStatus` read the previous
// status in order to validate the transition and then discarded it, and the log
// recorded that a provider had been rejected without recording what they had
// been, or why — which are the two things anyone reading that row later needs.
//
// They are named fields on AuditEntry now, folded into the metadata column, so
// there is one shape rather than a convention each caller half-remembers.
import assert from "node:assert/strict";
import test from "node:test";

import { createInMemoryDb } from "./helpers/in-memory-db.mjs";
import { setServicesDbForTesting } from "../lib/services/db.ts";
import { writeAudit } from "../lib/services/audit.ts";
import { setProviderStatus, getProviderProfileById } from "../lib/services/marketplace.ts";
import { updateListingStatus } from "../lib/services/core.ts";
import { PROVIDER_STATUS_VALUES, LISTING_STATUS } from "../lib/services/constants.ts";

let db;

const auditRows = async () => (await db.prepare("SELECT * FROM audit_logs").all()).results ?? [];
const parse = (value) => (typeof value === "string" ? JSON.parse(value) : value ?? {});

test.beforeEach(() => {
  db = setServicesDbForTesting(createInMemoryDb());
});

test.afterEach(() => {
  setServicesDbForTesting(null);
});

test("the three named fields reach the row, and an absent one stays absent", async () => {
  await writeAudit({ action: "t.one", entityType: "t", entityId: "1", before: { status: "a" }, after: { status: "b" }, reason: "لأنه كذا" });
  await writeAudit({ action: "t.two", entityType: "t", entityId: "2", metadata: { note: "plain" } });

  const rows = await auditRows();
  const one = parse(rows.find((row) => row.action === "t.one").metadata);
  assert.deepEqual(one.before, { status: "a" });
  assert.deepEqual(one.after, { status: "b" });
  assert.equal(one.reason, "لأنه كذا");

  const two = parse(rows.find((row) => row.action === "t.two").metadata);
  assert.equal(two.note, "plain", "existing metadata still travels");
  assert.ok(!("before" in two), "a field nobody supplied must not appear as null noise");
});

test("rejecting a provider records what they were and why", async () => {
  await db
    .prepare(
      `INSERT INTO service_provider_profiles (id, user_id, status, country_code, created_at, updated_at)
       VALUES ('p1', 'p1@example.com', 'submitted', 'SA', '2026-09-12 00:00:00', '2026-09-12 00:00:00')`,
    )
    .run();

  await setProviderStatus("p1", PROVIDER_STATUS_VALUES.REJECTED, "الترخيص منتهٍ", { userId: "reviewer@example.com", ip: "1.2.3.4" });

  assert.equal((await getProviderProfileById("p1")).status, PROVIDER_STATUS_VALUES.REJECTED);
  const row = (await auditRows()).find((entry) => entry.action === "service_provider.status.rejected");
  assert.ok(row, "the decision must be audited");
  const metadata = parse(row.metadata);
  assert.deepEqual(metadata.before, { status: "submitted" }, "the status it came from was being discarded");
  assert.deepEqual(metadata.after, { status: "rejected" });
  assert.equal(metadata.reason, "الترخيص منتهٍ");
  assert.equal(row.actor_user_id, "reviewer@example.com", "WHO");
  assert.ok(row.created_at, "WHEN");
});

test("a listing verdict records the same three things", async () => {
  await db
    .prepare(
      `INSERT INTO service_listings (id, provider_user_id, category_id, country_code, city_id, status, is_featured, created_at, updated_at)
       VALUES ('l1', 'owner@example.com', 'cat-1', 'SA', 'JEDDAH', 'pending_approval', 0, '2026-09-12 00:00:00', '2026-09-12 00:00:00')`,
    )
    .run();

  await updateListingStatus("l1", LISTING_STATUS.REJECTED, {
    userId: "reviewer@example.com",
    ip: null,
    isReviewer: true,
    note: "الصور لا تخص الخدمة",
  });

  const row = (await auditRows()).find((entry) => entry.action === "service_listing.status.rejected");
  const metadata = parse(row.metadata);
  assert.deepEqual(metadata.before, { status: "pending_approval" });
  assert.deepEqual(metadata.after, { status: "rejected" });
  assert.equal(metadata.reason, "الصور لا تخص الخدمة");
  assert.equal(metadata.byReviewer, true, "caller-specific metadata still has room beside the contract");
});

test("the contract is the type, not a habit", async () => {
  const { readFile } = await import("node:fs/promises");
  const audit = await readFile(new URL("../lib/services/audit.ts", import.meta.url), "utf8");
  for (const field of ["before\\?:", "after\\?:", "reason\\?:"]) {
    assert.match(audit, new RegExp(field), "the fields must be on AuditEntry, so a caller is prompted rather than trusted");
  }
  assert.match(audit, /function auditMetadata\(/);
});
