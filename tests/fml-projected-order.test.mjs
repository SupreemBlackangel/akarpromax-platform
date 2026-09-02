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
