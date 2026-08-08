import type {
  AddressEvidence,
  CrsKind,
  GeocodeCandidate,
  Geometry,
  ParcelEvidence,
  Point,
  TextExtractionMethod,
} from "@/lib/geo/contracts";

export type LandDocumentCategory =
  | "TITLE_DEED"
  | "SURVEY_PLAN"
  | "PARCEL_PLAN"
  | "CADASTRAL_DOCUMENT"
  | "MUNICIPAL_DOCUMENT"
  | "PROPERTY_DOCUMENT"
  | "ADDRESS_DOCUMENT"
  | "UNKNOWN_LAND_DOCUMENT";

export type CrsConfidence = "DETECTED" | "PROBABLE" | "AMBIGUOUS" | "UNKNOWN";

export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW" | "UNRESOLVED";

export type ResolveStatus =
  | "RESOLVED_EXPLICIT_COORDINATES"
  | "RESOLVED_GEOCODED"
  | "NEEDS_USER_CONFIRMATION"
  | "PARTIALLY_RESOLVED"
  | "UNRESOLVED"
  | "INVALID_DOCUMENT"
  | "NOT_LAND_DOCUMENT";

export interface CoordinateEvidenceDetail {
  source: string;
  page?: number;
  text: string;
  raw: string;
  parsedLat?: number;
  parsedLon?: number;
  orderConfidence: number;
  crsHint?: CrsKind;
}

export interface LandGeoEvidence {
  explicitCoordinates: CoordinateEvidenceDetail[];
  coordinatePairs: Point[];
  parcels: ParcelEvidence[];
  addresses: AddressEvidence[];
  country?: string;
  region?: string;
  city?: string;
  district?: string;
  street?: string;
  landmarks: string[];
  sourceReferences: string[];
}

export interface LandDocumentClassification {
  category: LandDocumentCategory;
  confidence: number;
  matchedKeywords: string[];
}

export interface LandLocationResult {
  status: ResolveStatus;
  center?: Point;
  geometry?: Geometry;
  locationConfidence: ConfidenceLevel;
  boundaryConfidence: ConfidenceLevel;
  crsConfidence: CrsConfidence;
  resolvedAddress?: string;
  parcelIdentifiers?: { parcelId?: string; planId?: string; plotId?: string };
  evidence: LandGeoEvidence;
  candidates: GeocodeCandidate[];
  warnings: string[];
  document: {
    category: LandDocumentCategory;
    classificationConfidence: number;
  };
  extraction: {
    method: TextExtractionMethod;
    charCount: number;
    ocrUsed: boolean;
    aiUsed: boolean;
    geocodingUsed: boolean;
  };
  steps: string[];
}

export interface LandDocumentClassifier {
  readonly name: string;
  classify(text: string): LandDocumentClassification;
}

export interface CRSDetector {
  readonly name: string;
  detect(text: string, evidence: CoordinateEvidenceDetail[]): {
    kind: CrsKind;
    zone?: number;
    northernHemisphere: boolean;
    confidence: CrsConfidence;
    epsgHints: number[];
    datumHints: string[];
    zoneHints: string[];
    reason: string;
  };
}

export interface GeocodingProvider {
  readonly name: string;
  searchCandidates(evidence: LandGeoEvidence): Promise<GeocodeCandidate[]>;
}

export interface AdapterHints {
  country?: string;
  region?: string;
  city?: string;
  district?: string;
  street?: string;
  parcels: ParcelEvidence[];
  addresses: AddressEvidence[];
  landmarks: string[];
  sourceReferences: string[];
}

export interface CountryDocumentAdapter {
  readonly countryCode: string;
  readonly label: string;
  relevanceScore(text: string): number;
  extractHints(text: string): AdapterHints;
  isPlausiblePoint(point: Point): boolean;
}
