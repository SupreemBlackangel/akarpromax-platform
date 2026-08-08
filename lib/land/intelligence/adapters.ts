import { AdapterHints, CountryDocumentAdapter } from "./contracts";
import type { Point } from "@/lib/geo/contracts";

export const SAUDI_BOUNDS = {
  minLat: 16.0,
  maxLat: 32.5,
  minLon: 34.5,
  maxLon: 55.7,
};

export const GULF_BOUNDS: Record<string, { minLat: number; maxLat: number; minLon: number; maxLon: number }> = {
  SA: SAUDI_BOUNDS,
  AE: { minLat: 22.6, maxLat: 26.2, minLon: 51.5, maxLon: 56.4 },
  OM: { minLat: 16.6, maxLat: 26.3, minLon: 52.0, maxLon: 59.9 },
  QA: { minLat: 24.4, maxLat: 26.2, minLon: 50.7, maxLon: 51.7 },
  BH: { minLat: 25.5, maxLat: 26.3, minLon: 50.3, maxLon: 50.8 },
  KW: { minLat: 28.5, maxLat: 30.1, minLon: 46.5, maxLon: 48.5 },
};

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
      country: this.countryCode,
      parcels: [],
      addresses: [],
      landmarks: [],
      sourceReferences: [],
    };

    const parcelMatch = /(?:قطعة|parcel|plot|lot)\s*(?:رقم\s*)?[#:]?\s*([0-9-]{1,12})/i.exec(text);
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
      hints.city = cityMatch[1].trim();
      hints.addresses.push({ city: hints.city, raw: cityMatch[0], source: "adapter" });
    }

    const districtMatch = /(?:حي|district)\s*([^\n،]{2,40})/i.exec(text);
    if (districtMatch) {
      hints.district = districtMatch[1].trim();
      hints.addresses.push({ district: hints.district, raw: districtMatch[0], source: "adapter" });
    }

    const streetMatch = /(?:شارع|street|road)\s*([^\n،]{2,40})/i.exec(text);
    if (streetMatch) {
      hints.street = streetMatch[1].trim();
      hints.addresses.push({ street: hints.street, raw: streetMatch[0], source: "adapter" });
    }

    const landmarkMatches = text.match(/[أ-ي]{4,}\s*[أ-ي\s]{4,}/g);
    if (landmarkMatches) {
      hints.landmarks.push(...landmarkMatches.slice(0, 5));
    }

    return hints;
  }

  isPlausiblePoint(point: Point): boolean {
    const bounds = GULF_BOUNDS[this.countryCode];
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
      hints.city = cityArabic[1].trim();
      hints.addresses.push({ city: hints.city, raw: cityArabic[0], source: "saudi-adapter" });
    }

    const districtArabic = /حي\s*([^\n،]{2,40})/i.exec(text);
    if (districtArabic && !hints.district) {
      hints.district = districtArabic[1].trim();
      hints.addresses.push({ district: hints.district, raw: districtArabic[0], source: "saudi-adapter" });
    }

    return hints;
  }
}

export const DEFAULT_ADAPTER: CountryDocumentAdapter = new SaudiDocumentAdapter();

export function adapterForCountry(countryCode?: string): CountryDocumentAdapter {
  if (!countryCode) return DEFAULT_ADAPTER;
  const code = countryCode.toUpperCase();
  if (code === "SA") return new SaudiDocumentAdapter();
  return new GenericLandDocumentAdapter(code);
}
