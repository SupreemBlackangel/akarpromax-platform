/**
 * Declarative country document profiles.
 *
 * A country is added by writing a configuration object, never by editing the
 * core engine. Every profile describes only what is specific to that country's
 * paperwork — its authorities, its wording, its document families. Coordinate
 * parsing, CRS resolution, geometry and validation stay in the shared core and
 * are the same for every country.
 */
import type { Point } from "@/lib/geo/contracts";

export type DocumentFamilyKind =
  | "PROPERTY_DEED"
  | "SURVEY_REPORT"
  | "CADASTRAL_SKETCH"
  | "COORDINATE_SCHEDULE"
  | "SITE_PLAN"
  | "MUNICIPAL_DOCUMENT"
  | "UNKNOWN_SURVEY_DOCUMENT";

export interface DocumentFamily {
  /** Stable id, unique within the profile. */
  id: string;
  kind: DocumentFamilyKind;
  label: { ar: string; en: string };
  /** Terms that indicate this family. Matching is case-insensitive. */
  keywords: readonly string[];
  /** Terms that rule this family out even when a keyword matched. */
  excludes?: readonly string[];
  /** Relative strength of each keyword hit. */
  weight: number;
}

export interface CountryBounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

export interface CountryDocumentProfile {
  /** ISO 3166-1 alpha-2, or `UNKNOWN` for the generic fallback. */
  countryCode: string;
  label: { ar: string; en: string };
  /** Explicit country names, in every spelling the documents use. */
  countryNames: readonly string[];
  /** Issuing authorities, ministries, and municipalities. */
  authorities: readonly string[];
  /** Cities and regions that place a document in this country. */
  places: readonly string[];
  /** Wording peculiar to this country's survey paperwork. */
  terminology: readonly string[];
  documentFamilies: readonly DocumentFamily[];
  /** Column headings for coordinate values. */
  coordinateLabels: readonly string[];
  /** Wording for boundary descriptions. */
  boundaryLabels: readonly string[];
  /** Wording that introduces an area value. */
  areaLabels: readonly string[];
  /** Wording that introduces a vertex identifier. */
  pointLabels: readonly string[];
  /** CRS the country's documents typically use. Hints only, never defaults. */
  crsHints: {
    /** EPSG codes seen in this country's documents. */
    epsg?: readonly number[];
    /** UTM zones the country's territory falls in. */
    utmZones?: readonly number[];
    hemisphere?: "N" | "S";
    notes?: string;
  };
  /** Plausibility envelope. Optional: a profile without one constrains nothing. */
  bounds?: CountryBounds;
  /** Parcel/plan/deed identifier patterns specific to this country. */
  identifierPatterns?: readonly { field: "parcelId" | "planId" | "plotId" | "deedId"; pattern: RegExp }[];
}

/** True when a point falls inside a profile's envelope, or it has none. */
export function isPointInProfileBounds(profile: CountryDocumentProfile, point: Point): boolean {
  const bounds = profile.bounds;
  if (!bounds) return true;
  return (
    point.lat >= bounds.minLat
    && point.lat <= bounds.maxLat
    && point.lon >= bounds.minLon
    && point.lon <= bounds.maxLon
  );
}

/**
 * Coordinate, boundary, area, and point wording every country shares. Profiles
 * add their local variants on top rather than restating these.
 */
export const UNIVERSAL_COORDINATE_LABELS: readonly string[] = [
  "easting",
  "northing",
  "latitude",
  "longitude",
  "coordinates",
  "coordinate",
  "الإحداثيات",
  "الاحداثيات",
  "إحداثيات",
  "احداثيات",
  "الشرقيات",
  "الشماليات",
  "خط الطول",
  "خط العرض",
  "دائرة العرض",
];

export const UNIVERSAL_BOUNDARY_LABELS: readonly string[] = [
  "north boundary",
  "south boundary",
  "east boundary",
  "west boundary",
  "boundary",
  "bearing",
  "azimuth",
  "length",
  "الحد الشمالي",
  "الحد الجنوبي",
  "الحد الشرقي",
  "الحد الغربي",
  "شمالا",
  "شمالاً",
  "جنوبا",
  "جنوباً",
  "شرقا",
  "شرقاً",
  "غربا",
  "غرباً",
  "بطول",
  "الحدود",
];

export const UNIVERSAL_AREA_LABELS: readonly string[] = [
  "area",
  "total area",
  "المساحة",
  "المساحه",
  "إجمالي المساحة",
  "اجمالي المساحه",
];

export const UNIVERSAL_POINT_LABELS: readonly string[] = [
  "point",
  "pt",
  "vertex",
  "corner",
  "station",
  "نقطة",
  "النقطة",
  "نقطه",
  "رقم النقطة",
  "ركن",
];

/** Document families any survey document can fall into, in any country. */
export const UNIVERSAL_DOCUMENT_FAMILIES: readonly DocumentFamily[] = [
  {
    id: "generic-coordinate-schedule",
    kind: "COORDINATE_SCHEDULE",
    label: { ar: "جدول إحداثيات", en: "Coordinate schedule" },
    weight: 3,
    keywords: [
      "coordinate table",
      "coordinate schedule",
      "coordinate list",
      "northing easting",
      "easting northing",
      "جدول الإحداثيات",
      "جدول الاحداثيات",
      "كشف الإحداثيات",
    ],
  },
  {
    id: "generic-survey-report",
    kind: "SURVEY_REPORT",
    label: { ar: "تقرير مساحي", en: "Survey report" },
    weight: 3,
    keywords: [
      "survey report",
      "land survey",
      "cadastral survey",
      "surveyor",
      "تقرير مساحي",
      "تقرير مساحة",
      "الرفع المساحي",
      "أعمال مساحية",
      "اعمال مساحية",
      "مساح",
    ],
  },
  {
    id: "generic-property-deed",
    kind: "PROPERTY_DEED",
    label: { ar: "وثيقة ملكية", en: "Property deed" },
    weight: 3,
    keywords: [
      "title deed",
      "deed no",
      "ownership document",
      "certificate of title",
      "صك",
      "صك ملكية",
      "سند ملكية",
      "وثيقة ملكية",
      "شهادة ملكية",
    ],
  },
  {
    id: "generic-cadastral-sketch",
    kind: "CADASTRAL_SKETCH",
    label: { ar: "كروكي مساحي", en: "Cadastral sketch" },
    weight: 2,
    keywords: ["sketch", "krooki", "كروكي", "كروكى", "رسم كروكي", "مخطط كروكي"],
  },
  {
    id: "generic-site-plan",
    kind: "SITE_PLAN",
    label: { ar: "مخطط موقع", en: "Site plan" },
    weight: 2,
    keywords: ["site plan", "layout plan", "subdivision plan", "مخطط موقع", "مخطط تقسيم", "مخطط الأرض"],
  },
  {
    id: "generic-municipal-document",
    kind: "MUNICIPAL_DOCUMENT",
    label: { ar: "وثيقة بلدية", en: "Municipal document" },
    weight: 2,
    keywords: ["municipality", "municipal", "building permit", "بلدية", "أمانة", "امانة", "رخصة بناء"],
  },
];
