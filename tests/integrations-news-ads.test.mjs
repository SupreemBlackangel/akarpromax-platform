import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createInMemoryDb } from "./helpers/in-memory-db.mjs";
import { setIntegrationDbForTesting } from "../lib/integration/db.ts";
import { recordNewsDelivery } from "../lib/integration/news.ts";
import { recordAdEvent } from "../lib/integration/ads.ts";
import { OFFICE_AD_PLACEMENTS } from "../lib/integration/constants.ts";

const SPONSOR = "office@akarpromax.com";

test("news delivery is recorded once per device+article (dedup)", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  await recordNewsDelivery({ newsId: "n-1", sponsorId: SPONSOR, deviceId: "dev-1" });
  await recordNewsDelivery({ newsId: "n-1", sponsorId: SPONSOR, deviceId: "dev-1" });

  const rows = db.dump("office_news_deliveries");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].news_id, "n-1");
  setIntegrationDbForTesting(null);
});

test("ad impressions are deduplicated per campaign+device+placement", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const first = await recordAdEvent({ campaignId: "ad-1", eventType: "impression", countryCode: "OM", device: "desktop", placement: "office_dashboard_hero", officeDeviceId: "dev-1" });
  assert.equal(first.recorded, true);
  const second = await recordAdEvent({ campaignId: "ad-1", eventType: "impression", countryCode: "OM", device: "desktop", placement: "office_dashboard_hero", officeDeviceId: "dev-1" });
  assert.equal(second.recorded, false);

  const clicks = await recordAdEvent({ campaignId: "ad-1", eventType: "click", countryCode: "OM", device: "desktop", placement: "office_dashboard_hero", officeDeviceId: "dev-1" });
  assert.equal(clicks.recorded, true);

  const events = db.dump("ad_events");
  assert.equal(events.length, 2, "one impression + one click");
  assert.deepEqual(events.map((e) => e.event_type).sort(), ["click", "impression"]);
  setIntegrationDbForTesting(null);
});

test("news and ads list queries cover geo-aware scoping and placements", async () => {
  const newsSource = await readFile(new URL("../lib/integration/news.ts", import.meta.url), "utf8");
  assert.match(newsSource, /date\('now'\)/);
  assert.match(newsSource, /scope = 'global'/);
  assert.match(newsSource, /lower\(country_code\)/);
  assert.match(newsSource, /LIMIT/);

  const adsSource = await readFile(new URL("../lib/integration/ads.ts", import.meta.url), "utf8");
  assert.match(adsSource, /ad_campaigns/);
  assert.match(adsSource, /is_fallback/);
  assert.match(adsSource, /weight/);
  assert.match(adsSource, /placement/);

  assert.ok(OFFICE_AD_PLACEMENTS.includes("office_dashboard_hero"));
  assert.ok(OFFICE_AD_PLACEMENTS.includes("office_news_inline"));
});

test("news and ads functions export their list contracts", async () => {
  const news = await readFile(new URL("../lib/integration/news.ts", import.meta.url), "utf8");
  assert.match(news, /export async function listOfficeNews/);
  assert.match(news, /export async function recordNewsDelivery/);
  const ads = await readFile(new URL("../lib/integration/ads.ts", import.meta.url), "utf8");
  assert.match(ads, /export async function listOfficeAds/);
  assert.match(ads, /export async function recordAdEvent/);
});
