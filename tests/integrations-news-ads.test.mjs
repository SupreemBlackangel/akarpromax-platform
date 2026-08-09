import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createInMemoryDb } from "./helpers/in-memory-db.mjs";
import { setIntegrationDbForTesting } from "../lib/integration/db.ts";
import { recordNewsDelivery } from "../lib/integration/news.ts";
import { recordAdEvent } from "../lib/integration/ads.ts";
import { setNewsDbForTesting } from "../lib/news/db.ts";
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
  assert.match(newsSource, /resolveForChannel/);
  assert.match(newsSource, /OFFICE_NEWS|OFFICE_TICKER/);
  assert.match(newsSource, /countryCode/);
  assert.match(newsSource, /pagePath/);

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

test("office news delivery respects placement channels (no website leak)", async () => {
  const db = setNewsDbForTesting(createInMemoryDb());
  const MemDb = db;
  const now = new Date().toISOString();
  MemDb.seed("news", [
    {
      id: "office-only", scope: "country", country_code: "om", city_id: null,
      title_ar: "Office Only AR", title_en: "Office Only", title_tr: "Office Only TR",
      link_url: null, priority: 1, status: "active", start_at: null, end_at: null, updated_at: now,
    },
    {
      id: "website-only", scope: "country", country_code: "om", city_id: null,
      title_ar: "Website AR", title_en: "Website Only", title_tr: "Website TR",
      link_url: null, priority: 1, status: "active", start_at: null, end_at: null, updated_at: now,
    },
  ]);
  MemDb.seed("news_placements", [
    {
      id: "p-off", news_id: "office-only", channel: "OFFICE_TICKER", page_mode: "ALL_PAGES",
      page_codes: "[]", country_code: "om", city_id: null, language: null, audiences: "[]",
      priority: 1, manual_order: null, max_impressions: null, max_clicks: null,
      max_per_user_per_day: null, max_per_session: null, start_at: null, end_at: null,
      status: "active",
    },
    {
      id: "p-web", news_id: "website-only", channel: "WEBSITE_TICKER", page_mode: "ALL_PAGES",
      page_codes: "[]", country_code: "om", city_id: null, language: null, audiences: "[]",
      priority: 1, manual_order: null, max_impressions: null, max_clicks: null,
      max_per_user_per_day: null, max_per_session: null, start_at: null, end_at: null,
      status: "active",
    },
  ]);

  const { listOfficeNews } = await import("../lib/integration/news.ts");
  const office = await listOfficeNews({ countryCode: "om", channel: "OFFICE_TICKER" });
  assert.equal(office.length, 1, "office ticker must not include website-only items");
  assert.equal(office[0].id, "office-only");
  setNewsDbForTesting(null);
  setIntegrationDbForTesting(null);
});
