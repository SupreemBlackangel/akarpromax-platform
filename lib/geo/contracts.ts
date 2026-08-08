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

export type CoordinateEvidence = {
  format: CoordinateFormat;
  raw: string;
  crs?: CrsKind;
  point?: Point;
  source: string;
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
