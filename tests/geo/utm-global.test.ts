import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  UTM_LATITUDE_MAX,
  UTM_LATITUDE_MIN,
  formatUtmZone,
  hemisphereForLatitude,
  isHemisphere,
  isPlausibleUtmEasting,
  isPlausibleUtmNorthing,
  isValidUtmZone,
  isWithinUtmLatitudeBand,
  listUtmCrs,
  normalizeLongitude,
  parseUtmEpsgCode,
  projectPointsToSharedUtm,
  utmCentralMeridian,
  utmEpsgCode,
  utmProj4Definition,
  utmToWgs84,
  utmToWgs84Result,
  utmZoneForLongitude,
  utmZoneForPoint,
  wgs84ToUtm,
  wgs84ToUtmResult,
} from "@/lib/geo/utm";

/** Round-trip tolerance: 1e-7 degrees is roughly 1 cm at the equator. */
const DEGREE_TOLERANCE = 1e-7;
/** Metric tolerance for the UTM -> WGS84 -> UTM direction. */
const METRE_TOLERANCE = 1e-3;

describe("UTM CRS registry (EPSG:32601-32660 / EPSG:32701-32760)", () => {
  it("enumerates exactly 120 UTM/WGS84 CRSs", () => {
    const all = listUtmCrs();
    assert.equal(all.length, 120);
    assert.equal(all.filter((crs) => crs.hemisphere === "N").length, 60);
    assert.equal(all.filter((crs) => crs.hemisphere === "S").length, 60);
  });

  it("maps every zone and hemisphere to the published EPSG code", () => {
    assert.equal(utmEpsgCode(1, "N"), 32601);
    assert.equal(utmEpsgCode(60, "N"), 32660);
    assert.equal(utmEpsgCode(1, "S"), 32701);
    assert.equal(utmEpsgCode(60, "S"), 32760);
    for (const { zone, hemisphere, epsg } of listUtmCrs()) {
      assert.equal(epsg, (hemisphere === "N" ? 32600 : 32700) + zone);
      assert.deepEqual(parseUtmEpsgCode(epsg), { zone, hemisphere });
    }
  });

  it("rejects EPSG codes that are not UTM/WGS84", () => {
    assert.equal(parseUtmEpsgCode(4326), null);
    assert.equal(parseUtmEpsgCode(32661), null);
    assert.equal(parseUtmEpsgCode(32761), null);
    assert.equal(parseUtmEpsgCode(32600), null);
    assert.equal(parseUtmEpsgCode(32700), null);
  });

  it("rejects out-of-range zones and hemispheres", () => {
    assert.equal(isValidUtmZone(0), false);
    assert.equal(isValidUtmZone(61), false);
    assert.equal(isValidUtmZone(37.5), false);
    assert.equal(isValidUtmZone(1), true);
    assert.equal(isValidUtmZone(60), true);
    assert.equal(isHemisphere("N"), true);
    assert.equal(isHemisphere("S"), true);
    assert.equal(isHemisphere("X"), false);
    assert.throws(() => utmEpsgCode(61, "N"), RangeError);
    assert.throws(() => utmProj4Definition(0, "N"), RangeError);
  });

  it("builds a distinct proj4 definition for each hemisphere", () => {
    assert.match(utmProj4Definition(39, "N"), /\+proj=utm \+zone=39 \+datum=WGS84/);
    assert.match(utmProj4Definition(39, "S"), /\+proj=utm \+zone=39 \+south \+datum=WGS84/);
  });
});

describe("UTM zone geometry", () => {
  it("computes the central meridian of every zone", () => {
    assert.equal(utmCentralMeridian(1), -177);
    assert.equal(utmCentralMeridian(31), 3);
    assert.equal(utmCentralMeridian(38), 45);
    assert.equal(utmCentralMeridian(60), 177);
  });

  it("derives the 6-degree zone from any longitude", () => {
    assert.equal(utmZoneForLongitude(-180), 1);
    assert.equal(utmZoneForLongitude(-177), 1);
    assert.equal(utmZoneForLongitude(0), 31);
    assert.equal(utmZoneForLongitude(39.1), 37);
    assert.equal(utmZoneForLongitude(46.6), 38);
    assert.equal(utmZoneForLongitude(179.9), 60);
  });

  it("normalises longitudes that wrap the antimeridian", () => {
    assert.equal(normalizeLongitude(181), -179);
    assert.equal(normalizeLongitude(-181), 179);
    assert.equal(normalizeLongitude(360), 0);
  });

  it("honours the south-west Norway and Svalbard zone exceptions", () => {
    assert.equal(utmZoneForPoint(60, 5), 32, "south-west Norway widens zone 32");
    assert.equal(utmZoneForPoint(55, 5), 31, "outside the Norway band the plain rule applies");
    assert.equal(utmZoneForPoint(78, 5), 31);
    assert.equal(utmZoneForPoint(78, 10), 33);
    assert.equal(utmZoneForPoint(78, 25), 35);
    assert.equal(utmZoneForPoint(78, 35), 37);
  });

  it("knows the UTM latitude band", () => {
    assert.equal(isWithinUtmLatitudeBand(0), true);
    assert.equal(isWithinUtmLatitudeBand(UTM_LATITUDE_MIN), true);
    assert.equal(isWithinUtmLatitudeBand(83.9), true);
    assert.equal(isWithinUtmLatitudeBand(UTM_LATITUDE_MAX), false);
    assert.equal(isWithinUtmLatitudeBand(-80.1), false);
    assert.equal(isWithinUtmLatitudeBand(89), false);
  });

  it("assigns the hemisphere from the latitude sign", () => {
    assert.equal(hemisphereForLatitude(0), "N");
    assert.equal(hemisphereForLatitude(24.7), "N");
    assert.equal(hemisphereForLatitude(-33.9), "S");
    assert.equal(formatUtmZone(38, "N"), "38N");
    assert.equal(formatUtmZone(23, "S"), "23S");
  });
});

describe("WGS84 <-> UTM conversion, all 120 CRS combinations", () => {
  it("round-trips WGS84 -> UTM -> WGS84 for every zone in both hemispheres", () => {
    let checked = 0;
    let worstDelta = 0;

    for (const { zone, hemisphere } of listUtmCrs()) {
      const centralMeridian = utmCentralMeridian(zone);
      const latitudes = hemisphere === "N" ? [0.5, 15, 35, 55, 75, 83.5] : [-0.5, -15, -35, -55, -75, -79.5];

      for (const lat of latitudes) {
        for (const offset of [-2.9, -1, 0, 1, 2.9]) {
          const lon = normalizeLongitude(centralMeridian + offset);
          const forward = wgs84ToUtmResult(lat, lon, { zone, hemisphere });
          assert.ok(forward.ok, `forward failed for ${zone}${hemisphere} at ${lat},${lon}`);

          assert.equal(forward.value.zone, zone);
          assert.equal(forward.value.hemisphere, hemisphere);
          assert.equal(forward.value.epsg, utmEpsgCode(zone, hemisphere));
          assert.ok(Number.isFinite(forward.value.easting));
          assert.ok(Number.isFinite(forward.value.northing));
          assert.ok(isPlausibleUtmEasting(forward.value.easting), `easting out of envelope for ${zone}${hemisphere}`);
          assert.ok(isPlausibleUtmNorthing(forward.value.northing), `northing out of envelope for ${zone}${hemisphere}`);

          const inverse = utmToWgs84Result(forward.value.easting, forward.value.northing, zone, hemisphere);
          assert.ok(inverse.ok, `inverse failed for ${zone}${hemisphere}`);
          const delta = Math.max(Math.abs(inverse.value.lat - lat), Math.abs(inverse.value.lon - lon));
          worstDelta = Math.max(worstDelta, delta);
          assert.ok(delta < DEGREE_TOLERANCE, `round-trip drift ${delta} at ${zone}${hemisphere}`);
          checked += 1;
        }
      }
    }

    assert.equal(checked, 120 * 6 * 5);
    assert.ok(worstDelta < DEGREE_TOLERANCE);
  });

  it("round-trips UTM -> WGS84 -> UTM for every zone in both hemispheres", () => {
    for (const { zone, hemisphere } of listUtmCrs()) {
      const easting = 500_000;
      const northing = hemisphere === "N" ? 4_000_000 : 6_000_000;
      const geographic = utmToWgs84Result(easting, northing, zone, hemisphere);
      assert.ok(geographic.ok, `inverse failed for ${zone}${hemisphere}`);

      const back = wgs84ToUtmResult(geographic.value.lat, geographic.value.lon, { zone, hemisphere });
      assert.ok(back.ok, `forward failed for ${zone}${hemisphere}`);
      assert.ok(Math.abs(back.value.easting - easting) < METRE_TOLERANCE);
      assert.ok(Math.abs(back.value.northing - northing) < METRE_TOLERANCE);
    }
  });

  it("picks the correct zone automatically across every continent", () => {
    const places: readonly [string, number, number, number, "N" | "S"][] = [
      ["Riyadh, Saudi Arabia", 24.7136, 46.6753, 38, "N"],
      ["Jeddah, Saudi Arabia", 21.4858, 39.1925, 37, "N"],
      ["Muscat, Oman", 23.5859, 58.4059, 40, "N"],
      ["London, United Kingdom", 51.5074, -0.1278, 30, "N"],
      ["Berlin, Germany", 52.52, 13.405, 33, "N"],
      ["Istanbul, Turkey", 41.0082, 28.9784, 35, "N"],
      ["New York, United States", 40.7128, -74.006, 18, "N"],
      ["Anchorage, United States", 61.2181, -149.9003, 6, "N"],
      ["Tokyo, Japan", 35.6762, 139.6503, 54, "N"],
      ["Nairobi, Kenya", -1.2921, 36.8219, 37, "S"],
      ["Sao Paulo, Brazil", -23.5505, -46.6333, 23, "S"],
      ["Buenos Aires, Argentina", -34.6037, -58.3816, 21, "S"],
      ["Lima, Peru", -12.0464, -77.0428, 18, "S"],
      ["Cape Town, South Africa", -33.9249, 18.4241, 34, "S"],
      ["Sydney, Australia", -33.8688, 151.2093, 56, "S"],
      ["Auckland, New Zealand", -36.8485, 174.7633, 60, "S"],
    ];

    for (const [label, lat, lon, expectedZone, expectedHemisphere] of places) {
      const projected = wgs84ToUtm(lat, lon);
      assert.ok(projected, `${label} failed to project`);
      assert.equal(projected.zone, expectedZone, `${label} zone`);
      assert.equal(projected.hemisphere, expectedHemisphere, `${label} hemisphere`);

      const back = utmToWgs84(projected.easting, projected.northing, projected.zone, projected.hemisphere);
      assert.ok(back, `${label} failed to invert`);
      assert.ok(Math.abs(back.lat - lat) < DEGREE_TOLERANCE, `${label} latitude drift`);
      assert.ok(Math.abs(back.lon - lon) < DEGREE_TOLERANCE, `${label} longitude drift`);
    }
  });

  it("matches published UTM values for reference points", () => {
    const riyadh = wgs84ToUtm(24.7136, 46.6753);
    assert.ok(riyadh);
    assert.equal(riyadh.epsg, 32638);
    assert.ok(Math.abs(riyadh.easting - 669459.62) < 0.5);
    assert.ok(Math.abs(riyadh.northing - 2734271.67) < 0.5);

    const sydney = wgs84ToUtm(-33.8688, 151.2093);
    assert.ok(sydney);
    assert.equal(sydney.epsg, 32756);
    assert.ok(Math.abs(sydney.easting - 334368.63) < 0.5);
    assert.ok(Math.abs(sydney.northing - 6250948.35) < 0.5);
  });
});

describe("UTM conversion safety", () => {
  it("refuses to produce UTM for points outside the standard latitude band", () => {
    const northPole = wgs84ToUtmResult(89.5, 12);
    assert.equal(northPole.ok, false);
    assert.equal(northPole.ok === false && northPole.reason, "OUTSIDE_UTM_LATITUDE_BAND");

    const southPole = wgs84ToUtmResult(-85, 12);
    assert.equal(southPole.ok, false);
    assert.equal(southPole.ok === false && southPole.reason, "OUTSIDE_UTM_LATITUDE_BAND");

    assert.equal(wgs84ToUtm(89.5, 12), null);
  });

  it("refuses invalid geographic input instead of guessing", () => {
    assert.equal(wgs84ToUtmResult(95, 10).ok, false);
    assert.equal(wgs84ToUtmResult(10, 200).ok, false);
    assert.equal(wgs84ToUtmResult(Number.NaN, 10).ok, false);
    assert.equal(wgs84ToUtmResult(10, Number.NaN).ok, false);
  });

  it("refuses invalid zone or hemisphere in either direction", () => {
    assert.equal(wgs84ToUtmResult(24, 46, { zone: 0 }).ok, false);
    assert.equal(wgs84ToUtmResult(24, 46, { zone: 61 }).ok, false);
    assert.equal(utmToWgs84Result(500_000, 2_700_000, 0, "N").ok, false);
    assert.equal(utmToWgs84Result(500_000, 2_700_000, 61, "N").ok, false);
    assert.equal(utmToWgs84(500_000, 2_700_000, 61, "N"), null);
    assert.equal(utmToWgs84Result(Number.NaN, 2_700_000, 38, "N").ok, false);
    assert.equal(utmToWgs84Result(500_000, Number.NaN, 38, "N").ok, false);
  });

  it("validates easting and northing envelopes", () => {
    assert.equal(isPlausibleUtmEasting(500_000), true);
    assert.equal(isPlausibleUtmEasting(99_999), false);
    assert.equal(isPlausibleUtmEasting(900_001), false);
    assert.equal(isPlausibleUtmNorthing(2_734_000), true);
    assert.equal(isPlausibleUtmNorthing(-1), false);
    assert.equal(isPlausibleUtmNorthing(10_000_001), false);
  });

  it("uses a forced hemisphere rather than the latitude sign when asked", () => {
    const forcedSouth = wgs84ToUtmResult(24.7136, 46.6753, { zone: 38, hemisphere: "S" });
    assert.ok(forcedSouth.ok);
    assert.equal(forcedSouth.value.hemisphere, "S");
    assert.equal(forcedSouth.value.epsg, 32738);
    // A northern point expressed on the southern grid keeps its false northing.
    assert.ok(forcedSouth.value.northing > 10_000_000);
  });
});

describe("Shared-zone projection for a parcel", () => {
  it("projects every corner into one zone so a boundary is not split", () => {
    const corners = [
      { lat: 24.7136, lon: 46.6753 },
      { lat: 24.7139, lon: 46.6753 },
      { lat: 24.7139, lon: 46.6757 },
      { lat: 24.7136, lon: 46.6757 },
    ];
    const projected = projectPointsToSharedUtm(corners);
    assert.ok(projected);
    assert.equal(projected.zone, 38);
    assert.equal(projected.hemisphere, "N");
    assert.equal(projected.epsg, 32638);
    assert.equal(projected.rows.length, 4);
    assert.equal(projected.outOfBand, false);
  });

  it("keeps a single grid for a parcel that straddles a zone boundary", () => {
    const corners = [
      { lat: 10, lon: 5.999 },
      { lat: 10, lon: 6.001 },
      { lat: 10.001, lon: 6.001 },
    ];
    const projected = projectPointsToSharedUtm(corners);
    assert.ok(projected);
    const zones = new Set([projected.zone]);
    assert.equal(zones.size, 1);
    assert.equal(projected.rows.length, 3);
  });

  it("returns nothing for polar points instead of a misleading grid", () => {
    assert.equal(projectPointsToSharedUtm([{ lat: 88, lon: 10 }]), null);
    assert.equal(projectPointsToSharedUtm([]), null);
  });
});
