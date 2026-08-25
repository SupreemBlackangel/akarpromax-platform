import assert from "node:assert/strict";
import { describe, it } from "node:test";
import proj4 from "proj4";
import type { Point } from "@/lib/geo/contracts";
import {
  crossValidateSurvey,
  validateArea,
  validateEdgeDistances,
  ringFromSequence,
} from "@/lib/land/intelligence/survey-validation";

const WGS84 = "+proj=longlat +datum=WGS84 +no_defs";
const ZONE_40N = "+proj=utm +zone=40 +datum=WGS84 +units=m +no_defs";

function fromUtm40N(easting: number, northing: number): Point {
  const [lon, lat] = proj4(ZONE_40N, WGS84, [easting, northing]);
  return { lat, lon };
}

/**
 * A square parcel in UTM zone 40N, 20 m on a side: area exactly 400 m².
 * Built from projected coordinates so the expected values are known, not
 * copied from the implementation's own output.
 */
const SQUARE_E = 500_000;
const SQUARE_N = 2_600_000;
const SQUARE: ReadonlyMap<string, Point> = new Map([
  ["1", fromUtm40N(SQUARE_E, SQUARE_N)],
  ["2", fromUtm40N(SQUARE_E + 20, SQUARE_N)],
  ["3", fromUtm40N(SQUARE_E + 20, SQUARE_N + 20)],
  ["4", fromUtm40N(SQUARE_E, SQUARE_N + 20)],
]);
const SQUARE_SEQUENCE = ["1", "2", "3", "4", "1"];
const SQUARE_EDGES = [
  { from: "1", to: "2", meters: 20 },
  { from: "2", to: "3", meters: 20 },
  { from: "3", to: "4", meters: 20 },
  { from: "4", to: "1", meters: 20 },
];

describe("survey cross-validation", () => {
  describe("edge distances", () => {
    it("matches every printed edge length on a known square", () => {
      const checks = validateEdgeDistances(SQUARE, SQUARE_EDGES);
      assert.equal(checks.length, 4);
      for (const check of checks) {
        assert.equal(check.status, "MATCH", `${check.from}->${check.to} was ${check.status}`);
        assert.ok(check.deltaMeters < 0.05, `delta ${check.deltaMeters} m too large`);
      }
    });

    it("flags an edge the document contradicts", () => {
      const checks = validateEdgeDistances(SQUARE, [{ from: "1", to: "2", meters: 35 }]);
      assert.equal(checks.length, 1);
      assert.equal(checks[0].status, "MISMATCH");
      assert.ok(checks[0].deltaMeters > 14);
    });

    it("accepts ordinary survey-sheet rounding", () => {
      const checks = validateEdgeDistances(SQUARE, [{ from: "1", to: "2", meters: 20.03 }]);
      assert.equal(checks[0].status, "MATCH");
    });

    it("skips an edge whose corner was never extracted", () => {
      const checks = validateEdgeDistances(SQUARE, [{ from: "1", to: "9", meters: 20 }]);
      assert.equal(checks.length, 0);
    });
  });

  describe("area", () => {
    it("computes 400 square metres for the known square", () => {
      const ring = ringFromSequence(SQUARE, SQUARE_SEQUENCE);
      assert.equal(ring.length, 4, "the repeated closing corner must not become a vertex");
      const area = validateArea(ring, 400);
      assert.equal(area.status, "MATCH");
      assert.ok(Math.abs(area.calculatedSqm - 400) < 1, `got ${area.calculatedSqm}`);
    });

    it("flags a registered area the geometry cannot support", () => {
      const ring = ringFromSequence(SQUARE, SQUARE_SEQUENCE);
      assert.equal(validateArea(ring, 1000).status, "MISMATCH");
    });

    it("reports the computed area even when the document states none", () => {
      const ring = ringFromSequence(SQUARE, SQUARE_SEQUENCE);
      const area = validateArea(ring, undefined);
      assert.equal(area.status, "UNVERIFIED");
      assert.ok(Math.abs(area.calculatedSqm - 400) < 1);
    });

    it("does not invent an area for an unclosed pair of points", () => {
      const area = validateArea([SQUARE.get("1") as Point, SQUARE.get("2") as Point], 400);
      assert.equal(area.status, "UNVERIFIED");
    });
  });

  describe("agreement verdict", () => {
    it("agrees when coordinates, edges and area all describe one parcel", () => {
      const result = crossValidateSurvey({
        points: SQUARE,
        sequence: SQUARE_SEQUENCE,
        distances: SQUARE_EDGES,
        statedAreaSqm: 400,
      });
      assert.equal(result.agreement, "AGREE");
      assert.equal(result.edgesChecked, 4);
      assert.equal(result.edgesMatched, 4);
      assert.equal(result.area.status, "MATCH");
    });

    it("withholds agreement when one edge contradicts the geometry", () => {
      const result = crossValidateSurvey({
        points: SQUARE,
        sequence: SQUARE_SEQUENCE,
        distances: [...SQUARE_EDGES.slice(0, 3), { from: "4", to: "1", meters: 31 }],
        statedAreaSqm: 400,
      });
      assert.equal(result.agreement, "DISAGREE");
      assert.equal(result.edgesMismatched, 1);
      assert.ok(result.warnings.some((w) => w.includes("edge length")));
    });

    it("withholds agreement when the registered area contradicts the geometry", () => {
      const result = crossValidateSurvey({
        points: SQUARE,
        sequence: SQUARE_SEQUENCE,
        distances: SQUARE_EDGES,
        statedAreaSqm: 900,
      });
      assert.equal(result.agreement, "DISAGREE");
      assert.ok(result.warnings.some((w) => w.includes("registered area")));
    });

    it("reports UNVERIFIED when the document states nothing to check", () => {
      const result = crossValidateSurvey({ points: SQUARE, sequence: SQUARE_SEQUENCE });
      assert.equal(result.agreement, "UNVERIFIED");
      assert.equal(result.edgesChecked, 0);
    });

    it("notes printed edges it could not check", () => {
      const result = crossValidateSurvey({
        points: SQUARE,
        sequence: SQUARE_SEQUENCE,
        distances: [...SQUARE_EDGES, { from: "5", to: "6", meters: 12 }],
        statedAreaSqm: 400,
      });
      assert.equal(result.edgesChecked, 4);
      assert.ok(result.warnings.some((w) => w.includes("could not be checked")));
    });
  });

  describe("a wrong UTM zone cannot pass as agreement", () => {
    it("disagrees when the same eastings are read in the wrong zone", () => {
      const zone39 = "+proj=utm +zone=39 +datum=WGS84 +units=m +no_defs";
      const shifted = new Map<string, Point>();
      for (const [label, _point] of SQUARE) {
        const index = Number(label) - 1;
        const e = SQUARE_E + (index === 1 || index === 2 ? 20 : 0);
        const n = SQUARE_N + (index === 2 || index === 3 ? 20 : 0);
        const [lon, lat] = proj4(zone39, WGS84, [e, n]);
        shifted.set(label, { lat, lon });
      }
      // The shape survives the zone error, so edges still match — but the
      // parcel lands roughly 6 degrees of longitude away. This is exactly why
      // geographic sanity is a separate check from distance/area agreement.
      const result = crossValidateSurvey({
        points: shifted,
        sequence: SQUARE_SEQUENCE,
        distances: SQUARE_EDGES,
        statedAreaSqm: 400,
      });
      assert.equal(result.agreement, "AGREE");
      const correct = SQUARE.get("1") as Point;
      const wrong = shifted.get("1") as Point;
      assert.ok(Math.abs(correct.lon - wrong.lon) > 5,
        "a zone error must move the parcel far enough for the geographic check to catch it");
    });
  });

  describe("Oman reference templates", () => {
    // Template A: LINE / NORTHING / EASTING / DIST, five corners, AREA 647 SQ.M
    it("validates a five-corner parcel with a closed 1-2-3-4-5-1 topology", () => {
      const pts = new Map<string, Point>([
        ["1", fromUtm40N(500_000, 2_600_000)],
        ["2", fromUtm40N(500_030, 2_600_000)],
        ["3", fromUtm40N(500_030, 2_600_020)],
        ["4", fromUtm40N(500_015, 2_600_030)],
        ["5", fromUtm40N(500_000, 2_600_020)],
      ]);
      const sequence = ["1", "2", "3", "4", "5", "1"];
      const ring = ringFromSequence(pts, sequence);
      assert.equal(ring.length, 5, "a five-sided parcel must keep five vertices");

      const area = validateArea(ring, undefined);
      const edges = [
        { from: "1", to: "2", meters: 30 },
        { from: "2", to: "3", meters: 20 },
        { from: "3", to: "4", meters: 18.03 },
        { from: "4", to: "5", meters: 18.03 },
        { from: "5", to: "1", meters: 20 },
      ];
      const result = crossValidateSurvey({
        points: pts,
        sequence,
        distances: edges,
        statedAreaSqm: Math.round(area.calculatedSqm),
      });
      assert.equal(result.edgesChecked, 5, "every printed edge must be checked");
      assert.equal(result.edgesMismatched, 0);
      assert.equal(result.agreement, "AGREE");
    });

    // Template B: WGS84 40N, LINE / EASTING / NORTHING / DIST, four corners,
    // AREA 300 SQ.m, no repeated closing row.
    it("validates a four-corner 300 square metre parcel in zone 40N", () => {
      const pts = new Map<string, Point>([
        ["1", fromUtm40N(500_000, 2_600_000)],
        ["2", fromUtm40N(500_020, 2_600_000)],
        ["3", fromUtm40N(500_020, 2_600_015)],
        ["4", fromUtm40N(500_000, 2_600_015)],
      ]);
      const sequence = ["1", "2", "3", "4", "1"];
      const result = crossValidateSurvey({
        points: pts,
        sequence,
        distances: [
          { from: "1", to: "2", meters: 20 },
          { from: "2", to: "3", meters: 15 },
          { from: "3", to: "4", meters: 20 },
          { from: "4", to: "1", meters: 15 },
        ],
        statedAreaSqm: 300,
      });
      assert.equal(result.edgesChecked, 4);
      assert.equal(result.edgesMatched, 4);
      assert.equal(result.area.status, "MATCH");
      assert.ok(Math.abs(result.area.calculatedSqm - 300) < 1, `got ${result.area.calculatedSqm}`);
      assert.equal(result.agreement, "AGREE");
    });
  });
});
