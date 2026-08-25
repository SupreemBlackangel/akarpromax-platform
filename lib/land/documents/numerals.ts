/**
 * Numeral normalisation for survey documents.
 *
 * Arabic-Indic and Persian digits, Arabic decimal and thousands separators, and
 * OCR letter/digit confusions are folded into a plain Latin form the coordinate
 * parsers can read. The original text is never modified in place: every
 * normalisation returns a new string and the caller keeps the source for the
 * evidence log.
 */

const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";
const EXTENDED_ARABIC_INDIC = "۰۱۲۳۴۵۶۷۸۹";

/** Arabic decimal separator (U+066B) and thousands separator (U+066C). */
const ARABIC_DECIMAL_SEPARATOR = "٫";
const ARABIC_THOUSANDS_SEPARATOR = "٬";

export interface NormalizedNumerals {
  /** The text with digits and separators folded to a Latin form. */
  text: string;
  /** The untouched input, kept so evidence can quote the document verbatim. */
  original: string;
  /** True when the input actually contained non-Latin digits. */
  hadArabicDigits: boolean;
}

export function containsArabicDigits(text: string): boolean {
  return /[٠-٩۰-۹]/.test(text);
}

/** Folds Arabic-Indic and Persian digits to `0-9`. Nothing else is touched. */
export function normalizeArabicDigits(text: string): string {
  return text
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_INDIC.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String(EXTENDED_ARABIC_INDIC.indexOf(digit)));
}

/**
 * Folds Arabic numeric separators.
 *
 * `١٢٣٤٫٥٦` uses U+066B as its decimal mark and U+066C for thousands, so the
 * two must be resolved before the value is parsed. A Latin comma between digits
 * is left alone here — whether it is a decimal mark or a thousands separator
 * depends on the surrounding table, and {@link normalizeNumericToken} decides.
 */
export function normalizeArabicSeparators(text: string): string {
  return text
    .replace(new RegExp(`(?<=\\d)${ARABIC_THOUSANDS_SEPARATOR}(?=\\d)`, "g"), "")
    .replace(new RegExp(`(?<=\\d)${ARABIC_DECIMAL_SEPARATOR}(?=\\d)`, "g"), ".");
}

/**
 * Full document-level normalisation: digits, Arabic separators, and the OCR
 * letter/digit confusions that appear inside numbers.
 */
export function normalizeNumerals(text: string): NormalizedNumerals {
  const hadArabicDigits = containsArabicDigits(text);
  let normalized = normalizeArabicDigits(text);
  normalized = normalizeArabicSeparators(normalized);
  // Letters that OCR substitutes for digits, only where a digit is adjacent.
  normalized = normalized
    .replace(/(?<=\d)[OoQ](?=\d)/g, "0")
    .replace(/(?<=\d)[lI|](?=\d)/g, "1");
  return { text: normalized, original: text, hadArabicDigits };
}

/**
 * Parses a single numeric token that may use either `,` or `.` as its decimal
 * mark, and either as a thousands separator.
 *
 * The decision is made from the token's own shape, never from a locale guess:
 * a separator followed by exactly three digits and repeated consistently is a
 * thousands separator; a lone separator with one or two trailing digits, or
 * more than three, is a decimal mark.
 */
export function normalizeNumericToken(token: string): number | null {
  const cleaned = normalizeArabicSeparators(normalizeArabicDigits(token)).trim();
  if (!cleaned) return null;

  const sign = cleaned.startsWith("-") ? -1 : 1;
  const body = cleaned.replace(/^[+-]/, "").replace(/\s/g, "");
  if (!/^[\d.,]+$/.test(body)) return null;

  const dots = (body.match(/\./g) ?? []).length;
  const commas = (body.match(/,/g) ?? []).length;

  let plain: string;
  if (dots > 0 && commas > 0) {
    // Both present: the last one seen is the decimal mark.
    const decimalMark = body.lastIndexOf(".") > body.lastIndexOf(",") ? "." : ",";
    const thousands = decimalMark === "." ? "," : ".";
    plain = body.split(thousands).join("").replace(decimalMark, ".");
  } else if (dots > 1 || commas > 1) {
    // Repeated single separator: only a thousands separator repeats.
    plain = body.replace(/[.,]/g, "");
  } else if (dots === 1 || commas === 1) {
    const separator = dots === 1 ? "." : ",";
    const [head, tail] = body.split(separator);
    // `1,234` is one thousand two hundred thirty-four; `1,23` is a decimal.
    plain = tail.length === 3 && head.length > 0 && head.length <= 3 && separator === ","
      ? head + tail
      : `${head}.${tail}`;
  } else {
    plain = body;
  }

  const value = Number.parseFloat(plain);
  return Number.isFinite(value) ? sign * value : null;
}

/**
 * Area units seen in survey documents, with their factor to square metres.
 * A unit is only applied when the document actually states it.
 */
export const AREA_UNITS: readonly { pattern: RegExp; factor: number; unit: string }[] = [
  { pattern: /\b(?:hectares?|ha)\b|هكتار/i, factor: 10_000, unit: "ha" },
  { pattern: /\b(?:km2|km²|square\s*kilomet(?:er|re)s?)\b|كم\s*[2²]|كيلومتر\s*مربع/i, factor: 1_000_000, unit: "km2" },
  { pattern: /\b(?:dunams?|donums?)\b|دونم/i, factor: 1_000, unit: "dunam" },
  { pattern: /\b(?:acres?)\b|فدان/i, factor: 4_046.8564224, unit: "acre" },
  { pattern: /\b(?:sq\.?\s*m\.?|m2|m²|square\s*met(?:er|re)s?)\b|م\s*[2²]|متر\s*مربع/i, factor: 1, unit: "m2" },
];

export interface ParsedArea {
  /** Value converted to square metres. */
  squareMeters: number;
  /** Value exactly as written, before any unit conversion. */
  statedValue: number;
  /** Unit token found next to the value, or `m2` when the document implies it. */
  unit: string;
  /** True when the document named a unit rather than the reader assuming one. */
  unitStated: boolean;
  raw: string;
}

/**
 * Reads an area value with its unit. Units are converted only when the document
 * states one; otherwise square metres are assumed and `unitStated` is false so
 * the caller can weight the comparison accordingly.
 */
export function parseAreaValue(raw: string): ParsedArea | null {
  const normalized = normalizeArabicSeparators(normalizeArabicDigits(raw));
  const numberMatch = /-?[\d][\d.,٫٬]*/.exec(normalized);
  if (!numberMatch) return null;

  const statedValue = normalizeNumericToken(numberMatch[0]);
  if (statedValue === null || statedValue <= 0) return null;

  const tail = normalized.slice(numberMatch.index + numberMatch[0].length);
  const matched = AREA_UNITS.find((candidate) => candidate.pattern.test(tail));
  return {
    squareMeters: statedValue * (matched?.factor ?? 1),
    statedValue,
    unit: matched?.unit ?? "m2",
    unitStated: matched !== undefined,
    raw: raw.trim(),
  };
}
