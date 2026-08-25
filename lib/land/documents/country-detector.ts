/**
 * Country detection for survey documents.
 *
 * Six independent evidence classes are scored, in descending strength:
 * an issuing authority, an explicit country name, country-specific
 * terminology, a city or region, and — only as corroboration — coordinates
 * that fall inside a country's envelope.
 *
 * There is no fallback country. When the evidence is thin the result is
 * `UNKNOWN` with a low confidence, and the generic profile is used.
 */
import type { Point } from "@/lib/geo/contracts";
import { normalizeArabicDigits } from "./numerals";
import {
  COUNTRY_PROFILES,
  GENERIC_PROFILE,
  getCountryProfile,
} from "./profiles";
import { isPointInProfileBounds, type CountryDocumentProfile } from "./country-profile";

export type CountryConfidenceLevel = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

export type CountryEvidenceKind =
  | "AUTHORITY"
  | "COUNTRY_NAME"
  | "TERMINOLOGY"
  | "PLACE"
  | "COORDINATES"
  | "USER_SUPPLIED";

export interface CountryEvidenceHit {
  kind: CountryEvidenceKind;
  /** The exact term matched, for the evidence log. */
  term: string;
  weight: number;
}

export interface CountryDetection {
  countryCode: string;
  profile: CountryDocumentProfile;
  confidence: number;
  level: CountryConfidenceLevel;
  evidence: CountryEvidenceHit[];
  /** Other countries that also scored, so a close call stays visible. */
  runnersUp: { countryCode: string; score: number }[];
  /** True when the country was named by the caller rather than detected. */
  userSupplied: boolean;
}

const WEIGHTS: Record<CountryEvidenceKind, number> = {
  AUTHORITY: 6,
  COUNTRY_NAME: 5,
  TERMINOLOGY: 2,
  PLACE: 3,
  COORDINATES: 4,
  USER_SUPPLIED: 12,
};

/** Score at or above which a detection is trusted without corroboration. */
const HIGH_SCORE = 9;
const MEDIUM_SCORE = 5;
const MIN_SCORE = 3;
/** A win must beat the runner-up by this much, or it is only MEDIUM at best. */
const DECISIVE_MARGIN = 3;

function normalizeForMatching(text: string): string {
  return normalizeArabicDigits(text)
    .toLowerCase()
    .replace(/[ً-ْٰ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ");
}

function matchTerms(
  haystack: string,
  terms: readonly string[],
  kind: CountryEvidenceKind,
  limit = 4,
): CountryEvidenceHit[] {
  const hits: CountryEvidenceHit[] = [];
  for (const term of terms) {
    if (hits.length >= limit) break;
    const needle = normalizeForMatching(term);
    if (needle.length >= 3 && haystack.includes(needle)) {
      hits.push({ kind, term, weight: WEIGHTS[kind] });
    }
  }
  return hits;
}

export interface CountryDetectionInput {
  text: string;
  /** File name and any PDF metadata, searched alongside the body text. */
  metadataText?: string;
  /** WGS84 points already resolved from the document, if any. */
  points?: readonly Point[];
  /** An explicit country from the caller. Trusted over detection. */
  countryCode?: string;
}

/**
 * Detects the country a survey document comes from.
 *
 * Coordinates alone never establish a country on their own — several
 * countries share an envelope — so they add weight rather than decide.
 */
export function detectDocumentCountry(input: CountryDetectionInput): CountryDetection {
  if (input.countryCode) {
    const profile = getCountryProfile(input.countryCode);
    if (profile.countryCode !== "UNKNOWN") {
      return {
        countryCode: profile.countryCode,
        profile,
        confidence: 1,
        level: "HIGH",
        evidence: [{ kind: "USER_SUPPLIED", term: profile.countryCode, weight: WEIGHTS.USER_SUPPLIED }],
        runnersUp: [],
        userSupplied: true,
      };
    }
  }

  const haystack = normalizeForMatching(`${input.metadataText ?? ""}\n${input.text}`);
  const points = input.points ?? [];

  const scored = COUNTRY_PROFILES.map((profile) => {
    const evidence: CountryEvidenceHit[] = [
      ...matchTerms(haystack, profile.authorities, "AUTHORITY", 2),
      ...matchTerms(haystack, profile.countryNames, "COUNTRY_NAME", 2),
      ...matchTerms(haystack, profile.places, "PLACE", 3),
      ...matchTerms(haystack, profile.terminology, "TERMINOLOGY", 3),
    ];

    if (points.length > 0 && profile.bounds) {
      const inside = points.filter((point) => isPointInProfileBounds(profile, point)).length;
      if (inside === points.length) {
        evidence.push({
          kind: "COORDINATES",
          term: `${points.length} point(s) inside ${profile.countryCode}`,
          weight: WEIGHTS.COORDINATES,
        });
      }
    }

    const score = evidence.reduce((total, hit) => total + hit.weight, 0);
    return { profile, evidence, score };
  })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);

  const best = scored[0];
  const second = scored[1];

  if (!best || best.score < MIN_SCORE) {
    return {
      countryCode: "UNKNOWN",
      profile: GENERIC_PROFILE,
      confidence: best ? Math.min(0.25, best.score / 20) : 0,
      level: "UNKNOWN",
      evidence: best?.evidence ?? [],
      runnersUp: scored.slice(0, 3).map((entry) => ({ countryCode: entry.profile.countryCode, score: entry.score })),
      userSupplied: false,
    };
  }

  const margin = best.score - (second?.score ?? 0);
  const decisive = margin >= DECISIVE_MARGIN;
  // Coordinates corroborate; they never carry a detection by themselves.
  const hasTextualEvidence = best.evidence.some((hit) => hit.kind !== "COORDINATES");

  let level: CountryConfidenceLevel;
  if (!hasTextualEvidence) level = "LOW";
  else if (best.score >= HIGH_SCORE && decisive) level = "HIGH";
  else if (best.score >= MEDIUM_SCORE) level = "MEDIUM";
  else level = "LOW";

  return {
    countryCode: best.profile.countryCode,
    profile: best.profile,
    confidence: Math.min(0.99, best.score / 16),
    level,
    evidence: best.evidence,
    runnersUp: scored.slice(1, 4).map((entry) => ({ countryCode: entry.profile.countryCode, score: entry.score })),
    userSupplied: false,
  };
}

/** Human-readable summary, e.g. `Saudi Arabia — High confidence`. */
export function describeCountryDetection(detection: CountryDetection, locale: "ar" | "en" = "en"): string {
  if (detection.countryCode === "UNKNOWN") {
    return locale === "ar" ? "الدولة غير محددة" : "Country uncertain";
  }
  const name = locale === "ar" ? detection.profile.label.ar : detection.profile.label.en;
  const levels = {
    HIGH: { ar: "ثقة عالية", en: "High confidence" },
    MEDIUM: { ar: "ثقة متوسطة", en: "Medium confidence" },
    LOW: { ar: "ثقة منخفضة", en: "Low confidence" },
    UNKNOWN: { ar: "غير محددة", en: "Uncertain" },
  } as const;
  return `${name} — ${levels[detection.level][locale]}`;
}
