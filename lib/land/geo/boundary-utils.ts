import { GeoPoint } from './coordinate-utils';

export type GeoBoundary = {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: GeoPoint[][] | GeoPoint[][][];
};

type RawGeoJsonInput = {
  type?: string;
  coordinates?: unknown;
};

export function parseBoundaryFromJson(json: string | RawGeoJsonInput): GeoBoundary | null {
  try {
    const data: RawGeoJsonInput = typeof json === 'string' ? JSON.parse(json) : json;
    if (data.type === 'Polygon' && Array.isArray(data.coordinates)) {
      const coordinates = data.coordinates as number[][][];
      return {
        type: 'Polygon',
        coordinates: [coordinates[0].map((c: number[]) => ({ lat: c[1], lng: c[0] }))] as GeoPoint[][],
      };
    }
    if (data.type === 'MultiPolygon' && Array.isArray(data.coordinates)) {
      const coordinates = data.coordinates as number[][][][];
      return {
        type: 'MultiPolygon',
        coordinates: coordinates.map((polygon: number[][][]) =>
          [polygon[0].map((c: number[]) => ({ lat: c[1], lng: c[0] }))] as GeoPoint[][]
        ) as GeoPoint[][][],
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function boundaryToGeoJson(boundary: GeoBoundary): { type: string; coordinates: unknown } {
  if (boundary.type === 'Polygon') {
    const ring = boundary.coordinates[0] as GeoPoint[];
    return {
      type: 'Polygon',
      coordinates: [ring.map((p: GeoPoint) => [p.lng, p.lat])],
    };
  }
  const multiCoords = boundary.coordinates as GeoPoint[][][];
  return {
    type: 'MultiPolygon',
    coordinates: multiCoords.map((polygon: GeoPoint[][]) =>
      [(polygon[0] as GeoPoint[]).map((p: GeoPoint) => [p.lng, p.lat])]
    ),
  };
}

export function getBoundaryCenter(boundary: GeoBoundary): GeoPoint {
  let points: GeoPoint[];
  if (boundary.type === 'Polygon') {
    points = boundary.coordinates[0] as GeoPoint[];
  } else {
    points = (boundary.coordinates[0] as GeoPoint[][])[0] as GeoPoint[];
  }

  const lat = points.reduce((sum: number, p: GeoPoint) => sum + p.lat, 0) / points.length;
  const lng = points.reduce((sum: number, p: GeoPoint) => sum + p.lng, 0) / points.length;
  return { lat, lng };
}

export function getBoundaryBounds(boundary: GeoBoundary): {
  north: number; south: number; east: number; west: number;
} {
  let allPoints: GeoPoint[];
  if (boundary.type === 'Polygon') {
    allPoints = boundary.coordinates[0] as GeoPoint[];
  } else {
    allPoints = (boundary.coordinates as GeoPoint[][][]).flat(2) as GeoPoint[];
  }

  return {
    north: Math.max(...allPoints.map((p: GeoPoint) => p.lat)),
    south: Math.min(...allPoints.map((p: GeoPoint) => p.lat)),
    east: Math.max(...allPoints.map((p: GeoPoint) => p.lng)),
    west: Math.min(...allPoints.map((p: GeoPoint) => p.lng)),
  };
}

export function simplifyBoundary(points: GeoPoint[], tolerance: number = 0.0001): GeoPoint[] {
  if (points.length <= 3) return points;
  const result: GeoPoint[] = [points[0]];
  let lastKept = points[0];

  for (let i = 1; i < points.length - 1; i++) {
    const dist = Math.sqrt(
      (points[i].lat - lastKept.lat) ** 2 + (points[i].lng - lastKept.lng) ** 2
    );
    if (dist >= tolerance) {
      result.push(points[i]);
      lastKept = points[i];
    }
  }

  result.push(points[points.length - 1]);
  return result;
}

export function validateBoundary(points: GeoPoint[]): { valid: boolean; error?: string } {
  if (points.length < 3) return { valid: false, error: 'Boundary must have at least 3 points' };
  const first = points[0];
  const last = points[points.length - 1];
  if (first.lat !== last.lat || first.lng !== last.lng) {
    return { valid: false, error: 'Boundary must be closed (first and last points must match)' };
  }
  return { valid: true };
}
