import { calculateDistanceKm, parseTimeToMinutes, currentHourDecimal, currentDayOfWeek, frequencyWindowSince, formatDateTime, statDate } from "@/lib/ads/geo";
import type { AdEngineRow, ParsedAd, ParsedCreative, ResolvedAdContext, AdMatchResult, EngineStats, FrequencyBuckets, MatchOptions, InventoryHealth, AdChannel } from "@/lib/ads/types";
import { AD_CHANNELS, isAdChannel } from "@/lib/ads/types";
import { signTrackingToken } from "@/lib/ads/events";
import { canonicalPlacementFor, sectionVariants } from "@/src/constants/advertising";
import type { DeviceType } from "@/src/constants/advertising";

function parseList(value: string | null | undefined, fallback: string[] = []): string[] {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : fallback;
  } catch {
    return fallback;
  }
}

function parseChannels(value: string | null | undefined): AdChannel[] {
  if (!value) return ["website"];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return ["website"];
    const channels = parsed.filter((item): item is AdChannel => isAdChannel(String(item)));
    return channels.length ? channels : ["website"];
  } catch {
    return ["website"];
  }
}

function parseNumbers(value: string | null | undefined): number[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is number => typeof item === "number") : [];
  } catch {
    return [];
  }
}

function toNumber(value: unknown): number {
  return Number(value) || 0;
}

function toBool(value: unknown): boolean {
  return Number(value) === 1;
}

export function parseAd(row: AdEngineRow): ParsedAd {
  return {
    id: row.id,
    internalName: row.internal_name,
    advertiserName: row.advertiser_name,
    campaignType: row.campaign_type,
    mediaType: row.media_type,
    mediaUrl: row.media_url,
    mobileMediaUrl: row.mobile_media_url,
    tabletMediaUrl: row.tablet_media_url,
    posterUrl: row.poster_url,
    channels: parseChannels(row.channels),
    eyebrow: { ar: row.eyebrow_ar, en: row.eyebrow_en, tr: row.eyebrow_tr },
    title: { ar: row.title_ar, en: row.title_en, tr: row.title_tr },
    accent: { ar: row.accent_ar, en: row.accent_en, tr: row.accent_tr },
    description: { ar: row.description_ar, en: row.description_en, tr: row.description_tr },
    cta: { ar: row.cta_ar, en: row.cta_en, tr: row.cta_tr },
    targetUrl: row.target_url,
    countries: parseList(row.countries).map((item) => item.toLowerCase()),
    cities: parseList(row.cities).map((item) => item.toLowerCase()),
    languages: parseList(row.languages, ["ar", "en", "tr"]),
    devices: parseList(row.devices, ["desktop", "mobile"]) as DeviceType[],
    priority: toNumber(row.priority),
    weight: Math.max(1, toNumber(row.weight)),
    startAt: row.start_at,
    endAt: row.end_at,
    sectionScopes: parseList(row.section_scopes),
    pageTypes: parseList(row.page_types),
    placements: parseList(row.placements),
    domains: parseList(row.domains).map((item) => item.toLowerCase()),
    regionIds: parseList(row.region_ids),
    districtIds: parseList(row.district_ids),
    latitude: row.latitude == null ? null : Number(row.latitude),
    longitude: row.longitude == null ? null : Number(row.longitude),
    radiusKm: row.radius_km == null ? null : Number(row.radius_km),
    targetAllCountries: toBool(row.target_all_countries),
    targetAllRegions: toBool(row.target_all_regions),
    targetAllCities: toBool(row.target_all_cities),
    targetAllDistricts: toBool(row.target_all_districts),
    entityType: row.entity_type,
    entityIds: parseList(row.entity_ids),
    categoryIds: parseList(row.category_ids),
    propertyTypes: parseList(row.property_types),
    serviceCategories: parseList(row.service_categories),
    officeTypes: parseList(row.office_types),
    toolCategories: parseList(row.tool_categories),
    operatingSystems: parseList(row.operating_systems).map((item) => item.toLowerCase()),
    dailyStartTime: row.daily_start_time,
    dailyEndTime: row.daily_end_time,
    daysOfWeek: parseNumbers(row.days_of_week),
    rotationGroup: row.rotation_group,
    pricingModel: row.pricing_model,
    price: toNumber(row.price),
    budget: toNumber(row.budget),
    dailyBudget: toNumber(row.daily_budget),
    spentAmount: toNumber(row.spent_amount),
    maxImpressions: toNumber(row.max_impressions),
    maxClicks: toNumber(row.max_clicks),
    frequencyCapPerUser: toNumber(row.frequency_cap_per_user),
    frequencyCapPeriod: row.frequency_cap_period || "day",
    approvalStatus: row.approval_status,
    isActive: toBool(row.is_active),
    isFeatured: toBool(row.is_featured),
    isFallback: toBool(row.is_fallback),
    isGlobal: toBool(row.is_global),
    totalImpressions: toNumber(row.total_impressions),
    totalClicks: toNumber(row.total_clicks),
    totalConversions: toNumber(row.total_conversions),
    creatives: [],
  };
}

type CreativeRow = {
  id: string;
  campaign_id: string;
  media_type: string;
  media_url: string;
  mobile_media_url: string | null;
  tablet_media_url: string | null;
  poster_url: string | null;
  position: number;
  duration_seconds: number;
  status: string;
  alt_text_ar: string | null;
  alt_text_en: string | null;
  alt_text_tr: string | null;
  media_width: number | null;
  media_height: number | null;
};

const ACTIVE_ADS_CACHE_TTL_MS = 30_000;
const DAILY_STATS_CACHE_TTL_MS = 5_000;

let activeAdsCache: { expiresAt: number; value: ParsedAd[] } | null = null;
let activeAdsPromise: Promise<ParsedAd[]> | null = null;
let dailyStatsCache: { key: string; expiresAt: number; value: Map<string, { campaign_id: string; impressions: number; unique_impressions: number; clicks: number; unique_clicks: number; conversions: number; spent_amount: number }> } | null = null;
let dailyStatsPromise: Promise<Map<string, { campaign_id: string; impressions: number; unique_impressions: number; clicks: number; unique_clicks: number; conversions: number; spent_amount: number }>> | null = null;

export async function loadCreatives(db: D1Database, campaignIds: string[]): Promise<Map<string, ParsedCreative[]>> {
  const map = new Map<string, ParsedCreative[]>();
  if (campaignIds.length === 0) return map;
  const placeholders = campaignIds.map((_, index) => `?${index + 1}`).join(",");
  const rows = await db
    .prepare(
      `SELECT id, campaign_id, media_type, media_url, mobile_media_url, tablet_media_url, poster_url, position, duration_seconds, status,
              alt_text_ar, alt_text_en, alt_text_tr, media_width, media_height
       FROM ad_creatives
       WHERE campaign_id IN (${placeholders})
       ORDER BY position ASC`,
    )
    .bind(...campaignIds)
    .all<CreativeRow>();
  for (const row of rows.results) {
    if (row.status !== "active") continue;
    const list = map.get(row.campaign_id) ?? [];
    list.push({
      id: row.id,
      mediaType: row.media_type,
      mediaUrl: row.media_url,
      mobileMediaUrl: row.mobile_media_url,
      tabletMediaUrl: row.tablet_media_url,
      posterUrl: row.poster_url,
      altText: { ar: row.alt_text_ar, en: row.alt_text_en, tr: row.alt_text_tr },
      mediaWidth: row.media_width ? toNumber(row.media_width) : null,
      mediaHeight: row.media_height ? toNumber(row.media_height) : null,
      position: toNumber(row.position),
      durationSeconds: Math.max(3, toNumber(row.duration_seconds) || 6),
    });
    map.set(row.campaign_id, list);
  }
  return map;
}

async function queryActiveAds(db: D1Database, now: Date): Promise<ParsedAd[]> {
  const rows = await db
    .prepare(
      `SELECT id, internal_name, advertiser_name, campaign_type, status, media_type,
              media_url, mobile_media_url, tablet_media_url, poster_url,
              channels,
              eyebrow_ar, eyebrow_en, eyebrow_tr, title_ar, title_en, title_tr,
              accent_ar, accent_en, accent_tr, description_ar, description_en, description_tr,
              cta_ar, cta_en, cta_tr, target_url,
              countries, cities, languages, devices, priority, weight, start_at, end_at,
              section_scopes, page_types, placements, domains, region_ids, district_ids,
              latitude, longitude, radius_km,
              target_all_countries, target_all_regions, target_all_cities, target_all_districts,
              entity_type, entity_ids, category_ids,
              property_types, service_categories, office_types, tool_categories,
              operating_systems, daily_start_time, daily_end_time, days_of_week, rotation_group,
              pricing_model, price, budget, daily_budget, spent_amount,
              max_impressions, max_clicks, frequency_cap_per_user, frequency_cap_period,
              approval_status, is_active, is_sponsored, is_featured, is_fallback, is_global,
              total_impressions, total_unique_impressions, total_clicks, total_unique_clicks,
              total_conversions, approved_by, deleted_at
       FROM ad_campaigns
       WHERE status = 'active'
         AND approval_status = 'approved'
         AND is_active = 1
         AND deleted_at IS NULL
         AND (start_at IS NULL OR start_at <= ?1)
         AND (end_at IS NULL OR end_at >= ?2)
       LIMIT 500`,
    )
    .bind(formatDateTime(now), formatDateTime(now))
    .all<AdEngineRow>();
  const ads = rows.results.map(parseAd);
  const creatives = await loadCreatives(db, ads.map((ad) => ad.id));
  for (const ad of ads) ad.creatives = creatives.get(ad.id) ?? [];
  return ads;
}

export async function loadActiveAds(db: D1Database, now = new Date()): Promise<ParsedAd[]> {
  const timestamp = Date.now();
  if (activeAdsCache && activeAdsCache.expiresAt > timestamp) return activeAdsCache.value;
  if (activeAdsPromise) return activeAdsPromise;

  activeAdsPromise = queryActiveAds(db, now)
    .then((value) => {
      activeAdsCache = { value, expiresAt: Date.now() + ACTIVE_ADS_CACHE_TTL_MS };
      return value;
    })
    .finally(() => {
      activeAdsPromise = null;
    });
  return activeAdsPromise;
}

type DailyStat = { campaign_id: string; impressions: number; unique_impressions: number; clicks: number; unique_clicks: number; conversions: number; spent_amount: number };

async function loadDailyStats(db: D1Database, today: string): Promise<Map<string, DailyStat>> {
  const timestamp = Date.now();
  if (dailyStatsCache?.key === today && dailyStatsCache.expiresAt > timestamp) return dailyStatsCache.value;
  if (dailyStatsPromise) return dailyStatsPromise;

  dailyStatsPromise = db
    .prepare(
      `SELECT campaign_id, impressions, unique_impressions, clicks, unique_clicks, conversions, spent_amount
       FROM ad_daily_statistics
       WHERE stat_date = ?1`,
    )
    .bind(today)
    .all<DailyStat>()
    .then((daily) => {
      const value = new Map<string, DailyStat>();
      for (const row of daily.results) value.set(row.campaign_id, row);
      dailyStatsCache = { key: today, value, expiresAt: Date.now() + DAILY_STATS_CACHE_TTL_MS };
      return value;
    })
    .finally(() => {
      dailyStatsPromise = null;
    });
  return dailyStatsPromise;
}

export async function loadEngineStats(db: D1Database, ctx: ResolvedAdContext, now = new Date()): Promise<EngineStats> {
  const today = formatDateTime(now);

  if (ctx.sessionId || ctx.userId) {
    // Count every cap window in one pass, so each campaign can be capped by its
    // own frequency_cap_period instead of everyone sharing a daily window.
    // SUM(CASE ...) rather than FILTER: this SQL runs on Postgres, MySQL and
    // SQLite through the runtime adapter.
    const dayStart = frequencyWindowSince("day", now);
    const weekStart = frequencyWindowSince("week", now);
    const monthStart = frequencyWindowSince("month", now);
    const conditions: string[] = [];
    const params: unknown[] = [dayStart, weekStart, monthStart];
    if (ctx.sessionId) {
      conditions.push("session_id = ?");
      params.push(ctx.sessionId);
    }
    if (ctx.userId) {
      conditions.push("user_id = ?");
      params.push(ctx.userId);
    }
    const [dailyMap, frequency] = await Promise.all([loadDailyStats(db, today), db
      .prepare(
        `SELECT campaign_id,
                SUM(CASE WHEN tracked_at >= ? THEN 1 ELSE 0 END) AS n_day,
                SUM(CASE WHEN tracked_at >= ? THEN 1 ELSE 0 END) AS n_week,
                SUM(CASE WHEN tracked_at >= ? THEN 1 ELSE 0 END) AS n_month,
                COUNT(*) AS n_all
         FROM ad_impressions
         WHERE ${conditions.join(" AND ")}
         GROUP BY campaign_id`,
      )
      .bind(...(params as [unknown, ...unknown[]]))
      .all<{ campaign_id: string; n_day: number; n_week: number; n_month: number; n_all: number }>()]);
    const frequencyMap = new Map<string, FrequencyBuckets>();
    for (const row of frequency.results) {
      frequencyMap.set(row.campaign_id, {
        day: toNumber(row.n_day),
        week: toNumber(row.n_week),
        month: toNumber(row.n_month),
        all: toNumber(row.n_all),
      });
    }
    return { daily: dailyMap, userFrequency: frequencyMap };
  }

  const dailyMap = await loadDailyStats(db, today);
  return { daily: dailyMap, userFrequency: new Map() };
}

function isSectionMatch(ad: ParsedAd, ctx: ResolvedAdContext): { ok: boolean; score: number } {
  if (ad.sectionScopes.length === 0) return { ok: true, score: 100 };
  const variants = sectionVariants(ctx.section);
  if (ad.sectionScopes.some((scope) => variants.includes(scope as never))) return { ok: true, score: 100 };
  if (ad.sectionScopes.includes("global")) return { ok: true, score: 30 };
  return { ok: false, score: 0 };
}

function isChannelMatch(ad: ParsedAd, ctx: ResolvedAdContext): boolean {
  const channel = ctx.channel ?? "website";
  if (ad.channels.length === 0) return channel === "website";
  return ad.channels.includes(channel);
}

function isPlacementMatch(ad: ParsedAd, ctx: ResolvedAdContext): { ok: boolean; score: number } {
  if (ad.placements.length === 0) return { ok: true, score: 50 };
  if (ad.placements.includes(ctx.placement)) return { ok: true, score: 100 };

  const canonical = canonicalPlacementFor(ctx.placement);

  if (
    canonical &&
    ad.placements.includes(canonical)
  ) {
    return { ok: true, score: 95 };
  }

  return { ok: false, score: 0 };
}

function isPageTypeMatch(ad: ParsedAd, ctx: ResolvedAdContext): { ok: boolean; score: number } {
  if (ad.pageTypes.length === 0) return { ok: true, score: 30 };
  if (ad.pageTypes.includes(ctx.pageType)) return { ok: true, score: 50 };
  return { ok: false, score: 0 };
}

function isDomainMatch(ad: ParsedAd, ctx: ResolvedAdContext): { ok: boolean; score: number } {
  if (ad.domains.length === 0) return { ok: true, score: 0 };
  const domain = (ctx.domain ?? "").toLowerCase();
  if (!domain) return { ok: false, score: 0 };
  const match = ad.domains.find((target) => target === domain || domain.endsWith(`.${target}`) || target.endsWith(`.${domain}`));
  if (match) return { ok: true, score: 60 };
  return { ok: false, score: 0 };
}

function isDeviceMatch(ad: ParsedAd, ctx: ResolvedAdContext): { ok: boolean; score: number } {
  if (ad.devices.length === 0) return { ok: true, score: 15 };
  if (ad.devices.includes(ctx.deviceType)) return { ok: true, score: 15 };
  if (ctx.deviceType === "tablet" && (ad.devices.includes("mobile") || ad.devices.includes("desktop"))) {
    return { ok: true, score: 10 };
  }
  return { ok: false, score: 0 };
}

function isLanguageMatch(ad: ParsedAd, ctx: ResolvedAdContext): { ok: boolean; score: number } {
  if (ad.languages.length === 0) return { ok: true, score: 20 };
  if (ad.languages.includes(ctx.language)) return { ok: true, score: 20 };
  return { ok: false, score: 0 };
}

function isTimeMatch(ad: ParsedAd, now: Date, ctx: ResolvedAdContext): boolean {
  if (ad.daysOfWeek.length > 0) {
    const day = ctx.dayOfWeek ?? currentDayOfWeek(now);
    if (!ad.daysOfWeek.includes(day)) return false;
  }
  if (ad.dailyStartTime || ad.dailyEndTime) {
    const hour = ctx.hour ?? currentHourDecimal(now);
    const start = parseTimeToMinutes(ad.dailyStartTime);
    const end = parseTimeToMinutes(ad.dailyEndTime);
    const minutes = Math.round(hour * 60);
    if (start != null && minutes < start) return false;
    if (end != null && minutes > end) return false;
  }
  return true;
}

function isOsMatch(ad: ParsedAd, ctx: ResolvedAdContext): boolean {
  if (ad.operatingSystems.length === 0) return true;
  if (!ctx.operatingSystem) return false;
  const os = ctx.operatingSystem.toLowerCase();
  return ad.operatingSystems.some((target) => os.includes(target) || target.includes(os));
}

function isTagIntersect(adTypes: string[], tags: string[] | undefined): boolean {
  if (!tags || tags.length === 0) return false;
  return adTypes.some((type) => tags.some((tag) => type.toLowerCase() === tag.toLowerCase()));
}

function isGeoMatch(ad: ParsedAd, ctx: ResolvedAdContext): { ok: boolean; score: number } {
  const countryCode = ctx.countryCode?.toLowerCase() ?? "";
  let score = 0;

  if (ad.countries.length > 0 && !ad.targetAllCountries) {
    if (!countryCode || !ad.countries.includes(countryCode)) return { ok: false, score: 0 };
    score += 40;
  }

  if (ad.regionIds.length > 0 && !ad.targetAllRegions) {
    const region = ctx.regionId != null ? String(ctx.regionId).toLowerCase() : "";
    if (!region || !ad.regionIds.some((item) => item.toLowerCase() === region)) return { ok: false, score: 0 };
    score += 60;
  }

  if (ad.cities.length > 0 && !ad.targetAllCities) {
    const city = ctx.cityId != null ? String(ctx.cityId).toLowerCase() : "";
    if (!city || !ad.cities.some((item) => item.toLowerCase() === city)) return { ok: false, score: 0 };
    score += 75;
  }

  if (ad.districtIds.length > 0 && !ad.targetAllDistricts) {
    const district = ctx.districtId != null ? String(ctx.districtId).toLowerCase() : "";
    if (!district || !ad.districtIds.some((item) => item.toLowerCase() === district)) return { ok: false, score: 0 };
    score += 90;
  }

  const targetLatitude = ad.latitude;
  const targetLongitude = ad.longitude;
  const targetRadiusKm = ad.radiusKm;
  const hasRadiusTarget = targetLatitude != null && targetLongitude != null && targetRadiusKm != null && targetRadiusKm > 0;
  if (hasRadiusTarget) {
    if (ctx.latitude == null || ctx.longitude == null) return { ok: false, score: 0 };
    const distance = calculateDistanceKm(targetLatitude, targetLongitude, ctx.latitude, ctx.longitude);
    if (distance > targetRadiusKm) return { ok: false, score: 0 };
    score += Math.max(0, 100 - Math.round(distance));
  }

  return { ok: true, score };
}

function isEntityMatch(ad: ParsedAd, ctx: ResolvedAdContext): { ok: boolean; score: number } {
  let score = 0;
  if (ad.entityType) {
    if (!ctx.entityType || ctx.entityType.toLowerCase() !== ad.entityType.toLowerCase()) return { ok: false, score: 0 };
    score += 50;
  }
  if (ad.entityIds.length > 0) {
    const entityId = ctx.entityId != null ? String(ctx.entityId).toLowerCase() : "";
    if (!entityId || !ad.entityIds.some((item) => item.toLowerCase() === entityId)) return { ok: false, score: 0 };
    score += 100;
  }
  return { ok: true, score };
}

function isCategoryMatch(ad: ParsedAd, ctx: ResolvedAdContext): { ok: boolean; score: number } {
  if (ad.categoryIds.length > 0) {
    const categoryId = ctx.categoryId != null ? String(ctx.categoryId).toLowerCase() : "";
    if (categoryId && ad.categoryIds.some((item) => item.toLowerCase() === categoryId)) return { ok: true, score: 40 };
    if (isTagIntersect(ad.categoryIds, ctx.tags)) return { ok: true, score: 40 };
    return { ok: false, score: 0 };
  }

  const sectionSpecific: { list: string[]; section: string }[] = [
    { list: ad.propertyTypes, section: "properties" },
    { list: ad.serviceCategories, section: "services" },
    { list: ad.officeTypes, section: "organizations" },
    { list: ad.toolCategories, section: "tools" },
  ];
  for (const candidate of sectionSpecific) {
    if (candidate.list.length > 0 && sectionVariants(ctx.section).includes(candidate.section as never)) {
      if (isTagIntersect(candidate.list, ctx.tags)) return { ok: true, score: 40 };
      return { ok: false, score: 0 };
    }
  }
  return { ok: true, score: 0 };
}

/** The bucket matching a campaign's configured cap period. */
function frequencySeen(buckets: FrequencyBuckets, period: string): number {
  switch (period) {
    case "week": return buckets.week;
    case "month": return buckets.month;
    // "session" and "all" both mean "everything we have recorded for them".
    case "session":
    case "all": return buckets.all;
    default: return buckets.day;
  }
}

function isBudgetEligible(ad: ParsedAd, stats: EngineStats | undefined): boolean {
  if (ad.budget > 0 && ad.spentAmount >= ad.budget) return false;
  const daily = stats?.daily.get(ad.id);
  if (ad.dailyBudget > 0) {
    const spent = daily?.spent_amount ?? 0;
    if (spent >= ad.dailyBudget) return false;
  }
  if (ad.maxImpressions > 0 && (ad.totalImpressions + (daily?.impressions ?? 0)) >= ad.maxImpressions) return false;
  if (ad.maxClicks > 0 && (ad.totalClicks + (daily?.clicks ?? 0)) >= ad.maxClicks) return false;
  if (ad.frequencyCapPerUser > 0) {
    const seen = stats?.userFrequency.get(ad.id);
    if (seen && frequencySeen(seen, ad.frequencyCapPeriod) >= ad.frequencyCapPerUser) return false;
  }
  return true;
}

type ScoredAd = { ad: ParsedAd; score: number };

export function scoreAd(ad: ParsedAd, ctx: ResolvedAdContext, now: Date, stats?: EngineStats): number | null {
  if (!ad.isActive) return null;
  if (ad.approvalStatus !== "approved") return null;
  if (!isChannelMatch(ad, ctx)) return null;
  if (!isTimeMatch(ad, now, ctx)) return null;
  if (!isOsMatch(ad, ctx)) return null;
  if (!isBudgetEligible(ad, stats)) return null;

  const section = isSectionMatch(ad, ctx);
  if (!section.ok) return null;
  const placement = isPlacementMatch(ad, ctx);
  if (!placement.ok) return null;
  const domain = isDomainMatch(ad, ctx);
  if (!domain.ok) return null;
  const pageType = isPageTypeMatch(ad, ctx);
  if (!pageType.ok) return null;
  const device = isDeviceMatch(ad, ctx);
  if (!device.ok) return null;
  const language = isLanguageMatch(ad, ctx);
  if (!language.ok) return null;
  const geo = isGeoMatch(ad, ctx);
  if (!geo.ok) return null;
  const entity = isEntityMatch(ad, ctx);
  if (!entity.ok) return null;
  const category = isCategoryMatch(ad, ctx);
  if (!category.ok) return null;

  let score =
    section.score +
    placement.score +
    domain.score +
    pageType.score +
    device.score +
    language.score +
    geo.score +
    entity.score +
    category.score +
    ad.priority * 10;

  if (ad.isFeatured) score += 10;
  return score;
}

function pickWeighted(candidates: ScoredAd[]): ScoredAd | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  const total = candidates.reduce((sum, candidate) => sum + candidate.ad.weight, 0);
  if (total <= 0) return candidates[Math.floor(Math.random() * candidates.length)];
  let target = Math.random() * total;
  for (const candidate of candidates) {
    target -= candidate.ad.weight;
    if (target <= 0) return candidate;
  }
  return candidates[candidates.length - 1];
}

function selectBand(scored: ScoredAd[], used: Set<string>): ScoredAd[] {
  const remaining = scored.filter((candidate) => !used.has(candidate.ad.id));
  if (remaining.length === 0) return [];
  const maxScore = Math.max(...remaining.map((candidate) => candidate.score));
  if (maxScore <= 0) return [];
  return remaining.filter((candidate) => candidate.score >= maxScore - 50);
}

/**
 * Deterministic even creative rotation: each campaign receives ONE turn and
 * within that turn the next creative is picked by the campaign's impression
 * count so far (round-robin). A 5-creative campaign does NOT get five times
 * the exposure of a 1-creative campaign (D6/D7).
 */
export function selectCreative(ad: ParsedAd, impressions: number, stats?: EngineStats): { creative: ParsedCreative | null; count: number; position: number; durationSeconds: number } {
  const daily = stats?.daily.get(ad.id);
  const total = impressions + (daily?.impressions ?? 0);
  const creatives = ad.creatives.filter((item) => item.mediaUrl);
  if (creatives.length === 0) {
    return {
      creative: null,
      count: 1,
      position: 1,
      durationSeconds: 6,
    };
  }
  const index = ((total % creatives.length) + creatives.length) % creatives.length;
  return {
    creative: creatives[index],
    count: creatives.length,
    position: index + 1,
    durationSeconds: creatives[index].durationSeconds || 6,
  };
}

function campaignImpressions(ad: ParsedAd, stats?: EngineStats): number {
  const daily = stats?.daily.get(ad.id);
  return ad.totalImpressions + (daily?.impressions ?? 0);
}

const HOUSE_FILL_THRESHOLD = 3;

function selectHouseCandidates(
  allAds: ParsedAd[],
  ctx: ResolvedAdContext,
  used: Set<string>,
  stats?: EngineStats,
): ScoredAd[] {
  const houseAds = allAds.filter(
    (ad) => ad.isFallback && ad.isActive && ad.approvalStatus === "approved" && !used.has(ad.id),
  );

  const placementMatch = houseAds.filter(
    (ad) => ad.placements.length === 0 || ad.placements.includes(ctx.placement),
  );
  const globalAds = placementMatch.filter((ad) => ad.isGlobal);
  const placementSpecific = placementMatch.filter((ad) => !ad.isGlobal);
  const ordered = [...placementSpecific, ...globalAds];

  return ordered
    .map((ad) => {
      const section = isSectionMatch(ad, ctx);
      const placement = isPlacementMatch(ad, ctx);
      const device = isDeviceMatch(ad, ctx);
      const language = isLanguageMatch(ad, ctx);
      const geo = isGeoMatch(ad, ctx);
      if (!geo.ok) return null;
      const score =
        (section.ok ? section.score : 0) +
        (placement.ok ? placement.score : 0) +
        (device.ok ? device.score : 0) +
        (language.ok ? language.score : 0) +
        (geo.ok ? geo.score : 0) +
        ad.priority * 10 +
        ad.weight;
      return { ad, score };
    })
    .filter((candidate): candidate is ScoredAd => candidate !== null)
    .sort((a, b) => {
      if (a.ad.isGlobal !== b.ad.isGlobal) return a.ad.isGlobal ? 1 : -1;
      if (a.ad.priority !== b.ad.priority) return a.ad.priority - b.ad.priority;
      return b.ad.weight - a.ad.weight;
    });
}

export async function matchAds(db: D1Database, ctx: ResolvedAdContext, options: MatchOptions = {}): Promise<AdMatchResult[]> {
  const now = options.now ?? new Date();
  const [ads, stats] = await Promise.all([
    options.ads ? Promise.resolve(options.ads) : loadActiveAds(db, now),
    options.stats ? Promise.resolve(options.stats) : loadEngineStats(db, ctx, now),
  ]);
  const count = Math.max(1, options.count ?? 1);
  const used = options.usedCampaignIds ?? new Set<string>();

  const allEligible: ScoredAd[] = [];

  for (const ad of ads) {
    const score = scoreAd(ad, ctx, now, stats);
    if (score == null) continue;
    allEligible.push({ ad, score });
  }

  const picks: ScoredAd[] = [];

  const fill = (limit: number) => {
    while (picks.length < limit) {
      const band = selectBand(allEligible, used);
      if (band.length === 0) break;
      const chosen = pickWeighted(band);
      if (!chosen) break;
      picks.push(chosen);
      used.add(chosen.ad.id);
    }
  };

  fill(count);
  if (picks.length < count) {
    const leftovers = allEligible.filter((candidate) => !used.has(candidate.ad.id));
    for (const candidate of leftovers) {
      if (picks.length >= count) break;
      picks.push(candidate);
      used.add(candidate.ad.id);
    }
  }

  if (picks.length < count) {
    const houseCandidates = selectHouseCandidates(ads, ctx, used, stats);
    for (const candidate of houseCandidates) {
      if (picks.length >= count) break;
      picks.push(candidate);
      used.add(candidate.ad.id);
    }
  }

  const results: AdMatchResult[] = [];
  for (const pick of picks) {
    const ad = pick.ad;
    const locale = ctx.language;
    const channel = ctx.channel ?? "website";
    const { creative, count: creativeCount, position: creativePosition, durationSeconds } = selectCreative(ad, campaignImpressions(ad, stats), stats);
    const media = creative ?? {
      mediaUrl: ad.mediaUrl,
      mobileMediaUrl: ad.mobileMediaUrl,
      tabletMediaUrl: ad.tabletMediaUrl,
      posterUrl: ad.posterUrl,
      altText: { ar: null, en: null, tr: null },
      mediaWidth: null,
      mediaHeight: null,
    };
    const imageUrl = channel === "office" || ctx.deviceType === "mobile"
      ? (media.mobileMediaUrl ?? media.tabletMediaUrl ?? media.mediaUrl)
      : ctx.deviceType === "tablet"
        ? (media.tabletMediaUrl ?? media.mobileMediaUrl ?? media.mediaUrl)
        : (media.mediaUrl ?? media.mobileMediaUrl ?? "");
    results.push({
      campaignId: ad.id,
      advertiserName: ad.advertiserName,
      campaignType: ad.campaignType,
      mediaType: creative?.mediaType ?? ad.mediaType,
      imageUrl,
      posterUrl: media.posterUrl ?? ad.posterUrl,
      imageAlt: media.altText?.[locale] || ad.title[locale] || ad.advertiserName || "",
      imageWidth: media.mediaWidth ?? null,
      imageHeight: media.mediaHeight ?? null,
      eyebrow: ad.eyebrow[locale],
      title: ad.title[locale],
      accent: ad.accent[locale],
      description: ad.description[locale],
      cta: ad.cta[locale],
      targetUrl: ad.targetUrl,
      isFeatured: ad.isFeatured,
      placement: ctx.placement,
      channel,
      creativeId: creative?.id ?? null,
      creativePosition,
      creativeCount,
      durationSeconds,
      trackingToken: await signTrackingToken(
        { campaignId: ad.id, placement: ctx.placement, section: ctx.section, pageType: ctx.pageType, creativeId: creative?.id ?? null, channel, inventoryClass: "commercial" },
        now,
      ),
    });
  }

  return results;
}

export async function matchAdsBatch(db: D1Database, contexts: ResolvedAdContext[], options: Omit<MatchOptions, "count"> = {}): Promise<AdMatchResult[]> {
  const now = options.now ?? new Date();
  const used = options.usedCampaignIds ?? new Set<string>();
  const ads = options.ads ?? (await loadActiveAds(db, now));
  const first = contexts[0];
  const stats = options.stats ?? (first ? await loadEngineStats(db, first, now) : undefined);
  const results: AdMatchResult[] = [];
  for (const ctx of contexts) {
    const matched = await matchAds(db, ctx, { count: 1, usedCampaignIds: used, stats, ads, now });
    results.push(...matched);
  }
  return results;
}

/**
 * D17/D18 — placement inventory health from the same eligibility pipeline.
 * Pure over the candidate set so it is unit-testable without a DB.
 */
export function computeInventoryHealth(
  ads: ParsedAd[],
  ctx: ResolvedAdContext,
  options: { stats?: EngineStats; now?: Date } = {},
): InventoryHealth {
  const now = options.now ?? new Date();
  const stats = options.stats;

  let eligibleAds = 0;
  let totalImpressions = 0;

  for (const ad of ads) {
    const impressions = campaignImpressions(ad, stats);
    totalImpressions += impressions;
    if (scoreAd(ad, ctx, now, stats) != null) eligibleAds += 1;
  }

  const status: InventoryHealth["status"] =
    eligibleAds >= 3
      ? "HEALTHY"
      : eligibleAds > 0
        ? "PARTIALLY_FILLED"
        : "NO_INVENTORY";

  return {
    placement: ctx.placement,
    channel: ctx.channel ?? "website",
    eligibleAds,
    status,
    totalImpressions,
    fillRate: totalImpressions > 0 ? eligibleAds / Math.max(1, totalImpressions) : 0,
  };
}

export { statDate };
