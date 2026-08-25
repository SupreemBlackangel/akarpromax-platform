/**
 * Document family detection.
 *
 * Runs against whichever profile the country detector selected. A country
 * profile contributes its own families first and inherits the universal ones,
 * so an unrecognised country still gets a meaningful document type.
 */
import { normalizeArabicDigits } from "./numerals";
import type { CountryDocumentProfile, DocumentFamily, DocumentFamilyKind } from "./country-profile";

export interface DocumentTypeDetection {
  familyId: string;
  kind: DocumentFamilyKind;
  label: { ar: string; en: string };
  confidence: number;
  level: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  matchedKeywords: string[];
  /** Other families that also matched, so a mixed document stays visible. */
  alternatives: { familyId: string; kind: DocumentFamilyKind; score: number }[];
}

const UNKNOWN_FAMILY: DocumentTypeDetection = {
  familyId: "unknown-survey-document",
  kind: "UNKNOWN_SURVEY_DOCUMENT",
  label: { ar: "وثيقة مساحية غير محددة", en: "Unknown survey document" },
  confidence: 0.1,
  level: "UNKNOWN",
  matchedKeywords: [],
  alternatives: [],
};

function normalizeForMatching(text: string): string {
  return normalizeArabicDigits(text)
    .toLowerCase()
    .replace(/[ً-ْٰ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ");
}

function scoreFamily(haystack: string, family: DocumentFamily): { score: number; matched: string[] } {
  const matched: string[] = [];
  let score = 0;
  for (const keyword of family.keywords) {
    const needle = normalizeForMatching(keyword);
    if (needle.length >= 2 && haystack.includes(needle)) {
      score += family.weight;
      matched.push(keyword);
    }
  }
  if (score > 0 && family.excludes) {
    for (const exclude of family.excludes) {
      if (haystack.includes(normalizeForMatching(exclude))) return { score: 0, matched: [] };
    }
  }
  return { score, matched };
}

/**
 * Structural evidence that a document is a coordinate schedule even when it
 * uses no recognisable wording: a table of eastings and northings is one.
 */
function structuralCoordinateScheduleScore(text: string): number {
  const hasGridHeader = /(?:northing[\s\S]{0,40}?easting|easting[\s\S]{0,40}?northing)/i.test(text);
  const hasLatLonHeader = /(?:latitude[\s\S]{0,40}?longitude|longitude[\s\S]{0,40}?latitude)/i.test(text);
  const rowCount = (text.match(/(?:^|\s)P?\d{1,3}\s+[\d.,]{6,}\s+[\d.,]{6,}/gm) ?? []).length;
  let score = 0;
  if (hasGridHeader || hasLatLonHeader) score += 4;
  if (rowCount >= 3) score += 3;
  return score;
}

export function detectDocumentType(
  text: string,
  profile: CountryDocumentProfile,
): DocumentTypeDetection {
  const haystack = normalizeForMatching(text);

  const scored = profile.documentFamilies
    .map((family) => {
      const { score, matched } = scoreFamily(haystack, family);
      const bonus = family.kind === "COORDINATE_SCHEDULE" ? structuralCoordinateScheduleScore(text) : 0;
      return { family, score: score + bonus, matched };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);

  const best = scored[0];
  if (!best) {
    // No wording matched, but a plain coordinate table is still a known type.
    const structural = structuralCoordinateScheduleScore(text);
    if (structural >= 4) {
      return {
        familyId: "generic-coordinate-schedule",
        kind: "COORDINATE_SCHEDULE",
        label: { ar: "جدول إحداثيات", en: "Coordinate schedule" },
        confidence: 0.5,
        level: "MEDIUM",
        matchedKeywords: [],
        alternatives: [],
      };
    }
    return UNKNOWN_FAMILY;
  }

  const level = best.score >= 8 ? "HIGH" : best.score >= 4 ? "MEDIUM" : "LOW";
  return {
    familyId: best.family.id,
    kind: best.family.kind,
    label: best.family.label,
    confidence: Math.min(0.98, 0.3 + best.score / 16),
    level,
    matchedKeywords: best.matched,
    alternatives: scored.slice(1, 4).map((entry) => ({
      familyId: entry.family.id,
      kind: entry.family.kind,
      score: entry.score,
    })),
  };
}
