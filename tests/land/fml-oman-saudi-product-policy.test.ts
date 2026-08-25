import test from "node:test";
import assert from "node:assert/strict";
import { chooseInitialUtmZone, explicitUtmZoneFromText } from "../../lib/land/product-policy";
import { extractZoneLessUtmRows } from "../../lib/geo/evidence-extraction";
import {
  dedupeGeometryPoints,
  explicitUtmZoneFromDisplayText,
  parseProjectedSourceRows,
  polygonSelfIntersects,
  sourcePointLabel,
  utmZoneFromLongitude,
} from "../../src/lib/tools/fml-display-policy";

const rows = [
  { lineStart: "1", lineEnd: "2", easting: 567350.49, northing: 2170025.51, eastingToken: "567350.49", northingToken: "2170025.51", raw: "1-2 567350.49 2170025.51" },
  { lineStart: "2", lineEnd: "3", easting: 567328.10, northing: 2169983.63, eastingToken: "567328.10", northingToken: "2169983.63", raw: "2-3 567328.10 2169983.63" },
] as const;

test("Oman projected survey defaults to zone 40 when zone is absent", () => {
  const decision = chooseInitialUtmZone({ text: "سلطنة عمان كروكي", countryCode: "OM", rows, inferFallback: () => undefined });
  assert.deepEqual(decision, { zone: 40, source: "OMAN_DEFAULT" });
});

test("explicit Oman zone 39 overrides the default", () => {
  const decision = chooseInitialUtmZone({ text: "PROJECTION: WGS84 ZONE 39N", countryCode: "OM", rows, inferFallback: () => 40 });
  assert.deepEqual(decision, { zone: 39, source: "DOCUMENT" });
  assert.equal(explicitUtmZoneFromText("EPSG:32639"), 39);
});


test("display zone detector honors explicit Oman 39/40", () => {
  assert.equal(explicitUtmZoneFromDisplayText("PROJECTION: WGS84 ZONE 40N"), 40);
  assert.equal(explicitUtmZoneFromDisplayText("EPSG:32639"), 39);
});

test("Saudi longitude determines UTM zone directly", () => {
  assert.equal(utmZoneFromLongitude(39.20592066741188), 37);
});

test("projected source rows retain original Easting/Northing", () => {
  const parsed = parseProjectedSourceRows([
    { label: "1-2", raw: "40N 567350.490 2170025.510" },
    { label: "2-3", raw: "40N 567328.100 2169983.630" },
  ]);
  assert.deepEqual(parsed.map(({ zone, easting, northing }) => ({ zone, easting, northing })), [
    { zone: 40, easting: 567350.49, northing: 2170025.51 },
    { zone: 40, easting: 567328.1, northing: 2169983.63 },
  ]);
});

test("Balady trailing reference is used as source row label", () => {
  assert.equal(sourcePointLabel("N 21.885762907392643 E 39.20592066741188 22470581", 0), "22470581");
});

test("duplicate source coordinate is removed only from automatic geometry", () => {
  const source = [
    { lat: 21.0, lon: 39.0 },
    { lat: 21.1, lon: 39.1 },
    { lat: 21.2, lon: 39.2 },
    { lat: 21.1, lon: 39.1 },
  ];
  assert.equal(source.length, 4);
  assert.equal(dedupeGeometryPoints(source).length, 3);
});

test("self-crossing source order is detected without radial reordering", () => {
  const safari = dedupeGeometryPoints([
    { lat: 21.885762907392643, lon: 39.20592066741188 },
    { lat: 21.88578809143258, lon: 39.20550801127744 },
    { lat: 21.885892632901115, lon: 39.205878663428656 },
    { lat: 21.88565836601457, lon: 39.20555001556669 },
    { lat: 21.88578809143258, lon: 39.20550801127744 },
  ]);
  assert.equal(safari.length, 4);
  assert.equal(polygonSelfIntersects(safari), true);
});


test("Oman flattened Krooki columns reconstruct LINE/EASTING/NORTHING/DIST", () => {
  const text = `
LINE
1-2
2-3
3-4
4-1
EASTING
NORTHING
DIST (m)
DETAILS OF THE PLOT
PLOT NO.: 149
AREA: 3,227 SQ. M.
PROJECTION: WGS84 ZONE 40N
11-03-01-51-149
567350.49
567328.10
567268.17
567290.62
2170025.51
2169983.63
2170015.56
2170057.49
47.49
67.91
47.56
67.87
`;
  const parsed = extractZoneLessUtmRows(text);
  assert.equal(parsed.length, 4);
  assert.deepEqual(parsed.map((row) => `${row.lineStart}-${row.lineEnd}`), ["1-2", "2-3", "3-4", "4-1"]);
  assert.deepEqual(parsed.map((row) => row.easting), [567350.49, 567328.10, 567268.17, 567290.62]);
  assert.deepEqual(parsed.map((row) => row.northing), [2170025.51, 2169983.63, 2170015.56, 2170057.49]);
  assert.deepEqual(parsed.map((row) => row.distance), [47.49, 67.91, 47.56, 67.87]);
});

test("Oman row-wise Krooki keeps the closing LINE as an edge, not an extra vertex", () => {
  const text = `
LINE EASTING NORTHING DIST (m)
1-2 567350.49 2170025.51 47.49
2-3 567328.10 2169983.63 67.91
3-4 567268.17 2170015.56 47.56
4-1 567290.62 2170057.49 67.87
`;
  const parsed = extractZoneLessUtmRows(text);
  assert.equal(parsed.length, 4);
  assert.equal(parsed[3].lineStart, "4");
  assert.equal(parsed[3].lineEnd, "1");
});
