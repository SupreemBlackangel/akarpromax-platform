"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { geoAliases, matchesGeoAlias, normalizeGeoToken } from "@/lib/geo/platform-location";
import { useGeo } from "@/src/contexts/GeoContext";
import { fetchGeoLevel } from "@/src/lib/geo-registry-cache";

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

function optionValue(option: GeoOption): string {
  return option.code?.trim() || option.id;
}

function selectedOption(options: GeoOption[], value: string): GeoOption | null {
  return options.find((option) => matchesGeoAlias(option, value)) ?? null;
}

async function fetchGeo(type: "governorates" | "cities" | "districts", parentId: string): Promise<GeoOption[]> {
  // One request per list, shared with GeoContext -- see geo-registry-cache.
  return fetchGeoLevel(type, parentId) as Promise<GeoOption[]>;
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

export default function LocationBar() {
  const geo = useGeo();
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
      const applied = geo.setDetectedLocation({
        countryCode: data.countryCode || "",
        governorate: data.governorate || "",
        city: data.city || "",
        district: data.district || "",
        latitude,
        longitude,
      });
      setMessage(applied ? "تم تحديث الموقع تلقائيًا" : "اختيارك اليدوي محفوظ وله الأولوية");
    } catch {
      setMessage("تعذّر تحديد الموقع؛ اختره يدويًا");
    } finally {
      setLocating(false);
    }
  }, [geo]);

  const selectClass = "min-w-28 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs font-semibold text-[var(--color-text-primary)] disabled:opacity-50";

  return (
    <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-2 px-5 py-2 text-xs">
        <span className="font-bold text-primary">موقع التصفح:</span>
        <span className="font-semibold text-[var(--color-text-primary)]">
          {geo.isGlobal ? "جميع المواقع" : country?.nameAr || geo.countryCode.toUpperCase()}
        </span>

        {!geo.isGlobal && (
          <>
            <select
              aria-label="المنطقة أو المحافظة"
              value={governorate ? optionValue(governorate) : geo.governorate}
              onChange={(event) => geo.setGovernorate(event.target.value)}
              className={selectClass}
              disabled={!country || governorates.length === 0}
            >
              <option value="">كل المناطق</option>
              {!governorate && geo.governorate && <option value={geo.governorate}>{geo.governorate}</option>}
              {governorates.map((option) => <option key={option.id} value={optionValue(option)}>{option.nameAr}</option>)}
            </select>
            <select
              aria-label="المدينة"
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
              <option value="">كل المدن</option>
              {!city && geo.city && <option value={geo.city}>{geo.city}</option>}
              {cities.map((option) => <option key={option.id} value={optionValue(option)}>{option.nameAr}</option>)}
            </select>
            <select
              aria-label="الحي"
              value={district ? optionValue(district) : geo.district}
              onChange={(event) => geo.setDistrict(event.target.value)}
              className={selectClass}
              disabled={!city || districts.length === 0}
            >
              <option value="">كل الأحياء</option>
              {!district && geo.district && <option value={geo.district}>{geo.district}</option>}
              {districts.map((option) => <option key={option.id} value={optionValue(option)}>{option.nameAr}</option>)}
            </select>
          </>
        )}

        <button
          type="button"
          onClick={() => void locate()}
          disabled={locating}
          className="ms-auto inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1 font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
        >
          <span aria-hidden="true">⌖</span>
          {locating ? "جارٍ التحديد..." : "تحديد تلقائي"}
        </button>
        <button type="button" onClick={geo.resetLocation} className="rounded-lg px-2 py-1 font-semibold text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]">
          إعادة الكشف
        </button>
        {message && <span className="text-[var(--color-text-muted)]" role="status">{message}</span>}
      </div>
    </div>
  );
}
