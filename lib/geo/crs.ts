import { CrsDetectionResult, CrsKind, Point } from "./contracts";
import {
  hemisphereForLatitude,
  isValidUtmZone,
  parseUtmEpsgCode,
  utmToWgs84Result,
  utmZoneForLongitude,
  type Hemisphere,
} from "./utm";
import { parseDecimalLatLon, parseDmsLatLon } from "./coordinate-parsing";

/**
 * Explicit CRS declarations, in the forms real survey documents use worldwide.
 * `EPSG:32639` and `UTM Zone 39N` and `Zone 39 N` all resolve to the same CRS.
 */
const EPSG_DECLARATION = /EPSG\s*[:#]?\s*(\d{4,6})/i;
// The zone-letter patterns are deliberately strict about shape: the digits and
// the letter must share a line, and the letter must be a bare uppercase N/S
// caption — not the first letter of a word in any script. Scanned documents
// put arbitrary fragments on their own lines ("...325\n1\nSör..."), and a
// newline-crossing match here once turned that fragment into "zone 1 S".
const UTM_ZONE_WITH_HEMISPHERE =
  /(?:UTM|MGRS|ZONE|النطاق|نطاق|زون)[ \t:#\-]*(?<!\d)(\d{1,2})[ \t]?([NS])(?![\p{L}\p{N}])/iu;
const BARE_ZONE_WITH_HEMISPHERE = /(?<![\d.])(\d{1,2})[ \t]?([NS])(?![\p{L}\p{N}])/u;
const UTM_ZONE_ONLY = /(?:UTM|ZONE|النطاق|نطاق|زون)[\s:#\-]*(?<!\d)(\d{1,2})(?!\d)/i;
const HEMISPHERE_WORD_SOUTH = /\b(?:SOUTHERN\s+HEMISPHERE|SOUTH\s+HEMISPHERE)\b|نصف\s*الكرة\s*الجنوبي/i;
const HEMISPHERE_WORD_NORTH = /\b(?:NORTHERN\s+HEMISPHERE|NORTH\s+HEMISPHERE)\b|نصف\s*الكرة\s*الشمالي/i;

export interface UtmDeclaration {
  zone?: number;
  hemisphere?: Hemisphere;
  epsg?: number;
  /** How the declaration was found; `EPSG` is the strongest signal. */
  via: "EPSG" | "ZONE_WITH_HEMISPHERE" | "ZONE_ONLY" | "NONE";
}

/**
 * Reads an explicit UTM declaration from free text. Never infers a zone from
 * anything other than what the document actually states.
 */
export function readUtmDeclaration(text: string): UtmDeclaration {
  const epsgMatch = EPSG_DECLARATION.exec(text);
  if (epsgMatch) {
    const parsed = parseUtmEpsgCode(Number.parseInt(epsgMatch[1], 10));
    if (parsed) {
      return { zone: parsed.zone, hemisphere: parsed.hemisphere, epsg: Number.parseInt(epsgMatch[1], 10), via: "EPSG" };
    }
  }

  const labelled = UTM_ZONE_WITH_HEMISPHERE.exec(text);
  if (labelled) {
    const zone = Number.parseInt(labelled[1], 10);
    if (isValidUtmZone(zone)) {
      return { zone, hemisphere: labelled[2].toUpperCase() as Hemisphere, via: "ZONE_WITH_HEMISPHERE" };
    }
  }

  const bare = BARE_ZONE_WITH_HEMISPHERE.exec(text);
  if (bare) {
    const zone = Number.parseInt(bare[1], 10);
    if (isValidUtmZone(zone)) {
      return { zone, hemisphere: bare[2].toUpperCase() as Hemisphere, via: "ZONE_WITH_HEMISPHERE" };
    }
  }

  const zoneOnly = UTM_ZONE_ONLY.exec(text);
  if (zoneOnly) {
    const zone = Number.parseInt(zoneOnly[1], 10);
    if (isValidUtmZone(zone)) {
      const hemisphere: Hemisphere | undefined = HEMISPHERE_WORD_SOUTH.test(text)
        ? "S"
        : HEMISPHERE_WORD_NORTH.test(text)
          ? "N"
          : undefined;
      return { zone, hemisphere, via: "ZONE_ONLY" };
    }
  }

  return { via: "NONE" };
}

export function detectCrs(input: string | { format: string; raw: string }): CrsDetectionResult {
  const raw = typeof input === "string" ? input : input.raw;
  const format = typeof input === "string" ? "" : input.format;
  const upper = raw.toUpperCase();
  const declaration = readUtmDeclaration(raw);

  if (declaration.via === "EPSG") {
    return {
      kind: "utm",
      zone: declaration.zone,
      northernHemisphere: declaration.hemisphere !== "S",
      reason: `EPSG:${declaration.epsg} UTM CRS declared`,
      confidence: 0.99,
    };
  }

  if (format === "utm" || /\bUTM\b|\bMGRS\b/.test(upper)) {
    return {
      kind: "utm",
      zone: declaration.zone,
      northernHemisphere: declaration.hemisphere !== "S",
      reason: "UTM zone + easting + northing present",
      confidence: declaration.zone !== undefined ? 0.95 : 0.6,
    };
  }

  if (/\b(GCS|WGS\s*84|WGS84|EPSG:4326|Latitude|Longitude|خط العرض|خط الطول)\b/i.test(upper)) {
    return {
      kind: "wgs84",
      northernHemisphere: true,
      reason: "WGS84/GCS declaration",
      confidence: 0.98,
    };
  }

  if (declaration.via === "ZONE_WITH_HEMISPHERE") {
    return {
      kind: "utm",
      zone: declaration.zone,
      northernHemisphere: declaration.hemisphere !== "S",
      reason: `UTM zone ${declaration.zone}${declaration.hemisphere ?? ""} declared`,
      confidence: 0.9,
    };
  }

  if (/(\d|°|º|'|"|′|″)\s*[NSEWnsew]\b/.test(upper)) {
    return {
      kind: "wgs84",
      northernHemisphere: true,
      reason: "DMS-style lat/lon with hemisphere letters",
      confidence: 0.8,
    };
  }

  const latLon = /-?\d{1,3}(?:\.\d{1,15})?[,\s]\s*-?\d{1,3}(?:\.\d{1,15})?/.exec(raw);
  if (latLon) {
    return {
      kind: "wgs84",
      northernHemisphere: true,
      reason: "decimal lat/lon pair",
      confidence: 0.7,
    };
  }

  return {
    kind: "unknown",
    northernHemisphere: true,
    reason: "No CRS indicators found",
    confidence: 0.1,
  };
}

export function detectCrsFromCoordinate(c: { format: string; raw: string }): CrsDetectionResult {
  return detectCrs(c);
}

/** 6-degree zone for a longitude. Kept for callers that only have a longitude. */
export function utmZoneFromLon(lon: number): number {
  return utmZoneForLongitude(lon);
}

/**
 * UTM -> WGS84 for any of the 120 WGS84/UTM CRSs, via proj4.
 *
 * A non-finite result is returned for an unusable input rather than a
 * plausible-looking guess, so downstream validation rejects it.
 */
export function convertUtmToWgs84(
  zone: number,
  easting: number,
  northing: number,
  northernHemisphere: boolean,
): Point {
  const result = utmToWgs84Result(easting, northing, zone, northernHemisphere ? "N" : "S");
  return result.ok ? result.value : { lat: Number.NaN, lon: Number.NaN };
}

export function toWgs84(c: { format: string; raw: string; crs?: CrsKind }): { point: Point; crs: CrsKind; source: string } | null {
  if (c.format === "decimal" && c.crs !== "utm") {
    const point = parseDecimalLatLon(c.raw);
    if (!point) return null;
    return { point, crs: "wgs84", source: c.raw };
  }

  if (c.format === "dms") {
    const point = parseDmsLatLon(c.raw);
    if (!point) return null;
    return { point, crs: "wgs84", source: c.raw };
  }

  if (c.format === "utm") {
    const match = /(\d{1,2})\s*([NSEWnsew])\s*(\d{5,6}(?:\.\d+)?)\s*[,;\s]\s*(\d{6,7}(?:\.\d+)?)/i.exec(c.raw);
    if (!match) return null;
    const zone = parseInt(match[1], 10);
    const hemisphere: Hemisphere = match[2].toUpperCase() === "S" ? "S" : "N";
    const easting = parseFloat(match[3]);
    const northing = parseFloat(match[4]);
    const result = utmToWgs84Result(easting, northing, zone, hemisphere);
    if (!result.ok) return null;
    return { point: result.value, crs: "wgs84", source: c.raw };
  }

  return null;
}

/** Hemisphere a latitude belongs to. Re-exported so callers need one import. */
export { hemisphereForLatitude };
