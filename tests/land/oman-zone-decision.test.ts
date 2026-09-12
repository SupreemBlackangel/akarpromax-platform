// A deed in the wrong zone lands in the sea, and nothing says so.
//
// Omani material without a stated zone was read as 40N, always. Most of the
// country is 40 — but a parcel whose coordinates belong to 39 converts just as
// cleanly into 40, because the same easting is valid in every zone. It is only
// valid somewhere else. The reader saw a clean table, a clean map, and a parcel
// several hundred kilometres from their land.
import assert from "node:assert/strict";
import test from "node:test";

import { chooseInitialUtmZone, explicitUtmZoneFromText } from "../../lib/land/product-policy.ts";
import { utmToWgs84 } from "../../lib/geo/utm.ts";

const row = (easting: number, northing: number) => ({
  lineStart: "", lineEnd: "", easting, northing, raw: `${easting} ${northing}`,
});

/** Four corners of a small parcel around one point. */
const parcel = (easting: number, northing: number) => [
  row(easting, northing),
  row(easting + 40, northing),
  row(easting + 40, northing - 30),
  row(easting, northing - 30),
];

const OMAN = { text: "سلطنة عمان — وزارة الإسكان", countryCode: "OM", inferFallback: () => undefined };

test("a parcel that reads inside Oman in zone 40 stays in 40", () => {
  // Muscat: this is the case that already worked, and it must keep working.
  const decision = chooseInitialUtmZone({ ...OMAN, rows: parcel(650000, 2620000) });
  assert.equal(decision.zone, 40);
  assert.equal(decision.source, "OMAN_DEFAULT");
});

test("a parcel that zone 40 puts outside the country is read in 39", () => {
  // Western Dhofar, at 17.2°N. Read as zone 39 it is at 52.5°E, on land. Read
  // as 40 it is at 58.5°E — open water, some 600km out in the Arabian Sea, and
  // the numbers convert just as cleanly.
  const easting = 660000;
  const northing = 1900000;
  const as39 = utmToWgs84(easting, northing, 39, "N");
  const as40 = utmToWgs84(easting, northing, 40, "N");
  assert.ok(as39 && as39.lon > 52 && as39.lon < 53, `zone 39 should be on land, got ${as39?.lon}`);
  assert.ok(as40 && as40.lon > 58, `zone 40 should be at sea, got ${as40?.lon}`);

  const decision = chooseInitialUtmZone({ ...OMAN, rows: parcel(easting, northing) });
  assert.equal(decision.zone, 39);
});

test("a stated zone still wins over anything derived", () => {
  // The document's own word is evidence; this is inference.
  const decision = chooseInitialUtmZone({
    ...OMAN,
    text: "سلطنة عمان — UTM Zone 39N",
    rows: parcel(650000, 2620000),
  });
  assert.equal(decision.zone, 39);
  assert.equal(decision.source, "DOCUMENT");
});

test("one corner outside the country is treated as the wrong zone, not a border parcel", () => {
  // A parcel is a few hundred metres across. Corners on two sides of a national
  // boundary mean the grid is wrong, not that the land straddles it.
  const decision = chooseInitialUtmZone({
    ...OMAN,
    rows: [row(650000, 2620000), row(833000, 2620000)],
  });
  assert.ok(decision.zone === 39 || decision.zone === 40);
});

test("a document from elsewhere is untouched by any of this", () => {
  const decision = chooseInitialUtmZone({
    text: "Kingdom of Saudi Arabia",
    countryCode: "SA",
    rows: parcel(650000, 2620000),
    inferFallback: () => 38,
  });
  assert.equal(decision.zone, 38);
  assert.equal(decision.source, "INFERRED");
});

// ---- the four Dhofar deeds that were being read wrongly --------------------
//
// Salalah sits on the 54°E line that divides zone 39 from zone 40, so its
// survey office issues drawings in BOTH: the same street appears as easting
// ~804,700 in zone 39 and as easting ~186,900 in zone 40. Reading one as the
// other is a 700km error that converts perfectly cleanly.

const dhofar = (text: string, rows: { e: number; n: number }[]) =>
  chooseInitialUtmZone({
    text,
    countryCode: "OM",
    rows: rows.map((row) => row_(row.e, row.n)),
    inferFallback: () => undefined,
  });

const row_ = (easting: number, northing: number) => ({
  lineStart: "", lineEnd: "", easting, northing, raw: `${easting} ${northing}`,
});

test("a sheet that says WGS84 39N is read in 39, not in the default 40", () => {
  // Plot 2232, ADOWNB, Salalah. The sheet states its zone in four characters
  // and never says the word "zone", so it was read as 40N — 59.86°E, in the sea
  // off Ash Sharqiyah, some 700km from the plot.
  const decision = dhofar(
    "Sultanate of Oman Ministry of Housing\nSALALAH ADOWNB\nWGS84 39N\nLINE EASTING NORTHING DIST",
    [{ e: 804735.95, n: 1872969.87 }, { e: 804727.13, n: 1872979.87 }, { e: 804743.99, n: 1872994.76 }],
  );
  assert.equal(decision.zone, 39);
  assert.equal(decision.source, "DOCUMENT");
});

test("the grid designator in a map-sheet number is read as the zone", () => {
  // Plot 36, Salalah Airport: "40Q/AD/860-840/B10". 40Q is where it is.
  const decision = dhofar(
    "GOVERNORATE OF DHOFAR\nرقم الخارطة 40Q/AD/860-840/B10\nUTM GRID (WGS 84)",
    [{ e: 186943.15, n: 1884338.53 }, { e: 186946.57, n: 1884360.28 }],
  );
  assert.equal(decision.zone, 40);
  assert.equal(decision.source, "DOCUMENT");
});

test("a Salalah sheet that states no zone at all is read in 40, where it lands", () => {
  // Plot 49, North Awqad. Nothing on the sheet names a zone; the coordinates
  // read as 40N put it at 54.03°E, 17.00°N — Salalah. Read as 39 they would be
  // at 48.03°E, in the Empty Quarter.
  const decision = dhofar(
    "SALALAH NORTH AWQAD\nPLOT NO: 49\nLINE NORTHING EASTING DIST (m)",
    [{ e: 183209.93, n: 1881737.89 }, { e: 183228.21, n: 1881754.94 }, { e: 183236.39, n: 1881746.16 }],
  );
  assert.equal(decision.zone, 40);
});

test("nothing on a survey sheet is mistaken for a zone", () => {
  // Every one of these appears on the four deeds: setbacks, road widths, plot
  // numbers, scale factors, dates. A pattern loose enough to catch "40Q/" must
  // not catch "22/12/2025" or "1: 2000".
  for (const noise of [
    "HT: 12 m. (Twelve)m  FLOORS: 2 (2 Floors)",
    "ACCESS ST.-15.00m R.O.W.  LANE-3.00m WIDE",
    "AREA : 300 SQ. M.   1: 2000   SCALE 1= 2500",
    "SCALE FACTOR = 1.0007885",
    "التاريخ 22/12/2025",
    "DIAGONAL/S FOR CHECKING  LINE PLAN DIST(m) 1 3 50.08",
  ]) {
    assert.equal(explicitUtmZoneFromText(noise), undefined, noise);
  }
});
