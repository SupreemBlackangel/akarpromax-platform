"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { getCachedLocation, setCachedLocation, detectCountryByTimezone, detectCountryByLanguage } from "@/src/location-utils";
import type { LocationFields, LocationInfo } from "@/src/location-utils";

type Props = {
  locale?: "ar" | "en" | "tr";
  defaultValues?: Partial<LocationFields>;
  onChange?: (fields: LocationFields) => void;
  readOnly?: boolean;
  disabled?: boolean;
  countrySelect?: boolean;
  autoDetect?: boolean;
  compact?: boolean;
  names?: {
    country?: string; governorate?: string; city?: string;
    village?: string; district?: string; street?: string;
    detect?: string; detecting?: string; error?: string;
    countryPlaceholder?: string; placeholders?: string[];
  };
};

const FALLBACK_NAMES = {
  ar: { country: "الدولة", governorate: "المحافظة", city: "المدينة", village: "القرية", district: "الحي", street: "الشارع",
    detect: "كشف تلقائي", detecting: "جارٍ الكشف...", error: "تعذر كشف الموقع", countryPlaceholder: "اختر الدولة",
    placeholders: ["عُمان", "مسقط", "مسقط", "", "الخوير", ""] },
  en: { country: "Country", governorate: "Governorate", city: "City", village: "Village", district: "District", street: "Street",
    detect: "Detect automatically", detecting: "Detecting...", error: "Could not detect location", countryPlaceholder: "Select country",
    placeholders: ["Oman", "Muscat", "Muscat", "", "Al Khuwair", ""] },
  tr: { country: "Ülke", governorate: "Valilik", city: "Şehir", village: "Köy", district: "Semt", street: "Cadde",
    detect: "Otomatik tespit", detecting: "Tespit ediliyor...", error: "Konum tespit edilemedi", countryPlaceholder: "Ülke seçin",
    placeholders: ["Umman", "Maskat", "Maskat", "", "El Huveyr", ""] },
};

const COUNTRY_LIST: Array<[string, string, string]> = [
  ["om", "عُمان", "Oman"], ["sa", "السعودية", "Saudi Arabia"], ["ae", "الإمارات", "UAE"],
  ["qa", "قطر", "Qatar"], ["kw", "الكويت", "Kuwait"], ["bh", "البحرين", "Bahrain"],
  ["eg", "مصر", "Egypt"], ["jo", "الأردن", "Jordan"], ["iq", "العراق", "Iraq"],
  ["lb", "لبنان", "Lebanon"], ["ps", "فلسطين", "Palestine"], ["sy", "سوريا", "Syria"],
  ["ye", "اليمن", "Yemen"], ["ma", "المغرب", "Morocco"], ["dz", "الجزائر", "Algeria"],
  ["tn", "تونس", "Tunisia"], ["ly", "ليبيا", "Libya"], ["sd", "السودان", "Sudan"],
  ["so", "الصومال", "Somalia"], ["dj", "جيبوتي", "Djibouti"], ["mr", "موريتانيا", "Mauritania"],
  ["km", "جزر القمر", "Comoros"], ["tr", "تركيا", "Türkiye"],
];

function countryLabel(code: string, locale: "ar" | "en" | "tr"): string {
  const idx = locale === "en" ? 2 : locale === "tr" ? 2 : 1;
  const found = COUNTRY_LIST.find((c) => c[0] === code);
  return found ? found[idx] : code.toUpperCase();
}

export default function LocationPicker({
  locale = "ar",
  defaultValues,
  onChange,
  readOnly = false,
  disabled = false,
  countrySelect = true,
  autoDetect = true,
  compact = false,
  names: customNames,
}: Props) {
  const names = { ...FALLBACK_NAMES[locale], ...customNames };
  const [fields, setFields] = useState<LocationFields>({
    countryCode: defaultValues?.countryCode || (locale === "ar" ? "om" : "om"),
    governorate: defaultValues?.governorate || "",
    city: defaultValues?.city || "",
    village: defaultValues?.village || "",
    district: defaultValues?.district || "",
    street: defaultValues?.street || "",
  });
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState("");
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const updateField = useCallback((key: keyof LocationFields, value: string) => {
    const next = { ...fields, [key]: value };
    setFields(next);
    onChange?.(next);
  }, [fields, onChange]);

  const handleDetect = useCallback(async () => {
    setDetecting(true);
    setDetectError("");

    try {
      const cached = getCachedLocation();
      if (cached) {
        updateField("countryCode", cached.country.toLowerCase() || "om");
        updateField("governorate", cached.governorate || "");
        updateField("city", cached.city || "");
        updateField("village", cached.village || "");
        updateField("district", cached.district || "");
        updateField("street", cached.street || "");
        setDetecting(false);
        return;
      }

      const geo = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error("Geolocation not supported"));
          return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 300000,
        });
      });

      const { latitude, longitude } = geo.coords;
      const res = await fetch(`/api/location?lat=${latitude}&lng=${longitude}`);
      if (!res.ok) throw new Error("Geocoding failed");

      const data: LocationInfo & { error?: string } = await res.json();
      if (!mountedRef.current) return;

      const info: LocationFields = {
        countryCode: (data.country || "").toLowerCase().includes("oman") ? "om" :
          data.country ? data.country.toLowerCase().slice(0, 2) : "",
        governorate: data.governorate || "",
        city: data.city || "",
        village: data.village || "",
        district: data.district || "",
        street: data.street || "",
      };

      if (!info.countryCode) {
        const tzCountry = detectCountryByTimezone();
        const langCountry = detectCountryByLanguage();
        info.countryCode = tzCountry || langCountry || "om";
      }

      const locationInfo: LocationInfo = {
        ...data,
        country: info.countryCode,
      };
      setCachedLocation(locationInfo);

      const next = { ...fields, ...info };
      setFields(next);
      onChange?.(next);
    } catch {
      if (!mountedRef.current) return;
      setDetectError(names.error);
      const tzCountry = detectCountryByTimezone();
      const langCountry = detectCountryByLanguage();
      if (tzCountry || langCountry) {
        const code = tzCountry || langCountry;
        updateField("countryCode", code);
      }
    } finally {
      if (mountedRef.current) setDetecting(false);
    }
  }, [fields, updateField, onChange, names]);

  useEffect(() => {
    if (autoDetect && !defaultValues?.countryCode && !defaultValues?.governorate && !defaultValues?.city) {
      window.queueMicrotask(() => handleDetect());
    }
  }, []);

  const inputClass = (compact ? "px-2 py-1 text-xs " : "px-3 py-2 text-sm ") +
    "w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-[var(--color-surface)] dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed";
  const labelClass = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5";

  if (readOnly) {
    return (
      <div className={compact ? "flex flex-wrap gap-x-4 gap-y-1 text-sm" : "grid grid-cols-2 md:grid-cols-3 gap-3"}>
        {fields.countryCode && <div><span className={labelClass}><span aria-hidden="true">⚑</span> {names.country}</span><span className="text-gray-900 dark:text-white">{countryLabel(fields.countryCode, locale)}</span></div>}
        {fields.governorate && <div><span className={labelClass}><span aria-hidden="true">◈</span> {names.governorate}</span><span className="text-gray-900 dark:text-white">{fields.governorate}</span></div>}
        {fields.city && <div><span className={labelClass}><span aria-hidden="true">⌖</span> {names.city}</span><span className="text-gray-900 dark:text-white">{fields.city}</span></div>}
        {fields.village && <div><span className={labelClass}><span aria-hidden="true">⊞</span> {names.village}</span><span className="text-gray-900 dark:text-white">{fields.village}</span></div>}
        {fields.district && <div><span className={labelClass}><span aria-hidden="true">▣</span> {names.district}</span><span className="text-gray-900 dark:text-white">{fields.district}</span></div>}
        {fields.street && <div><span className={labelClass}><span aria-hidden="true">⛩</span> {names.street}</span><span className="text-gray-900 dark:text-white">{fields.street}</span></div>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {autoDetect && (
        <div className="flex items-center gap-2">
          <button type="button" onClick={handleDetect} disabled={disabled || detecting}
            className="px-3 py-1.5 text-xs bg-[var(--color-primary-soft)] dark:bg-blue-900/30 text-[var(--color-primary)] dark:text-blue-400 rounded-lg hover:bg-[var(--color-primary-soft)] dark:hover:bg-blue-900/50 disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            {detecting ? <span className="inline-block w-3 h-3 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" /> : <span>⌖</span>}
            {detecting ? names.detecting : names.detect}
          </button>
          {detectError && <span className="text-xs text-red-500">{detectError}</span>}
        </div>
      )}
      <div className={compact ? "flex flex-wrap gap-2" : "grid grid-cols-1 md:grid-cols-3 gap-3"}>
        <div>
          <label className={labelClass}><span aria-hidden="true">⚑</span> {names.country}</label>
          {countrySelect ? (
            <select name="countryCode" value={fields.countryCode}
              onChange={(e) => updateField("countryCode", e.target.value)}
              disabled={disabled || detecting} className={inputClass}>
              <option value="">{names.countryPlaceholder}</option>
              {COUNTRY_LIST.map(([code]) => (
                <option key={code} value={code}>{countryLabel(code, locale)}</option>
              ))}
            </select>
          ) : (
            <input name="countryCode" value={fields.countryCode}
              onChange={(e) => updateField("countryCode", e.target.value)}
              disabled={disabled || detecting} className={inputClass} placeholder={names.placeholders?.[0]} />
          )}
        </div>
        <div>
          <label className={labelClass}><span aria-hidden="true">◈</span> {names.governorate}</label>
          <input name="governorate" value={fields.governorate}
            onChange={(e) => updateField("governorate", e.target.value)}
            disabled={disabled || detecting} className={inputClass} placeholder={names.placeholders?.[1]} />
        </div>
        <div>
          <label className={labelClass}><span aria-hidden="true">⌖</span> {names.city}</label>
          <input name="city" value={fields.city}
            onChange={(e) => updateField("city", e.target.value)}
            disabled={disabled || detecting} className={inputClass} placeholder={names.placeholders?.[2]} />
        </div>
        <div>
          <label className={labelClass}><span aria-hidden="true">⊞</span> {names.village}</label>
          <input name="village" value={fields.village}
            onChange={(e) => updateField("village", e.target.value)}
            disabled={disabled || detecting} className={inputClass} placeholder={names.placeholders?.[3]} />
        </div>
        <div>
          <label className={labelClass}><span aria-hidden="true">▣</span> {names.district}</label>
          <input name="district" value={fields.district}
            onChange={(e) => updateField("district", e.target.value)}
            disabled={disabled || detecting} className={inputClass} placeholder={names.placeholders?.[4]} />
        </div>
        <div>
          <label className={labelClass}><span aria-hidden="true">⛩</span> {names.street}</label>
          <input name="street" value={fields.street}
            onChange={(e) => updateField("street", e.target.value)}
            disabled={disabled || detecting} className={inputClass} placeholder={names.placeholders?.[5]} />
        </div>
      </div>
    </div>
  );
}
