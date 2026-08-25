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

async function detectByIp(): Promise<string> {
  try {
    const response = await fetch("https://ipinfo.io/json", { cache: "no-store" });
    if (!response.ok) return "";
    const data = await response.json();
    return normalizeGeoToken(data.country);
  } catch {
    return "";
  }
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
  setGlobal: () => {},
  resetLocation: () => {},
};

const GeoContext = createContext<GeoState>(DEFAULT_GEO);

export function useGeo(): GeoState {
  return useContext(GeoContext);
}

export function GeoProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<PlatformLocation>(resolveSync);
  const [countries, setCountries] = useState<CountryConfig[]>([]);
  const [resolving, setResolving] = useState(true);
  const locationRef = useRef(location);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

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

      if (current.countryCode && validCountry) {
        persistLocation(current);
        setResolving(false);
        return;
      }

      const ipCountry = await detectByIp();
      if (cancelled) return;
      const next = ipCountry && (list.length === 0 || list.some((country) => country.code === ipCountry))
        ? resolvePlatformLocation({ auto: { countryCode: ipCountry } })
        : resolvePlatformLocation({});
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
    if (!detectedCountry) {
      void detectByIp().then((countryCode) => {
        if (!countryCode || locationRef.current.source === "manual") return;
        const detected = resolvePlatformLocation({ auto: { countryCode } });
        setLocation(detected);
        persistLocation(detected);
      });
    }
  }, []);

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
    setGlobal,
    resetLocation,
  ]);

  return <GeoContext.Provider value={value}>{children}</GeoContext.Provider>;
}
