import { ConfidenceLevel, CrsConfidence, LandGeoEvidence } from "./contracts";

export interface ConfidenceInput {
  evidence: LandGeoEvidence;
  crsConfidence: CrsConfidence;
  geometryType?: "point" | "polygon";
  geometryValid: boolean;
  geocodingScore?: number;
  candidatesCount: number;
}

export function computeLocationConfidence(input: ConfidenceInput): ConfidenceLevel {
  const { evidence, crsConfidence, geocodingScore, candidatesCount } = input;

  if (candidatesCount > 0 && geocodingScore !== undefined) {
    if (geocodingScore >= 0.8 && candidatesCount === 1) return "HIGH";
    if (geocodingScore >= 0.6) return "MEDIUM";
    return "LOW";
  }

  if (evidence.explicitCoordinates.length === 0) {
    if (evidence.addresses.length > 0 || evidence.parcels.length > 0) return "LOW";
    return "UNRESOLVED";
  }

  if (crsConfidence === "UNKNOWN") return "LOW";
  return "HIGH";
}

export function computeBoundaryConfidence(input: ConfidenceInput): ConfidenceLevel {
  const { evidence, crsConfidence, geometryType, geometryValid } = input;
  const pointCount = evidence.coordinatePairs.length;

  if (geometryType !== "polygon") {
    return "UNRESOLVED";
  }

  if (!geometryValid) return "LOW";

  if (pointCount >= 4 && crsConfidence === "DETECTED") return "HIGH";
  if (pointCount >= 4 && crsConfidence !== "UNKNOWN") return "MEDIUM";
  if (pointCount >= 3) return "MEDIUM";
  return "LOW";
}

export function confidenceLabel(level: ConfidenceLevel): { label: string; score: number } {
  switch (level) {
    case "HIGH":
      return { label: "high", score: 3 };
    case "MEDIUM":
      return { label: "medium", score: 2 };
    case "LOW":
      return { label: "low", score: 1 };
    case "UNRESOLVED":
    default:
      return { label: "unresolved", score: 0 };
  }
}
