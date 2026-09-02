import { hasPermission, type UserIdentity } from "@/lib/identity-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import {
  PLATFORM_SECTIONS,
  ALL_SECTIONS,
  PAGE_TYPES_LIST,
  DEVICE_TYPES,
  PRICING_MODELS,
  FREQUENCY_PERIODS,
  APPROVAL_STATUSES,
  AD_PLACEMENTS,
} from "@/src/constants/advertising";

const statuses = ["draft", "active", "paused", "expired", "archived"] as const;
const campaignTypes = ["platform", "property", "service", "request"] as const;
const mediaTypes = ["image", "video"] as const;
const supportedLocales = ["ar", "en", "tr"] as const;

export const MAX_AD_CREATIVES = 5;

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function cleanUrl(value: unknown, required = false) {
  const candidate = clean(value, 800);
  if (!candidate) return required ? "" : null;
  if (candidate.startsWith("#")) return candidate;
  if (candidate.startsWith("/") && !candidate.startsWith("//")) return candidate;
  try {
    const url = new URL(candidate);
    return ["https:", "http:", "mailto:"].includes(url.protocol) ? url.toString() : required ? "" : null;
  } catch {
    return required ? "" : null;
  }
}

function cleanChoice(value: unknown, choices: readonly string[], fallback: string) {
  const candidate = clean(value, 30);
  return choices.includes(candidate) ? candidate : fallback;
}

function cleanList(value: unknown, pattern: RegExp, maxItems = 80) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => clean(item, 100).toLowerCase()).filter((item) => pattern.test(item)))].slice(0, maxItems);
}

function cleanNumber(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
}

function cleanLatLng(value: unknown, min: number, max: number): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(min, Math.min(max, parsed));
}

function cleanDayList(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item >= 0 && item <= 6))].slice(0, 7);
}

function validPlacementsForScopes(placements: string[], scopes: string[]): string[] {
  const allowedSections = new Set(scopes.length ? scopes : ALL_SECTIONS);
  return placements.filter((placement) => {
    const meta = AD_PLACEMENTS[placement];
    if (!meta) return false;
    return meta.sections.some((section) => allowedSections.has(section));
  });
}

export type CampaignPayload = {
  internalName: string;
  advertiserName: string;
  campaignType: string;
  status: string;
  mediaType: string;
  mediaUrl: string;
  mobileMediaUrl: string | null;
  tabletMediaUrl: string | null;
  posterUrl: string | null;
  channels: string[];
  creatives: CreativePayload[];
  eyebrowAr: string;
  eyebrowEn: string;
  eyebrowTr: string;
  titleAr: string;
  titleEn: string;
  titleTr: string;
  accentAr: string;
  accentEn: string;
  accentTr: string;
  descriptionAr: string;
  descriptionEn: string;
  descriptionTr: string;
  ctaAr: string;
  ctaEn: string;
  ctaTr: string;
  targetUrl: string;
  countries: string[];
  cities: string[];
  languages: string[];
  devices: string[];
  priority: number;
  weight: number;
  startAt: string | null;
  endAt: string | null;
  sectionScopes: string[];
  pageTypes: string[];
  placements: string[];
  domains: string[];
  regionIds: string[];
  districtIds: string[];
  latitude: number | null;
  longitude: number | null;
  radiusKm: number | null;
  targetAllCountries: boolean;
  targetAllRegions: boolean;
  targetAllCities: boolean;
  targetAllDistricts: boolean;
  entityType: string | null;
  entityIds: string[];
  categoryIds: string[];
  propertyTypes: string[];
  serviceCategories: string[];
  officeTypes: string[];
  toolCategories: string[];
  operatingSystems: string[];
  dailyStartTime: string | null;
  dailyEndTime: string | null;
  daysOfWeek: number[];
  rotationGroup: string | null;
  pricingModel: string;
  price: number;
  budget: number;
  dailyBudget: number;
  maxImpressions: number;
  maxClicks: number;
  frequencyCapPerUser: number;
  frequencyCapPeriod: string;
  isActive: boolean;
  isFeatured: boolean;
  isGlobal: boolean;
};

function cleanTime(value: unknown): string | null {
  const candidate = clean(value, 8);
  if (!/^\d{1,2}:\d{2}$/.test(candidate)) return null;
  const [hours, minutes] = candidate.split(":").map(Number);
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export type CreativePayload = {
  id: string;
  mediaType: string;
  mediaUrl: string;
  mobileMediaUrl: string | null;
  tabletMediaUrl: string | null;
  posterUrl: string | null;
  /** Localized alt text. `null` means "leave whatever is stored" on update. */
  altText: { ar: string | null; en: string | null; tr: string | null };
  /** Intrinsic pixels, captured at upload; `null` = unknown / keep stored. */
  mediaWidth: number | null;
  mediaHeight: number | null;
  position: number;
  durationSeconds: number;
  status: string;
};

function positiveInt(value: unknown): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 && n <= 20000 ? n : null;
}

export function normaliseCreatives(body: Record<string, unknown>): CreativePayload[] {
  const cap = MAX_AD_CREATIVES;
  if (!Array.isArray(body.creatives)) return [];
  return body.creatives.slice(0, cap).flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const creative = item as Record<string, unknown>;
    const mediaUrl = cleanUrl(creative.mediaUrl, true);
    if (!mediaUrl) return [];
    return [{
      id: clean(creative.id, 80) || crypto.randomUUID(),
      mediaType: cleanChoice(creative.mediaType, mediaTypes, "image"),
      mediaUrl,
      mobileMediaUrl: cleanUrl(creative.mobileMediaUrl),
      tabletMediaUrl: cleanUrl(creative.tabletMediaUrl),
      posterUrl: cleanUrl(creative.posterUrl),
      altText: {
        ar: clean(creative.altTextAr, 180) || null,
        en: clean(creative.altTextEn, 180) || null,
        tr: clean(creative.altTextTr, 180) || null,
      },
      mediaWidth: positiveInt(creative.mediaWidth),
      mediaHeight: positiveInt(creative.mediaHeight),
      position: index + 1,
      durationSeconds: Math.max(3, Math.min(15, Number(creative.durationSeconds) || 6)),
      status: "active",
    }];
  });
}

export function normaliseCampaignPayload(body: Record<string, unknown>): CampaignPayload {
  const countries = cleanList(body.countries, /^[a-z]{2}$/, 30);
  const sectionScopes = cleanList(body.sectionScopes, /^[a-z0-9-]+$/, 20);
  const placements = validPlacementsForScopes(cleanList(body.placements, /^[a-z0-9_-]+$/, 60), sectionScopes);
  const channels = cleanList(body.channels, /^(?:website|office)$/, 2);
  if (!channels.length) channels.push("website");

  return {
    internalName: clean(body.internalName, 140),
    advertiserName: clean(body.advertiserName, 140),
    campaignType: cleanChoice(body.campaignType, campaignTypes, "platform"),
    status: cleanChoice(body.status, statuses, "draft"),
    mediaType: cleanChoice(body.mediaType, mediaTypes, "image"),
    mediaUrl: cleanUrl(body.mediaUrl, true) || "",
    mobileMediaUrl: cleanUrl(body.mobileMediaUrl),
    tabletMediaUrl: cleanUrl(body.tabletMediaUrl),
    posterUrl: cleanUrl(body.posterUrl),
    channels,
    creatives: normaliseCreatives(body),
    eyebrowAr: clean(body.eyebrowAr, 100),
    eyebrowEn: clean(body.eyebrowEn, 100),
    eyebrowTr: clean(body.eyebrowTr, 100),
    titleAr: clean(body.titleAr, 180),
    titleEn: clean(body.titleEn, 180),
    titleTr: clean(body.titleTr, 180),
    accentAr: clean(body.accentAr, 180),
    accentEn: clean(body.accentEn, 180),
    accentTr: clean(body.accentTr, 180),
    descriptionAr: clean(body.descriptionAr, 320),
    descriptionEn: clean(body.descriptionEn, 320),
    descriptionTr: clean(body.descriptionTr, 320),
    ctaAr: clean(body.ctaAr, 70),
    ctaEn: clean(body.ctaEn, 70),
    ctaTr: clean(body.ctaTr, 70),
    targetUrl: cleanUrl(body.targetUrl, true) || "",
    countries,
    cities: cleanList(body.cities, /^[a-z0-9-]{2,100}$/, 120),
    languages: cleanList(body.languages, /^(?:ar|en|tr)$/, 3),
    devices: cleanList(body.devices, /^(?:desktop|tablet|mobile)$/, 3),
    priority: cleanNumber(body.priority, 1, 999, 100),
    weight: cleanNumber(body.weight, 1, 100, 100),
    startAt: clean(body.startAt, 40) || null,
    endAt: clean(body.endAt, 40) || null,
    sectionScopes,
    pageTypes: cleanList(body.pageTypes, /^[a-z0-9-]+$/, 20).filter((item) => PAGE_TYPES_LIST.includes(item as never)),
    placements,
    domains: cleanList(body.domains, /^[a-z0-9.-]{1,255}$/, 40),
    regionIds: cleanList(body.regionIds, /^[a-z0-9-]{2,100}$/, 60),
    districtIds: cleanList(body.districtIds, /^[a-z0-9-]{2,100}$/, 60),
    latitude: cleanLatLng(body.latitude, -90, 90),
    longitude: cleanLatLng(body.longitude, -180, 180),
    radiusKm: body.radiusKm == null ? null : cleanNumber(body.radiusKm, 1, 20000, 50),
    targetAllCountries: Boolean(body.targetAllCountries),
    targetAllRegions: Boolean(body.targetAllRegions),
    targetAllCities: Boolean(body.targetAllCities),
    targetAllDistricts: Boolean(body.targetAllDistricts),
    entityType: clean(body.entityType, 64) || null,
    entityIds: cleanList(body.entityIds, /^[a-z0-9-]{1,100}$/, 100),
    categoryIds: cleanList(body.categoryIds, /^[a-z0-9-]{1,100}$/, 100),
    propertyTypes: cleanList(body.propertyTypes, /^[a-z0-9 -]{1,100}$/, 40),
    serviceCategories: cleanList(body.serviceCategories, /^[a-z0-9 -]{1,100}$/, 40),
    officeTypes: cleanList(body.officeTypes, /^[a-z0-9 -]{1,100}$/, 40),
    toolCategories: cleanList(body.toolCategories, /^[a-z0-9 -]{1,100}$/, 40),
    operatingSystems: cleanList(body.operatingSystems, /^[a-z0-9_ .]{1,40}$/, 10),
    dailyStartTime: cleanTime(body.dailyStartTime),
    dailyEndTime: cleanTime(body.dailyEndTime),
    daysOfWeek: cleanDayList(body.daysOfWeek),
    rotationGroup: clean(body.rotationGroup, 64) || null,
    pricingModel: cleanChoice(body.pricingModel, PRICING_MODELS, "fixed"),
    price: Math.max(0, cleanNumber(body.price, 0, 10_000_000_000, 0)),
    budget: Math.max(0, cleanNumber(body.budget, 0, 10_000_000_000, 0)),
    dailyBudget: Math.max(0, cleanNumber(body.dailyBudget, 0, 10_000_000_000, 0)),
    maxImpressions: Math.max(0, cleanNumber(body.maxImpressions, 0, 1_000_000_000, 0)),
    maxClicks: Math.max(0, cleanNumber(body.maxClicks, 0, 1_000_000_000, 0)),
    frequencyCapPerUser: Math.max(0, cleanNumber(body.frequencyCapPerUser, 0, 1_000_000, 0)),
    frequencyCapPeriod: cleanChoice(body.frequencyCapPeriod, FREQUENCY_PERIODS, "day"),
    isActive: body.isActive !== false,
    isFeatured: Boolean(body.isFeatured),
    isGlobal: Boolean(body.isGlobal),
  };
}

export function validateCampaignPayload(payload: CampaignPayload): boolean {
  return Boolean(
    payload.internalName &&
    payload.advertiserName &&
    payload.mediaUrl &&
    payload.eyebrowAr && payload.eyebrowEn && payload.eyebrowTr &&
    payload.titleAr && payload.titleEn && payload.titleTr &&
    payload.accentAr && payload.accentEn && payload.accentTr &&
    payload.descriptionAr && payload.descriptionEn && payload.descriptionTr &&
    payload.ctaAr && payload.ctaEn && payload.ctaTr &&
    payload.targetUrl &&
    payload.channels.length &&
    payload.languages.length &&
    payload.devices.length,
  );
}

export function canManageTargets(identity: UserIdentity, countries: string[]): boolean {
  if (identity.role === "super_admin" || identity.role === "ad_manager") return true;
  if (!identity.countryCode) return false;
  return countries.length === 1 && countries[0] === identity.countryCode.toLowerCase();
}

export function resolveApprovalStatus(body: Record<string, unknown>, identity: UserIdentity): string {
  const requested = clean(body.approvalStatus, 16);
  if (APPROVAL_STATUSES.includes(requested as never) && hasPermission(identity, PERMISSIONS.ADS_APPROVE)) {
    return requested;
  }
  return hasPermission(identity, PERMISSIONS.ADS_APPROVE) ? "approved" : "pending";
}

export function cleanBoolList(value: unknown, allowed: readonly string[], maxItems = 20): string[] {
  return cleanList(value, /^[a-z0-9_-]+$/, maxItems).filter((item) => allowed.includes(item));
}

export function allSectionKeys(): string[] {
  return Object.values(PLATFORM_SECTIONS);
}

export { supportedLocales, statuses, campaignTypes, mediaTypes, DEVICE_TYPES, APPROVAL_STATUSES };

export const ADMIN_CAMPAIGN_SELECT = `
  SELECT a.id, a.internal_name, a.advertiser_name, a.campaign_type, a.status,
         a.media_type, a.media_url, a.mobile_media_url, a.tablet_media_url, a.poster_url, a.channels,
         a.eyebrow_ar, a.eyebrow_en, a.eyebrow_tr, a.title_ar, a.title_en, a.title_tr,
         a.accent_ar, a.accent_en, a.accent_tr, a.description_ar, a.description_en, a.description_tr,
         a.cta_ar, a.cta_en, a.cta_tr, a.target_url,
         a.countries, a.cities, a.languages, a.devices, a.priority, a.weight, a.start_at, a.end_at,
         a.section_scopes, a.page_types, a.placements, a.domains, a.region_ids, a.district_ids,
         a.latitude, a.longitude, a.radius_km,
         a.target_all_countries, a.target_all_regions, a.target_all_cities, a.target_all_districts,
         a.entity_type, a.entity_ids, a.category_ids,
         a.property_types, a.service_categories, a.office_types, a.tool_categories,
         a.operating_systems, a.daily_start_time, a.daily_end_time, a.days_of_week, a.rotation_group,
         a.pricing_model, a.price, a.budget, a.daily_budget, a.spent_amount,
         a.max_impressions, a.max_clicks, a.frequency_cap_per_user, a.frequency_cap_period,
         a.approval_status, a.is_active, a.is_sponsored, a.is_featured, a.is_fallback, a.is_global,
         a.total_impressions, a.total_unique_impressions, a.total_clicks, a.total_unique_clicks,
         a.total_conversions, a.approved_by, a.deleted_at,
         a.created_by, a.created_at, a.updated_at
  FROM ad_campaigns a
`;

type AdminRow = {
  id: string;
  internal_name: string;
  advertiser_name: string;
  campaign_type: string;
  status: string;
  media_type: string;
  media_url: string;
  mobile_media_url: string | null;
  tablet_media_url: string | null;
  poster_url: string | null;
  channels: string;
  eyebrow_ar: string;
  eyebrow_en: string;
  eyebrow_tr: string;
  title_ar: string;
  title_en: string;
  title_tr: string;
  accent_ar: string;
  accent_en: string;
  accent_tr: string;
  description_ar: string;
  description_en: string;
  description_tr: string;
  cta_ar: string;
  cta_en: string;
  cta_tr: string;
  target_url: string;
  countries: string;
  cities: string;
  languages: string;
  devices: string;
  priority: number;
  weight: number;
  start_at: string | null;
  end_at: string | null;
  section_scopes: string | null;
  page_types: string | null;
  placements: string | null;
  domains: string | null;
  region_ids: string | null;
  district_ids: string | null;
  latitude: number | null;
  longitude: number | null;
  radius_km: number | null;
  target_all_countries: number;
  target_all_regions: number;
  target_all_cities: number;
  target_all_districts: number;
  entity_type: string | null;
  entity_ids: string | null;
  category_ids: string | null;
  property_types: string | null;
  service_categories: string | null;
  office_types: string | null;
  tool_categories: string | null;
  operating_systems: string | null;
  daily_start_time: string | null;
  daily_end_time: string | null;
  days_of_week: string | null;
  rotation_group: string | null;
  pricing_model: string;
  price: number;
  budget: number;
  daily_budget: number;
  spent_amount: number;
  max_impressions: number;
  max_clicks: number;
  frequency_cap_per_user: number;
  frequency_cap_period: string;
  approval_status: string;
  is_active: number;
  is_sponsored: number;
  is_featured: number;
  is_fallback: number;
  is_global: number;
  total_impressions: number;
  total_unique_impressions: number;
  total_clicks: number;
  total_unique_clicks: number;
  total_conversions: number;
  approved_by: string | null;
  deleted_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

function parseList(value: string | null | undefined, fallback: string[] = []): string[] {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : fallback;
  } catch {
    return fallback;
  }
}

function parseNumberList(value: string | null | undefined): number[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is number => typeof item === "number") : [];
  } catch {
    return [];
  }
}

export function serialiseCampaign(row: AdminRow) {
  return {
    id: row.id,
    internalName: row.internal_name,
    advertiserName: row.advertiser_name,
    campaignType: row.campaign_type,
    status: row.status,
    mediaType: row.media_type,
    mediaUrl: row.media_url,
    mobileMediaUrl: row.mobile_media_url,
    tabletMediaUrl: row.tablet_media_url,
    posterUrl: row.poster_url,
    channels: parseList(row.channels, ["website"]),
    eyebrow: { ar: row.eyebrow_ar, en: row.eyebrow_en, tr: row.eyebrow_tr },
    title: { ar: row.title_ar, en: row.title_en, tr: row.title_tr },
    accent: { ar: row.accent_ar, en: row.accent_en, tr: row.accent_tr },
    description: { ar: row.description_ar, en: row.description_en, tr: row.description_tr },
    cta: { ar: row.cta_ar, en: row.cta_en, tr: row.cta_tr },
    targetUrl: row.target_url,
    countries: parseList(row.countries),
    cities: parseList(row.cities),
    languages: parseList(row.languages, ["ar", "en", "tr"]),
    devices: parseList(row.devices, ["desktop", "mobile"]),
    priority: Number(row.priority),
    weight: Number(row.weight),
    startAt: row.start_at,
    endAt: row.end_at,
    sectionScopes: parseList(row.section_scopes),
    pageTypes: parseList(row.page_types),
    placements: parseList(row.placements),
    domains: parseList(row.domains),
    regionIds: parseList(row.region_ids),
    districtIds: parseList(row.district_ids),
    latitude: row.latitude == null ? null : Number(row.latitude),
    longitude: row.longitude == null ? null : Number(row.longitude),
    radiusKm: row.radius_km == null ? null : Number(row.radius_km),
    targetAllCountries: Number(row.target_all_countries) === 1,
    targetAllRegions: Number(row.target_all_regions) === 1,
    targetAllCities: Number(row.target_all_cities) === 1,
    targetAllDistricts: Number(row.target_all_districts) === 1,
    entityType: row.entity_type,
    entityIds: parseList(row.entity_ids),
    categoryIds: parseList(row.category_ids),
    propertyTypes: parseList(row.property_types),
    serviceCategories: parseList(row.service_categories),
    officeTypes: parseList(row.office_types),
    toolCategories: parseList(row.tool_categories),
    operatingSystems: parseList(row.operating_systems),
    dailyStartTime: row.daily_start_time,
    dailyEndTime: row.daily_end_time,
    daysOfWeek: parseNumberList(row.days_of_week),
    rotationGroup: row.rotation_group,
    pricingModel: row.pricing_model,
    price: Number(row.price),
    budget: Number(row.budget),
    dailyBudget: Number(row.daily_budget),
    spentAmount: Number(row.spent_amount),
    maxImpressions: Number(row.max_impressions),
    maxClicks: Number(row.max_clicks),
    frequencyCapPerUser: Number(row.frequency_cap_per_user),
    frequencyCapPeriod: row.frequency_cap_period,
    approvalStatus: row.approval_status,
    isActive: Number(row.is_active) === 1,
    isFeatured: Number(row.is_featured) === 1,
    isGlobal: Number(row.is_global) === 1,
    totalImpressions: Number(row.total_impressions),
    totalUniqueImpressions: Number(row.total_unique_impressions),
    totalClicks: Number(row.total_clicks),
    totalUniqueClicks: Number(row.total_unique_clicks),
    totalConversions: Number(row.total_conversions),
    approvedBy: row.approved_by,
    deletedAt: row.deleted_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type { AdminRow };

