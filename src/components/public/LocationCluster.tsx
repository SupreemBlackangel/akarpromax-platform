"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, LocateFixed, MapPin, RotateCcw } from "lucide-react";
import { geoAliases, matchesGeoAlias, normalizeGeoToken } from "@/lib/geo/platform-location";
import { useGeo } from "@/src/contexts/GeoContext";
import type { Locale } from "@/src/types/site";

type GeoOption = {
  id: string;
  code?: string | null;
  nameAr: string;
  nameEn: string;
  nameTr?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
};

const EMPTY_GEO_OPTIONS: GeoOption[] = [];

const TEXT = {
  resolving: { ar: "جارٍ تحديد موقعك...", en: "Detecting your location...", tr: "Konum belirleniyor..." },
  popoverTitle: { ar: "الموقع", en: "Location", tr: "Konum" },
  auto: { ar: "تلقائي", en: "Auto", tr: "Otomatik" },
  manual: { ar: "يدوي", en: "Manual", tr: "Manuel" },
  region: { ar: "كل المناطق", en: "All regions", tr: "Tüm bölgeler" },
  city: { ar: "كل المدن", en: "All cities", tr: "Tüm şehirler" },
  district: { ar: "كل الأحياء", en: "All districts", tr: "Tüm mahalleler" },
  regionLabel: { ar: "المنطقة / المحافظة", en: "Region", tr: "Bölge" },
  cityLabel: { ar: "المدينة", en: "City", tr: "Şehir" },
  districtLabel: { ar: "الحي", en: "District", tr: "Mahalle" },
  locate: { ar: "تحديد موقعي (GPS)", en: "Use my location (GPS)", tr: "Konumumu bul (GPS)" },
  locating: { ar: "جارٍ التحديد...", en: "Locating...", tr: "Bulunuyor..." },
  located: { ar: "تم تحديد موقعك", en: "Location detected", tr: "Konum bulundu" },
  locateFailed: { ar: "تعذّر تحديد الموقع", en: "Could not detect location", tr: "Konum bulunamadı" },
  backToAuto: { ar: "العودة للتحديد التلقائي", en: "Back to automatic", tr: "Otomatiğe dön" },
  changeAria: { ar: "تغيير الموقع", en: "Change location", tr: "Konumu değiştir" },
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

function currentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 8_000,
      maximumAge: 300_000,
    });
  });
}

/**
 * Header location control. The visible chip shows the automatically resolved
 * platform location (governorate، city، district). Clicking it opens a
 * popover where the visitor can override any level manually (cascading
 * registry selects), trigger a one-shot GPS detection, or return to fully
 * automatic mode. The resulting platform location feeds every geo-filtered
 * surface (properties, services, offices, companies, home sections) through
 * GeoContext.
 */
export default function LocationCluster({ locale }: { locale: Locale }) {
  const geo = useGeo();
  const [open, setOpen] = useState(false);
  const [governorateResult, setGovernorateResult] = useState<{ parentId: string; rows: GeoOption[] }>({ parentId: "", rows: [] });
  const [cityResult, setCityResult] = useState<{ parentId: string; rows: GeoOption[] }>({ parentId: "", rows: [] });
  const [districtResult, setDistrictResult] = useState<{ parentId: string; rows: GeoOption[] }>({ parentId: "", rows: [] });
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState("");

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

  const locate = useCallback(async () => {
    setLocating(true);
    setMessage("");
    try {
      const position = await currentPosition();
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      const response = await fetch(`/api/location?lat=${latitude}&lng=${longitude}`, { cache: "no-store" });
      if (!response.ok) throw new Error("geocode_failed");
      const data = await response.json();
      // User-initiated: always applies and returns the platform to auto mode.
      geo.applyDeviceLocation({
        countryCode: data.countryCode || geo.countryCode,
        governorate: data.governorate || "",
        city: data.city || "",
        district: data.district || "",
        latitude,
        longitude,
      });
      setMessage(t("located", locale));
    } catch {
      setMessage(t("locateFailed", locale));
    } finally {
      setLocating(false);
    }
  }, [geo, locale]);

  const resetToAuto = useCallback(() => {
    setMessage("");
    geo.resetLocation();
  }, [geo]);

  if (geo.isGlobal) return null;

  // The chip shows only the region (governorate) — the most useful single
  // level beside the country. City/district are still refined inside the
  // popover; they just don't crowd the button label.
  const label = (governorate ? optionName(governorate, locale) : geo.governorate)?.trim() ?? "";

  const selectClass =
    "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2 text-sm font-semibold text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-primary)] disabled:opacity-45";
  const labelClass = "mb-1 block text-[11px] font-bold text-[var(--color-text-muted)]";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={t("changeAria", locale)}
        title={t("changeAria", locale)}
        className="flex max-w-[280px] items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-muted)]"
      >
        <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
        <span className="truncate">{geo.resolving && !label ? t("resolving", locale) : label || t("popoverTitle", locale)}</span>
        <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-label={t("popoverTitle", locale)}
            className="absolute start-0 top-full z-50 mt-1 w-72 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-black text-[var(--color-text-primary)]">{t("popoverTitle", locale)}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-primary)]">
                {geo.source === "manual" ? t("manual", locale) : t("auto", locale)}
                {geo.source !== "manual" && <Check className="h-3 w-3" aria-hidden="true" />}
              </span>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className={labelClass}>{t("regionLabel", locale)}</label>
                <select
                  value={governorate ? optionValue(governorate) : geo.governorate}
                  onChange={(event) => geo.setGovernorate(event.target.value)}
                  className={selectClass}
                  disabled={!country || governorates.length === 0}
                >
                  <option value="">{t("region", locale)}</option>
                  {!governorate && geo.governorate && <option value={geo.governorate}>{geo.governorate}</option>}
                  {governorates.map((option) => <option key={option.id} value={optionValue(option)}>{optionName(option, locale)}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>{t("cityLabel", locale)}</label>
                <select
                  value={city ? optionValue(city) : geo.city}
                  onChange={(event) => {
                    const next = selectedOption(cities, event.target.value);
                    geo.setCity(event.target.value, {
                      latitude: next?.latitude == null ? null : Number(next.latitude),
                      longitude: next?.longitude == null ? null : Number(next.longitude),
                    });
                  }}
                  className={selectClass}
                  disabled={!governorate || cities.length === 0}
                >
                  <option value="">{t("city", locale)}</option>
                  {!city && geo.city && <option value={geo.city}>{geo.city}</option>}
                  {cities.map((option) => <option key={option.id} value={optionValue(option)}>{optionName(option, locale)}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>{t("districtLabel", locale)}</label>
                <select
                  value={district ? optionValue(district) : geo.district}
                  onChange={(event) => geo.setDistrict(event.target.value)}
                  className={selectClass}
                  disabled={!city || districts.length === 0}
                >
                  <option value="">{t("district", locale)}</option>
                  {!district && geo.district && <option value={geo.district}>{geo.district}</option>}
                  {districts.map((option) => <option key={option.id} value={optionValue(option)}>{optionName(option, locale)}</option>)}
                </select>
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-1.5 border-t border-[var(--color-border)] pt-3">
              <button
                type="button"
                onClick={() => void locate()}
                disabled={locating}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
              >
                <LocateFixed className="h-4 w-4" aria-hidden="true" />
                {locating ? t("locating", locale) : t("locate", locale)}
              </button>
              {geo.source === "manual" && (
                <button
                  type="button"
                  onClick={resetToAuto}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-muted)]"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  {t("backToAuto", locale)}
                </button>
              )}
              {message && <p className="text-center text-[11px] font-semibold text-[var(--color-text-muted)]">{message}</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
