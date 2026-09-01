import type { DeviceType } from "@/src/constants/advertising";

export type AdChannel = "website" | "office";

export const AD_CHANNELS: readonly AdChannel[] = ["website", "office"] as const;

export function isAdChannel(value: string | undefined): value is AdChannel {
  return value === "website" || value === "office";
}

export type ResolvedAdContext = {
  section: string;
  pageType: string;
  placement: string;
  channel?: AdChannel;
  entityType?: string;
  entityId?: string;
  categoryId?: string;
  countryCode?: string;
  regionId?: string;
  cityId?: string;
  districtId?: string;
  latitude?: number;
  longitude?: number;
  language: "ar" | "en" | "tr";
  deviceType: DeviceType;
  operatingSystem?: string;
  userId?: string;
  sessionId?: string;
  tags?: string[];
  hour?: number;
  dayOfWeek?: number;
  path?: string;
  domain?: string;
};

export type AdEngineRow = {
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
  channels: string | null;
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
  countries: string | null;
  cities: string | null;
  languages: string | null;
  devices: string | null;
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
};

export type ParsedCreative = {
  id: string;
  mediaType: string;
  mediaUrl: string;
  mobileMediaUrl: string | null;
  tabletMediaUrl: string | null;
  posterUrl: string | null;
  /** Per-locale alternative text; ad images are meaningful and clickable. */
  altText: { ar: string | null; en: string | null; tr: string | null };
  /** Intrinsic pixel size, so the slot can reserve space before load. */
  mediaWidth: number | null;
  mediaHeight: number | null;
  position: number;
  durationSeconds: number;
};

export type ParsedAd = {
  id: string;
  internalName: string;
  advertiserName: string;
  campaignType: string;
  mediaType: string;
  mediaUrl: string;
  mobileMediaUrl: string | null;
  tabletMediaUrl: string | null;
  posterUrl: string | null;
  channels: AdChannel[];
  eyebrow: { ar: string; en: string; tr: string };
  title: { ar: string; en: string; tr: string };
  accent: { ar: string; en: string; tr: string };
  description: { ar: string; en: string; tr: string };
  cta: { ar: string; en: string; tr: string };
  targetUrl: string;
  countries: string[];
  cities: string[];
  languages: string[];
  devices: DeviceType[];
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
  spentAmount: number;
  maxImpressions: number;
  maxClicks: number;
  frequencyCapPerUser: number;
  frequencyCapPeriod: string;
  approvalStatus: string;
  isActive: boolean;
  isFeatured: boolean;
  isFallback: boolean;
  isGlobal: boolean;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  creatives: ParsedCreative[];
};

export type DailyStatRow = {
  campaign_id: string;
  impressions: number;
  unique_impressions: number;
  clicks: number;
  unique_clicks: number;
  conversions: number;
  spent_amount: number;
};

export type EngineStats = {
  daily: Map<string, DailyStatRow>;
  userFrequency: Map<string, number>;
};

export type AdMatchResult = {
  campaignId: string;
  advertiserName: string;
  campaignType: string;
  mediaType: string;
  imageUrl: string;
  posterUrl: string | null;
  /** Localized alt text for the creative (falls back to the ad title). */
  imageAlt: string;
  imageWidth: number | null;
  imageHeight: number | null;
  eyebrow: string;
  title: string;
  accent: string;
  description: string;
  cta: string;
  targetUrl: string;
  isFeatured: boolean;
  placement: string;
  channel: AdChannel;
  creativeId: string | null;
  creativePosition: number;
  creativeCount: number;
  durationSeconds: number;
  trackingToken: string;
};

export type MatchOptions = {
  count?: number;
  usedCampaignIds?: Set<string>;
  stats?: EngineStats;
  ads?: ParsedAd[];
  now?: Date;
};

export type InventoryHealth = {
  placement: string;
  channel: AdChannel;
  eligibleAds: number;
  status: "HEALTHY" | "PARTIALLY_FILLED" | "NO_INVENTORY";
  totalImpressions: number;
  fillRate: number;
};
