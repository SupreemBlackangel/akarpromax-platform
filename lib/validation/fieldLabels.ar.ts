/**
 * What each field is called, in the words the form uses.
 *
 * A validation message that names `descriptionAr` tells the user nothing. The
 * labels here are the ones printed above the inputs on
 * /dashboard/properties/new, so "الوصف يجب ألا يقل عن 20 حرفاً" points at a
 * field the user can actually see.
 *
 * Keys are the Zod path joined with "." — `media.0.url` and `offers.2.price`
 * are looked up by their indexless form (`media.url`, `offers.price`) so one
 * entry covers every element of an array.
 */

const LABELS: Record<string, string> = {
  // Step 1 — basics
  titleAr: "عنوان العقار",
  titleEn: "العنوان بالإنجليزية",
  descriptionAr: "الوصف",
  descriptionEn: "الوصف بالإنجليزية",
  category: "الفئة العقارية",
  propertyType: "نوع العقار",
  dealType: "نوع الصفقة",
  referenceNumber: "الرقم المرجعي",

  // Step 2 — location
  country: "الدولة",
  governorate: "المنطقة / المحافظة",
  city: "المدينة",
  district: "الحي",
  address: "العنوان التفصيلي",
  latitude: "الموقع على الخريطة",
  longitude: "الموقع على الخريطة",

  // Step 3 — specification
  area: "المساحة",
  bedrooms: "عدد الغرف",
  bathrooms: "عدد دورات المياه",
  floor: "الدور",
  totalFloors: "عدد الأدوار",
  yearBuilt: "سنة البناء",
  facade: "الواجهة",
  direction: "الاتجاه",
  advertisingLicense: "رخصة الإعلان",

  // Step 4 — offers and price
  price: "السعر",
  currency: "العملة",
  offers: "العروض",
  "offers.offerTypeId": "نوع العرض",
  "offers.marketingMethod": "طريقة التسويق",
  "offers.auctionType": "نوع المزاد",
  "offers.price": "سعر العرض",
  "offers.currency": "عملة العرض",
  "offers.negotiable": "قابل للتفاوض",
  "offers.isActive": "حالة العرض",

  // Step 5 — media
  media: "الصور والوسائط",
  "media.url": "رابط الصورة أو الفيديو",
  "media.type": "نوع الوسيط",
  "media.altText": "وصف الصورة",
  images: "الصور",
  videoUrl: "الفيديو",

  // Office-side fields the bridge validates
  ownerId: "المالك",
  ownerName: "اسم المالك",
  agentName: "اسم الوكيل",
  officeId: "المكتب",
};

/** The indexless form of a Zod path: ["offers", 2, "price"] -> "offers.price". */
export function fieldKey(path: ReadonlyArray<string | number | symbol>): string {
  return path
    .filter((segment) => typeof segment !== "number")
    .map(String)
    .join(".");
}

/**
 * The Arabic label for a field path. Falls back to the last named segment, so
 * a field added to a schema and forgotten here still produces a readable
 * message rather than an empty one.
 */
export function fieldLabelAr(path: ReadonlyArray<string | number | symbol>): string {
  const key = fieldKey(path);
  if (LABELS[key]) return LABELS[key];
  const last = key.split(".").pop() ?? "";
  return LABELS[last] ?? last ?? "الحقل";
}

export const FIELD_LABELS_AR = LABELS;
