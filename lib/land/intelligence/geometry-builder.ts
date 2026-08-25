import type { Geometry, Point } from "@/lib/geo/contracts";
import { validateGeometry } from "@/lib/geo/geometry";
import { CountryDocumentAdapter } from "./contracts";

export interface GeometryBuildResult {
  geometry?: Geometry;
  center?: Point;
  warnings: string[];
}

export function centroidOf(points: Point[]): Point | null {
  if (points.length === 0) return null;
  if (points.length === 1) return points[0];
  const avg = points.reduce(
    (acc, p) => ({ lat: acc.lat + p.lat, lon: acc.lon + p.lon }),
    { lat: 0, lon: 0 },
  );
  return { lat: avg.lat / points.length, lon: avg.lon / points.length };
}

export function buildLandGeometry(
  points: Point[],
  countryAdapter: CountryDocumentAdapter,
): GeometryBuildResult {
  const warnings: string[] = [];
  const distinct = dedupePoints(points);

  if (distinct.length === 0) {
    return { warnings: ["no valid coordinates to build geometry"] };
  }

  if (distinct.length === 1) {
    return {
      geometry: { type: "point", coordinates: distinct[0] },
      center: distinct[0],
      warnings: [],
    };
  }

  if (distinct.length === 2) {
    const center = centroidOf(distinct);
    return {
      center: center ?? undefined,
      warnings: ["only 2 corner points found; a polygon needs at least 3 distinct corners"],
    };
  }

  // The document order is evidence. Reordering points to manufacture a valid
  // polygon changes the surveyed shape, so invalid/crossing source sequences
  // are returned for review without a polygon.
  const polygon: Geometry = { type: "polygon", coordinates: [...distinct, distinct[0]] };
  const validation = validateGeometry(polygon, countryAdapter.countryCode);

  if (!validation.valid) {
    warnings.push(...validation.errors);
    return {
      center: centroidOf(distinct) ?? undefined,
      warnings,
    };
  }

  return {
    geometry: polygon,
    center: centroidOf(distinct) ?? undefined,
    warnings,
  };
}

export function dedupePoints(points: Point[]): Point[] {
  const seen = new Set<string>();
  const out: Point[] = [];
  for (const p of points) {
    const key = `${p.lat.toFixed(9)},${p.lon.toFixed(9)}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(p);
    }
  }
  return out;
}
