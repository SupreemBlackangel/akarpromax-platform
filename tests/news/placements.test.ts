import { describe, it, afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { setNewsDbForTesting } from "@/lib/news/db";
import { createInMemoryDb } from "../helpers/in-memory-db.mjs";
import {
  validatePlacementInput,
  placementFromRow,
  listNewsPlacements,
  createNewsPlacement,
  updateNewsPlacement,
  deleteNewsPlacement,
  setPlacementStatus,
} from "@/lib/news/placements";

type MemDb = { seed(name: string, rows: unknown[]): void; dump(name: string): unknown[] };

function seedNews(db: MemDb, id = "n-1"): void {
  db.seed("news", [{
    id, scope: "global", country_code: null, city_id: null,
    title_ar: "خبر", title_en: "News", title_tr: "Haber",
    link_url: null, status: "active", priority: 100,
    start_at: null, end_at: null, updated_at: "2026-08-08T00:00:00.000Z",
  }]);
}

describe("news placements module (in-memory db)", () => {
  beforeEach(() => {
    setNewsDbForTesting(createInMemoryDb() as never);
  });
  afterEach(() => {
    setNewsDbForTesting(null);
  });

  it("validates placement input", () => {
    assert.equal(validatePlacementInput({ channel: "NOPE" as never }).ok, false);
    assert.equal(validatePlacementInput({ channel: "WEBSITE_TICKER", pageMode: "BAD" as never }).ok, true);

    const good = validatePlacementInput({
      channel: "OFFICE_NEWS",
      pageMode: "PAGE_GROUPS",
      pageCodes: ["office", "account"],
      countryCode: "OM",
      audiences: ["investors"],
      priority: 50,
      manualOrder: "3" as never,
      limits: { maxImpressions: 100, maxClicks: 0, maxPerUserPerDay: "" as never, maxPerSession: null },
    });
    assert.equal(good.ok, true);
    assert.equal(good.normalized?.channel, "OFFICE_NEWS");
    assert.equal(good.normalized?.countryCode, "om");
    assert.equal(good.normalized?.manualOrder, 3);
    assert.equal(good.normalized?.limits?.maxImpressions, 100);
    assert.equal(good.normalized?.limits?.maxPerUserPerDay, null);
    assert.equal(good.normalized?.status, "active");
  });

  it("create requires an existing news row", async () => {
    await assert.rejects(
      () => createNewsPlacement("missing", { channel: "WEBSITE_NEWS" }),
      /News item not found/,
    );
  });

  it("creates and lists placements for a news item", async () => {
    const db = newDb();
    seedNews(db);
    const placement = await createNewsPlacement("n-1", {
      channel: "OFFICE_NEWS",
      pageMode: "SPECIFIC_PAGES",
      pageCodes: ["/office"],
      countryCode: "om",
      limits: { maxImpressions: 500, maxClicks: 50, maxPerUserPerDay: 5, maxPerSession: 2 },
    });
    assert.ok(placement.id);
    assert.equal(placement.channel, "OFFICE_NEWS");
    assert.deepEqual(placement.pageCodes, ["/office"]);
    assert.equal(placement.limits.maxImpressions, 500);

    const byNews = await listNewsPlacements("n-1");
    assert.equal(byNews.length, 1);
    const byChannel = await listNewsPlacements(undefined, "OFFICE_NEWS");
    assert.equal(byChannel.length, 1);
    const otherChannel = await listNewsPlacements(undefined, "WEBSITE_TICKER");
    assert.equal(otherChannel.length, 0);
  });

  it("updates placement fields", async () => {
    const db = newDb();
    seedNews(db);
    const placement = await createNewsPlacement("n-1", { channel: "WEBSITE_NEWS" });
    const updated = await updateNewsPlacement(placement.id, {
      pageMode: "PAGE_GROUPS",
      pageCodes: ["home"],
      status: "paused",
    });
    assert.equal(updated.pageMode, "PAGE_GROUPS");
    assert.deepEqual(updated.pageCodes, ["home"]);
    assert.equal(updated.status, "paused");
    assert.equal(updated.channel, "WEBSITE_NEWS");
  });

  it("newsId cannot be reassigned via update (placement is tied to its news item)", async () => {
    const db = newDb();
    seedNews(db, "n-1");
    seedNews(db, "n-2");
    const placement = await createNewsPlacement("n-1", { channel: "WEBSITE_NEWS" });
    const updated = await updateNewsPlacement(placement.id, { newsId: "n-2" });
    assert.equal(updated.newsId, "n-1");
  });

  it("setPlacementStatus toggles active/paused", async () => {
    const db = newDb();
    seedNews(db);
    const placement = await createNewsPlacement("n-1", { channel: "WEBSITE_NEWS" });
    const paused = await setPlacementStatus(placement.id, "paused");
    assert.equal(paused.status, "paused");
    const active = await setPlacementStatus(placement.id, "active");
    assert.equal(active.status, "active");
  });

  it("delete removes the placement", async () => {
    const db = newDb();
    seedNews(db);
    const placement = await createNewsPlacement("n-1", { channel: "WEBSITE_NEWS" });
    await deleteNewsPlacement(placement.id);
    assert.equal((await listNewsPlacements("n-1")).length, 0);
  });

  it("round-trips through placementFromRow for delivery consumers", () => {
    const row = {
      id: "p-1", news_id: "n-1", channel: "WEBSITE_TICKER", page_mode: "EXCLUDE_PAGES",
      page_codes: JSON.stringify(["/tools/*"]), country_code: "om", city_id: "om-muscat",
      language: "ar", audiences: JSON.stringify(["expats"]), priority: 200,
      manual_order: 2, max_impressions: 10, max_clicks: 20,
      max_per_user_per_day: 30, max_per_session: 40,
      start_at: "2026-08-01", end_at: "2026-08-31", status: "active",
    };
    const placement = placementFromRow(row as never);
    assert.equal(placement.channel, "WEBSITE_TICKER");
    assert.equal(placement.pageMode, "EXCLUDE_PAGES");
    assert.deepEqual(placement.pageCodes, ["/tools/*"]);
    assert.deepEqual(placement.audiences, ["expats"]);
    assert.equal(placement.limits.maxImpressions, 10);
    assert.equal(placement.priority, 200);
    assert.equal(placement.manualOrder, 2);
  });
});

function newDb(): MemDb {
  const db = createInMemoryDb() as never as MemDb;
  setNewsDbForTesting(db as never);
  return db;
}
