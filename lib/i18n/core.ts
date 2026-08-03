import { translations } from "@/src/data/translations";
import type { Locale, Translation } from "@/src/types/site";
import { interpolate, isLocale, unflattenLeaf } from "@/lib/i18n/keys";
import { loadAllTranslations } from "@/lib/i18n/db";

type FlatBundle = Record<string, string>;

const fallbackFlatCache = new Map<Locale, FlatBundle>();
const dbFlatCache = new Map<Locale, FlatBundle>();

function fallbackFlat(locale: Locale): FlatBundle {
  const cached = fallbackFlatCache.get(locale);
  if (cached) return cached;
  const source = translations[locale] as unknown as Record<string, unknown>;
  const flat: FlatBundle = {};
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === "string") {
      flat[`home.${key}`] = value;
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === "string") {
          flat[`home.${key}.${index}`] = item;
        } else if (item && typeof item === "object") {
          for (const [subKey, subValue] of Object.entries(item as Record<string, unknown>)) {
            if (typeof subValue === "string") flat[`home.${key}.${index}.${subKey}`] = subValue;
          }
        }
      });
    }
  }
  fallbackFlatCache.set(locale, flat);
  return flat;
}

async function dbFlat(locale: Locale, force = false): Promise<FlatBundle> {
  const cached = dbFlatCache.get(locale);
  if (!force && cached) return cached;
  const rows = await loadAllTranslations(force);
  const flat: FlatBundle = {};
  for (const row of rows) {
    if (row.locale !== locale) continue;
    if (row.status !== "published") continue;
    flat[row.fullKey] = row.value;
  }
  dbFlatCache.set(locale, flat);
  return flat;
}

export function invalidateLocaleCaches(): void {
  dbFlatCache.clear();
}

export async function getFlatBundle(locale: Locale, force = false): Promise<FlatBundle> {
  const fallback = fallbackFlat(locale);
  const db = await dbFlat(locale, force);
  return { ...fallback, ...db };
}

export async function getTranslation(locale: Locale, force = false): Promise<Translation> {
  const flat = await getFlatBundle(locale, force);
  return unflattenLeaf(flat) as unknown as Translation;
}

export async function translate(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>,
): Promise<string> {
  const flat = await getFlatBundle(locale);
  let template = flat[key];
  if (template === undefined) template = fallbackFlat(locale)[key];
  if (template === undefined) return key;
  return interpolate(template, params);
}

export function translateSync(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>,
): string {
  const template = fallbackFlat(locale)[key];
  if (template === undefined) return key;
  return interpolate(template, params);
}

export function resolveLocale(value: unknown): Locale {
  return isLocale(value) ? value : "ar";
}
