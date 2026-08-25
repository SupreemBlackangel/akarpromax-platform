import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { reconcileCandidates, type SourceReading } from "@/lib/land/intelligence/consensus";
import type { Point } from "@/lib/geo/contracts";

const P = (lat: number, lon: number): Point => ({ lat, lon });
const FOUR: [string, Point][] = [
  ["1", P(23.0610, 57.6360)],
  ["2", P(23.0608, 57.6359)],
  ["3", P(23.0608, 57.6357)],
  ["4", P(23.0610, 57.6358)],
];
const reading = (
  source: SourceReading["source"],
  entries: [string, Point][],
  detectedRows = entries.length,
): SourceReading => ({ source, detectedRows, points: new Map(entries) });

describe("multi-source consensus", () => {
  describe("agreement", () => {
    it("verifies when every reader saw the same corners", () => {
      const result = reconcileCandidates([
        reading("native_layout", FOUR),
        reading("native_text", FOUR),
        reading("table_detector", FOUR),
      ]);
      assert.equal(result.verdict, "VERIFIED");
      assert.equal(result.points.length, 4);
      assert.equal(result.account.acceptedRows, 4);
      assert.equal(result.account.reviewRequired, false);
    });

    it("names the sources behind each point rather than scoring it", () => {
      const result = reconcileCandidates([
        reading("native_layout", FOUR),
        reading("regex_labelled", FOUR),
      ]);
      const p1 = result.points[0];
      assert.deepEqual(p1.evidence.sort(), ["native_layout", "regex_labelled"]);
      assert.equal(p1.disagreeingSources.length, 0);
    });

    it("orders corners numerically, so P10 follows P9", () => {
      const many: [string, Point][] = Array.from({ length: 11 }, (_, i) =>
        [`${i + 1}`, P(23 + i / 10000, 57)] as [string, Point]);
      const result = reconcileCandidates([reading("table_detector", many)]);
      assert.deepEqual(result.points.map((p) => p.pointId).slice(8), ["9", "10", "11"]);
    });
  });

  describe("row-count disagreement — the case the brief calls out", () => {
    it("does not accept five points when another reader saw six rows", () => {
      const six: [string, Point][] = [...FOUR, ["5", P(23.0611, 57.6361)], ["6", P(23.0612, 57.6362)]];
      const five = six.slice(0, 5);
      const result = reconcileCandidates([
        reading("native_layout", six, 6),
        reading("regex_labelled", five, 5),
      ]);
      assert.equal(result.account.detectedRows, 6);
      assert.equal(result.points.length, 6, "the union of corners is kept, not the shorter reader's five");
      // The corners themselves are consistent, so accounting accepts all six —
      // but one reader never saw the sixth, and that gap alone withholds
      // verification until it is explained.
      assert.equal(result.verdict, "REVIEW_REQUIRED", "the sixth row must be investigated");
      assert.ok(result.warnings.some((w) => w.includes("row-count disagreement")));
      assert.ok(result.warnings.some((w) => w.includes("regex_labelled saw 5")));
    });

    it("holds back verification even when every shared corner agrees", () => {
      // All four corners identical, but one reader reported a fifth row it
      // could not place. Agreement on what was read is not completeness.
      const result = reconcileCandidates([
        reading("native_layout", FOUR, 5),
        reading("native_text", FOUR, 4),
      ]);
      assert.equal(result.verdict, "REVIEW_REQUIRED");
    });
  });

  describe("position disagreement", () => {
    it("flags a corner two readers place differently", () => {
      const shifted: [string, Point][] = [["1", P(23.0620, 57.6360)], ...FOUR.slice(1)];
      const result = reconcileCandidates([
        reading("native_layout", FOUR),
        reading("ocr_full_page", shifted),
      ]);
      const p1 = result.points.find((p) => p.pointId === "1");
      assert.equal(p1?.status, "REVIEW_REQUIRED");
      assert.deepEqual(p1?.disagreeingSources, ["ocr_full_page"]);
      assert.equal(result.verdict, "REVIEW_REQUIRED");
      assert.ok(result.warnings.some((w) => w.includes("corner 1")));
    });

    it("tolerates a rounding-level difference between readers", () => {
      const rounded: [string, Point][] = FOUR.map(([id, p]) =>
        [id, P(p.lat + 0.0000005, p.lon - 0.0000005)] as [string, Point]);
      const result = reconcileCandidates([
        reading("native_layout", FOUR),
        reading("ocr_roi", rounded),
      ]);
      assert.equal(result.verdict, "VERIFIED");
      assert.equal(result.points.every((p) => p.status === "VERIFIED"), true);
    });

    it("records the rejection with a reason when sources conflict", () => {
      const shifted: [string, Point][] = [["1", P(23.5, 57.6)], ...FOUR.slice(1)];
      const result = reconcileCandidates([
        reading("native_layout", FOUR),
        reading("ocr_full_page", shifted),
      ]);
      const rejection = result.account.rejections.find((r) => r.pointId === "1");
      assert.ok(rejection, "a conflicted corner must appear in the account");
      assert.equal(rejection?.reason, "OCR_CONFLICT");
      assert.match(rejection?.detail ?? "", /ocr_full_page/);
    });
  });

  describe("no first-match-wins", () => {
    it("a single reader is not enough to hide what another would have seen", () => {
      const result = reconcileCandidates([reading("regex_labelled", FOUR, 6)]);
      assert.equal(result.account.detectedRows, 6);
      assert.equal(result.verdict, "REVIEW_REQUIRED");
    });

    it("merges corners only one reader found, and keeps them accountable", () => {
      const result = reconcileCandidates([
        reading("native_layout", FOUR.slice(0, 3), 4),
        reading("ocr_roi", FOUR.slice(3), 4),
      ]);
      assert.equal(result.points.length, 4, "the union of corners is used, not the first reader's");
      assert.equal(result.account.detectedRows, 4);
    });
  });

  describe("nothing found", () => {
    it("is UNRESOLVED, not an empty success", () => {
      const result = reconcileCandidates([]);
      assert.equal(result.verdict, "UNRESOLVED");
      assert.equal(result.points.length, 0);
      assert.ok(result.warnings.length > 0);
    });

    it("is UNRESOLVED when readers ran but found nothing", () => {
      const result = reconcileCandidates([reading("native_text", []), reading("ocr_full_page", [])]);
      assert.equal(result.verdict, "UNRESOLVED");
    });
  });
});
