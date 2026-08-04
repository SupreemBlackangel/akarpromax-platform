import proj4 from "proj4";

export type ExtractedPoint = {
  label: string;
  lat: number;
  lng: number;
  easting?: number;
  northing?: number;
  utmZone?: number;
};

function normalizeArabic(text: string): string {
  return text
    .replace(/[أإآٱ]/g, "ا")
    .replace(/[ةﻩهه]/g, "ة")
    .replace(/[ىيیۍ]/g, "ي")
    .replace(/[OoQ]/g, "0")
    .replace(/[lI|!]/g, "1")
    .replace(/[Ss]/g, "5")
    .replace(/[Bb]/g, "8")
    .replace(/[Zz]/g, "2")
    .replace(/[Gg]/g, "6")
    .replace(/،/g, ",")
    .replace(/\s+/g, " ")
    .trim();
}

function detectUtmZone(text: string): number {
  const patterns = [
    /(?:UTM|Zone|zone|نطاق|زون|النطاق)\s*[:：\-]?\s*(\d{2})/i,
    /Zone\s*(\d{2})[NS]/i,
  ];
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m) {
      const z = parseInt(m[1]);
      if (z >= 35 && z <= 40) return z;
    }
  }
  return 39;
}

function extractCoordinates(text: string, defaultZone: number): ExtractedPoint[] {
  const normalized = normalizeArabic(text);
  const points: ExtractedPoint[] = [];
  const seen = new Set<string>();

  const patterns: Array<{ regex: RegExp; extract: (m: RegExpMatchArray) => ExtractedPoint | null }> = [
    {
      regex: /N\s+(\d{1,3}\.\d{5,})\s*[E]\s+(\d{1,3}\.\d{5,})\s+(\d{4,9})/gi,
      extract: (m) => {
        const northing = parseFloat(m[1]);
        const easting = parseFloat(m[2]);
        const zone = parseInt(m[3]);
        if (zone < 35 || zone > 40) return null;
        const { lat, lng } = fromUtm(easting, northing, zone);
        return { label: `P${points.length + 1}`, lat, lng, easting, northing, utmZone: zone };
      },
    },
    {
      regex: /N\s+(\d{1,3}\.\d{5,})\s+E\s+(\d{1,3}\.\d{5,})\b/gi,
      extract: (m) => {
        const northing = parseFloat(m[1]);
        const easting = parseFloat(m[2]);
        const { lat, lng } = fromUtm(easting, northing, defaultZone);
        return { label: `P${points.length + 1}`, lat, lng, easting, northing, utmZone: defaultZone };
      },
    },
    {
      regex: /(\d{1,2}\.\d{5,})\s*[,\s]+\s*(\d{1,3}\.\d{5,})/g,
      extract: (m) => {
        const lat = parseFloat(m[1]);
        const lng = parseFloat(m[2]);
        if (lat < 15 || lat > 35 || lng < 30 || lng > 65) return null;
        return { label: `P${points.length + 1}`, lat, lng };
      },
    },
    {
      regex: /(?:نقطة|Point|P)\s*(\d+)\s*[:：\-]?\s*(\d{4,8}[.\d]*)\s*[,\s\t|]+\s*(\d{4,8}[.\d]*)/gi,
      extract: (m) => {
        const id = m[1];
        const easting = parseFloat(m[2]);
        const northing = parseFloat(m[3]);
        if (easting < 100000 || northing < 1000000) return null;
        const { lat, lng } = fromUtm(easting, northing, defaultZone);
        return { label: id, lat, lng, easting, northing, utmZone: defaultZone };
      },
    },
    {
      regex: /(\d{1,3})\s+(\d{4,8}[.\d]*)\s+(\d{4,8}[.\d]*)/g,
      extract: (m) => {
        const easting = parseFloat(m[2]);
        const northing = parseFloat(m[3]);
        if (easting < 100000 || northing < 1000000) return null;
        const { lat, lng } = fromUtm(easting, northing, defaultZone);
        return { label: m[1], lat, lng, easting, northing, utmZone: defaultZone };
      },
    },
  ];

  for (const { regex, extract } of patterns) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(normalized)) !== null) {
      const pt = extract(match);
      if (pt) {
        const key = `${pt.lat.toFixed(6)},${pt.lng.toFixed(6)}`;
        if (!seen.has(key)) {
          seen.add(key);
          points.push(pt);
        }
      }
    }
  }

  return points;
}

function fromUtm(easting: number, northing: number, zone: number): { lat: number; lng: number } {
  const utmDef = `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`;
  const wgs84 = "+proj=longlat +datum=WGS84 +no_defs";
  const [lng, lat] = proj4(utmDef, wgs84, [easting, northing]);
  return { lat, lng };
}

function toUtm(lat: number, lng: number, zone: number): { easting: number; northing: number } {
  const utmDef = `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`;
  const wgs84 = "+proj=longlat +datum=WGS84 +no_defs";
  const [easting, northing] = proj4(wgs84, utmDef, [lng, lat]);
  return { easting, northing };
}

function extractLandDetails(text: string): Record<string, string> {
  const normalized = normalizeArabic(text);
  const details: Record<string, string> = {};

  const ownerPatterns = [/اسم المالك\s*[:：\-]?\s*(.+?)(?:\n|$)/i, /المالك\s*[:：\-]?\s*(.+?)(?:\n|$)/i, /Owner\s*[:：\-]?\s*(.+?)(?:\n|$)/i];
  for (const p of ownerPatterns) { const m = normalized.match(p); if (m) { details.owner = m[1].trim(); break; } }

  const docPatterns = [/رقم الوثيقة\s*[:：\-]?\s*(\S+)/i, /صك رقم\s*[:：\-]?\s*(\S+)/i, /Document\s*(?:No|Number|#)\s*[:：\-]?\s*(\S+)/i];
  for (const p of docPatterns) { const m = normalized.match(p); if (m) { details.documentNumber = m[1]; break; } }

  const areaPatterns = [/المساحة\s*[:：\-]?\s*([\d.,]+)\s*(م2|m²|sq\.?m|مربع)?/i, /Area\s*[:：\-]?\s*([\d.,]+)/i];
  for (const p of areaPatterns) { const m = normalized.match(p); if (m) { details.area = m[1].replace(/,/g, ""); break; } }

  const cityPatterns = [/المدينة\s*[:：\-]?\s*(.+?)(?:\n|$)/i, /المنطقة\s*[:：\-]?\s*(.+?)(?:\n|$)/i];
  for (const p of cityPatterns) { const m = normalized.match(p); if (m) { details.city = m[1].trim(); break; } }

  return details;
}

function shoelaceArea(coords: Array<[number, number]>): number {
  let area = 0;
  const n = coords.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += coords[i][0] * coords[j][1];
    area -= coords[j][0] * coords[i][1];
  }
  return Math.abs(area) / 2;
}

export { extractCoordinates, extractLandDetails, shoelaceArea, toUtm, detectUtmZone, normalizeArabic };
