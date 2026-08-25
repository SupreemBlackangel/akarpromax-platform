/**
 * Deciding which pages need to be read as pictures.
 *
 * The old rule was a text-length threshold: if a PDF carried more than a
 * handful of characters, it was treated as a text document and OCR never ran.
 * A planning report whose survey sketch is a scanned image defeats that rule
 * completely — the letterhead, the caption and the footer supply plenty of
 * characters, and the one page that actually holds the parcel is a raster nobody
 * ever looks at.
 *
 * Sufficiency is therefore judged on structure, not volume: does this page
 * carry a coordinate table that was actually read? And the pages that fail
 * that test are ranked by how likely they are to hold survey content, so a
 * krokisi on page 10 of a 40-page report is reached. Nothing here assumes the
 * interesting page is near the front.
 */

export interface PageTextStats {
  /** 1-based page number. */
  page: number;
  /** Non-whitespace characters of native text on the page. */
  textChars: number;
  /** Share of the page area covered by text boxes, 0..1. */
  textCoverage: number;
  /** How many image-painting operations the page performs. */
  imageOperations: number;
  /** Layout rows carrying at least two numeric cells. */
  numericRows: number;
  /** Coordinate rows a table reader actually recovered from the native text. */
  coordinateRows: number;
  /** Survey vocabulary found on this page, as matched. */
  vocabularyHits: readonly string[];
}

export interface NativeEvidenceVerdict {
  sufficient: boolean;
  reasons: string[];
  /** True when the page is mostly picture with a caption's worth of text. */
  rasterDominant: boolean;
}

/**
 * Words that mark a page as carrying survey or cadastral content, in the three
 * languages of the region plus the English used on international sheets. This
 * list steers *where to look*; it never decides what a number means.
 */
export const SURVEY_VOCABULARY: readonly string[] = [
  // English
  "coordinate", "coordinates", "easting", "northing", "latitude", "longitude",
  "survey", "surveyed", "cadastral", "cadastre", "plot", "parcel", "boundary",
  "site plan", "layout plan", "krooki", "utm", "wgs84", "wgs 84", "datum", "bearing",
  // Turkish
  "aplikasyon", "krokisi", "kroki", "koordinat", "koordinatlar", "parsel",
  "ada", "pafta", "kadastro", "tapu", "imar", "mevkii", "itrf", "ed50",
  // Arabic
  "احداثيات", "الاحداثيات", "الإحداثيات", "احداثي", "كروكي", "الرسم المساحي",
  "رسم مساحي", "مساحي", "قطعة", "القطعة", "قسيمة", "مخطط", "المخطط", "حدود",
  "الحدود", "صك", "شماليات", "شرقيات", "المساحة",
];

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[ً-ْٰ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ");
}

/** Survey vocabulary present in a piece of text. */
export function surveyVocabularyHits(text: string): string[] {
  const haystack = normalize(text);
  return SURVEY_VOCABULARY.filter((term) => haystack.includes(normalize(term)));
}

/** Below this share of the page, text is a caption rather than a document. */
const CAPTION_TEXT_COVERAGE = 0.12;
/** A page with fewer characters than this cannot hold a coordinate schedule. */
const MINIMUM_SCHEDULE_CHARS = 120;
/** A coordinate table has at least this many rows. */
const MINIMUM_COORDINATE_ROWS = 3;

/**
 * Whether a page's native text already carries the survey evidence it holds.
 *
 * The only thing that makes a page sufficient is a coordinate table that was
 * actually recovered from it. Everything else is a reason to look again with
 * OCR — including a page full of prose, because prose is not a parcel.
 */
export function isNativeSurveyEvidenceSufficient(page: PageTextStats): NativeEvidenceVerdict {
  const reasons: string[] = [];
  const rasterDominant = page.imageOperations > 0 && page.textCoverage < CAPTION_TEXT_COVERAGE;

  if (page.coordinateRows >= MINIMUM_COORDINATE_ROWS) {
    return {
      sufficient: true,
      reasons: [`${page.coordinateRows} coordinate rows were read from the page's own text layer`],
      rasterDominant,
    };
  }
  if (page.coordinateRows > 0 && !rasterDominant) {
    return {
      sufficient: true,
      reasons: [`${page.coordinateRows} coordinate row(s) read from the text layer, and the page is not mostly imagery`],
      rasterDominant,
    };
  }

  if (page.coordinateRows === 0) reasons.push("no coordinate table was recovered from the text layer");
  if (rasterDominant) reasons.push("the page is mostly imagery with a caption's worth of text");
  if (page.textChars < MINIMUM_SCHEDULE_CHARS) reasons.push(`only ${page.textChars} characters of native text`);
  if (page.numericRows > 0 && page.coordinateRows === 0) {
    reasons.push(`${page.numericRows} numeric row(s) present but none could be read as coordinates`);
  }
  if (reasons.length === 0) reasons.push("the text layer carries no survey structure");

  return { sufficient: false, reasons, rasterDominant };
}

export interface PageOcrCandidate {
  page: number;
  /** Named reasons this page was chosen, strongest first. */
  reasons: string[];
  /** Relative ranking only; never a confidence in the content. */
  score: number;
}

export interface OcrSelectionOptions {
  /** Hard ceiling on pages sent to OCR. Bounded work, not a page-order rule. */
  maxPages?: number;
  /** Pages sampled across the document when nothing scores at all. */
  fallbackPages?: number;
}

const DEFAULT_MAX_OCR_PAGES = 12;
const DEFAULT_FALLBACK_PAGES = 4;

/**
 * Chooses which pages to rasterise and read.
 *
 * Pages are ranked by the evidence they actually show — survey vocabulary,
 * imagery, unread numeric structure — and the budget is spent on the best of
 * them wherever they sit in the document. When no page shows anything at all
 * and the document is image-heavy, a bounded sample is spread across the whole
 * document, including its last page, rather than taken from the front.
 */
export function selectPagesForOcr(
  pages: readonly PageTextStats[],
  options: OcrSelectionOptions = {},
): PageOcrCandidate[] {
  const maxPages = Math.max(1, options.maxPages ?? DEFAULT_MAX_OCR_PAGES);
  const fallbackPages = Math.max(1, options.fallbackPages ?? DEFAULT_FALLBACK_PAGES);
  if (pages.length === 0) return [];

  const candidates: PageOcrCandidate[] = [];
  for (const page of pages) {
    const verdict = isNativeSurveyEvidenceSufficient(page);
    if (verdict.sufficient) continue;

    let score = 0;
    const reasons: string[] = [];
    if (page.vocabularyHits.length > 0) {
      score += 6;
      reasons.push(`survey vocabulary on the page: ${page.vocabularyHits.slice(0, 4).join(", ")}`);
    }
    if (verdict.rasterDominant) {
      score += 4;
      reasons.push("the page is mostly imagery");
    } else if (page.imageOperations > 0) {
      score += 2;
      reasons.push(`${page.imageOperations} image(s) on the page`);
    }
    if (page.numericRows > 0) {
      score += 3;
      reasons.push(`${page.numericRows} numeric row(s) the text layer could not resolve`);
    }
    if (page.textChars === 0) {
      score += 2;
      reasons.push("the page has no text layer at all");
    }
    candidates.push({ page: page.page, score, reasons: reasons.length ? reasons : verdict.reasons });
  }

  const scoring = candidates.filter((candidate) => candidate.score > 0);
  if (scoring.length > 0) {
    return scoring
      .sort((left, right) => (right.score - left.score) || (left.page - right.page))
      .slice(0, maxPages);
  }

  // Nothing anywhere scored. Read a bounded sample spread over the whole
  // document — the survey sheet is as likely to be the last page as the first.
  if (candidates.length === 0) return [];
  return spreadSample(candidates, Math.min(fallbackPages, maxPages)).map((candidate) => ({
    ...candidate,
    reasons: [...candidate.reasons, "sampled across the document because no page showed survey evidence"],
  }));
}

/** Evenly spaced sample that always includes the first and last candidate. */
function spreadSample<T>(items: readonly T[], count: number): T[] {
  if (count >= items.length) return [...items];
  if (count === 1) return [items[items.length - 1]];
  const picked: T[] = [];
  for (let index = 0; index < count; index += 1) {
    const position = Math.round((index * (items.length - 1)) / (count - 1));
    const item = items[position];
    if (!picked.includes(item)) picked.push(item);
  }
  return picked;
}
