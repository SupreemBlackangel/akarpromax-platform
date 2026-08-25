import { AdapterHints, CountryDocumentAdapter } from "./contracts";
import type { Point } from "@/lib/geo/contracts";
import { getCountryProfile } from "@/lib/land/documents/profiles";

export const SAUDI_BOUNDS = {
  minLat: 16.0,
  maxLat: 32.5,
  minLon: 34.5,
  maxLon: 55.7,
};

export type CountryBounds = { minLat: number; maxLat: number; minLon: number; maxLon: number };

export const GULF_BOUNDS: Record<string, CountryBounds> = {
  SA: SAUDI_BOUNDS,
  AE: { minLat: 22.6, maxLat: 26.2, minLon: 51.5, maxLon: 56.4 },
  OM: { minLat: 16.6, maxLat: 26.3, minLon: 52.0, maxLon: 59.9 },
  QA: { minLat: 24.4, maxLat: 26.2, minLon: 50.7, maxLon: 51.7 },
  BH: { minLat: 25.5, maxLat: 26.3, minLon: 50.3, maxLon: 50.8 },
  KW: { minLat: 28.5, maxLat: 30.1, minLon: 46.5, maxLon: 48.5 },
};

/**
 * Worldwide plausibility envelopes. These are an accuracy aid for documents
 * that name their country, never a precondition: an unlisted country simply
 * has no envelope and every valid WGS84 point stays acceptable.
 */
export const COUNTRY_BOUNDS: Record<string, CountryBounds> = {
  ...GULF_BOUNDS,
  YE: { minLat: 12.1, maxLat: 19.0, minLon: 42.5, maxLon: 54.6 },
  IQ: { minLat: 29.0, maxLat: 37.4, minLon: 38.8, maxLon: 48.6 },
  JO: { minLat: 29.2, maxLat: 33.4, minLon: 34.9, maxLon: 39.3 },
  EG: { minLat: 22.0, maxLat: 31.7, minLon: 25.0, maxLon: 36.9 },
  TR: { minLat: 35.8, maxLat: 42.1, minLon: 25.7, maxLon: 44.8 },
  MA: { minLat: 21.0, maxLat: 35.9, minLon: -17.1, maxLon: -1.0 },
  DZ: { minLat: 18.9, maxLat: 37.1, minLon: -8.7, maxLon: 12.0 },
  TN: { minLat: 30.2, maxLat: 37.6, minLon: 7.5, maxLon: 11.6 },
  LY: { minLat: 19.5, maxLat: 33.2, minLon: 9.3, maxLon: 25.2 },
  SD: { minLat: 8.6, maxLat: 22.2, minLon: 21.8, maxLon: 38.6 },
  PK: { minLat: 23.6, maxLat: 37.1, minLon: 60.9, maxLon: 77.1 },
  IN: { minLat: 6.7, maxLat: 35.5, minLon: 68.1, maxLon: 97.4 },
  ID: { minLat: -11.0, maxLat: 6.1, minLon: 95.0, maxLon: 141.0 },
  MY: { minLat: 0.8, maxLat: 7.4, minLon: 99.6, maxLon: 119.3 },
  GB: { minLat: 49.8, maxLat: 60.9, minLon: -8.7, maxLon: 1.8 },
  FR: { minLat: 41.3, maxLat: 51.1, minLon: -5.2, maxLon: 9.6 },
  DE: { minLat: 47.2, maxLat: 55.1, minLon: 5.8, maxLon: 15.1 },
  ES: { minLat: 35.9, maxLat: 43.8, minLon: -9.4, maxLon: 4.4 },
  IT: { minLat: 35.4, maxLat: 47.1, minLon: 6.6, maxLon: 18.6 },
  NL: { minLat: 50.7, maxLat: 53.6, minLon: 3.3, maxLon: 7.3 },
  SE: { minLat: 55.3, maxLat: 69.1, minLon: 11.0, maxLon: 24.2 },
  NO: { minLat: 57.9, maxLat: 71.2, minLon: 4.6, maxLon: 31.1 },
  PL: { minLat: 49.0, maxLat: 54.9, minLon: 14.1, maxLon: 24.2 },
  US: { minLat: 24.4, maxLat: 49.4, minLon: -125.0, maxLon: -66.9 },
  CA: { minLat: 41.7, maxLat: 83.1, minLon: -141.0, maxLon: -52.6 },
  MX: { minLat: 14.5, maxLat: 32.7, minLon: -118.4, maxLon: -86.7 },
  BR: { minLat: -33.8, maxLat: 5.3, minLon: -74.0, maxLon: -34.8 },
  AR: { minLat: -55.1, maxLat: -21.8, minLon: -73.6, maxLon: -53.6 },
  CL: { minLat: -56.0, maxLat: -17.5, minLon: -75.7, maxLon: -66.4 },
  PE: { minLat: -18.4, maxLat: -0.04, minLon: -81.4, maxLon: -68.7 },
  CO: { minLat: -4.3, maxLat: 12.5, minLon: -79.0, maxLon: -66.9 },
  ZA: { minLat: -34.9, maxLat: -22.1, minLon: 16.4, maxLon: 32.9 },
  KE: { minLat: -4.7, maxLat: 5.1, minLon: 33.9, maxLon: 41.9 },
  NG: { minLat: 4.2, maxLat: 13.9, minLon: 2.7, maxLon: 14.7 },
  AU: { minLat: -43.7, maxLat: -10.0, minLon: 112.9, maxLon: 153.7 },
  NZ: { minLat: -47.3, maxLat: -34.1, minLon: 166.4, maxLon: 178.6 },
  CN: { minLat: 18.2, maxLat: 53.6, minLon: 73.5, maxLon: 134.8 },
  JP: { minLat: 24.0, maxLat: 45.6, minLon: 122.9, maxLon: 146.0 },
};

/**
 * Envelope for a country. A registered document profile is the authority; the
 * table above covers countries that have an envelope but no profile yet.
 */
export function boundsForCountry(countryCode?: string): CountryBounds | undefined {
  if (!countryCode) return undefined;
  const code = countryCode.toUpperCase();
  const profile = getCountryProfile(code);
  if (profile.countryCode === code && profile.bounds) return profile.bounds;
  return COUNTRY_BOUNDS[code];
}

const RELEVANCE_KEYWORDS: readonly { keyword: string; weight: number }[] = [
  { keyword: "صك", weight: 3 },
  { keyword: "مخطط", weight: 2 },
  { keyword: "قطعة", weight: 2 },
  { keyword: "رقم القطعة", weight: 3 },
  { keyword: "رقم المخطط", weight: 3 },
  { keyword: "الحي", weight: 1 },
  { keyword: "المدينة", weight: 1 },
  { keyword: "المساحة", weight: 2 },
  { keyword: "حدود", weight: 2 },
  { keyword: "إحداثيات", weight: 3 },
  { keyword: "خط العرض", weight: 3 },
  { keyword: "خط الطول", weight: 3 },
  { keyword: "deed", weight: 3 },
  { keyword: "parcel", weight: 2 },
  { keyword: "plot", weight: 2 },
  { keyword: "plan", weight: 1 },
  { keyword: "survey", weight: 2 },
  { keyword: "boundary", weight: 2 },
  { keyword: "coordinates", weight: 3 },
  { keyword: "latitude", weight: 3 },
  { keyword: "longitude", weight: 3 },
  { keyword: "land", weight: 1 },
  { keyword: "property", weight: 1 },
  { keyword: "municipality", weight: 2 },
  { keyword: "cadastre", weight: 2 },
  { keyword: "title", weight: 1 },
  { keyword: "owner", weight: 1 },
];

function cleanOcrPlaceName(value?: string): string | undefined {
  const cleaned = value
    ?.replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "")
    .replace(/[|]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (!cleaned) return undefined;
  const repeatedArabicPairs = cleaned.match(/([\u0621-\u064A])\1/g) ?? [];
  if (repeatedArabicPairs.length >= 2) return undefined;
  return cleaned;
}

export class GenericLandDocumentAdapter implements CountryDocumentAdapter {
  readonly countryCode: string;
  readonly label: string;

  constructor(countryCode: string, label?: string) {
    this.countryCode = countryCode;
    this.label = label ?? countryCode;
  }

  relevanceScore(text: string): number {
    const lower = text.toLowerCase();
    let score = 0;
    for (const { keyword, weight } of RELEVANCE_KEYWORDS) {
      if (lower.includes(keyword.toLowerCase())) score += weight;
    }
    return score;
  }

  extractHints(text: string): AdapterHints {
    const hints: AdapterHints = {
      country: this.countryCode === "UNKNOWN" ? undefined : this.countryCode,
      parcels: [],
      addresses: [],
      landmarks: [],
      sourceReferences: [],
    };

    const parcelMatch = /(?:قطعة\s*(?:رقم\s*)?|(?:parcel|plot|lot)\s*(?:(?:no\.?|number)\s*)?)[#:]?\s*([0-9-]{1,12})/i.exec(text);
    if (parcelMatch) {
      hints.parcels.push({ parcelId: parcelMatch[1], raw: parcelMatch[0], source: "adapter" });
    }

    const planMatch = /(?:مخطط|plan)\s*(?:رقم\s*)?[#:]?\s*([0-9]{1,10})/i.exec(text);
    if (planMatch) {
      hints.parcels.push({ planId: planMatch[1], raw: planMatch[0], source: "adapter" });
    }

    const docMatch = /(?:صك رقم|deed no\.?|document (?:no\.?|number)|رقم الوثيقة)\s*[:：#]?\s*([0-9/\\-]{4,20})/i.exec(text);
    if (docMatch) {
      hints.sourceReferences.push(docMatch[1]);
    }

    const cityMatch =
      /(?:المدينة|city|المنطقة|region)\s*[:：#]?\s*([^\n،-]{2,40})/i.exec(text) ??
      /(?:^|-\s+|\s-\s+)([A-Za-z][A-Za-z\s]{2,40}?)\s*$/.exec(text.trim());
    if (cityMatch) {
      hints.city = cleanOcrPlaceName(cityMatch[1]);
      if (hints.city) hints.addresses.push({ city: hints.city, raw: cityMatch[0], source: "adapter" });
    }

    const districtMatch = /(?:حي|district)\s*([^\n،]{2,40})/i.exec(text);
    if (districtMatch) {
      hints.district = cleanOcrPlaceName(districtMatch[1]);
      if (hints.district) hints.addresses.push({ district: hints.district, raw: districtMatch[0], source: "adapter" });
    }

    const streetMatch = /(?:شارع|street|road)\s*([^\n،]{2,40})/i.exec(text);
    if (streetMatch) {
      hints.street = cleanOcrPlaceName(streetMatch[1]);
      if (hints.street) hints.addresses.push({ street: hints.street, raw: streetMatch[0], source: "adapter" });
    }

    const landmarkMatches = text.match(/[أ-ي]{4,}\s*[أ-ي\s]{4,}/g);
    if (landmarkMatches) {
      hints.landmarks.push(...landmarkMatches.slice(0, 5));
    }

    return hints;
  }

  get bounds(): CountryBounds | undefined {
    return boundsForCountry(this.countryCode);
  }

  isPlausiblePoint(point: Point): boolean {
    const bounds = this.bounds;
    if (!bounds) return true;
    return (
      point.lat >= bounds.minLat &&
      point.lat <= bounds.maxLat &&
      point.lon >= bounds.minLon &&
      point.lon <= bounds.maxLon
    );
  }
}

export class SaudiDocumentAdapter extends GenericLandDocumentAdapter {
  constructor() {
    super("SA", "Saudi Arabia");
  }

  override extractHints(text: string): AdapterHints {
    const hints = super.extractHints(text);

    const parcelArabic = /رقم القطعة\s*[:：#]?\s*([0-9-]{1,12})/i.exec(text);
    if (parcelArabic) {
      hints.parcels.push({ parcelId: parcelArabic[1], raw: parcelArabic[0], source: "saudi-adapter" });
    }

    const planArabic = /رقم المخطط\s*[:：#]?\s*([0-9]{1,10})/i.exec(text);
    if (planArabic) {
      hints.parcels.push({ planId: planArabic[1], raw: planArabic[0], source: "saudi-adapter" });
    }

    const areaArabic = /المساحة\s*[:：#]?\s*([\d.,]+)\s*(م2|متر مربع|m2)?/i.exec(text);
    if (areaArabic) {
      hints.landmarks.push(`area:${areaArabic[1].replace(/,/g, "")}`);
    }

    const cityArabic = /(?:المدينة|المنطقة)\s*[:：#]?\s*([^\n،]{2,40})/i.exec(text);
    if (cityArabic && !hints.city) {
      hints.city = cleanOcrPlaceName(cityArabic[1]);
      if (hints.city) hints.addresses.push({ city: hints.city, raw: cityArabic[0], source: "saudi-adapter" });
    }

    const districtArabic = /حي\s*([^\n،]{2,40})/i.exec(text);
    if (districtArabic && !hints.district) {
      hints.district = cleanOcrPlaceName(districtArabic[1]);
      if (hints.district) hints.addresses.push({ district: hints.district, raw: districtArabic[0], source: "saudi-adapter" });
    }

    return hints;
  }
}

export const DEFAULT_ADAPTER: CountryDocumentAdapter = new SaudiDocumentAdapter();
export const UNKNOWN_COUNTRY_ADAPTER: CountryDocumentAdapter = new GenericLandDocumentAdapter("UNKNOWN", "Unknown country");

/**
 * Adapter for a document's country. With no country evidence the neutral
 * worldwide adapter is used: there is no regional default, so an unrecognised
 * document is never analysed under another country's assumptions.
 */
export function adapterForCountry(countryCode?: string): CountryDocumentAdapter {
  if (!countryCode) return UNKNOWN_COUNTRY_ADAPTER;
  const code = countryCode.toUpperCase();
  if (code === "SA") return new SaudiDocumentAdapter();
  return new GenericLandDocumentAdapter(code);
}
