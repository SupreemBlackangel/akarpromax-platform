import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatDms,
  formatWgs84Value,
  isValidLatLon,
  isValidLatitudeValue,
  isValidLongitudeValue,
  parseDecimalLatLon,
  parseDecimalLatLonDetailed,
  parseDmsLatLon,
  parseHemisphereDecimalLatLon,
  resolveDecimalPair,
} from "@/lib/geo/coordinate-parsing";
import { extractCoordinateEvidence, hasCoordinateTableHeading } from "@/lib/geo/evidence-extraction";

const TOLERANCE = 1e-9;

function closeTo(actual: number, expected: number, tolerance = TOLERANCE): boolean {
  return Math.abs(actual - expected) < tolerance;
}

describe("WGS84 range validation", () => {
  it("accepts the full global latitude and longitude ranges", () => {
    assert.equal(isValidLatitudeValue(-90), true);
    assert.equal(isValidLatitudeValue(90), true);
    assert.equal(isValidLatitudeValue(-90.0001), false);
    assert.equal(isValidLatitudeValue(90.0001), false);
    assert.equal(isValidLongitudeValue(-180), true);
    assert.equal(isValidLongitudeValue(180), true);
    assert.equal(isValidLongitudeValue(-180.0001), false);
    assert.equal(isValidLongitudeValue(180.0001), false);
    assert.equal(isValidLatitudeValue(Number.NaN), false);
    assert.equal(isValidLatLon({ lat: -33.8688, lon: 151.2093 }), true);
  });
});

describe("Decimal degrees parsing", () => {
  it("parses a plain latitude/longitude pair", () => {
    const point = parseDecimalLatLon("21.543333, 39.172778");
    assert.ok(point);
    assert.ok(closeTo(point.lat, 21.543333));
    assert.ok(closeTo(point.lon, 39.172778));
  });

  it("parses negative values in both hemispheres", () => {
    const southWest = parseDecimalLatLon("-34.603700, -58.381600");
    assert.ok(southWest);
    assert.ok(closeTo(southWest.lat, -34.6037));
    assert.ok(closeTo(southWest.lon, -58.3816));
  });

  it("parses longitudes beyond 99 degrees", () => {
    const sydney = parseDecimalLatLon("-33.868800 151.209300");
    assert.ok(sydney);
    assert.ok(closeTo(sydney.lat, -33.8688));
    assert.ok(closeTo(sydney.lon, 151.2093));
  });

  it("detects a longitude-first column order from an impossible latitude", () => {
    const parsed = parseDecimalLatLonDetailed("151.209300 -33.868800");
    assert.ok(parsed);
    assert.equal(parsed.order, "LON_LAT");
    assert.equal(parsed.ambiguous, false);
    assert.ok(closeTo(parsed.lat, -33.8688));
    assert.ok(closeTo(parsed.lon, 151.2093));
  });

  it("keeps the source order and flags ambiguity when both values could be a latitude", () => {
    const parsed = parseDecimalLatLonDetailed("24.713600 46.675300");
    assert.ok(parsed);
    assert.equal(parsed.order, "LAT_LON");
    assert.equal(parsed.ambiguous, true);
  });

  it("resolves an explicit pair without inventing a reading", () => {
    assert.equal(resolveDecimalPair(200, 300), null);
    assert.equal(resolveDecimalPair(Number.NaN, 10), null);

    const lonFirst = resolveDecimalPair(120.5, 30.25);
    assert.ok(lonFirst);
    assert.equal(lonFirst.order, "LON_LAT");
    assert.equal(lonFirst.lat, 30.25);
    assert.equal(lonFirst.lon, 120.5);
  });

  it("rejects a pair where no value can be a latitude", () => {
    assert.equal(parseDecimalLatLon("120.500000 175.250000"), null);
  });
});

describe("DMS parsing", () => {
  it("parses the documented Saudi example", () => {
    const point = parseDmsLatLon(`21°32'36"N 39°10'22"E`);
    assert.ok(point);
    assert.ok(closeTo(point.lat, 21 + 32 / 60 + 36 / 3600));
    assert.ok(closeTo(point.lon, 39 + 10 / 60 + 22 / 3600));
  });

  it("applies S and W as negative", () => {
    const point = parseDmsLatLon(`33°52'07"S 151°12'33"W`);
    assert.ok(point);
    assert.ok(point.lat < 0);
    assert.ok(point.lon < 0);
    assert.ok(closeTo(point.lat, -(33 + 52 / 60 + 7 / 3600)));
    assert.ok(closeTo(point.lon, -(151 + 12 / 60 + 33 / 3600)));
  });

  it("parses three-digit longitudes", () => {
    const point = parseDmsLatLon(`35°40'34"N 139°39'01"E`);
    assert.ok(point);
    assert.ok(closeTo(point.lon, 139 + 39 / 60 + 1 / 3600));
  });

  it("accepts a hemisphere letter before the value", () => {
    const point = parseDmsLatLon(`N 21°32'36" E 39°10'22"`);
    assert.ok(point);
    assert.ok(closeTo(point.lat, 21 + 32 / 60 + 36 / 3600));
    assert.ok(closeTo(point.lon, 39 + 10 / 60 + 22 / 3600));
  });

  it("accepts degrees and minutes without seconds", () => {
    const point = parseDmsLatLon(`24°42'N 46°43'E`);
    assert.ok(point);
    assert.ok(closeTo(point.lat, 24 + 42 / 60));
    assert.ok(closeTo(point.lon, 46 + 43 / 60));
  });

  it("parses a symbol-free DMS row", () => {
    const point = parseDmsLatLon("21 32 36 N 39 10 22 E");
    assert.ok(point);
    assert.ok(closeTo(point.lat, 21 + 32 / 60 + 36 / 3600));
    assert.ok(closeTo(point.lon, 39 + 10 / 60 + 22 / 3600));
  });

  it("requires both a latitude and a longitude component", () => {
    assert.equal(parseDmsLatLon(`21°32'36"N`), null);
    assert.equal(parseDmsLatLon("just some text"), null);
  });

  it("rejects out-of-range minutes and seconds", () => {
    assert.equal(parseDmsLatLon(`21°75'36"N 39°10'22"E`), null);
  });

  it("round-trips through the DMS formatter", () => {
    const formatted = `${formatDms(21.543333, "lat")} ${formatDms(39.172778, "lon")}`;
    const point = parseDmsLatLon(formatted);
    assert.ok(point);
    assert.ok(closeTo(point.lat, 21.543333, 1e-5));
    assert.ok(closeTo(point.lon, 39.172778, 1e-5));

    assert.equal(formatDms(-33.8688, "lat").endsWith("S"), true);
    assert.equal(formatDms(-58.3816, "lon").endsWith("W"), true);
  });
});

describe("Hemisphere-tagged decimals", () => {
  it("parses either column order", () => {
    const latFirst = parseHemisphereDecimalLatLon("N 21.885762 E 39.205920");
    assert.ok(latFirst);
    assert.ok(closeTo(latFirst.lat, 21.885762));
    assert.ok(closeTo(latFirst.lon, 39.20592));

    const lonFirst = parseHemisphereDecimalLatLon("39.205920 E 21.885762 N");
    assert.ok(lonFirst);
    assert.ok(closeTo(lonFirst.lat, 21.885762));
    assert.ok(closeTo(lonFirst.lon, 39.20592));
  });

  it("applies southern and western hemispheres", () => {
    const point = parseHemisphereDecimalLatLon("S 33.868800 W 58.381600");
    assert.ok(point);
    assert.ok(closeTo(point.lat, -33.8688));
    assert.ok(closeTo(point.lon, -58.3816));
  });
});

describe("Precision preservation", () => {
  it("keeps full stored precision when formatting for export", () => {
    assert.equal(formatWgs84Value(24.713612345678), "24.713612345678");
    assert.equal(formatWgs84Value(46.5), "46.5");
    assert.equal(formatWgs84Value(-0.1278), "-0.1278");
    assert.equal(formatWgs84Value(Number.NaN), "");
  });

  it("does not lose digits through a parse/format cycle", () => {
    const raw = "21.885762907392 39.205920667411";
    const point = parseDecimalLatLon(raw);
    assert.ok(point);
    assert.equal(formatWgs84Value(point.lat), "21.885762907392");
    assert.equal(formatWgs84Value(point.lon), "39.205920667411");
  });
});

describe("Coordinate table headings", () => {
  it("recognises English and Arabic column headings", () => {
    for (const heading of [
      "LINE NORTHING EASTING DIST (m)",
      "Point Easting Northing",
      "Latitude Longitude",
      "Vertex Coordinates",
      "الشرقيات الشماليات",
      "خط الطول خط العرض",
      "رقم النقطة الإحداثيات",
    ]) {
      assert.equal(hasCoordinateTableHeading(heading), true, heading);
    }
  });

  it("does not treat ordinary prose as a coordinate table", () => {
    assert.equal(hasCoordinateTableHeading("Budget ratios and milestone values"), false);
    assert.equal(hasCoordinateTableHeading("نطاق العمل لمشروع تطوير عقاري"), false);
  });
});

describe("Global coordinate evidence extraction", () => {
  it("extracts one DMS row per boundary corner instead of a single point", () => {
    const text = [
      `P1 21°32'36"N 39°10'22"E`,
      `P2 21°32'38"N 39°10'22"E`,
      `P3 21°32'38"N 39°10'25"E`,
    ].join("\n");
    const evidence = extractCoordinateEvidence(text).filter((item) => item.format === "dms");
    assert.equal(evidence.length, 3);
    assert.ok(closeTo(evidence[0].point!.lat, 21 + 32 / 60 + 36 / 3600));
    assert.ok(closeTo(evidence[2].point!.lon, 39 + 10 / 60 + 25 / 3600));
  });

  it("extracts southern-hemisphere DMS rows", () => {
    const text = `A 33°52'07"S 151°12'33"E  B 33°52'09"S 151°12'33"E`;
    const evidence = extractCoordinateEvidence(text).filter((item) => item.format === "dms");
    assert.equal(evidence.length, 2);
    assert.ok(evidence.every((item) => item.point!.lat < 0));
    assert.ok(evidence.every((item) => item.point!.lon > 151));
  });
});
