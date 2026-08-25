/**
 * Cell-level OCR consensus.
 *
 * Several OCR passes can read the same table cell: the full-page primary
 * pass, the high-quality ROI pass, and the numeric-whitelist pass. They will
 * sometimes disagree, and the disagreement is precious — it is the only
 * warning the engine gets before a wrong digit becomes a wrong parcel.
 *
 * The rules, in order of authority:
 *   1. Agreement between independent passes beats any single confidence.
 *   2. Column-format consistency (decimals, magnitude) beats raw confidence.
 *   3. A material unresolved conflict is never silently decided — the cell is
 *      CONFLICTING, its row is rejected with OCR_CONFLICT, and the document
 *      can rise no higher than REVIEW_REQUIRED.
 */
import type { PositionedItem } from "@/lib/land/intelligence/layout";
import { reconstructLayout } from "@/lib/land/intelligence/layout";
import { parseNumericCell } from "@/lib/land/intelligence/table-extraction";
import type { RejectedRow } from "@/lib/land/intelligence/row-accounting";

export type OcrPassKind = "primary" | "roi" | "numeric";

export interface OcrPassReading {
  kind: OcrPassKind;
  rawText: string;
  confidence: number;
}

export type CellStatus = "VERIFIED_CELL" | "PROBABLE_CELL" | "CONFLICTING_CELL" | "UNREADABLE_CELL";

export interface OCRCellEvidence {
  page: number;
  tableId: string;
  rowIndex: number;
  columnIndex: number;
  bbox: { x: number; y: number; width: number; height: number };
  readings: OcrPassReading[];
  candidateValues: string[];
  selectedValue?: string;
  selectedConfidence: number;
  status: CellStatus;
  resolutionReason: string;
}

export interface CellConsensusResult {
  cells: OCRCellEvidence[];
  /** Positioned items carrying each cell's selected value, page space. */
  items: PositionedItem[];
  /** Rows whose cells could not be resolved, with reasons, for accounting. */
  rejections: RejectedRow[];
  conflictCount: number;
  unreadableCount: number;
  lowConfidenceCount: number;
}

/**
 * OCR confusions worth trying — but only inside a cell that is already
 * numeric table evidence. Names, prose and identifiers are never mutated.
 */
const DIGIT_CONFUSIONS: readonly [RegExp, string][] = [
  [/[OoQ]/g, "0"],
  [/[Il|]/g, "1"],
  [/Z/g, "2"],
  [/S/g, "5"],
  [/G/g, "6"],
  [/B/g, "8"],
];

/** Two numeric readings closer than this are the same measurement. */
const MATERIAL_DIFFERENCE = 0.05;

/** The reading's digits alone: `4339510.24` and `433951024` share them. */
function digitsOf(value: string): string {
  return value.replace(/[^\d]/g, "");
}

/**
 * A lost decimal separator is a formatting defect, not a different number.
 * Two candidates with identical digit sequences are one reading; the one
 * whose format matches the column keeps the vote.
 */
function sameDigits(a: string, b: string): boolean {
  const da = digitsOf(a);
  return da.length > 0 && da === digitsOf(b);
}
const LOW_CONFIDENCE = 0.55;

export function normalizeNumericText(raw: string): string {
  return raw
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٫]/g, ".")
    .replace(/\s+/g, "")
    .trim();
}

/** Confusion-mapped alternatives for a numeric-context token. */
export function digitConfusionCandidates(raw: string): string[] {
  const seen = new Set<string>([raw]);
  const out: string[] = [];
  let mapped = raw;
  for (const [pattern, replacement] of DIGIT_CONFUSIONS) {
    mapped = mapped.replace(pattern, replacement);
  }
  if (!seen.has(mapped)) {
    seen.add(mapped);
    out.push(mapped);
  }
  return out;
}

/**
 * Decimal-format recovery driven by the column, not by plausibility.
 *
 * If most cells in a column carry two decimals and this cell's reading has
 * none but the right digit count, the comma/point was likely lost. The
 * repaired value is only a CANDIDATE — it is selected only when another pass
 * or the column format agrees, and a repair that no evidence supports leaves
 * the cell in conflict instead.
 */
export function decimalRecoveryCandidate(
  raw: string,
  columnDecimals: number | null,
  columnIntegerDigits: number | null,
): string | null {
  if (columnDecimals === null || columnDecimals <= 0) return null;
  const normalized = normalizeNumericText(raw).replace(/,/g, ".");
  if (normalized.includes(".")) return null;
  if (!/^\d+$/.test(normalized)) return null;
  const digits = normalized.length;
  if (columnIntegerDigits !== null && digits !== columnIntegerDigits + columnDecimals) return null;
  const cut = digits - columnDecimals;
  if (cut <= 0) return null;
  return `${normalized.slice(0, cut)}.${normalized.slice(cut)}`;
}

interface ColumnFormat {
  decimals: number | null;
  integerDigits: number | null;
}

/** The modal decimal count and integer length of a column's parsed values. */
export function columnFormatOf(values: readonly string[]): ColumnFormat {
  const decimalCounts = new Map<number, number>();
  const integerCounts = new Map<number, number>();
  for (const value of values) {
    const normalized = normalizeNumericText(value).replace(/,/g, ".");
    if (!/^\d+(?:\.\d+)?$/.test(normalized)) continue;
    const [integer, decimal = ""] = normalized.split(".");
    decimalCounts.set(decimal.length, (decimalCounts.get(decimal.length) ?? 0) + 1);
    integerCounts.set(integer.length, (integerCounts.get(integer.length) ?? 0) + 1);
  }
  const modal = (counts: Map<number, number>): number | null => {
    let best: number | null = null;
    let bestCount = 0;
    for (const [key, count] of counts) {
      if (count > bestCount) { best = key; bestCount = count; }
    }
    return bestCount >= 2 ? best : null;
  };
  return { decimals: modal(decimalCounts), integerDigits: modal(integerCounts) };
}

interface CellSelection {
  value?: string;
  confidence: number;
  status: CellStatus;
  reason: string;
  candidates: string[];
}

/**
 * Resolves one cell from its pass readings.
 *
 * Selection is by named evidence, never by the single highest confidence: a
 * 0.96-confidence numeric pass does not outvote two agreeing passes at 0.75.
 */
export function resolveCell(
  readings: readonly OcrPassReading[],
  format: ColumnFormat,
): CellSelection {
  const usable = readings.filter((reading) => reading.rawText.trim().length > 0);
  if (usable.length === 0) {
    return { confidence: 0, status: "UNREADABLE_CELL", reason: "no pass produced any text for this cell", candidates: [] };
  }

  interface Candidate {
    value: string;
    numeric: number | null;
    passes: Set<OcrPassKind>;
    bestConfidence: number;
    derived: boolean;
  }
  const candidates = new Map<string, Candidate>();
  const admit = (value: string, reading: OcrPassReading, derived: boolean) => {
    const key = normalizeNumericText(value).replace(/,/g, ".");
    if (!key) return;
    const existing = candidates.get(key);
    if (existing) {
      existing.passes.add(reading.kind);
      existing.bestConfidence = Math.max(existing.bestConfidence, reading.confidence);
      if (!derived) existing.derived = false;
    } else {
      candidates.set(key, {
        value: key,
        numeric: parseNumericCell(key),
        passes: new Set([reading.kind]),
        bestConfidence: reading.confidence,
        derived,
      });
    }
  };

  for (const reading of usable) {
    admit(reading.rawText, reading, false);
    // Confusion alternatives are candidates, not replacements, and only make
    // sense in this numeric context.
    for (const alternative of digitConfusionCandidates(reading.rawText)) {
      admit(alternative, reading, true);
    }
    const repaired = decimalRecoveryCandidate(reading.rawText, format.decimals, format.integerDigits);
    if (repaired) admit(repaired, reading, true);
  }

  const numeric = [...candidates.values()].filter((candidate) => candidate.numeric !== null);
  const candidateList = [...candidates.keys()];
  if (numeric.length === 0) {
    return {
      confidence: 0,
      status: "UNREADABLE_CELL",
      reason: `no reading parses as a number (saw: ${usable.map((reading) => reading.rawText).slice(0, 3).join(" / ")})`,
      candidates: candidateList,
    };
  }

  const matchesFormat = (candidate: Candidate): boolean => {
    if (format.decimals === null) return true;
    const decimal = candidate.value.split(".")[1] ?? "";
    return decimal.length === format.decimals;
  };

  // Rule 1: multi-pass agreement.
  const agreed = numeric
    .filter((candidate) => candidate.passes.size >= 2)
    .sort((left, right) =>
      (Number(matchesFormat(right)) - Number(matchesFormat(left)))
      || right.passes.size - left.passes.size
      || right.bestConfidence - left.bestConfidence);
  if (agreed.length > 0) {
    const winner = agreed[0];
    const rivals = numeric.filter((candidate) =>
      candidate !== winner
      && !candidate.derived
      && candidate.numeric !== null
      && winner.numeric !== null
      && !sameDigits(candidate.value, winner.value)
      && Math.abs(candidate.numeric - winner.numeric) > MATERIAL_DIFFERENCE);
    if (rivals.some((rival) => rival.passes.size >= 2)) {
      return {
        confidence: winner.bestConfidence,
        status: "CONFLICTING_CELL",
        reason: `independent passes agree on two different values: ${winner.value} vs ${rivals[0].value}`,
        candidates: candidateList,
      };
    }
    return {
      value: winner.value,
      confidence: Math.min(0.99, winner.bestConfidence + 0.15),
      status: "VERIFIED_CELL",
      reason: `${winner.passes.size} passes agree${matchesFormat(winner) ? " and the value matches the column format" : ""}`,
      candidates: candidateList,
    };
  }

  // Rule 2: a single reading, judged by column format and syntax.
  const originals = numeric.filter((candidate) => !candidate.derived);
  const pool = originals.length > 0 ? originals : numeric;
  const sorted = pool.sort((left, right) =>
    (Number(matchesFormat(right)) - Number(matchesFormat(left)))
    || right.bestConfidence - left.bestConfidence);
  const winner = sorted[0];
  const materialRivals = pool.filter((candidate) =>
    candidate !== winner
    && candidate.numeric !== null
    && winner.numeric !== null
    && !sameDigits(candidate.value, winner.value)
    && Math.abs(candidate.numeric - winner.numeric) > MATERIAL_DIFFERENCE);

  if (materialRivals.length > 0 && !(matchesFormat(winner) && !matchesFormat(materialRivals[0]))) {
    return {
      confidence: winner.bestConfidence,
      status: "CONFLICTING_CELL",
      reason: `passes disagree materially (${winner.value} vs ${materialRivals[0].value}) and nothing independent settles it`,
      candidates: candidateList,
    };
  }
  return {
    value: winner.value,
    confidence: winner.bestConfidence,
    status: winner.bestConfidence >= LOW_CONFIDENCE && matchesFormat(winner) ? "PROBABLE_CELL" : "PROBABLE_CELL",
    reason: materialRivals.length > 0
      ? "one reading matches the column format; the conflicting one does not"
      : "single reading, syntactically valid",
    candidates: candidateList,
  };
}

export interface PassItems {
  kind: OcrPassKind;
  items: readonly PositionedItem[];
  confidenceByIndex?: readonly number[];
}

/**
 * Runs consensus over the numeric-table region covered by the passes.
 *
 * Cells are formed from the union of all passes' words via the layout
 * reconstruction, then each cell's readings across passes are resolved. The
 * output items carry the SELECTED value per cell; a conflicting cell emits no
 * item and one rejection instead, so the row accounting downstream sees it.
 */
export function reconcileOcrPasses(passes: readonly PassItems[]): CellConsensusResult {
  const primary = passes.find((pass) => pass.kind === "primary") ?? passes[0];
  if (!primary || primary.items.length === 0) {
    return { cells: [], items: [], rejections: [], conflictCount: 0, unreadableCount: 0, lowConfidenceCount: 0 };
  }

  const tables = reconstructLayout(primary.items);
  const cells: OCRCellEvidence[] = [];
  const outputItems: PositionedItem[] = [];
  const rejections: RejectedRow[] = [];
  let conflictCount = 0;
  let unreadableCount = 0;
  let lowConfidenceCount = 0;

  for (const [tableIndex, table] of tables.entries()) {
    // Column formats from the primary pass's own numeric cells.
    const valuesByColumn = new Map<number, string[]>();
    for (const row of table.rows) {
      for (const cell of row.cells) {
        if (parseNumericCell(cell.text) === null) continue;
        const list = valuesByColumn.get(cell.column) ?? [];
        list.push(cell.text);
        valuesByColumn.set(cell.column, list);
      }
    }
    const formats = new Map<number, ColumnFormat>();
    for (const [column, values] of valuesByColumn) formats.set(column, columnFormatOf(values));

    for (const [rowIndex, row] of table.rows.entries()) {
      const numericCells = row.cells.filter((cell) => parseNumericCell(cell.text) !== null
        || /\d/.test(cell.text));
      if (numericCells.filter((cell) => parseNumericCell(cell.text) !== null).length < 2) {
        // Not a coordinate row; pass the words through untouched.
        for (const cell of row.cells) outputItems.push(...cell.items);
        continue;
      }

      let rowConflicted = false;
      for (const cell of row.cells) {
        const isNumericContext = parseNumericCell(cell.text) !== null || /^\W*[\dOIlSZGB|.,\s-]+\W*$/.test(cell.text);
        if (!isNumericContext) {
          outputItems.push(...cell.items);
          continue;
        }

        const readings: OcrPassReading[] = [{
          kind: primary.kind,
          rawText: cell.text,
          confidence: 0.7,
        }];
        // Overlapping words from other passes read the same physical cell.
        for (const pass of passes) {
          if (pass === primary) continue;
          const overlapping = pass.items.filter((item) =>
            item.page === table.page
            && overlaps(item, cell));
          if (overlapping.length === 0) continue;
          const text = overlapping
            .slice()
            .sort((left, right) => left.x - right.x)
            .map((item) => item.text)
            .join("")
            .replace(/\s+/g, "");
          readings.push({ kind: pass.kind, rawText: text, confidence: 0.8 });
        }

        const format = formats.get(cell.column) ?? { decimals: null, integerDigits: null };
        const selection = resolveCell(readings, format);
        const evidence: OCRCellEvidence = {
          page: table.page,
          tableId: `t${tableIndex}`,
          rowIndex,
          columnIndex: cell.column,
          bbox: { x: cell.x, y: row.y, width: cell.width, height: 10 },
          readings,
          candidateValues: selection.candidates,
          selectedValue: selection.value,
          selectedConfidence: selection.confidence,
          status: selection.status,
          resolutionReason: selection.reason,
        };
        cells.push(evidence);

        if (selection.status === "CONFLICTING_CELL") {
          conflictCount += 1;
          rowConflicted = true;
        } else if (selection.status === "UNREADABLE_CELL") {
          unreadableCount += 1;
          rowConflicted = true;
        } else if (selection.value !== undefined) {
          if (selection.confidence < LOW_CONFIDENCE) lowConfidenceCount += 1;
          const source = cell.items[0];
          outputItems.push({
            page: table.page,
            x: cell.x,
            y: source?.y ?? row.y,
            width: cell.width,
            height: source?.height ?? 10,
            text: selection.value,
          });
        }
      }

      if (rowConflicted) {
        // The row's non-conflicting neighbours still flow through; the row
        // itself is recorded so it cannot silently become a shorter parcel.
        rejections.push({
          rowIndex,
          reason: "OCR_CONFLICT",
          detail: cells
            .filter((cell) => cell.rowIndex === rowIndex && (cell.status === "CONFLICTING_CELL" || cell.status === "UNREADABLE_CELL"))
            .map((cell) => cell.resolutionReason)
            .join("; ") || "a cell in this row could not be resolved",
          raw: row.text,
        });
      }
    }
  }

  return { cells, items: outputItems, rejections, conflictCount, unreadableCount, lowConfidenceCount };
}

/**
 * A word belongs to a cell only when it truly sits inside it: at least half
 * the word's width inside the cell horizontally, and at least half of the
 * shorter of the two heights overlapping vertically. A looser rule pulled
 * neighbouring table rows into one cell and manufactured conflicts that were
 * never on the page.
 */
function overlaps(
  item: { x: number; y: number; width: number; height: number },
  cell: { x: number; width: number; items: readonly { y: number; height: number }[] },
): boolean {
  const cellY = cell.items[0]?.y ?? 0;
  const cellHeight = Math.max(8, cell.items[0]?.height ?? 10);
  const horizontalOverlap = Math.min(item.x + item.width, cell.x + cell.width) - Math.max(item.x, cell.x);
  if (horizontalOverlap < item.width * 0.5) return false;
  const verticalOverlap = Math.min(item.y + item.height, cellY + cellHeight) - Math.max(item.y, cellY);
  return verticalOverlap >= Math.min(item.height, cellHeight) * 0.5;
}
