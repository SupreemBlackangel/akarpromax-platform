import assert from "node:assert/strict";
import test from "node:test";

import { parseProjectedSourceRow, parseProjectedSourceRows } from "../src/lib/tools/fml-display-policy.ts";
import { wgs84ToUtm, utmToWgs84, utmZoneForPoint } from "../lib/geo/utm.ts";

/**
 * Reading a projected coordinate table out of a survey document.
 *
 * Survey sheets are written in both orders. This tool's own table puts N before
 * E, and Arabic survey documents commonly do the same, but the parser only
 * accepted easting-then-northing. A northing-first document was therefore not
 * recognised as projected at all, and the panel headed "from the document"
 * fell back to showing converted geographic coordinates -- presenting a
 * conversion as if it were the document's own numbers.
 *
 * The values below are a real parcel in Jeddah, UTM zone 37N.
 */

const row = (raw) => parseProjectedSourceRow({ label: "P1", raw });

// 522886.451 E, 2407349.790 N -- the northing has seven digits, the easting six.
const E = "522886.451";
const N = "2407349.790";

test("an easting-first row is read, as it always was", () => {
  const parsed = row(`P1 ${E} ${N}`);
  assert.ok(parsed);
  assert.equal(parsed.easting, 522886.451);
  assert.equal(parsed.northing, 2407349.79);
});

test("a northing-first row is read too", () => {
  // The order this tool's own table displays, and the one that was silently
  // unreadable.
  const parsed = row(`P1 ${N} ${E}`);
  assert.ok(parsed, "a northing-first table must not be treated as unprojected");
  assert.equal(parsed.easting, 522886.451);
  assert.equal(parsed.northing, 2407349.79);
});

test("the two orders produce the same point", () => {
  const a = row(`P1 ${E} ${N}`);
  const b = row(`P1 ${N} ${E}`);
  assert.deepEqual({ e: a.easting, n: a.northing }, { e: b.easting, n: b.northing });
});

test("commas, semicolons and tabs separate a pair as well as spaces", () => {
  // A table lifted out of a PDF rarely comes back with tidy single spaces.
  for (const separator of [", ", ";", "\t", "  |  "]) {
    const parsed = row(`P1 ${N}${separator}${E}`);
    assert.ok(parsed, `separator ${JSON.stringify(separator)} must be accepted`);
    assert.equal(parsed.easting, 522886.451);
  }
});

test("a zone-bearing row may also list the pair either way round", () => {
  const forward = row(`P1 37N ${E} ${N}`);
  assert.equal(forward.zone, 37);
  assert.equal(forward.easting, 522886.451);

  const reversed = row(`P1 37N ${N} ${E}`);
  assert.ok(reversed);
  assert.equal(reversed.zone, 37);
  assert.equal(reversed.easting, 522886.451, "the zone does not fix the column order");
});

// ---- refusing to guess ------------------------------------------------------

test("an ambiguous pair is refused rather than guessed", () => {
  // Two six-digit values could each be an easting, which happens near the
  // equator. Guessing would transpose the parcel by hundreds of kilometres, and
  // a refusal the user can see beats a plausible wrong answer.
  assert.equal(row("P1 522886.451 523100.000"), null);
});

test("a pair that cannot be projected coordinates at all is refused", () => {
  assert.equal(row("P1 21.769673 39.221367"), null, "geographic degrees are not a projected pair");
  assert.equal(row("P1 12 34"), null);
  assert.equal(row("P1 99 88888888888"), null);
});

test("rows that parse are kept and rows that do not are dropped", () => {
  const rows = parseProjectedSourceRows([
    { label: "P1", raw: `P1 ${N} ${E}` },
    { label: "P2", raw: "P2 nothing useful here" },
    { label: "P3", raw: `P3 ${E} ${N}` },
  ]);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map((r) => r.label), ["P1", "P3"]);
});

// ---- the conversion the document values feed -------------------------------

test("the parsed pair round-trips through the projection exactly", () => {
  // The point of reading the document's own numbers is that they are the
  // authority; the conversion must not move them.
  const parsed = row(`P1 ${N} ${E}`);
  const back = utmToWgs84(parsed.easting, parsed.northing, 37, "N");
  const again = wgs84ToUtm(back.lat, back.lon, { zone: 37, hemisphere: "N" });

  assert.ok(Math.abs(again.easting - parsed.easting) < 0.001, "easting must survive to the millimetre");
  assert.ok(Math.abs(again.northing - parsed.northing) < 0.001, "northing must survive to the millimetre");
});

test("the parcel's zone is derived correctly from its position", () => {
  assert.equal(utmZoneForPoint(21.769673436051665, 39.22136707084851), 37);
});

// ---- the document's own point numbers ---------------------------------------

import { sourcePointLabel } from "../src/lib/tools/fml-display-policy.ts";

test("a leading survey point number is kept", () => {
  // From a real Saudi survey report (تقرير مساحي معتمد, Jeddah): the point
  // number leads the row. The trailing pattern alone found nothing, so the
  // official numbers were replaced with P1..Pn and the table could no longer be
  // checked against the document -- the one thing somebody opening a survey
  // report wants to do.
  assert.equal(sourcePointLabel("23915169 39.22136707084851 E 21.769673436051665 N", 0), "23915169");
  assert.equal(sourcePointLabel("23915174 39.221640146864466 E 21.768977881645778 N", 5), "23915174");
});

test("a trailing reference still wins, as before", () => {
  assert.equal(sourcePointLabel("39.221367 E 21.769673 N 23915169", 0), "23915169");
});

test("a coordinate is never mistaken for a point number", () => {
  // A point number is a bare integer; a coordinate carries a decimal. Without
  // that distinction the longitude would become the label.
  assert.equal(sourcePointLabel("39.22136707084851 E 21.769673436051665 N", 0), "P1");
  assert.equal(sourcePointLabel("522886.451 2407349.790", 2), "P3");
});

test("a line label still takes precedence", () => {
  assert.equal(sourcePointLabel("LINE 12-13 522886.451 2407349.790", 0), "12-13");
});

test("a row with no identifier falls back to its position", () => {
  assert.equal(sourcePointLabel("no numbers here", 4), "P5");
});

// ---- which view opens first -------------------------------------------------

import { readFile } from "node:fs/promises";
const readSrc = (rel) => readFile(new URL(`../${rel}`, import.meta.url), "utf8");

test("a document written in degrees opens on the converted view", async () => {
  // A survey report is read to get working coordinates, and for a document in
  // decimal degrees those are the projected ones -- nobody sets out a boundary
  // from a decimal latitude.
  const source = await readSrc("src/components/tools/FindMyLand.tsx");
  assert.match(
    source,
    /if \(utmRows\.length > 0 && sourceProjectedRows\.length === 0\) return "utm";/,
    "geographic document plus an available projection must open on UTM",
  );
});

test("a document that already carries eastings stays on its own values", async () => {
  // Those ARE the working coordinates. Converting them to show something
  // "converted" would move the user further from the paper in their hand.
  const source = await readSrc("src/components/tools/FindMyLand.tsx");
  assert.match(source, /return "wgs84";/);
  assert.match(source, /sourceProjectedRows\.length === 0/, "the projected case is excluded by condition, not by accident");
});

test("the choice is derived, not written from an effect", async () => {
  // setState inside an effect re-renders the table twice per analysis and is
  // the cascading-render pattern this file otherwise avoids.
  const source = await readSrc("src/components/tools/FindMyLand.tsx");
  assert.match(source, /const coordinateView: "wgs84" \| "utm" = useMemo/);
  assert.doesNotMatch(source, /useEffect\([^)]*setCoordinateView/);
});

test("a click still pins the view, and the originals remain reachable", async () => {
  // Provenance is the point of a survey tool: the document's own numbers must
  // never become unreachable.
  const source = await readSrc("src/components/tools/FindMyLand.tsx");
  assert.match(source, /setCoordinateViewOverride\("wgs84"\)/);
  assert.match(source, /setCoordinateViewOverride\("utm"\)/);
  assert.match(source, /if \(coordinateViewOverride\) return coordinateViewOverride;/);
});
