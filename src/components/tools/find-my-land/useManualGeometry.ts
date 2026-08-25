/**
 * Manual Point Ordering + Geometry Recovery — Core State Engine
 *
 * Provides the immutable source-points model, the mutable manual draft,
 * undo/redo, validation, and safe suggestion logic.  The UI consumes
 * these values but never mutates source state directly.
 *
 * Safety invariant: source points and original order are NEVER mutated.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type Point = { lat: number; lon: number };

export type SourcePoint = Point & {
  id: string;
  label: string;
  sourceIndex: number;
  raw: string;
  latText: string;
  lonText: string;
  crsHint: string;
  confidence?: number;
  page?: number;
  rowIndex?: number;
};

export type GeometrySource =
  | "AUTO_SOURCE_TOPOLOGY"
  | "AUTO_DOCUMENT_ORDER"
  | "MANUAL_POINT_ORDER"
  | "MANUAL_POINT_SELECTION"
  | "MANUAL_REVIEWED_GEOMETRY";

export type ExclusionReason =
  | "MANUALLY_EXCLUDED_FROM_GEOMETRY"
  | "OCR_NOISE"
  | "DUPLICATE"
  | "OUT_OF_RANGE";

export type ManualDraft = {
  orderedIds: string[];
  excludedIds: Set<string>;
  exclusionReasons: Map<string, ExclusionReason>;
};

export type ValidationCode =
  | "MIN_POINTS"
  | "SELF_INTERSECTION"
  | "DUPLICATE_POINTS"
  | "DUPLICATE_CONSECUTIVE"
  | "ZERO_LENGTH_EDGE"
  | "UNKNOWN_CRS"
  | "POLYGON_NOT_CLOSED";

export type ValidationSeverity = "PASS" | "WARNING" | "FAIL";

export type ValidationResult = {
  code: ValidationCode;
  status: ValidationSeverity;
  detail?: string;
};

export type GeometryStatus =
  | "VALID"
  | "SELF_INTERSECTION"
  | "INSUFFICIENT_POINTS"
  | "DUPLICATE_DETECTED"
  | "REVIEW_NEEDED";

export type ManualGeometryDraft = {
  selectedPointIds: string[];
  orderedPointIds: string[];
};

export type ConfirmedManualGeometry = {
  geometrySource: GeometrySource;
  pointOrder: string[];
  selectedIds: string[];
  excludedIds: string[];
  exclusionReasons: Record<string, ExclusionReason>;
  confirmedAt: number;
  validationState: GeometryStatus;
  areaSqm: number | null;
  perimeterMeters: number | null;
};

export type ManualGeometryState = {
  sourcePoints: SourcePoint[];
  draft: ManualDraft;
  history: ManualDraft[];
  historyIndex: number;
  validation: ValidationResult[];
  status: GeometryStatus;
  previewPoints: Point[];
  areaSqm: number | null;
  perimeterMeters: number | null;
  confirmed: ConfirmedManualGeometry | null;
  hasExplicitTopology: boolean;
};

export type SuggestedOrder = {
  order: string[];
  method: string;
  reason: string;
  confidence: number;
  areaSqm: number | null;
  validation: ValidationResult[];
  status: GeometryStatus;
};

/* ------------------------------------------------------------------ */
/*  Geometry helpers (pure functions)                                  */
/* ------------------------------------------------------------------ */

function orientation(a: Point, b: Point, c: Point): number {
  return (b.lon - a.lon) * (c.lat - a.lat) - (b.lat - a.lat) * (c.lon - a.lon);
}

function segmentsIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
  const abC = orientation(a, b, c);
  const abD = orientation(a, b, d);
  const cdA = orientation(c, d, a);
  const cdB = orientation(c, d, b);
  return (
    ((abC > 0 && abD < 0) || (abC < 0 && abD > 0)) &&
    ((cdA > 0 && cdB < 0) || (cdA < 0 && cdB > 0))
  );
}

export function detectSelfIntersections(pts: Point[]): { a: number; b: number }[] {
  const intersections: { a: number; b: number }[] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const iNext = (i + 1) % n;
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const jNext = (j + 1) % n;
      if (intersects(pts[i], pts[iNext], pts[j], pts[jNext])) {
        intersections.push({ a: i, b: j });
      }
    }
  }
  return intersections;
}

function intersects(a: Point, b: Point, c: Point, d: Point): boolean {
  return segmentsIntersect(a, b, c, d);
}

export function computePolygonArea(pts: Point[]): number | null {
  if (pts.length < 3) return null;
  const samePoint = (l: Point, r: Point) =>
    Math.abs(l.lat - r.lat) < 1e-12 && Math.abs(l.lon - r.lon) < 1e-12;
  const polygon = samePoint(pts[0], pts[pts.length - 1]) ? pts.slice(0, -1) : pts;
  if (polygon.length < 3) return null;
  const unique = new Set(polygon.map((p) => `${p.lat.toFixed(12)},${p.lon.toFixed(12)}`));
  if (unique.size !== polygon.length) return null;
  const avgLat = polygon.reduce((s, p) => s + p.lat, 0) / polygon.length;
  const xF = 111_320 * Math.cos((avgLat * Math.PI) / 180);
  const yF = 110_540;
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const next = (i + 1) % polygon.length;
    area += polygon[i].lon * xF * polygon[next].lat * yF -
            polygon[next].lon * xF * polygon[i].lat * yF;
  }
  return Math.abs(area) / 2;
}

export function computePerimeter(pts: Point[]): number {
  if (pts.length < 2) return 0;
  let perimeter = 0;
  for (let i = 0; i < pts.length; i++) {
    const next = (i + 1) % pts.length;
    perimeter += haversineDistance(pts[i], pts[next]);
  }
  return perimeter;
}

function haversineDistance(a: Point, b: Point): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = sinLat * sinLat + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinLon * sinLon;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/* ------------------------------------------------------------------ */
/*  Validation engine                                                 */
/* ------------------------------------------------------------------ */

export function validateManualGeometry(
  pts: Point[],
  hasCrs: boolean,
): ValidationResult[] {
  const results: ValidationResult[] = [];

  if (pts.length < 3) {
    results.push({
      code: "MIN_POINTS",
      status: "FAIL",
      detail: `${pts.length} < 3`,
    });
    return results;
  }
  results.push({ code: "MIN_POINTS", status: "PASS" });

  const uniqueSet = new Set(pts.map((p) => `${p.lat.toFixed(12)},${p.lon.toFixed(12)}`));
  if (uniqueSet.size < pts.length) {
    results.push({
      code: "DUPLICATE_POINTS",
      status: "WARNING",
      detail: `${pts.length - uniqueSet.size} duplicates`,
    });
  } else {
    results.push({ code: "DUPLICATE_POINTS", status: "PASS" });
  }

  let consecutiveDupes = 0;
  for (let i = 0; i < pts.length; i++) {
    const next = (i + 1) % pts.length;
    if (Math.abs(pts[i].lat - pts[next].lat) < 1e-12 &&
        Math.abs(pts[i].lon - pts[next].lon) < 1e-12) {
      consecutiveDupes++;
    }
  }
  if (consecutiveDupes > 0) {
    results.push({
      code: "DUPLICATE_CONSECUTIVE",
      status: "WARNING",
      detail: `${consecutiveDupes} consecutive duplicate(s)`,
    });
  } else {
    results.push({ code: "DUPLICATE_CONSECUTIVE", status: "PASS" });
  }

  let zeroEdges = 0;
  for (let i = 0; i < pts.length; i++) {
    const next = (i + 1) % pts.length;
    if (haversineDistance(pts[i], pts[next]) < 0.001) zeroEdges++;
  }
  if (zeroEdges > 0) {
    results.push({
      code: "ZERO_LENGTH_EDGE",
      status: "WARNING",
      detail: `${zeroEdges} zero-length edge(s)`,
    });
  } else {
    results.push({ code: "ZERO_LENGTH_EDGE", status: "PASS" });
  }

  const ix = detectSelfIntersections(pts);
  if (ix.length > 0) {
    results.push({
      code: "SELF_INTERSECTION",
      status: "FAIL",
      detail: `${ix.length} intersection(s): segments ${ix.map((p) => `${p.a + 1}↔${p.b + 1}`).join(", ")}`,
    });
  } else {
    results.push({ code: "SELF_INTERSECTION", status: "PASS" });
  }

  if (!hasCrs) {
    results.push({
      code: "UNKNOWN_CRS",
      status: "WARNING",
      detail: "CRS unresolved — ordering allowed but map resolution blocked",
    });
  } else {
    results.push({ code: "UNKNOWN_CRS", status: "PASS" });
  }

  return results;
}

export function deriveGeometryStatus(results: ValidationResult[]): GeometryStatus {
  if (results.some((r) => r.code === "MIN_POINTS" && r.status === "FAIL")) return "INSUFFICIENT_POINTS";
  if (results.some((r) => r.code === "SELF_INTERSECTION" && r.status === "FAIL")) return "SELF_INTERSECTION";
  if (results.some((r) => r.code === "DUPLICATE_POINTS" && r.status === "WARNING")) return "DUPLICATE_DETECTED";
  if (results.some((r) => r.status === "FAIL" || r.status === "WARNING")) return "REVIEW_NEEDED";
  return "VALID";
}

/* ------------------------------------------------------------------ */
/*  Safe order suggestion engine (advisory only)                       */
/* ------------------------------------------------------------------ */

export function suggestSafeOrders(
  sourcePoints: SourcePoint[],
  hasCrs: boolean,
  maxCandidates = 3,
): SuggestedOrder[] {
  const candidates: SuggestedOrder[] = [];
  if (sourcePoints.length < 3) return candidates;

  const ptsById = new Map(sourcePoints.map((sp) => [sp.id, sp]));
  const ids = sourcePoints.map((sp) => sp.id);

  const evalOrder = (order: string[], method: string, reason: string): SuggestedOrder | null => {
    const pts = order.map((id) => ptsById.get(id)!).filter(Boolean);
    const validation = validateManualGeometry(pts, hasCrs);
    const status = deriveGeometryStatus(validation);
    const areaSqm = computePolygonArea(pts);
    return {
      order,
      method,
      reason,
      confidence: status === "VALID" ? 0.7 : 0.3,
      areaSqm,
      validation,
      status,
    };
  };

  if (ids.length >= 3) {
    const nearest = nearestNeighborOrder(sourcePoints);
    const c1 = evalOrder(nearest, "nearest_neighbor", "Minimize total edge length via nearest-neighbor heuristic");
    if (c1) candidates.push(c1);
  }

  if (ids.length >= 3 && ids.length <= 8) {
    let bestOrder: string[] | null = null;
    let bestArea = 0;
    for (const perm of limitedPermutations(ids, 200)) {
      const pts = perm.map((id) => ptsById.get(id)!);
      const ix = detectSelfIntersections(pts);
      if (ix.length === 0) {
        const area = computePolygonArea(pts);
        if (area !== null && area > bestArea) {
          bestArea = area;
          bestOrder = perm;
        }
      }
    }
    if (bestOrder) {
      const c2 = evalOrder(bestOrder, "max_area_non_crossing", "Maximize enclosed area among non-crossing permutations");
      if (c2 && c2.status === "VALID") candidates.push(c2);
    }
  }

  if (ids.length >= 3) {
    const angular = angularSortOrder(sourcePoints);
    const c3 = evalOrder(angular, "angular_sort", "Sort by angle around centroid (advisory — may not match concave parcels)");
    if (c3) candidates.push(c3);
  }

  const unique: SuggestedOrder[] = [];
  const seen = new Set<string>();
  for (const c of candidates) {
    const key = c.order.join(",");
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(c);
    }
  }
  return unique
    .filter((c) => c.status === "VALID")
    .slice(0, maxCandidates);
}

function nearestNeighborOrder(pts: SourcePoint[]): string[] {
  if (pts.length === 0) return [];
  const remaining = new Map(pts.map((p) => [p.id, p]));
  const order: string[] = [];
  let current = pts[0];
  remaining.delete(current.id);
  order.push(current.id);
  while (remaining.size > 0) {
    let nearest: SourcePoint | null = null;
    let minDist = Infinity;
    for (const [, candidate] of remaining) {
      const d = haversineDistance(current, candidate);
      if (d < minDist) {
        minDist = d;
        nearest = candidate;
      }
    }
    if (!nearest) break;
    remaining.delete(nearest.id);
    order.push(nearest.id);
    current = nearest;
  }
  return order;
}

function angularSortOrder(pts: SourcePoint[]): string[] {
  const cx = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p.lon, 0) / pts.length;
  return [...pts]
    .sort((a, b) => {
      const aa = Math.atan2(a.lat - cx, a.lon - cy);
      const ab = Math.atan2(b.lat - cx, b.lon - cy);
      return aa - ab;
    })
    .map((p) => p.id);
}

function* limitedPermutations<T>(arr: T[], limit: number): Generator<T[]> {
  if (arr.length <= 1) { yield arr; return; }
  let count = 0;
  function* gen(prefix: T[], rest: T[]): Generator<T[]> {
    if (rest.length === 0) { yield prefix; return; }
    for (let i = 0; i < rest.length && count < limit; i++) {
      const next = [...rest];
      const item = next.splice(i, 1)[0];
      count++;
      yield* gen([...prefix, item], next);
    }
  }
  yield* gen([], arr);
}

/* ------------------------------------------------------------------ */
/*  Draft helpers                                                     */
/* ------------------------------------------------------------------ */

export function createInitialDraft(sourcePoints: SourcePoint[]): ManualDraft {
  return {
    orderedIds: sourcePoints.map((sp) => sp.id),
    excludedIds: new Set<string>(),
    exclusionReasons: new Map<string, ExclusionReason>(),
  };
}

export function getIncludedPoints(draft: ManualDraft, ptsById: Map<string, SourcePoint>): SourcePoint[] {
  return draft.orderedIds
    .filter((id) => !draft.excludedIds.has(id))
    .map((id) => ptsById.get(id))
    .filter((p): p is SourcePoint => Boolean(p));
}

export function getPreviewPoints(draft: ManualDraft, ptsById: Map<string, SourcePoint>): Point[] {
  return getIncludedPoints(draft, ptsById).map(({ lat, lon }) => ({ lat, lon }));
}

export function movePoint(draft: ManualDraft, pointId: string, direction: "up" | "down"): ManualDraft {
  const idx = draft.orderedIds.indexOf(pointId);
  if (idx < 0) return draft;
  const targetIdx = direction === "up" ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= draft.orderedIds.length) return draft;
  const next = [...draft.orderedIds];
  [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
  return { ...draft, orderedIds: next };
}

export function toggleExclude(
  draft: ManualDraft,
  pointId: string,
  reason: ExclusionReason = "MANUALLY_EXCLUDED_FROM_GEOMETRY",
): ManualDraft {
  const excluded = new Set(draft.excludedIds);
  const reasons = new Map(draft.exclusionReasons);
  if (excluded.has(pointId)) {
    excluded.delete(pointId);
    reasons.delete(pointId);
  } else {
    excluded.add(pointId);
    reasons.set(pointId, reason);
  }
  return { ...draft, excludedIds: excluded, exclusionReasons: reasons };
}

export function restoreOriginalOrder(sourcePoints: SourcePoint[]): ManualDraft {
  return {
    orderedIds: sourcePoints.map((sp) => sp.id),
    excludedIds: new Set<string>(),
    exclusionReasons: new Map<string, ExclusionReason>(),
  };
}

/* ------------------------------------------------------------------ */
/*  Undo / Redo                                                       */
/* ------------------------------------------------------------------ */

export function pushHistory(
  history: ManualDraft[],
  historyIndex: number,
  draft: ManualDraft,
): { history: ManualDraft[]; historyIndex: number } {
  const trimmed = history.slice(0, historyIndex + 1);
  trimmed.push(draft);
  if (trimmed.length > 100) trimmed.shift();
  return { history: trimmed, historyIndex: trimmed.length - 1 };
}

export function undo(
  history: ManualDraft[],
  historyIndex: number,
): { draft: ManualDraft; historyIndex: number } | null {
  if (historyIndex <= 0) return null;
  return { draft: history[historyIndex - 1], historyIndex: historyIndex - 1 };
}

export function redo(
  history: ManualDraft[],
  historyIndex: number,
): { draft: ManualDraft; historyIndex: number } | null {
  if (historyIndex >= history.length - 1) return null;
  return { draft: history[historyIndex + 1], historyIndex: historyIndex + 1 };
}

/* ------------------------------------------------------------------ */
/*  Determine if manual geometry panel should show                     */
/* ------------------------------------------------------------------ */

export function shouldShowManualGeometry(
  coordinateCount: number,
  hasValidPolygon: boolean,
  status?: string,
  selfIntersections?: { a: number; b: number }[],
  documentOrderValid?: boolean,
): boolean {
  if (coordinateCount < 3) return false;
  if (!hasValidPolygon && status !== "PARTIALLY_RESOLVED") return true;
  if ((selfIntersections?.length ?? 0) > 0) return true;
  if (documentOrderValid === false) return true;
  if (status === "PARTIALLY_RESOLVED") return coordinateCount >= 3;
  return false;
}
