import type { Geometry } from "@/lib/geo/contracts";
import { validateGeometry } from "@/lib/geo/geometry";
import type { TextExtractionMethod } from "@/lib/geo/contracts";
import type { ZoneLessUtmRow } from "@/lib/geo/evidence-extraction";
import type {
  AnalysisPath,
  AnalysisValidationCheck,
  ConfidenceAssessment,
  ConfidenceLevel,
  CrsConfidence,
  CountryDocumentAdapter,
  LandAnalysisStrategy,
  LandGeoEvidence,
  ResolveStatus,
} from "./contracts";

export interface StrategyInput {
  status: ResolveStatus;
  documentConfidence: number;
  extractionMethod: TextExtractionMethod;
  ocrUsed: boolean;
  ocrConfidence?: number;
  crsConfidence: CrsConfidence;
  evidence: LandGeoEvidence;
  geometry?: Geometry;
  geometryValid: boolean;
  adapter: CountryDocumentAdapter;
  sourceText: string;
  zoneLessRows: readonly ZoneLessUtmRow[];
  inferredUtmZone?: number;
  selectedUtmZone?: number;
  utmZoneSource?: "DOCUMENT" | "USER" | "OMAN_DEFAULT" | "COUNTRY_INFERENCE";
  crsSelectionRequired: boolean;
  candidatesCount: number;
  geocodingScore?: number;
}

function levelForScore(score: number): ConfidenceLevel {
  if (score >= 80) return "HIGH";
  if (score >= 60) return "MEDIUM";
  if (score >= 30) return "LOW";
  return "UNRESOLVED";
}

function assessment(score: number, reasons: string[]): ConfidenceAssessment {
  const normalized = Math.max(0, Math.min(100, Math.round(score)));
  return { level: levelForScore(normalized), score: normalized, reasons };
}

function extractDeclaredArea(text: string): number | undefined {
  const patterns = [
    /\bAREA\s*(?:=|:)?\s*([\d,.]+)\s*(?:SQ\.?\s*M\.?|M2|M²)(?![A-Za-z0-9])/gi,
    /(?:المساحه|المساحة)\s*(?:=|:)?\s*([\d,.]+)\s*(?:م2|م²|متر\s*مربع)?/g,
  ];
  const values: number[] = [];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const value = Number.parseFloat(match[1].replace(/,/g, ""));
      if (Number.isFinite(value) && value > 0 && value < 1_000_000_000) values.push(value);
    }
  }
  if (values.length === 0) return undefined;
  const frequencies = new Map<number, number>();
  for (const value of values) frequencies.set(value, (frequencies.get(value) ?? 0) + 1);
  return [...frequencies.entries()].sort((left, right) => right[1] - left[1] || left[0] - right[0])[0]?.[0];
}

function surveyArea(rows: readonly ZoneLessUtmRow[]): number | undefined {
  if (rows.length < 3) return undefined;
  let twiceArea = 0;
  for (let index = 0; index < rows.length; index += 1) {
    const next = rows[(index + 1) % rows.length];
    twiceArea += rows[index].easting * next.northing - next.easting * rows[index].northing;
  }
  const area = Math.abs(twiceArea) / 2;
  return Number.isFinite(area) && area > 0 ? area : undefined;
}

function sourcePolygonValidation(evidence: LandGeoEvidence, adapter: CountryDocumentAdapter) {
  const seen = new Set<string>();
  const points = evidence.coordinatePairs.filter((point) => {
    const key = `${point.lat.toFixed(9)},${point.lon.toFixed(9)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (points.length < 3) return undefined;
  return validateGeometry(
    { type: "polygon", coordinates: [...points, points[0]] },
    adapter.countryCode,
  );
}

function buildValidations(input: StrategyInput): AnalysisValidationCheck[] {
  const validations: AnalysisValidationCheck[] = [];
  const pointCount = input.evidence.coordinatePairs.length;
  validations.push({
    code: "COORDINATE_COUNT",
    status: pointCount >= 3 ? "PASS" : pointCount > 0 ? "WARNING" : "NOT_APPLICABLE",
    measured: pointCount,
    expected: 3,
    unit: "points",
  });

  const boundsPassed = pointCount > 0 && input.evidence.coordinatePairs.every((point) => input.adapter.isPlausiblePoint(point));
  validations.push({
    code: "COUNTRY_BOUNDS",
    status: pointCount === 0 ? "NOT_APPLICABLE" : boundsPassed ? "PASS" : "FAIL",
  });

  validations.push({
    code: "POLYGON_GEOMETRY",
    status: input.geometry?.type !== "polygon" ? (pointCount > 0 ? "WARNING" : "NOT_APPLICABLE") : input.geometryValid ? "PASS" : "FAIL",
  });

  const sourceValidation = sourcePolygonValidation(input.evidence, input.adapter);
  validations.push({
    code: "SOURCE_POINT_ORDER",
    status: !sourceValidation
      ? "NOT_APPLICABLE"
      : sourceValidation.valid
        ? "PASS"
        : sourceValidation.errors.includes("polygon is self-intersecting")
          ? "WARNING"
          : "FAIL",
  });

  if (input.zoneLessRows.length > 0) {
    const chainClosed = input.zoneLessRows.every((row, index) => {
      const next = input.zoneLessRows[(index + 1) % input.zoneLessRows.length];
      return row.lineEnd === next.lineStart;
    });
    validations.push({ code: "SURVEY_CLOSURE", status: chainClosed ? "PASS" : "WARNING" });
  } else {
    validations.push({ code: "SURVEY_CLOSURE", status: "NOT_APPLICABLE" });
  }

  const rowsWithDistance = input.zoneLessRows.filter((row) => row.distance !== undefined);
  if (rowsWithDistance.length === input.zoneLessRows.length && rowsWithDistance.length >= 3) {
    const deviations = input.zoneLessRows.map((row, index) => {
      const next = input.zoneLessRows[(index + 1) % input.zoneLessRows.length];
      const measured = Math.hypot(next.easting - row.easting, next.northing - row.northing);
      return Math.abs(measured - (row.distance as number));
    });
    const maxDeviation = Math.max(...deviations);
    validations.push({
      code: "SIDE_LENGTHS",
      status: maxDeviation <= 0.25 ? "PASS" : maxDeviation <= 1 ? "WARNING" : "FAIL",
      deviation: maxDeviation,
      unit: "m",
    });
  } else {
    validations.push({ code: "SIDE_LENGTHS", status: "NOT_APPLICABLE" });
  }

  const declaredArea = extractDeclaredArea(input.sourceText);
  const measuredArea = surveyArea(input.zoneLessRows);
  if (declaredArea && measuredArea) {
    const deviationPercent = Math.abs(measuredArea - declaredArea) / declaredArea * 100;
    validations.push({
      code: "REGISTERED_AREA_MATCH",
      status: deviationPercent <= 1 ? "PASS" : deviationPercent <= 5 ? "WARNING" : "FAIL",
      measured: measuredArea,
      expected: declaredArea,
      deviation: deviationPercent,
      unit: "percent",
    });
  } else {
    validations.push({ code: "REGISTERED_AREA_MATCH", status: "NOT_APPLICABLE" });
  }

  return validations;
}

function determinePath(input: StrategyInput): AnalysisPath {
  if (input.status === "INVALID_DOCUMENT" || input.status === "NOT_LAND_DOCUMENT") return "INVALID_DOCUMENT";
  if (input.crsSelectionRequired) return "UTM_ZONE_SELECTION_REQUIRED";
  if (input.evidence.coordinatePairs.length > 0) {
    if (input.utmZoneSource === "USER") return "USER_SELECTED_UTM_ZONE";
    // Oman Zone 40 is an explicit product default for Omani cadastral drawings,
    // not a country-bounds guess and therefore not a review-only inferred path.
    if (input.utmZoneSource === "OMAN_DEFAULT") return "EXPLICIT_UTM";
    if (input.inferredUtmZone !== undefined) return "INFERRED_UTM_ZONE";
    if (input.crsConfidence === "UNKNOWN" || input.crsConfidence === "AMBIGUOUS") return "COORDINATES_CRS_REVIEW";
    if (input.evidence.explicitCoordinates.some((item) => item.crsHint === "utm")) return "EXPLICIT_UTM";
    return "EXPLICIT_WGS84";
  }
  if (input.status === "RESOLVED_GEOCODED" || input.status === "NEEDS_USER_CONFIRMATION") return "ADDRESS_APPROXIMATION";
  if (input.evidence.parcels.length > 0) return "CADASTRAL_LOOKUP_REQUIRED";
  if (input.evidence.addresses.length > 0) return "ADDRESS_APPROXIMATION";
  return "UNRESOLVED";
}

export function buildLandAnalysisStrategy(input: StrategyInput): LandAnalysisStrategy {
  const validations = buildValidations(input);
  const path = determinePath(input);
  const ocrCorrected = input.zoneLessRows.some((row) => row.ocrCorrected);
  const boundsFailed = validations.some((item) => item.code === "COUNTRY_BOUNDS" && item.status === "FAIL");
  const sideCheck = validations.find((item) => item.code === "SIDE_LENGTHS");
  const areaCheck = validations.find((item) => item.code === "REGISTERED_AREA_MATCH");

  const extractionScore = Math.max(0, Math.min(100, input.ocrUsed
    ? input.ocrConfidence ?? 70
    : input.extractionMethod === "native_text"
      ? 96
      : input.extractionMethod === "vision"
        ? 75
        : 0));
  const crsScore = input.crsSelectionRequired
    ? 0
    : input.utmZoneSource === "USER"
      ? 90
      : input.utmZoneSource === "OMAN_DEFAULT"
        ? 90
      : input.inferredUtmZone !== undefined
        ? 82
        : input.crsConfidence === "DETECTED"
          ? 96
          : input.crsConfidence === "PROBABLE"
            ? 75
            : input.crsConfidence === "AMBIGUOUS"
              ? 45
              : 0;

  let locationScore = 0;
  if (input.evidence.coordinatePairs.length > 0) {
    locationScore = crsScore;
    if (boundsFailed) locationScore = Math.min(locationScore, 20);
    if (ocrCorrected) locationScore -= 6;
    if (input.ocrUsed && extractionScore < 60) locationScore -= 12;
  } else if (path === "ADDRESS_APPROXIMATION" && input.candidatesCount > 0) {
    locationScore = Math.min(79, Math.round((input.geocodingScore ?? 0.5) * 100));
  }

  let boundaryScore = 0;
  if (input.geometry?.type === "polygon" && input.geometryValid) {
    boundaryScore = input.evidence.coordinatePairs.length >= 4 ? 88 : 76;
    if (sideCheck?.status === "PASS") boundaryScore += 4;
    if (areaCheck?.status === "PASS") boundaryScore += 4;
    if (sideCheck?.status === "FAIL") boundaryScore -= 25;
    if (areaCheck?.status === "FAIL") boundaryScore -= 25;
    if (ocrCorrected) boundaryScore -= 6;
  }

  const reviewReasons: string[] = [];
  if (path === "UTM_ZONE_SELECTION_REQUIRED") reviewReasons.push("UTM_ZONE_REQUIRED");
  if (path === "INFERRED_UTM_ZONE") reviewReasons.push("UTM_ZONE_INFERRED");
  if (path === "COORDINATES_CRS_REVIEW") reviewReasons.push("CRS_NOT_CONFIRMED");
  if (path === "ADDRESS_APPROXIMATION") reviewReasons.push("ADDRESS_IS_APPROXIMATE");
  if (path === "CADASTRAL_LOOKUP_REQUIRED") reviewReasons.push("OFFICIAL_CADASTRAL_LOOKUP_REQUIRED");
  if (ocrCorrected) reviewReasons.push("OCR_DIGITS_CORRECTED");
  if (validations.some((item) => item.status === "FAIL")) reviewReasons.push("VALIDATION_FAILED");
  if (validations.some((item) => item.status === "WARNING")) reviewReasons.push("VALIDATION_WARNING");

  const hasDeclaredArea = extractDeclaredArea(input.sourceText) !== undefined;
  const hasSideLengths = input.zoneLessRows.some((row) => row.distance !== undefined);
  const evidence = [
    { code: "DOCUMENT_CLASSIFICATION" as const, status: input.documentConfidence >= 0.35 ? "FOUND" as const : "MISSING" as const, confidence: Math.round(input.documentConfidence * 100) },
    { code: "TEXT_EXTRACTION" as const, status: input.extractionMethod === "none" ? "MISSING" as const : "FOUND" as const, confidence: Math.round(extractionScore) },
    { code: "COORDINATE_TABLE" as const, status: input.evidence.coordinatePairs.length > 0 || input.zoneLessRows.length > 0 ? "FOUND" as const : "MISSING" as const, confidence: input.evidence.coordinatePairs.length > 0 || input.zoneLessRows.length > 0 ? Math.min(100, 55 + Math.max(input.evidence.coordinatePairs.length, input.zoneLessRows.length) * 10) : 0, count: Math.max(input.evidence.coordinatePairs.length, input.zoneLessRows.length) },
    { code: "COORDINATE_REFERENCE_SYSTEM" as const, status: input.inferredUtmZone !== undefined ? "INFERRED" as const : crsScore > 0 ? "FOUND" as const : "MISSING" as const, confidence: crsScore },
    { code: "REGISTERED_AREA" as const, status: hasDeclaredArea ? "FOUND" as const : "MISSING" as const, confidence: hasDeclaredArea ? extractionScore : 0 },
    { code: "SURVEY_SIDE_LENGTHS" as const, status: hasSideLengths ? "FOUND" as const : "MISSING" as const, confidence: hasSideLengths ? extractionScore : 0, count: input.zoneLessRows.filter((row) => row.distance !== undefined).length },
    { code: "PARCEL_IDENTIFIERS" as const, status: input.evidence.parcels.length > 0 ? "FOUND" as const : "MISSING" as const, confidence: input.evidence.parcels.length > 0 ? extractionScore : 0, count: input.evidence.parcels.length },
    { code: "ADDRESS" as const, status: input.evidence.addresses.length > 0 ? "FOUND" as const : "MISSING" as const, confidence: input.evidence.addresses.length > 0 ? extractionScore : 0, count: input.evidence.addresses.length },
    { code: "OCR_CORRECTIONS" as const, status: ocrCorrected ? "CORRECTED" as const : "MISSING" as const, confidence: ocrCorrected ? extractionScore : 0 },
  ];

  return {
    version: 1,
    path,
    requiresReview: reviewReasons.length > 0,
    reviewReasons: [...new Set(reviewReasons)],
    evidence,
    validations,
    confidence: {
      document: assessment(input.documentConfidence * 100, ["DOCUMENT_KEYWORDS_AND_LAYOUT"]),
      extraction: assessment(extractionScore, [input.ocrUsed ? "OCR_TEXT" : "NATIVE_TEXT"]),
      crs: assessment(crsScore, [input.crsSelectionRequired
        ? "USER_SELECTION_REQUIRED"
        : input.utmZoneSource === "USER"
          ? "USER_CONFIRMED"
          : input.utmZoneSource === "OMAN_DEFAULT"
            ? "OMAN_CADASTRAL_DEFAULT_ZONE_40N"
            : input.inferredUtmZone !== undefined
              ? "UNIQUE_COUNTRY_BOUNDS_MATCH"
              : input.crsConfidence]),
      location: assessment(locationScore, [path, boundsFailed ? "OUTSIDE_COUNTRY_BOUNDS" : "COUNTRY_BOUNDS_CHECKED"]),
      boundary: assessment(boundaryScore, [input.geometry?.type === "polygon" && input.geometryValid ? "VALID_POLYGON" : "NO_VALID_POLYGON"]),
    },
  };
}
