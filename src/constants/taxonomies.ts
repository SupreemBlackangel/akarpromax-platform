export type LocalizedLabel = { ar: string; en: string; tr: string };

export type PropertyCategory = {
  id: string;
  label: LocalizedLabel;
  icon?: string;
  isActive: boolean;
  sortOrder: number;
};

export type PropertyType = {
  id: string;
  categoryId: string;
  label: LocalizedLabel;
  icon?: string;
  isActive: boolean;
  sortOrder: number;
  showInSearch: boolean;
  showInAddProperty: boolean;
};

export const PROPERTY_CATEGORIES: PropertyCategory[] = [
  { id: "residential", label: { ar: "سكني", en: "Residential", tr: "Konut" }, icon: "🏠", isActive: true, sortOrder: 1 },
  { id: "commercial", label: { ar: "تجاري", en: "Commercial", tr: "Ticari" }, icon: "🏪", isActive: true, sortOrder: 2 },
  { id: "land", label: { ar: "أراضي", en: "Land", tr: "Arsa" }, icon: "📐", isActive: true, sortOrder: 3 },
  { id: "industrial", label: { ar: "صناعي", en: "Industrial", tr: "Endustriyel" }, icon: "🏭", isActive: true, sortOrder: 4 },
];

export const PROPERTY_TYPES: PropertyType[] = [
  { id: "villa", categoryId: "residential", label: { ar: "فيلا", en: "Villa", tr: "Villa" }, icon: "🏡", isActive: true, sortOrder: 1, showInSearch: true, showInAddProperty: true },
  { id: "apartment", categoryId: "residential", label: { ar: "شقة", en: "Apartment", tr: "Daire" }, icon: "🏢", isActive: true, sortOrder: 2, showInSearch: true, showInAddProperty: true },
  { id: "townhouse", categoryId: "residential", label: { ar: "تاون هاوس", en: "Townhouse", tr: "Kasaba Evi" }, icon: "🏘️", isActive: true, sortOrder: 3, showInSearch: true, showInAddProperty: true },
  { id: "compound", categoryId: "residential", label: { ar: "كمبوند", en: "Compound", tr: "Kompleks" }, icon: "🏘️", isActive: true, sortOrder: 4, showInSearch: true, showInAddProperty: true },
  { id: "office", categoryId: "commercial", label: { ar: "مكتب", en: "Office", tr: "Ofis" }, icon: "🏛️", isActive: true, sortOrder: 1, showInSearch: true, showInAddProperty: true },
  { id: "shop", categoryId: "commercial", label: { ar: "محل تجاري", en: "Shop", tr: "Dukkan" }, icon: "🏬", isActive: true, sortOrder: 2, showInSearch: true, showInAddProperty: true },
  { id: "warehouse", categoryId: "commercial", label: { ar: "مستودع", en: "Warehouse", tr: "Depo" }, icon: "📦", isActive: true, sortOrder: 3, showInSearch: true, showInAddProperty: true },
  { id: "building", categoryId: "commercial", label: { ar: "مبنى", en: "Building", tr: "Bina" }, icon: "🏗️", isActive: true, sortOrder: 4, showInSearch: true, showInAddProperty: true },
  { id: "residential-land", categoryId: "land", label: { ar: "أرض سكنية", en: "Residential Land", tr: "Konut Arazisi" }, icon: "📐", isActive: true, sortOrder: 1, showInSearch: true, showInAddProperty: true },
  { id: "commercial-land", categoryId: "land", label: { ar: "أرض تجارية", en: "Commercial Land", tr: "Ticari Arsa" }, icon: "📐", isActive: true, sortOrder: 2, showInSearch: true, showInAddProperty: true },
  { id: "agricultural-land", categoryId: "land", label: { ar: "أرض زراعية", en: "Agricultural Land", tr: "Tarim Arazisi" }, icon: "🌾", isActive: true, sortOrder: 3, showInSearch: true, showInAddProperty: true },
  { id: "factory", categoryId: "industrial", label: { ar: "مصنع", en: "Factory", tr: "Fabrika" }, icon: "🏭", isActive: true, sortOrder: 1, showInSearch: true, showInAddProperty: true },
  { id: "workshop", categoryId: "industrial", label: { ar: "ورشة", en: "Workshop", tr: "Atolye" }, icon: "🔧", isActive: true, sortOrder: 2, showInSearch: true, showInAddProperty: true },
];

export const LISTING_TYPES = [
  { id: "for-sale", label: { ar: "للبيع", en: "For Sale", tr: "Satilik" } },
  { id: "for-rent", label: { ar: "للإيجار", en: "For Rent", tr: "Kiralik" } },
] as const;

export type ListingTypeId = typeof LISTING_TYPES[number]["id"];

export function getPropertyCategoryById(id: string): PropertyCategory | undefined {
  return PROPERTY_CATEGORIES.find((c) => c.id === id);
}

export function getPropertyTypesForCategory(categoryId: string): PropertyType[] {
  return PROPERTY_TYPES.filter((t) => t.categoryId === categoryId && t.isActive);
}

export function getPropertyTypeById(id: string): PropertyType | undefined {
  return PROPERTY_TYPES.find((t) => t.id === id);
}

export function getActivePropertyCategories(): PropertyCategory[] {
  return PROPERTY_CATEGORIES.filter((c) => c.isActive);
}

export function getSearchablePropertyTypes(): PropertyType[] {
  return PROPERTY_TYPES.filter((t) => t.isActive && t.showInSearch);
}

export function getAddablePropertyTypes(): PropertyType[] {
  return PROPERTY_TYPES.filter((t) => t.isActive && t.showInAddProperty);
}
