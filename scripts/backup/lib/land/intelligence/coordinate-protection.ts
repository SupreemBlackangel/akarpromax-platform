import type { Point } from "@/lib/geo/contracts";
import { isValidLat, isValidLon } from "@/lib/geo/geometry";
import { CountryDocumentAdapter } from "./contracts";

export interface ProtectedCoordinate {
  point: Point;
  orderConfidence: number;
  swapped: boolean;
  warnings: string[];
}

const ZERO_TOLERANCE = 0.000001;

export function protectCoordinateOrder(
  candidate: Point,
  countryAdapter: CountryDocumentAdapter,
): ProtectedCoordinate {
  const warnings: string[] = [];
  let lat = candidate.lat;
  let lon = candidate.lon;
  let swapped = false;

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    warnings.push("non-finite coordinate rejected");
    return { point: { lat: 0, lon: 0 }, orderConfidence: 0, swapped: false, warnings };
  }

  if (Math.abs(lat) < ZERO_TOLERANCE && Math.abs(lon) < ZERO_TOLERANCE) {
    warnings.push("zero coordinate rejected");
    return { point: { lat: 0, lon: 0 }, orderConfidence: 0, swapped: false, warnings };
  }

  let orderConfidence = 1;

  if (Math.abs(lat) > 90 && Math.abs(lon) <= 90) {
    const tmp = lat;
    lat = lon;
    lon = tmp;
    swapped = true;
    warnings.push("lat/lon order was swapped (range check)");
    orderConfidence = 0.6;
  }

  if (!isValidLat(lat) || !isValidLon(lon)) {
    warnings.push(`coordinate out of range lat=${lat} lon=${lon}`);
    return { point: { lat: 0, lon: 0 }, orderConfidence: 0, swapped, warnings };
  }

  if (Math.abs(lon) > 180) {
    warnings.push("longitude out of range");
    return { point: { lat: 0, lon: 0 }, orderConfidence: 0, swapped, warnings };
  }

  const plausible = countryAdapter.isPlausiblePoint({ lat, lon });
  if (!plausible) {
    warnings.push(`coordinate outside plausible ${countryAdapter.countryCode} bounds`);
    orderConfidence = Math.min(orderConfidence, 0.3);
  }

  return { point: { lat, lon }, orderConfidence, swapped, warnings };
}

export function isHallucinatedCoordinate(point: Point): boolean {
  return !(Number.isFinite(point.lat) && Number.isFinite(point.lon));
}
