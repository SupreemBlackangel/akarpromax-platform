export interface DisplayCoordinateRow {
  label: string;
  raw: string;
  lat: number;
  lon: number;
}

export interface ProjectedSourceRow {
  label: string;
  raw: string;
  zone?: number;
  easting: number;
  northing: number;
}

const UTM_WITH_ZONE = /(?:^|\s)(\d{1,2})\s*([NS])\s+(\d{5,6}(?:\.\d+)?)\s+(\d{6,7}(?:\.\d+)?)(?:\s|$)/i;
const BARE_PROJECTED_PAIR = /(?:^|\s)(\d{5,6}(?:\.\d+)?)\s+(\d{6,7}(?:\.\d+)?)(?:\s|$)/;
const LINE_LABEL = /\b(?:LINE\s*)?(\d{1,4})\s*[-–—]\s*(\d{1,4})\b/i;
const TRAILING_REFERENCE = /(?:^|\s)(\d{5,14})\s*$/;

const EXPLICIT_ZONE_PATTERNS: RegExp[] = [
  /(?:PROJECTION\s*:?\s*)?(?:WGS\s*84\s*)?(?:UTM\s*)?ZONE\s*[:：\-]?\s*(\d{1,2})\s*([NS])?/i,
  /(?:UTM|زون|نطاق|النطاق)\s*[:：\-]?\s*(\d{1,2})\s*([NS])?/i,
  /EPSG\s*[:#]?\s*326(\d{2})\b/i,
];

export function explicitUtmZoneFromDisplayText(text: string): number | undefined {
  for (const pattern of EXPLICIT_ZONE_PATTERNS) {
    const match = pattern.exec(text);
    if (!match) continue;
    const zone = Number.parseInt(match[1], 10);
    if (zone >= 1 && zone <= 60) return zone;
  }
  return undefined;
}

function plausibleEasting(value: number): boolean {
  return value >= 100_000 && value <= 999_999;
}

function plausibleNorthing(value: number): boolean {
  return value >= 100_000 && value <= 10_000_000;
}

export function sourcePointLabel(raw: string, fallbackIndex: number): string {
  const line = LINE_LABEL.exec(raw);
  if (line) return `${line[1]}-${line[2]}`;
  const reference = TRAILING_REFERENCE.exec(raw);
  if (reference) return reference[1];
  return `P${fallbackIndex + 1}`;
}

export function parseProjectedSourceRow(
  row: Pick<DisplayCoordinateRow, "label" | "raw">,
): ProjectedSourceRow | null {
  const withZone = UTM_WITH_ZONE.exec(row.raw);
  if (withZone) {
    const zone = Number.parseInt(withZone[1], 10);
    const easting = Number.parseFloat(withZone[3]);
    const northing = Number.parseFloat(withZone[4]);
    if (zone >= 1 && zone <= 60 && plausibleEasting(easting) && plausibleNorthing(northing)) {
      return { label: row.label, raw: row.raw, zone, easting, northing };
    }
  }

  const pair = BARE_PROJECTED_PAIR.exec(row.raw);
  if (!pair) return null;
  const easting = Number.parseFloat(pair[1]);
  const northing = Number.parseFloat(pair[2]);
  if (!plausibleEasting(easting) || !plausibleNorthing(northing)) return null;
  return { label: row.label, raw: row.raw, easting, northing };
}

export function parseProjectedSourceRows(
  rows: readonly Pick<DisplayCoordinateRow, "label" | "raw">[],
): ProjectedSourceRow[] {
  return rows.map(parseProjectedSourceRow).filter((row): row is ProjectedSourceRow => row !== null);
}

export function utmZoneFromLongitude(longitude: number): number {
  return Math.max(1, Math.min(60, Math.floor((longitude + 180) / 6) + 1));
}

export function dedupeGeometryPoints<T extends { lat: number; lon: number }>(rows: readonly T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    const key = `${row.lat.toFixed(9)},${row.lon.toFixed(9)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

type XY = { x: number; y: number };

function orientation(a: XY, b: XY, c: XY): number {
  const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
  if (Math.abs(value) < 1e-14) return 0;
  return value > 0 ? 1 : 2;
}

function onSegment(a: XY, b: XY, c: XY): boolean {
  return (
    b.x <= Math.max(a.x, c.x) + 1e-14 &&
    b.x + 1e-14 >= Math.min(a.x, c.x) &&
    b.y <= Math.max(a.y, c.y) + 1e-14 &&
    b.y + 1e-14 >= Math.min(a.y, c.y)
  );
}

function segmentsIntersect(a: XY, b: XY, c: XY, d: XY): boolean {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(a, c, b)) return true;
  if (o2 === 0 && onSegment(a, d, b)) return true;
  if (o3 === 0 && onSegment(c, a, d)) return true;
  if (o4 === 0 && onSegment(c, b, d)) return true;
  return false;
}

/** Returns true only for non-adjacent edge crossings. It never reorders points. */
export function polygonSelfIntersects(points: readonly { lat: number; lon: number }[]): boolean {
  if (points.length < 4) return false;
  const n = points.length;
  for (let i = 0; i < n; i += 1) {
    const a = { x: points[i].lon, y: points[i].lat };
    const b = { x: points[(i + 1) % n].lon, y: points[(i + 1) % n].lat };
    for (let j = i + 1; j < n; j += 1) {
      const nextI = (i + 1) % n;
      const nextJ = (j + 1) % n;
      if (i === j || nextI === j || nextJ === i) continue;
      if (i === 0 && nextJ === 0) continue;
      const c = { x: points[j].lon, y: points[j].lat };
      const d = { x: points[nextJ].lon, y: points[nextJ].lat };
      if (segmentsIntersect(a, b, c, d)) return true;
    }
  }
  return false;
}
