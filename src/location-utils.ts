export type LocationInfo = {
  country: string;
  countryCode: string;
  governorate: string;
  city: string;
  village: string;
  district: string;
  street: string;
  lat: number | null;
  lng: number | null;
  displayName: string;
};

export type LocationFields = {
  countryCode: string;
  governorate: string;
  city: string;
  village: string;
  district: string;
  street: string;
};

const LOCATION_CACHE_KEY = "akarpromax-location";
const LOCATION_CACHE_TTL = 86_400_000;
const LOCATION_CACHE_MAX = 10;

type LocationCacheEntry = { key: string; data: LocationInfo; timestamp: number };

function locationCacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

function readCache(): LocationCacheEntry[] | null {
  try {
    const raw = localStorage.getItem(LOCATION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LocationCacheEntry[]) : null;
  } catch {
    return null;
  }
}

function writeCache(entries: LocationCacheEntry[]): void {
  try {
    localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(entries.slice(0, LOCATION_CACHE_MAX)));
  } catch {}
}

function freshEntries(entries: LocationCacheEntry[]): LocationCacheEntry[] {
  const now = Date.now();
  const fresh = entries.filter((entry) => now - entry.timestamp <= LOCATION_CACHE_TTL);
  if (fresh.length !== entries.length) writeCache(fresh);
  return fresh;
}

export function getCachedLocation(lat?: number, lng?: number): LocationInfo | null {
  const entries = freshEntries(readCache() ?? []);
  if (!entries.length) return null;
  if (lat !== undefined && lng !== undefined) {
    const key = locationCacheKey(lat, lng);
    const hit = entries.find((entry) => entry.key === key);
    return hit ? hit.data : null;
  }
  const latest = [...entries].sort((a, b) => b.timestamp - a.timestamp)[0];
  return latest ? latest.data : null;
}

export function setCachedLocation(info: LocationInfo, lat?: number, lng?: number): void {
  const entries = readCache() ?? [];
  const key = lat !== undefined && lng !== undefined ? locationCacheKey(lat, lng) : "manual";
  const next = [...entries.filter((entry) => entry.key !== key), { key, data: info, timestamp: Date.now() }];
  writeCache(next);
}

export function detectCountryByTimezone(): string {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timezoneCountryMap: Record<string, string> = {
      "Africa/Algiers": "dz", "Asia/Bahrain": "bh", "Indian/Comoro": "km",
      "Africa/Djibouti": "dj", "Africa/Cairo": "eg", "Asia/Baghdad": "iq",
      "Asia/Amman": "jo", "Asia/Kuwait": "kw", "Asia/Beirut": "lb",
      "Africa/Tripoli": "ly", "Africa/Nouakchott": "mr", "Africa/Casablanca": "ma",
      "Asia/Muscat": "om", "Asia/Gaza": "ps", "Asia/Hebron": "ps", "Asia/Qatar": "qa",
      "Asia/Riyadh": "sa", "Africa/Mogadishu": "so", "Africa/Khartoum": "sd",
      "Asia/Damascus": "sy", "Africa/Tunis": "tn", "Asia/Dubai": "ae", "Asia/Aden": "ye",
      "Europe/Istanbul": "tr",
    };
    return timezoneCountryMap[timeZone] || "";
  } catch {
    return "";
  }
}

export function detectCountryByLanguage(): string {
  try {
    const lang = (navigator.language || "").toLowerCase();
    if (lang.startsWith("ar-om") || lang.startsWith("ar") && lang.includes("om")) return "om";
    if (lang.startsWith("ar-sa")) return "sa";
    if (lang.startsWith("ar-ae")) return "ae";
    if (lang.startsWith("ar-eg")) return "eg";
    if (lang.startsWith("ar-iq")) return "iq";
    if (lang.startsWith("ar-jo")) return "jo";
    if (lang.startsWith("ar-kw")) return "kw";
    if (lang.startsWith("ar-lb")) return "lb";
    if (lang.startsWith("ar-ly")) return "ly";
    if (lang.startsWith("ar-ma")) return "ma";
    if (lang.startsWith("ar-tn")) return "tn";
    if (lang.startsWith("ar-dz")) return "dz";
    if (lang.startsWith("ar-ps")) return "ps";
    if (lang.startsWith("ar-qa")) return "qa";
    if (lang.startsWith("ar-ye")) return "ye";
    if (lang.startsWith("ar-sy")) return "sy";
    if (lang.startsWith("ar-sd")) return "sd";
    if (lang.startsWith("ar-so")) return "so";
    if (lang.startsWith("ar-mr")) return "mr";
    if (lang.startsWith("ar-km")) return "km";
    if (lang.startsWith("ar-dj")) return "dj";
    if (lang.startsWith("ar-bh")) return "bh";
    if (lang.startsWith("tr")) return "tr";
    return "";
  } catch {
    return "";
  }
}

function locationToFields(info: LocationInfo): LocationFields {
  return {
    countryCode: info.countryCode || info.country.toLowerCase() || "om",
    governorate: info.governorate || "",
    city: info.city || "",
    village: info.village || "",
    district: info.district || "",
    street: info.street || "",
  };
}

export { locationToFields };
