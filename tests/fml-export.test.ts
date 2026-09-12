// The parcel as a file. A DXF that opens crooked or a KML with its pair the
// wrong way round puts the boundary in the sea, and neither is visible in the
// tool that produced it — so the structure is asserted here.
import assert from "node:assert/strict";
import test from "node:test";

import {
  buildParcelCsv,
  buildParcelDxf,
  buildParcelKml,
  canExport,
  parcelFileName,
  type ParcelExport,
} from "@/src/lib/tools/fml-export";
import type { CopyRow } from "@/src/lib/tools/fml-clipboard";

const ROWS: CopyRow[] = [
  { label: "1", easting: 565150.5, northing: 2550415.28, lat: 23.0610105, lon: 57.6360063 },
  { label: "2", easting: 565136.78, northing: 2550388.6, lat: 23.06077004, lon: 57.63587123 },
  { label: "3", easting: 565127.88, northing: 2550393.17, lat: 23.06081167, lon: 57.63578455 },
  { label: "4", easting: 565141.61, northing: 2550419.85, lat: 23.06105213, lon: 57.63591971 },
];

const PARCEL: ParcelExport = { rows: ROWS, areaSquareMeters: 300, zone: 40, hemisphere: "N", name: "12/345" };

/**
 * DXF is group-code/value pairs, two lines each.
 *
 * Only the trailing blank from the final CRLF is dropped: a DXF value may
 * legitimately be empty (the STYLE table ends with one), and filtering those
 * out shifts every pair after it by a line.
 */
function pairs(dxf: string): Array<[string, string]> {
  const lines = dxf.split("\r\n");
  if (lines.at(-1) === "") lines.pop();
  const out: Array<[string, string]> = [];
  for (let i = 0; i + 1 < lines.length; i += 2) out.push([lines[i], lines[i + 1]]);
  return out;
}

/** The height of the first TEXT entity, not whatever group 40 comes first. */
function firstTextHeight(dxf: string): string | undefined {
  const rows = pairs(dxf);
  const start = rows.findIndex(([code, value]) => code === "0" && value === "TEXT");
  if (start < 0) return undefined;
  return rows.slice(start).find(([code]) => code === "40")?.[1];
}

test("DXF: one closed polyline on PARCEL, a label per point, an area label", () => {
  const dxf = buildParcelDxf(PARCEL);
  const entities = pairs(dxf).filter(([code]) => code === "0").map(([, value]) => value);

  // POLYLINE, not LWPOLYLINE: the header declares R12, where LWPOLYLINE does
  // not exist (see the version test below).
  assert.equal(entities.filter((e) => e === "POLYLINE").length, 1, "exactly one polyline");
  assert.equal(entities.filter((e) => e === "SEQEND").length, 1, "the vertex list is terminated");
  // Four vertices, so four point labels, plus one for the area.
  assert.equal(entities.filter((e) => e === "TEXT").length, ROWS.length + 1);
  assert.equal(entities.filter((e) => e === "POINT").length, ROWS.length);
  assert.ok(dxf.includes("\r\n70\r\n1\r\n"), "the polyline is flagged closed");
  assert.match(dxf, /\r\n8\r\nPARCEL\r\n/);
  assert.match(dxf, /\r\n8\r\nPOINTS\r\n/);
  assert.match(dxf, /\r\n8\r\nAREA\r\n/);
  assert.match(dxf, /300\.000 m2/);
  assert.ok(dxf.endsWith("0\r\nEOF\r\n"));
});

test("DXF: units are metres, or a receiving drawing in feet scales the parcel", () => {
  const dxf = buildParcelDxf(PARCEL);
  assert.match(dxf, /\$INSUNITS\r\n70\r\n6\r\n/);
});

test("DXF: the vertex count matches the ring, and a closing repeat is dropped", () => {
  // R12 counts its vertices by emitting them, not with a group 90.
  const closed = buildParcelDxf({ ...PARCEL, rows: [...ROWS, { ...ROWS[0] }] });
  assert.equal((closed.match(/\r\nVERTEX\r\n/g) ?? []).length, 4, "the repeated first point is not a fifth vertex");
});

test("DXF: text height follows the parcel, never below half a metre", () => {
  const tiny = buildParcelDxf({
    rows: [
      { label: "1", easting: 0, northing: 0 },
      { label: "2", easting: 3, northing: 0 },
      { label: "3", easting: 0, northing: 3 },
    ],
  });
  const height = firstTextHeight(tiny);
  assert.equal(height, "0.500", "a 3m plot still gets a readable label");
});

test("KML: lon,lat — the opposite order to every table in this tool", () => {
  const kml = buildParcelKml(PARCEL);
  // First vertex: lon 57.636..., lat 23.061... in that order.
  assert.match(kml, /57\.63600630,23\.06101050,0/);
  assert.doesNotMatch(kml, /23\.06101050,57\.63600630,0/, "lat,lon would put it in the Indian Ocean");
});

test("KML: one polygon whose ring closes, plus a placemark per point", () => {
  const kml = buildParcelKml(PARCEL);
  assert.equal((kml.match(/<Polygon>/g) ?? []).length, 1);
  assert.equal((kml.match(/<Placemark>/g) ?? []).length, 1 + ROWS.length, "the polygon plus one per point");
  const ring = /<coordinates>([^<]+)<\/coordinates>/.exec(kml)?.[1]?.split(" ") ?? [];
  assert.equal(ring.length, ROWS.length + 1, "a LinearRing repeats its first point");
  assert.equal(ring[0], ring[ring.length - 1]);
  assert.match(kml, /<name>12\/345<\/name>/);
});

test("KML needs a geographic pair on every row", () => {
  const projectedOnly = { rows: ROWS.map(({ lat: _lat, lon: _lon, ...rest }) => rest) };
  assert.equal(canExport(projectedOnly, "kml"), false);
  assert.equal(canExport(projectedOnly, "dxf"), true, "the metres are still there");
  assert.throws(() => buildParcelKml(projectedOnly), /NO_GEOGRAPHIC_PAIRS/);
});

test("CSV carries the coordinates the table is showing, and only those", () => {
  const lines = buildParcelCsv(PARCEL).split("\n");
  assert.equal(lines[0], "Point,Easting,Northing");
  assert.equal(lines[1], "1,565150.500,2550415.280");
  assert.equal(lines.length, 1 + ROWS.length);
});

test("the file is named after the parcel and the grid it is on", () => {
  assert.equal(parcelFileName(PARCEL, "dxf"), "12_345-40N.dxf");
  assert.equal(parcelFileName({ rows: ROWS }, "kml"), "parcel.kml");
  assert.equal(parcelFileName({ rows: ROWS, name: "Plan 7/A" }, "csv"), "Plan_7_A.csv");
});

test("a line is not a polygon", () => {
  const twoPoints = { rows: ROWS.slice(0, 2) };
  assert.equal(canExport(twoPoints, "dxf"), false);
  assert.throws(() => buildParcelDxf(twoPoints), /NOT_A_POLYGON/);
});

test("nothing to export produces nothing, in every format", () => {
  for (const format of ["dxf", "kml", "csv"] as const) {
    assert.equal(canExport({ rows: [] }, format), false, format);
  }
});

// ---- the two faults a surveyor reported from the live tool -----------------

test("the DXF contains nothing a reader of its own declared version cannot parse", () => {
  // The header says AC1009 — R12 — and the boundary was written as an
  // LWPOLYLINE carrying `100 AcDbEntity` / `100 AcDbPolyline`. Both are R13
  // and later. A reader that believes the header meets an entity that cannot
  // exist in the version it was told to expect and drops it, so the drawing
  // opens EMPTY, which is exactly what was reported.
  const dxf = buildParcelDxf({
    rows: [
      { label: "1", easting: 511606.45, northing: 2384968.87 },
      { label: "2", easting: 511656.408, northing: 2384966.93 },
      { label: "3", easting: 511658.348, northing: 2385016.888 },
      { label: "4", easting: 511613.386, northing: 2385018.634 },
    ],
  });

  assert.match(dxf, /AC1009/);
  assert.ok(!dxf.includes("LWPOLYLINE"), "LWPOLYLINE does not exist in R12");
  assert.ok(!dxf.includes("AcDb"), "subclass markers are R13 and later");
});

test("the boundary is a POLYLINE every CAD program has read since 1990", () => {
  const dxf = buildParcelDxf({
    rows: [
      { label: "1", easting: 100, northing: 100 },
      { label: "2", easting: 140, northing: 100 },
      { label: "3", easting: 140, northing: 130 },
    ],
  });

  assert.match(dxf, /\bPOLYLINE\b/);
  // 66 = "vertices follow", which an R12 reader requires before it will look
  // for them.
  assert.match(dxf, /POLYLINE[\s\S]*?\n66\r?\n1\r?\n/);
  assert.equal((dxf.match(/\nVERTEX\r?\n/g) ?? []).length, 3);
  assert.match(dxf, /\bSEQEND\b/);
});

test("the CSV carries one coordinate system — the one on screen", () => {
  // It used to put point, easting, northing, latitude AND longitude on every
  // row. A total station is given eastings and a handheld GPS is given
  // degrees; a column holding both has to be split by hand before either can
  // use it.
  const csv = buildParcelCsv({
    rows: [
      { label: "22122831", easting: 511606.45, northing: 2384968.87, lat: 21.56757382, lon: 39.11210615 },
      { label: "22122834", easting: 511656.408, northing: 2384966.93, lat: 21.56755597, lon: 39.11258868 },
    ],
  });

  assert.equal(csv.split("\n")[0], "Point,Easting,Northing");
  assert.ok(!csv.includes("21.56757382"), "the degrees belong to the other export");
  assert.equal(csv.split("\n")[1], "22122831,511606.450,2384968.870");
});

test("a document that has only degrees exports degrees, not NaN", () => {
  // Every metric cell read `NaN` on every row of such a document.
  const csv = buildParcelCsv({
    rows: [
      { label: "P1", easting: Number.NaN, northing: Number.NaN, lat: 21.56757382, lon: 39.11210615 },
      { label: "P2", easting: Number.NaN, northing: Number.NaN, lat: 21.56755597, lon: 39.11258868 },
    ],
  });

  assert.equal(csv.split("\n")[0], "Point,Latitude,Longitude");
  assert.ok(!csv.includes("NaN"));
  // The synthetic "P" prefix is stripped here as it is everywhere else: a
  // column of coordinates is broken by a letter in the point number.
  assert.equal(csv.split("\n")[1], "1,21.56757382,39.11210615");
});
