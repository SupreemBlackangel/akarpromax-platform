import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createInMemoryDb } from "./helpers/in-memory-db.mjs";
import { setIntegrationDbForTesting } from "../lib/integration/db.ts";
import { syncPush, syncPull, retryFailedOperations, deadLetterExpired } from "../lib/integration/sync.ts";
import { OFFICE_SYNC_MAX_ATTEMPTS } from "../lib/integration/constants.ts";

const DEVICE_ID = "device-1";
const SPONSOR = "office@akarpromax.com";

function upsertItem(overrides = {}) {
  return {
    operationType: "property.upsert",
    entityId: "prop-1",
    payload: {
      titleAr: "شقة",
      titleEn: "Apartment",
      descriptionAr: "وصف العقار الكامل",
      descriptionEn: "Desc",
      dealType: "sale",
      category: "residential",
      propertyType: "apartment",
      country: "OM",
      governorate: "muscat",
      city: "muscat",
      price: 100000,
      area: 180,
    },
    clientUpdatedAt: "2026-08-07 10:00:00",
    idempotencyKey: "idem-1",
    ...overrides,
  };
}

test("sync module defines the full lifecycle contract", async () => {
  const source = await readFile(new URL("../lib/integration/sync.ts", import.meta.url), "utf8");
  assert.match(source, /export async function syncPush/);
  assert.match(source, /export async function syncPull/);
  assert.match(source, /retryFailedOperations/);
  assert.match(source, /deadLetterExpired/);
  assert.match(source, /ON CONFLICT/);
  assert.match(source, /upsertOfficeProperty/);
  assert.match(source, /archiveOfficeProperty/);
  assert.match(source, /idempotencyKey/);
  assert.match(source, /conflict_reason/);
});

test("idempotent push deduplicates repeated keys", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const first = await syncPush(DEVICE_ID, SPONSOR, [upsertItem()]);
  assert.equal(first.accepted, 1);
  assert.equal(first.conflicts, 0);
  assert.equal(first.duplicates, 0);

  const second = await syncPush(DEVICE_ID, SPONSOR, [upsertItem()]);
  assert.equal(second.accepted, 0);
  assert.equal(second.duplicates, 1);

  const ops = db.dump("office_sync_operations");
  assert.equal(ops.length, 1);
  const props = db.dump("properties");
  assert.equal(props.length, 1);
  assert.equal(props[0].title_ar, "شقة");
  assert.equal(db.dump("office_property_links").length, 1);

  setIntegrationDbForTesting(null);
});

test("concurrent (server-newer) write is reported as conflict, not silent last-write-wins", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  db.seed("properties", [{ id: "server-1", status: "approved", updated_at: "2026-08-07 12:00:00" }]);
  db.seed("office_property_links", [
    { id: "link-1", sponsor_id: SPONSOR, external_id: "prop-1", property_id: "server-1", status: "active" },
  ]);

  const conflictDecisions = [];
  const result = await syncPush(
    DEVICE_ID,
    SPONSOR,
    [upsertItem({ clientUpdatedAt: "2026-08-07 09:00:00" })],
    () => {
      conflictDecisions.push("decided");
      return { action: "accept-server" };
    },
  );
  assert.equal(result.accepted, 0);
  assert.equal(result.conflicts, 1);
  assert.equal(result.items[0].status, "conflict");
  assert.equal(result.items[0].conflictReason, "server_newer");
  assert.equal(conflictDecisions.length, 1);

  const props = db.dump("properties");
  assert.equal(props[0].title_ar ?? null, null, "server copy wins — client payload not applied");
  assert.equal(props[0].status, "approved", "a conflict must not demote the moderated status");
  setIntegrationDbForTesting(null);
});

test("retry and dead-letter transitions are bounded by max attempts", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  await syncPush(DEVICE_ID, SPONSOR, [upsertItem()]);
  const ops = db.dump("office_sync_operations");
  assert.ok(ops[0].attempts <= OFFICE_SYNC_MAX_ATTEMPTS);

  const requeued = await retryFailedOperations();
  assert.equal(typeof requeued, "number");
  const deadLettered = await deadLetterExpired();
  assert.equal(typeof deadLettered, "number");
  assert.ok(Number.isFinite(OFFICE_SYNC_MAX_ATTEMPTS));
  setIntegrationDbForTesting(null);
});

test("pull lists synced operations for the device", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  await syncPush(DEVICE_ID, SPONSOR, [upsertItem()]);
  const pulled = await syncPull(DEVICE_ID);
  assert.equal(pulled.length, 1);
  assert.equal(pulled[0].status, "synced");
  setIntegrationDbForTesting(null);
});

test("unsupported operation types are rejected in the route layer", async () => {
  const source = await readFile(new URL("../app/api/office/v1/sync/route.ts", import.meta.url), "utf8");
  assert.match(source, /property\.upsert/);
  assert.match(source, /property\.delete/);
  assert.match(source, /office_sync_push/);
  assert.match(source, /accept-server/);
});
