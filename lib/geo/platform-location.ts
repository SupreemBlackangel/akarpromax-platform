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
  return fromSignal({ isGlobal: true }, "fallback");
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
