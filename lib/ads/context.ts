import { resolveSectionFromPath, resolvePageType, type DeviceType, type PlatformSection } from "@/src/constants/advertising";
import type { ResolvedAdContext } from "@/lib/ads/types";

export const SUPPORTED_LOCALES = ["ar", "en", "tr"] as const;
export const SUPPORTED_DEVICES = ["desktop", "tablet", "mobile"] as const;

export type MatchRequest = {
  path?: string;
  section?: string;
  pageType?: string;
  placement?: string;
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

function cleanTagList(value: unknown, maxItems = 30): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim().toLowerCase()).filter((item) => item.length > 0 && item.length <= 60))].slice(0, maxItems);
}

export function buildContext(input: MatchRequest): ResolvedAdContext {
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

  const sessionId = cleanString(input.sessionId, 120);
  const userId = cleanString(input.userId, 120);
  const entityType = cleanString(input.entityType, 64);
  const operatingSystem = cleanString(input.operatingSystem, 40);

  return {
    section,
    pageType,
    placement,
    entityType: entityType || undefined,
    entityId: input.entityId != null ? String(input.entityId).slice(0, 100) : undefined,
    categoryId: input.categoryId != null ? String(input.categoryId).slice(0, 100) : undefined,
    countryCode: cleanString(input.countryCode, 8) || undefined,
    regionId: input.regionId != null ? String(input.regionId).slice(0, 100) : undefined,
    cityId: input.cityId != null ? String(input.cityId).slice(0, 100) : undefined,
    districtId: input.districtId != null ? String(input.districtId).slice(0, 100) : undefined,
    latitude: cleanNumber(input.latitude),
    longitude: cleanNumber(input.longitude),
    language,
    deviceType,
    operatingSystem: operatingSystem || undefined,
    userId: userId || undefined,
    sessionId: sessionId || undefined,
    tags: cleanTagList(input.tags),
    hour: cleanNumber(input.hour),
    dayOfWeek: cleanNumber(input.dayOfWeek),
    path: path || undefined,
  };
}

export function isValidPlacement(placement: string): boolean {
  return placement.length > 0 && placement.length <= 64 && /^[a-z0-9_-]+$/.test(placement);
}
