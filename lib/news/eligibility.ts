/**
 * News & Ticker Engine — targeting + eligibility (pure logic).
 *
 * All eligibility decisions (page/geo/language/audience targeting, time
 * windows, channel routing, limit checks) are pure functions here so the
 * behavior is deterministic and unit-testable without a database. The
 * DB-backed delivery layer calls into these with rows read from the runtime
 * DB.
 */

import type {
  NewsDeliveryContext,
  NewsExtended,
  NewsPlacement,
  NewsLimitSet,
  PageTargetMode,
  ResolvedNewsItem,
} from "@/lib/news/contracts";

export const PAGE_GROUPS = {
  HOME: "home",
  PROPERTIES: "properties",
  SERVICES: "services",
  TOOLS: "tools",
  OFFICE: "office",
  ACCOUNT: "account",
  NEWS: "news",
  OTHER: "other",
} as const;

export type PageGroup = (typeof PAGE_GROUPS)[keyof typeof PAGE_GROUPS];

export function pageGroupForPath(path: string): PageGroup | null {
  const p = `/${path.replace(/^\/+/, "").split(/[/?#]/)[0].toLowerCase()}`;
  if (p === "/") return PAGE_GROUPS.HOME;
  if (p.startsWith("/properties")) return PAGE_GROUPS.PROPERTIES;
  if (p.startsWith("/services")) return PAGE_GROUPS.SERVICES;
  if (p.startsWith("/tools")) return PAGE_GROUPS.TOOLS;
  if (p.startsWith("/office")) return PAGE_GROUPS.OFFICE;
  if (p.startsWith("/account")) return PAGE_GROUPS.ACCOUNT;
  if (p.startsWith("/news")) return PAGE_GROUPS.NEWS;
  return PAGE_GROUPS.OTHER;
}

function matchesPageCodes(mode: PageTargetMode, codes: string[], path: string, group: PageGroup | null): boolean {
  if (mode === "ALL_PAGES") return true;
  if (!codes.length) return mode === "EXCLUDE_PAGES";
  if (mode === "SPECIFIC_PAGES") {
    return codes.some((code) => {
      if (code === "/") return path === "/" || path === "";
      if (code.endsWith("/*")) return path.startsWith(code.slice(0, -1));
      return path === code || path === code.replace(/\/+$/, "");
    });
  }
  if (mode === "PAGE_GROUPS") {
    return codes.some((code) => code.toLowerCase() === (group ?? ""));
  }
  if (mode === "EXCLUDE_PAGES") {
    return !codes.some((code) => {
      if (code === "/") return path === "/" || path === "";
      if (code.endsWith("/*")) return path.startsWith(code.slice(0, -1));
      return path === code || path === code.replace(/\/+$/, "");
    });
  }
  return true;
}

export function matchesGeoScope(
  placement: NewsPlacement,
  context: NewsDeliveryContext,
): boolean {
  if (placement.countryCode && placement.countryCode.toLowerCase() !== context.countryCode.toLowerCase()) {
    return false;
  }
  if (placement.cityId && context.cityId && placement.cityId.toLowerCase() !== context.cityId.toLowerCase()) {
    return false;
  }
  return true;
}

export function matchesLanguage(placement: NewsPlacement, language: string): boolean {
  if (!placement.language) return true;
  return placement.language.toLowerCase() === language.toLowerCase();
}

export function matchesAudience(
  placement: NewsPlacement,
  audiences: readonly string[],
): boolean {
  if (!placement.audiences.length) return true;
  if (!audiences.length) return false;
  return placement.audiences.some((a) => audiences.includes(a));
}

export function isWithinSchedule(
  placement: NewsPlacement,
  now: Date,
): boolean {
  if (placement.status !== "active") return false;
  if (placement.startAt) {
    const start = Date.parse(placement.startAt);
    if (Number.isFinite(start) && now.getTime() < start) return false;
  }
  if (placement.endAt) {
    const end = Date.parse(placement.endAt);
    if (Number.isFinite(end) && now.getTime() > end) return false;
  }
  return true;
}

export type PlacementEligibility = {
  placement: NewsPlacement;
  match: boolean;
  reasons: string[];
};

export function evaluatePlacement(
  placement: NewsPlacement,
  context: NewsDeliveryContext,
  now: Date,
): PlacementEligibility {
  const reasons: string[] = [];
  if (placement.channel !== context.channel) {
    return { placement, match: false, reasons: ["channel_mismatch"] };
  }
  const resolvedGroup = (context.pageGroup ?? pageGroupForPath(context.pagePath)) as PageGroup | null;
  if (!matchesPageCodes(placement.pageMode, placement.pageCodes, context.pagePath, resolvedGroup)) {
    reasons.push("page_target_mismatch");
  }
  if (!matchesGeoScope(placement, context)) {
    reasons.push("geo_mismatch");
  }
  if (!matchesLanguage(placement, context.language)) {
    reasons.push("language_mismatch");
  }
  if (!matchesAudience(placement, context.audiences ?? [])) {
    reasons.push("audience_mismatch");
  }
  if (!isWithinSchedule(placement, now)) {
    reasons.push(placement.status !== "active" ? "placement_paused" : "outside_schedule");
  }
  return { placement, match: reasons.length === 0, reasons };
}

export type LimitReadings = {
  impressions: number;
  visibleImpressions: number;
  clicks: number;
  perUserToday: number;
  perSession: number;
};

export function isWithinLimits(limits: NewsLimitSet, readings: LimitReadings): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (limits.maxImpressions != null && readings.impressions >= limits.maxImpressions) {
    reasons.push("IMPRESSION_LIMIT");
  }
  if (limits.maxClicks != null && readings.clicks >= limits.maxClicks) {
    reasons.push("CLICK_LIMIT");
  }
  if (limits.maxPerUserPerDay != null && readings.perUserToday >= limits.maxPerUserPerDay) {
    reasons.push("PER_USER_DAILY_LIMIT");
  }
  if (limits.maxPerSession != null && readings.perSession >= limits.maxPerSession) {
    reasons.push("PER_SESSION_LIMIT");
  }
  return { ok: reasons.length === 0, reasons };
}

export const ZERO_LIMIT_READINGS: LimitReadings = {
  impressions: 0,
  visibleImpressions: 0,
  clicks: 0,
  perUserToday: 0,
  perSession: 0,
};

export type NewsRowLike = {
  id: string;
  scope: string;
  country_code: string | null;
  city_id: string | null;
  title_ar: string;
  title_en: string;
  title_tr: string;
  link_url: string | null;
  priority: number;
  status: string;
  start_at: string | null;
  end_at: string | null;
  updated_at: string;
};

export function extendedFromRow(row: NewsRowLike, ext: NewsExtended | null): ResolvedNewsItem {
  return {
    id: row.id,
    scope: row.scope,
    countryCode: row.country_code,
    cityId: row.city_id,
    titleAr: row.title_ar,
    titleEn: row.title_en,
    titleTr: row.title_tr,
    linkUrl: row.link_url,
    priority: Number(row.priority),
    summaryAr: ext?.summaryAr ?? null,
    summaryEn: ext?.summaryEn ?? null,
    summaryTr: ext?.summaryTr ?? null,
    imageUrl: ext?.imageUrl ?? null,
    isBreaking: ext?.isBreaking ?? false,
    isPinned: ext?.isPinned ?? false,
    category: ext?.category ?? "GENERAL",
    tags: ext?.tags ?? [],
    sourceName: ext?.sourceName ?? null,
    sourceUrl: ext?.sourceUrl ?? null,
    updatedAt: row.updated_at,
  };
}

export function rankNews(items: ResolvedNewsItem[], ranking: (item: ResolvedNewsItem) => number): ResolvedNewsItem[] {
  return [...items].sort((a, b) => {
    const ra = ranking(a);
    const rb = ranking(b);
    if (ra !== rb) return ra - rb;
    return String(b.updatedAt).localeCompare(String(a.updatedAt));
  });
}

export function standardNewsRanking(item: ResolvedNewsItem): number {
  let rank = 0;
  if (item.isBreaking) rank -= 100_000;
  if (item.isPinned) rank -= 50_000;
  rank += Number(item.priority) || 100;
  return rank;
}
