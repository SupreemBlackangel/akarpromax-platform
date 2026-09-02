import { AD_PLACEMENTS, resolveSectionFromPath, resolvePageType, type DeviceType, type PlatformSection } from "@/src/constants/advertising";
import type { ResolvedAdContext, AdChannel } from "@/lib/ads/types";
import { isAdChannel } from "@/lib/ads/types";
import type { ServerAdContext } from "@/lib/ads/server-context";

export const SUPPORTED_LOCALES = ["ar", "en", "tr"] as const;
export const SUPPORTED_DEVICES = ["desktop", "tablet", "mobile"] as const;

export type MatchRequest = {
  path?: string;
  section?: string;
  pageType?: string;
  placement?: string;
  channel?: string;
  language?: string;
  deviceType?: string;
  countryCode?: string;
  regionId?: string | number;
  cityId?: string | number;
  districtId?: string | number;
  latitude?: number;
  longitude?: number;
  entityType?: string;
  entityId?: string | number;
  categoryId?: string | number;
  tags?: string[];
  operatingSystem?: string;
  hour?: number;
  dayOfWeek?: number;
  sessionId?: string;
  userId?: string;
  count?: number;
  domain?: string;
};

function cleanString(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function cleanNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function cleanCoordinate(value: unknown, limit: number): number | undefined {
  const parsed = cleanNumber(value);
  return parsed != null && parsed >= -limit && parsed <= limit ? parsed : undefined;
}

function cleanTagList(value: unknown, maxItems = 30): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim().toLowerCase()).filter((item) => item.length > 0 && item.length <= 60))].slice(0, maxItems);
}

/**
 * Build a match context. When `server` is supplied, the fields the request
 * itself proves (device, domain, session) override whatever the browser
 * claimed — the client can no longer pick which device-targeted campaign it
 * sees, bypass a domain allowlist, or reset its own frequency cap by clearing
 * sessionStorage.
 */
export function buildContext(input: MatchRequest, server?: ServerAdContext): ResolvedAdContext {
  const language: ResolvedAdContext["language"] = SUPPORTED_LOCALES.includes(input.language as (typeof SUPPORTED_LOCALES)[number])
    ? (input.language as ResolvedAdContext["language"])
    : "ar";
  const deviceType: DeviceType = SUPPORTED_DEVICES.includes(input.deviceType as DeviceType)
    ? (input.deviceType as DeviceType)
    : "desktop";

  const path = cleanString(input.path, 300);
  const section = cleanString(input.section, 40) || resolveSectionFromPath(path || "/");
  const pageType = cleanString(input.pageType, 40) || resolvePageType(section as PlatformSection, path || "/");
  const placement = cleanString(input.placement, 64);
  const channel: AdChannel = isAdChannel(input.channel) ? input.channel : "website";

  const sessionId = server ? server.sessionId : cleanString(input.sessionId, 120);
  const userId = cleanString(input.userId, 120);
  const entityType = cleanString(input.entityType, 64);
  const operatingSystem = cleanString(input.operatingSystem, 40);

  return {
    section,
    pageType,
    placement,
    channel,
    entityType: entityType || undefined,
    entityId: input.entityId != null ? String(input.entityId).slice(0, 100) : undefined,
    categoryId: input.categoryId != null ? String(input.categoryId).slice(0, 100) : undefined,
    countryCode: server ? server.countryCode : cleanString(input.countryCode, 8) || undefined,
    regionId: input.regionId != null ? String(input.regionId).slice(0, 100) : undefined,
    cityId: input.cityId != null ? String(input.cityId).slice(0, 100) : undefined,
    districtId: input.districtId != null ? String(input.districtId).slice(0, 100) : undefined,
    latitude: cleanCoordinate(input.latitude, 90),
    longitude: cleanCoordinate(input.longitude, 180),
    language,
    deviceType: server ? server.deviceType : deviceType,
    operatingSystem: operatingSystem || undefined,
    userId: userId || undefined,
    sessionId: sessionId || undefined,
    tags: cleanTagList(input.tags),
    hour: cleanNumber(input.hour),
    dayOfWeek: cleanNumber(input.dayOfWeek),
    path: path || undefined,
    domain: server ? server.domain : cleanString(input.domain, 300) || undefined,
    // Dayparting must run on the server clock. These were client-supplied and
    // took precedence in the engine, so a caller could simply claim the hour
    // that made a scheduled campaign eligible.
    ...(server ? { hour: undefined, dayOfWeek: undefined } : {}),
  };
}

export function isValidPlacement(placement: string): boolean {
  return placement.length > 0 && placement.length <= 64 && /^[a-z0-9_-]+$/i.test(placement) && Boolean(AD_PLACEMENTS[placement]);
}
