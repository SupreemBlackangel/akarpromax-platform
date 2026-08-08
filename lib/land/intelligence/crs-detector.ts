import { CRSDetector, CoordinateEvidenceDetail, CrsConfidence } from "./contracts";
import type { CrsKind, Point } from "@/lib/geo/contracts";
import { convertUtmToWgs84, utmZoneFromLon } from "@/lib/geo/crs";
import proj4 from "proj4";

export interface CrsDetection {
  kind: CrsKind;
  zone?: number;
  northernHemisphere: boolean;
  confidence: CrsConfidence;
  epsgHints: number[];
  datumHints: string[];
  zoneHints: string[];
  reason: string;
}

const EPSG_PATTERN = /EPSG\s*[:#]?\s*(\d{4,6})/gi;
const DATUM_PATTERNS: readonly { name: string; re: RegExp }[] = [
  { name: "WGS84", re: /WGS\s*84|WGS84|EPSG:4326/gi },
  { name: "Ain el Abd", re: /Ain\s*el\s*Abd|AinElAbd|AIN_EL_ABD/i },
  { name: "Ain el Abd 1970", re: /Ain\s*el\s*Abd\s*1970/i },
  { name: "GCS", re: /\bGCS\b/i },
  { name: "NAD83", re: /NAD\s*83/i },
  { name: "NAD27", re: /NAD\s*27/i },
];
const ZONE_PATTERN = /(?:UTM|Zone|zone|نطاق|زون|النطاق)\s*[:：\-]?\s*(\d{1,2})/i;
const ZONE_WITH_LETTER_PATTERN = /(?:UTM|MGRS)?\s*(\d{1,2})\s*([NSEWnsew])/;

export class CrsDetector implements CRSDetector {
  readonly name = "crs-detector";

  detect(text: string, evidence: CoordinateEvidenceDetail[]): CrsDetection {
    const epsgHints = this.collectEpsg(text);
    const datumHints = this.collectDatums(text);
    const zoneHints = this.collectZones(text);
    const utmEvidence = evidence.find((e) => e.crsHint === "utm" || /^\d{1,2}[NSEW]\s*\d{5,}/i.test(e.raw.trim()));

    if (utmEvidence || /^\s*\d{1,2}[NSEW]\s*\d{5,}/i.test(text)) {
      const zoneMatch = (utmEvidence?.raw ?? text).match(ZONE_WITH_LETTER_PATTERN);
      const zone = zoneMatch ? parseInt(zoneMatch[1], 10) : undefined;
      const validZone = zone !== undefined && zone >= 1 && zone <= 60;
      const northernHemisphere = zoneMatch ? zoneMatch[2].toUpperCase() !== "S" : true;
      return {
        kind: "utm",
        zone: validZone ? zone : undefined,
        northernHemisphere,
        confidence: validZone ? "DETECTED" : "PROBABLE",
        epsgHints,
        datumHints,
        zoneHints,
        reason: "UTM coordinate format with zone letter detected",
      };
    }

    if (zoneHints.length > 0) {
      const zone = parseInt(zoneHints[0], 10);
      return {
        kind: "utm",
        zone,
        northernHemisphere: true,
        confidence: "PROBABLE",
        epsgHints,
        datumHints,
        zoneHints,
        reason: `UTM zone ${zone} hinted in text`,
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

    if (/(-?\d{1,2}\.\d{3,7})\s*[,;/\s]\s*(-?\d{1,3}\.\d{3,7})/.test(text) || evidence.length > 0) {
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

export function toWgs84Point(
  raw: string,
  format: string,
  crsKind: CrsKind,
  zone?: number,
  northernHemisphere = true,
): Point | null {
  if (format === "utm" || crsKind === "utm") {
    const match = /(\d{1,2})\s*([NSEWnsew])\s*(\d{5,6}(?:\.\d+)?)\s*[,;\s]\s*(\d{6,7}(?:\.\d+)?)/i.exec(raw);
    if (!match) return null;
    const z = zone ?? parseInt(match[1], 10);
    const hem = match[2].toUpperCase() !== "S";
    const easting = parseFloat(match[3]);
    const northing = parseFloat(match[4]);
    return convertUtmToWgs84(z, easting, northing, northernHemisphere ?? hem);
  }

  if (format === "dms") {
    const re =
      /(\d{1,2})\s*[°ºo]\s*(\d{1,2}(?:\.\d+)?)?\s*['′']\s*(\d{1,2}(?:\.\d+)?)?\s*["″"]?\s*([NSEWnsew])/g;
    const matches = Array.from(raw.matchAll(re));
    const latMatch = matches.find((m) => /[NSns]/.test(m[4]));
    const lonMatch = matches.find((m) => /[EWew]/.test(m[4]));
    if (!latMatch || !lonMatch) return null;
    const parse = (m: RegExpMatchArray): number => {
      const deg = parseInt(m[1], 10);
      const min = m[2] ? parseFloat(m[2]) : 0;
      const sec = m[3] ? parseFloat(m[3]) : 0;
      return deg + min / 60 + sec / 3600;
    };
    let lat = parse(latMatch);
    if (latMatch[4].toUpperCase() === "S") lat = -lat;
    let lon = parse(lonMatch);
    if (lonMatch[4].toUpperCase() === "W") lon = -lon;
    return { lat, lon };
  }

  if (format === "decimal") {
    const re = /(-?\d{1,2}(?:\.\d{2,7})?)\s*[,;/\s]\s*(-?\d{1,3}(?:\.\d{2,7})?)/;
    const match = re.exec(raw);
    if (!match) return null;
    let lat = parseFloat(match[1]);
    let lon = parseFloat(match[2]);
    if (Math.abs(lat) > 90) {
      const tmp = lat;
      lat = lon;
      lon = tmp;
    }
    return { lat, lon };
  }

  return null;
}

export function convertWithProj4(
  easting: number,
  northing: number,
  zone: number,
  northernHemisphere = true,
): Point {
  if (!northernHemisphere) {
    return convertUtmToWgs84(zone, easting, northing, false);
  }
  const utmDef = `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`;
  const wgs84 = "+proj=longlat +datum=WGS84 +no_defs";
  try {
    const [lng, lat] = proj4(utmDef, wgs84, [easting, northing]);
    return { lat, lon: lng };
  } catch {
    return convertUtmToWgs84(zone, easting, northing, true);
  }
}

export function inferZoneFromLon(lon: number): number {
  return utmZoneFromLon(lon);
}
