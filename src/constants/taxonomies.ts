/**
 * Property categories and types for the marketing pages.
 *
 * This file used to carry its own list of 4 categories and 13 types — one of
 * four such lists in the codebase, each disagreeing with the others. It is now
 * a view onto the single taxonomy in lib/taxonomy/property-taxonomy.ts, kept
 * for the shape its callers expect (`label` as a localised record, the
 * showInSearch / showInAddProperty flags).
 */

import {
  PROPERTY_CATEGORIES as TAXONOMY_CATEGORIES,
  PROPERTY_TYPES as TAXONOMY_TYPES,
  propertyTypesForCategory,
  selectableCategories,
  type LocalizedLabel,
} from "@/lib/taxonomy/property-taxonomy";

export type { LocalizedLabel };

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

const CATEGORY_ICONS: Record<string, string> = {
  residential: "🏠",
  commercial: "🏪",
  industrial: "🏭",
  agricultural: "🌾",
  land: "📐",
  residential_commercial: "🏙️",
  administrative: "🏛️",
};

const TYPE_ICONS: Record<string, string> = {
  villa: "🏡", apartment: "🏢", townhouse: "🏘️", palace: "🏰", studio: "🛏️",
  shop: "🏬", commercial_office: "🏛️", warehouse: "📦", factory: "🏭",
  farm: "🌾", orchard: "🌳",
};

export const PROPERTY_CATEGORIES: PropertyCategory[] = TAXONOMY_CATEGORIES.map((category) => ({
  id: category.id,
  label: category.label,
  icon: CATEGORY_ICONS[category.id],
  // A legacy category is still a valid stored value, but it is not offered.
  isActive: !category.legacy,
  sortOrder: category.sortOrder,
}));

export const PROPERTY_TYPES: PropertyType[] = TAXONOMY_TYPES.map((type) => ({
  id: type.id,
  categoryId: type.categoryId,
  label: type.label,
  icon: TYPE_ICONS[type.id],
  isActive: true,
  sortOrder: type.sortOrder,
  showInSearch: true,
  showInAddProperty: true,
}));

export const LISTING_TYPES = [
  { id: "for-sale", label: { ar: "للبيع", en: "For Sale", tr: "Satilik" } },
  { id: "for-rent", label: { ar: "للإيجار", en: "For Rent", tr: "Kiralik" } },
] as const;

export type ListingTypeId = typeof LISTING_TYPES[number]["id"];

export function getPropertyCategoryById(id: string): PropertyCategory | undefined {
  return PROPERTY_CATEGORIES.find((category) => category.id === id);
}

export function getPropertyTypesForCategory(categoryId: string): PropertyType[] {
  const ids = new Set(propertyTypesForCategory(categoryId).map((type) => type.id));
  return PROPERTY_TYPES.filter((type) => ids.has(type.id));
}

export function getPropertyTypeById(id: string): PropertyType | undefined {
  return PROPERTY_TYPES.find((type) => type.id === id);
}

export function getActivePropertyCategories(): PropertyCategory[] {
  const offered = new Set(selectableCategories().map((category) => category.id));
  return PROPERTY_CATEGORIES.filter((category) => offered.has(category.id));
}

export function getSearchablePropertyTypes(): PropertyType[] {
  return PROPERTY_TYPES.filter((type) => type.isActive && type.showInSearch);
}

export function getAddablePropertyTypes(): PropertyType[] {
  return PROPERTY_TYPES.filter((type) => type.isActive && type.showInAddProperty);
}
