/**
 * Country document profiles.
 *
 * Each entry is pure configuration. Adding a country means adding a profile
 * here — no core parser, CRS, geometry, or validation code changes.
 */
import {
  UNIVERSAL_AREA_LABELS,
  UNIVERSAL_BOUNDARY_LABELS,
  UNIVERSAL_COORDINATE_LABELS,
  UNIVERSAL_DOCUMENT_FAMILIES,
  UNIVERSAL_POINT_LABELS,
  type CountryDocumentProfile,
  type DocumentFamily,
} from "./country-profile";

/**
 * The fallback used whenever the country cannot be established. It carries the
 * universal wording only, and no geographic envelope, so an unrecognised
 * document is analysed on its own evidence rather than another country's
 * assumptions.
 */
export const GENERIC_PROFILE: CountryDocumentProfile = {
  countryCode: "UNKNOWN",
  label: { ar: "غير محددة", en: "Undetermined" },
  countryNames: [],
  authorities: [],
  places: [],
  terminology: [],
  documentFamilies: UNIVERSAL_DOCUMENT_FAMILIES,
  coordinateLabels: UNIVERSAL_COORDINATE_LABELS,
  boundaryLabels: UNIVERSAL_BOUNDARY_LABELS,
  areaLabels: UNIVERSAL_AREA_LABELS,
  pointLabels: UNIVERSAL_POINT_LABELS,
  crsHints: { notes: "Determined from document evidence only." },
};

const SAUDI_FAMILIES: readonly DocumentFamily[] = [
  {
    id: "sa-electronic-deed",
    kind: "PROPERTY_DEED",
    label: { ar: "صك إلكتروني", en: "Electronic title deed" },
    weight: 4,
    keywords: ["صك إلكتروني", "صك الكتروني", "الصك الإلكتروني", "رقم الصك", "صك رقم", "وزارة العدل", "كتابة العدل"],
  },
  {
    id: "sa-municipal-survey",
    kind: "SURVEY_REPORT",
    label: { ar: "قرار مساحي بلدي", en: "Municipal survey decision" },
    weight: 4,
    keywords: ["قرار مساحي", "القرار المساحي", "أمانة", "امانة", "بلدية", "الرفع المساحي", "توقيع مساحي"],
  },
  {
    id: "sa-survey-report",
    kind: "SURVEY_REPORT",
    label: { ar: "تقرير مساحي", en: "Survey report" },
    weight: 3,
    keywords: ["تقرير مساحي", "مكتب هندسي", "مساح معتمد", "الهيئة السعودية للمساحة", "المساحة الجيولوجية"],
  },
  {
    id: "sa-parcel-plan",
    kind: "SITE_PLAN",
    label: { ar: "مخطط قطعة", en: "Parcel plan" },
    weight: 3,
    keywords: ["رقم المخطط", "رقم القطعة", "مخطط معتمد", "التصنيف التنظيمي", "مخطط تقسيم"],
  },
  {
    id: "sa-cadastral-sketch",
    kind: "CADASTRAL_SKETCH",
    label: { ar: "كروكي", en: "Cadastral sketch" },
    weight: 3,
    keywords: ["كروكي", "كروكى", "رسم كروكي"],
  },
];

export const SAUDI_PROFILE: CountryDocumentProfile = {
  countryCode: "SA",
  label: { ar: "المملكة العربية السعودية", en: "Saudi Arabia" },
  countryNames: [
    "المملكة العربية السعودية",
    "السعودية",
    "السعوديه",
    "kingdom of saudi arabia",
    "saudi arabia",
    "ksa",
  ],
  authorities: [
    "وزارة العدل",
    "كتابة العدل",
    "الهيئة العامة للعقار",
    "الهيئة السعودية للمساحة",
    "وزارة الشؤون البلدية",
    "أمانة منطقة",
    "امانة منطقة",
    "ministry of justice",
    "real estate general authority",
  ],
  places: [
    "الرياض", "جدة", "مكة المكرمة", "مكة", "المدينة المنورة", "الدمام", "الخبر", "الظهران",
    "الطائف", "تبوك", "بريدة", "عنيزة", "أبها", "خميس مشيط", "نجران", "جازان", "حائل",
    "عرعر", "سكاكا", "الباحة", "ينبع", "الجبيل", "القطيف", "الأحساء", "الخرج", "حفر الباطن",
    "riyadh", "jeddah", "makkah", "mecca", "madinah", "dammam", "khobar", "taif", "tabuk",
  ],
  terminology: ["رقم القطعة", "رقم المخطط", "صك", "الحي", "قرار مساحي", "أمانة", "امانة"],
  documentFamilies: [...SAUDI_FAMILIES, ...UNIVERSAL_DOCUMENT_FAMILIES],
  coordinateLabels: [...UNIVERSAL_COORDINATE_LABELS, "الشرقي", "الشمالي", "س", "ص"],
  boundaryLabels: [...UNIVERSAL_BOUNDARY_LABELS, "يحده شمالا", "يحده جنوبا", "يحده شرقا", "يحده غربا", "الأطوال"],
  areaLabels: [...UNIVERSAL_AREA_LABELS, "مساحة القطعة", "المساحة الإجمالية"],
  pointLabels: [...UNIVERSAL_POINT_LABELS, "رقم الركن"],
  crsHints: {
    utmZones: [36, 37, 38, 39],
    hemisphere: "N",
    epsg: [32636, 32637, 32638, 32639, 4326],
    notes: "Spans four UTM zones, so a zone is never inferred from the country alone.",
  },
  bounds: { minLat: 16.0, maxLat: 32.5, minLon: 34.5, maxLon: 55.7 },
  identifierPatterns: [
    { field: "parcelId", pattern: /رقم\s*القطعة\s*[:：#\-]?\s*([0-9A-Za-z/\\-]{1,24})/ },
    { field: "planId", pattern: /رقم\s*المخطط\s*[:：#\-]?\s*([0-9A-Za-z/\\-]{1,24})/ },
    { field: "deedId", pattern: /(?:رقم\s*الصك|صك\s*رقم)\s*[:：#\-]?\s*([0-9/\\-]{4,30})/ },
  ],
};

const OMAN_FAMILIES: readonly DocumentFamily[] = [
  {
    id: "om-ownership-document",
    kind: "PROPERTY_DEED",
    label: { ar: "سند ملكية", en: "Ownership document" },
    weight: 4,
    keywords: [
      "سند ملكية",
      "سند الملكية",
      "شهادة ملكية",
      "وزارة الإسكان",
      "وزارة الاسكان",
      "ministry of housing",
      "ownership document",
      "title document",
    ],
  },
  {
    id: "om-survey-plan",
    kind: "SURVEY_REPORT",
    label: { ar: "مخطط مساحي", en: "Survey plan" },
    weight: 4,
    keywords: [
      "مخطط مساحي",
      "المساحة والمسح",
      "الرفع المساحي",
      "survey plan",
      "land survey",
      "surveying and land registry",
      "national survey authority",
    ],
  },
  {
    id: "om-land-plan",
    kind: "SITE_PLAN",
    label: { ar: "مخطط أرض", en: "Land plan" },
    weight: 3,
    keywords: ["مخطط أرض", "مخطط ارض", "رقم القسيمة", "القسيمة", "land plan", "plot plan"],
  },
  {
    id: "om-cadastral-sketch",
    kind: "CADASTRAL_SKETCH",
    label: { ar: "كروكي مساحي", en: "Cadastral sketch" },
    weight: 3,
    keywords: ["كروكي", "كروكى", "cadastral sketch"],
  },
];

export const OMAN_PROFILE: CountryDocumentProfile = {
  countryCode: "OM",
  label: { ar: "سلطنة عُمان", en: "Oman" },
  countryNames: ["سلطنة عمان", "سلطنة عُمان", "عمان", "عُمان", "sultanate of oman", "oman"],
  authorities: [
    "وزارة الإسكان والتخطيط العمراني",
    "وزارة الاسكان والتخطيط العمراني",
    "وزارة الإسكان",
    "وزارة الاسكان",
    "الهيئة الوطنية للمساحة",
    "ministry of housing and urban planning",
    "national survey authority",
  ],
  places: [
    "مسقط", "مطرح", "السيب", "بوشر", "العامرات", "قريات", "صلالة", "صحار", "نزوى", "صور",
    "البريمي", "عبري", "الرستاق", "بركاء", "المصنعة", "إبراء", "خصب", "الدقم", "بهلاء", "سمائل",
    "muscat", "seeb", "bawshar", "salalah", "sohar", "nizwa", "sur", "buraimi", "ibri", "duqm",
    "محافظة مسقط", "محافظة ظفار", "شمال الباطنة", "جنوب الباطنة", "الداخلية", "الشرقية",
  ],
  terminology: ["رقم القسيمة", "القسيمة", "ولاية", "محافظة", "سند ملكية", "المخطط"],
  documentFamilies: [...OMAN_FAMILIES, ...UNIVERSAL_DOCUMENT_FAMILIES],
  coordinateLabels: [...UNIVERSAL_COORDINATE_LABELS, "الشرقي", "الشمالي"],
  boundaryLabels: [...UNIVERSAL_BOUNDARY_LABELS, "الحدود والأطوال"],
  areaLabels: [...UNIVERSAL_AREA_LABELS, "مساحة القسيمة"],
  pointLabels: [...UNIVERSAL_POINT_LABELS, "رقم الركن"],
  crsHints: {
    utmZones: [39, 40],
    hemisphere: "N",
    epsg: [32639, 32640, 4326],
    notes: "Spans two UTM zones; the zone must come from the document or the user.",
  },
  bounds: { minLat: 16.6, maxLat: 26.5, minLon: 51.9, maxLon: 59.9 },
  identifierPatterns: [
    { field: "parcelId", pattern: /(?:رقم\s*)?القسيمة\s*[:：#\-]?\s*([0-9A-Za-z/\\-]{1,24})/ },
    { field: "planId", pattern: /(?:رقم\s*)?المخطط\s*[:：#\-]?\s*([0-9A-Za-z/\\-]{1,24})/ },
  ],
};

export const UAE_PROFILE: CountryDocumentProfile = {
  countryCode: "AE",
  label: { ar: "الإمارات العربية المتحدة", en: "United Arab Emirates" },
  countryNames: ["الإمارات العربية المتحدة", "الامارات", "الإمارات", "united arab emirates", "uae"],
  authorities: [
    "دائرة الأراضي والأملاك",
    "بلدية دبي",
    "دائرة البلديات والنقل",
    "dubai land department",
    "abu dhabi municipality",
  ],
  places: ["دبي", "أبوظبي", "ابوظبي", "الشارقة", "عجمان", "رأس الخيمة", "الفجيرة", "أم القيوين", "العين", "dubai", "abu dhabi", "sharjah", "ajman", "al ain"],
  terminology: ["رقم الأرض", "رقم قطعة الأرض", "المنطقة", "makani", "مكاني"],
  documentFamilies: UNIVERSAL_DOCUMENT_FAMILIES,
  coordinateLabels: UNIVERSAL_COORDINATE_LABELS,
  boundaryLabels: UNIVERSAL_BOUNDARY_LABELS,
  areaLabels: UNIVERSAL_AREA_LABELS,
  pointLabels: UNIVERSAL_POINT_LABELS,
  crsHints: { utmZones: [39, 40], hemisphere: "N", epsg: [32639, 32640, 4326] },
  bounds: { minLat: 22.6, maxLat: 26.2, minLon: 51.5, maxLon: 56.4 },
};

export const QATAR_PROFILE: CountryDocumentProfile = {
  countryCode: "QA",
  label: { ar: "دولة قطر", en: "Qatar" },
  countryNames: ["دولة قطر", "قطر", "state of qatar", "qatar"],
  authorities: ["وزارة البلدية", "إدارة المساحة", "ministry of municipality", "centre for gis"],
  places: ["الدوحة", "الريان", "الوكرة", "الخور", "أم صلال", "الشمال", "doha", "al rayyan", "al wakrah"],
  terminology: ["رقم العقار", "رقم القطعة", "المنطقة"],
  documentFamilies: UNIVERSAL_DOCUMENT_FAMILIES,
  coordinateLabels: UNIVERSAL_COORDINATE_LABELS,
  boundaryLabels: UNIVERSAL_BOUNDARY_LABELS,
  areaLabels: UNIVERSAL_AREA_LABELS,
  pointLabels: UNIVERSAL_POINT_LABELS,
  crsHints: { utmZones: [39], hemisphere: "N", epsg: [32639, 4326] },
  bounds: { minLat: 24.4, maxLat: 26.2, minLon: 50.7, maxLon: 51.7 },
};

export const BAHRAIN_PROFILE: CountryDocumentProfile = {
  countryCode: "BH",
  label: { ar: "مملكة البحرين", en: "Bahrain" },
  countryNames: ["مملكة البحرين", "البحرين", "kingdom of bahrain", "bahrain"],
  authorities: ["جهاز المساحة والتسجيل العقاري", "survey and land registration bureau"],
  places: ["المنامة", "المحرق", "الرفاع", "مدينة عيسى", "مدينة حمد", "سترة", "manama", "muharraq", "riffa"],
  terminology: ["رقم العقار", "المجمع", "الروضة"],
  documentFamilies: UNIVERSAL_DOCUMENT_FAMILIES,
  coordinateLabels: UNIVERSAL_COORDINATE_LABELS,
  boundaryLabels: UNIVERSAL_BOUNDARY_LABELS,
  areaLabels: UNIVERSAL_AREA_LABELS,
  pointLabels: UNIVERSAL_POINT_LABELS,
  crsHints: { utmZones: [39], hemisphere: "N", epsg: [32639, 4326] },
  bounds: { minLat: 25.5, maxLat: 26.4, minLon: 50.3, maxLon: 50.9 },
};

export const KUWAIT_PROFILE: CountryDocumentProfile = {
  countryCode: "KW",
  label: { ar: "دولة الكويت", en: "Kuwait" },
  countryNames: ["دولة الكويت", "الكويت", "state of kuwait", "kuwait"],
  authorities: ["بلدية الكويت", "الإدارة العامة للمساحة", "kuwait municipality", "public authority for civil information"],
  places: ["مدينة الكويت", "حولي", "الفروانية", "الأحمدي", "الجهراء", "مبارك الكبير", "kuwait city", "hawalli", "farwaniya", "ahmadi"],
  terminology: ["رقم القسيمة", "القطعة", "المنطقة", "قسيمة"],
  documentFamilies: UNIVERSAL_DOCUMENT_FAMILIES,
  coordinateLabels: UNIVERSAL_COORDINATE_LABELS,
  boundaryLabels: UNIVERSAL_BOUNDARY_LABELS,
  areaLabels: UNIVERSAL_AREA_LABELS,
  pointLabels: UNIVERSAL_POINT_LABELS,
  crsHints: { utmZones: [38, 39], hemisphere: "N", epsg: [32638, 32639, 4326] },
  bounds: { minLat: 28.5, maxLat: 30.1, minLon: 46.5, maxLon: 48.5 },
};

export const JORDAN_PROFILE: CountryDocumentProfile = {
  countryCode: "JO",
  label: { ar: "المملكة الأردنية الهاشمية", en: "Jordan" },
  countryNames: ["المملكة الأردنية الهاشمية", "الأردن", "الاردن", "jordan"],
  authorities: ["دائرة الأراضي والمساحة", "department of lands and survey"],
  places: ["عمان", "الزرقاء", "إربد", "العقبة", "المفرق", "الكرك", "amman", "zarqa", "irbid", "aqaba"],
  terminology: ["رقم القطعة", "حوض", "قرية", "لواء"],
  documentFamilies: UNIVERSAL_DOCUMENT_FAMILIES,
  coordinateLabels: UNIVERSAL_COORDINATE_LABELS,
  boundaryLabels: UNIVERSAL_BOUNDARY_LABELS,
  areaLabels: UNIVERSAL_AREA_LABELS,
  pointLabels: UNIVERSAL_POINT_LABELS,
  crsHints: { utmZones: [36, 37], hemisphere: "N", epsg: [32636, 32637, 4326] },
  bounds: { minLat: 29.2, maxLat: 33.4, minLon: 34.9, maxLon: 39.3 },
};

export const EGYPT_PROFILE: CountryDocumentProfile = {
  countryCode: "EG",
  label: { ar: "جمهورية مصر العربية", en: "Egypt" },
  countryNames: ["جمهورية مصر العربية", "مصر", "egypt"],
  authorities: ["الهيئة المصرية العامة للمساحة", "الشهر العقاري", "egyptian survey authority"],
  places: ["القاهرة", "الجيزة", "الإسكندرية", "الاسكندرية", "أسوان", "الأقصر", "بورسعيد", "cairo", "giza", "alexandria", "luxor", "aswan"],
  terminology: ["حوض", "ناحية", "رقم القطعة", "زمام"],
  documentFamilies: UNIVERSAL_DOCUMENT_FAMILIES,
  coordinateLabels: UNIVERSAL_COORDINATE_LABELS,
  boundaryLabels: UNIVERSAL_BOUNDARY_LABELS,
  areaLabels: [...UNIVERSAL_AREA_LABELS, "فدان", "قيراط", "سهم"],
  pointLabels: UNIVERSAL_POINT_LABELS,
  crsHints: { utmZones: [35, 36], hemisphere: "N", epsg: [32635, 32636, 4326] },
  bounds: { minLat: 22.0, maxLat: 31.7, minLon: 25.0, maxLon: 36.9 },
};

export const TURKEY_PROFILE: CountryDocumentProfile = {
  countryCode: "TR",
  label: { ar: "تركيا", en: "Türkiye" },
  countryNames: ["türkiye", "turkiye", "turkey", "تركيا", "الجمهورية التركية"],
  authorities: ["tapu ve kadastro genel müdürlüğü", "tapu ve kadastro", "land registry and cadastre"],
  places: ["istanbul", "ankara", "izmir", "bursa", "antalya", "adana", "konya", "trabzon", "إسطنبول", "أنقرة", "إزمير"],
  terminology: ["ada", "parsel", "pafta", "tapu", "mevkii"],
  documentFamilies: [
    {
      id: "tr-tapu",
      kind: "PROPERTY_DEED",
      label: { ar: "سند ملكية تركي", en: "Tapu (title deed)" },
      weight: 4,
      keywords: ["tapu senedi", "tapu", "malik", "ada parsel"],
    },
    ...UNIVERSAL_DOCUMENT_FAMILIES,
  ],
  coordinateLabels: [...UNIVERSAL_COORDINATE_LABELS, "sağa", "yukarı", "koordinat"],
  boundaryLabels: [...UNIVERSAL_BOUNDARY_LABELS, "sınır", "kuzey", "güney", "doğu", "batı"],
  areaLabels: [...UNIVERSAL_AREA_LABELS, "yüzölçümü", "alan"],
  pointLabels: [...UNIVERSAL_POINT_LABELS, "nokta", "köşe"],
  crsHints: { utmZones: [35, 36, 37, 38], hemisphere: "N", epsg: [4326] },
  bounds: { minLat: 35.8, maxLat: 42.1, minLon: 25.7, maxLon: 44.8 },
};

/** Every registered profile. The generic fallback is deliberately not listed. */
export const COUNTRY_PROFILES: readonly CountryDocumentProfile[] = [
  SAUDI_PROFILE,
  OMAN_PROFILE,
  UAE_PROFILE,
  QATAR_PROFILE,
  BAHRAIN_PROFILE,
  KUWAIT_PROFILE,
  JORDAN_PROFILE,
  EGYPT_PROFILE,
  TURKEY_PROFILE,
];

export function getCountryProfile(countryCode?: string): CountryDocumentProfile {
  if (!countryCode) return GENERIC_PROFILE;
  const code = countryCode.toUpperCase();
  return COUNTRY_PROFILES.find((profile) => profile.countryCode === code) ?? GENERIC_PROFILE;
}

export function listCountryProfileCodes(): string[] {
  return COUNTRY_PROFILES.map((profile) => profile.countryCode);
}
