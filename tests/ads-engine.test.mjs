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
    isSponsored: false,
    isFeatured: false,
    isFallback: false,
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

function houseAds(count, prefix = "house") {
  return Array.from({ length: count }, (_, index) => makeAd({ id: `${prefix}-${index + 1}`, isFallback: true }));
}

test("CASE 1: 3 eligible commercial campaigns -> no House Ad", async () => {
  const ads = [...commercialAds(3), ...houseAds(1)];
  const results = await matchAds(null, FALLBACK_CTX, { count: 3, ads, stats: EMPTY_STATS });
  assert.equal(results.length, 3);
  assert.ok(results.every((result) => !result.isFallback), "no house ad when 3 commercial eligible");
});

test("CASE 2: 2 eligible commercial campaigns -> 1 House turn", async () => {
  const ads = [...commercialAds(2), ...houseAds(1)];
  const results = await matchAds(null, FALLBACK_CTX, { count: 3, ads, stats: EMPTY_STATS });
  assert.equal(results.length, 3);
  assert.equal(results.filter((result) => !result.isFallback).length, 2);
  assert.equal(results.filter((result) => result.isFallback).length, 1);
});

test("CASE 3: 1 eligible commercial campaign -> 2 House turns", async () => {
  const ads = [...commercialAds(1), ...houseAds(2)];
  const results = await matchAds(null, FALLBACK_CTX, { count: 3, ads, stats: EMPTY_STATS });
  assert.equal(results.length, 3);
  assert.equal(results.filter((result) => !result.isFallback).length, 1);
  assert.equal(results.filter((result) => result.isFallback).length, 2);
});

test("CASE 4: 0 eligible commercial campaigns -> House inventory only", async () => {
  const ads = [...houseAds(2)];
  const results = await matchAds(null, FALLBACK_CTX, { count: 3, ads, stats: EMPTY_STATS });
  assert.equal(results.length, 3);
  assert.ok(results.every((result) => result.isFallback), "house-only fill");
});

test("CASE 5: 4+ campaigns but only 2 eligible after geo targeting -> fallback still active", async () => {
  const ctx = { ...FALLBACK_CTX, countryCode: "om" };
  const ads = [
    ...commercialAds(2),
    ...Array.from({ length: 3 }, (_, index) => makeAd({ id: `other-country-${index + 1}`, countries: ["sa"] })),
    ...houseAds(1),
  ];
  const results = await matchAds(null, ctx, { count: 3, ads, stats: EMPTY_STATS });
  assert.equal(results.length, 3);
  assert.equal(results.filter((result) => !result.isFallback).length, 2);
  assert.equal(results.filter((result) => result.isFallback).length, 1, "fallback still active when only 2 eligible");
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

test("CASE 12: house impressions are excluded from commercial advertiser totals", async () => {
  const commercial = makeAd({ id: "commercial", totalImpressions: 100 });
  const house = makeAd({ id: "house", isFallback: true, totalImpressions: 40 });
  const health = computeInventoryHealth([commercial, house], FALLBACK_CTX, { stats: EMPTY_STATS });
  assert.equal(health.commercialImpressions, 100);
  assert.equal(health.houseImpressions, 40);
  assert.equal(health.totalValidImpressions, 140);
  assert.equal(health.commercialFillRate, 100 / 140);
  assert.equal(health.status, "PARTIALLY_FILLED", "1 eligible commercial < minimumCommercialInventory 3");
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
