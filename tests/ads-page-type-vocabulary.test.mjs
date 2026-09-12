// A section name in the page-type field is a campaign that can never serve.
//
// Found in production: 14 of 22 campaigns, every one of them approved, active
// and inside its dates, carrying page_types like ["properties"], ["services"],
// ["tools"] or ["offices"]. Those are SECTIONS. The page-type gate compares
// against PAGE_TYPES — home, listing, details, office-profile, tool-details and
// the rest — and /properties resolves to `listing`. So the gate refused every
// one of them, on every request, for the life of the campaign.
//
// This is the shape of the defect the public ad-request intake had, in the
// stored data of the admin-created house campaigns. The admin route filters
// page_types against PAGE_TYPES_LIST today, so the console can no longer
// produce one; these rows predate that filter.
import assert from "node:assert/strict";
import test from "node:test";

import { matchAds } from "../lib/ads/engine.ts";
import { buildContext } from "../lib/ads/context.ts";
import { PAGE_TYPES_LIST, PLATFORM_SECTIONS_REGISTRY } from "../src/constants/advertising.ts";

const EMPTY_STATS = { daily: new Map(), userFrequency: new Map() };

function campaign({ pageTypes, sectionScopes = ["properties", "global"], placements = ["HERO"] }) {
  return {
    id: "properties-hero",
    internalName: "Properties Hero",
    advertiserName: "AkarProMax",
    campaignType: "house",
    status: "active",
    mediaType: "image",
    mediaUrl: "https://cdn.example.com/hero.jpg",
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
    devices: ["desktop", "mobile"],
    priority: 100,
    weight: 100,
    startAt: null,
    endAt: null,
    sectionScopes,
    pageTypes,
    placements,
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

const propertiesHero = () =>
  buildContext({
    path: "/properties",
    placement: "web_properties_hero",
    language: "ar",
    countryCode: "sa",
    deviceType: "desktop",
    sessionId: "test-session",
  });

const serve = (ad) => matchAds(null, propertiesHero(), { count: 1, ads: [ad], stats: EMPTY_STATS });

test("a section name is not a page type", () => {
  // The premise. If "properties" ever becomes a page type this whole file is
  // describing a rule that no longer exists.
  for (const section of ["properties", "services", "tools", "offices"]) {
    assert.ok(!PAGE_TYPES_LIST.includes(section), `"${section}" must not be a page type`);
  }
  assert.equal(propertiesHero().pageType, "listing", "/properties is a listing page");
  assert.equal(propertiesHero().section, "properties");
});

test("an approved, active campaign targeting page_types=['properties'] never serves", async () => {
  const results = await serve(campaign({ pageTypes: ["properties"] }));
  assert.equal(results.length, 0, "this is the state 14 production campaigns were in");
});

test("the same campaign with the field cleared serves", async () => {
  // Empty means "any page type", and the placement already pins the page.
  const results = await serve(campaign({ pageTypes: [] }));
  assert.equal(results.length, 1);
  assert.equal(results[0].campaignId, "properties-hero");
});

test("naming the real page type also works, for a campaign that wants one page", async () => {
  assert.equal((await serve(campaign({ pageTypes: ["listing"] }))).length, 1);
  assert.equal((await serve(campaign({ pageTypes: ["details"] }))).length, 0, "a detail-page campaign stays off the listing");
});

test("the section field was never the problem — it holds a real section", async () => {
  // Worth pinning: the repair must not "fix" section_scopes, which is correct.
  assert.equal((await serve(campaign({ pageTypes: [], sectionScopes: ["properties"] }))).length, 1);
  assert.equal((await serve(campaign({ pageTypes: [], sectionScopes: ["services"] }))).length, 0);
});

test("a placement written in the wrong case matches nothing", async () => {
  // Reported by the repair script and deliberately not rewritten: which
  // placement a campaign occupies is what an advertiser is billed for.
  assert.equal((await serve(campaign({ pageTypes: [], placements: ["hero"] }))).length, 0);
  assert.equal((await serve(campaign({ pageTypes: [], placements: ["HERO"] }))).length, 1);
});

test("no seed script writes a section name into page_types", async () => {
  // How the damage came back after the first repair: seed-ads-services-house
  // was re-run on 2026-09-11 and wrote page_types=["services"] over the nine
  // house campaigns again. The placement already pins the family; the field
  // is left empty ("any page type"), and "home" is the one section name that
  // is also a real page type.
  const { readdir, readFile } = await import("node:fs/promises");
  const { fileURLToPath } = await import("node:url");
  const dir = fileURLToPath(new URL("../scripts/", import.meta.url));
  const SECTION_NAMES = new Set([...Object.keys(PLATFORM_SECTIONS_REGISTRY), "global"]);
  const offenders = [];
  for (const name of await readdir(dir)) {
    if (!/^seed-ads-.*\.(mjs|ts)$/.test(name)) continue;
    const source = await readFile(dir + name, "utf8");
    // Two shapes: a keyed `page_types: '[...]'`, and the positional row in
    // seed-ads-services-house where the page_types literal follows the
    // section_scopes literal on the same line. So: every quoted JSON-array
    // literal on a line that is not the line's first, plus every keyed one.
    for (const line of source.split(/\r?\n/)) {
      const literals = [...line.matchAll(/'(\[[^\]]*\])'/g)].map((m) => m[1]);
      const keyed = line.match(/page_types['"]?\s*:\s*'(\[[^\]]*\])'/)?.[1];
      const candidates = keyed ? [keyed] : literals.slice(1);
      // A positional literal is only suspect when it holds a section name:
      // device and language lists share these lines and are not the problem.
      for (const literal of candidates) {
        const values = JSON.parse(literal);
        const sectionNames = values.filter((value) => SECTION_NAMES.has(value) && !PAGE_TYPES_LIST.includes(value));
        if (sectionNames.length) offenders.push(`${name}: ${literal}`);
      }
    }
  }
  assert.deepEqual(offenders, []);
});
