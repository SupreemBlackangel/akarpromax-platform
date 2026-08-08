/**
 * News & Ticker Engine — delivery resolution.
 *
 * Central resolution service. `resolveNewsFeed(context)` and
 * `resolveTickerForContext(context)` load active news rows + rich extended
 * fields + placements from the runtime DB, evaluate page/geo/language/audience
 * targeting and display limits in pure code, then rank deterministically.
 * The website, Office and ticker channels all go through here — React never
 * re-implements eligibility.
 */

import type {
  NewsChannel,
  NewsDeliveryContext,
  NewsExtended,
  NewsLimitSet,
  NewsPlacement,
  ResolvedNewsItem,
} from "@/lib/news/contracts";
import { getNewsDb } from "@/lib/news/db";
import {
  evaluatePlacement,
  extendedFromRow,
  isWithinLimits,
  pageGroupForPath,
  rankNews,
  standardNewsRanking,
  type LimitReadings,
  type NewsRowLike,
} from "@/lib/news/eligibility";

type ExtendedRow = {
  news_id: string;
  slug: string | null;
  summary_ar: string | null;
  summary_en: string | null;
  summary_tr: string | null;
  body_ar: string | null;
  body_en: string | null;
  body_tr: string | null;
  category: string | null;
  tags: string | null;
  image_url: string | null;
  is_breaking: number | null;
  is_pinned: number | null;
  language: string | null;
  news_type: string | null;
  source_name: string | null;
  source_url: string | null;
  source_published_at: string | null;
  fetched_at: string | null;
  content_hash: string | null;
  external_id: string | null;
  review_status: string | null;
};

type PlacementRow = {
  id: string;
  news_id: string;
  channel: string;
  page_mode: string;
  page_codes: string;
  country_code: string | null;
  city_id: string | null;
  language: string | null;
  audiences: string;
  priority: number | null;
  manual_order: number | null;
  max_impressions: number | null;
  max_clicks: number | null;
  max_per_user_per_day: number | null;
  max_per_session: number | null;
  start_at: string | null;
  end_at: string | null;
  status: string;
};

type CounterRow = {
  news_id: string;
  placement_id: string;
  day: string;
  user_key: string | null;
  session_key: string | null;
  impressions: number | null;
  visible_impressions: number | null;
  clicks: number | null;
};

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function parseAudiences(raw: string | null): string[] {
  return parseTags(raw);
}

function parsePageCodes(raw: string | null): string[] {
  return parseTags(raw);
}

function extendedFromRowDb(row: ExtendedRow | null): NewsExtended | null {
  if (!row) return null;
  return {
    newsId: row.news_id,
    slug: row.slug,
    summaryAr: row.summary_ar,
    summaryEn: row.summary_en,
    summaryTr: row.summary_tr,
    bodyAr: row.body_ar,
    bodyEn: row.body_en,
    bodyTr: row.body_tr,
    category: (row.category ?? "GENERAL") as NewsExtended["category"],
    tags: parseTags(row.tags),
    imageUrl: row.image_url,
    isBreaking: Boolean(row.is_breaking),
    isPinned: Boolean(row.is_pinned),
    language: row.language ?? "ar",
    newsType: (row.news_type ?? "MANUAL") as NewsExtended["newsType"],
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    sourcePublishedAt: row.source_published_at,
    fetchedAt: row.fetched_at,
    contentHash: row.content_hash,
    externalId: row.external_id,
    reviewStatus: (row.review_status ?? "APPROVED") as NewsExtended["reviewStatus"],
  };
}

function placementFromRow(row: PlacementRow): NewsPlacement {
  const limits: NewsLimitSet = {
    maxImpressions: row.max_impressions,
    maxClicks: row.max_clicks,
    maxPerUserPerDay: row.max_per_user_per_day,
    maxPerSession: row.max_per_session,
  };
  return {
    id: row.id,
    newsId: row.news_id,
    channel: row.channel as NewsChannel,
    pageMode: (row.page_mode as NewsPlacement["pageMode"]) ?? "ALL_PAGES",
    pageCodes: parsePageCodes(row.page_codes),
    countryCode: row.country_code,
    cityId: row.city_id,
    language: row.language,
    audiences: parseAudiences(row.audiences),
    priority: Number(row.priority) || 100,
    manualOrder: row.manual_order,
    limits,
    startAt: row.start_at,
    endAt: row.end_at,
    status: row.status === "paused" ? "paused" : "active",
  };
}

function activeNewsScopeWhere(): { where: string; params: (string | null)[] } {
  return {
    where: `
      WHERE status = 'active'
        AND (start_at IS NULL OR date(start_at) <= date('now'))
        AND (end_at IS NULL OR date(end_at) >= date('now'))
    `,
    params: [],
  };
}

async function loadNewsRows(db: D1Database): Promise<NewsRowLike[]> {
  const { where, params } = activeNewsScopeWhere();
  const rows = await db
    .prepare(
      `SELECT id, scope, country_code, city_id, title_ar, title_en, title_tr,
              link_url, priority, status, start_at, end_at, updated_at
       FROM news ${where}
       ORDER BY updated_at DESC
       LIMIT 200`,
    )
    .bind(...params)
    .all<NewsRowLike>();
  return rows.results ?? [];
}

async function loadExtendedMap(db: D1Database, newsIds: string[]): Promise<Map<string, NewsExtended>> {
  const map = new Map<string, NewsExtended>();
  if (!newsIds.length) return map;
  const placeholders = newsIds.map((_, index) => `?${index + 1}`).join(", ");
  const rows = await db
    .prepare(`SELECT * FROM news_extended WHERE news_id IN (${placeholders})`)
    .bind(...newsIds)
    .all<ExtendedRow>();
  for (const row of rows.results ?? []) {
    const ext = extendedFromRowDb(row);
    if (ext) map.set(row.news_id, ext);
  }
  return map;
}

async function loadPlacements(db: D1Database, channel: NewsChannel | null, newsIds: string[]): Promise<NewsPlacement[]> {
  if (!newsIds.length) return [];
  const placeholders = newsIds.map((_, index) => `?${index + 1}`).join(", ");
  const channelClause = channel ? "channel = ?1 AND " : "";
  const rows = await db
    .prepare(
      `SELECT * FROM news_placements WHERE ${channelClause}news_id IN (${placeholders})`,
    )
    .bind(...(channel ? [channel] : []), ...newsIds)
    .all<PlacementRow>();
  return (rows.results ?? []).map(placementFromRow);
}

async function loadCounters(db: D1Database, newsIds: string[]): Promise<Map<string, CounterRow[]>> {
  const map = new Map<string, CounterRow[]>();
  if (!newsIds.length) return map;
  const placeholders = newsIds.map((_, index) => `?${index + 1}`).join(", ");
  const rows = await db
    .prepare(`SELECT * FROM news_delivery_counters WHERE news_id IN (${placeholders})`)
    .bind(...newsIds)
    .all<CounterRow>();
  for (const row of rows.results ?? []) {
    const list = map.get(row.news_id) ?? [];
    list.push(row);
    map.set(row.news_id, list);
  }
  return map;
}

function readingsFor(placement: NewsPlacement, counterRows: CounterRow[] | undefined, context: NewsDeliveryContext, dayKey: string): LimitReadings {
  const rows = counterRows ?? [];
  const placementRows = rows.filter((r) => r.placement_id === placement.id || !r.placement_id);
  const sessionKey = context.sessionKey;
  const userKey = context.userKey;
  let impressions = 0;
  let visibleImpressions = 0;
  let clicks = 0;
  let perUserToday = 0;
  let perSession = 0;
  for (const row of placementRows) {
    impressions += Number(row.impressions) || 0;
    visibleImpressions += Number(row.visible_impressions) || 0;
    clicks += Number(row.clicks) || 0;
    if (userKey && row.user_key === userKey && row.day === dayKey) perUserToday += Number(row.impressions) || 0;
    if (sessionKey && row.session_key === sessionKey) perSession += Number(row.impressions) || 0;
  }
  return { impressions, visibleImpressions, clicks, perUserToday, perSession };
}

export type ResolvedPlacement = {
  item: ResolvedNewsItem;
  placement: NewsPlacement;
};

export type ResolveResult = {
  items: ResolvedNewsItem[];
  placements: ResolvedPlacement[];
  channel: NewsChannel;
};

function dayKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function defaultPlacementFor(row: NewsRowLike, channel: NewsChannel): NewsPlacement {
  return {
    id: `${row.id}::default`,
    newsId: row.id,
    channel,
    pageMode: "ALL_PAGES",
    pageCodes: [],
    countryCode: row.country_code,
    cityId: row.city_id,
    language: null,
    audiences: [],
    priority: Number(row.priority) || 100,
    manualOrder: null,
    limits: { maxImpressions: null, maxClicks: null, maxPerUserPerDay: null, maxPerSession: null },
    startAt: row.start_at,
    endAt: row.end_at,
    status: "active",
  };
}

export async function resolveForChannel(
  context: NewsDeliveryContext,
  options?: { limit?: number; includePaused?: boolean },
): Promise<ResolveResult> {
  const now = context.now ?? new Date();
  const db = await getNewsDb();
  const rows = await loadNewsRows(db);
  const newsIds = rows.map((r) => r.id);
  const [extendedMap, allPlacements, counterMap] = await Promise.all([
    loadExtendedMap(db, newsIds),
    loadPlacements(db, null, newsIds),
    loadCounters(db, newsIds),
  ]);
  const channelPlacements = allPlacements.filter((p) => p.channel === context.channel);

  const dk = dayKey(now);
  const resolved: ResolvedPlacement[] = [];
  for (const row of rows) {
    const extended = extendedMap.get(row.id) ?? null;
    const item = extendedFromRow(row, extended);
    let candidates = channelPlacements.filter((p) => p.newsId === row.id && (options?.includePaused || p.status === "active"));
    if (!candidates.length && !allPlacements.some((p) => p.newsId === row.id)) {
      candidates = [defaultPlacementFor(row, context.channel)];
    }
    const contextWithGroup = {
      ...context,
      pageGroup: context.pageGroup ?? pageGroupForPath(context.pagePath),
      audiences: context.audiences ?? [],
    };
    for (const placement of candidates) {
      const evaluation = evaluatePlacement(placement, contextWithGroup, now);
      if (!evaluation.match) continue;
      const readings = readingsFor(placement, counterMap.get(row.id), context, dk);
      const limitCheck = isWithinLimits(placement.limits, readings);
      if (!limitCheck.ok) continue;
      resolved.push({ item, placement });
      break;
    }
  }

  const ranked = rankNews(
    resolved.map((r) => r.item),
    (item) => {
      const placement = resolved.find((r) => r.item.id === item.id)?.placement;
      const base = standardNewsRanking(item);
      return base - (placement?.manualOrder != null ? placement.manualOrder * 1000 : 0);
    },
  );

  const limit = options?.limit ?? ranked.length;
  const selected = ranked.slice(0, limit);
  return {
    items: selected,
    placements: selected.map((item) => resolved.find((r) => r.item.id === item.id)!),
    channel: context.channel,
  };
}

export async function resolveNewsFeed(context: NewsDeliveryContext, options?: { limit?: number }): Promise<ResolvedNewsItem[]> {
  const result = await resolveForChannel(context, options);
  return result.items;
}

export async function resolveTickerForContext(
  context: NewsDeliveryContext,
  options?: { limit?: number },
): Promise<ResolvedNewsItem[]> {
  return resolveNewsFeed({ ...context, channel: "WEBSITE_TICKER" }, { limit: options?.limit ?? 20 });
}
