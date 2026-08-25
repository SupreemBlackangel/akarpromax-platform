/**
 * The one shape every reader speaks.
 *
 * A word from a PDF text layer and a word from an OCR pass are the same kind
 * of thing: a piece of text with a place on a page. Keeping them in one shape
 * is what lets the layout reader, the table reader and the semantic roles
 * downstream of them work identically on a born-digital schedule and on a
 * scanned krokisi, with no per-source and no per-country parser anywhere.
 */
import type { PositionedItem } from "./layout";

/** Word box as an OCR engine reports it: pixels, origin at the top-left. */
export interface OcrWordBox {
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
  confidence?: number;
}

/**
 * Converts OCR word boxes into positioned items in the page's own coordinate
 * space, with the y axis flipped so they sit in the same frame as PDF text.
 *
 * `pageWidth`/`pageHeight` are the page's size in user units; `imageWidth`/
 * `imageHeight` are the raster the OCR engine actually saw. Passing both is
 * what keeps an OCR row and a native row on one page comparable.
 */
export function fromOcrWordBoxes(
  page: number,
  words: readonly OcrWordBox[],
  frame: { pageWidth: number; pageHeight: number; imageWidth: number; imageHeight: number },
): PositionedItem[] {
  const { pageWidth, pageHeight, imageWidth, imageHeight } = frame;
  if (!(imageWidth > 0) || !(imageHeight > 0)) return [];
  const scaleX = pageWidth > 0 ? pageWidth / imageWidth : 1;
  const scaleY = pageHeight > 0 ? pageHeight / imageHeight : 1;

  const items: PositionedItem[] = [];
  for (const word of words) {
    const text = word.text?.trim();
    if (!text) continue;
    if (![word.left, word.top, word.width, word.height].every((value) => Number.isFinite(value))) continue;
    items.push({
      page,
      x: word.left * scaleX,
      // Raster origin is the top-left; PDF user space counts upward.
      y: (imageHeight - word.top - word.height) * scaleY,
      width: Math.max(1, word.width * scaleX),
      height: Math.max(1, word.height * scaleY),
      text,
    });
  }
  return items;
}

/** Tesseract TSV rows, level 5, are individual words. */
export function parseTesseractTsv(tsv: string | null | undefined): OcrWordBox[] {
  if (!tsv) return [];
  const words: OcrWordBox[] = [];
  for (const line of tsv.split(/\r?\n/).slice(1)) {
    const columns = line.split("\t");
    if (columns.length < 12) continue;
    if (Number(columns[0]) !== 5) continue;
    const text = columns.slice(11).join("\t").trim();
    if (!text) continue;
    words.push({
      text,
      left: Number(columns[6]),
      top: Number(columns[7]),
      width: Number(columns[8]),
      height: Number(columns[9]),
      confidence: Number(columns[10]),
    });
  }
  return words;
}

/** Upper bound on what a single request may carry, so a huge PDF cannot flood it. */
export const MAX_POSITIONED_ITEMS = 24_000;

/**
 * Validates and trims positioned items arriving from outside the process.
 *
 * Coordinates are rounded to two decimals: a tenth of a point is far finer
 * than any column boundary and the payload halves.
 */
export function sanitizePositionedItems(
  value: unknown,
  cap: number = MAX_POSITIONED_ITEMS,
): PositionedItem[] {
  if (!Array.isArray(value)) return [];
  const items: PositionedItem[] = [];
  for (const entry of value) {
    if (items.length >= cap) break;
    if (!entry || typeof entry !== "object") continue;
    const candidate = entry as Partial<PositionedItem>;
    const text = typeof candidate.text === "string" ? candidate.text : "";
    if (!text.trim()) continue;
    const page = Number(candidate.page);
    const x = Number(candidate.x);
    const y = Number(candidate.y);
    const width = Number(candidate.width);
    const height = Number(candidate.height);
    if (![page, x, y, width, height].every((number) => Number.isFinite(number))) continue;
    if (page < 1 || page > 5_000) continue;
    items.push({
      page: Math.trunc(page),
      x: round2(x),
      y: round2(y),
      width: round2(Math.max(0, width)),
      height: round2(Math.max(0, height)),
      text: text.length > 400 ? text.slice(0, 400) : text,
    });
  }
  return items;
}

/** Compacts items for transport: rounding only, no reordering, no filtering. */
export function compactPositionedItems(items: readonly PositionedItem[], cap: number = MAX_POSITIONED_ITEMS): PositionedItem[] {
  return items.slice(0, cap).map((item) => ({
    page: item.page,
    x: round2(item.x),
    y: round2(item.y),
    width: round2(item.width),
    height: round2(item.height),
    text: item.text,
  }));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export type { PositionedItem };
