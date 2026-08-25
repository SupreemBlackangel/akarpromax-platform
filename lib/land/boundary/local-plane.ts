/**
 * Local survey plane.
 *
 * Parcel geometry is measured the way a surveyor measures it: on a plane
 * tangent to the ellipsoid at the parcel itself. A transverse Mercator centred
 * on the parcel centroid with a unit scale factor has essentially no distortion
 * within a few kilometres, so lengths and areas computed on it are exact to the
 * millimetre — far better than a spherical approximation, and without the
 * varying grid scale factor of a fixed UTM zone.
 */
import proj4 from "proj4";
import type { Point } from "@/lib/geo/contracts";
import { WGS84_PROJ4 } from "@/lib/geo/utm";

/** Beyond this extent a single tangent plane is no longer distortion-free. */
export const LOCAL_PLANE_SAFE_EXTENT_METERS = 50_000;

export interface PlaneCoordinate {
  x: number;
  y: number;
}

export interface LocalPlane {
  origin: Point;
  definition: string;
  /** Largest distance from the origin to any projected point, in metres. */
  extentMeters: number;
  /** True when the parcel is small enough for the plane to be distortion-free. */
  withinSafeExtent: boolean;
  coordinates: PlaneCoordinate[];
}

function centroidOf(points: readonly Point[]): Point {
  const lat = points.reduce((sum, point) => sum + point.lat, 0) / points.length;
  const lon = points.reduce((sum, point) => sum + point.lon, 0) / points.length;
  return { lat, lon };
}

export function localPlaneDefinition(origin: Point): string {
  return `+proj=tmerc +lat_0=${origin.lat} +lon_0=${origin.lon} +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs +type=crs`;
}

/** Projects a parcel's vertices onto a plane centred on the parcel. */
export function buildLocalPlane(points: readonly Point[]): LocalPlane | null {
  if (points.length === 0) return null;
  const origin = centroidOf(points);
  const definition = localPlaneDefinition(origin);

  const coordinates: PlaneCoordinate[] = [];
  for (const point of points) {
    try {
      const [x, y] = proj4(WGS84_PROJ4, definition, [point.lon, point.lat]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      coordinates.push({ x, y });
    } catch {
      return null;
    }
  }

  const extentMeters = coordinates.reduce((max, c) => Math.max(max, Math.hypot(c.x, c.y)), 0);
  return {
    origin,
    definition,
    extentMeters,
    withinSafeExtent: extentMeters <= LOCAL_PLANE_SAFE_EXTENT_METERS,
    coordinates,
  };
}

export function planeDistance(a: PlaneCoordinate, b: PlaneCoordinate): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Azimuth from `a` to `b`, in degrees clockwise from north. */
export function planeBearing(a: PlaneCoordinate, b: PlaneCoordinate): number {
  const angle = (Math.atan2(b.x - a.x, b.y - a.y) * 180) / Math.PI;
  return (angle + 360) % 360;
}

/** Signed shoelace area. Positive is counter-clockwise on the plane. */
export function signedPlaneArea(ring: readonly PlaneCoordinate[]): number {
  if (ring.length < 3) return 0;
  let twice = 0;
  for (let index = 0; index < ring.length; index += 1) {
    const current = ring[index];
    const next = ring[(index + 1) % ring.length];
    twice += current.x * next.y - next.x * current.y;
  }
  return twice / 2;
}

export function planeArea(ring: readonly PlaneCoordinate[]): number {
  return Math.abs(signedPlaneArea(ring));
}

/** Distance between two WGS84 points, measured on their own local plane. */
export function geodesicDistanceMeters(a: Point, b: Point): number | null {
  const plane = buildLocalPlane([a, b]);
  if (!plane) return null;
  return planeDistance(plane.coordinates[0], plane.coordinates[1]);
}
