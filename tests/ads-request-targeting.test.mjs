import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { matchAds } from "../lib/ads/engine.ts";
import { buildContext } from "../lib/ads/context.ts";

/**
 * A paid ad request must be servable on the page it was bought for.
 *
 * It was not. POST /api/ads/request wrote the page-layout family key into two
 * engine dimensions that speak different vocabularies, and pinned the campaign
 * to one class of screen:
 *
 *   section_scopes = ["company-detail"]   the section gate compares against
 *                                         PLATFORM_SECTIONS ("companies")
 *   page_types     = ["company-detail"]   the page-type gate compares against
 *                                         PAGE_TYPES ("office-profile")
 *   devices        = ["desktop"]          every phone and tablet excluded
 *
 * So an advertiser paid for the left rail of a company page, an admin approved
 * it, the confirmation email said the ad was live, and all three gates rejected
 * it on every request. Only `family === "home"` survived, because there the
 * family key happens to equal both the section and the page type.
 *
 * These tests run the real engine over the shape the route writes, so they fail
 * if the route ever goes back to writing the family key.
 */

const REQUEST_ROUTE = new URL("../app/api/ads/request/route.ts", import.meta.url);

/** The page a visitor is on when they click the left rail of a company page. */
function companyDetailContext(deviceType) {
  return buildContext({
    path: "/companies/abc",
    placement: "web_company_detail_side_left_01",
    language: "ar",
    countryCode: "sa",
    deviceType,
    sessionId: "test-session",
  });
}

/**
 * One campaign as the intake route stores it. Only the three fields this bug is
 * about vary; everything else is neutral so a failure names the real cause.
 */
function requestedCampaign({ sectionScopes, pageTypes, devices }) {
  return {
    id: "requested-1",
    internalName: "معلن — web_company_detail_side_left_01",
    advertiserName: "معلن",
    campaignType: "request",
    status: "active",
    mediaType: "image",
    mediaUrl: "https://cdn.example.com/requested.jpg",
    mobileMediaUrl: null,
    tabletMediaUrl: null,
    posterUrl: null,
    channels: ["website"],
    eyebrow: { ar: "طلب إعلان", en: "Ad request", tr: "Reklam talebi" },
    title: { ar: "معلن", en: "معلن", tr: "معلن" },
    accent: { ar: "", en: "", tr: "" },
    description: { ar: "", en: "", tr: "" },
    cta: { ar: "اعرض إعلانك", en: "View ad", tr: "Reklamı görüntüle" },
    targetUrl: "https://example.com",
    countries: [],
    cities: [],
    languages: ["ar", "en", "tr"],
    devices,
    priority: 100,
    weight: 100,
    startAt: null,
    endAt: null,
    sectionScopes,
    pageTypes,
    placements: ["web_company_detail_side_left_01"],
    domains: [],
    regionIds: [],
    districtIds: [],
    latitude: null,
    longitude: null,
    radiusKm: null,
    targetAllCountries: true,
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
  };
}

const EMPTY_STATS = { daily: new Map(), userFrequency: new Map() };

const serve = (ad, deviceType) =>
  matchAds(null, companyDetailContext(deviceType), { count: 1, ads: [ad], stats: EMPTY_STATS });

test("the company page resolves to the section and page type the engine compares against", async () => {
  // The premise of the whole bug: neither of these is the family key.
  const ctx = companyDetailContext("desktop");
  assert.equal(ctx.section, "companies");
  assert.equal(ctx.pageType, "office-profile");
  assert.notEqual(ctx.section, "company-detail");
});

test("the shape the route used to write is rejected on every device", async () => {
  const old = requestedCampaign({
    sectionScopes: ["company-detail"],
    pageTypes: ["company-detail"],
    devices: ["desktop"],
  });
  for (const device of ["desktop", "tablet", "mobile"]) {
    assert.equal((await serve(old, device)).length, 0, `the old shape must not serve on ${device}`);
  }
});

test("the shape the route writes now serves the page it was bought for, on every device", async () => {
  const fixed = requestedCampaign({
    sectionScopes: ["companies"],
    pageTypes: [],
    devices: ["desktop", "tablet", "mobile"],
  });
  for (const device of ["desktop", "tablet", "mobile"]) {
    const results = await serve(fixed, device);
    assert.equal(results.length, 1, `an approved request must serve on ${device}`);
    assert.equal(results[0].campaignId, "requested-1");
    assert.equal(results[0].placement, "web_company_detail_side_left_01");
  }
});

test("each of the three fields was enough on its own to blank the slot", async () => {
  const base = { sectionScopes: ["companies"], pageTypes: [], devices: ["desktop", "tablet", "mobile"] };
  assert.equal((await serve(requestedCampaign({ ...base, sectionScopes: ["company-detail"] }), "desktop")).length, 0, "section");
  assert.equal((await serve(requestedCampaign({ ...base, pageTypes: ["company-detail"] }), "desktop")).length, 0, "page type");
  assert.equal((await serve(requestedCampaign({ ...base, devices: ["desktop"] }), "mobile")).length, 0, "device");
});

test("the intake route writes the section from the registry, not the family key", async () => {
  const route = await readFile(REQUEST_ROUTE, "utf8");
  assert.match(route, /STANDARD_PUBLIC_AD_FAMILY_DEFINITIONS\[family as keyof typeof STANDARD_PUBLIC_AD_FAMILY_DEFINITIONS\]\?\.section/);
  assert.match(route, /JSON\.stringify\(\[requestSection\]\)/);
  // page_types stays empty: the placement already pins the family, and the
  // family key is not a page type.
  assert.doesNotMatch(route, /JSON\.stringify\(\[family \|\| "home"\]\)/, "the family key must not be written into a targeting dimension");
  assert.match(route, /JSON\.stringify\(\["desktop", "tablet", "mobile"\]\)/);
  assert.doesNotMatch(route, /JSON\.stringify\(\["desktop"\]\)/, "a bought slot is not desktop-only");
});
