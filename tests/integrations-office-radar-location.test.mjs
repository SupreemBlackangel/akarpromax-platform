// Phase 4A — Office radar location matching.
//
// Distance comes from real coordinates, the radius actually applies, a country
// scan can never reach another country, and every accepted filter changes the
// result set.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createInMemoryDb } from "./helpers/in-memory-db.mjs";
import { setIntegrationDbForTesting } from "../lib/integration/db.ts";
import { startPairing, completePairing } from "../lib/integration/pairing.ts";
import { haversineKm, RADAR_MAX_RESULTS } from "../lib/integration/radar.ts";
import { RADAR_MAX_RADIUS_KM } from "../lib/integration/constants.ts";
import { GET as radarGet, POST as radarPost } from "../app/api/office/v1/radar/route.ts";

const SPONSOR = "office@akarpromax.com";
const RADAR_URL = "https://akarpromax.com/api/office/v1/radar";

// Muscat area
const MUSCAT = { latitude: 23.588, longitude: 58.3829 };
const RUWI = { latitude: 23.5900, longitude: 58.5450 };      // ~16 km from Muscat
const SEEB = { latitude: 23.6703, longitude: 58.1824 };      // ~22 km
const SALALAH = { latitude: 17.0151, longitude: 54.0924 };   // ~850 km
// Saudi
const JEDDAH = { latitude: 21.4858, longitude: 39.1925 };
const JEDDAH_NORTH = { latitude: 21.5600, longitude: 39.1700 };

function headers(token) {
  return { authorization: `Bearer ${token}`, "x-protocol-version": "1", "x-app-version": "1.2.0", "content-type": "application/json" };
}

function scanRequest(token, body) {
  return new Request(RADAR_URL, { method: "POST", headers: headers(token), body: JSON.stringify(body) });
}

async function scan(token, body) {
  const response = await radarPost(scanRequest(token, body));
  return { status: response.status, body: await response.json() };
}

async function pair(installationId = "inst-a") {
  const pairing = await startPairing({ sponsorId: SPONSOR, officeId: "main" });
  return completePairing({ code: pairing.code, installationId, deviceName: "Office PC", appVersion: "1.2.0", protocolVersion: 1 });
}

function property(id, point, overrides = {}) {
  return {
    id,
    title_ar: `عقار ${id}`,
    title_en: `Property ${id}`,
    status: "approved",
    country: "OM",
    governorate: "محافظة مسقط",
    city: "مسقط",
    district: "الخوير",
    latitude: point.latitude,
    longitude: point.longitude,
    price: 95000,
    currency: "OMR",
    deal_type: "sale",
    category: "residential",
    property_type: "apartment",
    bedrooms: 3,
    bathrooms: 2,
    // Private data that must never surface in a radar target.
    user_id: "11111111-1111-4111-8111-111111111111",
    address: "بيت المالك، شارع خاص",
    reference_number: "local-42",
    ...overrides,
  };
}

function provider(id, point, overrides = {}) {
  return {
    id,
    display_name_ar: `مزود ${id}`,
    display_name_en: `Provider ${id}`,
    status: "approved",
    country_code: "OM",
    city_id: "om-muscat",
    district_id: "om-khuwair",
    latitude: point.latitude,
    longitude: point.longitude,
    rating_avg: 4.8,
    rating_count: 12,
    phone: "+96890000000",
    whatsapp: "+96890000000",
    email: "provider@example.com",
    ...overrides,
  };
}

test.afterEach(() => setIntegrationDbForTesting(null));

// ---- authentication --------------------------------------------------------

test("a radar scan with no device token is rejected with 401", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  const response = await radarPost(new Request(RADAR_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ latitude: 23.5, longitude: 58.4, countryCode: "OM" }),
  }));
  assert.equal(response.status, 401);
});

test("a radar scan with an invalid device token is rejected with 401", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  const { status, body } = await scan("apd_not_a_real_token", { latitude: 23.5, longitude: 58.4, countryCode: "OM" });
  assert.equal(status, 401);
  assert.equal(body.reason, "INVALID");
});

test("a valid device is accepted and its scan is recorded against it", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair();
  const { status, body } = await scan(device.token, { ...MUSCAT, countryCode: "OM" });

  assert.equal(status, 200);
  assert.ok(body.queryId);
  const queries = db.dump("office_radar_queries");
  assert.equal(queries.length, 1);
  assert.equal(queries[0].device_id, device.deviceId);
  assert.equal(queries[0].sponsor_id, SPONSOR);
});

test("the history endpoint only shows this device's scans", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair();
  await scan(device.token, { ...MUSCAT, countryCode: "OM" });
  db.seed("office_radar_queries", [
    { id: "other", device_id: "someone-else", sponsor_id: "other@example.com", latitude: 1, longitude: 1, radius_km: 10, kind: "properties", matched_count: 0, created_at: "2026-01-01 00:00:00" },
  ]);

  const response = await radarGet(new Request(RADAR_URL, { headers: headers(device.token) }));
  const body = await response.json();

  assert.equal(body.queries.length, 1);
  assert.equal(body.queries[0].device_id, device.deviceId);
});

// ---- distance + radius -----------------------------------------------------

test("a property inside the radius is returned and one outside is excluded", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair();
  db.seed("properties", [property("near", RUWI), property("far", SALALAH)]);

  const { body } = await scan(device.token, { ...MUSCAT, radiusKm: 25, countryCode: "OM" });

  assert.deepEqual(body.targets.map((t) => t.id), ["near"]);
  assert.ok(body.targets[0].distanceKm <= 25);
});

test("the reported distance matches a Haversine calculation", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair();
  db.seed("properties", [property("ruwi", RUWI)]);

  const { body } = await scan(device.token, { ...MUSCAT, radiusKm: 50, countryCode: "OM" });
  const expected = haversineKm(MUSCAT, RUWI);

  assert.ok(Math.abs(body.targets[0].distanceKm - expected) < 1e-9);
  assert.ok(expected > 10 && expected < 25, `sanity: ${expected}`);
});

test("results are sorted nearest first", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair();
  db.seed("properties", [property("seeb", SEEB), property("ruwi", RUWI), property("here", MUSCAT)]);

  const { body } = await scan(device.token, { ...MUSCAT, radiusKm: 40, countryCode: "OM" });

  assert.deepEqual(body.targets.map((t) => t.id), ["here", "ruwi", "seeb"]);
  const distances = body.targets.map((t) => t.distanceKm);
  assert.deepEqual(distances, [...distances].sort((a, b) => a - b));
});

test("the default radius is 10 km when none is supplied", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair();
  db.seed("properties", [property("here", MUSCAT), property("ruwi", RUWI)]);

  const { body } = await scan(device.token, { ...MUSCAT, countryCode: "OM" });

  assert.equal(body.radiusKm, 10);
  assert.deepEqual(body.targets.map((t) => t.id), ["here"]);
});

test("the maximum radius is enforced", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair();
  db.seed("properties", [property("here", MUSCAT)]);

  const { body } = await scan(device.token, { ...MUSCAT, radiusKm: 100000, countryCode: "OM" });

  assert.equal(body.radiusKm, RADAR_MAX_RADIUS_KM);
});

test("an invalid radius is rejected instead of matching everything", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair();
  db.seed("properties", [property("salalah", SALALAH)]);

  // NaN cannot cross JSON, so the realistic bad inputs are these.
  for (const radiusKm of ["abc", 0, -5, "Infinity", {}, []]) {
    const { status, body } = await scan(device.token, { ...MUSCAT, radiusKm, countryCode: "OM" });
    assert.equal(status, 400, JSON.stringify(radiusKm));
    assert.equal(body.error, "INVALID_RADIUS", JSON.stringify(radiusKm));
  }

  // And an absent radius falls back to the product default, never to "match all".
  const absent = await scan(device.token, { ...MUSCAT, countryCode: "OM" });
  assert.equal(absent.body.radiusKm, 10);
  assert.equal(absent.body.targets.length, 0, "Salalah is 800+ km away");
});

test("a scan without coordinates is refused with LOCATION_REQUIRED", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair();

  for (const payload of [
    { countryCode: "OM" },
    { latitude: 23.5, countryCode: "OM" },
    { latitude: null, longitude: null, countryCode: "OM" },
    { latitude: "here", longitude: "there", countryCode: "OM" },
    { latitude: 120, longitude: 58, countryCode: "OM" },
  ]) {
    const { status, body } = await scan(device.token, payload);
    assert.equal(status, 400, JSON.stringify(payload));
    assert.equal(body.error, "LOCATION_REQUIRED", JSON.stringify(payload));
  }
});

// ---- country isolation -----------------------------------------------------

test("a Saudi scan can never return an Omani property", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair();
  db.seed("properties", [
    property("jeddah", JEDDAH, { country: "SA", city: "جدة", governorate: "مكة المكرمة" }),
    property("muscat", MUSCAT, { country: "OM" }),
  ]);

  const { body } = await scan(device.token, { ...JEDDAH, radiusKm: RADAR_MAX_RADIUS_KM, countryCode: "SA" });

  assert.deepEqual(body.targets.map((t) => t.id), ["jeddah"]);
  assert.ok(body.targets.every((t) => t.countryCode === "SA"));
});

test("an Omani scan can never return a Saudi property", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair();
  db.seed("properties", [
    property("muscat", MUSCAT, { country: "OM" }),
    property("jeddah", JEDDAH, { country: "SA" }),
  ]);

  const { body } = await scan(device.token, { ...MUSCAT, radiusKm: RADAR_MAX_RADIUS_KM, countryCode: "OM" });

  assert.deepEqual(body.targets.map((t) => t.id), ["muscat"]);
});

test("a foreign property sitting inside the requested radius is still excluded", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair();
  // Same coordinates, different country label — only the country decides.
  db.seed("properties", [
    property("sa-here", MUSCAT, { country: "SA" }),
    property("ae-here", MUSCAT, { country: "AE" }),
    property("om-here", MUSCAT, { country: "OM" }),
  ]);

  const { body } = await scan(device.token, { ...MUSCAT, radiusKm: 5, countryCode: "OM" });

  assert.deepEqual(body.targets.map((t) => t.id), ["om-here"]);
});

test("a scan with no country is refused rather than widened to every country", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair();
  db.seed("properties", [property("muscat", MUSCAT)]);

  const { status, body } = await scan(device.token, { ...MUSCAT, radiusKm: 20 });

  assert.equal(status, 400);
  assert.equal(body.error, "COUNTRY_REQUIRED");
});

test("global scope is honoured only when explicitly requested", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair();
  db.seed("properties", [property("om", MUSCAT, { country: "OM" }), property("sa", MUSCAT, { country: "SA" })]);

  const { body } = await scan(device.token, { ...MUSCAT, radiusKm: 5, scope: "global" });

  assert.equal(body.scope, "global");
  assert.equal(body.countryCode, null);
  assert.equal(body.targets.length, 2);
});

// ---- filters ---------------------------------------------------------------

test("the city filter actually narrows the result set", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair();
  db.seed("properties", [
    property("muscat-city", MUSCAT, { city: "مسقط" }),
    property("seeb-city", SEEB, { city: "السيب" }),
  ]);

  const all = await scan(device.token, { ...MUSCAT, radiusKm: 40, countryCode: "OM" });
  const filtered = await scan(device.token, { ...MUSCAT, radiusKm: 40, countryCode: "OM", filters: { city: "السيب" } });

  assert.equal(all.body.targets.length, 2);
  assert.deepEqual(filtered.body.targets.map((t) => t.id), ["seeb-city"]);
});

test("the district filter actually narrows the result set", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair();
  db.seed("properties", [
    property("khuwair", MUSCAT, { district: "الخوير" }),
    property("azaiba", RUWI, { district: "العذيبة" }),
  ]);

  const filtered = await scan(device.token, { ...MUSCAT, radiusKm: 40, countryCode: "OM", filters: { district: "العذيبة" } });

  assert.deepEqual(filtered.body.targets.map((t) => t.id), ["azaiba"]);
});

test("price, deal type, property type and room filters all apply", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair();
  db.seed("properties", [
    property("cheap-sale-apartment", MUSCAT, { price: 50000, deal_type: "sale", property_type: "apartment", bedrooms: 2 }),
    property("rich-sale-villa", RUWI, { price: 400000, deal_type: "sale", property_type: "villa", bedrooms: 6 }),
    property("rent-apartment", SEEB, { price: 500, deal_type: "rent", property_type: "apartment", bedrooms: 3 }),
  ]);
  const base = { ...MUSCAT, radiusKm: 40, countryCode: "OM" };

  const byPrice = await scan(device.token, { ...base, filters: { minPrice: 100000 } });
  assert.deepEqual(byPrice.body.targets.map((t) => t.id), ["rich-sale-villa"]);

  const byMaxPrice = await scan(device.token, { ...base, filters: { maxPrice: 1000 } });
  assert.deepEqual(byMaxPrice.body.targets.map((t) => t.id), ["rent-apartment"]);

  const byDeal = await scan(device.token, { ...base, filters: { dealType: "rent" } });
  assert.deepEqual(byDeal.body.targets.map((t) => t.id), ["rent-apartment"]);

  const byType = await scan(device.token, { ...base, filters: { propertyType: "villa" } });
  assert.deepEqual(byType.body.targets.map((t) => t.id), ["rich-sale-villa"]);

  const byBedrooms = await scan(device.token, { ...base, filters: { bedrooms: 5 } });
  assert.deepEqual(byBedrooms.body.targets.map((t) => t.id), ["rich-sale-villa"]);

  const byCategory = await scan(device.token, { ...base, filters: { category: "residential" } });
  assert.equal(byCategory.body.targets.length, 3);
});

test("an unsupported filter is rejected, never silently ignored", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair();
  db.seed("properties", [property("muscat", MUSCAT)]);

  for (const filters of [{ ownerName: "محمد" }, { hasPool: true }, { sortBy: "price" }, { profession: "plumber" }]) {
    const { status, body } = await scan(device.token, { ...MUSCAT, radiusKm: 20, countryCode: "OM", filters });
    assert.equal(status, 400, JSON.stringify(filters));
    assert.equal(body.error, "UNSUPPORTED_FILTER", JSON.stringify(filters));
  }
});

// ---- moderation / eligibility ----------------------------------------------

test("only approved properties are visible to radar", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair();
  db.seed("properties", [
    property("approved", MUSCAT, { status: "approved" }),
    property("pending", MUSCAT, { status: "pending_review" }),
    property("archived", MUSCAT, { status: "archived" }),
    property("rejected", MUSCAT, { status: "rejected" }),
    property("draft", MUSCAT, { status: "draft" }),
    property("sold", MUSCAT, { status: "sold" }),
  ]);

  const { body } = await scan(device.token, { ...MUSCAT, radiusKm: 5, countryCode: "OM" });

  assert.deepEqual(body.targets.map((t) => t.id), ["approved"]);
});

test("radar reads the canonical property catalogue, not the legacy table", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair();
  db.seed("property_listings", [
    { id: "legacy", title_ar: "قديم", country_code: "om", latitude: MUSCAT.latitude, longitude: MUSCAT.longitude, status: "active", priority: 1 },
  ]);
  db.seed("properties", [property("canonical", MUSCAT)]);

  const { body } = await scan(device.token, { ...MUSCAT, radiusKm: 5, countryCode: "OM" });

  assert.deepEqual(body.targets.map((t) => t.id), ["canonical"]);
});

// ---- kinds -----------------------------------------------------------------

test("kind=services returns providers and no properties", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair();
  db.seed("properties", [property("a-property", MUSCAT)]);
  db.seed("service_provider_profiles", [provider("a-provider", RUWI)]);

  const { body } = await scan(device.token, { ...MUSCAT, radiusKm: 30, countryCode: "OM", kind: "services" });

  assert.deepEqual(body.targets.map((t) => t.id), ["a-provider"]);
  assert.ok(body.targets.every((t) => t.kind === "service"));
});

test("kind=both returns both types nearest first", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair();
  db.seed("properties", [property("a-property", SEEB)]);
  db.seed("service_provider_profiles", [provider("a-provider", RUWI)]);

  const { body } = await scan(device.token, { ...MUSCAT, radiusKm: 40, countryCode: "OM", kind: "both" });

  assert.deepEqual(body.targets.map((t) => t.id), ["a-provider", "a-property"]);
  assert.deepEqual(body.targets.map((t) => t.kind), ["service", "property"]);
});

test("only approved providers are visible and country isolation applies to them too", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair();
  db.seed("service_provider_profiles", [
    provider("ok", MUSCAT, { status: "approved", country_code: "OM" }),
    provider("draft", MUSCAT, { status: "draft", country_code: "OM" }),
    provider("suspended", MUSCAT, { status: "suspended", country_code: "OM" }),
    provider("foreign", MUSCAT, { status: "approved", country_code: "SA" }),
  ]);

  const { body } = await scan(device.token, { ...MUSCAT, radiusKm: 5, countryCode: "OM", kind: "services" });

  assert.deepEqual(body.targets.map((t) => t.id), ["ok"]);
});

test("the service category filter applies", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair();
  db.seed("service_provider_profiles", [provider("plumber", MUSCAT), provider("painter", RUWI)]);
  db.seed("service_provider_categories", [
    { id: "l1", provider_id: "plumber", category_id: "cat-plumbing" },
    { id: "l2", provider_id: "painter", category_id: "cat-painting" },
  ]);

  const { body } = await scan(device.token, { ...MUSCAT, radiusKm: 40, countryCode: "OM", kind: "services", filters: { category: "cat-painting" } });

  assert.deepEqual(body.targets.map((t) => t.id), ["painter"]);
});

// ---- privacy + shape -------------------------------------------------------

test("a radar target carries no owner, client or contact data", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair();
  db.seed("properties", [property("p1", MUSCAT)]);
  db.seed("service_provider_profiles", [provider("s1", MUSCAT)]);

  const { body } = await scan(device.token, { ...MUSCAT, radiusKm: 5, countryCode: "OM", kind: "both" });
  const raw = JSON.stringify(body);

  assert.doesNotMatch(raw, /11111111-1111/);
  assert.doesNotMatch(raw, /بيت المالك/);
  assert.doesNotMatch(raw, /\+96890000000/);
  assert.doesNotMatch(raw, /provider@example\.com/);
  assert.doesNotMatch(raw, /user_id/i);
  assert.doesNotMatch(raw, /address/i);
  assert.doesNotMatch(raw, /phone|whatsapp|email/i);
});

test("a radar target carries the documented lightweight shape", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair();
  db.seed("properties", [property("p1", RUWI)]);

  const { body } = await scan(device.token, { ...MUSCAT, radiusKm: 30, countryCode: "OM" });
  const target = body.targets[0];

  assert.equal(target.id, "p1");
  assert.equal(target.kind, "property");
  assert.equal(target.title, "عقار p1");
  assert.equal(target.countryCode, "OM");
  assert.equal(target.cityId, "مسقط");
  assert.equal(target.district, "الخوير");
  assert.equal(target.latitude, RUWI.latitude);
  assert.equal(target.longitude, RUWI.longitude);
  assert.ok(target.distanceKm > 0);
  assert.equal(target.url, "/properties/p1");
  assert.equal(target.extra.price, 95000);
  assert.equal(target.extra.dealType, "sale");
});

// ---- bounds ----------------------------------------------------------------

test("the result count is bounded", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const device = await pair();
  const many = [];
  for (let i = 0; i < RADAR_MAX_RESULTS + 25; i += 1) {
    many.push(property(`p${i}`, { latitude: MUSCAT.latitude + i * 0.0001, longitude: MUSCAT.longitude }));
  }
  db.seed("properties", many);

  const { body } = await scan(device.token, { ...MUSCAT, radiusKm: 20, countryCode: "OM" });

  assert.equal(body.targets.length, RADAR_MAX_RESULTS);
  assert.equal(body.maxResults, RADAR_MAX_RESULTS);
});

test("the scan is bounded in SQL before distance is computed", async () => {
  const source = await readFile(new URL("../lib/integration/radar.ts", import.meta.url), "utf8");
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*(\/\/|\*).*$/gm, "");

  assert.match(code, /status = \?1/);
  assert.match(code, /latitude >= \?/);
  assert.match(code, /longitude <= \?/);
  assert.match(code, /LIMIT \?/);
  assert.match(code, /RADAR_SCAN_LIMIT/);
  assert.doesNotMatch(code, /FROM property_listings/);
  assert.doesNotMatch(code, /localhost/);
  assert.doesNotMatch(code, /api\/desktop/);
});
