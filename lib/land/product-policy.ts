import type { ZoneLessUtmRow } from "@/lib/geo/evidence-extraction";

export type UtmZoneDecisionSource = "DOCUMENT" | "OMAN_DEFAULT" | "INFERRED" | "NONE";

export interface UtmZoneDecision {
  zone?: number;
  source: UtmZoneDecisionSource;
}

const ZONE_PATTERNS: RegExp[] = [
  /(?:PROJECTION\s*:?\s*)?(?:WGS\s*84\s*)?(?:UTM\s*)?ZONE\s*[:：\-]?\s*(\d{1,2})\s*([NS])?/i,
  /(?:UTM|زون|نطاق|النطاق)\s*[:：\-]?\s*(\d{1,2})\s*([NS])?/i,
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
 * Product rule:
 * - an explicit document zone always wins;
 * - Omani cadastral/survey material defaults to UTM 40N;
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
    return { zone: 40, source: "OMAN_DEFAULT" };
  }

  const inferred = input.inferFallback();
  return inferred !== undefined
    ? { zone: inferred, source: "INFERRED" }
    : { source: "NONE" };
}
