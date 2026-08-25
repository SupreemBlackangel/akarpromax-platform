import {
  CoordinateEvidence,
  GeoEvidence,
  ParcelEvidence,
  AddressEvidence,
  Point,
} from "./contracts";

const DMS_REGEX =
  /(\d{1,2})\s*[°ºo]\s*(\d{1,2}(?:\.\d+)?)?\s*['′']\s*(\d{1,2}(?:\.\d+)?)?\s*["″"]?\s*([NSEWnsew])/g;

const DECIMAL_REGEX =
  /(?<![\d.,])(-?\d{1,2}(?:\.\d{2,7})?)\s*[,;/\s]\s*(-?\d{1,3}(?:\.\d{2,7})?)(?![\d.,])/g;

const UTM_REGEX =
  /(?:\b(?:UTM|MGRS)\s*)?(\d{1,2})\s*([NSEWnsew])\s*(\d{5,6}(?:\.\d+)?)\s*[,;\s]\s*(\d{6,7}(?:\.\d+)?)/gi;

const PARCEL_REGEX =
  /(?:\b(?:parcel|plot|lot|plan)\b|قطعة|مخطط|المخطط|القطعة|رقم القطعة|رقم المخطط|صك)\s*[#:]?\s*([0-9-]{1,12})/gi;

const PARCEL_ARABIC_REGEX =
  /(?:قطعة|مخطط|صك)\s*(?:رقم\s*)?\s*[:#]?\s*([0-9]{1,10})/g;

const PLAN_PATTERN = /مخطط\s*(?:رقم\s*)?([0-9]{1,10})/g;

const POSTAL_CODE_REGEX = /\b\d{5}\b/g;

const GOVERNORATE_KEYWORDS: readonly string[] = [
  "مكة المكرمة",
  "الرياض",
  "جدة",
  "الدمام",
  "المدينة المنورة",
  "الطائف",
  "تبوك",
  "بريدة",
  "أبها",
  "خميس مشيط",
  "الجبيل",
  "ينبع",
  "القطيف",
  "الأحساء",
  "نجران",
  "عرعر",
  "سكاكا",
  "جازان",
  "الباحة",
  "حائل",
  "القريات",
  "رفحاء",
  "الخرج",
  "الدوادمي",
  "حفر الباطن",
];

const ARABIC_CITY_KEYWORDS: readonly string[] = [
  "الرياض",
  "جدة",
  "مكة",
  "المدينة",
  "الدمام",
  "الطائف",
  "أبها",
  "تبوك",
  "حائل",
  "جازان",
  "نجران",
];

const DISTRICT_MARKERS: readonly string[] = [
  "حي ",
  "الحي ",
  "حيّ ",
  "حي/",
];

const STREET_MARKERS: readonly string[] = [
  "شارع ",
  "طريق ",
  "street ",
  "road ",
];

export function parseDmsLatLon(raw: string): Point | null {
  DMS_REGEX.lastIndex = 0;
  const matches = Array.from(raw.matchAll(DMS_REGEX));
  if (matches.length < 2) return null;

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

export function parseDecimalLatLon(raw: string): Point | null {
  DECIMAL_REGEX.lastIndex = 0;
  const match = DECIMAL_REGEX.exec(raw);
  if (!match) return null;
  let lat = parseFloat(match[1]);
  let lon = parseFloat(match[2]);
  if (Math.abs(lat) > 90) {
    const tmp = lat;
    lat = lon;
    lon = tmp;
  }
  if (Math.abs(lon) > 180) return null;
  return { lat, lon };
}

export function parseUtmCoordinates(raw: string): { zone: number; easting: number; northing: number; northernHemisphere: boolean } | null {
  UTM_REGEX.lastIndex = 0;
  const match = UTM_REGEX.exec(raw);
  if (!match) return null;
  const zone = parseInt(match[1], 10);
  const hem = match[2].toUpperCase();
  const easting = parseFloat(match[3]);
  const northing = parseFloat(match[4]);
  const northernHemisphere = hem !== "S";
  return { zone, easting, northing, northernHemisphere };
}

export function extractCoordinateEvidence(text: string): CoordinateEvidence[] {
  const evidence: CoordinateEvidence[] = [];

  DMS_REGEX.lastIndex = 0;
  DECIMAL_REGEX.lastIndex = 0;
  UTM_REGEX.lastIndex = 0;

  const dmsMatches = Array.from(text.matchAll(DMS_REGEX));
  if (dmsMatches.length >= 2) {
    const point = parseDmsLatLon(text);
    if (point) {
      const start = Math.max(0, text.search(DMS_REGEX));
      evidence.push({
        format: "dms",
        raw: text.slice(start, start + 80),
        point,
        source: "text",
      });
    }
  }

  for (const match of text.matchAll(DECIMAL_REGEX)) {
    const point = parseDecimalLatLon(match[0]);
    if (point) {
      evidence.push({
        format: "decimal",
        raw: match[0],
        point,
        source: "text",
      });
    }
  }

  for (const match of text.matchAll(UTM_REGEX)) {
    const parsed = parseUtmCoordinates(match[0]);
    if (parsed) {
      evidence.push({
        format: "utm",
        raw: match[0],
        crs: "utm",
        source: "text",
      });
    }
  }

  return evidence;
}

export function extractParcelEvidence(text: string): ParcelEvidence[] {
  const parcels: ParcelEvidence[] = [];

  for (const match of text.matchAll(PARCEL_REGEX)) {
    const value = match[1];
    if (/^\d/.test(value)) {
      const lower = match[0].toLowerCase();
      const kind = lower.includes("parcel") || /قطعة|القطعة/.test(match[0])
        ? "parcelId"
        : lower.includes("plan") || /مخطط|المخطط/.test(match[0])
          ? "planId"
          : lower.includes("plot") || lower.includes("lot")
            ? "plotId"
            : /صك/.test(match[0])
              ? "planId"
              : "parcelId";
      const entry: ParcelEvidence = { raw: match[0], source: "text" };
      if (kind === "parcelId") entry.parcelId = value;
      else if (kind === "planId") entry.planId = value;
      else entry.plotId = value;
      parcels.push(entry);
    }
  }

  if (parcels.length === 0) {
    for (const match of text.matchAll(PARCEL_ARABIC_REGEX)) {
      const value = match[1];
      const isPlan = /مخطط/.test(match[0]);
      const entry: ParcelEvidence = { raw: match[0], source: "text" };
      if (isPlan) entry.planId = value;
      else entry.parcelId = value;
      parcels.push(entry);
    }
  }

  const planMatches = Array.from(text.matchAll(PLAN_PATTERN));
  for (const match of planMatches) {
    const exists = parcels.some((p) => p.planId === match[1]);
    if (!exists) {
      parcels.push({ planId: match[1], raw: match[0], source: "text" });
    }
  }

  const unique = new Map<string, ParcelEvidence>();
  for (const p of parcels) {
    const key = `${p.parcelId ?? p.planId ?? p.plotId ?? ""}`;
    if (key && !unique.has(key)) unique.set(key, p);
  }

  return Array.from(unique.values());
}

export function extractAddressEvidence(text: string): AddressEvidence[] {
  const addresses: AddressEvidence[] = [];
  const lower = text.toLowerCase();

  for (const gov of GOVERNORATE_KEYWORDS) {
    if (lower.includes(gov.toLowerCase())) {
      addresses.push({ city: gov, raw: gov, source: "text" });
    }
  }

  for (const city of ARABIC_CITY_KEYWORDS) {
    if (lower.includes(city) && !addresses.some((a) => a.city === city)) {
      addresses.push({ city, raw: city, source: "text" });
    }
  }

  for (const marker of DISTRICT_MARKERS) {
    const idx = lower.indexOf(marker.toLowerCase());
    if (idx >= 0) {
      const after = text.slice(idx + marker.length);
      const match = /^([^\s،,;.\n]{2,40})/.exec(after);
      if (match) {
        addresses.push({ district: match[1], raw: `${marker}${match[1]}`, source: "text" });
      }
    }
  }

  for (const marker of STREET_MARKERS) {
    const idx = lower.indexOf(marker.toLowerCase());
    if (idx >= 0) {
      const after = text.slice(idx + marker.length);
      const match = /^([^،,;.\n]{2,40})/.exec(after);
      if (match) {
        addresses.push({ street: match[1].trim(), raw: `${marker}${match[1]}`, source: "text" });
      }
    }
  }

  const postal = Array.from(text.matchAll(POSTAL_CODE_REGEX));
  for (const match of postal) {
    addresses.push({ postalCode: match[0], raw: match[0], source: "text" });
  }

  const unique = new Map<string, AddressEvidence>();
  for (const a of addresses) {
    const key = `${a.city ?? ""}|${a.district ?? ""}|${a.street ?? ""}|${a.postalCode ?? ""}`;
    if (key && !unique.has(key)) unique.set(key, a);
  }

  return Array.from(unique.values());
}

export function extractGeoEvidence(text: string): GeoEvidence {
  return {
    explicitCoordinates: extractCoordinateEvidence(text),
    parcels: extractParcelEvidence(text),
    addresses: extractAddressEvidence(text),
  };
}
