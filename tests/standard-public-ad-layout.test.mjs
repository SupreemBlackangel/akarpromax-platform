import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { AD_PLACEMENTS, visibleAdminPlacements } from "../src/constants/advertising.ts";
import { STANDARD_PUBLIC_AD_LAYOUT_V1, listAllStandardPublicPlacements } from "../src/config/standard-public-ad-layout.ts";
import { scoreAd } from "../lib/ads/engine.ts";
import { buildContext } from "../lib/ads/context.ts";

function makeAd(overrides = {}) {
  return {
    id: "campaign-standard-test",
    internalName: "campaign-standard-test",
    advertiserName: "Test Advertiser",
    campaignType: "platform",
    mediaType: "image",
    mediaUrl: "https://cdn.example.com/test.jpg",
    mobileMediaUrl: null,
    tabletMediaUrl: null,
    posterUrl: null,
    channels: ["website"],
    eyebrow: { ar: "", en: "", tr: "" },
    title: { ar: "عنوان", en: "Title", tr: "Baslik" },
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

test("STANDARD_PUBLIC_AD_LAYOUT_V1 defines exactly 8 managed placements per eligible page family", () => {
  for (const family of Object.values(STANDARD_PUBLIC_AD_LAYOUT_V1)) {
    assert.equal(Object.keys(family.placements).length, 8, `${family.key} must define 8 slots`);
  }
});

test("every standard public placement exists in the central registry and is admin-selectable website inventory", () => {
  const visible = new Set(visibleAdminPlacements().map((item) => item.key));
  for (const slot of listAllStandardPublicPlacements()) {
    const meta = AD_PLACEMENTS[slot.placement];
    assert.ok(meta, `missing registry entry for ${slot.placement}`);
    assert.equal(meta.channel, "website", `${slot.placement} must remain on the website channel`);
    assert.notEqual(meta.adminSelectable, false, `${slot.placement} must be selectable in admin`);
    assert.ok(visible.has(slot.placement), `${slot.placement} must be visible in admin placement options`);
  }
});

test("standard public placements are unique across all families", () => {
  const placements = listAllStandardPublicPlacements().map((slot) => slot.placement);
  assert.equal(new Set(placements).size, placements.length, "duplicate placement ids are forbidden");
});

test("standard placements enforce exact placement and module targeting", () => {
  const campaign = makeAd({
    placements: ["web_services_bottom_02"],
    sectionScopes: ["services"],
    pageTypes: ["listing"],
  });

  const correctCtx = buildContext({ placement: "web_services_bottom_02", path: "/services", section: "services", pageType: "listing", channel: "website", language: "ar", deviceType: "desktop" });
  const wrongPlacementCtx = buildContext({ placement: "web_services_hero", path: "/services", section: "services", pageType: "listing", channel: "website", language: "ar", deviceType: "desktop" });
  const wrongModuleCtx = buildContext({ placement: "web_property_detail_bottom_02", path: "/properties/abc", section: "properties", pageType: "details", channel: "website", language: "ar", deviceType: "desktop" });

  assert.notEqual(scoreAd(campaign, correctCtx, new Date(), undefined), null, "correct placement should be eligible");
  assert.equal(scoreAd(campaign, wrongPlacementCtx, new Date(), undefined), null, "wrong placement must be blocked");
  assert.equal(scoreAd(campaign, wrongModuleCtx, new Date(), undefined), null, "wrong module must be blocked");
});

test("enrolled pages use the standard layout while safe-zone flows remove legacy page-owned ad slots", async () => {
  const [home, services, servicesCategories, tools, requestNew, requestOffer] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/services/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/services/categories/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/tools/ToolsPageClient.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/service-requests/new/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/service-requests/[id]/offer/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(home, /StandardPublicAdLayout/);
  assert.match(home, /family="home"/);
  assert.doesNotMatch(home, /\/api\/ads\?country=/);
  assert.doesNotMatch(home, /\/api\/ad-events/);

  assert.match(services, /adLayout=\{\{ mode: "standard", family: "services" \}\}/);
  assert.doesNotMatch(services, /services_hub_mid/);
  assert.match(servicesCategories, /adLayout=\{\{ mode: "standard", family: "services" \}\}/);
  assert.doesNotMatch(servicesCategories, /services_categories_bottom/);

  assert.match(tools, /adLayout=\{\{ mode: "safe-no-ads" \}\}/);
  assert.doesNotMatch(tools, /tools_hero/);
  assert.match(requestNew, /adLayout=\{\{ mode: "safe-no-ads" \}\}/);
  assert.doesNotMatch(requestNew, /request_wizard_bottom/);
  assert.match(requestOffer, /adLayout=\{\{ mode: "safe-no-ads" \}\}/);
});
