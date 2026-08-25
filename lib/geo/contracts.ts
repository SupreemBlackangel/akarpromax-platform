export type DocumentCategory =
  | "title_deed"
  | "land_plan"
  | "survey"
  | "address_document"
  | "contract"
  | "identification"
  | "other";

export type DocumentClassificationResult = {
  category: DocumentCategory;
  confidence: number;
  matchedKeywords: string[];
};

export type TextExtractionMethod = "native_text" | "ocr" | "vision" | "none";

export type CoordinateFormat = "decimal" | "dms" | "utm" | "grid";

export type CrsKind = "wgs84" | "utm" | "gcs" | "unknown";

export type CrsDetectionResult = {
  kind: CrsKind;
  zone?: number;
  northernHemisphere: boolean;
  reason: string;
  confidence: number;
};

export type Point = {
  lat: number;
  lon: number;
};

export type GeometryType = "point" | "linestring" | "polygon";

export type Geometry =
  | { type: "point"; coordinates: Point }
  | { type: "linestring"; coordinates: Point[] }
  | { type: "polygon"; coordinates: Point[] };

export type GeometryValidationResult = {
  valid: boolean;
  errors: string[];
};

/**
 * Whether an unlabelled numeric pair may be treated as a position.
 *
 * `REJECT` marks numbers that are a measurement of the parcel, not a place on
 * it; they must never reach clustering, geometry, or the candidate count.
 */
export type CoordinateAdmission = "ACCEPT" | "REVIEW_ONLY" | "REJECT";

export type CoordinateEvidence = {
  format: CoordinateFormat;
  raw: string;
  crs?: CrsKind;
  point?: Point;
  source: string;
  /** Set for readings that had to earn their place; absent means labelled. */
  admission?: CoordinateAdmission;
  /** Why the admission gate decided as it did, in the reviewer's words. */
  admissionReason?: string;
  /** Named evidence the gate considered. */
  admissionEvidence?: string[];
};

export type ParcelEvidence = {
  parcelId?: string;
  planId?: string;
  plotId?: string;
  municipality?: string;
  raw: string;
  source: string;
};

export type AddressEvidence = {
  country?: string;
  city?: string;
  district?: string;
  street?: string;
  buildingNumber?: string;
  postalCode?: string;
  raw: string;
  source: string;
};

export type GeoEvidence = {
  explicitCoordinates: CoordinateEvidence[];
  parcels: ParcelEvidence[];
  addresses: AddressEvidence[];
};

export type GeocodeCandidate = {
  point: Point;
  label: string;
  score: number;
  source: string;
};

export type LocationResult =
  | {
      status: "resolved";
      path: "coordinates" | "geocoding";
      point: Point;
      geometry?: Geometry;
      coordinate?: CoordinateEvidence;
      candidates: GeocodeCandidate[];
      steps: string[];
    }
  | {
      status: "partial";
      candidates: GeocodeCandidate[];
      parcels: ParcelEvidence[];
      addresses: AddressEvidence[];
      steps: string[];
    }
  | {
      status: "failed";
      reason: string;
      steps: string[];
    };

export type PipelineResult = {
  document: {
    category: DocumentCategory;
    classificationConfidence: number;
  };
  extraction: {
    method: TextExtractionMethod;
    charCount: number;
  };
  evidence: GeoEvidence;
  location: LocationResult;
};
