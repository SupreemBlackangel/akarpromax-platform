import { Geometry, GeometryValidationResult, Point } from "./contracts";

const LAT_RANGE: readonly [number, number] = [-90, 90];
const LON_RANGE: readonly [number, number] = [-180, 180];

export const DEFAULT_COUNTRY_BOUNDS: readonly { countryCode: string; minLat: number; maxLat: number; minLon: number; maxLon: number }[] = [
  { countryCode: "SA", minLat: 16.0, maxLat: 32.5, minLon: 34.5, maxLon: 55.7 },
  { countryCode: "AE", minLat: 22.6, maxLat: 26.2, minLon: 51.5, maxLon: 56.4 },
  { countryCode: "OM", minLat: 16.6, maxLat: 26.3, minLon: 52.0, maxLon: 59.9 },
  { countryCode: "QA", minLat: 24.4, maxLat: 26.2, minLon: 50.7, maxLon: 51.7 },
  { countryCode: "BH", minLat: 25.5, maxLat: 26.3, minLon: 50.3, maxLon: 50.8 },
  { countryCode: "KW", minLat: 28.5, maxLat: 30.1, minLon: 46.5, maxLon: 48.5 },
  { countryCode: "EG", minLat: 22.0, maxLat: 31.7, minLon: 25.0, maxLon: 36.9 },
  { countryCode: "JO", minLat: 29.2, maxLat: 33.4, minLon: 34.9, maxLon: 39.3 },
];

export function isValidLat(lat: number): boolean {
  return Number.isFinite(lat) && lat >= LAT_RANGE[0] && lat <= LAT_RANGE[1];
}

export function isValidLon(lon: number): boolean {
  return Number.isFinite(lon) && lon >= LON_RANGE[0] && lon <= LON_RANGE[1];
}

export function isValidPoint(p: Point): boolean {
  return isValidLat(p.lat) && isValidLon(p.lon);
}

export function isPointInCountryBounds(point: Point, countryCode: string): boolean {
  const bounds = DEFAULT_COUNTRY_BOUNDS.find((b) => b.countryCode === countryCode);
  if (!bounds) return true;
  return (
    point.lat >= bounds.minLat &&
    point.lat <= bounds.maxLat &&
    point.lon >= bounds.minLon &&
    point.lon <= bounds.maxLon
  );
}

function polygonAreaSigned(points: Point[]): number {
  if (points.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    sum += p1.lon * p2.lat - p2.lon * p1.lat;
  }
  return sum / 2;
}

function sharesVertex(a: Point, b: Point, c: Point, d: Point): boolean {
  return (
    (a.lat === c.lat && a.lon === c.lon) ||
    (a.lat === d.lat && a.lon === d.lon) ||
    (b.lat === c.lat && b.lon === c.lon) ||
    (b.lat === d.lat && b.lon === d.lon)
  );
}

function isSelfIntersecting(points: Point[]): boolean {
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    for (let j = i + 1; j < points.length; j++) {
      if (j === i || j === (i + 1) % points.length) continue;
      const c = points[j];
      const d = points[(j + 1) % points.length];
      if (sharesVertex(a, b, c, d)) continue;
      if (segmentsIntersect(a, b, c, d)) return true;
    }
  }
  return false;
}

function orientation(p: Point, q: Point, r: Point): number {
  const val = (q.lon - p.lon) * (r.lat - p.lat) - (r.lon - p.lon) * (q.lat - p.lat);
  if (Math.abs(val) < 1e-12) return 0;
  return val > 0 ? 1 : 2;
}

function onSegment(p: Point, q: Point, r: Point): boolean {
  return (
    q.lon <= Math.max(p.lon, r.lon) &&
    q.lon >= Math.min(p.lon, r.lon) &&
    q.lat <= Math.max(p.lat, r.lat) &&
    q.lat >= Math.min(p.lat, r.lat)
  );
}

function segmentsIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);

  if (o1 !== o2 && o3 !== o4) return true;

  if (o1 === 0 && onSegment(a, c, b)) return true;
  if (o2 === 0 && onSegment(a, d, b)) return true;
  if (o3 === 0 && onSegment(c, a, d)) return true;
  if (o4 === 0 && onSegment(c, b, d)) return true;

  return false;
}

export function validateGeometry(geometry: Geometry, countryCode?: string): GeometryValidationResult {
  const errors: string[] = [];

  if (geometry.type === "point") {
    if (!isValidPoint(geometry.coordinates)) {
      errors.push(`invalid point: lat=${geometry.coordinates.lat} lon=${geometry.coordinates.lon}`);
    }
    if (countryCode && !isPointInCountryBounds(geometry.coordinates, countryCode)) {
      errors.push(`point outside country bounds for ${countryCode}`);
    }
    return { valid: errors.length === 0, errors };
  }

  if (geometry.type === "linestring") {
    if (geometry.coordinates.length < 2) {
      errors.push("linestring needs at least 2 points");
    }
    for (const p of geometry.coordinates) {
      if (!isValidPoint(p)) {
        errors.push(`invalid linestring point: lat=${p.lat} lon=${p.lon}`);
      }
    }
    if (countryCode && errors.length === 0) {
      for (const p of geometry.coordinates) {
        if (!isPointInCountryBounds(p, countryCode)) {
          errors.push(`linestring point outside country bounds for ${countryCode}`);
          break;
        }
      }
    }
    return { valid: errors.length === 0, errors };
  }

  if (geometry.type === "polygon") {
    const pts = geometry.coordinates;
    if (pts.length < 4) {
      errors.push("polygon needs at least 4 points");
    }
    if (pts.length >= 3) {
      const first = pts[0];
      const last = pts[pts.length - 1];
      if (Math.abs(first.lat - last.lat) > 1e-9 || Math.abs(first.lon - last.lon) > 1e-9) {
        errors.push("polygon must be closed (first point == last point)");
      }
    }
    if (pts.length >= 4) {
      for (const p of pts) {
        if (!isValidPoint(p)) {
          errors.push(`invalid polygon point: lat=${p.lat} lon=${p.lon}`);
        }
      }
      const distinct = pts.slice(0, -1);
      if (distinct.length < 3) {
        errors.push("polygon needs at least 3 distinct points");
      }
      if (distinct.length >= 3 && Math.abs(polygonAreaSigned(distinct)) < 1e-12) {
        errors.push("polygon has zero area");
      }
      if (distinct.length >= 3 && isSelfIntersecting(distinct)) {
        errors.push("polygon is self-intersecting");
      }
    }
    if (countryCode && errors.length === 0) {
      for (const p of pts) {
        if (!isPointInCountryBounds(p, countryCode)) {
          errors.push(`polygon point outside country bounds for ${countryCode}`);
          break;
        }
      }
    }
    return { valid: errors.length === 0, errors };
  }

  return { valid: false, errors: ["unsupported geometry type"] };
}
