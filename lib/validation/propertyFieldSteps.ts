/**
 * Which step of the add-property wizard each field lives on.
 *
 * A validation failure is only useful if the user can reach the field. The
 * server answers with a step number per error so the form can open the right
 * step and mark the ones that still need work — the failure that prompted this
 * was two errors on step 1 reported to a user standing on step 5.
 *
 * The wizard's own copy of this map (app/dashboard/properties/new/page.tsx)
 * covered 22 fields and had no entry for media, price or currency, so those
 * silently fell back to step 1.
 */

export const PROPERTY_STEPS = [
  { step: 1, id: "step-basic", label: "المعلومات الأساسية" },
  { step: 2, id: "step-location", label: "الموقع" },
  { step: 3, id: "step-specs", label: "المواصفات" },
  { step: 4, id: "step-offers", label: "العروض والأسعار" },
  { step: 5, id: "step-media", label: "الصور والوسائط" },
] as const;

export type PropertyStep = (typeof PROPERTY_STEPS)[number]["step"];

export const DEFAULT_PROPERTY_STEP: PropertyStep = 1;

/** Keys are the indexless field path (see fieldLabels.ar.ts's fieldKey). */
const FIELD_STEP: Record<string, PropertyStep> = {
  titleAr: 1, titleEn: 1, descriptionAr: 1, descriptionEn: 1,
  category: 1, propertyType: 1, dealType: 1, referenceNumber: 1,

  country: 2, governorate: 2, city: 2, district: 2, address: 2,
  latitude: 2, longitude: 2,

  area: 3, bedrooms: 3, bathrooms: 3, floor: 3, totalFloors: 3,
  yearBuilt: 3, facade: 3, direction: 3, advertisingLicense: 3,

  price: 4, currency: 4, offers: 4,
  "offers.offerTypeId": 4, "offers.marketingMethod": 4, "offers.auctionType": 4,
  "offers.price": 4, "offers.currency": 4, "offers.negotiable": 4, "offers.isActive": 4,

  media: 5, "media.url": 5, "media.type": 5, "media.altText": 5,
  images: 5, videoUrl: 5,
};

/** The step a field belongs to, falling back to the first step. */
export function stepForField(fieldPath: string): PropertyStep {
  if (FIELD_STEP[fieldPath]) return FIELD_STEP[fieldPath];
  const last = fieldPath.split(".").pop() ?? "";
  return FIELD_STEP[last] ?? DEFAULT_PROPERTY_STEP;
}

export function stepLabel(step: number): string {
  return PROPERTY_STEPS.find((entry) => entry.step === step)?.label ?? "";
}

export const PROPERTY_FIELD_STEPS = FIELD_STEP;
