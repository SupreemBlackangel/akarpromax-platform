import {
  GeoEvidence,
  LocationResult,
  PipelineResult,
  TextExtractionMethod,
} from "./contracts";
import { checkDocumentSecurity, checkRelevanceGate, UploadMetadata } from "./security-gate";
import { classifyDocument } from "./classification";
import { extractText } from "./text-extraction";
import { extractGeoEvidence } from "./evidence-extraction";
import { detectCrs, toWgs84 } from "./crs";
import { validateGeometry } from "./geometry";
import { geocodeAddress, selectBestCandidate } from "./geocoding";

export interface PipelineInput {
  readonly metadata: UploadMetadata;
  readonly ocrText?: string;
  readonly visionText?: string;
  readonly countryCode?: string;
}

export interface PipelineGate {
  securityPassed: boolean;
  securityReason?: string;
  relevancePassed: boolean;
  relevanceScore: number;
}

export function runSecurityAndRelevanceGate(input: PipelineInput): PipelineGate {
  const security = checkDocumentSecurity(input.metadata);
  const relevance = input.metadata.nativeText
    ? checkRelevanceGate(input.metadata.nativeText)
    : { passed: true, score: 0 };

  return {
    securityPassed: security.passed,
    securityReason: security.reason,
    relevancePassed: relevance.passed,
    relevanceScore: relevance.score,
  };
}

export function resolveLocation(
  evidence: GeoEvidence,
  countryCode?: string,
): LocationResult {
  const steps: string[] = [];

  if (evidence.explicitCoordinates.length > 0) {
    steps.push("explicit coordinates found");

    const coordinate = evidence.explicitCoordinates[0];
    const crs = detectCrs({ format: coordinate.format, raw: coordinate.raw });
    steps.push(`crs detected: ${crs.kind} (${crs.reason})`);

    let point = coordinate.point;
    if (crs.kind === "utm" || coordinate.format === "utm") {
      const converted = toWgs84({ format: coordinate.format, raw: coordinate.raw, crs: "utm" });
      if (converted) {
        point = converted.point;
        steps.push("utm -> wgs84 conversion");
      }
    }

    if (!point) {
      const converted = toWgs84({ format: coordinate.format, raw: coordinate.raw });
      if (converted) {
        point = converted.point;
        steps.push("coordinate parsed to wgs84");
      }
    }

    if (!point) {
      return {
        status: "failed",
        reason: "coordinate parse failed",
        steps: [...steps, "geometry validation failed"],
      };
    }

    const validation = validateGeometry({ type: "point", coordinates: point }, countryCode);
    steps.push(validation.valid ? "geometry validated" : "geometry validation failed");

    if (!validation.valid) {
      return {
        status: "failed",
        reason: validation.errors.join("; "),
        steps,
      };
    }

    return {
      status: "resolved",
      path: "coordinates",
      point,
      coordinate,
      candidates: [],
      steps,
    };
  }

  if (evidence.parcels.length > 0 || evidence.addresses.length > 0) {
    steps.push("parcel/plan/address evidence found");

    const candidates = geocodeAddress({ addresses: evidence.addresses, parcels: evidence.parcels });
    steps.push(`geocoding produced ${candidates.length} candidates`);

    if (candidates.length === 0) {
      return {
        status: "failed",
        reason: "no geocoding candidates",
        steps,
      };
    }

    const best = selectBestCandidate(candidates);
    steps.push(`best candidate: ${best?.label ?? "none"}`);

    if (best && best.point.lat !== 0 && best.point.lon !== 0) {
      return {
        status: "resolved",
        path: "geocoding",
        point: best.point,
        candidates,
        steps,
      };
    }

    return {
      status: "partial",
      candidates,
      parcels: evidence.parcels,
      addresses: evidence.addresses,
      steps,
    };
  }

  return {
    status: "failed",
    reason: "no geo evidence found",
    steps: ["no geo evidence found"],
  };
}

export function runPipeline(input: PipelineInput): {
  gate: PipelineGate;
  result: PipelineResult | null;
} {
  const gate = runSecurityAndRelevanceGate(input);

  if (!gate.securityPassed) {
    return {
      gate,
      result: {
        document: { category: "other", classificationConfidence: 0 },
        extraction: { method: "none", charCount: 0 },
        evidence: { explicitCoordinates: [], parcels: [], addresses: [] },
        location: { status: "failed", reason: `security gate: ${gate.securityReason}`, steps: [] },
      },
    };
  }

  const classification = classifyDocument(input.metadata.nativeText ?? input.ocrText ?? "");
  const extraction = extractText({
    nativeText: input.metadata.nativeText,
    ocrText: input.ocrText,
    visionText: input.visionText,
  });

  let evidence: GeoEvidence = { explicitCoordinates: [], parcels: [], addresses: [] };
  if (extraction.text.length > 0) {
    evidence = extractGeoEvidence(extraction.text);
  }

  const location = resolveLocation(evidence, input.countryCode);

  return {
    gate,
    result: {
      document: {
        category: classification.category,
        classificationConfidence: classification.confidence,
      },
      extraction: {
        method: extraction.method as TextExtractionMethod,
        charCount: extraction.charCount,
      },
      evidence,
      location,
    },
  };
}
