import assert from "node:assert/strict";
import test from "node:test";

import { formatDateTime, statDate } from "../lib/ads/geo.ts";
import { loadEngineStats } from "../lib/ads/engine.ts";

/**
 * ad_daily_statistics.stat_date is a DAY key. The engine used to read it with
 * formatDateTime() ("2026-09-02 18:52:45") while events.ts writes it with
 * statDate() ("2026-09-02"), so the lookup never matched and every daily cap
 * was silently inert. The earlier budget test injected a stats map directly,
 * which bypassed this read entirely — hence these tests drive the real query.
 */

test("the day key the engine reads with matches the one events write", () => {
  const now = new Date("2026-09-02T18:52:45Z");
  assert.equal(statDate(now).length, 10, "stat_date is a 10-char day key");
  assert.notEqual(formatDateTime(now), statDate(now), "the two formats genuinely differ");
});

test("loadEngineStats queries ad_daily_statistics with the day key", async () => {
  const bound = [];
  const db = {
    prepare(sql) {
      const q = { sql, args: [] };
      return {
        bind(...args) { q.args = args; bound.push(q); return this; },
        all: async () => ({ results: [] }),
        first: async () => null,
      };
    },
  };

  const ctx = { placement: "web_home_hero", section: "home", pageType: "home", channel: "website", language: "ar", deviceType: "desktop" };
  await loadEngineStats(db, ctx, new Date("2026-09-02T18:52:45Z"));

  const dailyQuery = bound.find((q) => q.sql.includes("ad_daily_statistics"));
  assert.ok(dailyQuery, "the daily statistics table should be queried");
  assert.equal(
    dailyQuery.args[0],
    "2026-09-02",
    "must bind the day key — binding a full timestamp matches no row and silently disables daily caps",
  );
});
