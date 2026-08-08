import { describe, it, afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { setNewsDbForTesting } from "@/lib/news/db";
import { createInMemoryDb } from "../helpers/in-memory-db.mjs";
import { dayKey, isBotLike, recordNewsEvent, incrementCounter } from "@/lib/news/analytics";

function request(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/news/telemetry", { headers });
}

describe("news analytics (in-memory db)", () => {
  beforeEach(() => {
    setNewsDbForTesting(createInMemoryDb() as never);
  });
  afterEach(() => {
    setNewsDbForTesting(null);
  });

  it("dayKey returns UTC date slice", () => {
    assert.equal(dayKey(new Date("2026-08-08T23:59:59Z")), "2026-08-08");
  });

  it("isBotLike flags prefetch and headless UAs", () => {
    assert.equal(isBotLike(request({ "Sec-Purpose": "prefetch" })), true);
    assert.equal(isBotLike(request({ "X-Moz": "prefetch" })), true);
    assert.equal(isBotLike(request({ "User-Agent": "SomeBot/1.0" })), true);
    assert.equal(isBotLike(request({ "User-Agent": "HeadlessChrome" })), true);
    assert.equal(isBotLike(request({ "User-Agent": "Mozilla/5.0 Chrome/120" })), false);
    assert.equal(isBotLike(null), false);
    assert.equal(isBotLike(undefined), false);
  });

  it("records a valid visible impression and increments counters", async () => {
    const mem = createInMemoryDb() as never;
    setNewsDbForTesting(mem);

    await recordNewsEvent({
      newsId: "n-1", channel: "WEBSITE_TICKER", eventType: "visible_impression",
      placementId: "p-1", visible: true, userKey: "u-1", sessionKey: "s-1",
    });

    const events = (mem as never as { dump(name: string): unknown[] }).dump("news_events");
    assert.equal(events.length, 1);
    assert.equal((events[0] as Record<string, unknown>).valid, 1);

    const counters = (mem as never as { dump(name: string): unknown[] }).dump("news_delivery_counters");
    assert.equal(counters.length, 1);
    const row = counters[0] as Record<string, unknown>;
    assert.equal(row.visible_impressions, 1);
    assert.equal(row.impressions, 0);
    assert.equal(row.clicks, 0);
  });

  it("flags visible impression without visible flag as invalid (no counter)", async () => {
    const mem = createInMemoryDb() as never;
    setNewsDbForTesting(mem);
    await recordNewsEvent({
      newsId: "n-1", channel: "WEBSITE_TICKER", eventType: "visible_impression", visible: false,
    });
    const db = mem as never as { dump(name: string): unknown[] };
    const events = db.dump("news_events");
    assert.equal(events.length, 1);
    assert.equal((events[0] as Record<string, unknown>).valid, 0);
    assert.equal(db.dump("news_delivery_counters").length, 0);
  });

  it("records valid click from real user and increments click counter", async () => {
    const mem = createInMemoryDb() as never;
    setNewsDbForTesting(mem);
    await recordNewsEvent({
      newsId: "n-1", channel: "WEBSITE_NEWS", eventType: "click",
      userKey: "u-1", sessionKey: "s-1", request: request({ "User-Agent": "Mozilla/5.0 Chrome/120" }),
    });
    const db = mem as never as { dump(name: string): unknown[] };
    const counters = db.dump("news_delivery_counters");
    assert.equal(counters.length, 1);
    assert.equal((counters[0] as Record<string, unknown>).clicks, 1);
  });

  it("counts bot click as recorded but invalid, without counter consumption", async () => {
    const mem = createInMemoryDb() as never;
    setNewsDbForTesting(mem);
    const result = await recordNewsEvent({
      newsId: "n-1", channel: "WEBSITE_NEWS", eventType: "click",
      request: request({ "User-Agent": "Googlebot" }),
    });
    assert.equal(result.recorded, true);
    assert.equal(result.valid, false);
    const db = mem as never as { dump(name: string): unknown[] };
    assert.equal(db.dump("news_delivery_counters").length, 0);
  });

  it("click without prior impression is counted for CTR but flagged valid=0", async () => {
    const mem = createInMemoryDb() as never;
    setNewsDbForTesting(mem);
    const result = await recordNewsEvent({
      newsId: "n-1", channel: "WEBSITE_NEWS", eventType: "click", sessionKey: "s-1",
      request: request({ "User-Agent": "Mozilla/5.0" }),
    });
    assert.equal(result.recorded, true);
    assert.equal(result.valid, true);
    const db = mem as never as { dump(name: string): unknown[] };
    const events = db.dump("news_events");
    assert.equal(events.length, 1);
    assert.equal((events[0] as Record<string, unknown>).valid, 1);
    assert.equal((events[0] as Record<string, unknown>).event_type, "click");
  });

  it("ignores unsupported event types", async () => {
    const mem = createInMemoryDb() as never;
    setNewsDbForTesting(mem);
    const result = await recordNewsEvent({
      newsId: "n-1", channel: "WEBSITE_NEWS", eventType: "pause",
    });
    assert.equal(result.recorded, false);
    assert.equal(result.valid, false);
  });

  it("incrementCounter accumulates across multiple calls for the same user", async () => {
    const mem = createInMemoryDb() as never;
    setNewsDbForTesting(mem);
    await incrementCounter("n-1", "p-1", "WEBSITE_NEWS", { impressions: 1, userKey: "u-1", sessionKey: "s-1" });
    await incrementCounter("n-1", "p-1", "WEBSITE_NEWS", { impressions: 1, clicks: 1, userKey: "u-1", sessionKey: "s-1" });
    const db = mem as never as { dump(name: string): unknown[] };
    const counters = db.dump("news_delivery_counters");
    assert.equal(counters.length, 1);
    assert.equal((counters[0] as Record<string, unknown>).impressions, 2);
    assert.equal((counters[0] as Record<string, unknown>).clicks, 1);
  });
});
