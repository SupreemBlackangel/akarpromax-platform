import assert from "node:assert/strict";
import test from "node:test";

import { matchAdsBatch } from "../lib/ads/engine.ts";

/**
 * matchAdsBatch used to return a flat array which the route regrouped by
 * placement string. Two contexts asking for the same placement — a desktop rail
 * and its mobile twin, or any page rendering a placement twice — collapsed into
 * one bucket, so each slot received the other's campaign as well. Results are
 * now keyed by context index.
 *
 * The batch also dropped the per-slot `count`, hardcoding 1, which is why the
 * hero carousel (arrows, dots, auto-advance) was unreachable dead code.
 */

const EMPTY_STATS = { daily: new Map(), userFrequency: new Map() };

function ctxFor(placement) {
  return {
    section: "home", pageType: "home", placement, channel: "website",
    countryCode: "om", language: "ar", deviceType: "desktop",
    sessionId: "s", path: "/",
  };
}

let seq = 0;
function makeAd(overrides = {}) {
  seq += 1;
  return {
    id: `ad-${seq}`, internalName: `c${seq}`, advertiserName: "A", campaignType: "platform",
    status: "active", mediaType: "image", mediaUrl: `https://cdn.example.com/${seq}.jpg`,
    mobileMediaUrl: null, tabletMediaUrl: null, posterUrl: null, channels: ["website"],
    eyebrow: { ar: "", en: "", tr: "" }, title: { ar: "t", en: "t", tr: "t" },
    accent: { ar: "", en: "", tr: "" }, description: { ar: "", en: "", tr: "" },
    cta: { ar: "", en: "", tr: "" }, targetUrl: "/", countries: [], cities: [],
    languages: ["ar"], devices: ["desktop"], priority: 10, weight: 100,
    startAt: null, endAt: null, sectionScopes: [], pageTypes: [],
    placements: ["web_home_hero"], domains: [], regionIds: [], districtIds: [],
    latitude: null, longitude: null, radiusKm: null, targetAllCountries: false,
    targetAllRegions: true, targetAllCities: true, targetAllDistricts: true,
    entityType: null, entityIds: [], categoryIds: [], propertyTypes: [],
    serviceCategories: [], officeTypes: [], toolCategories: [], operatingSystems: [],
    dailyStartTime: null, dailyEndTime: null, daysOfWeek: [], rotationGroup: null,
    pricingModel: "fixed", price: 0, budget: 0, dailyBudget: 0, spentAmount: 0,
    maxImpressions: 0, maxClicks: 0, frequencyCapPerUser: 0, frequencyCapPeriod: "day",
    approvalStatus: "approved", isActive: true, isFeatured: false, isGlobal: false,
    isFallback: false, totalImpressions: 0, totalClicks: 0, totalConversions: 0,
    creatives: [], ...overrides,
  };
}

test("results are returned per context, aligned by index", async () => {
  const ads = [makeAd({ id: "a" }), makeAd({ id: "b" })];
  const perContext = await matchAdsBatch(null, [ctxFor("web_home_hero"), ctxFor("web_home_hero")], {
    ads, stats: EMPTY_STATS,
  });

  assert.equal(perContext.length, 2, "one array per context");
  assert.ok(Array.isArray(perContext[0]), "each entry is its own list");
});

test("the same placement twice does not give each slot the other's ad", async () => {
  const ads = [makeAd({ id: "first" }), makeAd({ id: "second" })];
  const [slotA, slotB] = await matchAdsBatch(null, [ctxFor("web_home_hero"), ctxFor("web_home_hero")], {
    ads, stats: EMPTY_STATS,
  });

  assert.equal(slotA.length, 1, "a slot that asked for one ad receives exactly one");
  assert.equal(slotB.length, 1, "the duplicate placement does not inherit both campaigns");
  assert.notEqual(slotA[0].campaignId, slotB[0].campaignId, "and the two slots get different campaigns");
});

test("a slot asking for several ads receives them (the hero carousel)", async () => {
  const ads = [makeAd({ id: "x" }), makeAd({ id: "y" }), makeAd({ id: "z" })];
  const [hero] = await matchAdsBatch(null, [ctxFor("web_home_hero")], {
    ads, stats: EMPTY_STATS, counts: [3],
  });

  assert.equal(hero.length, 3, "count was hardcoded to 1, which made the rotation UI dead code");
  assert.equal(new Set(hero.map((ad) => ad.campaignId)).size, 3, "and each rotation entry is a distinct campaign");
});

test("a slot asking for more ads than exist gets what is available", async () => {
  const [hero] = await matchAdsBatch(null, [ctxFor("web_home_hero")], {
    ads: [makeAd({ id: "only" })], stats: EMPTY_STATS, counts: [3],
  });
  assert.equal(hero.length, 1, "no padding, no error");
});

test("count defaults to one when a slot does not ask", async () => {
  const [hero] = await matchAdsBatch(null, [ctxFor("web_home_hero")], {
    ads: [makeAd({ id: "a" }), makeAd({ id: "b" })], stats: EMPTY_STATS,
  });
  assert.equal(hero.length, 1);
});
