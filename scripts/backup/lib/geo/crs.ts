import { CrsDetectionResult, CrsKind, Point } from "./contracts";

export function detectCrs(input: string | { format: string; raw: string }): CrsDetectionResult {
  const raw = typeof input === "string" ? input : input.raw;
  const format = typeof input === "string" ? "" : input.format;
  const upper = raw.toUpperCase();

  if (format === "utm" || /\bUTM\b|\bMGRS\b/.test(upper)) {
    const zoneMatch = /(?:UTM|MGRS)?\s*(\d{1,2})\s*([NSEW])/.exec(upper);
    const zone = zoneMatch ? parseInt(zoneMatch[1], 10) : undefined;
    const northernHemisphere = zoneMatch ? zoneMatch[2] !== "S" : true;
    return {
      kind: "utm",
      zone,
      northernHemisphere,
      reason: "UTM zone + easting + northing present",
      confidence: 0.95,
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

  if (/(\d|°|º|'|"|′|″)\s*[NSEWnsew]\b/.test(upper)) {
    return {
      kind: "wgs84",
      northernHemisphere: true,
      reason: "DMS-style lat/lon with hemisphere letters",
      confidence: 0.8,
    };
  }

  const latLon = /\d{1,2}(?:\.\d{1,7})?[,\s]\d{1,3}(?:\.\d{1,7})?/.exec(raw);
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

const A = 6378137.0;
const F = 1 / 298.257223563;
const K0 = 0.9996;

function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function utmZoneFromLon(lon: number): number {
  return Math.floor((lon + 180) / 6) + 1;
}

export function convertUtmToWgs84(
  zone: number,
  easting: number,
  northing: number,
  northernHemisphere: boolean,
): Point {
  const e2 = 2 * F - F * F;
  const ePrime2 = e2 / (1 - e2);
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));

  const x = easting - 500000;
  const y = northernHemisphere ? northing : northing - 10000000;

  const M = y / K0;
  const mu = M / (A * (1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 * e2 * e2) / 256));

  const phi1 =
    mu +
    ((3 * e1) / 2 - (27 * e1 * e1 * e1) / 32) * Math.sin(2 * mu) +
    ((21 * e1 * e1) / 16 - (55 * e1 * e1 * e1 * e1) / 32) * Math.sin(4 * mu) +
    ((151 * e1 * e1 * e1) / 96) * Math.sin(6 * mu) +
    ((1097 * e1 * e1 * e1 * e1) / 512) * Math.sin(8 * mu);

  const sinPhi1 = Math.sin(phi1);
  const N1 = A / Math.sqrt(1 - e2 * sinPhi1 * sinPhi1);
  const T1 = Math.tan(phi1) * Math.tan(phi1);
  const C1 = ePrime2 * Math.cos(phi1) * Math.cos(phi1);
  const R1 = (A * (1 - e2)) / Math.pow(1 - e2 * sinPhi1 * sinPhi1, 1.5);
  const D = x / (N1 * K0);

  const lat =
    phi1 -
    ((N1 * Math.tan(phi1)) / R1) *
      ((D * D) / 2 -
        ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ePrime2) * Math.pow(D, 4)) / 24 +
        ((61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ePrime2 - 3 * C1 * C1) *
          Math.pow(D, 6)) /
          720);

  const lon =
    (D -
      ((1 + 2 * T1 + C1) * Math.pow(D, 3)) / 6 +
      ((5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ePrime2 + 24 * T1 * T1) * Math.pow(D, 5)) /
        120) /
    Math.cos(phi1);

  const centralMeridian = zone * 6 - 183;
  return {
    lat: radToDeg(lat),
    lon: radToDeg(lon) + centralMeridian,
  };
}

export function toWgs84(c: { format: string; raw: string; crs?: CrsKind }): { point: Point; crs: CrsKind; source: string } | null {
  if (c.format === "decimal" && c.crs !== "utm") {
    const re = /(-?\d{1,2}(?:\.\d{2,7})?)\s*[,;/\s]\s*(-?\d{1,3}(?:\.\d{2,7})?)/;
    const match = re.exec(c.raw);
    if (!match) return null;
    let lat = parseFloat(match[1]);
    let lon = parseFloat(match[2]);
    if (Math.abs(lat) > 90) {
      const tmp = lat;
      lat = lon;
      lon = tmp;
    }
    return { point: { lat, lon }, crs: "wgs84", source: c.raw };
  }

  if (c.format === "dms") {
    const re =
      /(\d{1,2})\s*[°ºo]\s*(\d{1,2}(?:\.\d+)?)?\s*['′']\s*(\d{1,2}(?:\.\d+)?)?\s*["″"]?\s*([NSEWnsew])/g;
    const matches = Array.from(c.raw.matchAll(re));
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
    return { point: { lat, lon }, crs: "wgs84", source: c.raw };
  }

  if (c.format === "utm") {
    const match = /(\d{1,2})\s*([NSEWnsew])\s*(\d{5,6}(?:\.\d+)?)\s*[,;\s]\s*(\d{6,7}(?:\.\d+)?)/i.exec(c.raw);
    if (!match) return null;
    const zone = parseInt(match[1], 10);
    const northernHemisphere = match[2].toUpperCase() !== "S";
    const easting = parseFloat(match[3]);
    const northing = parseFloat(match[4]);
    const point = convertUtmToWgs84(zone, easting, northing, northernHemisphere);
    return { point, crs: "wgs84", source: c.raw };
  }

  return null;
}
