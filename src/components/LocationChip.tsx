"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  getCachedLocation,
  setCachedLocation,
  detectCountryByTimezone,
  detectCountryByLanguage,
} from "@/src/location-utils";
import { countryOptions } from "@/src/data/locations";
import type { Locale } from "@/src/types/site";
import type { LocationFields, LocationInfo } from "@/src/location-utils";

type Props = {
  locale?: Locale;
  countryCode?: string;
  countryName?: string;
  cityName?: string;
  onApply?: (fields: LocationFields) => void;
  onDetected?: (fields: LocationFields) => void;
};

const FALLBACK_COUNTRY = "om";

const LABELS: Record<Locale, {
  aria: string; title: string; empty: string; country: string; governorate: string;
  city: string; village: string; district: string; street: string;
  countryPlaceholder: string; detect: string; detecting: string;
  save: string; cancel: string; error: string;
}> = {
  ar: {
    aria: "العنوان الجغرافي",
    title: "حدّد موقعك",
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
    title: "Set your location",
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
    title: "Konumunuzu ayarlayın",
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

const DEPTH_KEYS: Array<"governorate" | "city" | "village" | "district" | "street"> = [
  "governorate",
  "city",
  "village",
  "district",
  "street",
];

function toFields(info: LocationInfo): LocationFields {
  return {
    countryCode: info.countryCode || info.country.toLowerCase() || FALLBACK_COUNTRY,
    governorate: info.governorate || "",
    city: info.city || "",
    village: info.village || "",
    district: info.district || "",
    street: info.street || "",
  };
}

function countryLabel(code: string, locale: Locale): string {
  const found = countryOptions.find((country) => country.id === code);
  return found ? found.names[locale] : code.toUpperCase();
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
  onDetected,
}: Props) {
  const labels = LABELS[locale];
  const dialogId = useId();
  const countryFieldId = `${dialogId}-country`;
  const [open, setOpen] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState("");
  const [fields, setFields] = useState<LocationFields>(() => ({
    countryCode: countryCode || FALLBACK_COUNTRY,
    governorate: "",
    city: cityName || "",
    village: "",
    district: "",
    street: "",
  }));

  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const countrySelectRef = useRef<HTMLSelectElement | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const cached = getCachedLocation();
    if (cached) {
      const next = toFields(cached);
      setFields(next);
      onDetected?.(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (open) return;
    setFields((prev) => ({
      ...prev,
      countryCode: countryCode || prev.countryCode,
      city: cityName || prev.city,
    }));
  }, [countryCode, cityName, open]);

  useEffect(() => {
    if (!open) return;
    const focusTarget = countrySelectRef.current ?? dialogRef.current;
    focusTarget?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const updateField = useCallback((key: keyof LocationFields, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  }, []);

  const applyInfo = useCallback((info: LocationInfo, lat?: number, lng?: number) => {
    const next = toFields(info);
    if (!next.countryCode) {
      next.countryCode = detectCountryByTimezone() || detectCountryByLanguage() || FALLBACK_COUNTRY;
    }
    setCachedLocation({ ...info, country: next.countryCode, countryCode: next.countryCode }, lat, lng);
    setFields(next);
    onDetected?.(next);
  }, [onDetected]);

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

  const closeDialog = useCallback((restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

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
    setDetectError("");
    closeDialog(true);
  };

  const filled = DEPTH_KEYS.map((key) => fields[key]).filter((value) => value.trim());
  const summary =
    filled.length >= 2
      ? [filled[filled.length - 2], filled[filled.length - 1]].join(" · ")
      : filled[0] || countryLabel(fields.countryCode, locale) || countryName || labels.empty;

  return (
    <div className="location-switcher" ref={rootRef}>
      <button
        ref={triggerRef}
        className="location-trigger"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={dialogId}
        aria-label={labels.aria}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="location-pin" aria-hidden="true">⌖</span>
        <span>{summary}</span>
        <span className="location-chevron" aria-hidden="true">⌄</span>
      </button>
      <div
        ref={dialogRef}
        id={dialogId}
        className="location-dropdown"
        role="dialog"
        aria-labelledby={`${dialogId}-title`}
        hidden={!open}
      >
        <div className="location-dropdown-head">
          <span id={`${dialogId}-title`} className="location-dropdown-title">{labels.title}</span>
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
        </div>
        {detectError && (
          <p className="location-detect-error" role="alert">{detectError}</p>
        )}
        <div className="location-grid">
          <div className="location-field location-field-wide">
            <label htmlFor={countryFieldId}><span aria-hidden="true">⚑</span> {labels.country}</label>
            <select
              id={countryFieldId}
              ref={countrySelectRef}
              name="countryCode"
              value={fields.countryCode}
              onChange={(event) => updateField("countryCode", event.target.value)}
            >
              <option value="">{labels.countryPlaceholder}</option>
              {countryOptions.map((country) => (
                <option key={country.id} value={country.id}>{country.names[locale]}</option>
              ))}
            </select>
          </div>
          {DEPTH_KEYS.map((key) => (
            <div className="location-field" key={key}>
              <label htmlFor={`${dialogId}-${key}`}>{labels[key]}</label>
              <input
                id={`${dialogId}-${key}`}
                name={key}
                value={fields[key]}
                onChange={(event) => updateField(key, event.target.value)}
                placeholder={labels[key]}
              />
            </div>
          ))}
        </div>
        <div className="location-actions">
          <button className="location-cancel" type="button" onClick={() => closeDialog(true)}>{labels.cancel}</button>
          <button className="location-save" type="button" onClick={handleSave}>{labels.save}</button>
        </div>
      </div>
    </div>
  );
}
