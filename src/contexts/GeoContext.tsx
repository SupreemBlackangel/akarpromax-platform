"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  matchesGeoAlias,
  normalizeCoordinate,
  normalizeGeoToken,
  resolvePlatformLocation,
  type PlatformLocation,
  type PlatformLocationSignal,
  type PlatformLocationSource,
} from "@/lib/geo/platform-location";

export type CountryConfig = {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  nameTr: string;
  phoneCode: string;
  currencyCode: string;
  isActive: boolean;
  displayOrder: number;
  mapCenterLat?: number | null;
  mapCenterLng?: number | null;
  defaultZoom?: number | null;
};

export type GeoState = PlatformLocation & {
  countryConfig: CountryConfig | null;
  countries: CountryConfig[];
  resolving: boolean;
  setCountry: (code: string) => void;
  setGovernorate: (value: string) => void;
  setCity: (
    value: string,
    coordinates?: { latitude: number | null; longitude: number | null },
  ) => void;
  setDistrict: (value: string) => void;
  setCoordinates: (latitude: number | null, longitude: number | null) => void;
  setDetectedLocation: (value: PlatformLocationSignal) => boolean;
  /** User-initiated device location: always applies (re-enables auto mode
      even over a previous manual selection, unlike setDetectedLocation). */
  applyDeviceLocation: (value: PlatformLocationSignal) => void;
  setGlobal: () => void;
  resetLocation: () => void;
};

const STORAGE_KEY = "akarpromax-country";
const STORAGE_KEY_GOV = "akarpromax-governorate";
const STORAGE_KEY_CITY = "akarpromax-city";
const STORAGE_KEY_DISTRICT = "akarpromax-district";
const STORAGE_KEY_LAT = "akarpromax-latitude";
const STORAGE_KEY_LNG = "akarpromax-longitude";
const STORAGE_KEY_GLOBAL = "akarpromax-global";
const STORAGE_KEY_SOURCE = "akarpromax-location-source";
const COUNTRIES_CACHE_KEY = "akarpromax-countries-cache";
const COUNTRIES_CACHE_TTL = 86_400_000;

const TZ_MAP: Record<string, string> = {
  "Africa/Algiers": "dz", "Asia/Bahrain": "bh", "Indian/Comoro": "km",
  "Africa/Djibouti": "dj", "Africa/Cairo": "eg", "Asia/Baghdad": "iq",
  "Asia/Amman": "jo", "Asia/Kuwait": "kw", "Asia/Beirut": "lb",
  "Africa/Tripoli": "ly", "Africa/Nouakchott": "mr", "Africa/Casablanca": "ma",
  "Asia/Muscat": "om", "Asia/Gaza": "ps", "Asia/Hebron": "ps", "Asia/Qatar": "qa",
  "Asia/Riyadh": "sa", "Africa/Mogadishu": "so", "Africa/Khartoum": "sd",
  "Asia/Damascus": "sy", "Africa/Tunis": "tn", "Asia/Dubai": "ae", "Asia/Aden": "ye",
  "Europe/Istanbul": "tr",
};

function detectByTimezone(): string {
  try {
    return TZ_MAP[Intl.DateTimeFormat().resolvedOptions().timeZone] || "";
  } catch {
    return "";
  }
}

function detectByLanguage(): string {
  try {
    const language = (navigator.language || "").toLowerCase();
    const match = /^ar-([a-z]{2})\b/.exec(language);
    if (match?.[1]) return match[1];
    return language.startsWith("tr") ? "tr" : "";
  } catch {
    return "";
  }
}

function readStorage(key: string): string {
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function writeStorage(key: string, value: string): void {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // Storage can be disabled; the in-memory selection still remains valid.
  }
}

function persistLocation(location: PlatformLocation): void {
  writeStorage(STORAGE_KEY_SOURCE, location.source === "fallback" ? "" : location.source);
  writeStorage(STORAGE_KEY_GLOBAL, location.isGlobal && location.source === "manual" ? "1" : "");
  writeStorage(STORAGE_KEY, location.countryCode);
  writeStorage(STORAGE_KEY_GOV, location.governorate);
  writeStorage(STORAGE_KEY_CITY, location.city);
  writeStorage(STORAGE_KEY_DISTRICT, location.district);
  writeStorage(STORAGE_KEY_LAT, location.latitude == null ? "" : String(location.latitude));
  writeStorage(STORAGE_KEY_LNG, location.longitude == null ? "" : String(location.longitude));
}

function locationFromUrl(): PlatformLocation | null {
  const params = new URLSearchParams(window.location.search);
  const explicitGlobal = params.get("country")?.toLowerCase() === "all" || params.get("global") === "1";
  if (explicitGlobal) return resolvePlatformLocation({ manual: { isGlobal: true } });

  const countryCode = normalizeGeoToken(params.get("country"));
  if (!countryCode) return null;
  return resolvePlatformLocation({
    manual: {
      countryCode,
      governorate: params.get("governorate") || "",
      city: params.get("city") || "",
      district: params.get("district") || "",
      latitude: params.get("lat"),
      longitude: params.get("lng"),
    },
  });
}

function locationFromStorage(): PlatformLocation | null {
  const storedSource = readStorage(STORAGE_KEY_SOURCE);
  const source: PlatformLocationSource = storedSource === "auto" ? "auto" : "manual";
  if (readStorage(STORAGE_KEY_GLOBAL) === "1") {
    return resolvePlatformLocation({ manual: { isGlobal: true } });
  }

  const countryCode = normalizeGeoToken(readStorage(STORAGE_KEY));
  if (!countryCode) return null;
  const signal: PlatformLocationSignal = {
    countryCode,
    governorate: readStorage(STORAGE_KEY_GOV),
    city: readStorage(STORAGE_KEY_CITY),
    district: readStorage(STORAGE_KEY_DISTRICT),
    latitude: readStorage(STORAGE_KEY_LAT),
    longitude: readStorage(STORAGE_KEY_LNG),
  };
  return source === "manual"
    ? resolvePlatformLocation({ manual: signal })
    : resolvePlatformLocation({ auto: signal });
}

function resolveSync(): PlatformLocation {
  if (typeof window === "undefined") return resolvePlatformLocation({});
  const explicit = locationFromUrl() ?? locationFromStorage();
  if (explicit) return explicit;
  const detectedCountry = detectByTimezone() || detectByLanguage();
  return resolvePlatformLocation({ auto: detectedCountry ? { countryCode: detectedCountry } : null });
}

async function fetchCountries(): Promise<CountryConfig[]> {
  try {
    const raw = localStorage.getItem(COUNTRIES_CACHE_KEY);
    if (raw) {
      const cached = JSON.parse(raw) as { data: CountryConfig[]; ts: number };
      if (Date.now() - cached.ts < COUNTRIES_CACHE_TTL && Array.isArray(cached.data) && cached.data.length > 0) {
        return cached.data.map((country) => ({ ...country, code: normalizeGeoToken(country.code) }));
      }
    }
  } catch {
    // Ignore an invalid cache and use the API.
  }

  try {
    const response = await fetch("/api/geo?type=countries", { cache: "no-store" });
    if (!response.ok) return [];
    const json = await response.json();
    const source: CountryConfig[] = Array.isArray(json) ? json : json.data ?? [];
    const rows = source.map((country) => ({ ...country, code: normalizeGeoToken(country.code) }));
    try {
      localStorage.setItem(COUNTRIES_CACHE_KEY, JSON.stringify({ data: rows, ts: Date.now() }));
    } catch {
      // Caching is an optimization only.
    }
    return rows;
  } catch {
    return [];
  }
}

/**
 * Desktop's own IP-based location is already accurate enough (governorate +
 * city) and desktop GPS is frequently no better (Wi-Fi-positioned, or simply
 * unavailable) — so only mobile, where GPS is fast and genuinely more
 * precise, is worth an automatic location permission prompt. This mirrors
 * how most mobile-first marketplaces (delivery, classifieds, real estate)
 * split it: IP on desktop, device GPS on phones.
 */
function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const uaData = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData;
  if (uaData && typeof uaData.mobile === "boolean") return uaData.mobile;
  return /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(navigator.userAgent);
}

type IpLocation = { countryCode: string; city: string; governorate: string };

const EMPTY_IP_LOCATION: IpLocation = { countryCode: "", city: "", governorate: "" };

/**
 * Fully silent, zero-intervention location signal: no permission prompt, no
 * button — just the visitor's IP. Good enough for a default city/governorate;
 * device GPS (which needs a user gesture) is reserved for search flows that
 * want to ask for it explicitly.
 */
async function detectByIp(): Promise<IpLocation> {
  try {
    const response = await fetch("https://ipinfo.io/json", { cache: "no-store" });
    if (!response.ok) return EMPTY_IP_LOCATION;
    const data = await response.json();
    return {
      countryCode: normalizeGeoToken(data.country),
      city: String(data.city ?? "").trim(),
      governorate: String(data.region ?? "").trim(),
    };
  } catch {
    return EMPTY_IP_LOCATION;
  }
}

type GeoRegistryRow = {
  id: string;
  code?: string | null;
  nameAr?: string | null;
  nameEn?: string | null;
  nameTr?: string | null;
};

async function fetchGeoRows(type: "governorates" | "cities" | "districts", parentId: string): Promise<GeoRegistryRow[]> {
  try {
    const query = new URLSearchParams({ type, parentId });
    const response = await fetch(`/api/geo?${query.toString()}`, { cache: "no-store" });
    if (!response.ok) return [];
    const body = await response.json();
    return Array.isArray(body.data) ? body.data : [];
  } catch {
    return [];
  }
}

function rowValue(row: GeoRegistryRow): string {
  return row.code?.trim() || row.id;
}

type NormalizedGeoNames = { governorate: string; city: string; district: string };

/**
 * External detection sources (ipinfo, Nominatim) return free-form names —
 * "Mecca Region", "منطقة مكة" — that the platform's geo registry (and every
 * API's resolveGeoSelection) does not recognize, which turns geo-filtered
 * requests into 400s. This resolves raw names to canonical registry codes
 * and DROPS anything unmatched, so the platform location is always either a
 * valid registry value or empty (degrading gracefully to country-level
 * filtering). When the governorate is unknown but the city name is, the city
 * is searched across the country's governorates and the governorate is
 * derived from the match.
 */
async function normalizeDetectedNames(
  countryCode: string,
  raw: { governorate?: string; city?: string; district?: string },
): Promise<NormalizedGeoNames> {
  const empty: NormalizedGeoNames = { governorate: "", city: "", district: "" };
  const rawGovernorate = String(raw.governorate ?? "").trim();
  const rawCity = String(raw.city ?? "").trim();
  const rawDistrict = String(raw.district ?? "").trim();
  if (!countryCode || (!rawGovernorate && !rawCity)) return empty;

  const countries = await fetchCountries();
  const country = countries.find((item) => item.code === countryCode);
  if (!country?.id) return empty;

  const governorates = await fetchGeoRows("governorates", country.id);
  if (governorates.length === 0) return empty;

  let governorateRow = rawGovernorate
    ? governorates.find((row) => matchesGeoAlias(row, rawGovernorate)) ?? null
    : null;
  let cityRow: GeoRegistryRow | null = null;

  if (governorateRow && rawCity) {
    const cities = await fetchGeoRows("cities", governorateRow.id);
    cityRow = cities.find((row) => matchesGeoAlias(row, rawCity)) ?? null;
  }

  // Governorate name unrecognized (or its city list missed) — locate the
  // city across the country's governorates and derive the governorate.
  if (!cityRow && rawCity) {
    for (const candidate of governorates) {
      if (governorateRow && candidate.id === governorateRow.id) continue;
      const cities = await fetchGeoRows("cities", candidate.id);
      const match = cities.find((row) => matchesGeoAlias(row, rawCity));
      if (match) {
        governorateRow = candidate;
        cityRow = match;
        break;
      }
    }
  }

  let districtValue = "";
  if (cityRow && rawDistrict) {
    const districts = await fetchGeoRows("districts", cityRow.id);
    const match = districts.find((row) => matchesGeoAlias(row, rawDistrict));
    if (match) districtValue = rowValue(match);
  }

  return {
    governorate: governorateRow ? rowValue(governorateRow) : "",
    city: cityRow ? rowValue(cityRow) : "",
    district: districtValue,
  };
}

function replaceLocationQuery(location: PlatformLocation): void {
  try {
    const url = new URL(window.location.href);
    for (const key of ["country", "governorate", "city", "district", "lat", "lng", "global"]) {
      url.searchParams.delete(key);
    }
    if (location.isGlobal) {
      url.searchParams.set("global", "1");
    } else {
      url.searchParams.set("country", location.countryCode);
      if (location.governorate) url.searchParams.set("governorate", location.governorate);
      if (location.city) url.searchParams.set("city", location.city);
      if (location.district) url.searchParams.set("district", location.district);
      if (location.latitude != null) url.searchParams.set("lat", String(location.latitude));
      if (location.longitude != null) url.searchParams.set("lng", String(location.longitude));
    }
    window.history.replaceState({}, "", url.toString());
  } catch {
    // URL propagation is best effort; context + persistence remain authoritative.
  }
}

const FALLBACK_LOCATION = resolvePlatformLocation({});

const DEFAULT_GEO: GeoState = {
  ...FALLBACK_LOCATION,
  countryConfig: null,
  countries: [],
  resolving: true,
  setCountry: () => {},
  setGovernorate: () => {},
  setCity: () => {},
  setDistrict: () => {},
  setCoordinates: () => {},
  setDetectedLocation: () => false,
  applyDeviceLocation: () => {},
  setGlobal: () => {},
  resetLocation: () => {},
};

const GeoContext = createContext<GeoState>(DEFAULT_GEO);

export function useGeo(): GeoState {
  return useContext(GeoContext);
}

export function GeoProvider({ children }: { children: ReactNode }) {
  // localStorage/the URL aren't available during SSR, so resolveSync() would
  // return a different value on the server than on the client's first render
  // — a React hydration mismatch. The first render (both server and client)
  // must use the same SSR-safe fallback; the real, storage-aware location is
  // resolved right after mount instead (see the effect below).
  const [location, setLocation] = useState<PlatformLocation>(() => resolvePlatformLocation({}));
  const [countries, setCountries] = useState<CountryConfig[]>([]);
  const [resolving, setResolving] = useState(true);
  const locationRef = useRef(location);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    const resolved = resolveSync();
    locationRef.current = resolved;
    setLocation(resolved);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setResolving(true);
      const list = await fetchCountries();
      if (cancelled) return;
      setCountries(list);

      const current = locationRef.current;
      const validCountry = !current.countryCode || list.length === 0 || list.some((country) => country.code === current.countryCode);
      if (current.source === "manual") {
        const next = validCountry ? current : resolvePlatformLocation({});
        setLocation(next);
        persistLocation(next);
        setResolving(false);
        return;
      }

      // Country already known (timezone/language/previous visit). Fill any
      // missing city/governorate silently from IP, and re-normalize whatever
      // is stored against the registry so raw detector names ("Mecca
      // Region") never survive into API filters.
      if (current.countryCode && validCountry) {
        let rawGovernorate = current.governorate;
        let rawCity = current.city;
        const rawDistrict = current.district;
        if (!rawCity && !rawGovernorate) {
          const ip = await detectByIp();
          if (!cancelled && (!ip.countryCode || ip.countryCode === current.countryCode)) {
            rawGovernorate = ip.governorate;
            rawCity = ip.city;
          }
        }
        if (cancelled) return;
        const names = await normalizeDetectedNames(current.countryCode, {
          governorate: rawGovernorate,
          city: rawCity,
          district: rawDistrict,
        });
        if (cancelled) return;
        const next = resolvePlatformLocation({ auto: {
          countryCode: current.countryCode,
          ...names,
          latitude: current.latitude,
          longitude: current.longitude,
        } });
        setLocation(next);
        persistLocation(next);
        setResolving(false);
        return;
      }

      const ip = await detectByIp();
      if (cancelled) return;
      let next: PlatformLocation;
      if (ip.countryCode && (list.length === 0 || list.some((country) => country.code === ip.countryCode))) {
        const names = await normalizeDetectedNames(ip.countryCode, { governorate: ip.governorate, city: ip.city });
        if (cancelled) return;
        next = resolvePlatformLocation({ auto: { countryCode: ip.countryCode, ...names } });
      } else {
        next = resolvePlatformLocation({});
      }
      setLocation(next);
      persistLocation(next);
      setResolving(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const applyManual = useCallback((next: PlatformLocation) => {
    setLocation(next);
    persistLocation(next);
    replaceLocationQuery(next);
  }, []);

  const setCountry = useCallback((code: string) => {
    const countryCode = normalizeGeoToken(code);
    if (!countryCode) {
      applyManual(resolvePlatformLocation({ manual: { isGlobal: true } }));
      return;
    }
    applyManual(resolvePlatformLocation({ manual: { countryCode } }));
  }, [applyManual]);

  const setGovernorateValue = useCallback((governorate: string) => {
    const current = locationRef.current;
    if (!current.countryCode) return;
    applyManual(resolvePlatformLocation({ manual: { countryCode: current.countryCode, governorate } }));
  }, [applyManual]);

  const setCityValue = useCallback((
    city: string,
    coordinates?: { latitude: number | null; longitude: number | null },
  ) => {
    const current = locationRef.current;
    if (!current.countryCode) return;
    applyManual(resolvePlatformLocation({ manual: {
      countryCode: current.countryCode,
      governorate: current.governorate,
      city,
      latitude: coordinates?.latitude ?? null,
      longitude: coordinates?.longitude ?? null,
    } }));
  }, [applyManual]);

  const setDistrictValue = useCallback((district: string) => {
    const current = locationRef.current;
    if (!current.countryCode) return;
    applyManual(resolvePlatformLocation({ manual: {
      countryCode: current.countryCode,
      governorate: current.governorate,
      city: current.city,
      district,
      latitude: current.latitude,
      longitude: current.longitude,
    } }));
  }, [applyManual]);

  const setCoordinates = useCallback((latitude: number | null, longitude: number | null) => {
    const current = locationRef.current;
    const next: PlatformLocation = {
      ...current,
      latitude: normalizeCoordinate(latitude, "latitude"),
      longitude: normalizeCoordinate(longitude, "longitude"),
    };
    setLocation(next);
    persistLocation(next);
    if (next.source === "manual") replaceLocationQuery(next);
  }, []);

  const setDetectedLocation = useCallback((signal: PlatformLocationSignal): boolean => {
    if (locationRef.current.source === "manual") return false;
    const next = resolvePlatformLocation({ auto: signal });
    setLocation(next);
    persistLocation(next);
    return true;
  }, []);

  const applyDeviceLocation = useCallback((signal: PlatformLocationSignal) => {
    void (async () => {
      const countryCode = normalizeGeoToken(signal.countryCode);
      // Reverse-geocoded names go through registry normalization so the
      // stored location stays API-filterable.
      const names = await normalizeDetectedNames(countryCode, {
        governorate: String(signal.governorate ?? ""),
        city: String(signal.city ?? ""),
        district: String(signal.district ?? ""),
      });
      const next = resolvePlatformLocation({ auto: {
        countryCode,
        ...names,
        latitude: signal.latitude,
        longitude: signal.longitude,
      } });
      setLocation(next);
      persistLocation(next);
    })();
  }, []);

  // District/neighborhood precision has no IP-based equivalent — only device
  // GPS can resolve it. Mobile-only (see isMobileDevice): this runs
  // automatically on mount (no button, no click) as a silent background
  // upgrade layered on top of the already-resolved IP-level governorate/
  // city; the one thing it can't remove is the browser's own permission
  // prompt, which no site can bypass. If it's denied or unavailable, the
  // IP-level location already in place just stays — which is also all
  // desktop ever uses, by design.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    if (!isMobileDevice()) return;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) return;
        const { latitude, longitude } = position.coords;
        fetch(`/api/location?lat=${latitude}&lng=${longitude}`, { cache: "no-store" })
          .then((response) => (response.ok ? response.json() : null))
          .then(async (data: { countryCode?: string; governorate?: string; city?: string; district?: string } | null) => {
            if (cancelled || !data) return;
            const current = locationRef.current;
            if (current.source === "manual") return;
            const countryCode = data.countryCode || current.countryCode;
            if (!countryCode) return;
            const names = await normalizeDetectedNames(countryCode, {
              governorate: data.governorate,
              city: data.city,
              district: data.district,
            });
            if (cancelled) return;
            setDetectedLocation({
              countryCode,
              governorate: names.governorate || current.governorate,
              city: names.city || current.city,
              district: names.district || current.district,
              latitude,
              longitude,
            });
          })
          .catch(() => undefined);
      },
      () => undefined,
      { enableHighAccuracy: false, timeout: 8_000, maximumAge: 300_000 },
    );
    return () => {
      cancelled = true;
    };
  }, [setDetectedLocation]);

  const setGlobal = useCallback(() => {
    applyManual(resolvePlatformLocation({ manual: { isGlobal: true } }));
  }, [applyManual]);

  const resetLocation = useCallback(() => {
    for (const key of [STORAGE_KEY, STORAGE_KEY_GOV, STORAGE_KEY_CITY, STORAGE_KEY_DISTRICT, STORAGE_KEY_LAT, STORAGE_KEY_LNG, STORAGE_KEY_GLOBAL, STORAGE_KEY_SOURCE]) {
      writeStorage(key, "");
    }
    const detectedCountry = detectByTimezone() || detectByLanguage();
    const next = resolvePlatformLocation({ auto: detectedCountry ? { countryCode: detectedCountry } : null });
    setLocation(next);
    persistLocation(next);
    try {
      const url = new URL(window.location.href);
      for (const key of ["country", "governorate", "city", "district", "lat", "lng", "global"]) url.searchParams.delete(key);
      window.history.replaceState({}, "", url.toString());
    } catch {
      // Ignore URL failures.
    }
    void detectByIp().then(async (ip) => {
      if (locationRef.current.source === "manual") return;
      if (!detectedCountry && !ip.countryCode) return;
      const countryCode = detectedCountry || ip.countryCode;
      const sameCountry = !detectedCountry || ip.countryCode === detectedCountry;
      const names = sameCountry
        ? await normalizeDetectedNames(countryCode, { governorate: ip.governorate, city: ip.city })
        : { governorate: "", city: "", district: "" };
      // setDetectedLocation re-checks the manual guard, covering the window
      // where the user picked a location while normalization was running.
      setDetectedLocation({ countryCode, ...names });
    });
  }, [setDetectedLocation]);

  const countryConfig = useMemo(
    () => countries.find((country) => country.code === location.countryCode) ?? null,
    [countries, location.countryCode],
  );

  const value = useMemo<GeoState>(() => ({
    ...location,
    countryConfig,
    countries,
    resolving,
    setCountry,
    setGovernorate: setGovernorateValue,
    setCity: setCityValue,
    setDistrict: setDistrictValue,
    setCoordinates,
    setDetectedLocation,
    applyDeviceLocation,
    setGlobal,
    resetLocation,
  }), [
    location,
    countryConfig,
    countries,
    resolving,
    setCountry,
    setGovernorateValue,
    setCityValue,
    setDistrictValue,
    setCoordinates,
    setDetectedLocation,
    applyDeviceLocation,
    setGlobal,
    resetLocation,
  ]);

  return <GeoContext.Provider value={value}>{children}</GeoContext.Provider>;
}
