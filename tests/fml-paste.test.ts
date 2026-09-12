// Typed or pasted coordinates. The contract is that everything this tool's own
// copy button produces pastes straight back in — a surveyor should not have to
// hand-edit a list to get it into the tool that made it.
import assert from "node:assert/strict";
import test from "node:test";

import {
  parsePastedCoordinateRows,
  parseProjectedSourceRow,
  pastedRowsAsDocumentText,
} from "@/src/lib/tools/fml-display-policy";
import { formatPoints, type CopyRow } from "@/src/lib/tools/fml-clipboard";

const PARCEL: CopyRow[] = [
  { label: "1", easting: 565150.5, northing: 2550415.28 },
  { label: "2", easting: 565136.78, northing: 2550388.6 },
  { label: "3", easting: 565127.88, northing: 2550393.17 },
  { label: "4", easting: 565141.61, northing: 2550419.85 },
];

test("every format the copy button produces pastes back in", () => {
  for (const format of ["en", "csv", "acad"] as const) {
    const rows = parsePastedCoordinateRows(formatPoints(PARCEL, format));
    assert.equal(rows.length, PARCEL.length, `${format} round-trips all four points`);
    assert.equal(rows[0].easting, 565150.5, format);
    assert.equal(rows[0].northing, 2550415.28, format);
  }
});

test("N,E round-trips too — the pair is decided by magnitude, not position", () => {
  const rows = parsePastedCoordinateRows(formatPoints(PARCEL, "ne"));
  assert.equal(rows.length, 4);
  assert.equal(rows[0].easting, 565150.5, "the six-digit value is the easting");
  assert.equal(rows[0].northing, 2550415.28);
});

test("the AutoCAD wrapper is skipped, not read as coordinates", () => {
  const rows = parsePastedCoordinateRows(formatPoints(PARCEL, "acad"));
  assert.equal(rows.length, 4, "_PLINE and C are not points");
});

test("a CSV header is skipped", () => {
  const rows = parsePastedCoordinateRows("Point,Easting,Northing\n565150.500,2550415.280\n565136.780,2550388.600");
  assert.equal(rows.length, 2);
});

test("loose shapes people actually type", () => {
  const rows = parsePastedCoordinateRows([
    "565150.50 2550415.28",          // spaces, no point number
    "  2   565136.780   2550388.600", // leading spaces and a number
    "3;565127.880;2550393.170",       // semicolons
    "",                                // a blank line between blocks
    "4|565141.610|2550419.850",       // pipes
  ].join("\n"));
  assert.equal(rows.length, 4);
  assert.deepEqual(rows.map((row) => row.label), ["P1", "2", "3", "4"]);
  assert.equal(rows[3].easting, 565141.61);
});

test("a line id survives as the label rather than being read as two numbers", () => {
  const rows = parsePastedCoordinateRows("12-13\t565150.500,2550415.280");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].label, "12-13");
  assert.equal(rows[0].easting, 565150.5);
});

test("a survey reference number is kept whole", () => {
  const rows = parsePastedCoordinateRows("23915169,565150.500,2550415.280");
  assert.equal(rows[0].label, "23915169");
  assert.equal(rows[0].easting, 565150.5);
});

test("an ambiguous pair is refused rather than guessed", () => {
  // Two six-digit values near the equator: either could be the easting, and a
  // wrong guess moves the parcel by hundreds of kilometres.
  assert.equal(parsePastedCoordinateRows("565150.500,565136.780").length, 0);
});

test("nothing usable parses to nothing", () => {
  assert.deepEqual(parsePastedCoordinateRows(""), []);
  assert.deepEqual(parsePastedCoordinateRows("hello\nworld"), []);
  assert.deepEqual(parsePastedCoordinateRows("_PLINE\nC"), []);
});

test("pasted rows become text the resolver reads like a document", () => {
  const rows = parsePastedCoordinateRows(formatPoints(PARCEL, "en"));
  const text = pastedRowsAsDocumentText(rows, { zone: 40, hemisphere: "N" });
  assert.match(text, /PROJECTION: UTM ZONE 40N/);
  assert.match(text, /1\s+565150\.500\s+2550415\.280/);
  // And that text parses back to the same points, which is what makes it safe
  // to hand to the same route a scanned plan goes through.
  const roundTrip = text.split("\n").slice(2).map((line) => parseProjectedSourceRow({ label: "", raw: line }));
  assert.equal(roundTrip.filter(Boolean).length, 4);
});

test("the document parser is unchanged by all this", () => {
  // The paste parser is a separate entry point precisely so that loosening the
  // separators could not change what a survey document reads as. A comma
  // directly before a number is still not a column separator there.
  assert.equal(parseProjectedSourceRow({ label: "", raw: "1,565150.500,2550415.280" }), null);
  assert.ok(parseProjectedSourceRow({ label: "", raw: "1  565150.500  2550415.280" }));
});
