import { CRSDetector, CoordinateEvidenceDetail, CrsConfidence } from "./contracts";
import type { CrsKind, Point } from "@/lib/geo/contracts";
import { readUtmDeclaration } from "@/lib/geo/crs";
import {
  isValidUtmZone,
  parseUtmEpsgCode,
  utmToWgs84Result,
  utmZoneForLongitude,
  type Hemisphere,
} from "@/lib/geo/utm";
import { parseDecimalLatLon, parseDmsLatLon } from "@/lib/geo/coordinate-parsing";

export interface CrsDetection {
  kind: CrsKind;
  zone?: number;
  northernHemisphere: boolean;
  confidence: CrsConfidence;
  epsgHints: number[];
  datumHints: string[];
  zoneHints: string[];
  reason: string;
  /** True only when the document itself states the zone. */
  zoneDeclared?: boolean;
  /** True only when the document itself states the hemisphere. */
  hemisphereDeclared?: boolean;
}

const EPSG_PATTERN = /EPSG\s*[:#]?\s*(\d{4,6})/gi;
const DATUM_PATTERNS: readonly { name: string; re: RegExp }[] = [
  { name: "WGS84", re: /WGS\s*84|WGS84|EPSG:4326/gi },
  { name: "Ain el Abd", re: /Ain\s*el\s*Abd|AinElAbd|AIN_EL_ABD/i },
  { name: "Ain el Abd 1970", re: /Ain\s*el\s*Abd\s*1970/i },
  { name: "GCS", re: /\bGCS\b/i },
  { name: "NAD83", re: /NAD\s*83/i },
  { name: "NAD27", re: /NAD\s*27/i },
  { name: "ETRS89", re: /ETRS\s*89/i },
  { name: "GDA94", re: /GDA\s*94/i },
  { name: "GDA2020", re: /GDA\s*2020/i },
  { name: "SIRGAS2000", re: /SIRGAS\s*2000/i },
];
const ZONE_PATTERN = /(?:UTM|Zone|zone|نطاق|زون)\s*[:：\-]?\s*(\d{1,2})(?!\d)/i;
// Same-line, uppercase caption letters only: a lowercase OCR fragment such as
// "27 n>" from a Turkish sheet's prose must never read as a zone caption.
const ZONE_WITH_LETTER_PATTERN = /(?:UTM|MGRS)?[ \t]*(?<!\d)(\d{1,2})[ \t]?([NS])(?![\p{L}\p{N}])/u;

export class CrsDetector implements CRSDetector {
  readonly name = "crs-detector";

  detect(text: string, evidence: CoordinateEvidenceDetail[]): CrsDetection {
    const epsgHints = this.collectEpsg(text);
    const datumHints = this.collectDatums(text);
    const zoneHints = this.collectZones(text);
    const utmEvidence = evidence.find((e) => e.crsHint === "utm" || /^\d{1,2}[NSEW]\s*\d{5,}/i.test(e.raw.trim()));
    const wgs84Evidence = evidence.filter((e) => e.crsHint === "wgs84");

    // An explicit UTM/WGS84 EPSG code fixes both the zone and the hemisphere,
    // anywhere from EPSG:32601 to EPSG:32760.
    const epsgUtm = epsgHints.map((code) => parseUtmEpsgCode(code)).find(Boolean);
    if (epsgUtm) {
      return {
        kind: "utm",
        zone: epsgUtm.zone,
        northernHemisphere: epsgUtm.hemisphere === "N",
        confidence: "DETECTED",
        epsgHints,
        datumHints,
        zoneHints,
        reason: `EPSG:${epsgUtm.hemisphere === "N" ? 32600 + epsgUtm.zone : 32700 + epsgUtm.zone} declares UTM zone ${epsgUtm.zone}${epsgUtm.hemisphere}`,
        zoneDeclared: true,
        hemisphereDeclared: true,
      };
    }

    if (utmEvidence || /^\s*\d{1,2}[NSEW]\s*\d{5,}/i.test(text)) {
      const declaration = readUtmDeclaration(utmEvidence?.raw ?? text);
      const zoneMatch = (utmEvidence?.raw ?? text).match(ZONE_WITH_LETTER_PATTERN);
      const zone = declaration.zone ?? (zoneMatch ? parseInt(zoneMatch[1], 10) : undefined);
      const validZone = isValidUtmZone(zone);
      const hemisphere: Hemisphere | undefined = declaration.hemisphere
        ?? (zoneMatch && /[NSns]/.test(zoneMatch[2]) ? (zoneMatch[2].toUpperCase() as Hemisphere) : undefined);
      return {
        kind: "utm",
        zone: validZone ? zone : undefined,
        northernHemisphere: hemisphere !== "S",
        confidence: validZone ? "DETECTED" : "PROBABLE",
        epsgHints,
        datumHints,
        zoneHints,
        reason: "UTM coordinate format with zone letter detected",
        zoneDeclared: validZone,
        hemisphereDeclared: hemisphere !== undefined,
      };
    }

    if (zoneHints.length > 0 && wgs84Evidence.length === 0) {
      const declaration = readUtmDeclaration(text);
      const zone = declaration.zone ?? parseInt(zoneHints[0], 10);
      return {
        kind: "utm",
        zone,
        northernHemisphere: declaration.hemisphere !== "S",
        confidence: "PROBABLE",
        epsgHints,
        datumHints,
        zoneHints,
        reason: `UTM zone ${zone} hinted in text`,
        zoneDeclared: true,
        hemisphereDeclared: declaration.hemisphere !== undefined,
      };
    }

    const epsg4326 = epsgHints.includes(4326);
    const wgs84 = datumHints.some((d) => d.includes("WGS84"));
    const gcs = datumHints.some((d) => d.includes("GCS"));

    if (epsg4326 || (wgs84 && gcs)) {
      return {
        kind: "wgs84",
        northernHemisphere: true,
        confidence: "DETECTED",
        epsgHints,
        datumHints,
        zoneHints,
        reason: "WGS84 / EPSG:4326 declared explicitly",
      };
    }

    if (/\b(GCS|WGS\s*84|Latitude|Longitude|خط العرض|خط الطول)\b/i.test(text)) {
      return {
        kind: "wgs84",
        northernHemisphere: true,
        confidence: "DETECTED",
        epsgHints,
        datumHints,
        zoneHints,
        reason: "WGS84 lat/lon markers present",
      };
    }

    if (/(\d|°|º|'|"|′|″)\s*[NSEWnsew]\b/.test(text)) {
      return {
        kind: "wgs84",
        northernHemisphere: true,
        confidence: "PROBABLE",
        epsgHints,
        datumHints,
        zoneHints,
        reason: "DMS-style coordinates with hemisphere letters",
      };
    }

    if (/(-?\d{1,3}\.\d{3,15})\s*[,;/\s]\s*(-?\d{1,3}\.\d{3,15})/.test(text) || evidence.length > 0) {
      return {
        kind: "wgs84",
        northernHemisphere: true,
        confidence: "AMBIGUOUS",
        epsgHints,
        datumHints,
        zoneHints,
        reason: "Coordinate pairs found but no explicit CRS declaration",
      };
    }

    return {
      kind: "unknown",
      northernHemisphere: true,
      confidence: "UNKNOWN",
      epsgHints,
      datumHints,
      zoneHints,
      reason: "No CRS indicators found",
    };
  }

  private collectEpsg(text: string): number[] {
    const hints: number[] = [];
    for (const match of text.matchAll(EPSG_PATTERN)) {
      const code = parseInt(match[1], 10);
      if (!hints.includes(code)) hints.push(code);
    }
    return hints;
  }

  private collectDatums(text: string): string[] {
    const found: string[] = [];
    for (const { name, re } of DATUM_PATTERNS) {
      if (re.test(text) && !found.includes(name)) found.push(name);
    }
    return found;
  }

  private collectZones(text: string): string[] {
    const found: string[] = [];
    const add = (zone: string) => {
      const z = parseInt(zone, 10);
      if (z >= 1 && z <= 60 && !found.includes(zone)) found.push(zone);
    };
    const direct = text.match(ZONE_WITH_LETTER_PATTERN);
    if (direct) {
      add(direct[1]);
    }
    const match = text.match(ZONE_PATTERN);
    if (match) {
      add(match[1]);
    }
    return found;
  }
}

export const LAND_CRS_DETECTOR: CRSDetector = new CrsDetector();

/**
 * Converts one piece of coordinate evidence to WGS84.
 *
 * UTM rows use the zone and hemisphere the caller resolved (document, EPSG, or
 * user choice); nothing is assumed when they are missing.
 */
export function toWgs84Point(
  raw: string,
  format: string,
  crsKind: CrsKind,
  zone?: number,
  northernHemisphere = true,
): Point | null {
  if (format === "utm" || crsKind === "utm") {
    const match = /(\d{1,2})\s*([NSns])\s*(\d{5,6}(?:\.\d+)?)\s*[,;\s]\s*(\d{6,7}(?:\.\d+)?)/i.exec(raw);
    if (!match) return null;
    const parsedZone = zone ?? parseInt(match[1], 10);
    if (!isValidUtmZone(parsedZone)) return null;
    const rowHemisphere: Hemisphere = match[2].toUpperCase() === "S" ? "S" : "N";
    const hemisphere: Hemisphere = northernHemisphere === undefined
      ? rowHemisphere
      : northernHemisphere
        ? "N"
        : "S";
    const easting = parseFloat(match[3]);
    const northing = parseFloat(match[4]);
    const result = utmToWgs84Result(easting, northing, parsedZone, hemisphere);
    return result.ok ? result.value : null;
  }

  if (format === "dms") {
    return parseDmsLatLon(raw);
  }

  if (format === "decimal") {
    return parseDecimalLatLon(raw);
  }

  return null;
}

/**
 * UTM -> WGS84 for any zone and hemisphere. Returns null instead of a fabricated
 * point when the inputs cannot be projected.
 */
export function convertWithProj4(
  easting: number,
  northing: number,
  zone: number,
  northernHemisphere = true,
): Point {
  const result = utmToWgs84Result(easting, northing, zone, northernHemisphere ? "N" : "S");
  return result.ok ? result.value : { lat: Number.NaN, lon: Number.NaN };
}

export function inferZoneFromLon(lon: number): number {
  return utmZoneForLongitude(lon);
}
