// What the copy button puts on the clipboard, pinned character for character.
//
// The example below is the one in the brief and is the contract: a surveyor
// pastes it into a CAD command line or a spreadsheet column, so a stray header
// row, an invented "P", an Arabic digit or a trailing newline all break it in a
// way no screenshot would show.
import assert from "node:assert/strict";
import test from "node:test";

import { canFormat, formatPoints, isCopyFormat, type CopyRow } from "@/src/lib/tools/fml-clipboard";

/** The six-point parcel from the brief. Point 6 repeats point 3: that is the
 *  document's closing point and it stays a row. */
const PARCEL: CopyRow[] = [
  { label: "P1", easting: 511606.45, northing: 2384968.87 },
  { label: "P2", easting: 511658.348, northing: 2385016.888 },
  { label: "P3", easting: 511613.386, northing: 2385018.634 },
  { label: "P4", easting: 511656.408, northing: 2384966.93 },
  { label: "P5", easting: 511608.196, northing: 2385013.832 },
  { label: "P6", easting: 511613.386, northing: 2385018.634 },
];

test("the binding example: default E,N", () => {
  assert.equal(
    formatPoints(PARCEL, "en"),
    [
      "1\t511606.450,2384968.870",
      "2\t511658.348,2385016.888",
      "3\t511613.386,2385018.634",
      "4\t511656.408,2384966.930",
      "5\t511608.196,2385013.832",
      "6\t511613.386,2385018.634",
    ].join("\n"),
  );
});

test("no header row, no trailing newline, one tab per row", () => {
  const text = formatPoints(PARCEL, "en");
  assert.ok(!text.startsWith("Point"), "no header");
  assert.ok(!text.endsWith("\n"), "no trailing newline");
  assert.equal(text.split("\n").length, 6);
  for (const line of text.split("\n")) {
    assert.equal(line.split("\t").length, 2, `one tab: ${line}`);
    assert.match(line, /^\d+\t\d+\.\d{3},\d+\.\d{3}$/, line);
  }
});

test("N,E swaps the pair and nothing else", () => {
  assert.equal(
    formatPoints(PARCEL, "ne").split("\n")[0],
    "1\t2384968.870,511606.450",
  );
});

test("CSV carries a header and commas", () => {
  const lines = formatPoints(PARCEL, "csv").split("\n");
  assert.equal(lines[0], "Point,Easting,Northing");
  assert.equal(lines[1], "1,511606.450,2384968.870");
  assert.equal(lines.length, 7, "header + six points");
});

test("AutoCAD wraps the vertices in _PLINE … C", () => {
  const lines = formatPoints(PARCEL, "acad").split("\n");
  assert.equal(lines[0], "_PLINE");
  assert.equal(lines.at(-1), "C");
  assert.equal(lines[1], "511606.450,2384968.870");
  // Point 6 repeats point 3, not point 1. A repeat inside the ring is a real
  // vertex the document lists twice, so all six reach the command; only a
  // last-equals-first closure is dropped, which the next test covers.
  assert.equal(lines.length, 1 + 6 + 1);
});

test("AutoCAD drops a closing point that repeats the first, and only that", () => {
  const closed: CopyRow[] = [...PARCEL.slice(0, 4), { ...PARCEL[0] }];
  const lines = formatPoints(closed, "acad").split("\n");
  // Five rows in, four vertices out: `C` closes the ring, so repeating the
  // first point would leave a zero-length final segment.
  assert.equal(lines.length, 1 + 4 + 1);
  assert.equal(lines.at(-1), "C");
  assert.equal(lines.at(-2), "511656.408,2384966.930", "the last real vertex survives");

  // The row is still a row everywhere else: the document lists it, so the
  // table and the spreadsheet show it.
  assert.equal(formatPoints(closed, "en").split("\n").length, 5);
  assert.equal(formatPoints(closed, "csv").split("\n").length, 6);
});

test("a document's own point number is never rewritten", () => {
  // Saudi survey reports lead the row with a reference like this one. Turning
  // it into P1 is what made the table impossible to check against the deed.
  const rows: CopyRow[] = [
    { label: "23915169", easting: 511606.45, northing: 2384968.87 },
    { label: "12-13", easting: 511658.348, northing: 2385016.888 },
  ];
  assert.equal(
    formatPoints(rows, "en"),
    "23915169\t511606.450,2384968.870\n12-13\t511658.348,2385016.888",
  );
});

test("WGS84 needs a geographic pair on every row", () => {
  const withPairs: CopyRow[] = [
    { label: "P1", easting: 511606.45, northing: 2384968.87, lat: 21.56789123, lon: 39.12345678 },
  ];
  assert.equal(formatPoints(withPairs, "wgs84"), "1\t21.56789123,39.12345678");
  assert.equal(canFormat(withPairs, "wgs84"), true);

  // One row short of a pair disables the format rather than copying a blank.
  assert.equal(canFormat(PARCEL, "wgs84"), false);
  assert.equal(formatPoints(PARCEL, "wgs84"), "");
});

test("no rows copies nothing, in every format", () => {
  for (const format of ["en", "ne", "csv", "acad", "wgs84"] as const) {
    assert.equal(formatPoints([], format), "", format);
    assert.equal(canFormat([], format), false, format);
  }
});

test("every value is Latin digits with a decimal point", () => {
  // The interface is Arabic by default; the clipboard must not be.
  for (const format of ["en", "ne", "csv", "acad"] as const) {
    const text = formatPoints(PARCEL, format);
    assert.doesNotMatch(text, /[٠-٩۰-۹]/, `Arabic-Indic digits in ${format}`);
    assert.doesNotMatch(text, /٫/, `Arabic decimal separator in ${format}`);
  }
});

test("the stored format is validated before it is trusted", () => {
  assert.equal(isCopyFormat("en"), true);
  assert.equal(isCopyFormat("acad"), true);
  assert.equal(isCopyFormat("dxf"), false);
  assert.equal(isCopyFormat(null), false);
});
