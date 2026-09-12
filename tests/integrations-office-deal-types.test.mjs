// Phase A2 — the eleven ways the platform lets a property be marketed, and the
// office's own filing status for it.
//
// The validator accepted "sale" and "rent" while `property_offer_types` carried
// eleven, so a desktop offering تقبيل or فروغ had the listing rejected outright
// — which is why the desktop only ever offered the two it knew would pass. The
// binding thing here is that the two lists cannot drift apart again.
import assert from "node:assert/strict";
import test from "node:test";

import { createInMemoryDb } from "./helpers/in-memory-db.mjs";
import { setIntegrationDbForTesting } from "../lib/integration/db.ts";
import { startPairing, completePairing } from "../lib/integration/pairing.ts";
import {
  OFFICE_PROPERTY_DEAL_TYPES,
  OFFICE_PROPERTY_LISTING_STATUSES,
  normalizeOfficeProperty,
} from "../lib/integration/office-property.ts";
import { OFFICE_LISTING_STATUS_IDS } from "../lib/integration/reference.ts";
import { propertyOfferTypesSeed } from "../lib/db/schemas/offer-types-schema.ts";
import { INTEGRATION_ALTER_SQL } from "../lib/integration/schema.ts";
import { POST as syncPost } from "../app/api/office/v1/sync/route.ts";

const SPONSOR = "office-a@akarpromax.com";
const URL_SYNC = "https://akarpromax.com/api/office/v1/sync";

function property(overrides = {}) {
  return {
    titleAr: "شقة فاخرة في مسقط",
    descriptionAr: "شقة واسعة بإطلالة بحرية وثلاث غرف نوم ومواقف خاصة.",
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

async function pair(installationId = "inst-a") {
  const pairing = await startPairing({ sponsorId: SPONSOR, officeId: "main" });
  return completePairing({
    code: pairing.code,
    installationId,
    deviceName: "Office PC",
    appVersion: "1.2.0",
    protocolVersion: 1,
  });
}

async function push(token, payload, entityId = "local-1") {
  const request = new Request(URL_SYNC, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "x-protocol-version": "1",
      "x-app-version": "1.2.0",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      items: [{
        operationType: "property.upsert",
        entityId,
        payload,
        clientUpdatedAt: "2030-01-01 00:00:00",
        idempotencyKey: `office-${entityId}-${Math.random().toString(36).slice(2)}`,
      }],
    }),
  });
  request.nextUrl = new URL(URL_SYNC);
  const response = await syncPost(request);
  return { status: response.status, body: await response.json() };
}

test.afterEach(() => setIntegrationDbForTesting(null));

// ---- the two lists cannot drift --------------------------------------------

test("every offer type the platform ships is publishable from an office", () => {
  // This is the assertion that matters. Add a row to propertyOfferTypesSeed
  // without adding its code here and this fails — which is the failure mode
  // that produced the original bug, in the other direction.
  const platformCodes = propertyOfferTypesSeed.map((row) => row.code.toLowerCase()).sort();
  const acceptedCodes = [...OFFICE_PROPERTY_DEAL_TYPES].sort();
  assert.deepEqual(acceptedCodes, platformCodes);
  assert.equal(platformCodes.length, 11);
});

test("sale and rent still work — an older desktop is not broken by a longer list", () => {
  for (const dealType of ["sale", "rent"]) {
    assert.equal(normalizeOfficeProperty(property({ dealType })).dealType, dealType);
  }
});

test("each of the nine new codes is accepted", () => {
  for (const code of ["taqbeel", "faragh", "investment", "assignment", "usufruct",
    "lease_to_own", "exchange", "partnership", "share_sale"]) {
    assert.equal(normalizeOfficeProperty(property({ dealType: code })).dealType, code);
  }
});

test("a code the platform does not define is still rejected", () => {
  assert.throws(
    () => normalizeOfficeProperty(property({ dealType: "barter" })),
    /INVALID_FIELD|dealType/,
  );
  assert.throws(() => normalizeOfficeProperty(property({ dealType: "" })), /INVALID_FIELD|dealType/);
});

test("the code is matched case-insensitively — the desktop stores SALE, the wire carries sale", () => {
  assert.equal(normalizeOfficeProperty(property({ dealType: "TAQBEEL" })).dealType, "taqbeel");
});

// ---- listing status ---------------------------------------------------------

test("the accepted statuses are the ones the reference endpoint offers", () => {
  assert.deepEqual([...OFFICE_PROPERTY_LISTING_STATUSES], [...OFFICE_LISTING_STATUS_IDS]);
});

test("listingStatus is optional, and absent is not active_market", () => {
  // A desktop that predates the field sends nothing. Defaulting would file
  // every old listing under a status its office never chose.
  assert.equal(normalizeOfficeProperty(property()).listingStatus, null);
  assert.equal(normalizeOfficeProperty(property({ listingStatus: "" })).listingStatus, null);
  assert.equal(normalizeOfficeProperty(property({ listingStatus: null })).listingStatus, null);
});

test("each of the three statuses is accepted, and nothing else", () => {
  for (const status of ["active_market", "under_management", "completed"]) {
    assert.equal(normalizeOfficeProperty(property({ listingStatus: status })).listingStatus, status);
  }
  assert.throws(
    () => normalizeOfficeProperty(property({ listingStatus: "approved" })),
    /INVALID_FIELD|listingStatus/,
    "a website moderation status is not an office filing status",
  );
});

// ---- it reaches the database -----------------------------------------------

test("the column is added by the integration schema, never by a table rewrite", () => {
  const alter = INTEGRATION_ALTER_SQL.join("\n");
  assert.match(alter, /ALTER TABLE office_property_links ADD COLUMN listing_status/);
  // On the link row, not on `properties`: properties.status is the website's
  // moderation state and stays the website's to set.
  assert.doesNotMatch(alter, /ALTER TABLE properties\b/);
});

test("a published listing carries its office status, and publishing still never approves", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair();

  const { status, body } = await push(device.token, property({
    dealType: "taqbeel",
    listingStatus: "under_management",
  }));
  assert.equal(status, 200);
  assert.equal(body.accepted, 1);

  const links = db.dump("office_property_links");
  assert.equal(links.length, 1);
  assert.equal(links[0].listing_status, "under_management");

  // The office said "under management"; the website still says "pending
  // review". The two statuses are independent and this proves it.
  const rows = db.dump("properties");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].deal_type, "taqbeel", "the new code reached the row");
  assert.equal(rows[0].status, "pending_review");
});

test("a later push without the field clears it rather than freezing a stale one", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair();

  await push(device.token, property({ listingStatus: "active_market" }), "local-2");
  assert.equal(db.dump("office_property_links")[0].listing_status, "active_market");

  // An office that removes the status in its own app means it: carrying the
  // old value forward would show a filing the office has withdrawn.
  await push(device.token, property(), "local-2");
  assert.equal(db.dump("office_property_links")[0].listing_status, null);
});
