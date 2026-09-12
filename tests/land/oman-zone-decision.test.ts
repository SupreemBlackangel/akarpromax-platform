// A deed in the wrong zone lands in the sea, and nothing says so.
//
// Omani material without a stated zone was read as 40N, always. Most of the
// country is 40 — but a parcel whose coordinates belong to 39 converts just as
// cleanly into 40, because the same easting is valid in every zone. It is only
// valid somewhere else. The reader saw a clean table, a clean map, and a parcel
// several hundred kilometres from their land.
import assert from "node:assert/strict";
import test from "node:test";

import { chooseInitialUtmZone } from "../../lib/land/product-policy.ts";
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
