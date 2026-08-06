export type PropertyRow = {
  id: string;
  slug: string | null;
  listing_type: string;
  property_type: string;
  country_code: string;
  city_id: string | null;
  district: string | null;
  title_ar: string;
  title_en: string;
  title_tr: string;
  area_text_ar: string | null;
  area_text_en: string | null;
  area_text_tr: string | null;
  description_ar: string;
  description_en: string;
  description_tr: string;
  price: number;
  currency: string;
  built_up_area: number | null;
  land_area: number | null;
  bedrooms: number;
  bathrooms: number;
  parking_slots: number;
  features_ar: string;
  features_en: string;
  features_tr: string;
  image_url: string | null;
  is_featured: number;
};

export type PublicProperty = {
  id: string;
  slug: string | null;
  listingType: string;
  propertyType: string;
  countryCode: string;
  cityId: string | null;
  district: string | null;
  title: { ar: string; en: string; tr: string };
  area: { ar: string | null; en: string | null; tr: string | null };
  description: { ar: string; en: string; tr: string };
  features: { ar: string[]; en: string[]; tr: string[] };
  price: number;
  currency: string;
  builtUpArea: number | null;
  landArea: number | null;
  bedrooms: number;
  bathrooms: number;
  parkingSlots: number;
  imageUrl: string | null;
  isFeatured: boolean;
};

export const PROPERTY_SELECT = `
  SELECT id, slug, listing_type, property_type, country_code, city_id, district,
         title_ar, title_en, title_tr, area_text_ar, area_text_en, area_text_tr,
         description_ar, description_en, description_tr, price, currency,
         built_up_area, land_area, bedrooms, bathrooms, parking_slots,
         features_ar, features_en, features_tr, image_url, is_featured
  FROM property_listings
`;

export function parsePropertyFeatures(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function serialiseProperty(row: PropertyRow): PublicProperty {
  return {
    id: row.id,
    slug: row.slug,
    listingType: row.listing_type,
    propertyType: row.property_type,
    countryCode: row.country_code,
    cityId: row.city_id,
    district: row.district,
    title: { ar: row.title_ar, en: row.title_en, tr: row.title_tr },
    area: { ar: row.area_text_ar, en: row.area_text_en, tr: row.area_text_tr },
    description: { ar: row.description_ar, en: row.description_en, tr: row.description_tr },
    features: {
      ar: parsePropertyFeatures(row.features_ar),
      en: parsePropertyFeatures(row.features_en),
      tr: parsePropertyFeatures(row.features_tr),
    },
    price: Number(row.price),
    currency: row.currency,
    builtUpArea: row.built_up_area == null ? null : Number(row.built_up_area),
    landArea: row.land_area == null ? null : Number(row.land_area),
    bedrooms: Number(row.bedrooms),
    bathrooms: Number(row.bathrooms),
    parkingSlots: Number(row.parking_slots),
    imageUrl: row.image_url,
    isFeatured: Number(row.is_featured) === 1,
  };
}
