// Phase 3A — Office → website property publishing.
//
// The desktop publishes only through the authenticated device contract
// POST /api/office/v1/sync. Identity, ownership, moderation status and geo
// persistence are all proved here at the route/service level.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createInMemoryDb } from "./helpers/in-memory-db.mjs";
import { setIntegrationDbForTesting } from "../lib/integration/db.ts";
import { startPairing, completePairing } from "../lib/integration/pairing.ts";
import {
  OFFICE_PROPERTY_ARCHIVED_STATUS,
  OFFICE_PROPERTY_PRIVATE_FIELDS,
  OFFICE_PROPERTY_REVIEW_STATUS,
  normalizeOfficeProperty,
} from "../lib/integration/office-property.ts";
import { POST as syncPost } from "../app/api/office/v1/sync/route.ts";

const SPONSOR_A = "office-a@akarpromax.com";
const SPONSOR_B = "office-b@akarpromax.com";
const URL_SYNC = "https://akarpromax.com/api/office/v1/sync";

function property(overrides = {}) {
  return {
    titleAr: "شقة فاخرة في مسقط",
    titleEn: "Luxury apartment in Muscat",
    descriptionAr: "شقة واسعة بإطلالة بحرية وثلاث غرف نوم ومواقف خاصة.",
    descriptionEn: "Spacious sea-view apartment.",
    dealType: "sale",
    category: "residential",
    propertyType: "apartment",
    country: "OM",
    governorate: "muscat",
    city: "muscat",
    district: "al-khuwair",
    latitude: 23.5859,
    longitude: 58.4059,
    address: "Al Khuwair, Muscat",
    price: 95000,
    currency: "OMR",
    area: 180,
    bedrooms: 3,
    bathrooms: 2,
    ...overrides,
  };
}

function item(overrides = {}) {
  return {
    operationType: "property.upsert",
    entityId: "local-42",
    payload: property(),
    clientUpdatedAt: "2030-01-01 00:00:00",
    idempotencyKey: "office-property-local-42-aaaa",
    ...overrides,
  };
}

function syncRequest(token, items) {
  const request = new Request(URL_SYNC, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "x-protocol-version": "1",
      "x-app-version": "1.2.0",
      "content-type": "application/json",
    },
    body: JSON.stringify({ items }),
  });
  request.nextUrl = new URL(URL_SYNC);
  return request;
}

async function pair(sponsorId, installationId) {
  const pairing = await startPairing({ sponsorId, officeId: "main" });
  return completePairing({
    code: pairing.code,
    installationId,
    deviceName: "Office PC",
    appVersion: "1.2.0",
    protocolVersion: 1,
  });
}

async function push(token, items) {
  const response = await syncPost(syncRequest(token, items));
  return { status: response.status, body: response.status === 200 ? await response.json() : await response.json() };
}

test.afterEach(() => setIntegrationDbForTesting(null));

// ---- authentication -------------------------------------------------------

test("a push with no Authorization header is rejected with 401", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  const request = new Request(URL_SYNC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ items: [item()] }),
  });
  request.nextUrl = new URL(URL_SYNC);
  const response = await syncPost(request);
  assert.equal(response.status, 401);
});

test("a push with an invalid device token is rejected with 401", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  const { status, body } = await push("apd_not_a_real_token", [item()]);
  assert.equal(status, 401);
  assert.equal(body.reason, "INVALID");
});

// ---- create / update / identity ------------------------------------------

test("a valid device creates the property and receives its server mapping", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair(SPONSOR_A, "inst-a");

  const { status, body } = await push(device.token, [item()]);
  assert.equal(status, 200);
  assert.equal(body.accepted, 1);
  assert.equal(body.items[0].entityId, "local-42");
  assert.ok(body.items[0].propertyId, "the server must return the mapped property id");

  const rows = db.dump("properties");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].title_ar, "شقة فاخرة في مسقط");
  assert.equal(rows[0].reference_number, "local-42");
});

test("sponsor attribution comes from the device, never from the payload", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair(SPONSOR_A, "inst-a");
  db.seed("users", [{ id: "11111111-1111-4111-8111-111111111111", email: SPONSOR_A }]);

  await push(device.token, [
    item({
      payload: property({
        sponsorId: SPONSOR_B,
        userId: "22222222-2222-4222-8222-222222222222",
        officeId: "33333333-3333-4333-8333-333333333333",
        isFeatured: true,
        isVerified: true,
        status: "approved",
      }),
    }),
  ]);

  const rows = db.dump("properties");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].user_id, "11111111-1111-4111-8111-111111111111");
  assert.equal(rows[0].status, OFFICE_PROPERTY_REVIEW_STATUS, "a device cannot publish itself as approved");
  assert.equal(rows[0].is_featured ?? undefined, undefined, "a device cannot set the featured flag");
  assert.equal(rows[0].is_verified ?? undefined, undefined);

  const links = db.dump("office_property_links");
  assert.equal(links.length, 1);
  assert.equal(links[0].sponsor_id, SPONSOR_A, "ownership follows the authenticated device");
});

test("publishing the same entityId again updates the same property", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair(SPONSOR_A, "inst-a");

  const first = await push(device.token, [item()]);
  const second = await push(device.token, [
    item({ idempotencyKey: "office-property-local-42-bbbb", payload: property({ price: 120000, titleAr: "شقة محدثة" }) }),
  ]);

  assert.equal(second.body.accepted, 1);
  assert.equal(second.body.items[0].propertyId, first.body.items[0].propertyId);
  const rows = db.dump("properties");
  assert.equal(rows.length, 1, "an update must never create a second property");
  assert.equal(rows[0].title_ar, "شقة محدثة");
  assert.equal(Number(rows[0].price), 120000);
});

test("replaying the same idempotencyKey is a duplicate, not a second insert", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair(SPONSOR_A, "inst-a");

  const first = await push(device.token, [item()]);
  const replay = await push(device.token, [item()]);

  assert.equal(first.body.accepted, 1);
  assert.equal(replay.body.accepted, 0);
  assert.equal(replay.body.duplicates, 1);
  assert.equal(replay.body.items[0].propertyId, first.body.items[0].propertyId);
  assert.equal(db.dump("properties").length, 1);
  assert.equal(db.dump("office_sync_operations").length, 1);
});

test("a third publish of the same property still lands on the same row", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair(SPONSOR_A, "inst-a");

  const ids = [];
  for (const key of ["k1", "k2", "k3"]) {
    const result = await push(device.token, [item({ idempotencyKey: key })]);
    ids.push(result.body.items[0].propertyId);
  }
  assert.equal(new Set(ids).size, 1);
  assert.equal(db.dump("properties").length, 1);
});

// ---- ownership ------------------------------------------------------------

test("a different sponsor cannot overwrite the first sponsor's property", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const deviceA = await pair(SPONSOR_A, "inst-a");
  const deviceB = await pair(SPONSOR_B, "inst-b");

  const created = await push(deviceA.token, [item()]);
  const attack = await push(deviceB.token, [
    item({ idempotencyKey: "attacker-1", payload: property({ titleAr: "استيلاء" }) }),
  ]);

  assert.notEqual(attack.body.items[0].propertyId, created.body.items[0].propertyId);
  const rows = db.dump("properties");
  assert.equal(rows.length, 2, "the same local id under a different sponsor is a different property");
  const victim = rows.find((row) => row.id === created.body.items[0].propertyId);
  assert.equal(victim.title_ar, "شقة فاخرة في مسقط", "sponsor A's row is untouched");
});

test("a different sponsor cannot delete the first sponsor's property", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const deviceA = await pair(SPONSOR_A, "inst-a");
  const deviceB = await pair(SPONSOR_B, "inst-b");
  const created = await push(deviceA.token, [item()]);

  const attack = await push(deviceB.token, [
    { operationType: "property.delete", entityId: "local-42", payload: {}, clientUpdatedAt: "2030-01-01 00:00:00", idempotencyKey: "del-attack" },
  ]);
  assert.equal(attack.body.items[0].propertyId ?? null, null);

  const victim = db.dump("properties").find((row) => row.id === created.body.items[0].propertyId);
  assert.equal(victim.status, OFFICE_PROPERTY_REVIEW_STATUS, "sponsor A's property is not archived");
});

// ---- privacy --------------------------------------------------------------

test("every private owner/client field is rejected outright", () => {
  for (const field of OFFICE_PROPERTY_PRIVATE_FIELDS) {
    assert.throws(
      () => normalizeOfficeProperty(property({ [field]: "secret" })),
      (error) => error.code === "PRIVATE_FIELD_REJECTED",
      `${field} must be rejected`,
    );
  }
});

test("a payload carrying owner data is failed and never persisted", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair(SPONSOR_A, "inst-a");

  const { body } = await push(device.token, [item({ payload: property({ ownerName: "محمد" }) })]);

  assert.equal(body.accepted, 0);
  assert.equal(body.items[0].status, "failed");
  assert.equal(body.items[0].conflictReason, "PRIVATE_FIELD_REJECTED");
  assert.equal(db.dump("properties").length, 0);
  assert.doesNotMatch(JSON.stringify(db.dump("properties")), /محمد/);
});

// ---- validation + geo -----------------------------------------------------

test("geo fields persist exactly as published", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair(SPONSOR_A, "inst-a");
  await push(device.token, [item()]);

  const row = db.dump("properties")[0];
  assert.equal(row.country, "OM");
  assert.equal(row.governorate, "muscat");
  assert.equal(row.city, "muscat");
  assert.equal(row.district, "al-khuwair");
  assert.equal(Number(row.latitude), 23.5859);
  assert.equal(Number(row.longitude), 58.4059);
});

test("a property without a country, governorate or city is refused", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair(SPONSOR_A, "inst-a");

  for (const missing of ["country", "governorate", "city"]) {
    const payload = property();
    delete payload[missing];
    const { body } = await push(device.token, [item({ idempotencyKey: `miss-${missing}`, payload })]);
    assert.equal(body.items[0].status, "failed", missing);
    assert.equal(body.items[0].conflictReason, "MISSING_FIELD", missing);
  }
  assert.equal(db.dump("properties").length, 0, "no partial row may be written");
});

test("deal type, category and property type must be canonical values", () => {
  assert.throws(() => normalizeOfficeProperty(property({ dealType: "sell" })), (e) => e.code === "INVALID_FIELD");
  assert.throws(() => normalizeOfficeProperty(property({ category: "vip" })), (e) => e.code === "INVALID_FIELD");
  assert.throws(() => normalizeOfficeProperty(property({ propertyType: "castle" })), (e) => e.code === "INVALID_FIELD");
  assert.throws(() => normalizeOfficeProperty(property({ price: 0 })), (e) => e.code === "INVALID_FIELD");
  assert.throws(() => normalizeOfficeProperty(property({ area: -5 })), (e) => e.code === "INVALID_FIELD");
});

// ---- moderation -----------------------------------------------------------

test("an office publish enters review and an office update cannot promote it", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair(SPONSOR_A, "inst-a");

  await push(device.token, [item()]);
  assert.equal(db.dump("properties")[0].status, OFFICE_PROPERTY_REVIEW_STATUS);

  // A moderator approves it.
  db.table("properties")[0].status = "approved";

  await push(device.token, [item({ idempotencyKey: "edit-1", payload: property({ price: 99000 }) })]);
  const row = db.dump("properties")[0];
  assert.equal(row.status, OFFICE_PROPERTY_REVIEW_STATUS, "an edited listing goes back through review");
  assert.notEqual(row.status, "approved");
});

test("a sold or rented listing is not resurrected by an office edit", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair(SPONSOR_A, "inst-a");
  await push(device.token, [item()]);

  for (const terminal of ["sold", "rented"]) {
    db.table("properties")[0].status = terminal;
    await push(device.token, [item({ idempotencyKey: `edit-${terminal}`, payload: property({ price: 1234 }) })]);
    assert.equal(db.dump("properties")[0].status, terminal);
  }
});

// ---- delete / unpublish ---------------------------------------------------

test("property.delete unpublishes the mapped property", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair(SPONSOR_A, "inst-a");
  const created = await push(device.token, [item()]);

  const deleted = await push(device.token, [
    { operationType: "property.delete", entityId: "local-42", payload: {}, clientUpdatedAt: "2030-01-02 00:00:00", idempotencyKey: "del-1" },
  ]);

  assert.equal(deleted.body.accepted, 1);
  assert.equal(deleted.body.items[0].propertyId, created.body.items[0].propertyId);
  assert.equal(db.dump("properties")[0].status, OFFICE_PROPERTY_ARCHIVED_STATUS);
  assert.equal(db.dump("office_property_links")[0].status, "deleted");
});

test("repeating a delete is safe and never errors", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair(SPONSOR_A, "inst-a");
  await push(device.token, [item()]);

  const first = await push(device.token, [
    { operationType: "property.delete", entityId: "local-42", payload: {}, clientUpdatedAt: "2030-01-02 00:00:00", idempotencyKey: "del-1" },
  ]);
  const replay = await push(device.token, [
    { operationType: "property.delete", entityId: "local-42", payload: {}, clientUpdatedAt: "2030-01-03 00:00:00", idempotencyKey: "del-2" },
  ]);

  assert.equal(first.body.items[0].status, "synced");
  assert.equal(replay.body.items[0].status, "synced");
  assert.equal(db.dump("properties").length, 1);
  assert.equal(db.dump("properties")[0].status, OFFICE_PROPERTY_ARCHIVED_STATUS);
});

test("deleting an entity that was never published is a harmless no-op", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair(SPONSOR_A, "inst-a");

  const { body } = await push(device.token, [
    { operationType: "property.delete", entityId: "never-published", payload: {}, clientUpdatedAt: "2030-01-02 00:00:00", idempotencyKey: "del-x" },
  ]);

  assert.equal(body.items[0].status, "synced");
  assert.equal(body.items[0].propertyId ?? null, null);
  assert.equal(db.dump("properties").length, 0);
});

// ---- the canonical contract ------------------------------------------------

test("office publishing never routes through the public property endpoints", async () => {
  const sync = await readFile(new URL("../lib/integration/sync.ts", import.meta.url), "utf8");
  const office = await readFile(new URL("../lib/integration/office-property.ts", import.meta.url), "utf8");

  // Assert on executable code, not on the prose that explains it.
  const strip = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*(\/\/|\*).*$/gm, "");

  for (const source of [strip(sync), strip(office)]) {
    assert.doesNotMatch(source, /getSession\(/);
    assert.doesNotMatch(source, /api\/properties/);
    assert.doesNotMatch(source, /api\/desktop/);
    assert.doesNotMatch(source, /localhost/);
  }
  assert.match(strip(office), /INSERT INTO properties/);
  assert.match(strip(office), /office_property_links/);
});
