import assert from "node:assert/strict";
import test from "node:test";

process.env.AD_TRACKING_SECRET ??= "test-secret-for-simulator";

import { simulateMatch, matchAds } from "../lib/ads/engine.ts";
import { detectCampaignConflicts, detectUnreachablePlacements } from "../lib/ads/conflicts.ts";

/**
 * The simulator must run the production engines, not a second copy of the
 * rules. These tests pin that: whatever the simulator marks as competing is
 * exactly what matchAds is willing to serve, and whatever it rejects, matchAds
 * rejects for the same reason.
 */

const EMPTY_STATS = { daily: new Map(), userFrequency: new Map() };

const HOME = {
  section: "home", pageType: "home", placement: "web_home_hero", channel: "website",
  countryCode: "om", language: "ar", deviceType: "desktop", sessionId: "s", path: "/",
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

const sim = (ads, ctx = HOME) => simulateMatch(null, ctx, { ads, stats: EMPTY_STATS });
const find = (result, id) => result.campaigns.find((c) => c.campaignId === id);

// ---- the simulator reports the real engine's decisions ----------------------

test("a paused campaign is reported as such, not silently dropped", async () => {
  const result = await sim([makeAd({ id: "off", isActive: false })]);
  assert.equal(find(result, "off").eligible, false);
  assert.equal(find(result, "off").reason, "inactive", "an operator needs to know which rule stopped it");
});

test("an unapproved campaign reports approval, not something further down the chain", async () => {
  const result = await sim([makeAd({ id: "pending", approvalStatus: "pending" })]);
  assert.equal(find(result, "pending").reason, "not_approved");
});

test("targeting another page's placement is reported as a placement mismatch", async () => {
  const result = await sim([makeAd({ id: "elsewhere", placements: ["web_services_hero"] })]);
  assert.equal(find(result, "elsewhere").reason, "placement");
});

test("what the simulator says will serve is what the engine actually serves", async () => {
  const ads = [
    makeAd({ id: "wins", placements: ["web_home_hero"], priority: 20 }),
    makeAd({ id: "loses", placements: ["web_home_hero"], priority: 5 }),
    makeAd({ id: "wrong-page", placements: ["web_services_hero"] }),
  ];
  const result = await sim(ads);
  const served = await matchAds(null, HOME, { count: 1, ads, stats: EMPTY_STATS });

  assert.deepEqual(
    result.campaigns.filter((c) => c.competing).map((c) => c.campaignId),
    ["wins"],
    "the simulator must not disagree with the engine it claims to preview",
  );
  assert.equal(served[0].campaignId, "wins");
});

test("an eligible campaign that can never win reports a zero share", async () => {
  const result = await sim([
    makeAd({ id: "top", priority: 20 }),
    makeAd({ id: "starved", priority: 5 }),
  ]);
  const starved = find(result, "starved");
  assert.equal(starved.eligible, true, "it passes every eligibility rule");
  assert.equal(starved.competing, false);
  assert.equal(starved.trafficShare, 0, "configured, funded, healthy-looking and never seen");
});

test("weight is reported as the share of traffic it actually buys", async () => {
  const result = await sim([
    makeAd({ id: "heavy", weight: 75 }),
    makeAd({ id: "light", weight: 25 }),
  ]);
  assert.equal(find(result, "heavy").trafficShare, 0.75);
  assert.equal(find(result, "light").trafficShare, 0.25);
});

// ---- conflict detection -----------------------------------------------------

test("a campaign outranked on every impression is flagged as blocked", () => {
  const conflicts = detectCampaignConflicts([
    makeAd({ id: "top", priority: 20 }),
    makeAd({ id: "starved", priority: 5 }),
  ]);
  const starved = conflicts.find((c) => c.type === "starved_by_priority");
  assert.ok(starved, "nothing in the admin list would otherwise show this");
  assert.equal(starved.severity, "blocked");
  assert.deepEqual(starved.campaignIds, ["starved"]);
});

test("a zero-weight campaign beside a weighted sibling is flagged", () => {
  const conflicts = detectCampaignConflicts([
    makeAd({ id: "weighted", weight: 50 }),
    makeAd({ id: "zero", weight: 0 }),
  ]);
  const zero = conflicts.find((c) => c.type === "zero_weight");
  assert.deepEqual(zero.campaignIds, ["zero"]);
});

test("equal-priority rivals are a warning, not a fault", () => {
  const conflicts = detectCampaignConflicts([makeAd({ id: "a" }), makeAd({ id: "b" })]);
  const duplicate = conflicts.find((c) => c.type === "duplicate_targeting");
  assert.equal(duplicate.severity, "warning", "splitting traffic by weight is a legitimate setup");
  assert.equal(conflicts.some((c) => c.severity === "blocked"), false);
});

test("campaigns on different placements do not conflict", () => {
  const conflicts = detectCampaignConflicts([
    makeAd({ id: "home", placements: ["web_home_hero"], priority: 20 }),
    makeAd({ id: "properties", placements: ["web_properties_hero"], priority: 1 }),
  ]);
  assert.deepEqual(conflicts, [], "each page owns its own hero, so these never meet");
});

test("paused and unapproved campaigns are not reported as conflicts", () => {
  const conflicts = detectCampaignConflicts([
    makeAd({ id: "live", priority: 20 }),
    makeAd({ id: "paused", priority: 1, isActive: false }),
    makeAd({ id: "pending", priority: 1, approvalStatus: "pending" }),
  ]);
  assert.deepEqual(conflicts, [], "a campaign that is not trying to serve is not being starved");
});

test("a placement no page renders is flagged", () => {
  const conflicts = detectUnreachablePlacements(
    [makeAd({ id: "typo", placements: ["web_home_heroo"] })],
    new Set(["web_home_hero"]),
  );
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].type, "unreachable_placement");
  assert.match(conflicts[0].message.ar, /web_home_heroo/);
});
