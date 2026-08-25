import assert from "node:assert/strict";
import test from "node:test";

import {
  STANDARD_PUBLIC_AD_FAMILY_DEFINITIONS,
  STANDARD_PUBLIC_AD_SLOT_DEFINITIONS,
} from "../src/config/standard-public-ad-registry.ts";
import { STANDARD_PUBLIC_AD_LAYOUT_V1 } from "../src/config/standard-public-ad-layout.ts";
import { PUBLIC_ROUTE_AD_POLICIES } from "../src/config/public-ad-policy.ts";
import { PUBLIC_NAV } from "../src/config/public-navigation.ts";
import { PUBLIC_DESTINATIONS } from "../src/content/public-destinations.ts";
import { AD_PLACEMENTS, canonicalPlacementFor } from "../src/constants/advertising.ts";
import { AD_PLACEMENT_REGISTRY } from "../src/config/ad-placements.ts";

test("standard public ad families and slots are derived from the canonical registry", () => {
  const familyKeys = Object.keys(STANDARD_PUBLIC_AD_FAMILY_DEFINITIONS).sort();
  assert.deepEqual(Object.keys(STANDARD_PUBLIC_AD_LAYOUT_V1).sort(), familyKeys);
  assert.equal(familyKeys.length, 20);
  assert.equal(Object.keys(STANDARD_PUBLIC_AD_SLOT_DEFINITIONS).length, 8);

  for (const [familyKey, family] of Object.entries(STANDARD_PUBLIC_AD_FAMILY_DEFINITIONS)) {
    const layout = STANDARD_PUBLIC_AD_LAYOUT_V1[familyKey];
    assert.ok(layout, `missing layout family ${familyKey}`);
    assert.deepEqual(layout.pageLabel, family.label);
    assert.equal(layout.heroEnabled, family.heroEnabled);

    for (const [slotKey, slot] of Object.entries(STANDARD_PUBLIC_AD_SLOT_DEFINITIONS)) {
      const config = layout.placements[slotKey];
      assert.ok(config, `missing ${familyKey}.${slotKey}`);
      assert.equal(config.canonical, slot.canonical);
      assert.equal(config.placement, `${family.prefix}_${slot.placementSuffix}`);
      assert.ok(AD_PLACEMENTS[config.placement], `engine placement missing: ${config.placement}`);
      assert.equal(AD_PLACEMENTS[config.placement].pageFamily, familyKey);
      assert.equal(canonicalPlacementFor(config.placement), slot.canonical);
    }
  }
});

test("top-level public navigation and destination pages share one ad policy", () => {
  for (const item of PUBLIC_NAV) {
    const expected = PUBLIC_ROUTE_AD_POLICIES[item.href];
    assert.ok(expected, `missing route policy for ${item.href}`);
    assert.deepEqual(item.adPolicy, expected);
  }

  for (const page of Object.values(PUBLIC_DESTINATIONS)) {
    const expected = PUBLIC_ROUTE_AD_POLICIES[page.currentPath];
    assert.ok(expected, `missing destination policy for ${page.currentPath}`);
    assert.deepEqual(page.adLayout, expected);
  }

  for (const route of ["/tools", "/advertise", "/contact"]) {
    assert.equal(PUBLIC_ROUTE_AD_POLICIES[route].mode, "standard");
  }

});

test("legacy public placement registry only points to known engine placements", () => {
  for (const config of Object.values(AD_PLACEMENT_REGISTRY)) {
    if (!config.used || !config.placement) continue;
    assert.ok(AD_PLACEMENTS[config.placement], `unknown used placement: ${config.placement}`);
  }
});
