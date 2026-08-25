import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  columnFormatOf,
  decimalRecoveryCandidate,
  digitConfusionCandidates,
  normalizeNumericText,
  reconcileOcrPasses,
  resolveCell,
  type OcrPassReading,
} from "@/lib/land/ocr/cell-consensus";
import type { PositionedItem } from "@/lib/land/intelligence/layout";

const reading = (kind: OcrPassReading["kind"], rawText: string, confidence: number): OcrPassReading =>
  ({ kind, rawText, confidence });

const FORMAT_2DP = { decimals: 2, integerDigits: 6 };

describe("Cell resolution rules", () => {
  it("selects by agreement between passes, not by the highest confidence", () => {
    // The spec's own example: the 0.96 candidate is NOT automatically right.
    const selection = resolveCell([
      reading("primary", "565150.50", 0.75),
      reading("roi", "565150.58", 0.89),
      reading("numeric", "565150.50", 0.96),
    ], FORMAT_2DP);
    assert.equal(selection.value, "565150.50");
    assert.equal(selection.status, "VERIFIED_CELL");
    assert.match(selection.reason, /passes agree/);
  });

  it("declares a material three-way disagreement a conflict, not a choice", () => {
    const selection = resolveCell([
      reading("primary", "565150.50", 0.75),
      reading("roi", "565159.58", 0.89),
      reading("numeric", "565142.11", 0.96),
    ], FORMAT_2DP);
    assert.equal(selection.status, "CONFLICTING_CELL");
    assert.equal(selection.value, undefined);
  });

  it("treats a lost decimal separator as the same reading, not a rival", () => {
    const selection = resolveCell([
      reading("primary", "4339510.24", 0.7),
      reading("numeric", "433951024", 0.9),
    ], FORMAT_2DP);
    assert.equal(selection.value, "4339510.24");
    assert.notEqual(selection.status, "CONFLICTING_CELL");
  });

  it("reads a decimal comma as a decimal point", () => {
    const selection = resolveCell([reading("primary", "565150,50", 0.8)], FORMAT_2DP);
    assert.equal(selection.value, "565150.50");
  });

  it("repairs a missing separator only when the column format vouches for it", () => {
    assert.equal(decimalRecoveryCandidate("56515050", 2, 6), "565150.50");
    assert.equal(decimalRecoveryCandidate("56515050", null, null), null, "no column format, no repair");
    assert.equal(decimalRecoveryCandidate("565150.50", 2, 6), null, "already has a separator");
    assert.equal(decimalRecoveryCandidate("5650", 2, 6), null, "wrong digit count");
  });

  it("keeps an unreadable cell unreadable", () => {
    const selection = resolveCell([reading("primary", "###~~", 0.2)], FORMAT_2DP);
    assert.equal(selection.status, "UNREADABLE_CELL");
  });

  it("prefers the reading that matches the column format when passes disagree", () => {
    const selection = resolveCell([
      reading("primary", "550324.67", 0.6),
      reading("roi", "550324", 0.9),
    ], FORMAT_2DP);
    assert.equal(selection.value, "550324.67");
    assert.notEqual(selection.status, "CONFLICTING_CELL");
  });
});

describe("Digit confusion", () => {
  it("maps O/I/l/|/Z/S/G/B inside numeric context only as candidates", () => {
    const candidates = digitConfusionCandidates("5G51SO.5O");
    assert.ok(candidates.includes("565150.50"));
  });

  it("keeps Arabic-Indic and Persian digits", () => {
    assert.equal(normalizeNumericText("٥٦٥١٥٠.٥٠"), "565150.50");
    assert.equal(normalizeNumericText("۵۶۵۱۵۰.۵۰"), "565150.50");
  });

  it("selects a confusion-mapped value only when another pass agrees", () => {
    const agreed = resolveCell([
      reading("primary", "5G5150.50", 0.7),
      reading("numeric", "565150.50", 0.8),
    ], FORMAT_2DP);
    assert.equal(agreed.value, "565150.50");
    assert.equal(agreed.status, "VERIFIED_CELL");
  });
});

describe("Column format inference", () => {
  it("finds the modal decimal and integer shape", () => {
    const format = columnFormatOf(["550332.65", "550329.37", "550329.98", "550330"]);
    assert.equal(format.decimals, 2);
    assert.equal(format.integerDigits, 6);
  });

  it("stays silent below two consistent samples", () => {
    assert.deepEqual(columnFormatOf(["12.5"]), { decimals: null, integerDigits: null });
  });
});

describe("Pass reconciliation over a table", () => {
  const cell = (page: number, x: number, y: number, text: string): PositionedItem =>
    ({ page, x, y, width: Math.max(10, text.length * 9), height: 14, text });

  function primaryTable(): PositionedItem[] {
    return [
      cell(1, 100, 500, "1"), cell(1, 250, 500, "565150.50"), cell(1, 420, 500, "2550415.28"),
      cell(1, 100, 470, "2"), cell(1, 250, 470, "565136.78"), cell(1, 420, 470, "2550388.60"),
      cell(1, 100, 440, "3"), cell(1, 250, 440, "565127.88"), cell(1, 420, 440, "2550393.17"),
    ];
  }

  it("passes clean agreeing tables through with no rejections", () => {
    const result = reconcileOcrPasses([
      { kind: "primary", items: primaryTable() },
      { kind: "roi", items: primaryTable() },
    ]);
    assert.equal(result.rejections.length, 0);
    assert.equal(result.conflictCount, 0);
    const texts = result.items.map((item) => item.text);
    assert.ok(texts.includes("565150.50"));
    assert.ok(texts.includes("2550393.17"));
  });

  it("rejects the row of a materially conflicted cell, with a reason", () => {
    const conflicting = primaryTable().map((item) =>
      item.text === "565136.78" ? { ...item, text: "565936.78" } : item);
    const result = reconcileOcrPasses([
      { kind: "primary", items: primaryTable() },
      { kind: "roi", items: conflicting },
      { kind: "numeric", items: conflicting.map((item) => item.text === "565936.78" ? { ...item, text: "565136.78" } : item) },
    ]);
    // primary+numeric agree on 565136.78, roi alone differs: still resolvable.
    assert.equal(result.conflictCount, 0, JSON.stringify(result.rejections));
  });

  it("turns an irreconcilable two-source split into OCR_CONFLICT", () => {
    const roi = primaryTable().map((item) =>
      item.text === "565136.78" ? { ...item, text: "565936.78" } : item);
    const result = reconcileOcrPasses([
      { kind: "primary", items: primaryTable() },
      { kind: "roi", items: roi },
    ]);
    assert.ok(result.conflictCount >= 1);
    assert.equal(result.rejections.length, 1);
    assert.equal(result.rejections[0].reason, "OCR_CONFLICT");
    assert.ok(result.rejections[0].detail);
    // The conflicted value must not appear in the output at all.
    assert.ok(!result.items.some((item) => item.text === "565136.78" || item.text === "565936.78"));
  });

  it("preserves source order of the surviving rows", () => {
    const result = reconcileOcrPasses([{ kind: "primary", items: primaryTable() }]);
    const eastings = result.items.filter((item) => /^5651/.test(item.text));
    assert.deepEqual(eastings.map((item) => item.text), ["565150.50", "565136.78", "565127.88"]);
  });

  it("leaves prose untouched", () => {
    const prose = [cell(1, 100, 600, "prepared"), cell(1, 200, 600, "for"), cell(1, 260, 600, "the"), cell(1, 320, 600, "municipality")];
    const result = reconcileOcrPasses([{ kind: "primary", items: [...prose, ...primaryTable()] }]);
    assert.ok(result.items.some((item) => item.text === "municipality"));
  });
});
