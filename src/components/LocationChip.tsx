"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getCachedLocation,
  setCachedLocation,
  detectCountryByTimezone,
  detectCountryByLanguage,
} from "@/src/location-utils";
import type { LocationFields, LocationInfo } from "@/src/location-utils";

type Locale = "ar" | "en" | "tr";

type Props = {
  locale?: Locale;
  countryCode?: string;
  countryName?: string;
  cityName?: string;
  onApply?: (fields: LocationFields) => void;
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

function countryLabel(code: string, locale: Locale): string {
  const idx = locale === "en" || locale === "tr" ? 2 : 1;
  const found = COUNTRY_LIST.find((c) => c[0] === code);
  return found ? found[idx] : code.toUpperCase();
}

const LABELS: Record<Locale, {
  aria: string; empty: string; country: string; governorate: string; city: string;
  village: string; district: string; street: string; countryPlaceholder: string;
  detect: string; detecting: string; save: string; cancel: string; error: string;
}> = {
  ar: {
    aria: "العنوان الجغرافي",
    empty: "الموقع",
    country: "الدولة",
    governorate: "المحافظة",
    city: "المدينة",
    village: "القرية",
    district: "الحي",
    street: "الشارع",
    countryPlaceholder: "اختر الدولة",
    detect: "كشف تلقائي",
    detecting: "جارٍ الكشف...",
    save: "حفظ العنوان",
    cancel: "إلغاء",
    error: "تعذر كشف الموقع، حدّده يدويًا",
  },
  en: {
    aria: "Geographic address",
    empty: "Location",
    country: "Country",
    governorate: "Governorate",
    city: "City",
    village: "Village",
    district: "District",
    street: "Street",
    countryPlaceholder: "Select country",
    detect: "Auto detect",
    detecting: "Detecting...",
    save: "Save address",
    cancel: "Cancel",
    error: "Could not detect location, set it manually",
  },
  tr: {
    aria: "Coğrafi adres",
    empty: "Konum",
    country: "Ülke",
    governorate: "Valilik",
    city: "Şehir",
    village: "Köy",
    district: "Semt",
    street: "Cadde",
    countryPlaceholder: "Ülke seçin",
    detect: "Otomatik tespit",
    detecting: "Tespit ediliyor...",
    save: "Adresi kaydet",
    cancel: "İptal",
    error: "Konum tespit edilemedi, elle ayarlayın",
  },
};

function toFields(info: LocationInfo): LocationFields {
  return {
    countryCode: info.countryCode || info.country.toLowerCase() || "om",
    governorate: info.governorate || "",
    city: info.city || "",
    village: info.village || "",
    district: info.district || "",
    street: info.street || "",
  };
}

function currentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
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
}

export default function LocationChip({
  locale = "ar",
  countryCode = "om",
  countryName = "",
  cityName = "",
  onApply,
}: Props) {
  const labels = LABELS[locale];
  const [open, setOpen] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState("");
  const [fields, setFields] = useState<LocationFields>(() => ({
    countryCode,
    governorate: "",
    city: cityName,
    village: "",
    district: "",
    street: "",
  }));
  const mountedRef = useRef(true);
  const closeTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const cached = getCachedLocation();
    if (cached) setFields(toFields(cached));
  }, []);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (closeTimer.current !== undefined) window.clearTimeout(closeTimer.current);
    };
  }, []);

  const updateField = useCallback((key: keyof LocationFields, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  }, []);

  const applyInfo = useCallback((info: LocationInfo, lat?: number, lng?: number) => {
    const next = toFields(info);
    if (!next.countryCode) {
      next.countryCode = detectCountryByTimezone() || detectCountryByLanguage() || "om";
    }
    setCachedLocation({ ...info, country: next.countryCode, countryCode: next.countryCode }, lat, lng);
    setFields(next);
  }, []);

  const handleDetect = useCallback(async () => {
    setDetecting(true);
    setDetectError("");
    try {
      const geo = await currentPosition();
      const { latitude, longitude } = geo.coords;
      const cached = getCachedLocation(latitude, longitude);
      if (cached) {
        if (!mountedRef.current) return;
        applyInfo(cached, latitude, longitude);
        setDetecting(false);
        return;
      }
      const res = await fetch(`/api/location?lat=${latitude}&lng=${longitude}`);
      if (!res.ok) throw new Error("Geocoding failed");
      const data: LocationInfo = await res.json();
      if (!mountedRef.current) return;
      applyInfo(data, latitude, longitude);
    } catch {
      if (!mountedRef.current) return;
      setDetectError(labels.error);
      const code = detectCountryByTimezone() || detectCountryByLanguage();
      if (code) setFields((prev) => ({ ...prev, countryCode: code }));
    } finally {
      if (mountedRef.current) setDetecting(false);
    }
  }, [applyInfo, labels.error]);

  const handleSave = () => {
    const info: LocationInfo = {
      ...fields,
      country: fields.countryCode,
      countryCode: fields.countryCode,
      lat: null,
      lng: null,
      displayName: "",
    };
    setCachedLocation(info);
    onApply?.(fields);
    setOpen(false);
    setDetectError("");
  };

  const scheduleClose = () => {
    if (closeTimer.current !== undefined) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 140);
  };
  const cancelClose = () => {
    if (closeTimer.current !== undefined) window.clearTimeout(closeTimer.current);
    closeTimer.current = undefined;
  };

  const toggle = () => {
    cancelClose();
    setOpen((prev) => !prev);
  };

  const depthFields: Array<[keyof LocationFields, string, string]> = [
    ["governorate", labels.governorate, "◈"],
    ["city", labels.city, "⌖"],
    ["village", labels.village, "⊞"],
    ["district", labels.district, "▣"],
    ["street", labels.street, "⛩"],
  ];
  const filled = depthFields.map(([key]) => fields[key]).filter((value) => value.trim());
  const summary =
    filled.length >= 2
      ? [filled[filled.length - 2], filled[filled.length - 1]].join(" · ")
      : filled[0] || countryName || labels.empty;

  return (
    <div
      className="location-switcher"
      aria-label={labels.aria}
      onMouseEnter={cancelClose}
      onMouseLeave={() => scheduleClose()}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          cancelClose();
          setOpen(false);
        }
      }}
    >
      <button
        className="location-trigger"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={toggle}
        onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}
      >
        <span className="location-pin" aria-hidden="true">⌖</span>
        <span>{summary}</span>
        <span className="location-chevron" aria-hidden="true">⌄</span>
      </button>
      <div className="location-dropdown" role="dialog" hidden={!open}>
        <div className="location-dropdown-head">
          <button
            className="location-detect"
            type="button"
            onClick={handleDetect}
            disabled={detecting}
          >
            {detecting ? (
              <span className="location-spinner" aria-hidden="true" />
            ) : (
              <span aria-hidden="true">⌖</span>
            )}
            {detecting ? labels.detecting : labels.detect}
          </button>
          {detectError && <span className="location-detect-error">{detectError}</span>}
        </div>
        <div className="location-grid">
          <div className="location-field location-field-wide">
            <label htmlFor="location-chip-country"><span aria-hidden="true">⚑</span> {labels.country}</label>
            <select
              id="location-chip-country"
              name="countryCode"
              value={fields.countryCode}
              onChange={(e) => updateField("countryCode", e.target.value)}
            >
              <option value="">{labels.countryPlaceholder}</option>
              {COUNTRY_LIST.map(([code]) => (
                <option key={code} value={code}>{countryLabel(code, locale)}</option>
              ))}
            </select>
          </div>
          {depthFields.map(([key, label, icon]) => (
            <div className="location-field" key={key}>
              <label htmlFor={`location-chip-${key}`}><span aria-hidden="true">{icon}</span> {label}</label>
              <input
                id={`location-chip-${key}`}
                name={key}
                value={fields[key]}
                onChange={(e) => updateField(key, e.target.value)}
                placeholder={label}
              />
            </div>
          ))}
        </div>
        <div className="location-actions">
          <button className="location-cancel" type="button" onClick={() => setOpen(false)}>{labels.cancel}</button>
          <button className="location-save" type="button" onClick={handleSave}>{labels.save}</button>
        </div>
      </div>
    </div>
  );
}
