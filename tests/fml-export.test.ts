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

  assert.equal(entities.filter((e) => e === "LWPOLYLINE").length, 1, "exactly one polyline");
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
  const closed = buildParcelDxf({ ...PARCEL, rows: [...ROWS, { ...ROWS[0] }] });
  const vertexCount = /\r\n90\r\n(\d+)\r\n/.exec(closed)?.[1];
  assert.equal(vertexCount, "4", "the repeated first point is not a fifth vertex");
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

test("CSV carries both coordinate systems in one file", () => {
  const lines = buildParcelCsv(PARCEL).split("\n");
  assert.equal(lines[0], "Point,Easting,Northing,Latitude,Longitude");
  assert.equal(lines[1], "1,565150.500,2550415.280,23.06101050,57.63600630");
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
