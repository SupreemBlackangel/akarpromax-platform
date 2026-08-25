/**
 * Admission control for unlabelled decimal pairs.
 *
 * Two numbers side by side that happen to fall inside the latitude and
 * longitude ranges are not a coordinate. A survey sheet is full of them: side
 * lengths, setbacks, plot dimensions, scales, elevations. Reading one of those
 * as a parcel corner is the single most dangerous thing this engine can do,
 * because the result looks perfectly ordinary.
 *
 * A pair is therefore admitted only on positive evidence that it is a
 * coordinate — never merely on the absence of evidence that it is not. A
 * word list alone would be a blacklist, and a blacklist can only ever catch
 * the wordings someone thought of; the structural requirement below is what
 * actually carries the safety, and the vocabulary demotes on top of it.
 */

/**
 * Contexts in which a decimal pair is describing a measurement of the parcel
 * rather than a position on the earth.
 */
const NEGATIVE_CONTEXT_TERMS: readonly string[] = [
  // English
  "dist", "distance", "length", "len", "width", "height", "elevation", "elev",
  "area", "scale", "setback", "offset", "radius", "perimeter", "depth",
  "frontage", "side", "chord", "spacing", "sq. m", "sq.m", "sqm",
  // Turkish
  "mesafe", "uzunluk", "genislik", "genişlik", "alan", "olcek", "ölçek",
  "yukseklik", "yükseklik", "kot", "cekme", "çekme", "kenar",
  // Arabic
  "مسافة", "المسافة", "مسافات", "طول", "الطول", "اطوال", "الأطوال", "الاطوال",
  "عرض", "العرض", "ارتفاع", "الارتفاع", "منسوب", "مساحة", "المساحة", "المساحه",
  "مقياس", "المقياس", "ارتداد", "الارتدادات", "الإرتدادات", "ضلع", "الضلع", "اضلاع",
  "محيط", "المحيط", "نصف قطر", "متر مربع",
];

/**
 * Contexts that positively identify the numbers as a position. These are the
 * words a document uses when it means "where", not "how big".
 */
const POSITIVE_CONTEXT_TERMS: readonly string[] = [
  // English
  "coordinate", "coordinates", "coord", "latitude", "longitude", "lat", "lon",
  "lng", "easting", "northing", "wgs84", "wgs 84", "utm", "gps", "position",
  "geographic", "datum", "epsg",
  // Turkish
  "koordinat", "koordinatlar", "enlem", "boylam", "sağa", "saga", "yukari",
  "yukarı", "itrf", "ed50",
  // Arabic
  "احداثي", "احداثيات", "الاحداثيات", "الإحداثيات", "الاحداثي", "الإحداثي",
  "خط العرض", "خط الطول", "دائرة العرض", "شرقيات", "شماليات", "الموقع",
  "نظام الاحداثيات", "مرجع",
];

/** How far either side of the pair the surrounding words are read. */
export const CONTEXT_WINDOW_CHARS = 72;

/**
 * A parcel has at least three corners. One or two loose pairs in a document
 * are, structurally, not a boundary — whatever their magnitudes say.
 */
export const MIN_STRUCTURAL_SIBLINGS = 3;

export type PairAdmission = "ACCEPT" | "REVIEW_ONLY" | "REJECT";

export interface LooseDecimalContext {
  /** Text immediately before and after the pair, already sliced by the caller. */
  window: string;
  /**
   * Where the pair itself starts inside {@link window}. Used to weigh
   * competing vocabulary by proximity: a survey sheet contains both
   * `NORTHING` and `DIST`, and which one the numbers belong to is decided by
   * which is nearer, not by which exists. Defaults to the middle.
   */
  pairOffset?: number;
  /**
   * How many pairs of the same shape the document holds. A boundary comes as
   * a set; a dimension comes alone or in twos.
   */
  siblingCount: number;
  /**
   * True when a structured reader (a reconstructed layout column, an explicit
   * coordinate table) already identified these numbers as a coordinate. This
   * is the strongest positive evidence there is, and it bypasses the word
   * vocabulary entirely.
   */
  structurallyIdentified?: boolean;
}

export interface AdmissionVerdict {
  admission: PairAdmission;
  /** Named evidence, in the order it was considered. Never a bare score. */
  evidence: string[];
  reason: string;
}

function normalizeContext(value: string): string {
  return value
    .toLowerCase()
    .replace(/[ً-ْٰ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ");
}

interface VocabularyHit {
  term: string;
  /** Characters between the term and the pair. */
  distance: number;
}

function matches(window: string, terms: readonly string[], pairOffset: number): VocabularyHit[] {
  const hits: VocabularyHit[] = [];
  for (const term of terms) {
    const needle = normalizeContext(term);
    if (!needle) continue;
    let index = window.indexOf(needle);
    let best = Number.POSITIVE_INFINITY;
    while (index >= 0) {
      const end = index + needle.length;
      const distance = index > pairOffset ? index - pairOffset : Math.max(0, pairOffset - end);
      best = Math.min(best, distance);
      index = window.indexOf(needle, index + 1);
    }
    if (Number.isFinite(best)) hits.push({ term, distance: best });
  }
  return hits.sort((left, right) => left.distance - right.distance);
}

/**
 * Decides whether an unlabelled decimal pair may be treated as a geographic
 * coordinate.
 *
 * `REJECT` means the pair is not a coordinate candidate at all and must not
 * reach clustering, the map, or the candidate count. `REVIEW_ONLY` means it
 * may be carried as evidence but can never on its own raise a document above
 * review. `ACCEPT` means positive evidence was found.
 */
export function admitLooseDecimalPair(context: LooseDecimalContext): AdmissionVerdict {
  const window = normalizeContext(context.window);
  const pairOffset = Number.isFinite(context.pairOffset)
    ? Math.max(0, Math.min(window.length, context.pairOffset as number))
    : Math.floor(window.length / 2);
  const negativeHits = matches(window, NEGATIVE_CONTEXT_TERMS, pairOffset);
  const positiveHits = matches(window, POSITIVE_CONTEXT_TERMS, pairOffset);
  const siblings = Number.isFinite(context.siblingCount) ? context.siblingCount : 0;
  const evidence: string[] = [];

  // When a page carries both vocabularies — and a survey sheet always does —
  // the nearer one owns the numbers.
  const nearestNegative = negativeHits[0]?.distance ?? Number.POSITIVE_INFINITY;
  const nearestPositive = positiveHits[0]?.distance ?? Number.POSITIVE_INFINITY;
  const negative = nearestNegative <= nearestPositive ? negativeHits.map((hit) => hit.term) : [];
  const positive = nearestPositive < nearestNegative ? positiveHits.map((hit) => hit.term) : [];

  if (context.structurallyIdentified) evidence.push("identified by a structured reader");
  if (positive.length > 0) evidence.push(`coordinate vocabulary: ${positive.slice(0, 3).join(", ")}`);
  if (negative.length > 0) evidence.push(`measurement vocabulary: ${negative.slice(0, 3).join(", ")}`);
  if (negative.length > 0 && positiveHits.length > 0) {
    evidence.push("measurement wording sits closer to the numbers than the coordinate wording does");
  }
  if (positive.length > 0 && negativeHits.length > 0) {
    evidence.push("coordinate wording sits closer to the numbers than the measurement wording does");
  }
  if (siblings >= MIN_STRUCTURAL_SIBLINGS) evidence.push(`${siblings} sibling pairs of the same shape`);

  // A structured reader outranks every word in the neighbourhood.
  if (context.structurallyIdentified) {
    return { admission: "ACCEPT", evidence, reason: "a structured reader identified these numbers as a coordinate" };
  }

  // Measurement wording with nothing positive to set against it: not a place.
  if (negative.length > 0 && positive.length === 0) {
    return {
      admission: "REJECT",
      evidence,
      reason: `the numbers sit in a measurement context (${negative.slice(0, 3).join(", ")}), so they describe the parcel rather than locate it`,
    };
  }

  if (positive.length > 0) {
    return { admission: "ACCEPT", evidence, reason: "the document names these numbers as coordinates" };
  }

  // No wording either way. Structure has to carry it, and a boundary is a set.
  if (siblings < MIN_STRUCTURAL_SIBLINGS) {
    return {
      admission: "REJECT",
      evidence,
      reason: `only ${siblings} unlabelled pair(s) with no coordinate vocabulary; a boundary needs at least ${MIN_STRUCTURAL_SIBLINGS}`,
    };
  }

  // Enough of them to be a boundary, but nothing says they are one.
  if (negative.length > 0) {
    return {
      admission: "REVIEW_ONLY",
      evidence,
      reason: "a repeated numeric structure inside a measurement context; it needs review before it can be mapped",
    };
  }
  return {
    admission: "REVIEW_ONLY",
    evidence,
    reason: "a repeated numeric structure with no coordinate vocabulary; it needs review before it can be mapped",
  };
}

/** The window of text a caller should hand to {@link admitLooseDecimalPair}. */
export function contextWindow(text: string, start: number, end: number): string {
  const from = Math.max(0, start - CONTEXT_WINDOW_CHARS);
  const to = Math.min(text.length, end + CONTEXT_WINDOW_CHARS);
  return text.slice(from, to);
}
