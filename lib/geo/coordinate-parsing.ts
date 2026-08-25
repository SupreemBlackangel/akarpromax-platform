/**
 * Worldwide WGS84 coordinate parsing.
 *
 * Handles the three notations survey documents use anywhere on Earth:
 * decimal degrees, degrees/minutes/seconds, and hemisphere-tagged decimals.
 * Longitudes up to three degree digits are supported, so `120°30'00"E` and
 * `-151.2093` parse the same way `39°10'22"E` does.
 */
import type { Point } from "./contracts";

export type AxisOrder = "LAT_LON" | "LON_LAT";

export interface ParsedLatLon extends Point {
  /** Which column carried the latitude in the source text. */
  order: AxisOrder;
  /** True when only the documented default order could justify the reading. */
  ambiguous: boolean;
}

const DEGREE_MARK = "[°ºo\\u00b0\\u00ba\\u02da]";
const MINUTE_MARK = "['′’´`]";
const SECOND_MARK = "[\"″”ʺ]";

/**
 * A degree/minute/second magnitude on its own. The hemisphere letter is matched
 * separately because documents place it either before or after the value.
 */
const DMS_MAGNITUDE_PATTERN = new RegExp(
  "(\\d{1,3})\\s*" + DEGREE_MARK + "\\s*" +
    "(?:(\\d{1,2}(?:\\.\\d+)?)\\s*" + MINUTE_MARK + "\\s*)?" +
    "(?:(\\d{1,2}(?:\\.\\d+)?)\\s*" + SECOND_MARK + "?)?",
  "g",
);

const HEMISPHERE_BEFORE = /([NSEWnsew])\s*$/;
const HEMISPHERE_AFTER = /^\s*([NSEWnsew])(?![A-Za-z])/;

/** `21 32 36 N` — no symbols at all, hemisphere letter is what makes it a DMS. */
const BARE_DMS_PATTERN =
  /(?<![\d.])(\d{1,3})\s+(\d{1,2})\s+(\d{1,2}(?:\.\d+)?)\s*([NSEWnsew])(?![A-Za-z])/g;

/** Two signed decimals separated by a comma/semicolon/slash/space. */
export const DECIMAL_PAIR_PATTERN =
  /(?<![\d.,-])(-?\d{1,3}\.\d{2,15})\s*[,;/\s]\s*(-?\d{1,3}\.\d{2,15})(?![\d.,])/g;

/** `N 21.885` / `21.885 N` / `E39.205` in either order. */
export const HEMISPHERE_DECIMAL_TOKEN_PATTERN =
  /(?:\b([NSEW])\s*(-?\d{1,3}\.\d{2,15})\b|\b(-?\d{1,3}\.\d{2,15})\s*([NSEW])\b)/gi;

export function isValidLatitudeValue(lat: number): boolean {
  return Number.isFinite(lat) && lat >= -90 && lat <= 90;
}

export function isValidLongitudeValue(lon: number): boolean {
  return Number.isFinite(lon) && lon >= -180 && lon <= 180;
}

export function isValidLatLon(point: Point): boolean {
  return isValidLatitudeValue(point.lat) && isValidLongitudeValue(point.lon);
}

export interface DmsComponent {
  hemisphere: "N" | "S" | "E" | "W";
  /** Signed decimal degrees. */
  value: number;
  /** Index of the first character of the whole component, hemisphere included. */
  start: number;
  /** Index just past the last character of the component. */
  end: number;
}

function signedDegrees(degrees: number, minutes: number, seconds: number, hemisphere: string): number {
  const magnitude = degrees + minutes / 60 + seconds / 3600;
  return hemisphere === "S" || hemisphere === "W" ? -magnitude : magnitude;
}

/**
 * Finds every DMS component in a string, with its position.
 *
 * A hemisphere letter between two magnitudes is claimed by the magnitude that
 * reaches it first, scanning left to right. That resolves the ambiguity in
 * `N 21°32'36" E 39°10'22"`, where a naive trailing-letter match would give the
 * `E` to the latitude and leave the longitude unlabelled.
 */
export function collectDmsComponents(raw: string): DmsComponent[] {
  DMS_MAGNITUDE_PATTERN.lastIndex = 0;
  const magnitudes = Array.from(raw.matchAll(DMS_MAGNITUDE_PATTERN));
  const components: DmsComponent[] = [];
  const claimedLetters = new Set<number>();

  for (const match of magnitudes) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    const degrees = Number.parseInt(match[1], 10);
    const minutes = match[2] ? Number.parseFloat(match[2]) : 0;
    const seconds = match[3] ? Number.parseFloat(match[3]) : 0;
    if (!Number.isFinite(degrees) || minutes >= 60 || seconds >= 60) continue;

    const beforeWindow = raw.slice(Math.max(0, start - 4), start);
    const beforeMatch = HEMISPHERE_BEFORE.exec(beforeWindow);
    let beforeIndex = beforeMatch
      ? Math.max(0, start - 4) + (beforeMatch.index ?? 0)
      : -1;

    // A hemisphere letter has to stand on its own. Without this check the `e`
    // that ends `Latitude` and `Longitude` is claimed as East, so the more
    // explicitly a document labels its coordinates, the less of it is read —
    // `Latitude 41°07'57"N` was silently reduced to a longitude of 41. The
    // trailing letter of any word is disqualified, in any language.
    if (beforeIndex > 0 && /[A-Za-z]/.test(raw[beforeIndex - 1] ?? "")) {
      beforeIndex = -1;
    }

    const afterWindow = raw.slice(end, end + 4);
    const afterMatch = HEMISPHERE_AFTER.exec(afterWindow);
    const afterIndex = afterMatch ? end + afterMatch[0].indexOf(afterMatch[1]) : -1;

    let letterIndex = -1;
    let letter: string | undefined;
    if (beforeIndex >= 0 && !claimedLetters.has(beforeIndex)) {
      letterIndex = beforeIndex;
      letter = beforeMatch![1];
    } else if (afterIndex >= 0 && !claimedLetters.has(afterIndex)) {
      letterIndex = afterIndex;
      letter = afterMatch![1];
    }
    if (!letter) continue;

    claimedLetters.add(letterIndex);
    const hemisphere = letter.toUpperCase() as DmsComponent["hemisphere"];
    components.push({
      hemisphere,
      value: signedDegrees(degrees, minutes, seconds, hemisphere),
      start: Math.min(start, letterIndex),
      end: Math.max(end, letterIndex + 1),
    });
  }

  if (components.length < 2) {
    BARE_DMS_PATTERN.lastIndex = 0;
    for (const match of raw.matchAll(BARE_DMS_PATTERN)) {
      const degrees = Number.parseInt(match[1], 10);
      const minutes = Number.parseFloat(match[2]);
      const seconds = Number.parseFloat(match[3]);
      if (minutes >= 60 || seconds >= 60) continue;
      const hemisphere = match[4].toUpperCase() as DmsComponent["hemisphere"];
      const start = match.index ?? 0;
      components.push({
        hemisphere,
        value: signedDegrees(degrees, minutes, seconds, hemisphere),
        start,
        end: start + match[0].length,
      });
    }
  }

  return components.sort((left, right) => left.start - right.start);
}

/**
 * Parses a DMS latitude/longitude pair anywhere on Earth. Requires both an
 * N/S component and an E/W component so a lone bearing cannot become a point.
 */
export function parseDmsLatLon(raw: string): Point | null {
  const components = collectDmsComponents(raw);
  const latComponent = components.find((item) => item.hemisphere === "N" || item.hemisphere === "S");
  const lonComponent = components.find((item) => item.hemisphere === "E" || item.hemisphere === "W");
  if (!latComponent || !lonComponent) return null;

  const point = { lat: latComponent.value, lon: lonComponent.value };
  return isValidLatLon(point) ? point : null;
}

export interface HemisphereDecimalToken {
  hemisphere: "N" | "S" | "E" | "W";
  value: number;
  start: number;
  end: number;
}

export function collectHemisphereDecimalTokens(raw: string): HemisphereDecimalToken[] {
  HEMISPHERE_DECIMAL_TOKEN_PATTERN.lastIndex = 0;
  return Array.from(raw.matchAll(HEMISPHERE_DECIMAL_TOKEN_PATTERN)).map((match) => ({
    hemisphere: (match[1] ?? match[4]).toUpperCase() as HemisphereDecimalToken["hemisphere"],
    value: Number.parseFloat(match[2] ?? match[3]),
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
  }));
}

/** `N 21.885 E 39.205` and `39.205 E 21.885 N` both resolve correctly. */
export function parseHemisphereDecimalLatLon(raw: string): Point | null {
  const tokens = collectHemisphereDecimalTokens(raw);
  const latToken = tokens.find((token) => token.hemisphere === "N" || token.hemisphere === "S");
  const lonToken = tokens.find((token) => token.hemisphere === "E" || token.hemisphere === "W");
  if (!latToken || !lonToken) return null;

  const lat = Math.abs(latToken.value) * (latToken.hemisphere === "S" ? -1 : 1);
  const lon = Math.abs(lonToken.value) * (lonToken.hemisphere === "W" ? -1 : 1);
  const point = { lat, lon };
  return isValidLatLon(point) ? point : null;
}

/**
 * Resolves the axis order of a bare decimal pair.
 *
 * Only a value that cannot be a latitude proves the order. When both values
 * are valid latitudes the source order is kept and the result is flagged
 * ambiguous, so the caller can require extra evidence before trusting it.
 */
export function resolveDecimalPair(first: number, second: number): ParsedLatLon | null {
  if (!Number.isFinite(first) || !Number.isFinite(second)) return null;

  const firstCanBeLat = isValidLatitudeValue(first);
  const secondCanBeLat = isValidLatitudeValue(second);

  if (!firstCanBeLat && !secondCanBeLat) return null;

  if (!firstCanBeLat && secondCanBeLat) {
    const point = { lat: second, lon: first };
    return isValidLatLon(point) ? { ...point, order: "LON_LAT", ambiguous: false } : null;
  }

  if (firstCanBeLat && !secondCanBeLat) {
    const point = { lat: first, lon: second };
    return isValidLatLon(point) ? { ...point, order: "LAT_LON", ambiguous: false } : null;
  }

  const point = { lat: first, lon: second };
  return isValidLatLon(point) ? { ...point, order: "LAT_LON", ambiguous: true } : null;
}

/** First decimal pair in the text, with hemisphere letters taking priority. */
export function parseDecimalLatLonDetailed(raw: string): ParsedLatLon | null {
  const hemisphere = parseHemisphereDecimalLatLon(raw);
  if (hemisphere) return { ...hemisphere, order: "LAT_LON", ambiguous: false };

  DECIMAL_PAIR_PATTERN.lastIndex = 0;
  const match = DECIMAL_PAIR_PATTERN.exec(raw);
  if (!match) return null;
  return resolveDecimalPair(Number.parseFloat(match[1]), Number.parseFloat(match[2]));
}

export function parseDecimalLatLon(raw: string): Point | null {
  const parsed = parseDecimalLatLonDetailed(raw);
  return parsed ? { lat: parsed.lat, lon: parsed.lon } : null;
}

/** Formats a WGS84 value at full stored precision for copy/export. */
export function formatWgs84Value(value: number, maxDigits = 12): string {
  if (!Number.isFinite(value)) return "";
  return value
    .toFixed(maxDigits)
    .replace(/0+$/, "")
    .replace(/\.$/, "");
}

/** Decimal degrees -> `21°32'36.00"N` for display and export. */
export function formatDms(value: number, axis: "lat" | "lon"): string {
  if (!Number.isFinite(value)) return "";
  const hemisphere = axis === "lat" ? (value < 0 ? "S" : "N") : value < 0 ? "W" : "E";
  const magnitude = Math.abs(value);
  const degrees = Math.floor(magnitude);
  const minutesFloat = (magnitude - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = (minutesFloat - minutes) * 60;
  return `${degrees}°${String(minutes).padStart(2, "0")}'${seconds.toFixed(2).padStart(5, "0")}"${hemisphere}`;
}
