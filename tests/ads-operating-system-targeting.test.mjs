// Operating-system targeting was a control that switched a campaign off.
//
// `isOsMatch` refuses a campaign whose OS list is non-empty when the context
// has no OS — and nothing ever filled the context's OS. No client sent one and
// the server, which already parses the User-Agent for the device, did not
// derive one. So every campaign that used the admin panel's OS targeting was
// invisible to every visitor, and ticking all five boxes was the same as
// switching the campaign off.
//
// Found on production: the owner's own "مؤسسة الدقة العالية" hero campaign had
// android, ios, windows, macos and linux all selected and served nobody.
import assert from "node:assert/strict";
import test from "node:test";

import { operatingSystemFromUserAgent, resolveServerAdContext } from "../lib/ads/server-context.ts";
import { buildContext } from "../lib/ads/context.ts";
import { matchAds } from "../lib/ads/engine.ts";

const EMPTY_STATS = { daily: new Map(), userFrequency: new Map() };

const UA = {
  windows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
  macos: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  iphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  ipad: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/604.1",
  android: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36",
  linux: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
  bare: "Mozilla/5.0",
};

/** A parsed campaign, the shape the engine matches against. */
function campaign(overrides = {}) {
  return {
    id: "camp-1",
    internalName: "Hero",
    advertiserName: "AkarProMax",
    campaignType: "platform",
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
    devices: ["desktop", "tablet", "mobile"],
    priority: 100,
    weight: 100,
    startAt: null,
    endAt: null,
    sectionScopes: ["home", "global"],
    pageTypes: [],
    placements: ["web_home_hero"],
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
    ...overrides,
  };
}

const context = (userAgent, overrides = {}) => {
  const request = new Request("https://akarpromax.com/api/ads/match-batch", {
    method: "POST",
    headers: { "user-agent": userAgent, host: "akarpromax.com" },
  });
  return buildContext(
    { placement: "web_home_hero", path: "/", countryCode: "sa", language: "ar", ...overrides },
    resolveServerAdContext(request, "sa"),
  );
};

const serve = (ad, ctx) => matchAds(null, ctx, { count: 1, ads: [ad], stats: EMPTY_STATS });

// ---- the reading itself -----------------------------------------------------

test("each platform is read from its User-Agent", () => {
  assert.equal(operatingSystemFromUserAgent(UA.windows), "windows");
  assert.equal(operatingSystemFromUserAgent(UA.macos), "macos");
  assert.equal(operatingSystemFromUserAgent(UA.iphone), "ios");
  assert.equal(operatingSystemFromUserAgent(UA.android), "android");
  assert.equal(operatingSystemFromUserAgent(UA.linux), "linux");
});

test("an iPad is iOS, not macOS", () => {
  // iPadOS says "like Mac OS X". Tested before macOS or every iPad reads as a
  // Mac and an iOS-targeted campaign misses half its audience.
  assert.equal(operatingSystemFromUserAgent(UA.ipad), "ios");
});

test("an Android phone is Android, not Linux", () => {
  // Android's User-Agent contains "Linux". Same ordering trap, other way round.
  assert.equal(operatingSystemFromUserAgent(UA.android), "android");
});

test("an unknown or absent agent has no operating system, rather than a guessed one", () => {
  assert.equal(operatingSystemFromUserAgent(UA.bare), undefined);
  assert.equal(operatingSystemFromUserAgent(""), undefined);
  assert.equal(operatingSystemFromUserAgent(null), undefined);
});

// ---- it reaches the matching context ---------------------------------------

test("the server fills the context's operating system", () => {
  assert.equal(context(UA.windows).operatingSystem, "windows");
  assert.equal(context(UA.iphone).operatingSystem, "ios");
});

test("the server's reading wins over the payload's claim", () => {
  // The page's JavaScript can say anything, and OS targeting decides what an
  // advertiser is billed for — the same reason the session id is server-side.
  assert.equal(context(UA.windows, { operatingSystem: "ios" }).operatingSystem, "windows");
});

// ---- the bug this fixes -----------------------------------------------------

test("a campaign targeting every operating system now serves, instead of nobody", async () => {
  // The exact production state: all five selected. Before this it matched no
  // visitor at all, because the context's OS was always undefined.
  const everyOs = campaign({
    operatingSystems: ["android", "ios", "windows", "macos", "linux"],
  });
  for (const agent of ["windows", "macos", "iphone", "android", "linux"]) {
    const results = await serve(everyOs, context(UA[agent]));
    assert.equal(results.length, 1, `${agent} sees the campaign`);
  }
});

test("targeting is still targeting — a Windows-only campaign misses a phone", async () => {
  const windowsOnly = campaign({ operatingSystems: ["windows"] });
  assert.equal((await serve(windowsOnly, context(UA.windows))).length, 1);
  assert.equal((await serve(windowsOnly, context(UA.iphone))).length, 0);
  assert.equal((await serve(windowsOnly, context(UA.android))).length, 0);
});

test("a campaign that targets no operating system is untouched by all this", async () => {
  const anyOs = campaign({ operatingSystems: [] });
  for (const agent of ["windows", "iphone", "bare"]) {
    assert.equal((await serve(anyOs, context(UA[agent]))).length, 1, agent);
  }
});

test("an unknown agent still misses an OS-targeted campaign, and that is correct", async () => {
  // A bot or a browser this platform does not recognise is not a Windows user,
  // and serving it an OS-targeted impression would bill the advertiser for a
  // visitor they did not ask for.
  const everyOs = campaign({
    operatingSystems: ["android", "ios", "windows", "macos", "linux"],
  });
  assert.equal((await serve(everyOs, context(UA.bare))).length, 0);
});
