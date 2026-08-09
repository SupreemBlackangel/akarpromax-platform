import { calculateDistanceKm, parseTimeToMinutes, currentHourDecimal, currentDayOfWeek, frequencyWindowSince, formatDateTime, statDate } from "@/lib/ads/geo";
import type { AdEngineRow, ParsedAd, ParsedCreative, ResolvedAdContext, AdMatchResult, EngineStats, MatchOptions, InventoryHealth, AdChannel } from "@/lib/ads/types";
import { AD_CHANNELS, isAdChannel } from "@/lib/ads/types";
import { signTrackingToken } from "@/lib/ads/events";
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
    isSponsored: toBool(row.is_sponsored),
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
};

export async function loadCreatives(db: D1Database, campaignIds: string[]): Promise<Map<string, ParsedCreative[]>> {
  const map = new Map<string, ParsedCreative[]>();
  if (campaignIds.length === 0) return map;
  const placeholders = campaignIds.map((_, index) => `?${index + 1}`).join(",");
  const rows = await db
    .prepare(
      `SELECT id, campaign_id, media_type, media_url, mobile_media_url, tablet_media_url, poster_url, position, duration_seconds, status
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
      position: toNumber(row.position),
      durationSeconds: Math.max(3, toNumber(row.duration_seconds) || 6),
    });
    map.set(row.campaign_id, list);
  }
  return map;
}

export async function loadActiveAds(db: D1Database, now = new Date()): Promise<ParsedAd[]> {
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

export async function loadEngineStats(db: D1Database, ctx: ResolvedAdContext, now = new Date()): Promise<EngineStats> {
  const today = formatDateTime(now);
  const dailyMap = new Map<string, { campaign_id: string; impressions: number; unique_impressions: number; clicks: number; unique_clicks: number; conversions: number; spent_amount: number }>();

  if (ctx.sessionId || ctx.userId) {
    const windowStart = frequencyWindowSince("day", now);
    const daily = await db
      .prepare(
        `SELECT campaign_id, impressions, unique_impressions, clicks, unique_clicks, conversions, spent_amount
         FROM ad_daily_statistics
         WHERE stat_date = ?1`,
      )
      .bind(today)
      .all<{ campaign_id: string; impressions: number; unique_impressions: number; unique_clicks: number; clicks: number; conversions: number; spent_amount: number }>();
    for (const row of daily.results) dailyMap.set(row.campaign_id, row);

    const conditions = ["tracked_at >= ?"];
    const params: unknown[] = [windowStart];
    if (ctx.sessionId) {
      conditions.push("session_id = ?");
      params.push(ctx.sessionId);
    }
    if (ctx.userId) {
      conditions.push("user_id = ?");
      params.push(ctx.userId);
    }
    const frequency = await db
      .prepare(
        `SELECT campaign_id, COUNT(*) AS n
         FROM ad_impressions
         WHERE ${conditions.join(" AND ")}
         GROUP BY campaign_id`,
      )
      .bind(...(params as [unknown, ...unknown[]]))
      .all<{ campaign_id: string; n: number }>();
    const frequencyMap = new Map<string, number>();
    for (const row of frequency.results) frequencyMap.set(row.campaign_id, row.n);
    return { daily: dailyMap, userFrequency: frequencyMap };
  }

  const daily = await db
    .prepare(
      `SELECT campaign_id, impressions, unique_impressions, clicks, unique_clicks, conversions, spent_amount
       FROM ad_daily_statistics
       WHERE stat_date = ?1`,
    )
    .bind(today)
    .all<{ campaign_id: string; impressions: number; unique_impressions: number; unique_clicks: number; clicks: number; conversions: number; spent_amount: number }>();
  for (const row of daily.results) dailyMap.set(row.campaign_id, row);
  return { daily: dailyMap, userFrequency: new Map() };
}

function isSectionMatch(ad: ParsedAd, ctx: ResolvedAdContext): { ok: boolean; score: number } {
  if (ad.sectionScopes.length === 0) return { ok: true, score: 100 };
  if (ad.sectionScopes.includes(ctx.section)) return { ok: true, score: 100 };
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
  const hasCountry = Boolean(countryCode);

  if (hasCountry) {
    if (!ad.targetAllCountries && ad.countries.length > 0 && !ad.countries.includes(countryCode)) {
      return { ok: false, score: 0 };
    }
  }

  if (ad.districtIds.length > 0 && !ad.targetAllDistricts) {
    const district = ctx.districtId != null ? String(ctx.districtId).toLowerCase() : "";
    if (!district || !ad.districtIds.some((item) => item.toLowerCase() === district)) return { ok: false, score: 0 };
    return { ok: true, score: 90 };
  }

  if (ad.regionIds.length > 0 && !ad.targetAllRegions) {
    const region = ctx.regionId != null ? String(ctx.regionId).toLowerCase() : "";
    if (!region || !ad.regionIds.some((item) => item.toLowerCase() === region)) return { ok: false, score: 0 };
    return { ok: true, score: 60 };
  }

  if (ad.cities.length > 0 && !ad.targetAllCities) {
    const city = ctx.cityId != null ? String(ctx.cityId).toLowerCase() : ctx.cityId ? String(ctx.cityId).toLowerCase() : "";
    if (!city || !ad.cities.some((item) => item.toLowerCase() === city)) return { ok: false, score: 0 };
    return { ok: true, score: 75 };
  }

  let score = hasCountry ? 40 : 0;

  if (
    ad.latitude != null &&
    ad.longitude != null &&
    ad.radiusKm != null &&
    ad.radiusKm > 0 &&
    ctx.latitude != null &&
    ctx.longitude != null
  ) {
    const distance = calculateDistanceKm(ad.latitude, ad.longitude, ctx.latitude, ctx.longitude);
    if (distance > ad.radiusKm) return { ok: false, score: 0 };
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
    { list: ad.officeTypes, section: "offices" },
    { list: ad.toolCategories, section: "engineering-tools" },
  ];
  for (const candidate of sectionSpecific) {
    if (candidate.list.length > 0 && candidate.section === ctx.section) {
      if (isTagIntersect(candidate.list, ctx.tags)) return { ok: true, score: 40 };
      return { ok: false, score: 0 };
    }
  }
  return { ok: true, score: 0 };
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
  if (ad.frequencyCapPerUser > 0 && (stats?.userFrequency.get(ad.id) ?? 0) >= ad.frequencyCapPerUser) return false;
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

  if (ad.isSponsored) score += 20;
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

function isPlacementSpecificHouse(ad: ParsedAd, ctx: ResolvedAdContext): boolean {
  return ad.placements.includes(ctx.placement);
}

/**
 * House/fallback candidates ordered placement-specific first, then global
 * (D13). Each house turn rotates through the candidates evenly.
 */
function selectHouseCandidates(house: ScoredAd[], ctx: ResolvedAdContext, stats?: EngineStats, count = 1): ScoredAd[] {
  const ordered = [...house].sort((a, b) => {
    const aSpecific = isPlacementSpecificHouse(a.ad, ctx) ? 1 : 0;
    const bSpecific = isPlacementSpecificHouse(b.ad, ctx) ? 1 : 0;
    if (aSpecific !== bSpecific) return bSpecific - aSpecific;
    const aGlobal = a.ad.isGlobal ? 1 : 0;
    const bGlobal = b.ad.isGlobal ? 1 : 0;
    if (aGlobal !== bGlobal) return bGlobal - aGlobal;
    return a.ad.priority - b.ad.priority;
  });

  const cumulative = ordered.reduce((sum, candidate) => sum + campaignImpressions(candidate.ad, stats), 0);
  const picks: ScoredAd[] = [];
  for (let i = 0; i < count && ordered.length > 0; i++) {
    picks.push(ordered[(cumulative + i) % ordered.length]);
  }
  return picks;
}

export async function matchAds(db: D1Database, ctx: ResolvedAdContext, options: MatchOptions = {}): Promise<AdMatchResult[]> {
  const now = options.now ?? new Date();
  const ads = options.ads ?? (await loadActiveAds(db, now));
  const stats = options.stats ?? (await loadEngineStats(db, ctx, now));
  const minimumCommercialInventory = Math.max(0, options.minimumCommercialInventory ?? 3);
  const count = Math.max(1, options.count ?? 1);
  const used = options.usedCampaignIds ?? new Set<string>();

  const real: ScoredAd[] = [];
  const fallback: ScoredAd[] = [];

  for (const ad of ads) {
    const score = scoreAd(ad, ctx, now, stats);
    if (score == null) continue;
    if (ad.isFallback) fallback.push({ ad, score });
    else real.push({ ad, score });
  }

  const eligibleCommercial = real.length;
  const houseBudget = eligibleCommercial >= minimumCommercialInventory ? 0 : Math.max(0, minimumCommercialInventory - eligibleCommercial);
  const commercialTurns = Math.min(eligibleCommercial, count);
  const houseTurns = Math.min(houseBudget, Math.max(0, count - commercialTurns));

  const picks: ScoredAd[] = [];

  const fillCommercial = (limit: number) => {
    while (picks.length < limit) {
      const band = selectBand(real, used);
      if (band.length === 0) break;
      const chosen = pickWeighted(band);
      if (!chosen) break;
      picks.push(chosen);
      used.add(chosen.ad.id);
    }
  };

  fillCommercial(commercialTurns);
  if (picks.length < commercialTurns) {
    const leftovers = real.filter((candidate) => !used.has(candidate.ad.id));
    for (const candidate of leftovers) {
      if (picks.length >= commercialTurns) break;
      picks.push(candidate);
      used.add(candidate.ad.id);
    }
  }

  if (picks.length < count) {
    const housePicks = selectHouseCandidates(fallback, ctx, stats, Math.min(houseTurns, count - picks.length));
    picks.push(...housePicks);
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
      eyebrow: ad.eyebrow[locale],
      title: ad.title[locale],
      accent: ad.accent[locale],
      description: ad.description[locale],
      cta: ad.cta[locale],
      targetUrl: ad.targetUrl,
      isSponsored: ad.isSponsored,
      isFeatured: ad.isFeatured,
      isFallback: ad.isFallback,
      placement: ctx.placement,
      channel,
      creativeId: creative?.id ?? null,
      creativePosition,
      creativeCount,
      durationSeconds,
      trackingToken: await signTrackingToken(
        { campaignId: ad.id, placement: ctx.placement, section: ctx.section, pageType: ctx.pageType, creativeId: creative?.id ?? null, channel, inventoryClass: ad.isFallback ? "house" : "commercial" },
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
  options: { stats?: EngineStats; now?: Date; minimumCommercialInventory?: number } = {},
): InventoryHealth {
  const now = options.now ?? new Date();
  const stats = options.stats;
  const minimumCommercialInventory = Math.max(0, options.minimumCommercialInventory ?? 3);

  let eligibleCommercial = 0;
  let commercialImpressions = 0;
  let houseImpressions = 0;

  for (const ad of ads) {
    const isHouse = ad.isFallback;
    const impressions = campaignImpressions(ad, stats);
    if (isHouse) houseImpressions += impressions;
    else commercialImpressions += impressions;
    if (scoreAd(ad, ctx, now, stats) != null && !isHouse) eligibleCommercial += 1;
  }

  const totalValidImpressions = commercialImpressions + houseImpressions;
  const fallbackTurns = eligibleCommercial >= minimumCommercialInventory ? 0 : Math.max(0, minimumCommercialInventory - eligibleCommercial);
  const fallbackActive = fallbackTurns > 0;
  const status: InventoryHealth["status"] =
    eligibleCommercial >= minimumCommercialInventory
      ? "HEALTHY"
      : eligibleCommercial > 0
        ? "PARTIALLY_FILLED"
        : "NO_COMMERCIAL_INVENTORY";

  return {
    placement: ctx.placement,
    channel: ctx.channel ?? "website",
    eligibleCommercial,
    fallbackActive,
    fallbackTurns,
    status,
    commercialImpressions,
    houseImpressions,
    totalValidImpressions,
    commercialFillRate: totalValidImpressions > 0 ? commercialImpressions / totalValidImpressions : 0,
  };
}

export { statDate };
