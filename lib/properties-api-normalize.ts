import type { PublicProperty } from "@/lib/properties-format";

export type ApiPropertyRecord = {
  id: string;
  titleAr?: string | null;
  titleEn?: string | null;
  titleTr?: string | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  descriptionTr?: string | null;
  dealType?: string | null;
  listingType?: string | null;
  category?: string | null;
  propertyType?: string | null;
  country?: string | null;
  governorate?: string | null;
  city?: string | null;
  district?: string | null;
  address?: string | null;
  price?: string | number | null;
  currency?: string | null;
  area?: string | number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  floor?: number | null;
  totalFloors?: number | null;
  yearBuilt?: number | null;
  facade?: string | null;
  direction?: string | null;
  isFeatured?: boolean | number | null;
  isVerified?: boolean | number | null;
  isAuction?: boolean | number | null;
  status?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  media?: Array<{
    url?: string | null;
    mediaUrl?: string | null;
    thumbnailUrl?: string | null;
    type?: string | null;
  }> | null;
};

export type NormalizedMedia = { url: string; type: 'image' | 'video' };

export type NormalizedProperty = PublicProperty & {
  isVerified: boolean;
  isAuction: boolean;
  location: string;
  beds: number;
  baths: number;
  areaText: string;
  latitude: number | null;
  longitude: number | null;
  mediaItems: NormalizedMedia[];
};

function toNumber(value: unknown): number {
  if (value == null || value === "") return 0;
  const n = typeof value === "number" ? value : Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function toBool(value: unknown): boolean {
  return Boolean(value) && value !== "false" && value !== "0" && value !== 0;
}

function firstMediaUrl(media?: ApiPropertyRecord["media"]): string | null {
  if (!Array.isArray(media)) return null;
  for (const m of media) {
    const url = m?.url || m?.mediaUrl || m?.thumbnailUrl;
    if (url) return String(url);
  }
  return null;
}

function mediaItemsOf(media?: ApiPropertyRecord["media"]): NormalizedMedia[] {
  if (!Array.isArray(media)) return [];
  const items: NormalizedMedia[] = [];
  for (const m of media) {
    const url = m?.url || m?.mediaUrl || m?.thumbnailUrl;
    if (!url) continue;
    items.push({ url: String(url), type: m?.type === "video" ? "video" : "image" });
  }
  return items;
}

function toCoordinate(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function normalizeApiProperty(raw: ApiPropertyRecord): NormalizedProperty {
  const id = raw.id;
  const titleAr = String(raw.titleAr ?? raw.titleEn ?? "");
  const titleEn = String(raw.titleEn ?? raw.titleAr ?? "");
  const titleTr = String(raw.titleTr ?? titleEn);
  const areaValue = toNumber(raw.area);
  const areaText = areaValue > 0 ? `${areaValue} m²` : "";
  const listingType = raw.dealType || raw.listingType || "";
  const propertyType = raw.propertyType || raw.category || listingType;
  const location = [raw.district, raw.city].filter(Boolean).join("، ");

  return {
    id,
    slug: null,
    listingType,
    propertyType,
    countryCode: raw.country || "",
    cityId: raw.city || null,
    district: raw.district || null,
    title: { ar: titleAr, en: titleEn, tr: titleTr },
    area: { ar: areaText, en: areaText, tr: areaText },
    description: {
      ar: String(raw.descriptionAr ?? raw.descriptionEn ?? ""),
      en: String(raw.descriptionEn ?? raw.descriptionAr ?? ""),
      tr: String(raw.descriptionTr ?? raw.descriptionEn ?? ""),
    },
    features: { ar: [], en: [], tr: [] },
    price: toNumber(raw.price),
    currency: raw.currency || "SAR",
    builtUpArea: areaValue > 0 ? areaValue : null,
    landArea: null,
    bedrooms: Math.round(toNumber(raw.bedrooms)),
    bathrooms: Math.round(toNumber(raw.bathrooms)),
    parkingSlots: 0,
    imageUrl: firstMediaUrl(raw.media),
    isFeatured: toBool(raw.isFeatured),
    isVerified: toBool(raw.isVerified),
    isAuction: toBool(raw.isAuction),
    location,
    beds: Math.round(toNumber(raw.bedrooms)),
    baths: Math.round(toNumber(raw.bathrooms)),
    areaText,
    latitude: toCoordinate(raw.latitude),
    longitude: toCoordinate(raw.longitude),
    mediaItems: mediaItemsOf(raw.media),
  };
}
