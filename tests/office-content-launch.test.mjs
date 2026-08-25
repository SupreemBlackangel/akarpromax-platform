// Phase 4B — Office News / Ads / Notifications launch wiring.
// Focused: only the three office content routes and their libs.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createInMemoryDb } from "./helpers/in-memory-db.mjs";
import { setIntegrationDbForTesting } from "../lib/integration/db.ts";
import {
  dispatchOfficeNotification,
  listOfficeDeviceNotifications,
  markOfficeNotificationRead,
} from "../lib/integration/notifications.ts";
import { OFFICE_AD_PLACEMENTS } from "../lib/integration/constants.ts";
import { matchAds } from "../lib/ads/engine.ts";
import { matchesGeoScope } from "../lib/news/eligibility.ts";

const SPONSOR = "office@akarpromax.com";
const OTHER_SPONSOR = "rival@example.com";
const DEVICE = "dev-launch-1";

const strip = (source) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*(\/\/|\*).*$/gm, "");

async function src(path) {
  return strip(await readFile(new URL(path, import.meta.url), "utf8"));
}

async function seedDelivery(overrides = {}) {
  return dispatchOfficeNotification({
    sponsorId: overrides.sponsorId ?? SPONSOR,
    recipient: {
      recipientKey: overrides.recipientKey ?? "office-muscat",
      officeId: "muscat-main",
      deviceId: overrides.deviceId,
      channels: ["in_app"],
    },
    eventType: overrides.eventType ?? "OFFICE_NEW_NEWS",
    eventId: overrides.eventId ?? "evt-1",
    title: overrides.title ?? "خبر جديد",
    body: overrides.body ?? "…",
  });
}

// ---- notifications: what the desktop bell can see ------------------------

test("a device sees its own sponsor's notifications", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  await seedDelivery({ eventId: "evt-mine", deviceId: DEVICE });

  const rows = await listOfficeDeviceNotifications(SPONSOR, DEVICE);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].title, "خبر جديد");

  setIntegrationDbForTesting(null);
});

test("office-wide notifications with no device id still reach the desktop", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  await seedDelivery({ eventId: "evt-office-wide", deviceId: undefined });

  const rows = await listOfficeDeviceNotifications(SPONSOR, DEVICE);
  assert.equal(rows.length, 1, "a null device_id row is office-wide, not invisible");

  setIntegrationDbForTesting(null);
});

test("a device never sees another sponsor's notifications", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  await seedDelivery({ sponsorId: OTHER_SPONSOR, eventId: "evt-theirs", recipientKey: "rival", deviceId: DEVICE });

  const rows = await listOfficeDeviceNotifications(SPONSOR, DEVICE);
  assert.equal(rows.length, 0);

  setIntegrationDbForTesting(null);
});

test("an empty sponsor scope returns nothing rather than everything", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  await seedDelivery({ eventId: "evt-scope", deviceId: DEVICE });

  assert.deepEqual(await listOfficeDeviceNotifications("", DEVICE), []);

  setIntegrationDbForTesting(null);
});

test("the default listing is unread/current only", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  await seedDelivery({ eventId: "evt-unread", deviceId: DEVICE });
  const [row] = db.dump("office_notification_deliveries");

  assert.equal((await listOfficeDeviceNotifications(SPONSOR, DEVICE)).length, 1);

  await markOfficeNotificationRead(row.id, SPONSOR);
  assert.equal((await listOfficeDeviceNotifications(SPONSOR, DEVICE)).length, 0, "read rows drop out");

  setIntegrationDbForTesting(null);
});

test("mark read sets delivered and stamps delivered_at", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  await seedDelivery({ eventId: "evt-mark", deviceId: DEVICE });
  const [row] = db.dump("office_notification_deliveries");

  assert.equal(await markOfficeNotificationRead(row.id, SPONSOR), true);

  const [after] = db.dump("office_notification_deliveries");
  assert.equal(after.status, "delivered");
  assert.ok(after.delivered_at, "delivered_at is stamped");

  setIntegrationDbForTesting(null);
});

test("mark read refuses a delivery owned by another sponsor", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  await seedDelivery({ sponsorId: OTHER_SPONSOR, eventId: "evt-cross", recipientKey: "rival", deviceId: DEVICE });
  const [row] = db.dump("office_notification_deliveries");

  assert.equal(await markOfficeNotificationRead(row.id, SPONSOR), false);

  const [after] = db.dump("office_notification_deliveries");
  assert.notEqual(after.status, "delivered", "another sponsor's row is untouched");

  setIntegrationDbForTesting(null);
});

test("mark read refuses an unknown or blank delivery id", async () => {
  setIntegrationDbForTesting(createInMemoryDb());

  assert.equal(await markOfficeNotificationRead("", SPONSOR), false);
  assert.equal(await markOfficeNotificationRead("no-such-id", SPONSOR), false);
  assert.equal(await markOfficeNotificationRead("id", ""), false);

  setIntegrationDbForTesting(null);
});

// ---- notifications route contract ----------------------------------------

test("the notifications route is authenticated, scoped and exposes mark read", async () => {
  const route = await src("../app/api/office/v1/notifications/route.ts");

  assert.match(route, /authenticateOfficeRequest/);
  assert.match(route, /requireScope\(auth\.device, "office\.notifications\.read"\)/);
  assert.match(route, /listOfficeDeviceNotifications\(\s*auth\.device\.sponsorId/);
  assert.match(route, /markOfficeNotificationRead\(deliveryId, auth\.device\.sponsorId\)/);
  assert.match(route, /export async function POST/);
  assert.ok(!/localhost/i.test(route));
  assert.ok(!/\/api\/desktop/i.test(route));
});

test("the notifications payload carries no sponsor or routing internals", async () => {
  const route = await src("../app/api/office/v1/notifications/route.ts");
  const shape = route.slice(route.indexOf("function toDelivery"), route.indexOf("export async function GET"));

  for (const forbidden of ["sponsor_id", "recipient_key", "dedup_key", "device_id", "office_id"]) {
    assert.ok(!shape.includes(forbidden), `${forbidden} must not be returned to a device`);
  }
  assert.ok(shape.includes("title") && shape.includes("body") && shape.includes("status"));
});

// ---- news route contract --------------------------------------------------

test("the news route is authenticated and country scoped", async () => {
  const route = await src("../app/api/office/v1/news/route.ts");

  assert.match(route, /authenticateOfficeRequest/);
  assert.match(route, /requireScope\(auth\.device, "office\.news\.read"\)/);
  assert.match(route, /searchParams\.get\("country"\)/);
  assert.match(route, /OFFICE_TICKER/);
  assert.ok(!/localhost/i.test(route));
  assert.ok(!/\/api\/desktop/i.test(route));
});

test("news delivery serves active, in-window items only", async () => {
  const delivery = await src("../lib/news/delivery.ts");

  assert.match(delivery, /WHERE status = 'active'/);
  assert.match(delivery, /start_at IS NULL OR date\(start_at\) <= date\('now'\)/);
  assert.match(delivery, /end_at IS NULL OR date\(end_at\) >= date\('now'\)/);
});

// ---- ads route contract ---------------------------------------------------

test("the ads route is authenticated and uses the canonical ad engine", async () => {
  const route = await src("../app/api/office/v1/ads/route.ts");

  assert.match(route, /authenticateOfficeRequest/);
  assert.match(route, /requireScope\(auth\.device, "office\.ads\.read"\)/);
  assert.match(route, /matchAds\(db, ctx/);
  assert.match(route, /channel: "office"/);
  assert.ok(!/localhost/i.test(route));
  assert.ok(!/\/api\/desktop/i.test(route));
});

test("the ads route refuses a placement outside the office set", async () => {
  const route = await src("../app/api/office/v1/ads/route.ts");

  assert.match(route, /OFFICE_AD_PLACEMENTS as readonly string\[\]\)\.includes\(placement\)/);
  assert.match(route, /Unsupported placement/);
  assert.ok(OFFICE_AD_PLACEMENTS.includes("office_dashboard_hero"));
  assert.ok(!OFFICE_AD_PLACEMENTS.includes("desktop_portal_bottom_banner"));
});

test("the ads route targets by the requested country, region and city", async () => {
  const route = await src("../app/api/office/v1/ads/route.ts");

  assert.match(route, /searchParams\.get\("country"\)/);
  assert.match(route, /searchParams\.get\("region"\)/);
  assert.match(route, /searchParams\.get\("city"\)/);
  assert.match(route, /buildContext\(\{[\s\S]*countryCode: countryCode \|\| undefined,[\s\S]*regionId,[\s\S]*cityId,/);
});

test("the office ad event route rejects a campaign not enabled for the office channel", async () => {
  const route = await src("../app/api/office/v1/ads/route.ts");

  assert.match(route, /channels\.includes\("office"\)/);
  assert.match(route, /not eligible for the office channel/);
  assert.match(route, /status: 403/);
});

// ---- PHASE 4B FINAL GEO: no country default anywhere ---------------------

const EMPTY_STATS = { daily: new Map(), userFrequency: new Map() };

function officeCtx(countryCode) {
  return {
    section: "office",
    pageType: "office",
    placement: "office_dashboard_hero",
    channel: "office",
    countryCode,
    language: "ar",
    deviceType: "desktop",
    sessionId: "dev-launch-1",
    path: "/office",
  };
}

let adSeq = 0;
function makeAd(overrides) {
  adSeq += 1;
  const id = overrides.id ?? `cmp-${adSeq}`;
  return {
    id,
    internalName: `campaign-${id}`,
    advertiserName: "Test Advertiser",
    campaignType: "platform",
    status: "active",
    mediaType: "image",
    mediaUrl: `https://cdn.example.com/${id}.jpg`,
    mobileMediaUrl: null,
    tabletMediaUrl: null,
    posterUrl: null,
    channels: ["office"],
    eyebrow: { ar: "", en: "", tr: "" },
    title: { ar: "عنوان", en: "Title", tr: "Baslik" },
    accent: { ar: "", en: "", tr: "" },
    description: { ar: "", en: "", tr: "" },
    cta: { ar: "", en: "", tr: "" },
    targetUrl: "/",
    countries: [],
    cities: [],
    languages: ["ar", "en", "tr"],
    devices: ["desktop", "tablet", "mobile"],
    priority: 100,
    weight: 100,
    startAt: null,
    endAt: null,
    sectionScopes: [],
    pageTypes: [],
    placements: [],
    domains: [],
    regionIds: [],
    districtIds: [],
    latitude: null,
    longitude: null,
    radiusKm: null,
    targetAllCountries: false,
    targetAllRegions: true,
    targetAllCities: true,
    targetAllDistricts: true,
    entityType: null,
    entityIds: [],
    categoryIds: [],
    propertyTypes: [],
    serviceCategories: [],
    officeTypes: [],
    toolCategories: [],
    operatingSystems: [],
    dailyStartTime: null,
    dailyEndTime: null,
    daysOfWeek: [],
    rotationGroup: null,
    pricingModel: "fixed",
    price: 0,
    budget: 0,
    dailyBudget: 0,
    spentAmount: 0,
    maxImpressions: 0,
    maxClicks: 0,
    frequencyCapPerUser: 0,
    frequencyCapPeriod: "day",
    approvalStatus: "approved",
    isActive: true,
    isFeatured: false,
    isGlobal: false,
    totalImpressions: 0,
    totalClicks: 0,
    totalConversions: 0,
    creatives: [],
    ...overrides,
  };
}

const omTargeted = () => makeAd({ id: "om-targeted", countries: ["om"] });
const saTargeted = () => makeAd({ id: "sa-targeted", countries: ["sa"] });
const trTargeted = () => makeAd({ id: "tr-targeted", countries: ["tr"] });
const untargeted = () => makeAd({ id: "global-untargeted", countries: [] });
const targetAll = () => makeAd({ id: "global-all-countries", countries: ["om", "sa"], targetAllCountries: true });

async function matchedIds(ctxCountry, ads) {
  const results = await matchAds(null, officeCtx(ctxCountry), { count: 10, ads, stats: EMPTY_STATS });
  return results.map((r) => r.campaignId);
}

test("no country context cannot receive an OM-targeted ad", async () => {
  for (const country of [undefined, ""]) {
    assert.deepEqual(await matchedIds(country, [omTargeted()]), [], `country=${JSON.stringify(country)}`);
  }
});

test("no country context cannot receive an SA-targeted ad", async () => {
  for (const country of [undefined, ""]) {
    assert.deepEqual(await matchedIds(country, [saTargeted()]), [], `country=${JSON.stringify(country)}`);
  }
});

test("no country context cannot receive a TR-targeted ad", async () => {
  assert.deepEqual(await matchedIds(undefined, [trTargeted()]), []);
});

test("an explicitly global office ad matches with no country context", async () => {
  assert.deepEqual(await matchedIds(undefined, [untargeted()]), ["global-untargeted"]);
  assert.deepEqual(await matchedIds(undefined, [targetAll()]), ["global-all-countries"]);
});

test("no country context picks the global ad out of a mixed pool and nothing else", async () => {
  const ids = await matchedIds(undefined, [omTargeted(), saTargeted(), trTargeted(), untargeted()]);
  assert.deepEqual(ids, ["global-untargeted"]);
});

test("an OM office cannot receive an SA-targeted ad", async () => {
  assert.deepEqual(await matchedIds("om", [saTargeted()]), []);
  assert.deepEqual(await matchedIds("om", [omTargeted()]), ["om-targeted"]);
});

test("an SA office cannot receive an OM-targeted ad", async () => {
  assert.deepEqual(await matchedIds("sa", [omTargeted()]), []);
  assert.deepEqual(await matchedIds("sa", [saTargeted()]), ["sa-targeted"]);
});

test("news with no country context returns global news only", () => {
  const ctx = { countryCode: "", cityId: null, language: "ar", pagePath: "/office", channel: "OFFICE_TICKER" };
  const global = { countryCode: null, cityId: null };
  const oman = { countryCode: "om", cityId: null };
  const saudi = { countryCode: "sa", cityId: null };

  assert.equal(matchesGeoScope(global, ctx), true, "global news is served");
  assert.equal(matchesGeoScope(oman, ctx), false, "Oman news must not leak into a no-country context");
  assert.equal(matchesGeoScope(saudi, ctx), false, "Saudi news must not leak either");
});

test("news with an explicit country returns that country plus global, and nothing else", () => {
  const saCtx = { countryCode: "sa", cityId: null, language: "ar", pagePath: "/office", channel: "OFFICE_TICKER" };

  assert.equal(matchesGeoScope({ countryCode: null, cityId: null }, saCtx), true);
  assert.equal(matchesGeoScope({ countryCode: "sa", cityId: null }, saCtx), true);
  assert.equal(matchesGeoScope({ countryCode: "om", cityId: null }, saCtx), false);
});

test("neither office content route defaults the country to om", async () => {
  for (const path of ["../app/api/office/v1/news/route.ts", "../app/api/office/v1/ads/route.ts"]) {
    const route = await src(path);
    assert.ok(!/\?\?\s*"om"/.test(route), `${path} must not default the country`);
    assert.ok(!/\?\?\s*"sa"/.test(route), `${path} must not default the country`);
    assert.match(route, /searchParams\.get\("country"\) \?\? ""/);
  }
});

test("the routes withhold region and city without a country context", async () => {
  const ads = await src("../app/api/office/v1/ads/route.ts");
  const news = await src("../app/api/office/v1/news/route.ts");

  assert.match(ads, /const regionId = countryCode \? \(url\.searchParams\.get\("region"\) \?\? undefined\) : undefined/);
  assert.match(ads, /const cityId = countryCode \? \(url\.searchParams\.get\("city"\) \?\? undefined\) : undefined/);
  assert.match(news, /const cityId = countryCode \? \(url\.searchParams\.get\("city"\) \?\? undefined\) : undefined/);
});

test("an empty country reaches the ad context as undefined, not as a country", async () => {
  const ads = await src("../app/api/office/v1/ads/route.ts");
  assert.match(ads, /countryCode: countryCode \|\| undefined/);
});
