import { describe, it, afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { setNewsDbForTesting } from "@/lib/news/db";
import { createInMemoryDb } from "../helpers/in-memory-db.mjs";
import { resolveForChannel, resolveNewsFeed, resolveTickerForContext } from "@/lib/news/delivery";

type MemDb = { seed(name: string, rows: unknown[]): void; dump(name: string): unknown[] };

function newDb(): MemDb {
  const db = createInMemoryDb() as never as MemDb;
  setNewsDbForTesting(db as never);
  return db;
}

function seedNewsRow(db: MemDb, row: Record<string, unknown>): void {
  db.seed("news", [
    {
      id: "n-1", scope: "global", country_code: null, city_id: null,
      title_ar: "عناوين أول", title_en: "First headline", title_tr: "İlk başlık",
      link_url: "https://example.com/1", priority: 100, status: "active",
      start_at: null, end_at: null, updated_at: "2026-08-08T00:00:00.000Z",
      ...row,
    },
  ]);
}

describe("news delivery resolution (in-memory db)", () => {
  beforeEach(() => {
    setNewsDbForTesting(createInMemoryDb() as never);
  });
  afterEach(() => {
    setNewsDbForTesting(null);
  });

  it("returns empty when no active rows exist", async () => {
    const result = await resolveForChannel({
      channel: "WEBSITE_TICKER", countryCode: "om", language: "ar", pagePath: "/",
    });
    assert.deepEqual(result.items, []);
    assert.equal(result.channel, "WEBSITE_TICKER");
  });

  it("delivers a global active row on any channel via default placement", async () => {
    const db = newDb();
    seedNewsRow(db, {});
    db.seed("news_extended", [{
      news_id: "n-1", category: "GENERAL", tags: JSON.stringify(["market"]),
      is_breaking: 0, is_pinned: 0, review_status: "APPROVED",
    }]);

    const ticker = await resolveTickerForContext({ channel: "WEBSITE_TICKER", countryCode: "om", language: "ar", pagePath: "/" });
    assert.equal(ticker.length, 1);
    assert.equal(ticker[0].id, "n-1");
    assert.equal(ticker[0].category, "GENERAL");
    assert.deepEqual(ticker[0].tags, ["market"]);

    const feed = await resolveNewsFeed({ channel: "WEBSITE_NEWS", countryCode: "om", language: "en", pagePath: "/" });
    assert.equal(feed.length, 1);
  });

  it("filters out expired and scheduled-future rows", async () => {
    const db = newDb();
    seedNewsRow(db, { id: "active", updated_at: "2026-08-08T00:00:00.000Z" });
    seedNewsRow(db, { id: "expired", end_at: "2026-01-01", updated_at: "2026-01-01T00:00:00.000Z" });
    seedNewsRow(db, { id: "future", start_at: "2030-01-01", updated_at: "2026-08-08T00:00:00.000Z" });

    const result = await resolveForChannel({
      channel: "WEBSITE_TICKER", countryCode: "om", language: "ar", pagePath: "/",
    });
    assert.deepEqual(result.items.map((i) => i.id), ["active"]);
  });

  it("website vs office channels are separate", async () => {
    const db = newDb();
    seedNewsRow(db, { id: "web", updated_at: "2026-08-08T00:00:00.000Z" });
    seedNewsRow(db, { id: "office", updated_at: "2026-08-08T00:00:00.000Z" });
    db.seed("news_placements", [
      {
        id: "p-web", news_id: "web", channel: "WEBSITE_NEWS", page_mode: "ALL_PAGES",
        page_codes: "[]", country_code: null, city_id: null, language: null,
        audiences: "[]", priority: 100, manual_order: null, max_impressions: null,
        max_clicks: null, max_per_user_per_day: null, max_per_session: null,
        start_at: null, end_at: null, status: "active",
      },
      {
        id: "p-office", news_id: "office", channel: "OFFICE_NEWS", page_mode: "ALL_PAGES",
        page_codes: "[]", country_code: null, city_id: null, language: null,
        audiences: "[]", priority: 100, manual_order: null, max_impressions: null,
        max_clicks: null, max_per_user_per_day: null, max_per_session: null,
        start_at: null, end_at: null, status: "active",
      },
    ]);

    const web = await resolveNewsFeed({ channel: "WEBSITE_NEWS", countryCode: "om", language: "ar", pagePath: "/" });
    assert.deepEqual(web.map((i) => i.id), ["web"]);

    const office = await resolveNewsFeed({ channel: "OFFICE_NEWS", countryCode: "om", language: "ar", pagePath: "/office" });
    assert.deepEqual(office.map((i) => i.id), ["office"]);
  });

  it("respects page targeting and geo targeting for placements", async () => {
    const db = newDb();
    seedNewsRow(db, { id: "home", country_code: "om", updated_at: "2026-08-08T00:00:00.000Z" });
    seedNewsRow(db, { id: "props", country_code: "om", updated_at: "2026-08-08T00:00:00.000Z" });
    db.seed("news_placements", [
      {
        id: "p-home", news_id: "home", channel: "WEBSITE_TICKER", page_mode: "SPECIFIC_PAGES",
        page_codes: JSON.stringify(["/"]), country_code: "om", city_id: null,
        language: null, audiences: "[]", priority: 100, manual_order: null,
        max_impressions: null, max_clicks: null, max_per_user_per_day: null,
        max_per_session: null, start_at: null, end_at: null, status: "active",
      },
      {
        id: "p-props", news_id: "props", channel: "WEBSITE_TICKER", page_mode: "PAGE_GROUPS",
        page_codes: JSON.stringify(["properties", "services"]), country_code: "sa",
        city_id: null, language: null, audiences: "[]", priority: 100,
        manual_order: null, max_impressions: null, max_clicks: null,
        max_per_user_per_day: null, max_per_session: null,
        start_at: null, end_at: null, status: "active",
      },
    ]);

    const home = await resolveTickerForContext({ channel: "WEBSITE_TICKER", countryCode: "om", language: "ar", pagePath: "/" });
    assert.deepEqual(home.map((i) => i.id), ["home"]);

    const propsInSa = await resolveTickerForContext({ channel: "WEBSITE_TICKER", countryCode: "sa", language: "ar", pagePath: "/properties" });
    assert.deepEqual(propsInSa.map((i) => i.id), ["props"]);

    const propsInOm = await resolveTickerForContext({ channel: "WEBSITE_TICKER", countryCode: "om", language: "ar", pagePath: "/properties" });
    assert.deepEqual(propsInOm.map((i) => i.id), []);
  });

  it("blocks placement when impression limit reached via counters", async () => {
    const db = newDb();
    seedNewsRow(db, { id: "limited", updated_at: "2026-08-08T00:00:00.000Z" });
    db.seed("news_placements", [{
      id: "p-limited", news_id: "limited", channel: "WEBSITE_NEWS", page_mode: "ALL_PAGES",
      page_codes: "[]", country_code: null, city_id: null, language: null,
      audiences: "[]", priority: 100, manual_order: null, max_impressions: 5,
      max_clicks: null, max_per_user_per_day: null, max_per_session: null,
      start_at: null, end_at: null, status: "active",
    }]);
    db.seed("news_delivery_counters", [{
      id: "c-1", news_id: "limited", placement_id: "p-limited", channel: "WEBSITE_NEWS",
      day: new Date().toISOString().slice(0, 10), user_key: null, session_key: null,
      impressions: 5, visible_impressions: 5, clicks: 0,
    }]);

    const result = await resolveNewsFeed({ channel: "WEBSITE_NEWS", countryCode: "om", language: "ar", pagePath: "/" });
    assert.equal(result.length, 0);
  });

  it("manualOrder boosts an item ahead regardless of natural ranking", async () => {
    const db = newDb();
    seedNewsRow(db, { id: "low", priority: 999, updated_at: "2026-08-08T00:00:00.000Z" });
    seedNewsRow(db, { id: "high", priority: 1, updated_at: "2026-08-07T00:00:00.000Z" });
    db.seed("news_placements", [
      {
        id: "p-low", news_id: "low", channel: "WEBSITE_NEWS", page_mode: "ALL_PAGES",
        page_codes: "[]", country_code: null, city_id: null, language: null,
        audiences: "[]", priority: 999, manual_order: 50, max_impressions: null,
        max_clicks: null, max_per_user_per_day: null, max_per_session: null,
        start_at: null, end_at: null, status: "active",
      },
      {
        id: "p-high", news_id: "high", channel: "WEBSITE_NEWS", page_mode: "ALL_PAGES",
        page_codes: "[]", country_code: null, city_id: null, language: null,
        audiences: "[]", priority: 1, manual_order: null, max_impressions: null,
        max_clicks: null, max_per_user_per_day: null, max_per_session: null,
        start_at: null, end_at: null, status: "active",
      },
    ]);
    const result = await resolveNewsFeed({ channel: "WEBSITE_NEWS", countryCode: "om", language: "ar", pagePath: "/" });
    assert.deepEqual(result.map((i) => i.id), ["low", "high"]);
  });
});
