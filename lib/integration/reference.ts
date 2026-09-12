/**
 * The drop-downs the desktop office app has to agree with the website about.
 *
 * The desktop showed four hard-coded chips for "offer type" — sale, rent,
 * property management, investment — while the website offers eleven from
 * `property_offer_types`. A listing published from the desktop therefore could
 * not say "تقبيل" or "فروغ" at all, and the two products disagreed about what
 * a property even is.
 *
 * Everything here is read from the same place the website reads it, not copied:
 * offer types from the same query `/api/offer-types` runs, categories and types
 * from `lib/taxonomy/property-taxonomy.ts`, currencies from the market
 * registry. A second list would drift, and drift here means a desktop that
 * publishes a category the website rejects.
 */
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { propertyOfferTypes } from "@/lib/db/schemas/offer-types-schema";
import { cached } from "@/lib/cache";
import {
  PROPERTY_CATEGORIES,
  PROPERTY_TYPES,
  selectableCategories,
} from "@/lib/taxonomy/property-taxonomy";
import { CURRENCY_REGISTRY } from "@/lib/market/currency-registry";

/** The columns anything downstream of this actually reads. */
export type OfferTypeRow = {
  code: string;
  nameAr: string;
  nameEn: string;
  nameTr?: string | null;
  displayOrder?: number | null;
  isActive?: boolean | null;
  allowDirect?: boolean | null;
  allowAuction?: boolean | null;
};

type OfferTypeReader = () => Promise<OfferTypeRow[]>;

async function readOfferTypesFromDatabase(): Promise<OfferTypeRow[]> {
  const { db, end } = getDb();
  try {
    return (await cached("offer-types", 60_000, () =>
      db
        .select()
        .from(propertyOfferTypes)
        .where(eq(propertyOfferTypes.isActive, true))
        .orderBy(propertyOfferTypes.displayOrder),
    )) as OfferTypeRow[];
  } finally {
    await end();
  }
}

let offerTypeReader: OfferTypeReader = readOfferTypesFromDatabase;

/**
 * Substitute the catalogue, for tests only.
 *
 * The rest of the office integration reads through `getIntegrationDb`, which
 * has an in-memory implementation; this one path reads through drizzle because
 * it must run the *same query* `/api/offer-types` runs, and a second
 * implementation against the integration DB would be exactly the drift this
 * endpoint exists to prevent. The seam keeps production on one query and still
 * lets the route be tested without a database.
 */
export function setOfferTypeReaderForTesting(reader: OfferTypeReader | null): void {
  offerTypeReader = reader ?? readOfferTypesFromDatabase;
}

/**
 * The offer types the website offers, in the website's order.
 *
 * `/api/offer-types` calls this too, so the two endpoints cannot answer
 * differently: same table, same `isActive` filter, same `displayOrder` sort,
 * same 60s cache key.
 */
export async function activeOfferTypes(): Promise<OfferTypeRow[]> {
  return offerTypeReader();
}

export type ReferenceOfferType = {
  code: string;
  nameAr: string;
  nameEn: string;
  nameTr: string | null;
  allowDirect: boolean;
  allowAuction: boolean;
  sortOrder: number;
  isActive: boolean;
};

export type ReferenceLabelled = {
  id: string;
  labelAr: string;
  labelEn: string;
  labelTr: string;
  sortOrder: number;
};

export type ReferencePropertyType = ReferenceLabelled & { categoryId: string };

export type ReferenceListingStatus = {
  id: string;
  labelAr: string;
  labelEn: string;
  labelTr: string;
  /** What this maps to in `properties.status` on the website, or null when
   *  it is the office's own bookkeeping and the website has no opinion. */
  platformStatus: string | null;
};

export type ReferenceCurrency = { code: string; symbolAr: string; symbolEn: string };

export type OfficeReference = {
  version: string;
  offerTypes: ReferenceOfferType[];
  categories: ReferenceLabelled[];
  propertyTypes: ReferencePropertyType[];
  listingStatuses: ReferenceListingStatus[];
  currencies: ReferenceCurrency[];
};

/**
 * How an office describes a listing's place in its own workflow.
 *
 * Distinct from `properties.status`, which is the website's moderation state
 * and stays the website's to set — an office marking a listing "under
 * management" must not approve it, and a listing pending review is still under
 * management as far as the office is concerned. Only `active_market` has a
 * website counterpart at all.
 */
export const OFFICE_LISTING_STATUSES: readonly ReferenceListingStatus[] = Object.freeze([
  {
    id: "active_market",
    labelAr: "السوق النشط",
    labelEn: "Active market",
    labelTr: "Aktif pazar",
    platformStatus: "approved",
  },
  {
    id: "under_management",
    labelAr: "إدارة أملاك",
    labelEn: "Under management",
    labelTr: "Yönetim altında",
    platformStatus: null,
  },
  {
    id: "completed",
    labelAr: "مكتمل",
    labelEn: "Completed",
    labelTr: "Tamamlandı",
    platformStatus: null,
  },
]);

export const OFFICE_LISTING_STATUS_IDS: readonly string[] = OFFICE_LISTING_STATUSES.map((status) => status.id);

export function isOfficeListingStatus(value: unknown): boolean {
  return typeof value === "string" && OFFICE_LISTING_STATUS_IDS.includes(value);
}

/**
 * A fingerprint of the content, so the desktop can ask "has anything changed?"
 * and be told "no" in a few bytes.
 *
 * Over the serialised payload rather than a timestamp: the taxonomy lives in
 * source and has no `updated_at`, and a version that moves when nothing
 * changed would defeat the point of the cache.
 */
export function referenceVersion(payload: Omit<OfficeReference, "version">): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 16);
}

export async function buildOfficeReference(): Promise<OfficeReference> {
  const offerRows = await activeOfferTypes();

  const offerTypes: ReferenceOfferType[] = offerRows.map((row, index) => ({
    code: row.code,
    nameAr: row.nameAr,
    nameEn: row.nameEn,
    nameTr: row.nameTr ?? null,
    allowDirect: row.allowDirect ?? true,
    allowAuction: row.allowAuction ?? true,
    // The website sorts by displayOrder; a null there would leave the desktop
    // guessing, so the resolved position is sent instead of the raw column.
    sortOrder: row.displayOrder ?? index,
    isActive: row.isActive ?? true,
  }));

  // Only categories the website actually offers — a legacy category is still a
  // valid stored value but must not appear in a "new listing" drop-down.
  const offered = new Set(selectableCategories().map((category) => category.id));
  const categories: ReferenceLabelled[] = PROPERTY_CATEGORIES
    .filter((category) => offered.has(category.id))
    .map((category) => ({
      id: category.id,
      labelAr: category.label.ar,
      labelEn: category.label.en,
      labelTr: category.label.tr,
      sortOrder: category.sortOrder,
    }));

  const propertyTypes: ReferencePropertyType[] = PROPERTY_TYPES
    .filter((type) => offered.has(type.categoryId))
    .map((type) => ({
      id: type.id,
      categoryId: type.categoryId,
      labelAr: type.label.ar,
      labelEn: type.label.en,
      labelTr: type.label.tr,
      sortOrder: type.sortOrder,
    }));

  // Every registry entry is active — ACTIVE_CURRENCY_CODES is the whole list —
  // so there is nothing to filter, only to order.
  //
  // `symbol` in the registry is the Arabic-script form (ر.ع, د.إ) for the
  // regional currencies and already Latin for USD/EUR/TRY. The code is the
  // right Latin form for the first group and harmless for the second, so an
  // English UI never shows Arabic script it cannot lay out.
  const currencies: ReferenceCurrency[] = [...CURRENCY_REGISTRY]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((currency) => ({
      code: currency.code,
      symbolAr: currency.symbol,
      symbolEn: currency.code,
    }));

  const body = {
    offerTypes,
    categories,
    propertyTypes,
    listingStatuses: [...OFFICE_LISTING_STATUSES],
    currencies,
  };

  return { version: referenceVersion(body), ...body };
}
