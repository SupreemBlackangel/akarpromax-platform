import assert from "node:assert/strict";
import test from "node:test";

process.env.AD_TRACKING_SECRET ??= "test-secret-for-geo-conflict";

import { matchAds, simulateMatch } from "../lib/ads/engine.ts";
import { detectCampaignConflicts } from "../lib/ads/conflicts.ts";

/**
 * Two campaigns, one slot, one moment: what actually decides?
 *
 * A campaign targeting Saudi Arabia and a campaign targeting only Jeddah are
 * BOTH eligible for a visitor in Jeddah. Nothing in the eligibility gates
 * separates them -- `isGeoMatch` returns ok for both. The decision is made
 * afterwards, in `selectCampaign`, and its order is:
 *
 *     placement specificity -> priority -> relevance -> weighted random
 *
 * Only the third of those knows anything about geography. `isGeoMatch` scores
 * country 40, region 60, city 75, district 90, so the narrower campaign is more
 * relevant -- but relevance is consulted ONLY after priority has already been
 * settled, and priority is a hard tier, not a nudge.
 *
 * The consequence is the thing an operator needs to know, and it is not
 * obvious from any screen: a country-wide campaign with a higher priority
 * suppresses a city campaign completely, in that city, forever. The local
 * advertiser's campaign is approved, active, funded, eligible -- and never
 * seen. That is the same class of silent failure as the invisible-ad bug,
 * arriving by a different road.
 */

const EMPTY_STATS = { daily: new Map(), userFrequency: new Map() };

const IN_JEDDAH = {
  section: "home", pageType: "home", placement: "web_home_hero", channel: "website",
  countryCode: "sa", regionId: "makkah", cityId: "jeddah",
  language: "ar", deviceType: "desktop", sessionId: "s", path: "/",
};

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

/** Targets the whole of Saudi Arabia. */
const saudiWide = (extra = {}) =>
  makeAd({ id: "saudi", countries: ["sa"], targetAllCountries: false, ...extra });

/** Targets Jeddah alone. */
const jeddahOnly = (extra = {}) =>
  makeAd({
    id: "jeddah", countries: ["sa"], targetAllCountries: false,
    cities: ["jeddah"], targetAllCities: false, ...extra,
  });

const serve = (ads, ctx = IN_JEDDAH) => matchAds(null, ctx, { count: 1, ads, stats: EMPTY_STATS });
const sim = (ads, ctx = IN_JEDDAH) => simulateMatch(null, ctx, { ads, stats: EMPTY_STATS });

// ---- both are eligible; the tie-break is what matters -----------------------

test("in Jeddah, both the country campaign and the city campaign are eligible", async () => {
  const result = await sim([saudiWide(), jeddahOnly()]);
  for (const id of ["saudi", "jeddah"]) {
    const row = result.campaigns.find((c) => c.campaignId === id);
    assert.equal(row.eligible, true, `${id} must pass every gate for a visitor in Jeddah`);
  }
});

test("at equal priority the narrower campaign wins, which is the intuitive answer", async () => {
  // country 40 vs country 40 + city 75. Relevance decides, and it decides right.
  const served = await serve([saudiWide({ priority: 10 }), jeddahOnly({ priority: 10 })]);
  assert.equal(served[0].campaignId, "jeddah");
});

test("a higher-priority country campaign suppresses the city campaign entirely", async () => {
  // This is the finding. Priority is a tier, settled BEFORE relevance is
  // consulted, so no amount of geographic precision can overcome one point of
  // priority. The Jeddah advertiser sees an approved, active campaign with zero
  // impressions and no explanation anywhere in the product.
  const ads = [saudiWide({ priority: 11 }), jeddahOnly({ priority: 10 })];

  const served = await serve(ads);
  assert.equal(served[0].campaignId, "saudi", "the broader campaign wins on priority alone");

  const result = await sim(ads);
  const local = result.campaigns.find((c) => c.campaignId === "jeddah");
  assert.equal(local.eligible, true, "it is not rejected -- it is outranked");
  assert.equal(local.competing, false);
  assert.equal(local.trafficShare, 0, "approved, funded, eligible, and never once served");
});

test("a lower-priority country campaign yields, so priority is genuinely the lever", async () => {
  const served = await serve([saudiWide({ priority: 5 }), jeddahOnly({ priority: 10 })]);
  assert.equal(served[0].campaignId, "jeddah");
});

test("outside Jeddah the city campaign is not merely outranked, it is ineligible", async () => {
  const inRiyadh = { ...IN_JEDDAH, regionId: "riyadh", cityId: "riyadh" };
  const served = await serve([saudiWide({ priority: 5 }), jeddahOnly({ priority: 99 })], inRiyadh);
  assert.equal(served[0].campaignId, "saudi", "a Jeddah campaign must never appear in Riyadh");
});

test("a visitor whose city did not resolve sees only the country campaign", async () => {
  // Worth pinning separately: city targeting is not a preference, it is a
  // requirement. When location detection fails, every city-targeted campaign
  // vanishes and only the broader ones remain.
  const noCity = { ...IN_JEDDAH, cityId: undefined, regionId: undefined };
  const served = await serve([saudiWide(), jeddahOnly({ priority: 99 })], noCity);
  assert.equal(served.length, 1);
  assert.equal(served[0].campaignId, "saudi");
});

// ---- the operator has to be able to see it ----------------------------------

test("the suppressed city campaign is reported as a conflict, not left to be discovered", async () => {
  const conflicts = detectCampaignConflicts([
    saudiWide({ priority: 11, internalName: "SA wide" }),
    jeddahOnly({ priority: 10, internalName: "Jeddah only" }),
  ]);

  // If this ever stops flagging, an advertiser's only symptom is a campaign
  // that never spends, and the only person who can see why is whoever reads
  // the selection code.
  assert.ok(conflicts.length > 0, "a campaign that can never win must be surfaced somewhere");
});

// ---- conflict detection must know about geography ---------------------------

const idsOf = (conflicts, type) =>
  conflicts.filter((c) => c.type === type).flatMap((c) => c.campaignIds).sort();

test("campaigns in different countries are not reported as starving each other", async () => {
  // Before the catalogue was seeded this could barely happen -- only Saudi
  // Arabia had cities. With 22 more countries it becomes the common case, and
  // a "blocked" alarm on two campaigns that never meet is worse than silence:
  // it teaches whoever reads the panel to stop reading it.
  const conflicts = detectCampaignConflicts([
    makeAd({ id: "cairo", internalName: "Cairo", countries: ["eg"], cities: ["eg-cairo"], targetAllCities: false, priority: 5 }),
    makeAd({ id: "riyadh", internalName: "Riyadh", countries: ["sa"], cities: ["riyadh"], targetAllCities: false, priority: 10 }),
  ]);
  assert.deepEqual(idsOf(conflicts, "starved_by_priority"), []);
});

test("two cities in the same country do not starve each other either", async () => {
  const conflicts = detectCampaignConflicts([
    makeAd({ id: "jed", internalName: "Jeddah", countries: ["sa"], cities: ["jeddah"], targetAllCities: false, priority: 5 }),
    makeAd({ id: "ryd", internalName: "Riyadh", countries: ["sa"], cities: ["riyadh"], targetAllCities: false, priority: 10 }),
  ]);
  assert.deepEqual(idsOf(conflicts, "starved_by_priority"), []);
});

test("a broader campaign outranked by a narrower one is not starved", async () => {
  // The Saudi campaign loses in Jeddah and serves everywhere else in the
  // country. Reporting it as never appearing is simply untrue.
  const conflicts = detectCampaignConflicts([
    saudiWide({ priority: 5, internalName: "SA wide" }),
    jeddahOnly({ priority: 10, internalName: "Jeddah only" }),
  ]);
  assert.deepEqual(idsOf(conflicts, "starved_by_priority"), []);
});

test("the genuine case is still caught: a covering campaign that outranks", async () => {
  const conflicts = detectCampaignConflicts([
    saudiWide({ priority: 11, internalName: "SA wide" }),
    jeddahOnly({ priority: 10, internalName: "Jeddah only" }),
  ]);
  assert.deepEqual(idsOf(conflicts, "starved_by_priority"), ["jeddah"]);
});

test("an untargeted campaign covers everything, so it starves anything below it", async () => {
  const conflicts = detectCampaignConflicts([
    makeAd({ id: "everyone", internalName: "House", priority: 20, targetAllCountries: true }),
    jeddahOnly({ priority: 10 }),
  ]);
  assert.deepEqual(idsOf(conflicts, "starved_by_priority"), ["jeddah"]);
});

test("a campaign that has already ended cannot starve one that runs later", async () => {
  const conflicts = detectCampaignConflicts([
    makeAd({ id: "past", internalName: "Ended", priority: 20, targetAllCountries: true, endAt: "2020-01-01T00:00:00Z" }),
    makeAd({ id: "now", internalName: "Running", priority: 10, targetAllCountries: true }),
  ]);
  assert.deepEqual(idsOf(conflicts, "starved_by_priority"), []);
});

test("a different language or device is a different audience, not a conflict", async () => {
  const conflicts = detectCampaignConflicts([
    makeAd({ id: "ar-only", internalName: "Arabic", languages: ["ar"], priority: 20, targetAllCountries: true }),
    makeAd({ id: "en-only", internalName: "English", languages: ["en"], priority: 5, targetAllCountries: true }),
  ]);
  assert.deepEqual(idsOf(conflicts, "starved_by_priority"), []);
});
