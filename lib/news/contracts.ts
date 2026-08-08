/**
 * News & Ticker Engine — domain contracts.
 *
 * Central content model shared by the website ticker/news blocks, the Office
 * news + ticker channels, push/in-app notifications and the admin workspace.
 * The base `news` table remains the single source of truth; rich editorial
 * fields live in the additive `news_extended` table keyed 1:1 by news id.
 */

export const NEWS_CHANNELS = [
  "WEBSITE_NEWS",
  "WEBSITE_TICKER",
  "OFFICE_NEWS",
  "OFFICE_TICKER",
  "PUSH_NOTIFICATION",
  "IN_APP_NOTIFICATION",
] as const;

export type NewsChannel = (typeof NEWS_CHANNELS)[number];

export const NEWS_SOURCE_TYPES = [
  "MANUAL",
  "PLATFORM_EVENT",
  "RSS",
  "EXTERNAL_API",
  "ADMIN_IMPORT",
  "SYSTEM_GENERATED_DRAFT",
] as const;

export type NewsSourceType = (typeof NEWS_SOURCE_TYPES)[number];

export const NEWS_TYPES = [
  "MARKET",
  "LEGAL",
  "GOVERNMENT",
  "PROJECT",
  "COMPANY",
  "REGULATION",
  "EVENT",
  "PRICE_INDEX",
  "GENERAL",
] as const;

export type NewsType = (typeof NEWS_TYPES)[number];

export const NEWS_STATUSES = [
  "draft",
  "active",
  "archived",
  "expired",
  "rejected",
] as const;

export type NewsStatus = (typeof NEWS_STATUSES)[number];

export const REVIEW_STATUSES = ["APPROVED", "REVIEW_REQUIRED", "REJECTED"] as const;

export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const PAGE_TARGET_MODES = [
  "ALL_PAGES",
  "SPECIFIC_PAGES",
  "PAGE_GROUPS",
  "EXCLUDE_PAGES",
] as const;

export type PageTargetMode = (typeof PAGE_TARGET_MODES)[number];

export const COMPLETION_REASONS = [
  "TIME_EXPIRED",
  "IMPRESSION_LIMIT",
  "CLICK_LIMIT",
  "ADMIN_PAUSED",
  "MANUAL_ARCHIVE",
  "SOURCE_DISABLED",
] as const;

export type CompletionReason = (typeof COMPLETION_REASONS)[number];

export const ANALYTICS_EVENT_TYPES = [
  "impression",
  "visible_impression",
  "click",
  "ticker_render",
  "pause",
] as const;

export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];

export const TRUST_LEVELS = ["TRUSTED", "REVIEW_REQUIRED"] as const;

export type TrustLevel = (typeof TRUST_LEVELS)[number];

export type NewsTargeting = {
  pageMode: PageTargetMode;
  pageCodes: string[];
  countries: string[];
  cities: string[];
  languages: string[];
  audiences: string[];
};

export type NewsLimitSet = {
  maxImpressions: number | null;
  maxClicks: number | null;
  maxPerUserPerDay: number | null;
  maxPerSession: number | null;
};

export type NewsExtended = {
  newsId: string;
  slug: string | null;
  summaryAr: string | null;
  summaryEn: string | null;
  summaryTr: string | null;
  bodyAr: string | null;
  bodyEn: string | null;
  bodyTr: string | null;
  category: NewsType;
  tags: string[];
  imageUrl: string | null;
  isBreaking: boolean;
  isPinned: boolean;
  language: string;
  newsType: NewsSourceType;
  sourceName: string | null;
  sourceUrl: string | null;
  sourcePublishedAt: string | null;
  fetchedAt: string | null;
  contentHash: string | null;
  externalId: string | null;
  reviewStatus: ReviewStatus;
};

export type NewsPlacement = {
  id: string;
  newsId: string;
  channel: NewsChannel;
  pageMode: PageTargetMode;
  pageCodes: string[];
  countryCode: string | null;
  cityId: string | null;
  language: string | null;
  audiences: string[];
  priority: number;
  manualOrder: number | null;
  limits: NewsLimitSet;
  startAt: string | null;
  endAt: string | null;
  status: "active" | "paused";
};

export type NewsDeliveryContext = {
  channel: NewsChannel;
  countryCode: string;
  cityId?: string | null;
  language: string;
  pagePath: string;
  pageGroup?: string | null;
  audiences?: string[];
  userKey?: string | null;
  sessionKey?: string | null;
  deviceType?: string | null;
  now?: Date;
};

export type ResolvedNewsItem = {
  id: string;
  scope: string;
  countryCode: string | null;
  cityId: string | null;
  titleAr: string;
  titleEn: string;
  titleTr: string;
  linkUrl: string | null;
  priority: number;
  summaryAr: string | null;
  summaryEn: string | null;
  summaryTr: string | null;
  imageUrl: string | null;
  isBreaking: boolean;
  isPinned: boolean;
  category: NewsType;
  tags: string[];
  sourceName: string | null;
  sourceUrl: string | null;
  updatedAt: string;
};

export function clampPriority(value: unknown, fallback = 100): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(999, Math.round(parsed)));
}
