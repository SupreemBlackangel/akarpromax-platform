import {
  AdapterHints,
  ConfidenceLevel,
  CountryDocumentAdapter,
  CRSDetector,
  CoordinateEvidenceDetail,
  GeocodingProvider,
  LandDocumentClassifier,
  LandGeoEvidence,
  LandLocationResult,
  ResolveStatus,
} from "./contracts";
import type { TextExtractionMethod } from "@/lib/geo/contracts";
import { checkDocumentSecurity, checkRelevanceGate, UploadMetadata } from "@/lib/geo/security-gate";
import { extractText } from "@/lib/geo/text-extraction";
import { extractGeoEvidence } from "@/lib/geo/evidence-extraction";
import { validateGeometry } from "@/lib/geo/geometry";
import { LAND_CLASSIFIER } from "./classifier";
import { DEFAULT_ADAPTER, adapterForCountry } from "./adapters";
import { LAND_CRS_DETECTOR, toWgs84Point } from "./crs-detector";
import { protectCoordinateOrder } from "./coordinate-protection";
import { buildLandGeometry } from "./geometry-builder";
import { computeBoundaryConfidence, computeLocationConfidence } from "./confidence";
import { DEFAULT_GEOCODING_PROVIDER, bestCandidate } from "./geocoding-provider";

export interface ResolveInput {
  metadata: UploadMetadata;
  ocrText?: string;
  visionText?: string;
  countryCode?: string;
  classifier?: LandDocumentClassifier;
  adapter?: CountryDocumentAdapter;
  crsDetector?: CRSDetector;
  geocodingProvider?: GeocodingProvider;
}

export interface ResolveDeps {
  classifier: LandDocumentClassifier;
  adapter: CountryDocumentAdapter;
  crsDetector: CRSDetector;
  geocodingProvider: GeocodingProvider;
}

export function resolveDeps(input: ResolveInput): ResolveDeps {
  return {
    classifier: input.classifier ?? LAND_CLASSIFIER,
    adapter: input.adapter ?? adapterForCountry(input.countryCode) ?? DEFAULT_ADAPTER,
    crsDetector: input.crsDetector ?? LAND_CRS_DETECTOR,
    geocodingProvider: input.geocodingProvider ?? DEFAULT_GEOCODING_PROVIDER,
  };
}

export function buildLandGeoEvidence(
  explicitCoordinates: CoordinateEvidenceDetail[],
  hints: AdapterHints,
): LandGeoEvidence {
  return {
    explicitCoordinates,
    coordinatePairs: explicitCoordinates
      .filter((c) => c.parsedLat !== undefined && c.parsedLon !== undefined)
      .map((c) => ({ lat: c.parsedLat as number, lon: c.parsedLon as number })),
    parcels: hints.parcels,
    addresses: hints.addresses,
    country: hints.country,
    region: hints.region,
    city: hints.city,
    district: hints.district,
    street: hints.street,
    landmarks: hints.landmarks,
    sourceReferences: hints.sourceReferences,
  };
}

export function extractParcelIdentifiers(
  hints: AdapterHints,
  geo: ReturnType<typeof extractGeoEvidence>,
): { parcelId?: string; planId?: string; plotId?: string } | undefined {
  const parcelId = hints.parcels.find((p) => p.parcelId)?.parcelId ?? geo.parcels.find((p) => p.parcelId)?.parcelId;
  const planId = hints.parcels.find((p) => p.planId)?.planId ?? geo.parcels.find((p) => p.planId)?.planId;
  const plotId = hints.parcels.find((p) => p.plotId)?.plotId ?? geo.parcels.find((p) => p.plotId)?.plotId;
  if (!parcelId && !planId && !plotId) return undefined;
  return { parcelId, planId, plotId };
}

function emptyEvidence(): LandGeoEvidence {
  return {
    explicitCoordinates: [],
    coordinatePairs: [],
    parcels: [],
    addresses: [],
    landmarks: [],
    sourceReferences: [],
  };
}

export async function resolveLandDocument(input: ResolveInput): Promise<LandLocationResult> {
  const deps = resolveDeps(input);
  const steps: string[] = [];
  const warnings: string[] = [];

  steps.push("security gate");
  const security = checkDocumentSecurity(input.metadata);
  if (!security.passed) {
    steps.push(`security gate failed: ${security.reason}`);
    return {
      status: "INVALID_DOCUMENT",
      locationConfidence: "UNRESOLVED",
      boundaryConfidence: "UNRESOLVED",
      crsConfidence: "UNKNOWN",
      evidence: emptyEvidence(),
      candidates: [],
      warnings: [security.reason ?? "SECURITY_REJECTED"],
      document: { category: "UNKNOWN_LAND_DOCUMENT", classificationConfidence: 0 },
      extraction: { method: "none", charCount: 0, ocrUsed: false, aiUsed: false, geocodingUsed: false },
      steps,
    };
  }

  steps.push("text extraction");
  const extraction = extractText({
    nativeText: input.metadata.nativeText,
    ocrText: input.ocrText,
    visionText: input.visionText,
  });
  const text = extraction.text;
  const method = extraction.method as TextExtractionMethod;
  const ocrUsed = method === "ocr";

  if (text.length === 0) {
    steps.push("no extractable text");
    return {
      status: "INVALID_DOCUMENT",
      locationConfidence: "UNRESOLVED",
      boundaryConfidence: "UNRESOLVED",
      crsConfidence: "UNKNOWN",
      evidence: emptyEvidence(),
      candidates: [],
      warnings: ["no text extracted; OCR may be required for scanned documents"],
      document: { category: "UNKNOWN_LAND_DOCUMENT", classificationConfidence: 0 },
      extraction: { method, charCount: 0, ocrUsed, aiUsed: false, geocodingUsed: false },
      steps,
    };
  }

  steps.push("relevance gate");
  const relevance = checkRelevanceGate(text, 2);
  const classification = deps.classifier.classify(text);
  const isLandLike =
    relevance.passed ||
    classification.category !== "UNKNOWN_LAND_DOCUMENT" ||
    deps.adapter.relevanceScore(text) >= 2;

  if (!isLandLike) {
    steps.push("document is not land-related");
    return {
      status: "NOT_LAND_DOCUMENT",
      locationConfidence: "UNRESOLVED",
      boundaryConfidence: "UNRESOLVED",
      crsConfidence: "UNKNOWN",
      evidence: emptyEvidence(),
      candidates: [],
      warnings: ["document does not appear to be a land/property document"],
      document: { category: classification.category, classificationConfidence: classification.confidence },
      extraction: { method, charCount: extraction.charCount, ocrUsed, aiUsed: false, geocodingUsed: false },
      steps,
    };
  }

  steps.push("adapter hints");
  const hints = deps.adapter.extractHints(text);

  steps.push("deterministic evidence extraction");
  const geoEvidence = extractGeoEvidence(text);
  const coordinateEvidence = geoEvidence.explicitCoordinates;

  const coordinateDetails: CoordinateEvidenceDetail[] = coordinateEvidence.map((ce) => ({
    source: ce.source,
    text: ce.raw,
    raw: ce.raw,
    orderConfidence: 1,
    crsHint: ce.crs,
  }));

  steps.push("crs detection");
  const crs = deps.crsDetector.detect(text, coordinateDetails);
  steps.push(`crs=${crs.kind} confidence=${crs.confidence}`);

  for (const ce of coordinateEvidence) {
    const converted = toWgs84Point(ce.raw, ce.format, crs.kind, crs.zone, crs.northernHemisphere);
    if (!converted) continue;
    const protectedPoint = protectCoordinateOrder(converted, deps.adapter);
    warnings.push(...protectedPoint.warnings);
    if (protectedPoint.orderConfidence === 0) continue;
    coordinateDetails.push({
      source: "text",
      text: ce.raw,
      raw: ce.raw,
      parsedLat: protectedPoint.point.lat,
      parsedLon: protectedPoint.point.lon,
      orderConfidence: protectedPoint.orderConfidence,
      crsHint: ce.crs ?? crs.kind,
    });
  }

  const evidence = buildLandGeoEvidence(coordinateDetails, hints);
  const geometryResult = buildLandGeometry(evidence.coordinatePairs, deps.adapter);
  warnings.push(...geometryResult.warnings);

  const crsConfidence = crs.confidence;
  let candidates: import("@/lib/geo/contracts").GeocodeCandidate[] = [];
  let status: ResolveStatus;
  let locationConfidence: ConfidenceLevel;
  let boundaryConfidence: ConfidenceLevel;
  let center = geometryResult.center ?? null;
  let resolvedAddress: string | undefined;
  let geocodingUsed = false;

  if (evidence.coordinatePairs.length > 0) {
    steps.push(`explicit coordinates resolved (${evidence.coordinatePairs.length})`);
    const geometryValid = geometryResult.geometry
      ? validateGeometry(geometryResult.geometry, deps.adapter.countryCode).valid
      : false;

    if (crsConfidence === "UNKNOWN") {
      status = "PARTIALLY_RESOLVED";
      steps.push("explicit coords but CRS unknown -> partially resolved");
    } else {
      status = "RESOLVED_EXPLICIT_COORDINATES";
    }

    locationConfidence = computeLocationConfidence({
      evidence,
      crsConfidence,
      geometryType: geometryResult.geometry?.type === "linestring" ? undefined : geometryResult.geometry?.type,
      geometryValid,
      candidatesCount: 0,
    });
    boundaryConfidence = computeBoundaryConfidence({
      evidence,
      crsConfidence,
      geometryType: geometryResult.geometry?.type === "linestring" ? undefined : geometryResult.geometry?.type,
      geometryValid,
      candidatesCount: 0,
    });

    return {
      status,
      center: center ?? evidence.coordinatePairs[0],
      geometry: geometryResult.geometry,
      locationConfidence,
      boundaryConfidence,
      crsConfidence,
      resolvedAddress,
      parcelIdentifiers: extractParcelIdentifiers(hints, geoEvidence),
      evidence,
      candidates,
      warnings,
      document: { category: classification.category, classificationConfidence: classification.confidence },
      extraction: { method, charCount: extraction.charCount, ocrUsed, aiUsed: false, geocodingUsed },
      steps,
    };
  }

  steps.push("no explicit coordinates -> geocoding path");
  geocodingUsed = true;
  candidates = await deps.geocodingProvider.searchCandidates(evidence);
  steps.push(`geocoding candidates: ${candidates.length}`);

  const best = await bestCandidate(candidates);
  const parcelCount = hints.parcels.length + geoEvidence.parcels.length;

  if (best && best.point.lat !== 0 && best.point.lon !== 0) {
    const protectedPoint = protectCoordinateOrder(best.point, deps.adapter);
    if (protectedPoint.orderConfidence > 0) {
      center = protectedPoint.point;
      resolvedAddress = best.label;
      const bestScore = best.score ?? 0;
      if (bestScore >= 0.8) {
        status = "RESOLVED_GEOCODED";
        locationConfidence = "HIGH";
      } else if (candidates.length > 1) {
        status = "NEEDS_USER_CONFIRMATION";
        locationConfidence = "MEDIUM";
      } else {
        status = "RESOLVED_GEOCODED";
        locationConfidence = "MEDIUM";
      }
      boundaryConfidence = "UNRESOLVED";
    } else {
      status = "UNRESOLVED";
      locationConfidence = "UNRESOLVED";
      boundaryConfidence = "UNRESOLVED";
    }
  } else if (parcelCount > 0) {
    status = "PARTIALLY_RESOLVED";
    locationConfidence = "LOW";
    boundaryConfidence = "UNRESOLVED";
    warnings.push("parcel/plan identifiers present but no resolvable coordinates");
  } else {
    status = "UNRESOLVED";
    locationConfidence = "UNRESOLVED";
    boundaryConfidence = "UNRESOLVED";
    warnings.push("no resolvable geographic evidence found");
  }

  return {
    status,
    center: center ?? undefined,
    geometry: undefined,
    locationConfidence,
    boundaryConfidence,
    crsConfidence,
    resolvedAddress,
    parcelIdentifiers: extractParcelIdentifiers(hints, geoEvidence),
    evidence,
    candidates,
    warnings,
    document: { category: classification.category, classificationConfidence: classification.confidence },
    extraction: { method, charCount: extraction.charCount, ocrUsed, aiUsed: false, geocodingUsed },
    steps,
  };
}
