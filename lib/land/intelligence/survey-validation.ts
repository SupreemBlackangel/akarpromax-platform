/**
 * Cross-validation of a reconstructed parcel against the document's own
 * independent measurements.
 *
 * A survey document normally states three things about the same parcel:
 * the corner coordinates, the length of each boundary edge, and the total
 * area. Those are three independent statements of one geometry. Reading the
 * coordinates and drawing a polygon proves nothing on its own — a misread
 * digit, a swapped column or a wrong UTM zone all still produce a polygon.
 * Checking the polygon back against the printed edge lengths and the
 * registered area is what turns "these numbers parsed" into "this is the
 * parcel the document describes".
 *
 * Measurement is done on a local tangent plane (see boundary/local-plane),
 * which is distortion-free at parcel scale, so a disagreement here is a real
 * disagreement and not a projection artefact.
 *
 * This module never modifies coordinates and never rejects them. It reports.
 * The confidence layer decides what to do with the report.
 */
import type { Point } from "@/lib/geo/contracts";
import { buildLocalPlane, planeArea, planeDistance, type PlaneCoordinate } from "@/lib/land/boundary/local-plane";

export type CheckStatus = "MATCH" | "NEAR" | "MISMATCH" | "UNVERIFIED";

/**
 * Tolerances.
 *
 * Survey sheets print edge lengths rounded to a centimetre or two, and areas
 * to the whole metre, so an exact match is not expected. These bands accept
 * ordinary rounding and reject a genuinely different geometry.
 */
export const DISTANCE_MATCH_METERS = 0.1;
export const DISTANCE_MATCH_PERCENT = 0.5;
export const DISTANCE_NEAR_METERS = 0.5;
export const DISTANCE_NEAR_PERCENT = 2;

export const AREA_MATCH_SQM = 1;
export const AREA_MATCH_PERCENT = 1;
export const AREA_NEAR_PERCENT = 3;

export interface EdgeDistanceCheck {
  from: string;
  to: string;
  /** Edge length as printed in the document, in metres. */
  documentMeters: number;
  /** Edge length computed from the extracted coordinates, in metres. */
  calculatedMeters: number;
  deltaMeters: number;
  deltaPercent: number;
  status: CheckStatus;
}

export interface AreaCheck {
  /** Area as stated in the document, in square metres, when it states one. */
  documentSqm?: number;
  /** Area computed from the reconstructed ring, in square metres. */
  calculatedSqm: number;
  deltaSqm?: number;
  deltaPercent?: number;
  status: CheckStatus;
}

export type SurveyAgreement = "AGREE" | "PARTIAL" | "DISAGREE" | "UNVERIFIED";

export interface SurveyCrossValidation {
  edges: EdgeDistanceCheck[];
  area: AreaCheck;
  edgesChecked: number;
  edgesMatched: number;
  edgesMismatched: number;
  /**
   * AGREE      coordinates, edge lengths and area all describe one parcel
   * PARTIAL    agreement is close but outside the match band, or only some
   *            edges could be checked
   * DISAGREE   at least one independent measurement contradicts the geometry
   * UNVERIFIED the document states nothing to check against
   */
  agreement: SurveyAgreement;
  warnings: string[];
}

export interface SurveyCrossValidationInput {
  /** Corner label to WGS84 position. */
  points: ReadonlyMap<string, Point>;
  /** Corner labels in boundary order, as established by the document. */
  sequence: readonly string[];
  /** Edge lengths as printed, in boundary order. */
  distances?: readonly { from: string; to: string; meters: number }[];
  /** Registered area in square metres, when the document states one. */
  statedAreaSqm?: number;
}

function percentDelta(documentValue: number, calculated: number): number {
  if (!Number.isFinite(documentValue) || documentValue === 0) return Number.POSITIVE_INFINITY;
  return Math.abs(calculated - documentValue) / Math.abs(documentValue) * 100;
}

function distanceStatus(documentMeters: number, calculatedMeters: number): CheckStatus {
  const delta = Math.abs(calculatedMeters - documentMeters);
  const pct = percentDelta(documentMeters, calculatedMeters);
  if (delta <= DISTANCE_MATCH_METERS || pct <= DISTANCE_MATCH_PERCENT) return "MATCH";
  if (delta <= DISTANCE_NEAR_METERS || pct <= DISTANCE_NEAR_PERCENT) return "NEAR";
  return "MISMATCH";
}

function areaStatus(documentSqm: number, calculatedSqm: number): CheckStatus {
  const delta = Math.abs(calculatedSqm - documentSqm);
  const pct = percentDelta(documentSqm, calculatedSqm);
  if (delta <= AREA_MATCH_SQM || pct <= AREA_MATCH_PERCENT) return "MATCH";
  if (pct <= AREA_NEAR_PERCENT) return "NEAR";
  return "MISMATCH";
}

/** The ring, de-duplicated: a repeated closing corner is not a new vertex. */
export function ringFromSequence(
  points: ReadonlyMap<string, Point>,
  sequence: readonly string[],
): Point[] {
  const ring: Point[] = [];
  const seen = new Set<string>();
  for (const label of sequence) {
    if (seen.has(label)) continue;
    const point = points.get(label);
    if (!point) continue;
    seen.add(label);
    ring.push(point);
  }
  return ring;
}

/**
 * Compares every printed edge length against the same edge measured on the
 * reconstructed geometry.
 */
export function validateEdgeDistances(
  points: ReadonlyMap<string, Point>,
  distances: readonly { from: string; to: string; meters: number }[],
  plane?: { origin: Point; byLabel: ReadonlyMap<string, PlaneCoordinate> },
): EdgeDistanceCheck[] {
  const checks: EdgeDistanceCheck[] = [];
  for (const edge of distances) {
    if (!Number.isFinite(edge.meters) || edge.meters <= 0) continue;
    const from = points.get(edge.from);
    const to = points.get(edge.to);
    if (!from || !to) continue;

    let calculated: number | null = null;
    if (plane) {
      const a = plane.byLabel.get(edge.from);
      const b = plane.byLabel.get(edge.to);
      if (a && b) calculated = planeDistance(a, b);
    }
    if (calculated === null) {
      const local = buildLocalPlane([from, to]);
      if (!local) continue;
      calculated = planeDistance(local.coordinates[0], local.coordinates[1]);
    }

    checks.push({
      from: edge.from,
      to: edge.to,
      documentMeters: edge.meters,
      calculatedMeters: calculated,
      deltaMeters: Math.abs(calculated - edge.meters),
      deltaPercent: percentDelta(edge.meters, calculated),
      status: distanceStatus(edge.meters, calculated),
    });
  }
  return checks;
}

/** Compares the registered area against the area of the reconstructed ring. */
export function validateArea(ring: readonly Point[], statedAreaSqm?: number): AreaCheck {
  if (ring.length < 3) {
    return { documentSqm: statedAreaSqm, calculatedSqm: 0, status: "UNVERIFIED" };
  }
  const plane = buildLocalPlane(ring);
  if (!plane) {
    return { documentSqm: statedAreaSqm, calculatedSqm: 0, status: "UNVERIFIED" };
  }
  const calculatedSqm = planeArea(plane.coordinates);
  if (statedAreaSqm === undefined || !Number.isFinite(statedAreaSqm) || statedAreaSqm <= 0) {
    return { calculatedSqm, status: "UNVERIFIED" };
  }
  return {
    documentSqm: statedAreaSqm,
    calculatedSqm,
    deltaSqm: Math.abs(calculatedSqm - statedAreaSqm),
    deltaPercent: percentDelta(statedAreaSqm, calculatedSqm),
    status: areaStatus(statedAreaSqm, calculatedSqm),
  };
}

/**
 * Runs both checks and reduces them to a single agreement verdict.
 *
 * The verdict is deliberately conservative: one contradicted measurement is
 * enough to withhold agreement, because a parcel that is drawn in the wrong
 * place with high confidence is worse than one marked for review.
 */
export function crossValidateSurvey(input: SurveyCrossValidationInput): SurveyCrossValidation {
  const warnings: string[] = [];
  const ring = ringFromSequence(input.points, input.sequence);

  let plane: { origin: Point; byLabel: ReadonlyMap<string, PlaneCoordinate> } | undefined;
  const labels = [...new Set(input.sequence)].filter((label) => input.points.has(label));
  const ordered = labels.map((label) => input.points.get(label) as Point);
  if (ordered.length >= 2) {
    const built = buildLocalPlane(ordered);
    if (built) {
      const byLabel = new Map<string, PlaneCoordinate>();
      labels.forEach((label, index) => byLabel.set(label, built.coordinates[index]));
      plane = { origin: built.origin, byLabel };
      if (!built.withinSafeExtent) {
        warnings.push("parcel extent is too large for a single distortion-free plane; measurements are approximate");
      }
    }
  }

  const edges = input.distances?.length
    ? validateEdgeDistances(input.points, input.distances, plane)
    : [];
  const area = validateArea(ring, input.statedAreaSqm);

  const edgesChecked = edges.length;
  const edgesMatched = edges.filter((edge) => edge.status === "MATCH").length;
  const edgesMismatched = edges.filter((edge) => edge.status === "MISMATCH").length;

  if (input.distances?.length && edgesChecked < input.distances.length) {
    warnings.push(`${input.distances.length - edgesChecked} printed edge length(s) could not be checked against a coordinate pair`);
  }

  let agreement: SurveyAgreement;
  const areaChecked = area.status !== "UNVERIFIED";

  if (!edgesChecked && !areaChecked) {
    agreement = "UNVERIFIED";
  } else if (edgesMismatched > 0 || area.status === "MISMATCH") {
    agreement = "DISAGREE";
    if (edgesMismatched > 0) {
      warnings.push(`${edgesMismatched} edge length(s) disagree with the extracted coordinates`);
    }
    if (area.status === "MISMATCH") {
      warnings.push("the registered area disagrees with the reconstructed boundary");
    }
  } else if (
    (edgesChecked === 0 || edgesMatched === edgesChecked) &&
    (!areaChecked || area.status === "MATCH")
  ) {
    agreement = "AGREE";
  } else {
    agreement = "PARTIAL";
    warnings.push("edge lengths or area are close but outside the match tolerance");
  }

  return { edges, area, edgesChecked, edgesMatched, edgesMismatched, agreement, warnings };
}
