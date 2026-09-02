import assert from "node:assert/strict";
import test from "node:test";

import { matchAds } from "../lib/ads/engine.ts";
import { placementSpecificity, PlacementSpecificity } from "../lib/ads/eligibility.ts";
import { competingSet, pickWeighted, selectCampaign } from "../lib/ads/selection.ts";

/**
 * The reported symptom was "a global hero forces the same ad onto every page".
 * Placements were already per page, so the cause was arithmetic in selection:
 * an exact page placement scored 365, the canonical "HERO" 360, and a campaign
 * with no placement targeting 315 — and everything within 50 points of the best
 * competed as equals. All three tied, so an untargeted campaign could take the
 * hero of every page.
 */

const EMPTY_STATS = { daily: new Map(), userFrequency: new Map() };

function ctxFor(placement, section, pageType) {
  return {
    section, pageType, placement, channel: "website",
    countryCode: "om", language: "ar", deviceType: "desktop",
    sessionId: "s", path: "/",
  };
}

const HOME = ctxFor("web_home_hero", "home", "home");
const PROPERTIES = ctxFor("web_properties_hero", "properties", "properties");

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
    startAt: null, endAt: null, sectionScopes: [], pageTypes: [], placements: [],
    domains: [], regionIds: [], districtIds: [], latitude: null, longitude: null,
    radiusKm: null, targetAllCountries: false, targetAllRegions: true,
    targetAllCities: true, targetAllDistricts: true, entityType: null, entityIds: [],
    categoryIds: [], propertyTypes: [], serviceCategories: [], officeTypes: [],
    toolCategories: [], operatingSystems: [], dailyStartTime: null, dailyEndTime: null,
    daysOfWeek: [], rotationGroup: null, pricingModel: "fixed", price: 0, budget: 0,
    dailyBudget: 0, spentAmount: 0, maxImpressions: 0, maxClicks: 0,
    frequencyCapPerUser: 0, frequencyCapPeriod: "day", approvalStatus: "approved",
    isActive: true, isFeatured: false, isGlobal: false, isFallback: false,
    totalImpressions: 0, totalClicks: 0, totalConversions: 0, creatives: [],
    ...overrides,
  };
}

// ---- specificity tiers ------------------------------------------------------

test("placement targeting is graded by how specifically it was asked for", () => {
  assert.equal(placementSpecificity(makeAd({ placements: ["web_home_hero"] }), HOME), PlacementSpecificity.Exact);
  assert.equal(placementSpecificity(makeAd({ placements: ["HERO"] }), HOME), PlacementSpecificity.Canonical);
  assert.equal(placementSpecificity(makeAd({ placements: [] }), HOME), PlacementSpecificity.Any);
  assert.equal(placementSpecificity(makeAd({ placements: ["web_services_hero"] }), HOME), null, "a different page's placement is not eligible at all");
});

// ---- the reported bug -------------------------------------------------------

test("a page-specific campaign beats an untargeted one on its own page", async () => {
  const specific = makeAd({ id: "home-specific", placements: ["web_home_hero"] });
  const untargeted = makeAd({ id: "runs-everywhere", placements: [] });

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const [ad] = await matchAds(null, HOME, { count: 1, ads: [untargeted, specific], stats: EMPTY_STATS });
    assert.equal(ad.campaignId, "home-specific", "the untargeted campaign must never win a placement something specific asked for");
  }
});

test("each page's hero resolves to its own campaign", async () => {
  const homeAd = makeAd({ id: "home", placements: ["web_home_hero"] });
  const propertiesAd = makeAd({ id: "properties", placements: ["web_properties_hero"] });
  const ads = [homeAd, propertiesAd];

  const [home] = await matchAds(null, HOME, { count: 1, ads, stats: EMPTY_STATS });
  const [properties] = await matchAds(null, PROPERTIES, { count: 1, ads, stats: EMPTY_STATS });

  assert.equal(home.campaignId, "home");
  assert.equal(properties.campaignId, "properties", "the properties hero must not inherit the home campaign");
});

test("a canonical HERO campaign still fills pages nothing specific asked for", async () => {
  const canonical = makeAd({ id: "all-heroes", placements: ["HERO"] });
  const homeSpecific = makeAd({ id: "home-only", placements: ["web_home_hero"] });
  const ads = [canonical, homeSpecific];

  const [home] = await matchAds(null, HOME, { count: 1, ads, stats: EMPTY_STATS });
  const [properties] = await matchAds(null, PROPERTIES, { count: 1, ads, stats: EMPTY_STATS });

  assert.equal(home.campaignId, "home-only", "the more specific campaign wins where it applies");
  assert.equal(properties.campaignId, "all-heroes", "the canonical campaign still backfills elsewhere");
});

// ---- priority and weight ----------------------------------------------------

test("priority is a tier, so a small gap no longer silently excludes a campaign", () => {
  const high = { ad: makeAd({ id: "high", priority: 10 }), specificity: PlacementSpecificity.Exact, relevance: 100 };
  const low = { ad: makeAd({ id: "low", priority: 9 }), specificity: PlacementSpecificity.Exact, relevance: 100 };

  const competing = competingSet([low, high]);
  assert.deepEqual(competing.map((c) => c.ad.id), ["high"], "the higher priority tier wins outright");
});

test("weight divides traffic within a priority tier", () => {
  const heavy = { ad: makeAd({ id: "heavy", weight: 75 }), specificity: PlacementSpecificity.Exact, relevance: 100 };
  const light = { ad: makeAd({ id: "light", weight: 25 }), specificity: PlacementSpecificity.Exact, relevance: 100 };
  const pool = [heavy, light];

  // Deterministic probes across the 0..1 range rather than sampling randomness.
  assert.equal(pickWeighted(pool, () => 0.10).ad.id, "heavy");
  assert.equal(pickWeighted(pool, () => 0.74).ad.id, "heavy");
  assert.equal(pickWeighted(pool, () => 0.80).ad.id, "light");
  assert.equal(pickWeighted(pool, () => 0.99).ad.id, "light");
});

test("a zero-weight set still serves rather than going blank", () => {
  const pool = [
    { ad: makeAd({ id: "a", weight: 0 }), specificity: PlacementSpecificity.Exact, relevance: 100 },
    { ad: makeAd({ id: "b", weight: 0 }), specificity: PlacementSpecificity.Exact, relevance: 100 },
  ];
  assert.ok(pickWeighted(pool, () => 0.5), "a misconfigured weight must not empty the slot");
});

test("an already-used campaign is skipped so one batch cannot repeat it", () => {
  const pool = [{ ad: makeAd({ id: "only" }), specificity: PlacementSpecificity.Exact, relevance: 100 }];
  assert.equal(selectCampaign(pool, new Set(["only"])), null);
});
