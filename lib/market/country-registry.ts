/**
 * AkarProMax canonical country registry (L1A).
 *
 * AkarProMax is a GLOBAL platform. The initial market set below is the launch
 * registry, not the platform boundary.
 *
 * BINDING RULES:
 *  - GLOBAL / "all countries" is NOT a country. It never appears here and it
 *    must never be inserted as a row in the `countries` table. See
 *    `market-scope.ts` for how the global state is represented.
 *  - There is no platform-wide default country. Nothing in this module returns
 *    "the" country.
 *  - `officialCurrencyCode` is the country's own currency. It is NOT the
 *    currency a listing must be priced in.
 *  - Map centres are only present where a value was already available in the
 *    repository. `null` is a valid, supported state and no platform behaviour
 *    may depend on a map centre existing.
 */

import type { CurrencyCode } from "@/lib/market/currency-registry";

export type MeasurementSystem = "metric" | "imperial";

/**
 * Locales the country registry can be rendered in.
 *
 * `ar | en | tr` are the core launch locales and are carried as first-class
 * columns (`name_ar`, `name_en`, `name_tr`) because they already exist in the
 * schema. Future locales (fr, de, es, ...) are served through `localizedNames`
 * — an optional overlay — so adding one never requires a new column, a new
 * migration, or a redesign of the countries table.
 */
export type MarketLocale = "ar" | "en" | "tr" | (string & Record<never, never>);

export type CountryDefinition = {
  /** ISO 3166-1 alpha-2, UPPERCASE. Canonical casing for the whole platform. */
  readonly code: string;
  readonly nameAr: string;
  readonly nameEn: string;
  readonly nameTr: string;
  readonly phoneCode: string;
  /** The country's own official currency, or null when not yet established. */
  readonly officialCurrencyCode: CurrencyCode | null;
  readonly flagEmoji: string;
  readonly mapCenterLat: number | null;
  readonly mapCenterLng: number | null;
  readonly defaultZoom: number;
  readonly publicationsEnabled: boolean;
  readonly measurementSystem: MeasurementSystem;
  readonly displayOrder: number;
  /** Extensibility point for locales beyond ar/en/tr. Empty by default. */
  readonly localizedNames?: Readonly<Record<string, string>>;
};

/**
 * Map centres below are the values already present in
 * `drizzle-pg/0016_extend_countries_config.sql`. They were not invented here.
 */
export const COUNTRY_REGISTRY: readonly CountryDefinition[] = Object.freeze([
  { code: "DZ", nameAr: "الجزائر", nameEn: "Algeria", nameTr: "Cezayir", phoneCode: "+213", officialCurrencyCode: "DZD", flagEmoji: "🇩🇿", mapCenterLat: 36.7538, mapCenterLng: 3.0588, defaultZoom: 12, publicationsEnabled: true, measurementSystem: "metric", displayOrder: 10 },
  { code: "BH", nameAr: "البحرين", nameEn: "Bahrain", nameTr: "Bahreyn", phoneCode: "+973", officialCurrencyCode: "BHD", flagEmoji: "🇧🇭", mapCenterLat: 26.0667, mapCenterLng: 50.5577, defaultZoom: 12, publicationsEnabled: true, measurementSystem: "metric", displayOrder: 20 },
  { code: "KM", nameAr: "جزر القمر", nameEn: "Comoros", nameTr: "Komorlar", phoneCode: "+269", officialCurrencyCode: "KMF", flagEmoji: "🇰🇲", mapCenterLat: -11.7172, mapCenterLng: 43.2433, defaultZoom: 12, publicationsEnabled: true, measurementSystem: "metric", displayOrder: 30 },
  { code: "DJ", nameAr: "جيبوتي", nameEn: "Djibouti", nameTr: "Cibuti", phoneCode: "+253", officialCurrencyCode: "DJF", flagEmoji: "🇩🇯", mapCenterLat: 11.5721, mapCenterLng: 43.1456, defaultZoom: 12, publicationsEnabled: true, measurementSystem: "metric", displayOrder: 40 },
  { code: "EG", nameAr: "مصر", nameEn: "Egypt", nameTr: "Mısır", phoneCode: "+20", officialCurrencyCode: "EGP", flagEmoji: "🇪🇬", mapCenterLat: 30.0444, mapCenterLng: 31.2357, defaultZoom: 12, publicationsEnabled: true, measurementSystem: "metric", displayOrder: 50 },
  { code: "IQ", nameAr: "العراق", nameEn: "Iraq", nameTr: "Irak", phoneCode: "+964", officialCurrencyCode: "IQD", flagEmoji: "🇮🇶", mapCenterLat: 33.3152, mapCenterLng: 44.3661, defaultZoom: 12, publicationsEnabled: true, measurementSystem: "metric", displayOrder: 60 },
  { code: "JO", nameAr: "الأردن", nameEn: "Jordan", nameTr: "Ürdün", phoneCode: "+962", officialCurrencyCode: "JOD", flagEmoji: "🇯🇴", mapCenterLat: 31.9454, mapCenterLng: 35.9284, defaultZoom: 12, publicationsEnabled: true, measurementSystem: "metric", displayOrder: 70 },
  { code: "KW", nameAr: "الكويت", nameEn: "Kuwait", nameTr: "Kuveyt", phoneCode: "+965", officialCurrencyCode: "KWD", flagEmoji: "🇰🇼", mapCenterLat: 29.3759, mapCenterLng: 47.9774, defaultZoom: 12, publicationsEnabled: true, measurementSystem: "metric", displayOrder: 80 },
  { code: "LB", nameAr: "لبنان", nameEn: "Lebanon", nameTr: "Lübnan", phoneCode: "+961", officialCurrencyCode: "LBP", flagEmoji: "🇱🇧", mapCenterLat: 33.8938, mapCenterLng: 35.5131, defaultZoom: 12, publicationsEnabled: true, measurementSystem: "metric", displayOrder: 90 },
  { code: "LY", nameAr: "ليبيا", nameEn: "Libya", nameTr: "Libya", phoneCode: "+218", officialCurrencyCode: "LYD", flagEmoji: "🇱🇾", mapCenterLat: 32.9022, mapCenterLng: 13.1875, defaultZoom: 12, publicationsEnabled: true, measurementSystem: "metric", displayOrder: 100 },
  { code: "MR", nameAr: "موريتانيا", nameEn: "Mauritania", nameTr: "Moritanya", phoneCode: "+222", officialCurrencyCode: "MRU", flagEmoji: "🇲🇷", mapCenterLat: 18.0858, mapCenterLng: -15.9582, defaultZoom: 12, publicationsEnabled: true, measurementSystem: "metric", displayOrder: 110 },
  { code: "MA", nameAr: "المغرب", nameEn: "Morocco", nameTr: "Fas", phoneCode: "+212", officialCurrencyCode: "MAD", flagEmoji: "🇲🇦", mapCenterLat: 31.7917, mapCenterLng: -7.5898, defaultZoom: 12, publicationsEnabled: true, measurementSystem: "metric", displayOrder: 120 },
  { code: "OM", nameAr: "سلطنة عُمان", nameEn: "Oman", nameTr: "Umman", phoneCode: "+968", officialCurrencyCode: "OMR", flagEmoji: "🇴🇲", mapCenterLat: 21.4735, mapCenterLng: 55.9761, defaultZoom: 12, publicationsEnabled: true, measurementSystem: "metric", displayOrder: 130 },
  // PS: officialCurrencyCode stays null — no sovereign currency is fabricated.
  // Country official-currency METADATA is a different concept from allowed
  // publisher PRICING currencies: ILS is an active pricing currency in the
  // registry, so listings in PS may be priced in ILS (or any active currency).
  { code: "PS", nameAr: "فلسطين", nameEn: "Palestine", nameTr: "Filistin", phoneCode: "+970", officialCurrencyCode: null, flagEmoji: "🇵🇸", mapCenterLat: 31.9522, mapCenterLng: 35.2034, defaultZoom: 12, publicationsEnabled: true, measurementSystem: "metric", displayOrder: 140 },
  { code: "QA", nameAr: "قطر", nameEn: "Qatar", nameTr: "Katar", phoneCode: "+974", officialCurrencyCode: "QAR", flagEmoji: "🇶🇦", mapCenterLat: 25.2854, mapCenterLng: 51.1846, defaultZoom: 12, publicationsEnabled: true, measurementSystem: "metric", displayOrder: 150 },
  { code: "SA", nameAr: "السعودية", nameEn: "Saudi Arabia", nameTr: "Suudi Arabistan", phoneCode: "+966", officialCurrencyCode: "SAR", flagEmoji: "🇸🇦", mapCenterLat: 24.7136, mapCenterLng: 46.6753, defaultZoom: 12, publicationsEnabled: true, measurementSystem: "metric", displayOrder: 160 },
  { code: "SO", nameAr: "الصومال", nameEn: "Somalia", nameTr: "Somali", phoneCode: "+252", officialCurrencyCode: "SOS", flagEmoji: "🇸🇴", mapCenterLat: 2.0469, mapCenterLng: 45.2049, defaultZoom: 12, publicationsEnabled: true, measurementSystem: "metric", displayOrder: 170 },
  { code: "SD", nameAr: "السودان", nameEn: "Sudan", nameTr: "Sudan", phoneCode: "+249", officialCurrencyCode: "SDG", flagEmoji: "🇸🇩", mapCenterLat: 15.5007, mapCenterLng: 30.2176, defaultZoom: 12, publicationsEnabled: true, measurementSystem: "metric", displayOrder: 180 },
  { code: "SY", nameAr: "سوريا", nameEn: "Syria", nameTr: "Suriye", phoneCode: "+963", officialCurrencyCode: "SYP", flagEmoji: "🇸🇾", mapCenterLat: 33.5138, mapCenterLng: 36.2765, defaultZoom: 12, publicationsEnabled: true, measurementSystem: "metric", displayOrder: 190 },
  { code: "TN", nameAr: "تونس", nameEn: "Tunisia", nameTr: "Tunus", phoneCode: "+216", officialCurrencyCode: "TND", flagEmoji: "🇹🇳", mapCenterLat: 36.8065, mapCenterLng: 10.1815, defaultZoom: 12, publicationsEnabled: true, measurementSystem: "metric", displayOrder: 200 },
  { code: "AE", nameAr: "الإمارات العربية المتحدة", nameEn: "United Arab Emirates", nameTr: "Birleşik Arap Emirlikleri", phoneCode: "+971", officialCurrencyCode: "AED", flagEmoji: "🇦🇪", mapCenterLat: 25.2048, mapCenterLng: 55.2708, defaultZoom: 12, publicationsEnabled: true, measurementSystem: "metric", displayOrder: 210 },
  { code: "YE", nameAr: "اليمن", nameEn: "Yemen", nameTr: "Yemen", phoneCode: "+967", officialCurrencyCode: "YER", flagEmoji: "🇾🇪", mapCenterLat: 15.3694, mapCenterLng: 44.191, defaultZoom: 12, publicationsEnabled: true, measurementSystem: "metric", displayOrder: 220 },
  { code: "TR", nameAr: "تركيا", nameEn: "Türkiye", nameTr: "Türkiye", phoneCode: "+90", officialCurrencyCode: "TRY", flagEmoji: "🇹🇷", mapCenterLat: 39.9334, mapCenterLng: 32.8597, defaultZoom: 12, publicationsEnabled: true, measurementSystem: "metric", displayOrder: 230 },
]);

export const COUNTRY_CODES: readonly string[] = Object.freeze(
  COUNTRY_REGISTRY.map((country) => country.code),
);

const BY_CODE = new Map<string, CountryDefinition>(
  COUNTRY_REGISTRY.map((country) => [country.code, country]),
);

/** Normalises any incoming country code to canonical UPPERCASE alpha-2. */
export function normalizeCountryCode(code: string | null | undefined): string | null {
  if (!code) return null;
  const trimmed = code.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(trimmed) ? trimmed : null;
}

export function isKnownCountry(code: string | null | undefined): boolean {
  const normalized = normalizeCountryCode(code);
  return normalized !== null && BY_CODE.has(normalized);
}

export function getCountry(code: string | null | undefined): CountryDefinition | undefined {
  const normalized = normalizeCountryCode(code);
  return normalized ? BY_CODE.get(normalized) : undefined;
}

/**
 * Locale-aware country name. Core locales resolve from the first-class name
 * columns; anything else resolves from the `localizedNames` overlay and falls
 * back to English. Adding fr/de/es later means adding overlay entries — not a
 * schema change.
 */
export function countryName(country: CountryDefinition, locale: MarketLocale): string {
  switch (locale) {
    case "ar":
      return country.nameAr;
    case "tr":
      return country.nameTr;
    case "en":
      return country.nameEn;
    default:
      return country.localizedNames?.[locale] ?? country.nameEn;
  }
}
