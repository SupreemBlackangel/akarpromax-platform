// Phase A1 — the drop-downs the desktop office app fills its forms from.
//
// The desktop showed four hard-coded "offer type" chips while the website
// offers eleven, so a listing published from the desktop could not say تقبيل or
// فروغ at all. What matters here is not that a route exists but that it answers
// from the SAME source the website reads — a second list would drift, and drift
// means a desktop publishing a category the website rejects.
import assert from "node:assert/strict";
import test from "node:test";

import { createInMemoryDb } from "./helpers/in-memory-db.mjs";
import { setIntegrationDbForTesting } from "../lib/integration/db.ts";
import { startPairing, completePairing } from "../lib/integration/pairing.ts";
import {
  OFFICE_LISTING_STATUSES,
  OFFICE_LISTING_STATUS_IDS,
  isOfficeListingStatus,
  referenceVersion,
  setOfferTypeReaderForTesting,
} from "../lib/integration/reference.ts";
import { propertyOfferTypesSeed } from "../lib/db/schemas/offer-types-schema.ts";
import {
  PROPERTY_CATEGORIES,
  PROPERTY_TYPES,
  selectableCategories,
} from "../lib/taxonomy/property-taxonomy.ts";
import { CURRENCY_REGISTRY } from "../lib/market/currency-registry.ts";

const SPONSOR = "office-a@akarpromax.com";
const URL_REFERENCE = "https://akarpromax.com/api/office/v1/reference";

async function pair(sponsorId = SPONSOR, installationId = "inst-a") {
  const pairing = await startPairing({ sponsorId, officeId: "main" });
  return completePairing({
    code: pairing.code,
    installationId,
    deviceName: "Office PC",
    appVersion: "1.2.0",
    protocolVersion: 1,
  });
}

function request(token, extraHeaders = {}) {
  const headers = {
    "x-protocol-version": "1",
    "x-app-version": "1.2.0",
    ...extraHeaders,
  };
  if (token) headers.authorization = `Bearer ${token}`;
  const req = new Request(URL_REFERENCE, { headers });
  req.nextUrl = new URL(URL_REFERENCE);
  return req;
}

/** The eleven the platform ships, in the order the website returns them. */
const SEEDED_OFFER_TYPES = propertyOfferTypesSeed.map((row, index) => ({
  code: row.code,
  nameAr: row.nameAr,
  nameEn: row.nameEn,
  nameTr: row.nameTr ?? null,
  displayOrder: index,
  isActive: true,
  allowDirect: row.allowDirect,
  allowAuction: row.allowAuction,
}));

test.beforeEach(() => setOfferTypeReaderForTesting(async () => SEEDED_OFFER_TYPES));

test.afterEach(() => {
  setIntegrationDbForTesting(null);
  setOfferTypeReaderForTesting(null);
});

// ---- authentication -------------------------------------------------------

test("no bearer token is 401, not an open catalogue", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  const { GET } = await import("../app/api/office/v1/reference/route.ts");
  const response = await GET(request(null));
  assert.equal(response.status, 401);
});

test("a token that is not a paired device is 401", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  const { GET } = await import("../app/api/office/v1/reference/route.ts");
  const response = await GET(request("apd_not_a_real_token"));
  assert.equal(response.status, 401);
  assert.equal((await response.json()).reason, "INVALID");
});

test("the scope is one every already-paired device holds", async () => {
  // A new scope would have locked out every device paired before today, since
  // a device's scopes are frozen at pairing. `office.properties.read` is in
  // OFFICE_DEFAULT_SCOPES, so no re-pairing is needed for this endpoint.
  const { OFFICE_DEFAULT_SCOPES } = await import("../lib/integration/constants.ts");
  assert.ok(OFFICE_DEFAULT_SCOPES.includes("office.properties.read"));

  // And a freshly paired device really does get it: the route answers 200
  // rather than the 403 requireScope would return.
  setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair();
  const { GET } = await import("../app/api/office/v1/reference/route.ts");
  assert.equal((await GET(request(device.token))).status, 200);
});

// ---- the catalogue --------------------------------------------------------

test("the same eleven offer types the website offers, in the website's order", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair();

  const { GET } = await import("../app/api/office/v1/reference/route.ts");
  const response = await GET(request(device.token));
  assert.equal(response.status, 200);
  const body = await response.json();

  assert.equal(body.offerTypes.length, propertyOfferTypesSeed.length);
  assert.equal(propertyOfferTypesSeed.length, 11, "the platform offers eleven ways to market a property");
  assert.deepEqual(
    body.offerTypes.map((type) => type.code),
    propertyOfferTypesSeed.map((type) => type.code),
    "same order as the seed, which is the order /api/offer-types returns",
  );
  // The Arabic the desktop shows is the website's Arabic, not a translation
  // somebody typed into the desktop.
  assert.equal(body.offerTypes[0].nameAr, "بيع");
  assert.ok(body.offerTypes.some((type) => type.nameAr === "تقبيل"), "تقبيل reaches the desktop at all");
  assert.ok(body.offerTypes.some((type) => type.nameAr === "فروغ"));
});

test("categories and types come from the one taxonomy, legacy ones excluded", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair();

  const { GET } = await import("../app/api/office/v1/reference/route.ts");
  const body = await (await GET(request(device.token))).json();

  const offered = selectableCategories().map((category) => category.id).sort();
  assert.deepEqual(body.categories.map((category) => category.id).sort(), offered);
  assert.ok(
    body.categories.length < PROPERTY_CATEGORIES.length || PROPERTY_CATEGORIES.every((c) => !c.legacy),
    "a legacy category is a valid stored value but is never offered for a new listing",
  );

  // Every type names a category that is in the same payload, or the desktop's
  // dependent drop-down would have an option it cannot file under anything.
  const categoryIds = new Set(body.categories.map((category) => category.id));
  for (const type of body.propertyTypes) {
    assert.ok(categoryIds.has(type.categoryId), `${type.id} belongs to a category that was sent`);
  }
  assert.ok(body.propertyTypes.length > 0);
  assert.ok(body.propertyTypes.length <= PROPERTY_TYPES.length);

  // Trilingual throughout: the desktop renders in ar/en/tr from one payload.
  for (const row of [...body.categories, ...body.propertyTypes]) {
    assert.ok(row.labelAr && row.labelEn && row.labelTr, `${row.id} is trilingual`);
  }
});

test("listing statuses are the office's own, and say what the website makes of them", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair();

  const { GET } = await import("../app/api/office/v1/reference/route.ts");
  const body = await (await GET(request(device.token))).json();

  assert.deepEqual(body.listingStatuses.map((status) => status.id), [
    "active_market",
    "under_management",
    "completed",
  ]);
  // Only one of the three has a website counterpart. "Under management" is the
  // office's bookkeeping — a listing pending review is still under management,
  // and an office marking it so must not approve it.
  const byId = Object.fromEntries(body.listingStatuses.map((status) => [status.id, status]));
  assert.equal(byId.active_market.platformStatus, "approved");
  assert.equal(byId.under_management.platformStatus, null);
  assert.equal(byId.completed.platformStatus, null);
  assert.deepEqual([...OFFICE_LISTING_STATUS_IDS], OFFICE_LISTING_STATUSES.map((s) => s.id));
  assert.equal(isOfficeListingStatus("under_management"), true);
  assert.equal(isOfficeListingStatus("approved"), false, "a website status is not an office status");
});

test("currencies come from the market registry, ordered as the website orders them", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair();

  const { GET } = await import("../app/api/office/v1/reference/route.ts");
  const body = await (await GET(request(device.token))).json();

  assert.equal(body.currencies.length, CURRENCY_REGISTRY.length);
  const omr = body.currencies.find((currency) => currency.code === "OMR");
  assert.equal(omr.symbolAr, "ر.ع", "the platform default, as the website writes it");
  assert.equal(omr.symbolEn, "OMR", "an English UI never gets Arabic script it cannot lay out");
  const orders = body.currencies.map((currency) =>
    CURRENCY_REGISTRY.find((entry) => entry.code === currency.code).displayOrder);
  assert.deepEqual(orders, [...orders].sort((a, b) => a - b), "registry display order is preserved");
});

// ---- caching --------------------------------------------------------------

test("an unchanged catalogue answers 304 with no body", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair();

  const { GET } = await import("../app/api/office/v1/reference/route.ts");
  const first = await GET(request(device.token));
  assert.equal(first.status, 200);
  const etag = first.headers.get("etag");
  assert.match(etag, /^"[0-9a-f]{16}"$/, "a content fingerprint, not a timestamp");

  const second = await GET(request(device.token, { "if-none-match": etag }));
  assert.equal(second.status, 304);
  assert.equal(await second.text(), "", "304 carries no body — that is the point");
  assert.equal(second.headers.get("etag"), etag);

  // A client that strips the quotes, or marks the tag weak, still matches.
  const bare = await GET(request(device.token, { "if-none-match": etag.replace(/"/g, "") }));
  assert.equal(bare.status, 304);
  const weak = await GET(request(device.token, { "if-none-match": `W/${etag}` }));
  assert.equal(weak.status, 304);

  // A stale tag gets the whole catalogue, not a 304 with nothing to apply.
  const stale = await GET(request(device.token, { "if-none-match": '"0000000000000000"' }));
  assert.equal(stale.status, 200);
});

test("the version follows the content, so it moves only when something changed", () => {
  const payload = {
    offerTypes: [{ code: "SALE" }],
    categories: [],
    propertyTypes: [],
    listingStatuses: [],
    currencies: [],
  };
  const version = referenceVersion(payload);
  assert.equal(referenceVersion({ ...payload }), version, "same content, same version");
  assert.notEqual(
    referenceVersion({ ...payload, offerTypes: [{ code: "RENT" }] }),
    version,
    "changed content, changed version",
  );
});
