"use client";

import { useEffect, useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import { geoAliases, matchesGeoAlias, normalizeGeoToken } from "@/lib/geo/platform-location";
import { useGeo } from "@/src/contexts/GeoContext";
import type { Locale } from "@/src/types/site";

type GeoOption = {
  id: string;
  code?: string | null;
  nameAr: string;
  nameEn: string;
  nameTr?: string | null;
};

const EMPTY_GEO_OPTIONS: GeoOption[] = [];

const TEXT = {
  resolving: { ar: "جارٍ تحديد موقعك...", en: "Detecting your location...", tr: "Konum belirleniyor..." },
} as const;

function t(key: keyof typeof TEXT, locale: Locale): string {
  return TEXT[key][locale] ?? TEXT[key].ar;
}

function optionName(option: GeoOption, locale: Locale): string {
  if (locale === "en") return option.nameEn || option.nameAr;
  if (locale === "tr") return option.nameTr || option.nameEn || option.nameAr;
  return option.nameAr;
}

function optionValue(option: GeoOption): string {
  return option.code?.trim() || option.id;
}

function selectedOption(options: GeoOption[], value: string): GeoOption | null {
  return options.find((option) => matchesGeoAlias(option, value)) ?? null;
}

async function fetchGeo(type: "governorates" | "cities" | "districts", parentId: string): Promise<GeoOption[]> {
  const query = new URLSearchParams({ type, parentId });
  const response = await fetch(`/api/geo?${query.toString()}`, { cache: "no-store" });
  if (!response.ok) return [];
  const body = await response.json();
  return Array.isArray(body.data) ? body.data : [];
}

/**
 * Header location badge: shows the visitor's platform-wide location,
 * resolved automatically (IP/timezone/language via GeoContext) with zero
 * intervention — no editable fields, no "detect my location" button here.
 * It still fetches the governorate/city/district registry rows so the raw
 * auto-detected names get normalized to the canonical codes other consumers
 * (search, ads, service matching) rely on, but that's background work, not
 * something the visitor interacts with. Editing the location for a specific
 * search or request happens in that search/request's own filters instead.
 */
export default function LocationCluster({ locale }: { locale: Locale }) {
  const geo = useGeo();
  const [governorateResult, setGovernorateResult] = useState<{ parentId: string; rows: GeoOption[] }>({ parentId: "", rows: [] });
  const [cityResult, setCityResult] = useState<{ parentId: string; rows: GeoOption[] }>({ parentId: "", rows: [] });
  const [districtResult, setDistrictResult] = useState<{ parentId: string; rows: GeoOption[] }>({ parentId: "", rows: [] });

  const country = useMemo(
    () => geo.countries.find((item) => normalizeGeoToken(item.code) === geo.countryCode) ?? null,
    [geo.countries, geo.countryCode],
  );
  const governorates = country?.id && governorateResult.parentId === country.id ? governorateResult.rows : EMPTY_GEO_OPTIONS;
  const governorate = useMemo(() => selectedOption(governorates, geo.governorate), [geo.governorate, governorates]);
  const cities = governorate?.id && cityResult.parentId === governorate.id ? cityResult.rows : EMPTY_GEO_OPTIONS;
  const city = useMemo(() => selectedOption(cities, geo.city), [cities, geo.city]);
  const districts = city?.id && districtResult.parentId === city.id ? districtResult.rows : EMPTY_GEO_OPTIONS;
  const district = useMemo(() => selectedOption(districts, geo.district), [districts, geo.district]);

  useEffect(() => {
    let active = true;
    if (!country?.id || geo.isGlobal) return () => { active = false; };
    void fetchGeo("governorates", country.id).then((rows) => {
      if (active) setGovernorateResult({ parentId: country.id, rows });
    });
    return () => { active = false; };
  }, [country?.id, geo.isGlobal]);

  useEffect(() => {
    let active = true;
    if (!governorate?.id) return () => { active = false; };
    void fetchGeo("cities", governorate.id).then((rows) => {
      if (active) setCityResult({ parentId: governorate.id, rows });
    });
    return () => { active = false; };
  }, [governorate?.id]);

  useEffect(() => {
    let active = true;
    if (!city?.id) return () => { active = false; };
    void fetchGeo("districts", city.id).then((rows) => {
      if (active) setDistrictResult({ parentId: city.id, rows });
    });
    return () => { active = false; };
  }, [city?.id]);

  // Auto detection often returns a localized name. Once registry data arrives,
  // normalize it to the same code used by Properties, Ads and Services.
  useEffect(() => {
    if (geo.source !== "auto" || !geo.governorate || !governorate) return;
    const normalized = optionValue(governorate);
    if (geoAliases(governorate).includes(normalizeGeoToken(geo.governorate)) && normalized !== geo.governorate) {
      geo.setDetectedLocation({
        countryCode: geo.countryCode,
        governorate: normalized,
        city: geo.city,
        district: geo.district,
        latitude: geo.latitude,
        longitude: geo.longitude,
      });
    }
  }, [geo, governorate]);

  useEffect(() => {
    if (geo.source !== "auto" || !geo.city || !city) return;
    const normalized = optionValue(city);
    if (geoAliases(city).includes(normalizeGeoToken(geo.city)) && normalized !== geo.city) {
      geo.setDetectedLocation({
        countryCode: geo.countryCode,
        governorate: geo.governorate,
        city: normalized,
        district: geo.district,
        latitude: geo.latitude,
        longitude: geo.longitude,
      });
    }
  }, [city, geo]);

  useEffect(() => {
    if (geo.source !== "auto" || !geo.district || !district) return;
    const normalized = optionValue(district);
    if (geoAliases(district).includes(normalizeGeoToken(geo.district)) && normalized !== geo.district) {
      geo.setDetectedLocation({
        countryCode: geo.countryCode,
        governorate: geo.governorate,
        city: geo.city,
        district: normalized,
        latitude: geo.latitude,
        longitude: geo.longitude,
      });
    }
  }, [district, geo]);

  if (geo.isGlobal) return null;

  // Full detail, most-general to most-specific — governorate, city, district
  // — each shown once resolved to its registry name (or the raw auto-detected
  // text as a fallback before that lookup completes).
  const parts = [
    governorate ? optionName(governorate, locale) : geo.governorate,
    city ? optionName(city, locale) : geo.city,
    district ? optionName(district, locale) : geo.district,
  ].filter((part): part is string => Boolean(part && part.trim()));
  const label = parts.join("، ");

  return (
    <span className="flex max-w-[280px] items-center gap-1.5 px-2 py-1.5 text-sm font-semibold text-[var(--color-text-primary)]">
      <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
      <span className="truncate">{geo.resolving && !label ? t("resolving", locale) : label}</span>
    </span>
  );
}
