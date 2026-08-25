import proj4 from "proj4";

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface UtmCoordinate {
  zone: number;
  hemisphere: "N" | "S";
  easting: number;
  northing: number;
}

export interface DmsCoordinate {
  degrees: number;
  minutes: number;
  seconds: number;
  direction: "N" | "S" | "E" | "W";
}

export type ParsedSource = "decimal" | "dms" | "utm";

export interface ParsedCoordinate {
  source: ParsedSource;
  lat: number;
  lng: number;
}

export interface ParseResult {
  type: "single" | "batch";
  coordinates: ParsedCoordinate[];
  errors: string[];
}

const WGS84 = "+proj=longlat +datum=WGS84 +no_defs";

function utmProj(zone: number, hemisphere: "N" | "S"): string {
  return `+proj=utm +zone=${zone} +${hemisphere === "N" ? "north" : "south"} +datum=WGS84 +units=m +no_defs`;
}

export function decimalToDms(decimal: number, isLat: boolean): DmsCoordinate {
  const abs = Math.abs(decimal);
  const degrees = Math.floor(abs);
  const minutesDecimal = (abs - degrees) * 60;
  const minutes = Math.floor(minutesDecimal);
  const seconds = Math.round((minutesDecimal - minutes) * 60 * 100) / 100;
  const direction = isLat ? (decimal >= 0 ? "N" : "S") : (decimal >= 0 ? "E" : "W");
  return { degrees, minutes, seconds, direction };
}

export function dmsToDecimal(dms: DmsCoordinate): number {
  const sign = dms.direction === "S" || dms.direction === "W" ? -1 : 1;
  return sign * (dms.degrees + dms.minutes / 60 + dms.seconds / 3600);
}

export function formatDms(dms: DmsCoordinate): string {
  return `${dms.degrees}° ${dms.minutes}' ${dms.seconds}" ${dms.direction}`;
}

export function utmToWgs84(zone: number, hemisphere: "N" | "S", easting: number, northing: number): Coordinate {
  const [lng, lat] = proj4(utmProj(zone, hemisphere), WGS84, [easting, northing]);
  return { lat, lng };
}

export function wgs84ToUtm(lat: number, lng: number, zone?: number): UtmCoordinate {
  const z = zone ?? Math.floor((lng + 180) / 6) + 1;
  const hemisphere: "N" | "S" = lat >= 0 ? "N" : "S";
  const [easting, northing] = proj4(WGS84, utmProj(z, hemisphere), [lng, lat]);
  return { zone: z, hemisphere, easting, northing };
}

export function validateCoordinate(lat: number, lng: number): { valid: boolean; message?: string } {
  if (isNaN(lat) || isNaN(lng)) return { valid: false, message: "Non-numeric value" };
  if (lat < -90 || lat > 90) return { valid: false, message: "Latitude out of range (-90 to 90)" };
  if (lng < -180 || lng > 180) return { valid: false, message: "Longitude out of range (-180 to 180)" };
  return { valid: true };
}

export function detectCoordinateFormat(text: string): { format: ParsedSource | "unknown"; confidence: number } {
  const trimmed = text.trim();
  const decimalPattern = /^-?\d+\.\d+\s*[,;\s]\s*-?\d+\.\d+$/;
  const dmsPattern = /(\d{1,3})\s*°\s*(\d{1,2})\s*'\s*([\d.]+)\s*"\s*[NSEW]/i;
  const utmPattern = /^(\d{1,2})\s*[NS]\s+([\d.]+)\s+([\d.]+)$/i;

  if (utmPattern.test(trimmed)) {
    const parts = trimmed.split(/\s+/);
    const easting = parseFloat(parts[1]);
    const northing = parseFloat(parts[2]);
    if (easting >= 100000 && easting <= 999999 && northing >= 0 && northing <= 10000000) {
      return { format: "utm", confidence: 0.85 };
    }
  }
  if (dmsPattern.test(trimmed)) return { format: "dms", confidence: 0.9 };
  if (decimalPattern.test(trimmed)) {
    const parts = trimmed.split(/[,;\s]+/);
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) return { format: "decimal", confidence: 0.95 };
  }
  return { format: "unknown", confidence: 0 };
}

function parseDmsToken(token: string): DmsCoordinate | null {
  const match = token.match(/(\d{1,3})\s*°\s*(\d{1,2})\s*'\s*([\d.]+)\s*"\s*([NSEW])/i);
  if (!match) return null;
  return {
    degrees: parseInt(match[1], 10),
    minutes: parseInt(match[2], 10),
    seconds: parseFloat(match[3]),
    direction: match[4].toUpperCase() as DmsCoordinate["direction"],
  };
}

export function parseCoordinates(text: string): ParseResult {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const coordinates: ParsedCoordinate[] = [];
  const errors: string[] = [];

  for (const line of lines) {
    const detected = detectCoordinateFormat(line);

    if (detected.format === "utm") {
      const match = line.match(/^(\d{1,2})\s*([NS])\s+([\d.]+)\s+([\d.]+)$/i);
      if (match) {
        const zone = parseInt(match[1], 10);
        const hemisphere = match[2].toUpperCase() as "N" | "S";
        const { lat, lng } = utmToWgs84(zone, hemisphere, parseFloat(match[3]), parseFloat(match[4]));
        if (validateCoordinate(lat, lng).valid) {
          coordinates.push({ source: "utm", lat, lng });
        } else {
          errors.push(line);
        }
      }
      continue;
    }

    if (detected.format === "dms") {
      const tokens = Array.from(line.matchAll(/(\d{1,3})\s*°\s*(\d{1,2})\s*'\s*([\d.]+)\s*"\s*([NSEW])/gi));
      const dmsLat = tokens[0] ? parseDmsToken(tokens[0][0]) : null;
      const dmsLng = tokens[1] ? parseDmsToken(tokens[1][0]) : null;
      if (dmsLat && dmsLng) {
        coordinates.push({ source: "dms", lat: dmsToDecimal(dmsLat), lng: dmsToDecimal(dmsLng) });
      } else {
        errors.push(line);
      }
      continue;
    }

    if (detected.format === "decimal") {
      const parts = line.split(/[,;\s]+/);
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      if (validateCoordinate(lat, lng).valid) {
        coordinates.push({ source: "decimal", lat, lng });
      } else {
        errors.push(line);
      }
      continue;
    }

    errors.push(line);
  }

  return { type: coordinates.length === 1 ? "single" : "batch", coordinates, errors };
}
