/**
 * Parcel boundary reconstruction and validation.
 *
 * The order the document lists its corners in is evidence, not a suggestion.
 * This module keeps that order intact, measures what it produces, checks it
 * against everything else the document says, and — only when the geometry is
 * genuinely unusable and an alternative is genuinely unambiguous — offers a
 * different order as a proposal the user must accept.
 *
 * It never silently reorders, and it never returns a polygon it could not
 * justify. Correct ugly geometry beats fabricated beautiful geometry.
 */
import type { Point } from "@/lib/geo/contracts";
import type { ParsedArea } from "@/lib/land/documents/numerals";
import type { CardinalDirection, DocumentedSide } from "@/lib/land/documents/boundary-terms";
import {
  buildLocalPlane,
  planeArea,
  planeBearing,
  planeDistance,
  signedPlaneArea,
  type LocalPlane,
  type PlaneCoordinate,
} from "./local-plane";

/** Two corners closer than this are the same physical point. */
export const DUPLICATE_TOLERANCE_METERS = 0.05;
/**
 * Smallest area a real parcel can enclose. Below it the corners are collinear:
 * the projection's own curvature can leave a few hundredths of a square metre
 * between three points on one line, and that is not a boundary.
 */
export const MIN_RING_AREA_SQUARE_METERS = 0.01;
/** A side length within this of the documented value counts as agreeing. */
export const SIDE_LENGTH_TOLERANCE_METERS = 0.25;
/** Area agreement bands, as a percentage of the stated area. */
export const AREA_MATCH_TOLERANCE_PERCENT = 1;
export const AREA_REVIEW_TOLERANCE_PERCENT = 5;

export type ParcelValidationCode =
  | "COORDINATE_VALIDITY"
  | "DUPLICATE_VERTICES"
  | "POINT_COUNT"
  | "SEGMENT_INTERSECTION"
  | "POSITIVE_AREA"
  | "BOUNDARY_CLOSURE"
  | "CRS_CONSISTENCY"
  | "GEOGRAPHIC_SANITY"
  | "SIDE_LENGTH_AGREEMENT"
  | "STATED_AREA_AGREEMENT";

export type ParcelValidationStatus = "PASS" | "WARNING" | "FAIL" | "NOT_APPLICABLE";

export interface ParcelValidation {
  code: ParcelValidationCode;
  status: ParcelValidationStatus;
  detail?: string;
  measured?: number;
  expected?: number;
  deviation?: number;
  unit?: "m" | "m2" | "percent" | "points";
}

/** A parcel corner, with everything needed to trace it back to the document. */
export interface SourceVertex {
  /** Position in the document's own sequence, zero-based. */
  index: number;
  /** Display label, e.g. `P1`. */
  label: string;
  /** The point number exactly as the document writes it. */
  pointNumber?: string;
  page?: number;
  /** Row within the source table, when the document is tabular. */
  rowIndex?: number;
  /** The document text this vertex was read from. */
  sourceText: string;
  /** The values as documented, before conversion. */
  original: {
    easting?: number;
    northing?: number;
    zone?: number;
    hemisphere?: "N" | "S";
    latitude?: number;
    longitude?: number;
  };
  /** The resolved WGS84 position. */
  point: Point;
  crs: "wgs84" | "utm";
  confidence: number;
  /** Which parser or country adapter produced this vertex. */
  extractedBy: string;
  warnings: string[];
}

export interface BoundarySegment {
  fromIndex: number;
  toIndex: number;
  fromLabel: string;
  toLabel: string;
  lengthMeters: number;
  bearingDegrees: number;
  /** Length the document states for this side, when it could be matched. */
  documentLengthMeters?: number;
  deviationMeters?: number;
}

export interface SuggestedSequence {
  /** Vertex indices, in the proposed order. */
  order: number[];
  method: "UNIQUE_SIMPLE_POLYGON" | "SIDE_LENGTH_EVIDENCE" | "CONVEX_ORDER";
  reason: string;
  confidence: number;
  areaSquareMeters: number;
}

export interface AreaComparison {
  computedSquareMeters: number;
  statedSquareMeters: number;
  differenceSquareMeters: number;
  differencePercent: number;
  verdict: "MATCH" | "REVIEW" | "MISMATCH";
}

export interface SideLengthComparison {
  matched: number;
  total: number;
  maxDeviationMeters: number;
  verdict: "MATCH" | "REVIEW" | "MISMATCH";
}

export interface BoundaryAnalysis {
  /** Vertex indices in the order the document lists them. */
  documentSequence: number[];
  /** Distinct corners after collapsing repeats. */
  distinctCount: number;
  /** Indices that repeat an earlier corner. */
  duplicateIndices: number[];
  /**
   * Index of a final point that repeats the first one. That is a normal ring
   * closure, not a fifth corner.
   */
  closingDuplicateIndex?: number;
  /** True when the documented order forms a usable simple polygon. */
  documentOrderValid: boolean;
  /** Pairs of segment indices that cross. */
  selfIntersections: { a: number; b: number }[];
  segments: BoundarySegment[];
  perimeterMeters: number;
  areaSquareMeters?: number;
  /** Ring orientation of the documented order. */
  orientation?: "CLOCKWISE" | "COUNTER_CLOCKWISE";
  areaComparison?: AreaComparison;
  sideLengthComparison?: SideLengthComparison;
  /** Offered only when the documented order is unusable and one order is clear. */
  suggestedSequence?: SuggestedSequence;
  validations: ParcelValidation[];
  /** True when the parcel is too large for a single distortion-free plane. */
  planeExtentWarning: boolean;
}

export interface BoundaryAnalysisInput {
  vertices: readonly SourceVertex[];
  statedArea?: ParsedArea;
  documentedSides?: readonly DocumentedSide[];
  /**
   * Edge lengths the document states per corner pair, e.g. from a `DIST`
   * column. These are matched exactly by corner identifier, which is stronger
   * than pairing a cardinal description to a side by its position.
   */
  documentedEdges?: readonly { from: string; to: string; meters: number }[];
  /** Returns false for a point outside the document's country envelope. */
  isPlausiblePoint?: (point: Point) => boolean;
  countryLabel?: string;
}

function segmentsIntersect(
  a: PlaneCoordinate,
  b: PlaneCoordinate,
  c: PlaneCoordinate,
  d: PlaneCoordinate,
): boolean {
  const cross = (p: PlaneCoordinate, q: PlaneCoordinate, r: PlaneCoordinate) =>
    (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const d1 = cross(a, b, c);
  const d2 = cross(a, b, d);
  const d3 = cross(c, d, a);
  const d4 = cross(c, d, b);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/** Segment pairs that cross, ignoring pairs that share an endpoint. */
function findSelfIntersections(ring: readonly PlaneCoordinate[]): { a: number; b: number }[] {
  const found: { a: number; b: number }[] = [];
  const count = ring.length;
  for (let first = 0; first < count; first += 1) {
    const firstNext = (first + 1) % count;
    for (let second = first + 1; second < count; second += 1) {
      const secondNext = (second + 1) % count;
      if (first === second || firstNext === second || secondNext === first) continue;
      if (segmentsIntersect(ring[first], ring[firstNext], ring[second], ring[secondNext])) {
        found.push({ a: first, b: second });
      }
    }
  }
  return found;
}

function isSimpleRing(ring: readonly PlaneCoordinate[]): boolean {
  return (
    ring.length >= 3
    && findSelfIntersections(ring).length === 0
    && planeArea(ring) > MIN_RING_AREA_SQUARE_METERS
  );
}

/** Canonical key for a cyclic ring, invariant to rotation and reflection. */
function ringKey(order: readonly number[]): string {
  const rotations: string[] = [];
  for (const sequence of [order, [...order].reverse()]) {
    for (let offset = 0; offset < sequence.length; offset += 1) {
      rotations.push(sequence.slice(offset).concat(sequence.slice(0, offset)).join(","));
    }
  }
  return rotations.sort()[0];
}

/** Every cyclic permutation of indices `1..n-1`, with `0` pinned first. */
function* cyclicOrders(count: number): Generator<number[]> {
  const rest = Array.from({ length: count - 1 }, (_, index) => index + 1);
  const permute = function* (current: number[], remaining: number[]): Generator<number[]> {
    if (remaining.length === 0) {
      yield [0, ...current];
      return;
    }
    for (let index = 0; index < remaining.length; index += 1) {
      yield* permute(
        [...current, remaining[index]],
        [...remaining.slice(0, index), ...remaining.slice(index + 1)],
      );
    }
  };
  yield* permute([], rest);
}

/** Corners ordered by angle about their centroid. */
function radialOrder(ring: readonly PlaneCoordinate[]): number[] {
  const cx = ring.reduce((sum, p) => sum + p.x, 0) / ring.length;
  const cy = ring.reduce((sum, p) => sum + p.y, 0) / ring.length;
  return ring
    .map((point, index) => ({ index, angle: Math.atan2(point.y - cy, point.x - cx) }))
    .sort((left, right) => left.angle - right.angle)
    .map((entry) => entry.index);
}

/**
 * True when every corner lies on the convex hull, so exactly one simple ring
 * exists. The turn tolerance is scaled to the parcel's own size, because the
 * projection leaves a sub-millimetre curvature between points that the document
 * lists as being on one straight line.
 */
function isConvexPosition(ring: readonly PlaneCoordinate[]): boolean {
  const order = radialOrder(ring);
  const ordered = order.map((index) => ring[index]);
  const spread = Math.max(
    1,
    Math.max(...ordered.map((p) => Math.abs(p.x))) + Math.max(...ordered.map((p) => Math.abs(p.y))),
  );
  // A turn smaller than this is a straight line at survey precision.
  const crossTolerance = spread * 0.001;

  let sign = 0;
  for (let index = 0; index < ordered.length; index += 1) {
    const a = ordered[index];
    const b = ordered[(index + 1) % ordered.length];
    const c = ordered[(index + 2) % ordered.length];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(cross) < crossTolerance) continue;
    const current = cross > 0 ? 1 : -1;
    if (sign === 0) sign = current;
    else if (current !== sign) return false;
  }
  return sign !== 0;
}

function sideLengthsOf(ring: readonly PlaneCoordinate[], order: readonly number[]): number[] {
  return order.map((index, position) =>
    planeDistance(ring[index], ring[order[(position + 1) % order.length]]),
  );
}

/**
 * How well a candidate order reproduces the documented side lengths. Lower is
 * better; `null` when there is nothing to compare against.
 */
function sideLengthPenalty(
  lengths: readonly number[],
  documentedSides: readonly DocumentedSide[],
): number | null {
  if (documentedSides.length === 0) return null;
  const remaining = documentedSides.map((side) => side.lengthMeters);
  let penalty = 0;
  for (const length of lengths) {
    if (remaining.length === 0) break;
    let bestIndex = 0;
    let bestDelta = Math.abs(length - remaining[0]);
    for (let index = 1; index < remaining.length; index += 1) {
      const delta = Math.abs(length - remaining[index]);
      if (delta < bestDelta) {
        bestDelta = delta;
        bestIndex = index;
      }
    }
    penalty += bestDelta;
    remaining.splice(bestIndex, 1);
  }
  return penalty;
}

/**
 * Proposes an alternative corner order — but only when the proposal is
 * genuinely unambiguous. A set of corners in convex position has exactly one
 * simple ring; otherwise a documented side-length set must single one out.
 */
function proposeSequence(
  ring: readonly PlaneCoordinate[],
  documentedSides: readonly DocumentedSide[],
  statedArea?: ParsedArea,
): SuggestedSequence | null {
  if (ring.length < 3) return null;

  if (isConvexPosition(ring)) {
    const order = radialOrder(ring);
    const ordered = order.map((index) => ring[index]);
    if (!isSimpleRing(ordered)) return null;
    return {
      order,
      method: "CONVEX_ORDER",
      reason: "CORNERS_IN_CONVEX_POSITION_ADMIT_ONE_SIMPLE_BOUNDARY",
      confidence: 0.8,
      areaSquareMeters: planeArea(ordered),
    };
  }

  // Non-convex: enumerate every distinct simple ring, for small corner counts.
  if (ring.length > 8) return null;
  const distinct = new Map<string, number[]>();
  for (const order of cyclicOrders(ring.length)) {
    const ordered = order.map((index) => ring[index]);
    if (!isSimpleRing(ordered)) continue;
    const key = ringKey(order);
    if (!distinct.has(key)) distinct.set(key, order);
  }
  if (distinct.size === 0) return null;

  const candidates = Array.from(distinct.values());
  if (candidates.length === 1) {
    const order = candidates[0];
    return {
      order,
      method: "UNIQUE_SIMPLE_POLYGON",
      reason: "ONLY_ONE_NON_CROSSING_BOUNDARY_EXISTS_FOR_THESE_CORNERS",
      confidence: 0.75,
      areaSquareMeters: planeArea(order.map((index) => ring[index])),
    };
  }

  // Several simple rings exist: documented evidence has to pick one.
  if (documentedSides.length === 0 && !statedArea) return null;

  const scored = candidates
    .map((order) => {
      const ordered = order.map((index) => ring[index]);
      const area = planeArea(ordered);
      const lengthPenalty = sideLengthPenalty(sideLengthsOf(ring, order), documentedSides) ?? 0;
      const areaPenalty = statedArea
        ? Math.abs(area - statedArea.squareMeters) / Math.max(1, statedArea.squareMeters) * 100
        : 0;
      return { order, area, penalty: lengthPenalty + areaPenalty };
    })
    .sort((left, right) => left.penalty - right.penalty);

  const best = scored[0];
  const second = scored[1];
  // The winner must be clearly better, and must actually fit the evidence.
  if (!best || best.penalty > 1 || (second && second.penalty - best.penalty < 0.5)) return null;

  return {
    order: best.order,
    method: "SIDE_LENGTH_EVIDENCE",
    reason: "DOCUMENTED_LENGTHS_AND_AREA_MATCH_ONLY_THIS_BOUNDARY",
    confidence: 0.7,
    areaSquareMeters: best.area,
  };
}

function compareArea(computed: number, stated: ParsedArea): AreaComparison {
  const difference = computed - stated.squareMeters;
  const percent = Math.abs(difference) / Math.max(1, stated.squareMeters) * 100;
  const verdict = percent <= AREA_MATCH_TOLERANCE_PERCENT
    ? "MATCH"
    : percent <= AREA_REVIEW_TOLERANCE_PERCENT
      ? "REVIEW"
      : "MISMATCH";
  return {
    computedSquareMeters: computed,
    statedSquareMeters: stated.squareMeters,
    differenceSquareMeters: difference,
    differencePercent: percent,
    verdict,
  };
}

/** Direction a segment runs, used to pair it with a documented side. */
function segmentDirection(bearingDegrees: number): CardinalDirection {
  if (bearingDegrees >= 315 || bearingDegrees < 45) return "N";
  if (bearingDegrees < 135) return "E";
  if (bearingDegrees < 225) return "S";
  return "W";
}

/**
 * Attaches documented lengths to the segments they describe.
 *
 * A side described as "northern" is the segment that runs along the north of
 * the parcel, which is the east–west segment with the largest northing — not
 * the segment whose bearing points north. Matching is therefore done on the
 * side's position, and only when the parcel has four corners, where the
 * cardinal description is unambiguous.
 */
function attachDocumentedSides(
  segments: BoundarySegment[],
  ring: readonly PlaneCoordinate[],
  order: readonly number[],
  documentedSides: readonly DocumentedSide[],
): void {
  if (documentedSides.length === 0 || segments.length !== 4 || order.length !== 4) return;

  const midpoints = segments.map((segment, index) => {
    const from = ring[order[index]];
    const to = ring[order[(index + 1) % order.length]];
    return { index, x: (from.x + to.x) / 2, y: (from.y + to.y) / 2, segment };
  });

  const byDirection: Record<CardinalDirection, number> = {
    N: midpoints.reduce((best, current) => (current.y > midpoints[best].y ? current.index : best), 0),
    S: midpoints.reduce((best, current) => (current.y < midpoints[best].y ? current.index : best), 0),
    E: midpoints.reduce((best, current) => (current.x > midpoints[best].x ? current.index : best), 0),
    W: midpoints.reduce((best, current) => (current.x < midpoints[best].x ? current.index : best), 0),
  };

  // Every cardinal side must resolve to a different segment, or the parcel is
  // rotated enough that the description cannot be matched safely.
  const assigned = new Set(Object.values(byDirection));
  if (assigned.size !== 4) return;

  for (const side of documentedSides) {
    const segmentIndex = byDirection[side.direction];
    const segment = segments[segmentIndex];
    if (!segment) continue;
    segment.documentLengthMeters = side.lengthMeters;
    segment.deviationMeters = Math.abs(segment.lengthMeters - side.lengthMeters);
  }
}

/**
 * Measures and validates a parcel boundary in the order the document gives.
 */
export function analyseBoundary(input: BoundaryAnalysisInput): BoundaryAnalysis {
  const vertices = input.vertices;
  const documentedSides = input.documentedSides ?? [];
  const validations: ParcelValidation[] = [];

  const documentSequence = vertices.map((vertex) => vertex.index);
  const invalidPoints = vertices.filter(
    (vertex) =>
      !Number.isFinite(vertex.point.lat)
      || !Number.isFinite(vertex.point.lon)
      || Math.abs(vertex.point.lat) > 90
      || Math.abs(vertex.point.lon) > 180,
  );
  validations.push({
    code: "COORDINATE_VALIDITY",
    status: vertices.length === 0 ? "NOT_APPLICABLE" : invalidPoints.length === 0 ? "PASS" : "FAIL",
    measured: vertices.length - invalidPoints.length,
    expected: vertices.length,
    unit: "points",
  });

  const usable = vertices.filter((vertex) => !invalidPoints.includes(vertex));
  const plane = usable.length > 0 ? buildLocalPlane(usable.map((vertex) => vertex.point)) : null;

  if (!plane || usable.length === 0) {
    validations.push({ code: "POINT_COUNT", status: "NOT_APPLICABLE", measured: 0, expected: 3, unit: "points" });
    return {
      documentSequence,
      distinctCount: 0,
      duplicateIndices: [],
      documentOrderValid: false,
      selfIntersections: [],
      segments: [],
      perimeterMeters: 0,
      validations,
      planeExtentWarning: false,
    };
  }

  // Duplicates are collapsed for geometry but never removed from the record.
  const duplicateIndices: number[] = [];
  const distinctPositions: number[] = [];
  for (let index = 0; index < usable.length; index += 1) {
    const isRepeat = distinctPositions.some(
      (kept) => planeDistance(plane.coordinates[index], plane.coordinates[kept]) <= DUPLICATE_TOLERANCE_METERS,
    );
    if (isRepeat) duplicateIndices.push(usable[index].index);
    else distinctPositions.push(index);
  }

  // A final point repeating the first is a ring closure, not a new corner.
  const closingDuplicateIndex =
    usable.length >= 4
    && planeDistance(plane.coordinates[0], plane.coordinates[usable.length - 1]) <= DUPLICATE_TOLERANCE_METERS
      ? usable[usable.length - 1].index
      : undefined;

  validations.push({
    code: "DUPLICATE_VERTICES",
    status: duplicateIndices.length === 0
      ? "PASS"
      : closingDuplicateIndex !== undefined && duplicateIndices.length === 1
        ? "PASS"
        : "WARNING",
    measured: duplicateIndices.length,
    unit: "points",
    detail: closingDuplicateIndex !== undefined ? "CLOSING_POINT_REPEATS_FIRST" : undefined,
  });

  const ring = distinctPositions.map((position) => plane.coordinates[position]);
  const ringVertices = distinctPositions.map((position) => usable[position]);
  const distinctCount = ring.length;

  validations.push({
    code: "POINT_COUNT",
    status: distinctCount >= 3 ? "PASS" : distinctCount > 0 ? "WARNING" : "NOT_APPLICABLE",
    measured: distinctCount,
    expected: 3,
    unit: "points",
  });

  const crsKinds = new Set(vertices.map((vertex) => vertex.crs));
  validations.push({
    code: "CRS_CONSISTENCY",
    status: vertices.length === 0 ? "NOT_APPLICABLE" : crsKinds.size <= 1 ? "PASS" : "WARNING",
    detail: crsKinds.size > 1 ? Array.from(crsKinds).join(", ") : undefined,
  });

  const plausible = input.isPlausiblePoint;
  const outsideCount = plausible ? usable.filter((vertex) => !plausible(vertex.point)).length : 0;
  validations.push({
    code: "GEOGRAPHIC_SANITY",
    status: !plausible || usable.length === 0 ? "NOT_APPLICABLE" : outsideCount === 0 ? "PASS" : "FAIL",
    measured: usable.length - outsideCount,
    expected: usable.length,
    unit: "points",
    detail: outsideCount > 0 ? input.countryLabel : undefined,
  });

  if (distinctCount < 3) {
    validations.push({ code: "SEGMENT_INTERSECTION", status: "NOT_APPLICABLE" });
    validations.push({ code: "POSITIVE_AREA", status: "NOT_APPLICABLE" });
    validations.push({ code: "BOUNDARY_CLOSURE", status: "NOT_APPLICABLE" });
    validations.push({ code: "SIDE_LENGTH_AGREEMENT", status: "NOT_APPLICABLE" });
    validations.push({ code: "STATED_AREA_AGREEMENT", status: "NOT_APPLICABLE" });
    return {
      documentSequence,
      distinctCount,
      duplicateIndices,
      closingDuplicateIndex,
      documentOrderValid: false,
      selfIntersections: [],
      segments: [],
      perimeterMeters: 0,
      validations,
      planeExtentWarning: !plane.withinSafeExtent,
    };
  }

  const order = ring.map((_, index) => index);
  const selfIntersections = findSelfIntersections(ring);
  const area = planeArea(ring);
  const signed = signedPlaneArea(ring);

  const segments: BoundarySegment[] = order.map((position) => {
    const nextPosition = (position + 1) % order.length;
    return {
      fromIndex: ringVertices[position].index,
      toIndex: ringVertices[nextPosition].index,
      fromLabel: ringVertices[position].label,
      toLabel: ringVertices[nextPosition].label,
      lengthMeters: planeDistance(ring[position], ring[nextPosition]),
      bearingDegrees: planeBearing(ring[position], ring[nextPosition]),
    };
  });

  // A per-edge length keyed by corner identifier is exact evidence, so it is
  // applied first; cardinal side descriptions only fill in what it leaves.
  const documentedEdges = input.documentedEdges ?? [];
  if (documentedEdges.length > 0) {
    for (let position = 0; position < order.length; position += 1) {
      const nextPosition = (position + 1) % order.length;
      const fromNumber = ringVertices[position].pointNumber;
      const toNumber = ringVertices[nextPosition].pointNumber;
      const edge = documentedEdges.find(
        (candidate) => candidate.from === fromNumber && candidate.to === toNumber,
      );
      if (!edge) continue;
      segments[position].documentLengthMeters = edge.meters;
      segments[position].deviationMeters = Math.abs(segments[position].lengthMeters - edge.meters);
    }
  }
  if (segments.every((segment) => segment.documentLengthMeters === undefined)) {
    attachDocumentedSides(segments, ring, order, documentedSides);
  }

  const perimeterMeters = segments.reduce((total, segment) => total + segment.lengthMeters, 0);

  validations.push({
    code: "SEGMENT_INTERSECTION",
    status: selfIntersections.length === 0 ? "PASS" : "FAIL",
    measured: selfIntersections.length,
  });
  validations.push({
    code: "POSITIVE_AREA",
    status: area > MIN_RING_AREA_SQUARE_METERS ? "PASS" : "FAIL",
    measured: area,
    unit: "m2",
  });
  // A ring built from distinct corners always closes; the check reports whether
  // the document's own sequence returns to its start.
  validations.push({
    code: "BOUNDARY_CLOSURE",
    status: selfIntersections.length === 0 && area > MIN_RING_AREA_SQUARE_METERS ? "PASS" : "WARNING",
    detail: closingDuplicateIndex !== undefined ? "EXPLICIT_CLOSING_POINT" : "IMPLICIT_CLOSURE",
  });

  const documentOrderValid = selfIntersections.length === 0 && area > MIN_RING_AREA_SQUARE_METERS;

  const measuredSides = segments.map((segment) => segment.lengthMeters);
  const hasLengthEvidence = documentedSides.length > 0 || documentedEdges.length > 0;
  let sideLengthComparison: SideLengthComparison | undefined;
  if (hasLengthEvidence) {
    const compared = segments.filter((segment) => segment.documentLengthMeters !== undefined);
    if (compared.length > 0) {
      const maxDeviation = Math.max(...compared.map((segment) => segment.deviationMeters ?? 0));
      const matched = compared.filter(
        (segment) => (segment.deviationMeters ?? Infinity) <= SIDE_LENGTH_TOLERANCE_METERS,
      ).length;
      const verdict = matched === compared.length
        ? "MATCH"
        : maxDeviation <= SIDE_LENGTH_TOLERANCE_METERS * 4
          ? "REVIEW"
          : "MISMATCH";
      sideLengthComparison = { matched, total: compared.length, maxDeviationMeters: maxDeviation, verdict };
      validations.push({
        code: "SIDE_LENGTH_AGREEMENT",
        status: verdict === "MATCH" ? "PASS" : verdict === "REVIEW" ? "WARNING" : "FAIL",
        measured: matched,
        expected: compared.length,
        deviation: maxDeviation,
        unit: "m",
      });
    } else {
      // Lengths are stated but could not be paired with a specific side.
      const unpaired = documentedSides.length > 0
        ? documentedSides
        : documentedEdges.map((edge) => ({ direction: "N" as const, lengthMeters: edge.meters, raw: "" }));
      const penalty = sideLengthPenalty(measuredSides, unpaired);
      validations.push({
        code: "SIDE_LENGTH_AGREEMENT",
        status: penalty !== null && penalty <= SIDE_LENGTH_TOLERANCE_METERS * unpaired.length
          ? "PASS"
          : "WARNING",
        deviation: penalty ?? undefined,
        unit: "m",
        detail: "UNPAIRED_LENGTH_SET",
      });
    }
  } else {
    validations.push({ code: "SIDE_LENGTH_AGREEMENT", status: "NOT_APPLICABLE" });
  }

  let areaComparison: AreaComparison | undefined;
  if (input.statedArea && documentOrderValid) {
    areaComparison = compareArea(area, input.statedArea);
    validations.push({
      code: "STATED_AREA_AGREEMENT",
      status: areaComparison.verdict === "MATCH"
        ? "PASS"
        : areaComparison.verdict === "REVIEW"
          ? "WARNING"
          : "FAIL",
      measured: areaComparison.computedSquareMeters,
      expected: areaComparison.statedSquareMeters,
      deviation: areaComparison.differencePercent,
      unit: "percent",
    });
  } else {
    validations.push({ code: "STATED_AREA_AGREEMENT", status: "NOT_APPLICABLE" });
  }

  const suggestedSequence = documentOrderValid
    ? undefined
    : proposeSequence(ring, documentedSides, input.statedArea) ?? undefined;

  return {
    documentSequence,
    distinctCount,
    duplicateIndices,
    closingDuplicateIndex,
    documentOrderValid,
    selfIntersections,
    segments,
    perimeterMeters,
    areaSquareMeters: documentOrderValid ? area : undefined,
    orientation: signed >= 0 ? "COUNTER_CLOCKWISE" : "CLOCKWISE",
    areaComparison,
    sideLengthComparison,
    suggestedSequence: suggestedSequence
      ? {
          ...suggestedSequence,
          // Report the proposal in document vertex indices, not ring positions.
          order: suggestedSequence.order.map((position) => ringVertices[position].index),
        }
      : undefined,
    validations,
    planeExtentWarning: !plane.withinSafeExtent,
  };
}

/** Re-runs the analysis with the corners in a user-confirmed order. */
export function reorderVertices(
  vertices: readonly SourceVertex[],
  order: readonly number[],
): SourceVertex[] {
  const byIndex = new Map(vertices.map((vertex) => [vertex.index, vertex]));
  const reordered: SourceVertex[] = [];
  for (const index of order) {
    const vertex = byIndex.get(index);
    if (vertex) reordered.push(vertex);
  }
  // Any vertex the caller left out keeps its place at the end, never dropped.
  for (const vertex of vertices) {
    if (!order.includes(vertex.index)) reordered.push(vertex);
  }
  return reordered;
}
