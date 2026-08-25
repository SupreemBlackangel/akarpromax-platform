import type { RowAccount } from "./row-accounting";
import type {
  AddressEvidence,
  CrsKind,
  GeocodeCandidate,
  Geometry,
  ParcelEvidence,
  Point,
  TextExtractionMethod,
} from "@/lib/geo/contracts";
import type { BoundaryAnalysis, SourceVertex } from "@/lib/land/boundary/parcel-boundary";
import type { DocumentedSegment, DocumentedSide } from "@/lib/land/documents/boundary-terms";

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

export type AnalysisPath =
  | "EXPLICIT_WGS84"
  | "EXPLICIT_UTM"
  | "USER_SELECTED_UTM_ZONE"
  | "INFERRED_UTM_ZONE"
  | "UTM_ZONE_SELECTION_REQUIRED"
  | "COORDINATES_CRS_REVIEW"
  | "CADASTRAL_LOOKUP_REQUIRED"
  | "ADDRESS_APPROXIMATION"
  | "UNRESOLVED"
  | "INVALID_DOCUMENT";

export type EvidenceSignalStatus = "FOUND" | "INFERRED" | "CORRECTED" | "MISSING";
export type ValidationStatus = "PASS" | "WARNING" | "FAIL" | "NOT_APPLICABLE";

export interface AnalysisEvidenceSignal {
  code:
    | "DOCUMENT_CLASSIFICATION"
    | "TEXT_EXTRACTION"
    | "COORDINATE_TABLE"
    | "COORDINATE_REFERENCE_SYSTEM"
    | "REGISTERED_AREA"
    | "SURVEY_SIDE_LENGTHS"
    | "PARCEL_IDENTIFIERS"
    | "ADDRESS"
    | "OCR_CORRECTIONS";
  status: EvidenceSignalStatus;
  confidence: number;
  count?: number;
}

export interface AnalysisValidationCheck {
  code:
    | "COORDINATE_COUNT"
    | "COUNTRY_BOUNDS"
    | "POLYGON_GEOMETRY"
    | "SOURCE_POINT_ORDER"
    | "SURVEY_CLOSURE"
    | "SIDE_LENGTHS"
    | "REGISTERED_AREA_MATCH";
  status: ValidationStatus;
  measured?: number;
  expected?: number;
  deviation?: number;
  unit?: "m" | "m2" | "percent" | "points";
}

export interface ConfidenceAssessment {
  level: ConfidenceLevel;
  score: number;
  reasons: string[];
}

export interface LandAnalysisStrategy {
  version: 1;
  path: AnalysisPath;
  requiresReview: boolean;
  reviewReasons: string[];
  evidence: AnalysisEvidenceSignal[];
  validations: AnalysisValidationCheck[];
  confidence: {
    document: ConfidenceAssessment;
    extraction: ConfidenceAssessment;
    crs: ConfidenceAssessment;
    location: ConfidenceAssessment;
    boundary: ConfidenceAssessment;
  };
}

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
  /** Vertex label as displayed, e.g. `P1`. */
  label?: string;
  /** The point number exactly as the document writes it. */
  pointNumber?: string;
  /** Row within the source table, when the document is tabular. */
  rowIndex?: number;
  /** The grid values as documented, before conversion. */
  originalEasting?: number;
  originalNorthing?: number;
  originalZone?: number;
  originalHemisphere?: "N" | "S";
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

/** One candidate cluster of unlabelled coordinate pairs found in a document. */
export interface CoordinateGroupSummary {
  id: string;
  pointCount: number;
  center: Point;
  /** Largest of the latitude/longitude spans, in degrees. */
  spanDegrees: number;
  /** Pages the cluster's points were read from. */
  pages?: number[];
}

/** What the engine concluded about the document itself, before its geometry. */
export interface DocumentIntelligence {
  country: {
    code: string;
    label: { ar: string; en: string };
    confidence: number;
    level: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
    /** True when the caller named the country instead of the engine detecting it. */
    userSupplied: boolean;
    evidence: { kind: string; term: string }[];
  };
  documentType: {
    familyId: string;
    kind: string;
    label: { ar: string; en: string };
    confidence: number;
    level: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
    matchedKeywords: string[];
  };
  /** Which adapter handled the document. `UNKNOWN` is the generic core. */
  adapter: string;
  /** Pages the document was read from. */
  pageCount: number;
  /** True when the document used Arabic-Indic digits. */
  arabicNumerals: boolean;
  /** Every coordinate table found, so several parcels stay distinguishable. */
  surveyTables?: {
    id: string;
    heading: string;
    rowCount: number;
    sequenceEvidence: string;
    closed: boolean;
    crs: string;
    zone?: number;
    hemisphere?: "N" | "S";
    epsg?: number;
    crsSelectionRequired: boolean;
    score: number;
  }[];
}

export interface LandLocationResult {
  status: ResolveStatus;
  center?: Point;
  geometry?: Geometry;
  locationConfidence: ConfidenceLevel;
  boundaryConfidence: ConfidenceLevel;
  crsConfidence: CrsConfidence;
  crsSelection?: {
    required: boolean;
    zone?: number;
    hemisphere?: "N" | "S";
    source: "DOCUMENT" | "USER" | "OMAN_DEFAULT" | "COUNTRY_INFERENCE" | "NONE";
    /** EPSG code of the resolved UTM CRS, when one is resolved. */
    epsg?: number;
  };
  /**
   * Set when coordinates are valid WGS84 but fall outside the standard UTM
   * latitude band, so no UTM grid values are produced for them.
   */
  utmOutOfRange?: boolean;
  /** Repeated corner points present in the source document. */
  duplicateSourcePoints?: number;
  /** Candidate coordinate clusters when a document contains more than one. */
  coordinateGroups?: CoordinateGroupSummary[];
  /** True when several plausible clusters exist and the user must choose one. */
  coordinateGroupSelectionRequired?: boolean;
  /** What the engine concluded about the document, before its geometry. */
  documentIntelligence?: DocumentIntelligence;
  /**
   * The reconstructed parcel: its corners in the document's own order, the
   * measurements taken from them, and every check run against them.
   */
  parcel?: {
    vertices: SourceVertex[];
    boundary: BoundaryAnalysis;
    /** What the document itself says about its boundary, in words. */
    documented: {
      sides: DocumentedSide[];
      segments: DocumentedSegment[];
      bearings: { degrees: number; raw: string }[];
      area?: { squareMeters: number; statedValue: number; unit: string; unitStated: boolean; raw: string };
    };
    /** True when the corner order came from the user rather than the document. */
    orderConfirmedByUser: boolean;
    /** Where the corner order came from, strongest evidence first. */
    sequenceEvidence: string;
    /** True when the document's own edges return to the first corner. */
    closedByTopology: boolean;
  };
  /**
   * Every coordinate row the readers detected, and where each one ended up.
   * A parcel that quietly lost a corner is the most dangerous output this
   * engine can produce, so the count is always reported, never implied.
   */
  rowAccount?: RowAccount;
  /** Coordinate tables recovered from the page layout rather than flat text. */
  layoutTables?: {
    page: number;
    kind: "PROJECTED" | "GEOGRAPHIC";
    heading?: string;
    rowCount: number;
    detectedRows: number;
    axisConfident: boolean;
    axisEvidence: string[];
  }[];
  /** What the independent readers agreed and disagreed about. */
  readerAgreement?: {
    verdict: "VERIFIED" | "REVIEW_REQUIRED" | "UNRESOLVED";
    sources: { source: string; detectedRows: number }[];
  };
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
    ocrConfidence?: number;
    aiUsed: boolean;
    geocodingUsed: boolean;
  };
  strategy?: LandAnalysisStrategy;
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
    /** True only when the document itself states the UTM zone. */
    zoneDeclared?: boolean;
    /** True only when the document itself states the hemisphere. */
    hemisphereDeclared?: boolean;
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
  /**
   * Plausibility envelope for the document's country, when one is known.
   * Absent for the neutral worldwide adapter, which accepts any valid point.
   */
  readonly bounds?: { minLat: number; maxLat: number; minLon: number; maxLon: number };
  relevanceScore(text: string): number;
  extractHints(text: string): AdapterHints;
  isPlausiblePoint(point: Point): boolean;
}
