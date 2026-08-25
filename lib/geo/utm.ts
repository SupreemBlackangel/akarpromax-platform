/**
 * Global UTM / WGS84 coordinate engine.
 *
 * Single abstraction for the whole product: `zone + hemisphere -> CRS`.
 * All 120 UTM/WGS84 CRSs are covered by one code path:
 *
 *   Northern hemisphere  EPSG:32601 .. EPSG:32660   (UTM 1N .. 60N)
 *   Southern hemisphere  EPSG:32701 .. EPSG:32760   (UTM 1S .. 60S)
 *
 * Nothing here is country specific. Saudi Arabia is one supported use case,
 * not a boundary of the system, so there is no default zone and no fallback
 * projection: an unknown zone is reported as unknown instead of guessed.
 */
import proj4 from "proj4";
import type { Point } from "./contracts";

export type Hemisphere = "N" | "S";

export const UTM_ZONE_MIN = 1;
export const UTM_ZONE_MAX = 60;

/** Standard UTM validity band. Outside it, UTM is not defined (UPS is used). */
export const UTM_LATITUDE_MIN = -80;
export const UTM_LATITUDE_MAX = 84;

/** EPSG bases for WGS84 / UTM. */
export const UTM_NORTH_EPSG_BASE = 32600;
export const UTM_SOUTH_EPSG_BASE = 32700;

export const WGS84_EPSG = 4326;
export const WGS84_PROJ4 = "+proj=longlat +datum=WGS84 +no_defs";

/** Conventional UTM easting/northing envelopes, used for evidence validation. */
export const UTM_EASTING_MIN = 100_000;
export const UTM_EASTING_MAX = 900_000;
export const UTM_NORTHING_MIN = 0;
export const UTM_NORTHING_MAX = 10_000_000;

export interface UtmCoordinate {
  zone: number;
  hemisphere: Hemisphere;
  easting: number;
  northing: number;
  epsg: number;
}

export interface UtmConversionFailure {
  reason:
    | "INVALID_LATITUDE"
    | "INVALID_LONGITUDE"
    | "OUTSIDE_UTM_LATITUDE_BAND"
    | "INVALID_ZONE"
    | "INVALID_HEMISPHERE"
    | "INVALID_EASTING"
    | "INVALID_NORTHING"
    | "PROJECTION_FAILED";
}

export type UtmForwardResult =
  | { ok: true; value: UtmCoordinate }
  | ({ ok: false } & UtmConversionFailure);

export type UtmInverseResult =
  | { ok: true; value: Point }
  | ({ ok: false } & UtmConversionFailure);

export function isValidUtmZone(zone: unknown): zone is number {
  return (
    typeof zone === "number"
    && Number.isInteger(zone)
    && zone >= UTM_ZONE_MIN
    && zone <= UTM_ZONE_MAX
  );
}

export function isHemisphere(value: unknown): value is Hemisphere {
  return value === "N" || value === "S";
}

export function isValidLatitude(lat: unknown): lat is number {
  return typeof lat === "number" && Number.isFinite(lat) && lat >= -90 && lat <= 90;
}

export function isValidLongitude(lon: unknown): lon is number {
  return typeof lon === "number" && Number.isFinite(lon) && lon >= -180 && lon <= 180;
}

/** True when the latitude falls inside the band where UTM is defined. */
export function isWithinUtmLatitudeBand(lat: number): boolean {
  return Number.isFinite(lat) && lat >= UTM_LATITUDE_MIN && lat < UTM_LATITUDE_MAX;
}

/** EPSG code for a WGS84 UTM CRS. Throws only on programmer error. */
export function utmEpsgCode(zone: number, hemisphere: Hemisphere): number {
  if (!isValidUtmZone(zone)) throw new RangeError(`UTM zone out of range: ${zone}`);
  if (!isHemisphere(hemisphere)) throw new RangeError(`Invalid hemisphere: ${hemisphere}`);
  return (hemisphere === "N" ? UTM_NORTH_EPSG_BASE : UTM_SOUTH_EPSG_BASE) + zone;
}

/** Inverse of {@link utmEpsgCode}; returns null for any non UTM/WGS84 code. */
export function parseUtmEpsgCode(code: number): { zone: number; hemisphere: Hemisphere } | null {
  if (!Number.isInteger(code)) return null;
  for (const [base, hemisphere] of [
    [UTM_NORTH_EPSG_BASE, "N"],
    [UTM_SOUTH_EPSG_BASE, "S"],
  ] as const) {
    const zone = code - base;
    if (isValidUtmZone(zone)) return { zone, hemisphere };
  }
  return null;
}

/** proj4 definition string for one of the 120 UTM/WGS84 CRSs. */
export function utmProj4Definition(zone: number, hemisphere: Hemisphere): string {
  if (!isValidUtmZone(zone)) throw new RangeError(`UTM zone out of range: ${zone}`);
  if (!isHemisphere(hemisphere)) throw new RangeError(`Invalid hemisphere: ${hemisphere}`);
  const south = hemisphere === "S" ? " +south" : "";
  return `+proj=utm +zone=${zone}${south} +datum=WGS84 +units=m +no_defs +type=crs`;
}

/** Central meridian of a UTM zone, in degrees. */
export function utmCentralMeridian(zone: number): number {
  if (!isValidUtmZone(zone)) throw new RangeError(`UTM zone out of range: ${zone}`);
  return zone * 6 - 183;
}

/** Normalises any longitude into [-180, 180). */
export function normalizeLongitude(lon: number): number {
  if (!Number.isFinite(lon)) return Number.NaN;
  const wrapped = ((lon + 180) % 360 + 360) % 360 - 180;
  return Object.is(wrapped, -0) ? 0 : wrapped;
}

/** Plain 6-degree zone for a longitude, ignoring the regional exceptions. */
export function utmZoneForLongitude(lon: number): number {
  const normalized = normalizeLongitude(lon);
  if (!Number.isFinite(normalized)) return Number.NaN;
  return Math.min(UTM_ZONE_MAX, Math.max(UTM_ZONE_MIN, Math.floor((normalized + 180) / 6) + 1));
}

/**
 * Zone for a point, honouring the two standard exceptions defined by the UTM
 * specification: the widened zone 32 over south-west Norway, and the four
 * widened zones over Svalbard.
 */
export function utmZoneForPoint(lat: number, lon: number): number {
  const normalized = normalizeLongitude(lon);
  let zone = utmZoneForLongitude(normalized);

  // South-west Norway: zone 32 is widened westward.
  if (lat >= 56 && lat < 64 && normalized >= 3 && normalized < 12) zone = 32;

  // Svalbard: zones 31/33/35/37 are widened, 32/34/36 are not used.
  if (lat >= 72 && lat < 84) {
    if (normalized >= 0 && normalized < 9) zone = 31;
    else if (normalized >= 9 && normalized < 21) zone = 33;
    else if (normalized >= 21 && normalized < 33) zone = 35;
    else if (normalized >= 33 && normalized < 42) zone = 37;
  }

  return zone;
}

export function hemisphereForLatitude(lat: number): Hemisphere {
  return lat < 0 ? "S" : "N";
}

export function isPlausibleUtmEasting(easting: number): boolean {
  return Number.isFinite(easting) && easting >= UTM_EASTING_MIN && easting <= UTM_EASTING_MAX;
}

export function isPlausibleUtmNorthing(northing: number): boolean {
  return Number.isFinite(northing) && northing >= UTM_NORTHING_MIN && northing <= UTM_NORTHING_MAX;
}

/**
 * WGS84 -> UTM. Returns a failure (never a guess) when the point lies outside
 * the UTM latitude band or when an explicitly requested zone is invalid.
 */
export function wgs84ToUtmResult(
  lat: number,
  lon: number,
  options: { zone?: number; hemisphere?: Hemisphere } = {},
): UtmForwardResult {
  if (!isValidLatitude(lat)) return { ok: false, reason: "INVALID_LATITUDE" };
  if (!isValidLongitude(lon)) return { ok: false, reason: "INVALID_LONGITUDE" };
  if (options.zone !== undefined && !isValidUtmZone(options.zone)) {
    return { ok: false, reason: "INVALID_ZONE" };
  }
  if (options.hemisphere !== undefined && !isHemisphere(options.hemisphere)) {
    return { ok: false, reason: "INVALID_HEMISPHERE" };
  }
  if (!isWithinUtmLatitudeBand(lat)) {
    return { ok: false, reason: "OUTSIDE_UTM_LATITUDE_BAND" };
  }

  const zone = options.zone ?? utmZoneForPoint(lat, lon);
  const hemisphere = options.hemisphere ?? hemisphereForLatitude(lat);

  try {
    const [easting, northing] = proj4(WGS84_PROJ4, utmProj4Definition(zone, hemisphere), [lon, lat]);
    if (!Number.isFinite(easting) || !Number.isFinite(northing)) {
      return { ok: false, reason: "PROJECTION_FAILED" };
    }
    return { ok: true, value: { zone, hemisphere, easting, northing, epsg: utmEpsgCode(zone, hemisphere) } };
  } catch {
    return { ok: false, reason: "PROJECTION_FAILED" };
  }
}

/** Convenience wrapper returning null instead of a failure object. */
export function wgs84ToUtm(
  lat: number,
  lon: number,
  options: { zone?: number; hemisphere?: Hemisphere } = {},
): UtmCoordinate | null {
  const result = wgs84ToUtmResult(lat, lon, options);
  return result.ok ? result.value : null;
}

/**
 * UTM -> WGS84 for any of the 120 CRSs. Easting/northing are range-checked
 * before projecting so an arbitrary number pair cannot become a map pin.
 */
export function utmToWgs84Result(
  easting: number,
  northing: number,
  zone: number,
  hemisphere: Hemisphere,
): UtmInverseResult {
  if (!isValidUtmZone(zone)) return { ok: false, reason: "INVALID_ZONE" };
  if (!isHemisphere(hemisphere)) return { ok: false, reason: "INVALID_HEMISPHERE" };
  if (!Number.isFinite(easting)) return { ok: false, reason: "INVALID_EASTING" };
  if (!Number.isFinite(northing)) return { ok: false, reason: "INVALID_NORTHING" };

  try {
    const [lon, lat] = proj4(utmProj4Definition(zone, hemisphere), WGS84_PROJ4, [easting, northing]);
    if (!isValidLatitude(lat) || !isValidLongitude(lon)) {
      return { ok: false, reason: "PROJECTION_FAILED" };
    }
    return { ok: true, value: { lat, lon } };
  } catch {
    return { ok: false, reason: "PROJECTION_FAILED" };
  }
}

/** Convenience wrapper returning null instead of a failure object. */
export function utmToWgs84(
  easting: number,
  northing: number,
  zone: number,
  hemisphere: Hemisphere,
): Point | null {
  const result = utmToWgs84Result(easting, northing, zone, hemisphere);
  return result.ok ? result.value : null;
}

/**
 * Every UTM/WGS84 CRS, north then south. Used by the all-zone regression sweep
 * and by any UI that offers the full zone list.
 */
export function listUtmCrs(): { zone: number; hemisphere: Hemisphere; epsg: number }[] {
  const all: { zone: number; hemisphere: Hemisphere; epsg: number }[] = [];
  for (const hemisphere of ["N", "S"] as const) {
    for (let zone = UTM_ZONE_MIN; zone <= UTM_ZONE_MAX; zone += 1) {
      all.push({ zone, hemisphere, epsg: utmEpsgCode(zone, hemisphere) });
    }
  }
  return all;
}

/** Canonical label, e.g. `39N`. */
export function formatUtmZone(zone: number, hemisphere: Hemisphere): string {
  return `${zone}${hemisphere}`;
}

/**
 * Projects a set of WGS84 points into one shared UTM zone so a parcel that
 * straddles a zone boundary is not split across two grids.
 */
export function projectPointsToSharedUtm(
  points: readonly Point[],
  options: { zone?: number; hemisphere?: Hemisphere } = {},
): {
  zone: number;
  hemisphere: Hemisphere;
  epsg: number;
  rows: { easting: number; northing: number }[];
  outOfBand: boolean;
} | null {
  if (points.length === 0) return null;
  const usable = points.filter((point) => isValidLatitude(point.lat) && isValidLongitude(point.lon));
  if (usable.length === 0) return null;

  const outOfBand = usable.some((point) => !isWithinUtmLatitudeBand(point.lat));
  if (outOfBand && options.zone === undefined) return null;

  const meanLat = usable.reduce((sum, point) => sum + point.lat, 0) / usable.length;
  const meanLon = usable.reduce((sum, point) => sum + point.lon, 0) / usable.length;
  const zone = options.zone ?? utmZoneForPoint(meanLat, meanLon);
  const hemisphere = options.hemisphere ?? hemisphereForLatitude(meanLat);
  if (!isValidUtmZone(zone) || !isHemisphere(hemisphere)) return null;

  const rows: { easting: number; northing: number }[] = [];
  for (const point of usable) {
    const projected = wgs84ToUtmResult(point.lat, point.lon, { zone, hemisphere });
    if (!projected.ok) return null;
    rows.push({ easting: projected.value.easting, northing: projected.value.northing });
  }

  return { zone, hemisphere, epsg: utmEpsgCode(zone, hemisphere), rows, outOfBand };
}
