import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { AD_PLACEMENTS, visibleAdminPlacements } from "../src/constants/advertising.ts";
import { STANDARD_PUBLIC_AD_LAYOUT_V1, listAllStandardPublicPlacements } from "../src/config/standard-public-ad-layout.ts";

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
