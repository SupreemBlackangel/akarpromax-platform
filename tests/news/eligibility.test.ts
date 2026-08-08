import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  PAGE_GROUPS,
  pageGroupForPath,
  evaluatePlacement,
  isWithinLimits,
  matchesGeoScope,
  matchesLanguage,
  matchesAudience,
  isWithinSchedule,
  extendedFromRow,
  rankNews,
  standardNewsRanking,
  ZERO_LIMIT_READINGS,
} from "@/lib/news/eligibility";
import type { NewsDeliveryContext, NewsPlacement, ResolvedNewsItem } from "@/lib/news/contracts";

function placement(overrides: Partial<NewsPlacement> = {}): NewsPlacement {
  return {
    id: "p-1",
    newsId: "n-1",
    channel: "WEBSITE_TICKER",
    pageMode: "ALL_PAGES",
    pageCodes: [],
    countryCode: null,
    cityId: null,
    language: null,
    audiences: [],
    priority: 100,
    manualOrder: null,
    limits: { maxImpressions: null, maxClicks: null, maxPerUserPerDay: null, maxPerSession: null },
    startAt: null,
    endAt: null,
    status: "active",
    ...overrides,
  };
}

function context(overrides: Partial<NewsDeliveryContext> = {}): NewsDeliveryContext {
  return {
    channel: "WEBSITE_TICKER",
    countryCode: "om",
    cityId: null,
    language: "ar",
    pagePath: "/",
    now: new Date("2026-08-08T12:00:00Z"),
    ...overrides,
  };
}

describe("news page groups", () => {
  it("maps paths to page groups", () => {
    assert.equal(pageGroupForPath("/"), PAGE_GROUPS.HOME);
    assert.equal(pageGroupForPath("/properties/abc"), PAGE_GROUPS.PROPERTIES);
    assert.equal(pageGroupForPath("/services/catalog/1"), PAGE_GROUPS.SERVICES);
    assert.equal(pageGroupForPath("/tools/block-calculator"), PAGE_GROUPS.TOOLS);
    assert.equal(pageGroupForPath("/office"), PAGE_GROUPS.OFFICE);
    assert.equal(pageGroupForPath("/account/settings"), PAGE_GROUPS.ACCOUNT);
    assert.equal(pageGroupForPath("/news/feed"), PAGE_GROUPS.NEWS);
    assert.equal(pageGroupForPath("/anything-else"), PAGE_GROUPS.OTHER);
  });

  it("uses the explicit pageGroup when provided", () => {
    const result = evaluatePlacement(
      placement({ pageMode: "PAGE_GROUPS", pageCodes: ["home"] }),
      context({ pagePath: "/properties/123", pageGroup: "home" }),
      new Date(),
    );
    assert.equal(result.match, true);
  });
});

describe("news page targeting", () => {
  it("HOME-only placement matches home and misses other pages", () => {
    const target = placement({ pageMode: "SPECIFIC_PAGES", pageCodes: ["/"] });
    assert.equal(evaluatePlacement(target, context({ pagePath: "/" }), new Date()).match, true);
    assert.equal(evaluatePlacement(target, context({ pagePath: "/properties" }), new Date()).match, false);
  });

  it("wildcard page codes match prefixes", () => {
    const target = placement({ pageMode: "SPECIFIC_PAGES", pageCodes: ["/properties/*"] });
    assert.equal(evaluatePlacement(target, context({ pagePath: "/properties/om/1" }), new Date()).match, true);
    assert.equal(evaluatePlacement(target, context({ pagePath: "/services" }), new Date()).match, false);
  });

  it("PAGE_GROUPS matches property and services groups", () => {
    const target = placement({ pageMode: "PAGE_GROUPS", pageCodes: ["properties", "services"] });
    assert.equal(evaluatePlacement(target, context({ pagePath: "/properties" }), new Date()).match, true);
    assert.equal(evaluatePlacement(target, context({ pagePath: "/services/catalog" }), new Date()).match, true);
    assert.equal(evaluatePlacement(target, context({ pagePath: "/tools" }), new Date()).match, false);
  });

  it("ALL_PAGES except tools (exclude) hides tools but shows home", () => {
    const target = placement({ pageMode: "EXCLUDE_PAGES", pageCodes: ["/tools/*"] });
    assert.equal(evaluatePlacement(target, context({ pagePath: "/tools/block-calculator" }), new Date()).match, false);
    assert.equal(evaluatePlacement(target, context({ pagePath: "/" }), new Date()).match, true);
  });

  it("channel mismatch short-circuits to false", () => {
    const result = evaluatePlacement(
      placement({ channel: "OFFICE_NEWS" }),
      context({ channel: "WEBSITE_TICKER" }),
      new Date(),
    );
    assert.equal(result.match, false);
    assert.deepEqual(result.reasons, ["channel_mismatch"]);
  });
});

describe("news geo / language / audience matching", () => {
  it("geo matches when country/city agree", () => {
    const target = placement({ countryCode: "om", cityId: "om-muscat" });
    assert.equal(matchesGeoScope(target, context({ countryCode: "om", cityId: "om-muscat" })), true);
    assert.equal(matchesGeoScope(target, context({ countryCode: "sa" })), false);
  });

  it("language matching is case-insensitive and optional", () => {
    assert.equal(matchesLanguage(placement({ language: "Ar" }), "ar"), true);
    assert.equal(matchesLanguage(placement({ language: "en" }), "ar"), false);
    assert.equal(matchesLanguage(placement({ language: null }), "tr"), true);
  });

  it("audience matching requires a match when audiences are set", () => {
    const target = placement({ audiences: ["investors"] });
    assert.equal(matchesAudience(target, ["investors", "expats"]), true);
    assert.equal(matchesAudience(target, ["expats"]), false);
    assert.equal(matchesAudience(target, []), false);
    assert.equal(matchesAudience(placement({ audiences: [] }), ["anything"]), true);
  });
});

describe("news schedule windows", () => {
  const now = new Date("2026-08-08T12:00:00Z");

  it("is within schedule when active and no dates", () => {
    assert.equal(isWithinSchedule(placement({}), now), true);
  });

  it("blocks before start", () => {
    const target = placement({ startAt: "2026-08-10T00:00:00Z" });
    assert.equal(isWithinSchedule(target, now), false);
  });

  it("blocks after end", () => {
    const target = placement({ endAt: "2026-08-01T00:00:00Z" });
    assert.equal(isWithinSchedule(target, now), false);
  });

  it("allows inside the window", () => {
    const target = placement({ startAt: "2026-08-01T00:00:00Z", endAt: "2026-08-31T00:00:00Z" });
    assert.equal(isWithinSchedule(target, now), true);
  });

  it("paused placements never match", () => {
    assert.equal(isWithinSchedule(placement({ status: "paused" }), now), false);
  });

  it("evaluatePlacement reports outside_schedule reason", () => {
    const result = evaluatePlacement(placement({ endAt: "2026-01-01T00:00:00Z" }), context({ now }), now);
    assert.equal(result.match, false);
    assert.ok(result.reasons.includes("outside_schedule"));
  });
});

describe("news display limits", () => {
  it("passes with no limits set", () => {
    assert.equal(isWithinLimits(placement({}).limits, ZERO_LIMIT_READINGS).ok, true);
  });

  it("blocks when impression limit reached", () => {
    const target = placement({ limits: { maxImpressions: 100, maxClicks: null, maxPerUserPerDay: null, maxPerSession: null } });
    const result = isWithinLimits(target.limits, { ...ZERO_LIMIT_READINGS, impressions: 100 });
    assert.equal(result.ok, false);
    assert.ok(result.reasons.includes("IMPRESSION_LIMIT"));
  });

  it("blocks when click limit reached", () => {
    const target = placement({ limits: { maxImpressions: null, maxClicks: 5, maxPerUserPerDay: null, maxPerSession: null } });
    const result = isWithinLimits(target.limits, { ...ZERO_LIMIT_READINGS, clicks: 5 });
    assert.equal(result.ok, false);
    assert.ok(result.reasons.includes("CLICK_LIMIT"));
  });

  it("blocks on per-user daily and per-session limits", () => {
    const target = placement({ limits: { maxImpressions: null, maxClicks: null, maxPerUserPerDay: 3, maxPerSession: 2 } });
    const perUser = isWithinLimits(target.limits, { ...ZERO_LIMIT_READINGS, perUserToday: 3 });
    assert.equal(perUser.ok, false);
    assert.ok(perUser.reasons.includes("PER_USER_DAILY_LIMIT"));
    const perSession = isWithinLimits(target.limits, { ...ZERO_LIMIT_READINGS, perSession: 2 });
    assert.equal(perSession.ok, false);
    assert.ok(perSession.reasons.includes("PER_SESSION_LIMIT"));
  });
});

describe("news ranking", () => {
  function item(overrides: Partial<ResolvedNewsItem>): ResolvedNewsItem {
    return {
      id: "n-1",
      scope: "global",
      countryCode: null,
      cityId: null,
      titleAr: "t",
      titleEn: "t",
      titleTr: "t",
      linkUrl: null,
      priority: 100,
      summaryAr: null,
      summaryEn: null,
      summaryTr: null,
      imageUrl: null,
      isBreaking: false,
      isPinned: false,
      category: "GENERAL",
      tags: [],
      sourceName: null,
      sourceUrl: null,
      updatedAt: "2026-08-08T00:00:00.000Z",
      ...overrides,
    };
  }

  it("breaking ranks before pinned before normal", () => {
    const breaking = item({ id: "breaking", isBreaking: true });
    const pinned = item({ id: "pinned", isPinned: true });
    const normal = item({ id: "normal" });
    const ranked = rankNews([normal, pinned, breaking], standardNewsRanking);
    assert.deepEqual(ranked.map((r) => r.id), ["breaking", "pinned", "normal"]);
  });

  it("lower priority wins within the same tier", () => {
    const low = item({ id: "low", priority: 10 });
    const high = item({ id: "high", priority: 900 });
    const ranked = rankNews([high, low], standardNewsRanking);
    assert.deepEqual(ranked.map((r) => r.id), ["low", "high"]);
  });

  it("newer updatedAt wins ties", () => {
    const older = item({ id: "older", updatedAt: "2026-08-01T00:00:00.000Z" });
    const newer = item({ id: "newer", updatedAt: "2026-08-08T00:00:00.000Z" });
    const ranked = rankNews([older, newer], standardNewsRanking);
    assert.deepEqual(ranked.map((r) => r.id), ["newer", "older"]);
  });
});

describe("news extendedFromRow", () => {
  it("defaults missing extended fields", () => {
    const row = {
      id: "n-1", scope: "global", country_code: null, city_id: null,
      title_ar: "a", title_en: "e", title_tr: "t", link_url: null,
      priority: 50, status: "active", start_at: null, end_at: null,
      updated_at: "2026-08-08T00:00:00.000Z",
    };
    const resolved = extendedFromRow(row, null);
    assert.equal(resolved.category, "GENERAL");
    assert.equal(resolved.isBreaking, false);
    assert.deepEqual(resolved.tags, []);
    assert.equal(resolved.priority, 50);
  });
});
