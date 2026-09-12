import type { ZoneLessUtmRow } from "@/lib/geo/evidence-extraction";
import { utmToWgs84 } from "@/lib/geo/utm";

export type UtmZoneDecisionSource = "DOCUMENT" | "OMAN_DEFAULT" | "INFERRED" | "NONE";

export interface UtmZoneDecision {
  zone?: number;
  source: UtmZoneDecisionSource;
}

const ZONE_PATTERNS: RegExp[] = [
  /(?:PROJECTION\s*:?\s*)?(?:WGS\s*84\s*)?(?:UTM\s*)?ZONE\s*[:：\-]?\s*(\d{1,2})\s*([NS])?/i,
  /(?:UTM|زون|نطاق|النطاق)\s*[:：\-]?\s*(\d{1,2})\s*([NS])?/i,
  // "WGS84 39N", printed above the coordinate table on Omani survey drawings
  // and nowhere else. It states the datum and the zone in four characters and
  // never uses the word "zone", so every pattern above walked past the one
  // unambiguous statement on the sheet — and a Salalah plot that says 39N was
  // read as 40N and placed seven hundred kilometres out in the Arabian Sea.
  /WGS\s*-?\s*84\s*[:\-]?\s*(\d{1,2})\s*([NS])\b/i,
  // The MGRS grid-zone designator inside a map-sheet number:
  // "40Q/AD/860-840/B10". The slash is required — without it any two digits
  // followed by a letter would qualify.
  /\b(\d{1,2})\s*([C-HJ-NP-X])(?=\s*\/)/,
  /EPSG\s*[:#]?\s*326(\d{2})\b/i,
];

export function explicitUtmZoneFromText(text: string): number | undefined {
  for (const pattern of ZONE_PATTERNS) {
    const match = pattern.exec(text);
    if (!match) continue;
    const zone = Number.parseInt(match[1], 10);
    if (zone >= 1 && zone <= 60) return zone;
  }
  return undefined;
}

export function isOmanDocument(countryCode?: string, text = ""): boolean {
  if (countryCode?.toUpperCase() === "OM") return true;
  return /(?:سلطنة\s+عمان|\boman\b|\bduqm\b|الدقم|\bopaz\b|\bsezad\b)/i.test(text);
}

/**
 * Oman's land, as three latitude bands rather than one rectangle.
 *
 * A single box around the country also contains a large stretch of the Arabian
 * Sea, and a Dhofar parcel misread into zone 40 lands in exactly that water —
 * so a rectangle accepts the wrong answer. Three bands follow the coast closely
 * enough to tell "in the country" from "offshore", which is all that is being
 * asked. Deliberately generous at the edges: the cost of being too tight is
 * changing a reading that was right.
 */
const OMAN_LAND_BANDS: readonly { maxLat: number; minLon: number; maxLon: number }[] = [
  { maxLat: 19, minLon: 51.8, maxLon: 55.6 },   // Dhofar
  { maxLat: 22, minLon: 54.3, maxLon: 58.8 },   // Al Wusta
  { maxLat: 26.6, minLon: 54.9, maxLon: 60.2 }, // the north, and Musandam
];

const OMAN_MIN_LAT = 16.4;

function isOnOmaniLand(lat: number, lon: number): boolean {
  if (lat < OMAN_MIN_LAT) return false;
  const band = OMAN_LAND_BANDS.find((candidate) => lat <= candidate.maxLat);
  if (!band) return false;
  return lon >= band.minLon && lon <= band.maxLon;
}

/**
 * Which of Oman's two zones these coordinates actually fall in.
 *
 * The rule used to be "Omani material is 40N", full stop. Most of the country
 * is — but Dhofar is in 39, and a Salalah deed read as 40 puts the parcel about
 * five hundred kilometres out to sea. Nothing warned: the numbers converted
 * cleanly, because the SAME easting is valid in every zone. It is only valid in
 * a different place.
 *
 * So both candidates are projected and 40 is kept unless it puts the parcel
 * OUTSIDE Oman while 39 puts it inside. That is a narrow test on purpose: a
 * bare easting cannot identify its own zone — the same number is valid in all
 * sixty — so this corrects only the cases where the current answer is provably
 * wrong, and never touches one that already lands in the country. The reliable
 * remedy is the reader's own correction (the zone control above the table);
 * this is the part that can be decided without asking.
 *
 * The source values are untouched — only the grid they are read against.
 */
function omanZoneForRows(rows: readonly ZoneLessUtmRow[]): number {
  const inOman = (zone: number): boolean => {
    let inside = 0;
    let tested = 0;
    for (const row of rows.slice(0, 4)) {
      const point = utmToWgs84(row.easting, row.northing, zone, "N");
      if (!point) continue;
      tested += 1;
      if (isOnOmaniLand(point.lat, point.lon)) inside += 1;
    }
    // Every corner, not a majority: a parcel is a few hundred metres across, so
    // one corner inside and one outside means the zone is wrong, not that the
    // land straddles a border.
    return tested > 0 && inside === tested;
  };

  if (inOman(40)) return 40;
  if (inOman(39)) return 39;
  return 40;
}

/**
 * Product rule:
 * - an explicit document zone always wins;
 * - Omani cadastral/survey material is read in the zone its coordinates fall
 *   in — 40 where most of the country is, 39 for Dhofar;
 * - all other countries keep the existing inference path.
 *
 * This function never changes the source Easting/Northing values.
 */
export function chooseInitialUtmZone(input: {
  text: string;
  countryCode?: string;
  rows: readonly ZoneLessUtmRow[];
  inferFallback: () => number | undefined;
}): UtmZoneDecision {
  const explicit = explicitUtmZoneFromText(input.text);
  if (explicit !== undefined) return { zone: explicit, source: "DOCUMENT" };

  if (input.rows.length >= 2 && isOmanDocument(input.countryCode, input.text)) {
    return { zone: omanZoneForRows(input.rows), source: "OMAN_DEFAULT" };
  }

  const inferred = input.inferFallback();
  return inferred !== undefined
    ? { zone: inferred, source: "INFERRED" }
    : { source: "NONE" };
}
