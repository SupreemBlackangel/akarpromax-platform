import assert from "node:assert/strict";
import { describe, it } from "node:test";

import proj4 from "proj4";

import type { Point } from "@/lib/geo/contracts";
import { WGS84_PROJ4 } from "@/lib/geo/utm";
import {
  analyseBoundary,
  reorderVertices,
  type SourceVertex,
} from "@/lib/land/boundary/parcel-boundary";
import {
  buildLocalPlane,
  geodesicDistanceMeters,
  localPlaneDefinition,
  planeArea,
  planeBearing,
  planeDistance,
} from "@/lib/land/boundary/local-plane";
import { parseAreaValue } from "@/lib/land/documents/numerals";
import type { DocumentedSide } from "@/lib/land/documents/boundary-terms";

const ORIGIN: Point = { lat: 24.7136, lon: 46.6753 };
const WIDTH_METERS = 25.4;
const HEIGHT_METERS = 20;

/**
 * A 25.4 m × 20 m rectangle near Riyadh, built by inverse-projecting exact
 * metre offsets so the fixture's dimensions are correct by construction rather
 * than by hand-rounded degrees.
 */
function rectangleCorners(): Point[] {
  const definition = localPlaneDefinition(ORIGIN);
  const offsets: [number, number][] = [
    [0, 0],
    [WIDTH_METERS, 0],
    [WIDTH_METERS, HEIGHT_METERS],
    [0, HEIGHT_METERS],
  ];
  return offsets.map(([x, y]) => {
    const [lon, lat] = proj4(definition, WGS84_PROJ4, [x, y]);
    return { lat, lon };
  });
}

const RECTANGLE: Point[] = rectangleCorners();
const RECTANGLE_AREA = WIDTH_METERS * HEIGHT_METERS;

function vertex(point: Point, index: number, overrides: Partial<SourceVertex> = {}): SourceVertex {
  return {
    index,
    label: `P${index + 1}`,
    pointNumber: String(index + 1),
    page: 1,
    rowIndex: index,
    sourceText: `${point.lat} ${point.lon}`,
    original: { latitude: point.lat, longitude: point.lon },
    point,
    crs: "wgs84",
    confidence: 1,
    extractedBy: "test",
    warnings: [],
    ...overrides,
  };
}

function verticesFrom(points: readonly Point[]): SourceVertex[] {
  return points.map((point, index) => vertex(point, index));
}

function check(analysis: ReturnType<typeof analyseBoundary>, code: string) {
  return analysis.validations.find((entry) => entry.code === code);
}

describe("Local survey plane", () => {
  it("measures a known side length to the millimetre", () => {
    const distance = geodesicDistanceMeters(RECTANGLE[0], RECTANGLE[1]);
    assert.ok(distance);
    assert.ok(Math.abs(distance - WIDTH_METERS) < 0.01, `expected ${WIDTH_METERS} m, got ${distance}`);
  });

  it("measures the perpendicular side too", () => {
    const distance = geodesicDistanceMeters(RECTANGLE[1], RECTANGLE[2]);
    assert.ok(distance);
    assert.ok(Math.abs(distance - HEIGHT_METERS) < 0.01, `expected ${HEIGHT_METERS} m, got ${distance}`);
  });

  it("computes the rectangle's area", () => {
    const plane = buildLocalPlane(RECTANGLE);
    assert.ok(plane);
    const area = planeArea(plane.coordinates);
    assert.ok(Math.abs(area - RECTANGLE_AREA) < 0.05, `expected ${RECTANGLE_AREA} m2, got ${area}`);
    assert.equal(plane.withinSafeExtent, true);
  });

  it("reports bearings clockwise from north", () => {
    const plane = buildLocalPlane([RECTANGLE[0], RECTANGLE[1]]);
    assert.ok(plane);
    const bearing = planeBearing(plane.coordinates[0], plane.coordinates[1]);
    assert.ok(Math.abs(bearing - 90) < 0.5, `expected due east, got ${bearing}`);
  });

  it("flags a parcel too large for one distortion-free plane", () => {
    const plane = buildLocalPlane([
      { lat: 24, lon: 46 },
      { lat: 25, lon: 47 },
    ]);
    assert.ok(plane);
    assert.equal(plane.withinSafeExtent, false);
  });

  it("returns nothing for an empty set", () => {
    assert.equal(buildLocalPlane([]), null);
    assert.equal(planeDistance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
  });
});

describe("Documented sequence is preserved", () => {
  it("keeps the document order as the reference path", () => {
    const analysis = analyseBoundary({ vertices: verticesFrom(RECTANGLE) });
    assert.deepEqual(analysis.documentSequence, [0, 1, 2, 3]);
    assert.equal(analysis.documentOrderValid, true);
    assert.equal(analysis.suggestedSequence, undefined, "a valid order needs no proposal");
  });

  it("accepts a reversed sequence as a valid boundary", () => {
    const analysis = analyseBoundary({ vertices: verticesFrom([...RECTANGLE].reverse()) });
    assert.equal(analysis.documentOrderValid, true);
    assert.equal(analysis.selfIntersections.length, 0);
    assert.ok(analysis.areaSquareMeters);
    assert.ok(Math.abs((analysis.areaSquareMeters ?? 0) - RECTANGLE_AREA) < 0.1);
  });

  it("reports the ring orientation without changing the order", () => {
    const forward = analyseBoundary({ vertices: verticesFrom(RECTANGLE) });
    const reversed = analyseBoundary({ vertices: verticesFrom([...RECTANGLE].reverse()) });
    assert.notEqual(forward.orientation, reversed.orientation);
    assert.deepEqual(reversed.documentSequence, [0, 1, 2, 3]);
  });

  it("carries every vertex's provenance through the analysis", () => {
    const vertices = verticesFrom(RECTANGLE);
    const analysis = analyseBoundary({ vertices });
    assert.equal(analysis.segments[0].fromLabel, "P1");
    assert.equal(analysis.segments[0].toLabel, "P2");
    assert.equal(analysis.segments[3].toLabel, "P1", "the ring closes back to the first corner");
    assert.equal(vertices[2].page, 1);
    assert.equal(vertices[2].rowIndex, 2);
  });
});

describe("Bad sequences are reported, never repaired silently", () => {
  const shuffled = [RECTANGLE[0], RECTANGLE[2], RECTANGLE[1], RECTANGLE[3]];

  it("detects a self-intersecting sequence and refuses the polygon", () => {
    const analysis = analyseBoundary({ vertices: verticesFrom(shuffled) });
    assert.equal(analysis.documentOrderValid, false);
    assert.ok(analysis.selfIntersections.length > 0);
    assert.equal(analysis.areaSquareMeters, undefined, "no area for an invalid boundary");
    assert.equal(check(analysis, "SEGMENT_INTERSECTION")?.status, "FAIL");
  });

  it("reports where the conflict is", () => {
    const analysis = analyseBoundary({ vertices: verticesFrom(shuffled) });
    const [conflict] = analysis.selfIntersections;
    assert.ok(Number.isInteger(conflict.a));
    assert.ok(Number.isInteger(conflict.b));
    assert.notEqual(conflict.a, conflict.b);
  });

  it("keeps the documented order in the record even when it is wrong", () => {
    const analysis = analyseBoundary({ vertices: verticesFrom(shuffled) });
    assert.deepEqual(analysis.documentSequence, [0, 1, 2, 3]);
  });

  it("offers one proposal when the corners admit only one boundary", () => {
    const analysis = analyseBoundary({ vertices: verticesFrom(shuffled) });
    assert.ok(analysis.suggestedSequence, "a rectangle's corners admit exactly one simple boundary");
    assert.equal(analysis.suggestedSequence?.method, "CONVEX_ORDER");
    assert.ok((analysis.suggestedSequence?.confidence ?? 0) < 1, "a proposal is never certain");
    assert.ok(Math.abs((analysis.suggestedSequence?.areaSquareMeters ?? 0) - RECTANGLE_AREA) < 0.1);
  });

  it("produces a valid boundary once the proposal is applied", () => {
    const vertices = verticesFrom(shuffled);
    const analysis = analyseBoundary({ vertices });
    const proposal = analysis.suggestedSequence;
    assert.ok(proposal);

    const confirmed = analyseBoundary({ vertices: reorderVertices(vertices, proposal.order) });
    assert.equal(confirmed.documentOrderValid, true);
    assert.equal(confirmed.selfIntersections.length, 0);
  });

  it("makes no proposal when the corners are collinear", () => {
    const collinear: Point[] = [
      { lat: 24.7136, lon: 46.6753 },
      { lat: 24.7136, lon: 46.6754 },
      { lat: 24.7136, lon: 46.6755 },
    ];
    const analysis = analyseBoundary({ vertices: verticesFrom(collinear) });
    assert.equal(analysis.documentOrderValid, false);
    assert.equal(check(analysis, "POSITIVE_AREA")?.status, "FAIL");
    assert.equal(analysis.suggestedSequence, undefined);
  });
});

describe("Corner bookkeeping", () => {
  it("treats a repeated closing point as closure, not a fifth corner", () => {
    const closed = [...RECTANGLE, RECTANGLE[0]];
    const analysis = analyseBoundary({ vertices: verticesFrom(closed) });
    assert.equal(analysis.distinctCount, 4);
    assert.equal(analysis.closingDuplicateIndex, 4);
    assert.equal(analysis.documentOrderValid, true);
    assert.equal(check(analysis, "DUPLICATE_VERTICES")?.status, "PASS");
    assert.equal(check(analysis, "DUPLICATE_VERTICES")?.detail, "CLOSING_POINT_REPEATS_FIRST");
  });

  it("warns about a repeat that is not a closure", () => {
    const repeated = [RECTANGLE[0], RECTANGLE[1], RECTANGLE[2], RECTANGLE[1], RECTANGLE[3]];
    const analysis = analyseBoundary({ vertices: verticesFrom(repeated) });
    assert.equal(analysis.duplicateIndices.length, 1);
    assert.equal(analysis.duplicateIndices[0], 3);
    assert.equal(check(analysis, "DUPLICATE_VERTICES")?.status, "WARNING");
    assert.equal(analysis.distinctCount, 4);
  });

  it("refuses a boundary from fewer than three distinct corners", () => {
    const analysis = analyseBoundary({ vertices: verticesFrom(RECTANGLE.slice(0, 2)) });
    assert.equal(analysis.distinctCount, 2);
    assert.equal(analysis.documentOrderValid, false);
    assert.equal(analysis.segments.length, 0);
    assert.equal(check(analysis, "POINT_COUNT")?.status, "WARNING");
  });

  it("rejects non-finite coordinates", () => {
    const broken = verticesFrom(RECTANGLE);
    broken[1] = vertex({ lat: Number.NaN, lon: 46.6 }, 1);
    const analysis = analyseBoundary({ vertices: broken });
    assert.equal(check(analysis, "COORDINATE_VALIDITY")?.status, "FAIL");
  });

  it("flags a mixed coordinate reference system", () => {
    const mixed = verticesFrom(RECTANGLE);
    mixed[2] = vertex(RECTANGLE[2], 2, { crs: "utm" });
    const analysis = analyseBoundary({ vertices: mixed });
    assert.equal(check(analysis, "CRS_CONSISTENCY")?.status, "WARNING");
  });

  it("flags corners outside the document's country", () => {
    const analysis = analyseBoundary({
      vertices: verticesFrom(RECTANGLE),
      isPlausiblePoint: () => false,
      countryLabel: "SA",
    });
    assert.equal(check(analysis, "GEOGRAPHIC_SANITY")?.status, "FAIL");
    assert.equal(check(analysis, "GEOGRAPHIC_SANITY")?.detail, "SA");
  });
});

describe("Documented side lengths as evidence", () => {
  const sides: DocumentedSide[] = [
    { direction: "N", lengthMeters: 25.4, raw: "الحد الشمالي بطول 25.40" },
    { direction: "S", lengthMeters: 25.4, raw: "الحد الجنوبي بطول 25.40" },
    { direction: "E", lengthMeters: 20, raw: "الحد الشرقي بطول 20.00" },
    { direction: "W", lengthMeters: 20, raw: "الحد الغربي بطول 20.00" },
  ];

  it("confirms a boundary whose sides match the document", () => {
    const analysis = analyseBoundary({ vertices: verticesFrom(RECTANGLE), documentedSides: sides });
    assert.equal(analysis.sideLengthComparison?.verdict, "MATCH");
    assert.equal(analysis.sideLengthComparison?.matched, 4);
    assert.equal(check(analysis, "SIDE_LENGTH_AGREEMENT")?.status, "PASS");
    assert.ok((analysis.sideLengthComparison?.maxDeviationMeters ?? 1) < 0.05);
  });

  it("attaches each documented length to the side it describes", () => {
    const analysis = analyseBoundary({ vertices: verticesFrom(RECTANGLE), documentedSides: sides });
    const withLengths = analysis.segments.filter((segment) => segment.documentLengthMeters !== undefined);
    assert.equal(withLengths.length, 4);
    for (const segment of analysis.segments) {
      assert.ok(Math.abs((segment.deviationMeters ?? 1)) < 0.05, `${segment.fromLabel}→${segment.toLabel}`);
    }
  });

  it("lowers the verdict when the sides disagree with the geometry", () => {
    const wrong: DocumentedSide[] = [
      { direction: "N", lengthMeters: 40, raw: "" },
      { direction: "S", lengthMeters: 40, raw: "" },
      { direction: "E", lengthMeters: 30, raw: "" },
      { direction: "W", lengthMeters: 30, raw: "" },
    ];
    const analysis = analyseBoundary({ vertices: verticesFrom(RECTANGLE), documentedSides: wrong });
    assert.equal(analysis.sideLengthComparison?.verdict, "MISMATCH");
    assert.equal(check(analysis, "SIDE_LENGTH_AGREEMENT")?.status, "FAIL");
  });

  it("is not applicable when the document states no lengths", () => {
    const analysis = analyseBoundary({ vertices: verticesFrom(RECTANGLE) });
    assert.equal(check(analysis, "SIDE_LENGTH_AGREEMENT")?.status, "NOT_APPLICABLE");
    assert.equal(analysis.sideLengthComparison, undefined);
  });
});

describe("Area against the stated value", () => {
  it("reports a near-exact match as a match", () => {
    const analysis = analyseBoundary({
      vertices: verticesFrom(RECTANGLE),
      statedArea: parseAreaValue("508 م2") ?? undefined,
    });
    assert.equal(analysis.areaComparison?.verdict, "MATCH");
    assert.ok(Math.abs(analysis.areaComparison?.differenceSquareMeters ?? 99) < 1);
    assert.equal(check(analysis, "STATED_AREA_AGREEMENT")?.status, "PASS");
  });

  it("does not fail a small rounding difference", () => {
    const analysis = analyseBoundary({
      vertices: verticesFrom(RECTANGLE),
      statedArea: parseAreaValue("510 م2") ?? undefined,
    });
    assert.equal(analysis.areaComparison?.verdict, "MATCH");
  });

  it("asks for review at a few percent", () => {
    const analysis = analyseBoundary({
      vertices: verticesFrom(RECTANGLE),
      statedArea: parseAreaValue("525 م2") ?? undefined,
    });
    assert.equal(analysis.areaComparison?.verdict, "REVIEW");
    assert.equal(check(analysis, "STATED_AREA_AGREEMENT")?.status, "WARNING");
  });

  it("fails a real disagreement", () => {
    const analysis = analyseBoundary({
      vertices: verticesFrom(RECTANGLE),
      statedArea: parseAreaValue("1200 م2") ?? undefined,
    });
    assert.equal(analysis.areaComparison?.verdict, "MISMATCH");
    assert.equal(check(analysis, "STATED_AREA_AGREEMENT")?.status, "FAIL");
  });

  it("converts a stated unit before comparing", () => {
    const hectare = parseAreaValue("0.0508 hectares");
    assert.ok(hectare);
    const analysis = analyseBoundary({ vertices: verticesFrom(RECTANGLE), statedArea: hectare });
    assert.equal(analysis.areaComparison?.verdict, "MATCH");
  });

  it("cannot compare when the boundary itself is invalid", () => {
    const shuffled = [RECTANGLE[0], RECTANGLE[2], RECTANGLE[1], RECTANGLE[3]];
    const analysis = analyseBoundary({
      vertices: verticesFrom(shuffled),
      statedArea: parseAreaValue("508 م2") ?? undefined,
    });
    assert.equal(analysis.areaComparison, undefined);
    assert.equal(check(analysis, "STATED_AREA_AGREEMENT")?.status, "NOT_APPLICABLE");
  });
});

describe("Manual reordering", () => {
  it("reorders vertices without losing or altering any of them", () => {
    const vertices = verticesFrom(RECTANGLE);
    const reordered = reorderVertices(vertices, [3, 2, 1, 0]);
    assert.deepEqual(reordered.map((item) => item.index), [3, 2, 1, 0]);
    assert.equal(reordered[0].sourceText, vertices[3].sourceText, "source data is untouched");
    assert.equal(reordered.length, vertices.length);
  });

  it("keeps a vertex the caller forgot to list", () => {
    const vertices = verticesFrom(RECTANGLE);
    const reordered = reorderVertices(vertices, [2, 0]);
    assert.equal(reordered.length, 4);
    assert.deepEqual(reordered.slice(0, 2).map((item) => item.index), [2, 0]);
  });

  it("recomputes area and side lengths after a confirmed reorder", () => {
    const vertices = verticesFrom([RECTANGLE[0], RECTANGLE[2], RECTANGLE[1], RECTANGLE[3]]);
    const before = analyseBoundary({ vertices });
    assert.equal(before.documentOrderValid, false);

    const after = analyseBoundary({ vertices: reorderVertices(vertices, [0, 2, 1, 3]) });
    assert.equal(after.documentOrderValid, true);
    assert.ok(Math.abs((after.areaSquareMeters ?? 0) - RECTANGLE_AREA) < 0.1);
    assert.equal(after.segments.length, 4);
  });
});
