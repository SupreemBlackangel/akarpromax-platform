export type PlatformLocationSource = "manual" | "auto" | "fallback";

export type PlatformLocation = {
  countryCode: string;
  governorate: string;
  city: string;
  district: string;
  latitude: number | null;
  longitude: number | null;
  isGlobal: boolean;
  source: PlatformLocationSource;
};

export type PlatformLocationSignal = Partial<
  Omit<PlatformLocation, "source" | "latitude" | "longitude">
> & {
  latitude?: unknown;
  longitude?: unknown;
};

export function normalizeGeoToken(value: unknown): string {
  return typeof value === "string"
    ? value.normalize("NFKC").trim().toLocaleLowerCase("en")
    : "";
}

export function normalizeCoordinate(
  value: unknown,
  kind: "latitude" | "longitude",
): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  const limit = kind === "latitude" ? 90 : 180;
  return Number.isFinite(parsed) && parsed >= -limit && parsed <= limit ? parsed : null;
}

function fromSignal(signal: PlatformLocationSignal, source: PlatformLocationSource): PlatformLocation {
  if (signal.isGlobal) {
    return {
      countryCode: "",
      governorate: "",
      city: "",
      district: "",
      latitude: null,
      longitude: null,
      isGlobal: true,
      source,
    };
  }

  const countryCode = normalizeGeoToken(signal.countryCode);
  return {
    countryCode,
    governorate: String(signal.governorate ?? "").trim(),
    city: String(signal.city ?? "").trim(),
    district: String(signal.district ?? "").trim(),
    latitude: normalizeCoordinate(signal.latitude, "latitude"),
    longitude: normalizeCoordinate(signal.longitude, "longitude"),
    isGlobal: !countryCode,
    source: countryCode ? source : "fallback",
  };
}

/** Manual selection is atomic and always wins over GPS/IP/browser signals. */
export function resolvePlatformLocation(input: {
  manual?: PlatformLocationSignal | null;
  auto?: PlatformLocationSignal | null;
}): PlatformLocation {
  const manual = input.manual;
  if (manual && (manual.isGlobal || normalizeGeoToken(manual.countryCode))) {
    return fromSignal(manual, "manual");
  }
  const auto = input.auto;
  if (auto && normalizeGeoToken(auto.countryCode)) {
    return fromSignal(auto, "auto");
  }
  // No signal at all: default to the platform's home market (Oman) so the
  // header location cluster, currency and country-scoped surfaces render
  // complete. "All countries" remains an explicit choice, never a fallback.
  return fromSignal({ countryCode: "om" }, "fallback");
}

export type GeoAliasRow = {
  id?: string | null;
  code?: string | null;
  nameAr?: string | null;
  nameEn?: string | null;
  nameTr?: string | null;
};

export function geoAliases(row: GeoAliasRow): string[] {
  return [...new Set([
    row.id,
    row.code,
    row.nameAr,
    row.nameEn,
    row.nameTr,
  ].map(normalizeGeoToken).filter(Boolean))];
}

export function matchesGeoAlias(row: GeoAliasRow, value: unknown): boolean {
  const token = normalizeGeoToken(value);
  return Boolean(token) && geoAliases(row).includes(token);
}

// Arabic orthography the writer varies and the reader does not: harakat and
// tatweel, the hamza forms of alef, the final ta-marbuta/ha and alef-maqsura,
// and the generic prefix a publisher may or may not type ("حي النسيم" vs
// "النسيم"). Stripped here so the same place cannot enter the registry twice.
const ARABIC_DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;
const PLACE_PREFIXES = [
  "حي",
  "حارة",
  "قرية",
  "هجرة",
  "بلدة",
  "مدينة",
  "محافظة",
  "منطقة",
  "ولاية",
  "مركز",
  "ضاحية",
  "مخطط",
];

/**
 * The deduplication key for a registry place name. Two names that differ only
 * in spelling habits collapse onto one key; genuinely different names never
 * do. Used for the (parent, match_key) unique index — NOT for matching stored
 * free-text values, which `normalizeGeoToken` still owns.
 */
export function geoMatchKey(value: unknown): string {
  let text = typeof value === "string" ? value.normalize("NFKC") : "";
  if (!text) return "";
  text = text
    .replace(ARABIC_DIACRITICS, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .toLocaleLowerCase("en");

  for (const prefix of PLACE_PREFIXES) {
    const stripped = geoMatchKeyPrefixStrip(text, prefix);
    if (stripped) {
      text = stripped;
      break;
    }
  }
  // "ال" is a definite article here, not part of the name, unless removing it
  // would leave nothing to match on.
  const withoutArticle = text.startsWith("ال") ? text.slice(2).trim() : text;
  return (withoutArticle || text).replace(/\s+/g, " ");
}

function geoMatchKeyPrefixStrip(text: string, prefix: string): string | null {
  const normalizedPrefix = prefix.replace(/ة/g, "ه");
  if (!text.startsWith(`${normalizedPrefix} `)) return null;
  const rest = text.slice(normalizedPrefix.length).trim();
  return rest || null;
}
