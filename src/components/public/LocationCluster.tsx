"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  latitude?: string | number | null;
  longitude?: string | number | null;
};

const EMPTY_GEO_OPTIONS: GeoOption[] = [];
const ADDRESS_STORAGE_KEY = "akarpromax-address";

const TEXT = {
  region: { ar: "كل المناطق", en: "All regions", tr: "Tüm bölgeler" },
  city: { ar: "كل المدن", en: "All cities", tr: "Tüm şehirler" },
  district: { ar: "كل الأحياء", en: "All districts", tr: "Tüm mahalleler" },
  regionAria: { ar: "المنطقة أو المحافظة", en: "Region or governorate", tr: "Bölge" },
  cityAria: { ar: "المدينة", en: "City", tr: "Şehir" },
  districtAria: { ar: "الحي", en: "District", tr: "Mahalle" },
  locate: { ar: "تحديد موقعي تلقائيًا", en: "Detect my location", tr: "Konumumu bul" },
  locating: { ar: "جارٍ التحديد...", en: "Locating...", tr: "Bulunuyor..." },
  located: { ar: "تم تحديث الموقع تلقائيًا", en: "Location updated automatically", tr: "Konum otomatik güncellendi" },
  manualWins: { ar: "اختيارك اليدوي محفوظ وله الأولوية", en: "Your manual choice is kept and takes priority", tr: "Manuel seçiminiz önceliklidir" },
  locateFailed: { ar: "تعذّر تحديد الموقع؛ اختره يدويًا", en: "Could not detect location; choose manually", tr: "Konum bulunamadı; elle seçin" },
  address: { ar: "العنوان", en: "Address", tr: "Adres" },
  addressPlaceholder: { ar: "أدخل عنوانك يدويًا (شارع، مبنى...)", en: "Enter your address (street, building...)", tr: "Adresinizi girin (sokak, bina...)" },
  addressSave: { ar: "حفظ", en: "Save", tr: "Kaydet" },
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
 * Header location cluster: cascading region → city → district selects fed by
 * /api/geo for the selected country, device-geolocation auto-detect (manual
 * selection keeps priority via GeoContext), plus a manual free-text address
 * stored locally. Compact chips matching the header tool cluster.
 */
export default function LocationCluster({ locale }: { locale: Locale }) {
  const geo = useGeo();
  const [governorateResult, setGovernorateResult] = useState<{ parentId: string; rows: GeoOption[] }>({ parentId: "", rows: [] });
  const [cityResult, setCityResult] = useState<{ parentId: string; rows: GeoOption[] }>({ parentId: "", rows: [] });
  const [districtResult, setDistrictResult] = useState<{ parentId: string; rows: GeoOption[] }>({ parentId: "", rows: [] });
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState("");
  const [addressOpen, setAddressOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [addressDraft, setAddressDraft] = useState("");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(ADDRESS_STORAGE_KEY) ?? "";
      queueMicrotask(() => {
        setAddress(stored);
        setAddressDraft(stored);
      });
    } catch {
      // Storage unavailable — manual address just stays session-local.
    }
  }, []);

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
      const applied = geo.setDetectedLocation({
        countryCode: data.countryCode || "",
        governorate: data.governorate || "",
        city: data.city || "",
        district: data.district || "",
        latitude,
        longitude,
      });
      setMessage(applied ? t("located", locale) : t("manualWins", locale));
    } catch {
      setMessage(t("locateFailed", locale));
    } finally {
      setLocating(false);
    }
  }, [geo, locale]);

  const saveAddress = useCallback(() => {
    const trimmed = addressDraft.trim();
    setAddress(trimmed);
    try {
      window.localStorage.setItem(ADDRESS_STORAGE_KEY, trimmed);
    } catch {
      // Session-local only.
    }
    setAddressOpen(false);
  }, [addressDraft]);

  if (geo.isGlobal) return null;

  const selectClass =
    "max-w-[120px] truncate rounded-lg border-0 bg-transparent px-2 py-1.5 text-sm font-semibold text-[var(--color-text-primary)] outline-none transition-colors hover:bg-[var(--color-surface-muted)] disabled:opacity-45";

  return (
    <>
      <select
        aria-label={t("regionAria", locale)}
        value={governorate ? optionValue(governorate) : geo.governorate}
        onChange={(event) => geo.setGovernorate(event.target.value)}
        className={selectClass}
        disabled={!country || governorates.length === 0}
      >
        <option value="">{t("region", locale)}</option>
        {!governorate && geo.governorate && <option value={geo.governorate}>{geo.governorate}</option>}
        {governorates.map((option) => <option key={option.id} value={optionValue(option)}>{optionName(option, locale)}</option>)}
      </select>
      <select
        aria-label={t("cityAria", locale)}
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
      <select
        aria-label={t("districtAria", locale)}
        value={district ? optionValue(district) : geo.district}
        onChange={(event) => geo.setDistrict(event.target.value)}
        className={`${selectClass} hidden lg:block`}
        disabled={!city || districts.length === 0}
      >
        <option value="">{t("district", locale)}</option>
        {!district && geo.district && <option value={geo.district}>{geo.district}</option>}
        {districts.map((option) => <option key={option.id} value={optionValue(option)}>{optionName(option, locale)}</option>)}
      </select>

      {/* Manual address entry */}
      <div className="relative hidden lg:block">
        <button
          type="button"
          onClick={() => setAddressOpen((o) => !o)}
          aria-expanded={addressOpen}
          aria-haspopup="dialog"
          title={address || t("address", locale)}
          className="flex max-w-[130px] items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-muted)]"
        >
          <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
          <span className="truncate">{address || t("address", locale)}</span>
        </button>
        {addressOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setAddressOpen(false)} />
            <div role="dialog" aria-label={t("address", locale)} className="absolute start-0 top-full z-50 mt-1 w-72 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-xl">
              <label className="mb-1 block text-xs font-bold text-[var(--color-text-secondary)]">{t("address", locale)}</label>
              <input
                value={addressDraft}
                onChange={(event) => setAddressDraft(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") saveAddress(); }}
                placeholder={t("addressPlaceholder", locale)}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
              />
              <button type="button" onClick={saveAddress} className="mt-2 w-full rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-[var(--color-primary-hover)]">
                {t("addressSave", locale)}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Device geolocation */}
      <button
        type="button"
        onClick={() => void locate()}
        disabled={locating}
        aria-label={t("locate", locale)}
        title={message || t("locate", locale)}
        className="flex items-center gap-1 px-2.5 py-1.5 text-sm font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-surface-muted)] disabled:opacity-50"
      >
        <span aria-hidden="true">⌖</span>
        {locating && <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />}
      </button>
    </>
  );
}
