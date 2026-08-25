import { TextExtractionMethod } from "./contracts";

export interface TextExtractionInput {
  readonly nativeText?: string;
  readonly ocrText?: string;
  readonly visionText?: string;
  readonly isImage?: boolean;
}

export type TextExtractionResult = {
  method: TextExtractionMethod;
  text: string;
  charCount: number;
};

/**
 * Bidirectional and zero-width formatting characters.
 *
 * A PDF produced from a right-to-left page wraps every run in embedding
 * controls — including a lone `N` or `E` hemisphere letter and the number
 * printed beside it. The controls are invisible, they survive NFKC, and they
 * sit *between* the label and its value, so a row that reads perfectly to a
 * human arrives as `U+202B U+202A N U+202C U+202C … U+202B U+202A 21.885…`
 * and every pattern expecting `N 21.885…` fails on it.
 *
 * ZWNJ and ZWJ (U+200C, U+200D) are deliberately left in place: they carry
 * meaning inside Arabic and Persian words.
 */
const BIDI_AND_ZERO_WIDTH = /[\u200B\u200E\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;

export function normalizeExtractedText(value?: string): string {
  if (!value) return "";

  // PDF generators commonly store Arabic as presentation-form glyphs
  // (for example, `ﺻﻚ` instead of `صك`). Compatibility normalization turns
  // those glyphs back into searchable Arabic letters without requiring OCR.
  return value
    .normalize("NFKC")
    .replace(/\u0000/g, "")
    .replace(BIDI_AND_ZERO_WIDTH, "")
    .trim();
}

export function extractText(input: TextExtractionInput): TextExtractionResult {
  const nativeText = normalizeExtractedText(input.nativeText);
  const ocrText = normalizeExtractedText(input.ocrText);
  const visionText = normalizeExtractedText(input.visionText);
  const nativeLen = nativeText.length;
  const ocrLen = ocrText.length;

  if (ocrLen > 0 && nativeLen < 30) {
    return {
      method: "ocr",
      text: ocrText,
      charCount: ocrLen,
    };
  }

  if (nativeLen > 0) {
    return {
      method: "native_text",
      text: nativeText,
      charCount: nativeLen,
    };
  }

  if (ocrLen > 0) {
    return {
      method: "ocr",
      text: ocrText,
      charCount: ocrLen,
    };
  }

  if (visionText.length > 0) {
    return {
      method: "vision",
      text: visionText,
      charCount: visionText.length,
    };
  }

  return { method: "none", text: "", charCount: 0 };
}
