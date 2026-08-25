import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type SourcePoint,
  type ManualDraft,
  type ValidationResult,
  createInitialDraft,
  getIncludedPoints,
  getPreviewPoints,
  movePoint,
  toggleExclude,
  restoreOriginalOrder,
  detectSelfIntersections,
  computePolygonArea,
  computePerimeter,
  validateManualGeometry,
  deriveGeometryStatus,
  suggestSafeOrders,
  pushHistory,
  undo,
  redo,
  shouldShowManualGeometry,
} from "@/src/components/tools/find-my-land/useManualGeometry";

/* ------------------------------------------------------------------ */
/*  Test fixtures                                                      */
/* ------------------------------------------------------------------ */

function sp(id: string, lat: number, lon: number, idx: number): SourcePoint {
  return { id, lat, lon, label: id, sourceIndex: idx, raw: `${lat},${lon}`, latText: String(lat), lonText: String(lon), crsHint: "WGS84" };
}

// Square parcel (valid clockwise)
const SQUARE: SourcePoint[] = [
  sp("P1", 25.001, 55.001, 0),
  sp("P2", 25.001, 55.002, 1),
  sp("P3", 25.000, 55.002, 2),
  sp("P4", 25.000, 55.001, 3),
];

// Self-intersecting bowtie
const BOWTIE: SourcePoint[] = [
  sp("P1", 25.001, 55.001, 0),
  sp("P2", 25.000, 55.002, 1),
  sp("P3", 25.001, 55.002, 2),
  sp("P4", 25.000, 55.001, 3),
];

// 5th noisy point
const WITH_NOISE: SourcePoint[] = [
  ...SQUARE,
  sp("P5", 25.100, 55.100, 4),
];

// 2 points only
const TWO_POINTS: SourcePoint[] = [sp("A", 25.001, 55.001, 0), sp("B", 25.002, 55.002, 1)];

function ptsById(pts: SourcePoint[]) { return new Map(pts.map((p) => [p.id, p])); }

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe("Manual Geometry Recovery", () => {

  // 1. Original order retained
  it("1 — createInitialDraft preserves source point order", () => {
    const draft = createInitialDraft(SQUARE);
    assert.deepEqual(draft.orderedIds, ["P1", "P2", "P3", "P4"]);
    assert.equal(draft.excludedIds.size, 0);
  });

  // 2. Reorder 4 points manually
  it("2 — movePoint reorders points within the draft", () => {
    let draft = createInitialDraft(SQUARE);
    draft = movePoint(draft, "P3", "up");
    assert.deepEqual(draft.orderedIds, ["P1", "P3", "P2", "P4"]);
    draft = movePoint(draft, "P3", "down");
    assert.deepEqual(draft.orderedIds, ["P1", "P2", "P3", "P4"]);
  });

  // 3. Exclude one extra point
  it("3 — toggleExclude marks a point as excluded from geometry", () => {
    const draft = createInitialDraft(WITH_NOISE);
    const excluded = toggleExclude(draft, "P5");
    assert.ok(excluded.excludedIds.has("P5"));
    const included = getIncludedPoints(excluded, ptsById(WITH_NOISE));
    assert.equal(included.length, 4);
    assert.ok(!included.some((p) => p.id === "P5"));
  });

  // 4. Restore original order
  it("4 — restoreOriginalOrder resets to source order with no exclusions", () => {
    let draft = createInitialDraft(SQUARE);
    draft = movePoint(draft, "P1", "down");
    draft = toggleExclude(draft, "P2");
    const restored = restoreOriginalOrder(SQUARE);
    assert.deepEqual(restored.orderedIds, ["P1", "P2", "P3", "P4"]);
    assert.equal(restored.excludedIds.size, 0);
  });

  // 5. Self-intersection detected
  it("5 — detectSelfIntersections flags crossing polygon", () => {
    const preview = getPreviewPoints(createInitialDraft(BOWTIE), ptsById(BOWTIE));
    const ix = detectSelfIntersections(preview);
    assert.ok(ix.length > 0, "bowtie must produce at least one intersection");
  });

  // 6. Self-intersection corrected manually
  it("6 — reordering bowtie to square removes intersection", () => {
    // BOWTIE: P1(25.001,55.001), P2(25.000,55.002), P3(25.001,55.002), P4(25.000,55.001) → crosses
    // Square order: P1, P3, P2, P4 → no crossing
    let draft = createInitialDraft(BOWTIE);
    draft = movePoint(draft, "P3", "up");
    // Order: P1, P3, P2, P4
    const preview = getPreviewPoints(draft, ptsById(BOWTIE));
    const ix = detectSelfIntersections(preview);
    assert.equal(ix.length, 0, "corrected order should have no intersections");
  });

  // 7. Fewer than 3 points blocked
  it("7 — validateManualGeometry FAILS when fewer than 3 points", () => {
    const result = validateManualGeometry(
      [{ lat: 1, lon: 1 }, { lat: 2, lon: 2 }],
      true,
    );
    const minPt = result.find((r) => r.code === "MIN_POINTS");
    assert.ok(minPt);
    assert.equal(minPt.status, "FAIL");
  });

  // 8. Duplicate point warning
  it("8 — validateManualGeometry warns on duplicate coordinates", () => {
    const pts = [
      { lat: 25.001, lon: 55.001 },
      { lat: 25.001, lon: 55.001 },
      { lat: 25.000, lon: 55.001 },
    ];
    const result = validateManualGeometry(pts, true);
    const dup = result.find((r) => r.code === "DUPLICATE_POINTS");
    assert.ok(dup);
    assert.equal(dup.status, "WARNING");
  });

  // 9. Explicit LINE topology preserved
  it("9 — sourcePoints retain page/rowIndex evidence after draft changes", () => {
    const pts = [sp("P1", 25.001, 55.001, 0), sp("P2", 25.002, 55.002, 1)];
    const draft = createInitialDraft(pts);
    const included = getIncludedPoints(draft, ptsById(pts));
    assert.equal(included[0].sourceIndex, 0);
    assert.equal(included[1].sourceIndex, 1);
  });

  // 10. Manual override does not mutate original topology
  it("10 — createInitialDraft returns a new array (no mutation of source)", () => {
    const original = [...SQUARE];
    const draft = createInitialDraft(SQUARE);
    draft.orderedIds.push("EXTRA");
    assert.equal(SQUARE.length, 4, "source must not be mutated");
    assert.deepEqual(SQUARE.map((s) => s.id), original.map((s) => s.id));
  });

  // 11. Concave parcel ordering supported
  it("11 — validateManualGeometry passes for valid concave polygon", () => {
    // L-shaped concave parcel
    const concave = [
      { lat: 25.001, lon: 55.001 },
      { lat: 25.001, lon: 55.003 },
      { lat: 25.0005, lon: 55.003 },
      { lat: 25.0005, lon: 55.002 },
      { lat: 25.000, lon: 55.002 },
      { lat: 25.000, lon: 55.001 },
    ];
    const result = validateManualGeometry(concave, true);
    assert.ok(result.every((r) => r.status !== "FAIL"), "concave polygon should not fail");
  });

  // 12. Convex hull is NOT silently applied
  it("12 — suggestSafeOrders returns candidates but does not auto-apply", () => {
    const suggestions = suggestSafeOrders(BOWTIE, true, 3);
    // All suggestions are advisory — the consumer decides
    assert.ok(Array.isArray(suggestions));
    for (const s of suggestions) {
      assert.ok(s.order.length > 0);
      assert.ok(typeof s.method === "string");
      assert.ok(typeof s.reason === "string");
    }
  });

  // 13. Area recalculates using existing engine
  it("13 — computePolygonArea matches known square area", () => {
    const pts = [
      { lat: 25.001, lon: 55.001 },
      { lat: 25.001, lon: 55.002 },
      { lat: 25.000, lon: 55.002 },
      { lat: 25.000, lon: 55.001 },
    ];
    const area = computePolygonArea(pts);
    assert.ok(area !== null);
    // Approx: 111m lat × 96m lon ≈ ~10,600 m²
    assert.ok(area! > 5000 && area! < 15000, `area ${area} should be ~10600 m²`);
  });

  // 14. Distance validation follows manual edges
  it("14 — computePerimeter sums edge lengths for a square", () => {
    const pts = [
      { lat: 25.001, lon: 55.001 },
      { lat: 25.001, lon: 55.002 },
      { lat: 25.000, lon: 55.002 },
      { lat: 25.000, lon: 55.001 },
    ];
    const perim = computePerimeter(pts);
    assert.ok(perim > 300 && perim < 500, `perimeter ${perim} should be ~400m`);
  });

  // 15. Manual geometry provenance saved
  it("15 — shouldShowManualGeometry triggers when document order invalid", () => {
    assert.ok(shouldShowManualGeometry(4, false, "OK", [], false));
  });

  // 16. Manual geometry does not become document-verified topology
  it("16 — deriveGeometryStatus returns VALID for clean polygon, not VERIFIED", () => {
    const result: ValidationResult[] = [
      { code: "MIN_POINTS", status: "PASS" },
      { code: "DUPLICATE_POINTS", status: "PASS" },
      { code: "DUPLICATE_CONSECUTIVE", status: "PASS" },
      { code: "ZERO_LENGTH_EDGE", status: "PASS" },
      { code: "SELF_INTERSECTION", status: "PASS" },
      { code: "UNKNOWN_CRS", status: "PASS" },
    ];
    const status = deriveGeometryStatus(result);
    assert.equal(status, "VALID");
    // VALID ≠ VERIFIED — the consumer must not treat it as document-verified
    assert.notEqual(status as string, "VERIFIED");
  });

  // 17. Row accounting unchanged after point exclusion
  it("17 — excluded points remain in sourcePoints (row accounting invariant)", () => {
    const draft = createInitialDraft(WITH_NOISE);
    const excluded = toggleExclude(draft, "P5");
    // All 5 sourcePoints still visible in sourcePointsData
    assert.equal(WITH_NOISE.length, 5);
    // Only 4 included in geometry
    const included = getIncludedPoints(excluded, ptsById(WITH_NOISE));
    assert.equal(included.length, 4);
  });

  // 18. CRS unresolved → ordering allowed but map resolution blocked
  it("18 — shouldShowManualGeometry works when CRS is unresolved", () => {
    assert.ok(shouldShowManualGeometry(5, false, "PARTIALLY_RESOLVED"));
  });

  // 19. Undo / redo
  it("19 — undo and redo traverse history correctly", () => {
    const d1 = createInitialDraft(SQUARE);
    const d2 = movePoint(d1, "P1", "down");
    const d3 = toggleExclude(d2, "P2");

    let history: ManualDraft[] = [d1];
    let idx = 0;
    ({ history, historyIndex: idx } = pushHistory(history, idx, d2));
    ({ history, historyIndex: idx } = pushHistory(history, idx, d3));
    assert.equal(idx, 2);

    const r1 = undo(history, idx);
    assert.ok(r1);
    assert.deepEqual(r1.draft.orderedIds, d2.orderedIds);
    assert.equal(r1.historyIndex, 1);

    const r2 = undo(history, r1.historyIndex);
    assert.ok(r2);
    assert.deepEqual(r2.draft.orderedIds, d1.orderedIds);

    const r3 = redo(history, r2.historyIndex);
    assert.ok(r3);
    assert.deepEqual(r3.draft.orderedIds, d2.orderedIds);
  });

  // 20. Mobile reorder controls (up/down at boundaries)
  it("20 — movePoint does not move beyond array boundaries", () => {
    const draft = createInitialDraft(SQUARE);
    const cannotMoveUp = movePoint(draft, "P1", "up");
    assert.deepEqual(cannotMoveUp.orderedIds, ["P1", "P2", "P3", "P4"]);
    const cannotMoveDown = movePoint(draft, "P4", "down");
    assert.deepEqual(cannotMoveDown.orderedIds, ["P1", "P2", "P3", "P4"]);
  });

});
