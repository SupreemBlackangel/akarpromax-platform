/**
 * Reads the written boundary description of a parcel.
 *
 * Survey documents state the parcel twice: once as coordinates, and once in
 * words — "الحد الشمالي بطول 25.40 م" or "North boundary: 25.40 m". The written
 * form is independent evidence, and this module extracts it so the geometry
 * built from the coordinates can be checked against what the document claims.
 */
import { normalizeArabicDigits, normalizeArabicSeparators, normalizeNumericToken } from "./numerals";

export type CardinalDirection = "N" | "S" | "E" | "W";

export interface DocumentedSide {
  direction: CardinalDirection;
  /** Length in metres, as written in the document. */
  lengthMeters: number;
  raw: string;
}

export interface DocumentedSegment {
  /** Vertex label the segment starts at, e.g. `1` or `P1`. */
  from: string;
  to: string;
  lengthMeters?: number;
  bearingDegrees?: number;
  raw: string;
}

export interface ParsedBearing {
  /** Azimuth in degrees clockwise from north, 0–360. */
  degrees: number;
  raw: string;
}

export interface BoundaryDescription {
  sides: DocumentedSide[];
  segments: DocumentedSegment[];
  bearings: ParsedBearing[];
}

const DIRECTION_TOKENS: readonly { direction: CardinalDirection; patterns: readonly string[] }[] = [
  { direction: "N", patterns: ["الحد الشمالي", "الشمالي", "شمالا", "شمالاً", "يحده شمالا", "north boundary", "northern boundary", "north side", "north"] },
  { direction: "S", patterns: ["الحد الجنوبي", "الجنوبي", "جنوبا", "جنوباً", "يحده جنوبا", "south boundary", "southern boundary", "south side", "south"] },
  { direction: "E", patterns: ["الحد الشرقي", "الشرقي", "شرقا", "شرقاً", "يحده شرقا", "east boundary", "eastern boundary", "east side", "east"] },
  { direction: "W", patterns: ["الحد الغربي", "الغربي", "غربا", "غرباً", "يحده غربا", "west boundary", "western boundary", "west side", "west"] },
];

/** `بطول 25.40 م` / `length 25.40 m` / `: 25.40` */
const LENGTH_AFTER_DIRECTION =
  /(?:بطول|بمسافة|طول|length|len\.?|[:：=])\s*([\d][\d.,٫٬]*)\s*(?:م|متر|m\b|meters?|metres?)?/i;
/** A bare number with a metre unit, when no length keyword is present. */
const BARE_LENGTH = /([\d][\d.,٫٬]*)\s*(?:م\b|متر|m\b|meters?|metres?)/i;

/** `من النقطة 1 إلى النقطة 2` / `from 1 to 2` / `1 → 2` / `1-2` */
const SEGMENT_PATTERNS: readonly RegExp[] = [
  /من\s*(?:النقطة|نقطة)?\s*([A-Za-z]?\d{1,3})\s*(?:إلى|الى|حتى)\s*(?:النقطة|نقطة)?\s*([A-Za-z]?\d{1,3})/g,
  /\bfrom\s*(?:point\s*)?([A-Za-z]?\d{1,3})\s*(?:to)\s*(?:point\s*)?([A-Za-z]?\d{1,3})/gi,
  /\b([A-Za-z]?\d{1,3})\s*(?:→|->|—>|–>)\s*([A-Za-z]?\d{1,3})/g,
];

/** Quadrant bearing: `N 35° 20' E`. */
const QUADRANT_BEARING =
  /\b([NS])\s*(\d{1,3})\s*(?:°|deg|º)?\s*(?:(\d{1,2})\s*['′])?\s*(?:(\d{1,2}(?:\.\d+)?)\s*["″])?\s*([EW])\b/gi;
/** Whole-circle azimuth: `Azimuth 142°30'` / `اتجاه 142.5` */
const AZIMUTH_BEARING =
  /(?:azimuth|bearing|الاتجاه|اتجاه|الزاوية|زاوية)\s*[:：=]?\s*(\d{1,3}(?:\.\d+)?)\s*(?:°|deg|º)?\s*(?:(\d{1,2}(?:\.\d+)?)\s*['′])?/gi;

function parseLength(fragment: string): number | null {
  const normalized = normalizeArabicSeparators(normalizeArabicDigits(fragment));
  const keyed = LENGTH_AFTER_DIRECTION.exec(normalized);
  const token = keyed?.[1] ?? BARE_LENGTH.exec(normalized)?.[1];
  if (!token) return null;
  const value = normalizeNumericToken(token);
  // A boundary side is metres, not kilometres and not a parcel number.
  return value !== null && value > 0 && value < 100_000 ? value : null;
}

/**
 * Extracts the written side lengths. Each cardinal direction is taken at most
 * once — its first statement in the document.
 */
export function extractDocumentedSides(text: string): DocumentedSide[] {
  const normalized = normalizeArabicSeparators(normalizeArabicDigits(text));
  const lower = normalized.toLowerCase();
  const sides: DocumentedSide[] = [];

  for (const { direction, patterns } of DIRECTION_TOKENS) {
    for (const pattern of patterns) {
      const index = lower.indexOf(pattern.toLowerCase());
      if (index < 0) continue;
      // Look only just past the direction word, so the next side is not read.
      const window = normalized.slice(index, index + 80);
      const lengthMeters = parseLength(window);
      if (lengthMeters === null) continue;
      sides.push({ direction, lengthMeters, raw: window.split(/\n/)[0].trim().slice(0, 60) });
      break;
    }
  }

  return sides;
}

/** Extracts `from → to` segment statements, with a length when one is stated. */
export function extractDocumentedSegments(text: string): DocumentedSegment[] {
  const normalized = normalizeArabicSeparators(normalizeArabicDigits(text));
  const segments: DocumentedSegment[] = [];
  const seen = new Set<string>();

  for (const pattern of SEGMENT_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of normalized.matchAll(pattern)) {
      const from = match[1].toUpperCase();
      const to = match[2].toUpperCase();
      const key = `${from}>${to}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const tail = normalized.slice((match.index ?? 0) + match[0].length, (match.index ?? 0) + match[0].length + 60);
      const lengthMeters = parseLength(tail) ?? undefined;
      const bearingDegrees = parseFirstBearing(tail)?.degrees;
      segments.push({ from, to, lengthMeters, bearingDegrees, raw: match[0].trim() });
    }
  }

  return segments;
}

function quadrantToAzimuth(
  northSouth: string,
  degrees: number,
  minutes: number,
  seconds: number,
  eastWest: string,
): number {
  const angle = degrees + minutes / 60 + seconds / 3600;
  const ns = northSouth.toUpperCase();
  const ew = eastWest.toUpperCase();
  if (ns === "N" && ew === "E") return angle;
  if (ns === "S" && ew === "E") return 180 - angle;
  if (ns === "S" && ew === "W") return 180 + angle;
  return 360 - angle; // N…W
}

/** All bearings in the text, as whole-circle azimuths. */
export function extractBearings(text: string): ParsedBearing[] {
  const normalized = normalizeArabicSeparators(normalizeArabicDigits(text));
  const bearings: ParsedBearing[] = [];

  QUADRANT_BEARING.lastIndex = 0;
  for (const match of normalized.matchAll(QUADRANT_BEARING)) {
    const degrees = Number.parseInt(match[2], 10);
    const minutes = match[3] ? Number.parseFloat(match[3]) : 0;
    const seconds = match[4] ? Number.parseFloat(match[4]) : 0;
    if (degrees > 90 || minutes >= 60 || seconds >= 60) continue;
    bearings.push({
      degrees: quadrantToAzimuth(match[1], degrees, minutes, seconds, match[5]),
      raw: match[0].trim(),
    });
  }

  AZIMUTH_BEARING.lastIndex = 0;
  for (const match of normalized.matchAll(AZIMUTH_BEARING)) {
    const degrees = Number.parseFloat(match[1]);
    const minutes = match[2] ? Number.parseFloat(match[2]) : 0;
    if (!Number.isFinite(degrees) || degrees > 360 || minutes >= 60) continue;
    bearings.push({ degrees: degrees + minutes / 60, raw: match[0].trim() });
  }

  return bearings;
}

function parseFirstBearing(text: string): ParsedBearing | null {
  return extractBearings(text)[0] ?? null;
}

/** Everything the document says about the boundary, in one pass. */
export function extractBoundaryDescription(text: string): BoundaryDescription {
  return {
    sides: extractDocumentedSides(text),
    segments: extractDocumentedSegments(text),
    bearings: extractBearings(text),
  };
}
