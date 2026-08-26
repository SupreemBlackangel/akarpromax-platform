import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildContext } from "../lib/ads/context.ts";
import { matchAds, scoreAd } from "../lib/ads/engine.ts";
import { resolvePlatformLocation } from "../lib/geo/platform-location.ts";
import { setServicesDbForTesting } from "../lib/services/db.ts";
import { listProviderProfiles } from "../lib/services/marketplace.ts";
import { resolveGeoSelection } from "../lib/services/geo/selection.ts";
import { createInMemoryDb } from "./helpers/in-memory-db.mjs";

const countries = [
  { id: "country-sa", code: "SA", nameAr: "السعودية", nameEn: "Saudi Arabia", nameTr: null },
  { id: "country-ae", code: "AE", nameAr: "الإمارات", nameEn: "United Arab Emirates", nameTr: null },
];
const governorates = {
  "country-sa": [
    { id: "region-makkah", code: "sa-makkah", nameAr: "منطقة مكة المكرمة", nameEn: "Makkah", nameTr: null },
    { id: "region-riyadh", code: "sa-riyadh-region", nameAr: "منطقة الرياض", nameEn: "Riyadh Region", nameTr: null },
    { id: "region-eastern", code: "sa-eastern", nameAr: "المنطقة الشرقية", nameEn: "Eastern Province", nameTr: null },
  ],
  "country-ae": [],
};
const cities = {
  "region-makkah": [{ id: "city-jeddah", code: "sa-jeddah", nameAr: "جدة", nameEn: "Jeddah", nameTr: null }],
  "region-riyadh": [{ id: "city-riyadh", code: "sa-riyadh", nameAr: "الرياض", nameEn: "Riyadh", nameTr: null }],
  "region-eastern": [{ id: "city-dammam", code: "sa-dammam", nameAr: "الدمام", nameEn: "Dammam", nameTr: null }],
};
const districts = {
  "city-jeddah": [{ id: "district-rawda", code: "jeddah-rawda", nameAr: "الروضة", nameEn: "Al Rawdah", nameTr: null }],
  "city-riyadh": [{ id: "district-olaya", code: "riyadh-olaya", nameAr: "العليا", nameEn: "Olaya", nameTr: null }],
  "city-dammam": [],
};

const geoProvider = {
  async getCountries() { return countries; },
  async getGovernorates(countryId) { return governorates[countryId] ?? []; },
  async getCities(governorateId) { return cities[governorateId] ?? []; },
  async getDistricts(cityId) { return districts[cityId] ?? []; },
  async getStreets() { return []; },
};

test("manual location wins over automatic detection and persists as an atomic hierarchy", () => {
  const resolved = resolvePlatformLocation({
    manual: { countryCode: "SA", governorate: "sa-riyadh-region", city: "sa-riyadh" },
    auto: { countryCode: "SA", governorate: "sa-makkah", city: "sa-jeddah" },
  });
  assert.equal(resolved.source, "manual");
  assert.equal(resolved.countryCode, "sa");
  assert.equal(resolved.city, "sa-riyadh");
});

test("missing detection defaults deterministically to the home market (Oman)", () => {
  // Product decision: with no signal at all, the platform scopes to its home
  // market so location/currency surfaces render complete. "All countries"
  // stays an explicit user choice, never a fallback.
  assert.deepEqual(resolvePlatformLocation({}), {
    countryCode: "om", governorate: "", city: "", district: "",
    latitude: null, longitude: null, isGlobal: false, source: "fallback",
  });
});

test("canonical hierarchy resolves Jeddah, Riyadh and Dammam only below Saudi Arabia", async () => {
  for (const city of ["sa-jeddah", "sa-riyadh", "sa-dammam"]) {
    const result = await resolveGeoSelection({ scope: "local", country: "sa", city }, geoProvider);
    assert.equal(result.ok, true, city);
    assert.equal(result.value.city.code, city);
    assert.equal(result.value.country.code, "SA");
  }
});

test("cross-city district and mixed global/local selections are rejected", async () => {
  const mixedHierarchy = await resolveGeoSelection({
    scope: "local", country: "sa", city: "sa-jeddah", district: "riyadh-olaya",
  }, geoProvider);
  assert.deepEqual(mixedHierarchy, { ok: false, error: "GEO_INVALID_SELECTION" });
  const mixedScope = await resolveGeoSelection({ scope: "global", country: "sa" }, geoProvider);
  assert.deepEqual(mixedScope, { ok: false, error: "GEO_INVALID_SELECTION" });
});

const EMPTY_STATS = { daily: new Map(), userFrequency: new Map() };

function makeAd(overrides = {}) {
  return {
    id: "geo-ad", internalName: "geo-ad", advertiserName: "Geo Test", campaignType: "platform",
    status: "active", mediaType: "image", mediaUrl: "/geo-test.png", mobileMediaUrl: null,
    tabletMediaUrl: null, posterUrl: null, channels: ["website"], eyebrow: { ar: "", en: "", tr: "" },
    title: { ar: "اختبار", en: "Test", tr: "Test" }, accent: { ar: "", en: "", tr: "" },
    description: { ar: "", en: "", tr: "" }, cta: { ar: "", en: "", tr: "" }, targetUrl: "/",
    countries: [], cities: [], languages: ["ar"], devices: ["desktop"], priority: 10, weight: 100,
    startAt: null, endAt: null, sectionScopes: ["home"], pageTypes: ["home"], placements: ["hero_home"],
    domains: [], regionIds: [], districtIds: [], latitude: null, longitude: null, radiusKm: null,
    targetAllCountries: false, targetAllRegions: false, targetAllCities: false, targetAllDistricts: false,
    entityType: null, entityIds: [], categoryIds: [], propertyTypes: [], serviceCategories: [], officeTypes: [],
    toolCategories: [], operatingSystems: [], dailyStartTime: null, dailyEndTime: null, daysOfWeek: [],
    rotationGroup: null, pricingModel: "fixed", price: 0, budget: 0, dailyBudget: 0, spentAmount: 0,
    maxImpressions: 0, maxClicks: 0, frequencyCapPerUser: 0, frequencyCapPeriod: "day",
    approvalStatus: "approved", isActive: true, isFeatured: false, isGlobal: false,
    totalImpressions: 0, totalClicks: 0, totalConversions: 0, creatives: [], isFallback: false,
    ...overrides,
  };
}

function adContext(overrides = {}) {
  return buildContext({
    path: "/", placement: "hero_home", language: "ar", deviceType: "desktop",
    countryCode: "sa", regionId: "sa-makkah", cityId: "sa-jeddah", districtId: "jeddah-rawda",
    latitude: 21.5433, longitude: 39.1728, ...overrides,
  });
}

test("ads enforce country, region, city and district cumulatively", () => {
  const ad = makeAd({
    countries: ["sa"], regionIds: ["sa-makkah"], cities: ["sa-jeddah"], districtIds: ["jeddah-rawda"],
  });
  assert.notEqual(scoreAd(ad, adContext(), new Date(), EMPTY_STATS), null);
  assert.equal(scoreAd(ad, adContext({ cityId: "sa-riyadh" }), new Date(), EMPTY_STATS), null);
  assert.equal(scoreAd(ad, adContext({ regionId: "sa-eastern", cityId: "sa-dammam" }), new Date(), EMPTY_STATS), null);
  assert.equal(scoreAd(ad, adContext({ countryCode: "ae" }), new Date(), EMPTY_STATS), null);
  assert.equal(scoreAd(ad, adContext({ districtId: undefined }), new Date(), EMPTY_STATS), null);
});

test("10 km ad radius accepts the inside point and rejects outside or missing coordinates", () => {
  const radiusAd = makeAd({ latitude: 21.5433, longitude: 39.1728, radiusKm: 10 });
  assert.notEqual(scoreAd(radiusAd, adContext({ latitude: 21.6330 }), new Date(), EMPTY_STATS), null);
  assert.equal(scoreAd(radiusAd, adContext({ latitude: 21.6343 }), new Date(), EMPTY_STATS), null);
  assert.equal(scoreAd(radiusAd, adContext({ latitude: undefined, longitude: undefined }), new Date(), EMPTY_STATS), null);
});

test("house fill never bypasses city targeting", async () => {
  const wrongCityHouse = makeAd({ id: "house-riyadh", isFallback: true, cities: ["sa-riyadh"] });
  const results = await matchAds(null, adContext(), { count: 1, ads: [wrongCityHouse], stats: EMPTY_STATS });
  assert.equal(results.length, 0);
});

test("provider search isolates Jeddah, Riyadh and Dammam and enforces a 10 km radius", async () => {
  const db = createInMemoryDb();
  setServicesDbForTesting(db);
  try {
    db.seed("service_provider_profiles", [
      { id: "provider-jeddah-near", country_code: "SA", city_id: "sa-jeddah", status: "approved", latitude: 21.55, longitude: 39.17, service_radius_km: 25, is_featured: 0, featured_rank: 0, rating_avg: 5, rating_count: 2 },
      { id: "provider-jeddah-far", country_code: "SA", city_id: "sa-jeddah", status: "approved", latitude: 21.75, longitude: 39.17, service_radius_km: 50, is_featured: 0, featured_rank: 0, rating_avg: 4, rating_count: 1 },
      { id: "provider-riyadh", country_code: "SA", city_id: "sa-riyadh", status: "approved", latitude: 24.7136, longitude: 46.6753, service_radius_km: 50, is_featured: 0, featured_rank: 0, rating_avg: 4, rating_count: 1 },
      { id: "provider-dammam", country_code: "SA", city_id: "sa-dammam", status: "approved", latitude: 26.4207, longitude: 50.0888, service_radius_km: 50, is_featured: 0, featured_rank: 0, rating_avg: 4, rating_count: 1 },
    ]);

    const jeddah = await listProviderProfiles({
      countryAliases: ["sa"], cityAliases: ["sa-jeddah"], status: "approved",
      latitude: 21.5433, longitude: 39.1728, radiusKm: 10,
    });
    assert.deepEqual(jeddah.map((row) => row.id), ["provider-jeddah-near"]);

    const riyadh = await listProviderProfiles({ countryAliases: ["sa"], cityAliases: ["sa-riyadh"], status: "approved" });
    assert.deepEqual(riyadh.map((row) => row.id), ["provider-riyadh"]);
    const dammam = await listProviderProfiles({ countryAliases: ["sa"], cityAliases: ["sa-dammam"], status: "approved" });
    assert.deepEqual(dammam.map((row) => row.id), ["provider-dammam"]);
  } finally {
    setServicesDbForTesting(null);
  }
});

test("all advertising consumers and public services use the central geo contract", async () => {
  const root = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(root, /<GeoProvider>/);

  for (const name of ["AdHero", "AdSidebar", "AdBottom", "NewsTicker", "FeaturedProperties"]) {
    const source = await readFile(new URL(`../components/advertising/placements/${name}.tsx`, import.meta.url), "utf8");
    assert.match(source, /useAdvertisingLocation/, name);
    assert.match(source, /appendAdvertisingLocation/, name);
  }

  for (const path of [
    "../app/services/page.tsx", "../app/providers/page.tsx", "../app/services/catalog/page.tsx",
    "../app/providers/apply/page.tsx", "../app/service-requests/new/page.tsx",
  ]) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    assert.doesNotMatch(source, /country=OM|countryCode:\s*["']OM["']/i, path);
  }
});

test("legacy advertising adapter canonicalizes the home path and standard slot names", async () => {
  const source = await readFile(new URL("../app/api/advertising/match/route.ts", import.meta.url), "utf8");
  assert.match(source, /page === 'home' \|\| page === '\/'/);
  assert.match(source, /hero: 'HERO'/);
  assert.match(source, /bottom_03: 'BOTTOM_03'/);
  assert.match(source, /placement: canonicalLegacyPlacement\(placement\)/);
});
