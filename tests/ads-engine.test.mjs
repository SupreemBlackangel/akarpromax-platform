import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { matchAds, scoreAd, selectCreative, computeInventoryHealth } from "../lib/ads/engine.ts";
import { buildContext } from "../lib/ads/context.ts";

const EMPTY_STATS = { daily: new Map(), userFrequency: new Map() };
const FALLBACK_CTX = {
  section: "home",
  pageType: "home",
  placement: "side_right",
  channel: "website",
  countryCode: "om",
  language: "ar",
  deviceType: "desktop",
  sessionId: "test-session",
  path: "/",
};

let creativeSeq = 0;
function makeCreative(position) {
  creativeSeq += 1;
  return {
    id: `cr-${creativeSeq}`,
    mediaType: "image",
    mediaUrl: `https://cdn.example.com/creative-${creativeSeq}.jpg`,
    mobileMediaUrl: null,
    tabletMediaUrl: null,
    posterUrl: null,
    position,
    durationSeconds: 6,
  };
}

function makeAd(overrides) {
  return {
    internalName: `campaign-${overrides.id}`,
    advertiserName: "Test Advertiser",
    campaignType: "platform",
    status: "active",
    mediaType: "image",
    mediaUrl: `https://cdn.example.com/${overrides.id}.jpg`,
    mobileMediaUrl: null,
    tabletMediaUrl: null,
    posterUrl: null,
    channels: ["website"],
    eyebrow: { ar: "", en: "", tr: "" },
    title: { ar: "عنوان", en: "Title", tr: "Başlık" },
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

function commercialAds(count, prefix = "com") {
  return Array.from({ length: count }, (_, index) => makeAd({ id: `${prefix}-${index + 1}` }));
}

test("CASE 1: 3 eligible campaigns -> 3 results (all treated equally)", async () => {
  const ads = commercialAds(3);
  const results = await matchAds(null, FALLBACK_CTX, { count: 3, ads, stats: EMPTY_STATS });
  assert.equal(results.length, 3);
  assert.ok(results.every((result) => result.campaignId), "all results have campaign IDs");
});

test("CASE 2: 2 eligible campaigns -> count met, no special fill", async () => {
  const ads = commercialAds(2);
  const results = await matchAds(null, FALLBACK_CTX, { count: 2, ads, stats: EMPTY_STATS });
  assert.equal(results.length, 2);
});

test("CASE 3: 1 eligible campaign -> only 1 returned", async () => {
  const ads = commercialAds(1);
  const results = await matchAds(null, FALLBACK_CTX, { count: 3, ads, stats: EMPTY_STATS });
  assert.equal(results.length, 1);
});

test("CASE 4: 0 eligible campaigns -> empty results", async () => {
  const ads = commercialAds(0);
  const results = await matchAds(null, FALLBACK_CTX, { count: 3, ads, stats: EMPTY_STATS });
  assert.equal(results.length, 0);
});

test("CASE 5: 4+ campaigns but only 2 eligible after geo targeting", async () => {
  const ctx = { ...FALLBACK_CTX, countryCode: "om" };
  const ads = [
    ...commercialAds(2),
    ...Array.from({ length: 3 }, (_, index) => makeAd({ id: `other-country-${index + 1}`, countries: ["sa"] })),
  ];
  const results = await matchAds(null, ctx, { count: 3, ads, stats: EMPTY_STATS });
  assert.equal(results.length, 2, "only 2 eligible after geo filter");
});

test("CASE 6: 5-creative campaign receives same campaign frequency as 1-creative campaign", async () => {
  const fiveCreative = makeAd({ id: "five", creatives: Array.from({ length: 5 }, (_, index) => makeCreative(index + 1)) });
  const oneCreative = makeAd({ id: "one", creatives: [makeCreative(1)] });
  const ads = [fiveCreative, oneCreative];

  const counts = { five: 0, one: 0 };
  for (let round = 0; round < 6; round += 1) {
    const results = await matchAds(null, FALLBACK_CTX, { count: 2, ads, stats: EMPTY_STATS });
    assert.equal(results.length, 2);
    for (const result of results) counts[result.campaignId] += 1;
  }
  assert.equal(counts.five, 6, "5-creative campaign served once per round");
  assert.equal(counts.one, 6, "1-creative campaign served once per round");
});

test("CASE 7: repeated campaign turn -> next creative selected (round-robin)", async () => {
  const fiveCreative = makeAd({ id: "five", creatives: Array.from({ length: 5 }, (_, index) => makeCreative(index + 1)) });
  const oneCreative = makeAd({ id: "one", creatives: [makeCreative(1)] });
  const ads = [fiveCreative, oneCreative];

  const daily = new Map();
  const stats = { daily, userFrequency: new Map() };
  const seen = [];
  for (let round = 0; round < 5; round += 1) {
    const results = await matchAds(null, FALLBACK_CTX, { count: 2, ads, stats });
    const five = results.find((result) => result.campaignId === "five");
    assert.ok(five, "five-creative campaign present each round");
    seen.push(five.creativeId);
    const prev = daily.get("five")?.impressions ?? 0;
    daily.set("five", { impressions: prev + 1 });
  }
  assert.equal(new Set(seen).size, 5, "five distinct creatives across five turns");
});

test("CASE 9: website-only campaign is never delivered to Office", async () => {
  const websiteOnly = makeAd({ id: "web", channels: ["website"] });
  const officeOnly = makeAd({ id: "off", channels: ["office"] });
  const dual = makeAd({ id: "dual", channels: ["website", "office"] });
  const ads = [websiteOnly, officeOnly, dual];

  const officeCtx = buildContext({ placement: "office_dashboard_hero", section: "office", channel: "office", countryCode: "om", language: "ar", deviceType: "desktop", sessionId: "office-session" });
  const officeResults = await matchAds(null, officeCtx, { count: 3, ads, stats: EMPTY_STATS });
  assert.ok(!officeResults.some((result) => result.campaignId === "web"), "website-only never reaches office");
  assert.ok(officeResults.some((result) => result.campaignId === "off"));
  assert.ok(officeResults.some((result) => result.campaignId === "dual"));
});

test("CASE 10: office-only campaign is never delivered to Website", async () => {
  const websiteOnly = makeAd({ id: "web", channels: ["website"] });
  const officeOnly = makeAd({ id: "off", channels: ["office"] });
  const ads = [websiteOnly, officeOnly];

  const webCtx = buildContext({ placement: "side_right", section: "home", channel: "website", countryCode: "om", language: "ar", deviceType: "desktop", sessionId: "web-session" });
  const webResults = await matchAds(null, webCtx, { count: 2, ads, stats: EMPTY_STATS });
  assert.ok(!webResults.some((result) => result.campaignId === "off"), "office-only never reaches website");
  assert.ok(webResults.some((result) => result.campaignId === "web"));

  assert.equal(scoreAd(officeOnly, webCtx, new Date(), EMPTY_STATS), null);
  assert.equal(scoreAd(websiteOnly, officeCtx(), new Date(), EMPTY_STATS), null);
});

function officeCtx() {
  return buildContext({ placement: "office_dashboard_hero", section: "office", channel: "office", countryCode: "om", language: "ar", deviceType: "desktop" });
}

test("CASE 12: inventory health reports eligible ads and impressions", async () => {
  const ad1 = makeAd({ id: "ad1", totalImpressions: 100 });
  const ad2 = makeAd({ id: "ad2", totalImpressions: 40 });
  const health = computeInventoryHealth([ad1, ad2], FALLBACK_CTX, { stats: EMPTY_STATS });
  assert.equal(health.eligibleAds, 2);
  assert.equal(health.totalImpressions, 140);
  assert.equal(health.status, "PARTIALLY_FILLED", "2 eligible < minimum 3");
});

test("CASE 11: unsupported admin targeting options are absent from the payload contract", async () => {
  const { normaliseCampaignPayload } = await import("../lib/ads/admin.ts");
  const payload = normaliseCampaignPayload({
    internalName: "X",
    advertiserName: "Y",
    mediaUrl: "/a.jpg",
    titleAr: "t", titleEn: "t", titleTr: "t",
    accentAr: "a", accentEn: "a", accentTr: "a",
    descriptionAr: "d", descriptionEn: "d", descriptionTr: "d",
    ctaAr: "c", ctaEn: "c", ctaTr: "c",
    eyebrowAr: "e", eyebrowEn: "e", eyebrowTr: "e",
    targetUrl: "/",
    languages: ["ar"], devices: ["desktop"],
    countries: ["om"],
    unsupportedTargeting: "value",
    audiences: ["x"],
    maxPerSession: 5,
    pageCodes: ["home"],
  });
  assert.equal(payload.unsupportedTargeting, undefined);
  assert.equal(payload.audiences, undefined);
  assert.equal(payload.maxPerSession, undefined);
  assert.equal(payload.pageCodes, undefined);

  const adminSource = await readFile(new URL("../app/admin/ads/ads-admin-client.tsx", import.meta.url), "utf8");
  assert.ok(!/audiences/.test(adminSource), "no audiences targeting control in admin UI");
  assert.ok(!/maxPerSession/.test(adminSource), "no maxPerSession control in admin UI");
});

test("CASE 8: hidden/inactive tab cannot generate false impressions (client contract)", async () => {
  const source = await readFile(new URL("../src/components/AdSlot.tsx", import.meta.url), "utf8");
  assert.match(source, /document\.visibilityState !== "visible"/, "visibility guard before impression");
  assert.match(source, /IntersectionObserver/, "IntersectionObserver gating");
  assert.match(source, /intersectionRatio >= 0\.5/, "50% visibility threshold");
  assert.match(source, /impressedRef/, "per-ad impression dedup set");
  assert.match(source, /visibilitychange/, "tab visibility listener");
});

// --- budget exhaustion and per-campaign frequency-cap periods ----------------
// `spent_amount` was read by the budget gate but written by nothing, so budget
// and dailyBudget never cut a campaign off. And every campaign was capped over
// a daily window regardless of its configured frequency_cap_period.

test("a campaign whose lifetime budget is exhausted stops serving", async () => {
  const withinBudget = makeAd({ id: "budget-open", budget: 100, spentAmount: 40 });
  const exhausted = makeAd({ id: "budget-spent", budget: 100, spentAmount: 100 });

  const open = await matchAds(null, FALLBACK_CTX, { count: 1, ads: [withinBudget], stats: EMPTY_STATS });
  const closed = await matchAds(null, FALLBACK_CTX, { count: 1, ads: [exhausted], stats: EMPTY_STATS });

  assert.equal(open.length, 1, "a campaign under budget should still serve");
  assert.equal(closed.length, 0, "a campaign at its budget should stop serving");
});

test("daily budget cuts a campaign off for the day", async () => {
  const ad = makeAd({ id: "daily-budget", dailyBudget: 25 });
  const stats = {
    daily: new Map([["daily-budget", { campaign_id: "daily-budget", impressions: 10, unique_impressions: 10, clicks: 0, unique_clicks: 0, conversions: 0, spent_amount: 25 }]]),
    userFrequency: new Map(),
  };
  const results = await matchAds(null, FALLBACK_CTX, { count: 1, ads: [ad], stats });
  assert.equal(results.length, 0, "spending the daily budget should stop the campaign");
});

test("frequency cap uses the campaign's own period, not always daily", async () => {
  // Seen twice today, five times this week. A cap of 3 must pass on a daily
  // period and block on a weekly one.
  const seen = new Map([["freq", { day: 2, week: 5, month: 5, all: 5 }]]);
  const stats = { daily: new Map(), userFrequency: seen };

  const daily = makeAd({ id: "freq", frequencyCapPerUser: 3, frequencyCapPeriod: "day" });
  const weekly = makeAd({ id: "freq", frequencyCapPerUser: 3, frequencyCapPeriod: "week" });

  const dailyResult = await matchAds(null, FALLBACK_CTX, { count: 1, ads: [daily], stats });
  const weeklyResult = await matchAds(null, FALLBACK_CTX, { count: 1, ads: [weekly], stats });

  assert.equal(dailyResult.length, 1, "2 of 3 seen today — still eligible");
  assert.equal(weeklyResult.length, 0, "5 of 3 seen this week — capped");
});
