/**
 * The property taxonomy — one list, for the platform and the office app both.
 *
 * There were four of these. The office application offered 27 property
 * subtypes; the platform's validator accepted 16, src/constants/taxonomies.ts
 * described 13, and the web wizard hard-coded 15 more. The office app bridged
 * the gap with a lookup that squashed its 27 into the platform's 12 — so a
 * palace, a rest house and a traditional house were all published as
 * "apartment", and the office could not tell from the platform what it had
 * listed.
 *
 * This is the union, and it follows the office application's richer list:
 * nothing an office can record is lost on the way to the platform. The
 * platform's older codes are kept in LEGACY_TYPE_ALIASES so every row already
 * in the database still reads, and still validates.
 *
 * Served at GET /api/program/taxonomies — the office app pulls it on sync.
 */

export type Locale = "ar" | "en" | "tr";
export type LocalizedLabel = Record<Locale, string>;

export type TaxonomyCategory = {
  id: string;
  label: LocalizedLabel;
  sortOrder: number;
  /**
   * A category the database still holds but no form offers any more. Land is
   * the one: it became a facet of the other categories (residential land,
   * commercial land, industrial land, agricultural land) rather than a
   * category of its own, and rows filed under it must keep validating.
   */
  legacy?: true;
};
export type TaxonomyType = { id: string; categoryId: string; label: LocalizedLabel; sortOrder: number };
export type TaxonomyOption = { id: string; label: LocalizedLabel; sortOrder: number };

const L = (ar: string, en: string, tr: string): LocalizedLabel => ({ ar, en, tr });

export const PROPERTY_CATEGORIES: TaxonomyCategory[] = [
  { id: "residential", label: L("سكني", "Residential", "Konut"), sortOrder: 1 },
  { id: "commercial", label: L("تجاري", "Commercial", "Ticari"), sortOrder: 2 },
  { id: "industrial", label: L("صناعي", "Industrial", "Endustriyel"), sortOrder: 3 },
  { id: "agricultural", label: L("زراعي", "Agricultural", "Tarimsal"), sortOrder: 4 },
  { id: "land", label: L("أراضٍ", "Land", "Arsa"), sortOrder: 5, legacy: true },
  { id: "residential_commercial", label: L("سكني تجاري", "Residential-commercial", "Konut-ticari"), sortOrder: 6 },
  { id: "administrative", label: L("سكني إداري", "Administrative", "Idari"), sortOrder: 7 },
];

export const PROPERTY_TYPES: TaxonomyType[] = [
  // residential
  { id: "villa", categoryId: "residential", label: L("فيلا", "Villa", "Villa"), sortOrder: 1 },
  { id: "apartment", categoryId: "residential", label: L("شقة", "Apartment", "Daire"), sortOrder: 2 },
  { id: "residential_building", categoryId: "residential", label: L("عمارة سكنية", "Residential building", "Konut binasi"), sortOrder: 3 },
  { id: "independent_floor", categoryId: "residential", label: L("دور مستقل", "Independent floor", "Mustakil kat"), sortOrder: 4 },
  { id: "townhouse", categoryId: "residential", label: L("تاون هاوس", "Townhouse", "Sira ev"), sortOrder: 5 },
  { id: "traditional_house", categoryId: "residential", label: L("بيت شعبي", "Traditional house", "Geleneksel ev"), sortOrder: 6 },
  { id: "palace", categoryId: "residential", label: L("قصر", "Palace", "Saray"), sortOrder: 7 },
  { id: "studio", categoryId: "residential", label: L("استوديو", "Studio", "Studyo"), sortOrder: 8 },
  { id: "duplex", categoryId: "residential", label: L("دوبلكس", "Duplex", "Dubleks"), sortOrder: 9 },
  { id: "penthouse", categoryId: "residential", label: L("بنتهاوس", "Penthouse", "Cati kati"), sortOrder: 10 },
  { id: "rest_area", categoryId: "residential", label: L("استراحة", "Rest house", "Dinlenme evi"), sortOrder: 11 },
  { id: "worker_housing", categoryId: "residential", label: L("سكن عمال", "Worker housing", "Isci konutu"), sortOrder: 12 },
  { id: "residential_land", categoryId: "residential", label: L("أرض سكنية", "Residential land", "Konut arazisi"), sortOrder: 13 },
  // commercial
  { id: "shop", categoryId: "commercial", label: L("محل تجاري", "Shop", "Dukkan"), sortOrder: 1 },
  { id: "showroom", categoryId: "commercial", label: L("معرض تجاري", "Showroom", "Showroom"), sortOrder: 2 },
  { id: "commercial_office", categoryId: "commercial", label: L("مكتب تجاري", "Office", "Ofis"), sortOrder: 3 },
  { id: "commercial_building", categoryId: "commercial", label: L("عمارة تجارية", "Commercial building", "Ticari bina"), sortOrder: 4 },
  { id: "shopping_center", categoryId: "commercial", label: L("مركز تجاري", "Shopping centre", "Alisveris merkezi"), sortOrder: 5 },
  { id: "hotel_resort", categoryId: "commercial", label: L("فندق / منتجع", "Hotel or resort", "Otel / tatil koyu"), sortOrder: 6 },
  { id: "restaurant", categoryId: "commercial", label: L("مطعم", "Restaurant", "Restoran"), sortOrder: 7 },
  { id: "commercial_land", categoryId: "commercial", label: L("أرض تجارية", "Commercial land", "Ticari arsa"), sortOrder: 8 },
  // industrial
  { id: "warehouse", categoryId: "industrial", label: L("مستودع", "Warehouse", "Depo"), sortOrder: 1 },
  { id: "factory", categoryId: "industrial", label: L("مصنع", "Factory", "Fabrika"), sortOrder: 2 },
  { id: "workshop", categoryId: "industrial", label: L("ورشة", "Workshop", "Atolye"), sortOrder: 3 },
  { id: "industrial_land", categoryId: "industrial", label: L("أرض صناعية", "Industrial land", "Sanayi arsasi"), sortOrder: 4 },
  // agricultural
  { id: "farm", categoryId: "agricultural", label: L("مزرعة", "Farm", "Ciftlik"), sortOrder: 1 },
  { id: "orchard", categoryId: "agricultural", label: L("بستان", "Orchard", "Meyve bahcesi"), sortOrder: 2 },
  { id: "agricultural_land", categoryId: "agricultural", label: L("أرض زراعية", "Agricultural land", "Tarim arazisi"), sortOrder: 3 },
  // mixed use
  { id: "mixed_use_building", categoryId: "residential_commercial", label: L("عمارة سكنية تجارية", "Mixed-use building", "Karma bina"), sortOrder: 1 },
  { id: "office_apartment", categoryId: "administrative", label: L("شقة مكتبية", "Office apartment", "Ofis dairesi"), sortOrder: 1 },
];

/**
 * Codes the platform accepted before this list existed, and what each one is
 * now. They stay VALID for ever — rows carrying them are in the database — but
 * they are not offered in any new dropdown.
 */
export const LEGACY_TYPE_ALIASES: Record<string, string> = {
  office: "commercial_office",
  building: "residential_building",
  land: "residential_land",
  ranch: "farm",
  hotel: "hotel_resort",
  resort: "hotel_resort",
  compound: "villa",
  "residential-land": "residential_land",
  "commercial-land": "commercial_land",
  "agricultural-land": "agricultural_land",
};

export const PROPERTY_DIRECTIONS: TaxonomyOption[] = [
  { id: "north", label: L("شمال", "North", "Kuzey"), sortOrder: 1 },
  { id: "south", label: L("جنوب", "South", "Guney"), sortOrder: 2 },
  { id: "east", label: L("شرق", "East", "Dogu"), sortOrder: 3 },
  { id: "west", label: L("غرب", "West", "Bati"), sortOrder: 4 },
  { id: "north_east", label: L("شمال شرقي", "North-east", "Kuzeydogu"), sortOrder: 5 },
  { id: "north_west", label: L("شمال غربي", "North-west", "Kuzeybati"), sortOrder: 6 },
  { id: "south_east", label: L("جنوب شرقي", "South-east", "Guneydogu"), sortOrder: 7 },
  { id: "south_west", label: L("جنوب غربي", "South-west", "Guneybati"), sortOrder: 8 },
];

export const FURNISHING_OPTIONS: TaxonomyOption[] = [
  { id: "none", label: L("غير مفروش", "Unfurnished", "Esyasiz"), sortOrder: 1 },
  { id: "partial", label: L("مفروش جزئياً", "Partly furnished", "Yari esyali"), sortOrder: 2 },
  { id: "full", label: L("مفروش بالكامل", "Fully furnished", "Full esyali"), sortOrder: 3 },
];

const TYPE_IDS = new Set(PROPERTY_TYPES.map((type) => type.id));
const CATEGORY_IDS = new Set(PROPERTY_CATEGORIES.map((category) => category.id));
const TYPE_BY_ID = new Map(PROPERTY_TYPES.map((type) => [type.id, type]));

/** Every code a `property_type` column may legitimately hold: canonical plus legacy. */
export const ACCEPTED_PROPERTY_TYPES: string[] = [...TYPE_IDS, ...Object.keys(LEGACY_TYPE_ALIASES)];
export const ACCEPTED_PROPERTY_CATEGORIES: string[] = [...CATEGORY_IDS];

/** The categories a form should offer — everything except the legacy ones. */
export function selectableCategories(): TaxonomyCategory[] {
  return PROPERTY_CATEGORIES.filter((category) => !category.legacy).sort((a, b) => a.sortOrder - b.sortOrder);
}

/** A stored code resolved to its canonical id, or null if it is not one of ours. */
export function canonicalPropertyType(code: string | null | undefined): string | null {
  const raw = (code ?? "").trim().toLowerCase();
  if (!raw) return null;
  if (TYPE_IDS.has(raw)) return raw;
  return LEGACY_TYPE_ALIASES[raw] ?? null;
}

export function isAcceptedPropertyType(code: string | null | undefined): boolean {
  return canonicalPropertyType(code) !== null;
}

/** The category a type belongs to — the derivation the publish bridge needs. */
export function categoryForPropertyType(code: string | null | undefined): string | null {
  const canonical = canonicalPropertyType(code);
  return canonical ? TYPE_BY_ID.get(canonical)?.categoryId ?? null : null;
}

export function propertyTypeLabel(code: string | null | undefined, locale: Locale = "ar"): string {
  const canonical = canonicalPropertyType(code);
  return canonical ? TYPE_BY_ID.get(canonical)?.label[locale] ?? canonical : (code ?? "");
}

export function propertyTypesForCategory(categoryId: string): TaxonomyType[] {
  return PROPERTY_TYPES.filter((type) => type.categoryId === categoryId).sort((a, b) => a.sortOrder - b.sortOrder);
}

/** The whole taxonomy, as the office application receives it. */
export function taxonomyPayload() {
  return {
    version: 1,
    categories: PROPERTY_CATEGORIES,
    types: PROPERTY_TYPES,
    directions: PROPERTY_DIRECTIONS,
    furnishing: FURNISHING_OPTIONS,
    legacyTypeAliases: LEGACY_TYPE_ALIASES,
  };
}
