import proj4 from "proj4";

export type ExtractedPoint = {
  label: string;
  lat: number;
  lng: number;
  easting?: number;
  northing?: number;
  utmZone?: number;
};

export type ExtractedLandDetails = {
  owner?: string;
  documentNumber?: string;
  planNumber?: string;
  parcelNumber?: string;
  area?: string;
  dimensions?: string;
  city?: string;
  district?: string;
  country?: string;
  landType?: string;
  legalStatus?: string;
  zoning?: string;
  northBorder?: string;
  southBorder?: string;
  eastBorder?: string;
  westBorder?: string;
};

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

function normalizeDigits(text: string): string {
  let result = text
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)));
  result = result
    .replace(/[OoQ](?=\d)/g, "0")
    .replace(/(?<=\d)[OoQ]/g, "0")
    .replace(/\|(?=\d)/g, "1")
    .replace(/(?<=\d)\|/g, "1")
    .replace(/[,،](?=\d)/g, ".")
    .replace(/(?<=\d)[,،]/g, ".");
  return result;
}

function normalizeArabic(text: string): string {
  return normalizeDigits(text)
    .normalize("NFKC")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/[ةۀ]/g, "ه")
    .replace(/[ىيیۍ]/g, "ي")
    .replace(/[ـ]/g, "")
    .replace(/،/g, ",")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();
}

/**
 * Reads a UTM zone stated in a document. Every zone from 1 to 60 is accepted,
 * anywhere in the world. `undefined` means the document does not state one —
 * callers must decide what to do rather than receive an invented zone.
 */
function detectUtmZone(text: string): number | undefined {
  const clean = normalizeDigits(text);
  const patterns = [
    /(?:UTM|Zone|zone|نطاق|زون|النطاق)\s*[:：\-]?\s*(\d{1,2})(?!\d)/i,
    /Zone\s*(\d{1,2})\s*[NS]\b/i,
    /EPSG\s*[:#]?\s*32[67](\d{2})/i,
  ];
  for (const pattern of patterns) {
    const match = clean.match(pattern);
    if (!match) continue;
    const zone = Number.parseInt(match[1], 10);
    if (Number.isInteger(zone) && zone >= 1 && zone <= 60) return zone;
  }
  return undefined;
}

function fromUtm(easting: number, northing: number, zone: number, northernHemisphere = true): { lat: number; lng: number } {
  const utm = `+proj=utm +zone=${zone} ${northernHemisphere ? "" : "+south "}+datum=WGS84 +units=m +no_defs`;
  const wgs84 = "+proj=longlat +datum=WGS84 +no_defs";
  const [lng, lat] = proj4(utm, wgs84, [easting, northing]);
  return { lat, lng };
}

function toUtm(lat: number, lng: number, zone: number, northernHemisphere = lat >= 0): { easting: number; northing: number } {
  const utm = `+proj=utm +zone=${zone} ${northernHemisphere ? "" : "+south "}+datum=WGS84 +units=m +no_defs`;
  const wgs84 = "+proj=longlat +datum=WGS84 +no_defs";
  const [easting, northing] = proj4(wgs84, utm, [lng, lat]);
  return { easting, northing };
}

/**
 * `zone` is the UTM zone the document states. When it is absent, UTM grid rows
 * are left unconverted instead of being projected against an assumed zone.
 */
function extractCoordinates(text: string, zone?: number): ExtractedPoint[] {
  const clean = normalizeDigits(text).normalize("NFKC");
  const points: ExtractedPoint[] = [];
  const seen = new Set<string>();

  const add = (point: Omit<ExtractedPoint, "label"> & { label?: string }) => {
    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return;
    if (point.lat < -90 || point.lat > 90 || point.lng < -180 || point.lng > 180) return;
    const key = `${point.lat.toFixed(7)},${point.lng.toFixed(7)}`;
    if (seen.has(key)) return;
    seen.add(key);
    points.push({ ...point, label: point.label || `P${points.length + 1}` });
  };

  const baladyPattern = /N\s+(\d{1,3}\.\d{5,})\s*E\s+(\d{1,3}\.\d{5,})\s+(\d{4,9})/gi;
  let match: RegExpExecArray | null;
  let count = 1;
  while ((match = baladyPattern.exec(clean)) !== null) {
    const lat = Number.parseFloat(match[1]);
    const lng = Number.parseFloat(match[2]);
    add({ lat, lng, label: String(count++) });
  }

  const saudiPattern = /(\d{4,8})\s+(\d{1,3}\.\d{5,})\s*E\s+(\d{1,3}\.\d{5,})\s*N/g;
  while ((match = saudiPattern.exec(clean)) !== null) {
    const lng = Number.parseFloat(match[2]);
    const lat = Number.parseFloat(match[3]);
    add({ lat, lng, label: match[1] });
  }

  if (points.length === 0) {
    const labeledWgs = /(\d{1,3}(?:\.\d{4,}))\s*[°]?\s*([EN])\s*[,;|\s]+\s*(\d{1,3}(?:\.\d{4,}))\s*[°]?\s*([EN])/gi;
    while ((match = labeledWgs.exec(clean)) !== null) {
      const first = Number.parseFloat(match[1]);
      const second = Number.parseFloat(match[3]);
      const firstAxis = match[2].toUpperCase();
      const lat = firstAxis === "N" ? first : second;
      const lng = firstAxis === "E" ? first : second;
      add({ lat, lng });
    }
  }

  if (points.length === 0 && zone !== undefined) {
    const utmRows = /(?:^|\n|\s)(?:P|Point|نقطه)?\s*(\d{1,3})\s*[,;|\t ]+\s*(\d{5,7}(?:\.\d+)?)\s*[,;|\t ]+\s*(\d{6,8}(?:\.\d+)?)(?=\s|$)/gi;
    while ((match = utmRows.exec(clean)) !== null) {
      const easting = Number.parseFloat(match[2]);
      const northing = Number.parseFloat(match[3]);
      if (easting < 100_000 || easting > 900_000 || northing < 1_000_000) continue;
      const converted = fromUtm(easting, northing, zone);
      add({ ...converted, label: match[1], easting, northing, utmZone: zone });
    }
  }

  if (points.length === 0) {
    const decimalPairs = /(-?\d{1,3}\.\d{5,})\s*[,;|\t ]+\s*(-?\d{1,3}\.\d{5,})/g;
    while ((match = decimalPairs.exec(clean)) !== null) {
      const first = Number.parseFloat(match[1]);
      const second = Number.parseFloat(match[2]);
      // Only an impossible latitude proves the column order worldwide.
      if (Math.abs(first) <= 90 && Math.abs(second) <= 180) {
        add({ lat: first, lng: second });
      } else if (Math.abs(second) <= 90 && Math.abs(first) <= 180) {
        add({ lat: second, lng: first });
      }
    }
  }

  return points;
}

function cleanField(value?: string): string | undefined {
  const cleaned = value
    ?.replace(/^[\s:：#\-–—]+/, "")
    .replace(/[|]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  const repeatedArabicPairs = cleaned?.match(/([\u0621-\u064A])\1/g) ?? [];
  if (repeatedArabicPairs.length >= 2) return undefined;
  return cleaned || undefined;
}

function firstMatch(text: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    const value = cleanField(match?.[1]);
    if (value) return value;
  }
  return undefined;
}

function repeatedSurveyArea(text: string): string | undefined {
  const isSurveyDocument = /(?:مساح|ارض|قطعه|صك|survey|parcel|land|deed)/i.test(text);
  if (!isSurveyDocument) return undefined;

  const candidates = [...text.matchAll(/\b(\d{2,7}(?:[.,]\d{1,2})?)\s+\1\b/g)]
    .map((match) => ({ text: match[1], value: Number.parseFloat(match[1].replace(/,/g, "")) }))
    .filter(({ value }) => Number.isFinite(value) && value >= 50 && value <= 10_000_000)
    .sort((left, right) => right.value - left.value);

  return candidates[0]?.text;
}

function extractLandDetails(text: string): ExtractedLandDetails {
  const clean = normalizeArabic(text);
  const lineValue = "([^\\n،;]{2,80})";
  const registeredArea = firstMatch(clean, [
    /(?:المساحه|اجمالي\s*المساحه|area)\s*[:：=#\-]?\s*([\d,.]+)\s*(?:م\s*[²2]|متر\s*مربع|m\s*[²2]|sq\.?\s*m\.?)/i,
    /([\d,.]+)\s*(?:م\s*[²2]|متر\s*مربع|m\s*[²2]|sq\.?\s*m\.?)\s*(?:المساحه|اجمالي\s*المساحه|area)/i,
    /(?:المساحه|اجمالي\s*المساحه|area)\s*[:：#\-]?\s*([\d,.]+)\s*(?:م\s*[²2]|متر\s*مربع|m\s*[²2]|sq\.?\s*m)?/i,
    /([\d,.]+)\s*(?:م\s*[²2]|متر\s*مربع|m\s*[²2]|sq\.?\s*m)?\s*(?:المساحه|اجمالي\s*المساحه|area)/i,
  ]) ?? repeatedSurveyArea(clean);
  const details: ExtractedLandDetails = {
    owner: firstMatch(clean, [
      new RegExp(`(?:اسم\\s*المالك|المالك|owner(?:\\s*name)?)\\s*[:：#\\-]?\\s*${lineValue}`, "i"),
    ]),
    documentNumber: firstMatch(clean, [
      /(?:رقم\s*(?:الوثيقه|الصك)|صك\s*رقم|document\s*(?:no\.?|number)|deed\s*(?:no\.?|number))\s*[:：#\-]?\s*([0-9/\\-]{3,30})/i,
    ]),
    planNumber: firstMatch(clean, [
      /(?:رقم\s*المخطط|المخطط\s*رقم|plan\s*(?:no\.?|number))\s*[:：#\-]?\s*([0-9A-Za-z/\\-]{1,24})/i,
    ]),
    parcelNumber: firstMatch(clean, [
      /(?:رقم\s*(?:القطعه|الارض)|القطعه\s*رقم|parcel\s*(?:no\.?|number)|plot\s*(?:no\.?|number))\s*[:：#\-]?\s*([0-9A-Za-z/\\-]{1,24})/i,
    ]),
    area: registeredArea,
    dimensions: firstMatch(clean, [
      new RegExp(`(?:الابعاد|dimensions?)\\s*[:：#\\-]?\\s*${lineValue}`, "i"),
    ]),
    city: firstMatch(clean, [
      new RegExp(`(?:المدينه|city)\\s*[:：#\\-]?\\s*${lineValue}`, "i"),
    ]),
    district: firstMatch(clean, [
      new RegExp(`(?:الحي|حي|district)\\s*[:：#\\-]?\\s*${lineValue}`, "i"),
    ]),
    country: firstMatch(clean, [
      new RegExp(`(?:الدوله|country)\\s*[:：#\\-]?\\s*${lineValue}`, "i"),
    ]),
    landType: firstMatch(clean, [
      new RegExp(`(?:نوع\\s*(?:العقار|الارض)|land\\s*type|property\\s*type)\\s*[:：#\\-]?\\s*${lineValue}`, "i"),
    ]),
    legalStatus: firstMatch(clean, [
      new RegExp(`(?:الحاله\\s*القانونيه|legal\\s*status)\\s*[:：#\\-]?\\s*${lineValue}`, "i"),
    ]),
    zoning: firstMatch(clean, [
      new RegExp(`(?:التصنيف\\s*التنظيمي|التنظيم|zoning)\\s*[:：#\\-]?\\s*${lineValue}`, "i"),
    ]),
    northBorder: firstMatch(clean, [
      new RegExp(`(?:الحد\\s*الشمالي|شمالا|north(?:ern)?\\s*border)\\s*[:：#\\-]?\\s*${lineValue}`, "i"),
    ]),
    southBorder: firstMatch(clean, [
      new RegExp(`(?:الحد\\s*الجنوبي|جنوبا|south(?:ern)?\\s*border)\\s*[:：#\\-]?\\s*${lineValue}`, "i"),
    ]),
    eastBorder: firstMatch(clean, [
      new RegExp(`(?:الحد\\s*الشرقي|شرقا|east(?:ern)?\\s*border)\\s*[:：#\\-]?\\s*${lineValue}`, "i"),
    ]),
    westBorder: firstMatch(clean, [
      new RegExp(`(?:الحد\\s*الغربي|غربا|west(?:ern)?\\s*border)\\s*[:：#\\-]?\\s*${lineValue}`, "i"),
    ]),
  };

  return Object.fromEntries(
    Object.entries(details).filter(([, value]) => value !== undefined),
  ) as ExtractedLandDetails;
}

function shoelaceArea(coords: Array<[number, number]>): number {
  if (coords.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < coords.length; i += 1) {
    const next = (i + 1) % coords.length;
    area += coords[i][0] * coords[next][1] - coords[next][0] * coords[i][1];
  }
  return Math.abs(area) / 2;
}

export {
  detectUtmZone,
  extractCoordinates,
  extractLandDetails,
  fromUtm,
  normalizeArabic,
  shoelaceArea,
  toUtm,
};
