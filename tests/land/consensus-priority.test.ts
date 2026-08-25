import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  SOURCE_PRIORITY,
  reconcileCandidates,
  sourcePriority,
  type EvidenceSource,
  type SourceReading,
} from "@/lib/land/intelligence/consensus";

const point = (lat: number, lon: number) => ({ lat, lon });

function reading(source: EvidenceSource, detectedRows: number, points: Record<string, [number, number]> = {}): SourceReading {
  return {
    source,
    detectedRows,
    points: new Map(Object.entries(points).map(([label, [lat, lon]]) => [label, point(lat, lon)])),
  };
}

describe("Which reader is believed", () => {
  it("ranks structured tables above rebuilt layout, and layout above flat text", () => {
    assert.ok(sourcePriority("table_detector") > sourcePriority("native_layout"));
    assert.ok(sourcePriority("native_layout") > sourcePriority("ocr_full_page"));
    assert.ok(sourcePriority("ocr_roi") > sourcePriority("regex_labelled"));
    assert.ok(sourcePriority("regex_labelled") > sourcePriority("coordinate_cluster"));
    assert.ok(sourcePriority("coordinate_cluster") > sourcePriority("country_adapter"));
  });

  it("puts the country adapter last, so it can never create a reading", () => {
    const lowest = Math.min(...Object.values(SOURCE_PRIORITY));
    assert.equal(SOURCE_PRIORITY.country_adapter, lowest);
  });

  it("holds the verdict down when one reader saw fewer rows than another", () => {
    const result = reconcileCandidates([
      reading("native_layout", 6, { P1: [24.1, 46.1], P2: [24.2, 46.2], P3: [24.3, 46.3], P4: [24.4, 46.4], P5: [24.5, 46.5], P6: [24.6, 46.6] }),
      reading("native_text", 4),
    ]);
    assert.equal(result.verdict, "REVIEW_REQUIRED");
    assert.ok(result.warnings.some((warning) => /row-count disagreement/.test(warning)));
  });

  it("calls a document verified only when every reader saw the same rows", () => {
    const result = reconcileCandidates([
      reading("native_layout", 3, { P1: [24.1, 46.1], P2: [24.2, 46.2], P3: [24.3, 46.3] }),
      reading("table_detector", 3, { P1: [24.1, 46.1], P2: [24.2, 46.2], P3: [24.3, 46.3] }),
    ]);
    assert.equal(result.verdict, "VERIFIED");
    assert.deepEqual(result.warnings, []);
  });

  it("names the sources that disagree about a corner", () => {
    const result = reconcileCandidates([
      reading("native_layout", 2, { P1: [24.1, 46.1], P2: [24.2, 46.2] }),
      reading("ocr_full_page", 2, { P1: [24.1, 46.1], P2: [25.9, 46.2] }),
    ]);
    const corner = result.points.find((entry) => entry.pointId === "P2");
    assert.ok(corner);
    assert.deepEqual(corner.disagreeingSources, ["ocr_full_page"]);
    assert.equal(corner.status, "REVIEW_REQUIRED");
  });

  it("is unresolved when no reader produced anything", () => {
    assert.equal(reconcileCandidates([]).verdict, "UNRESOLVED");
  });
});
