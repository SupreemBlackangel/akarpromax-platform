import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveLandDocument } from "@/lib/land/intelligence/resolver";
import { adapterForCountry, UNKNOWN_COUNTRY_ADAPTER } from "@/lib/land/intelligence/adapters";
import {
  listUtmCrs,
  utmCentralMeridian,
  utmEpsgCode,
  wgs84ToUtm,
  type Hemisphere,
} from "@/lib/geo/utm";

const COORDINATE_TOLERANCE = 1e-5;

function metadata(nativeText: string, fileName = "global-case.pdf") {
  return {
    fileName,
    mimeType: "application/pdf",
    sizeBytes: Math.max(1024, nativeText.length),
    nativeText,
  };
}

/** A small rectangular parcel around a point, in source order P1..P4. */
function parcelCorners(lat: number, lon: number) {
  const dLat = 0.0003;
  const dLon = 0.0004;
  return [
    { lat, lon },
    { lat: lat + dLat, lon },
    { lat: lat + dLat, lon: lon + dLon },
    { lat, lon: lon + dLon },
  ];
}

function wgs84Document(label: string, lat: number, lon: number): string {
  const rows = parcelCorners(lat, lon).map((point, index) => {
    const latText = `${Math.abs(point.lat).toFixed(6)} ${point.lat < 0 ? "S" : "N"}`;
    const lonText = `${Math.abs(point.lon).toFixed(6)} ${point.lon < 0 ? "W" : "E"}`;
    return `P${index + 1} ${latText} ${lonText}`;
  });
  return [
    `LAND SURVEY REPORT - ${label}`,
    "Coordinate Reference System: WGS84",
    "Boundary coordinates",
    ...rows,
  ].join("\n");
}

function utmDocument(zone: number, hemisphere: Hemisphere, lat: number, lon: number): string {
  const rows = parcelCorners(lat, lon).map((point, index) => {
    const projected = wgs84ToUtm(point.lat, point.lon, { zone, hemisphere });
    assert.ok(projected, `could not build a UTM row for zone ${zone}${hemisphere}`);
    return `P${index + 1} ${zone}${hemisphere} ${projected.easting.toFixed(3)} ${projected.northing.toFixed(3)}`;
  });
  return [
    "CADASTRAL SURVEY - PARCEL BOUNDARY",
    `Coordinate Reference System: UTM Zone ${zone}${hemisphere}`,
    ...rows,
  ].join("\n");
}

/** A representative point safely inside a given zone and hemisphere. */
function sampleForZone(zone: number, hemisphere: Hemisphere): { lat: number; lon: number } {
  return { lat: hemisphere === "N" ? 30.5 : -30.5, lon: utmCentralMeridian(zone) };
}

describe("Find My Land worldwide WGS84 documents", () => {
  const places: readonly [string, number, number][] = [
    ["Riyadh, Saudi Arabia", 24.7136, 46.6753],
    ["Jeddah, Saudi Arabia", 21.4858, 39.1925],
    ["Madrid, Spain", 40.4168, -3.7038],
    ["Berlin, Germany", 52.52, 13.405],
    ["Denver, United States", 39.7392, -104.9903],
    ["Bogota, Colombia", 4.711, -74.0721],
    ["Sao Paulo, Brazil", -23.5505, -46.6333],
    ["Buenos Aires, Argentina", -34.6037, -58.3816],
    ["Cape Town, South Africa", -33.9249, 18.4241],
    ["Perth, Australia", -31.9523, 115.8613],
    ["Auckland, New Zealand", -36.8485, 174.7633],
    ["Tokyo, Japan", 35.6762, 139.6503],
  ];

  for (const [label, lat, lon] of places) {
    it(`resolves a WGS84 parcel in ${label}`, async () => {
      const result = await resolveLandDocument({ metadata: metadata(wgs84Document(label, lat, lon)) });

      assert.equal(result.status, "RESOLVED_EXPLICIT_COORDINATES");
      assert.equal(result.evidence.coordinatePairs.length, 4);
      assert.equal(result.geometry?.type, "polygon");

      const expected = parcelCorners(lat, lon);
      for (let index = 0; index < expected.length; index += 1) {
        const actual = result.evidence.coordinatePairs[index];
        assert.ok(
          Math.abs(actual.lat - expected[index].lat) < COORDINATE_TOLERANCE,
          `${label} P${index + 1} latitude drifted`,
        );
        assert.ok(
          Math.abs(actual.lon - expected[index].lon) < COORDINATE_TOLERANCE,
          `${label} P${index + 1} longitude drifted`,
        );
      }
    });
  }

  it("keeps a negative latitude negative rather than mirroring it north", async () => {
    const result = await resolveLandDocument({
      metadata: metadata(wgs84Document("Southern hemisphere", -33.8688, 151.2093)),
    });
    assert.ok(result.evidence.coordinatePairs.every((point) => point.lat < 0));
    assert.ok(result.evidence.coordinatePairs.every((point) => point.lon > 151));
  });

  it("keeps a negative longitude negative in the western hemisphere", async () => {
    const result = await resolveLandDocument({
      metadata: metadata(wgs84Document("Western hemisphere", 40.7128, -74.006)),
    });
    assert.ok(result.evidence.coordinatePairs.every((point) => point.lon < -73));
  });
});

describe("Find My Land UTM documents, zones 1-60 north and south", () => {
  const northSpotChecks = [1, 10, 20, 30, 32, 37, 38, 39, 40, 50, 60];
  const southSpotChecks = [18, 21, 23, 33, 36, 48, 55];

  for (const zone of northSpotChecks) {
    it(`converts an explicit UTM zone ${zone}N document to WGS84`, async () => {
      const { lat, lon } = sampleForZone(zone, "N");
      const result = await resolveLandDocument({ metadata: metadata(utmDocument(zone, "N", lat, lon)) });

      assert.equal(result.status, "RESOLVED_EXPLICIT_COORDINATES");
      assert.equal(result.evidence.coordinatePairs.length, 4);
      assert.equal(result.crsSelection?.zone, zone);
      assert.equal(result.crsSelection?.hemisphere, "N");
      assert.equal(result.crsSelection?.epsg, utmEpsgCode(zone, "N"));
      assert.ok(result.evidence.coordinatePairs.every((point) => point.lat > 0));
    });
  }

  for (const zone of southSpotChecks) {
    it(`converts an explicit UTM zone ${zone}S document to WGS84`, async () => {
      const { lat, lon } = sampleForZone(zone, "S");
      const result = await resolveLandDocument({ metadata: metadata(utmDocument(zone, "S", lat, lon)) });

      assert.equal(result.status, "RESOLVED_EXPLICIT_COORDINATES");
      assert.equal(result.evidence.coordinatePairs.length, 4);
      assert.equal(result.crsSelection?.zone, zone);
      assert.equal(result.crsSelection?.hemisphere, "S");
      assert.equal(result.crsSelection?.epsg, utmEpsgCode(zone, "S"));
      assert.ok(
        result.evidence.coordinatePairs.every((point) => point.lat < 0),
        `zone ${zone}S produced a northern latitude`,
      );
    });
  }

  it("sweeps all 120 UTM CRSs through the document pipeline without drift", async () => {
    let checked = 0;
    for (const { zone, hemisphere } of listUtmCrs()) {
      const { lat, lon } = sampleForZone(zone, hemisphere);
      const expected = parcelCorners(lat, lon);
      const result = await resolveLandDocument({
        metadata: metadata(utmDocument(zone, hemisphere, lat, lon)),
      });

      assert.equal(
        result.evidence.coordinatePairs.length,
        4,
        `zone ${zone}${hemisphere} did not yield four boundary points`,
      );
      assert.equal(result.crsSelection?.zone, zone, `zone ${zone}${hemisphere} zone mismatch`);
      assert.equal(
        result.crsSelection?.hemisphere,
        hemisphere,
        `zone ${zone}${hemisphere} hemisphere mismatch`,
      );

      for (let index = 0; index < expected.length; index += 1) {
        const actual = result.evidence.coordinatePairs[index];
        assert.ok(
          Math.abs(actual.lat - expected[index].lat) < 1e-4,
          `zone ${zone}${hemisphere} P${index + 1} latitude drifted`,
        );
        assert.ok(
          Math.abs(actual.lon - expected[index].lon) < 1e-4,
          `zone ${zone}${hemisphere} P${index + 1} longitude drifted`,
        );
      }
      checked += 1;
    }
    assert.equal(checked, 120);
  });
});

describe("Find My Land CRS declarations", () => {
  it("reads a northern EPSG code as the zone and hemisphere", async () => {
    const { lat, lon } = sampleForZone(33, "N");
    const rows = parcelCorners(lat, lon).map((point, index) => {
      const projected = wgs84ToUtm(point.lat, point.lon, { zone: 33, hemisphere: "N" })!;
      return `${index + 1} ${projected.northing.toFixed(2)} ${projected.easting.toFixed(2)}`;
    });
    const text = [
      "CADASTRAL SURVEY",
      "CRS: EPSG:32633",
      "LINE NORTHING EASTING",
      ...rows.map((row, index) => `${index + 1} ${index + 2} ${row.split(" ").slice(1).join(" ")}`),
    ].join("\n");

    const result = await resolveLandDocument({ metadata: metadata(text) });
    assert.equal(result.crsSelection?.zone, 33);
    assert.equal(result.crsSelection?.hemisphere, "N");
    assert.equal(result.crsSelection?.epsg, 32633);
  });

  it("reads a southern EPSG code as the southern hemisphere", async () => {
    const { lat, lon } = sampleForZone(36, "S");
    const rows = parcelCorners(lat, lon).map((point, index) => {
      const projected = wgs84ToUtm(point.lat, point.lon, { zone: 36, hemisphere: "S" })!;
      return `${index + 1} ${index + 2} ${projected.northing.toFixed(2)} ${projected.easting.toFixed(2)}`;
    });
    const text = ["CADASTRAL SURVEY", "CRS: EPSG:32736", "LINE NORTHING EASTING", ...rows].join("\n");

    const result = await resolveLandDocument({ metadata: metadata(text) });
    assert.equal(result.crsSelection?.zone, 36);
    assert.equal(result.crsSelection?.hemisphere, "S");
    assert.equal(result.crsSelection?.epsg, 32736);
    assert.equal(result.evidence.coordinatePairs.length, 4);
    assert.ok(result.evidence.coordinatePairs.every((point) => point.lat < 0));
  });

  it("reads `UTM Zone 39N` written as prose", async () => {
    const { lat, lon } = sampleForZone(39, "N");
    const result = await resolveLandDocument({ metadata: metadata(utmDocument(39, "N", lat, lon)) });
    assert.equal(result.crsSelection?.zone, 39);
    assert.equal(result.crsSelection?.hemisphere, "N");
  });
});

describe("Find My Land refuses to guess a UTM zone", () => {
  const zoneLessText = [
    "LAND SURVEY - COORDINATE TABLE",
    "LINE NORTHING EASTING DIST (m)",
    "1 2 2533105.07 559322.22 20.00",
    "2 3 2533124.65 559326.26 30.00",
    "3 4 2533118.59 559355.64 20.00",
    "4 1 2533099.00 559351.60 30.00",
  ].join("\n");

  it("asks for a zone instead of assuming any regional default", async () => {
    const pending = await resolveLandDocument({ metadata: metadata(zoneLessText) });
    assert.equal(pending.crsSelection?.required, true);
    assert.equal(pending.crsSelection?.zone, undefined);
    assert.equal(pending.evidence.coordinatePairs.length, 0);
    assert.equal(pending.geometry, undefined);
    assert.equal(pending.strategy?.path, "UTM_ZONE_SELECTION_REQUIRED");
  });

  it("converts once the user supplies any zone from 1 to 60, north or south", async () => {
    for (const [zone, hemisphere] of [[1, "N"], [23, "S"], [40, "N"], [55, "S"], [60, "N"]] as const) {
      const selected = await resolveLandDocument({
        metadata: metadata(zoneLessText),
        utmZone: zone,
        utmHemisphere: hemisphere,
      });
      assert.equal(selected.crsSelection?.source, "USER", `zone ${zone}${hemisphere}`);
      assert.equal(selected.crsSelection?.zone, zone);
      assert.equal(selected.crsSelection?.hemisphere, hemisphere);
      assert.equal(selected.crsSelection?.epsg, utmEpsgCode(zone, hemisphere));
      assert.equal(selected.evidence.coordinatePairs.length, 4);
      assert.equal(selected.strategy?.path, "USER_SELECTED_UTM_ZONE");
    }
  });

  it("rejects a zone outside 1-60 and keeps asking", async () => {
    for (const zone of [0, 61, 99, -1, 37.5]) {
      const result = await resolveLandDocument({
        metadata: metadata(zoneLessText),
        utmZone: zone,
      });
      assert.equal(result.crsSelection?.required, true, `zone ${zone} should not be accepted`);
      assert.equal(result.evidence.coordinatePairs.length, 0);
    }
  });

  it("has no Saudi or Gulf default adapter for an unidentified document", () => {
    assert.equal(adapterForCountry(undefined).countryCode, "UNKNOWN");
    assert.equal(adapterForCountry(undefined).bounds, undefined);
    assert.equal(UNKNOWN_COUNTRY_ADAPTER.bounds, undefined);
    // A neutral adapter must not constrain any point on Earth.
    for (const point of [
      { lat: -33.8688, lon: 151.2093 },
      { lat: 64.1466, lon: -21.9426 },
      { lat: -54.8, lon: -68.3 },
    ]) {
      assert.equal(UNKNOWN_COUNTRY_ADAPTER.isPlausiblePoint(point), true);
    }
  });

  it("infers a zone only when the document's country leaves exactly one option", async () => {
    // Qatar spans a single UTM zone, so the inference is unambiguous.
    const rows = parcelCorners(25.2854, 51.531).map((point, index) => {
      const projected = wgs84ToUtm(point.lat, point.lon, { zone: 39, hemisphere: "N" })!;
      return `${index + 1} ${index + 2} ${projected.northing.toFixed(2)} ${projected.easting.toFixed(2)} 30.00`;
    });
    const text = ["LAND SURVEY", "LINE NORTHING EASTING DIST (m)", ...rows].join("\n");

    const inferred = await resolveLandDocument({ metadata: metadata(text), countryCode: "QA" });
    assert.equal(inferred.crsSelection?.source, "COUNTRY_INFERENCE");
    assert.equal(inferred.crsSelection?.zone, 39);
    assert.equal(inferred.crsSelection?.hemisphere, "N");
    assert.match(inferred.warnings.join(" "), /inferred from document country bounds/i);
    assert.ok(inferred.strategy?.reviewReasons.includes("UTM_ZONE_INFERRED"));
  });

  it("does not infer a zone when several zones fit the country equally well", async () => {
    // Saudi Arabia spans zones 36-39, so no single zone is justified.
    const ambiguous = await resolveLandDocument({
      metadata: metadata(zoneLessText),
      countryCode: "SA",
    });
    assert.equal(ambiguous.crsSelection?.required, true);
    assert.equal(ambiguous.crsSelection?.zone, undefined);
    assert.equal(ambiguous.evidence.coordinatePairs.length, 0);
  });
});

describe("Find My Land manual coordinate-system override", () => {
  const zoneLessText = [
    "LAND SURVEY - COORDINATE TABLE",
    "LINE NORTHING EASTING DIST (m)",
    "1 2 2533105.07 559322.22 20.00",
    "2 3 2533124.65 559326.26 30.00",
    "3 4 2533118.59 559355.64 20.00",
    "4 1 2533099.00 559351.60 30.00",
  ].join("\n");

  it("stops reading a grid as UTM when the user selects WGS84", async () => {
    const result = await resolveLandDocument({
      metadata: metadata(zoneLessText),
      crsMode: "wgs84",
    });
    assert.equal(result.crsSelection?.required ?? false, false);
    assert.notEqual(result.strategy?.path, "UTM_ZONE_SELECTION_REQUIRED");
  });

  it("requires a zone when the user forces UTM on a document without one", async () => {
    const result = await resolveLandDocument({
      metadata: metadata("LAND SURVEY\nP1 24.713600 N 46.675300 E\nP2 24.713900 N 46.675300 E"),
      crsMode: "utm",
    });
    assert.equal(result.crsSelection?.required, true);
  });

  it("lets a user zone override the zone printed in the document", async () => {
    const { lat, lon } = sampleForZone(38, "N");
    const result = await resolveLandDocument({
      metadata: metadata(utmDocument(38, "N", lat, lon)),
      crsMode: "utm",
      utmZone: 39,
      utmHemisphere: "N",
    });
    assert.equal(result.crsSelection?.source, "USER");
    assert.equal(result.crsSelection?.zone, 39);
  });
});

describe("Find My Land ambiguity and geometry safety worldwide", () => {
  it("does not merge two separate coordinate clusters into one parcel", async () => {
    const text = [
      "LAND PORTFOLIO SUMMARY - two separate parcels",
      "24.713600 46.675300",
      "24.713900 46.675300",
      "24.713900 46.675700",
      "48.856600 2.352200",
      "48.856900 2.352200",
      "48.856900 2.352600",
    ].join("\n");

    const result = await resolveLandDocument({ metadata: metadata(text) });
    assert.equal(result.coordinateGroupSelectionRequired, true);
    assert.equal(result.coordinateGroups?.length, 2);
    assert.equal(result.evidence.coordinatePairs.length, 0);
    assert.equal(result.geometry, undefined);

    const chosen = await resolveLandDocument({
      metadata: metadata(text),
      coordinateGroupId: result.coordinateGroups![1].id,
    });
    assert.equal(chosen.evidence.coordinatePairs.length, 3);
    assert.ok(chosen.evidence.coordinatePairs.every((point) => point.lon < 10));
  });

  it("preserves the documented point order rather than reordering for a nicer polygon", async () => {
    const text = [
      "LAND SURVEY - crossing boundary sequence",
      "P1 21.885762 N 39.205920 E",
      "P2 21.885788 N 39.205508 E",
      "P3 21.885892 N 39.205878 E",
      "P4 21.885658 N 39.205550 E",
    ].join("\n");

    const result = await resolveLandDocument({ metadata: metadata(text) });
    assert.equal(result.evidence.coordinatePairs.length, 4);
    assert.ok(Math.abs(result.evidence.coordinatePairs[0].lon - 39.20592) < 1e-6);
    assert.ok(Math.abs(result.evidence.coordinatePairs[1].lon - 39.205508) < 1e-6);
    assert.equal(result.geometry, undefined, "a crossing sequence must not become a polygon");
    assert.match(result.warnings.join(" "), /self-intersecting/i);
  });

  it("reports duplicate corners without treating them as new vertices", async () => {
    const text = [
      "LAND SURVEY - closing point repeated",
      "P1 24.713600 N 46.675300 E",
      "P2 24.713900 N 46.675300 E",
      "P3 24.713900 N 46.675700 E",
      "P4 24.713600 N 46.675300 E",
    ].join("\n");

    const result = await resolveLandDocument({ metadata: metadata(text) });
    assert.equal(result.evidence.coordinatePairs.length, 4);
    assert.equal(result.duplicateSourcePoints, 1);
    assert.match(result.warnings.join(" "), /duplicate point/i);
  });

  it("keeps WGS84 and produces no UTM grid beyond the UTM latitude band", async () => {
    const text = [
      "POLAR RESEARCH STATION LAND PARCEL SURVEY",
      "P1 85.123400 N 12.345600 E",
      "P2 85.123700 N 12.345600 E",
      "P3 85.123700 N 12.346000 E",
    ].join("\n");

    const result = await resolveLandDocument({ metadata: metadata(text) });
    assert.equal(result.evidence.coordinatePairs.length, 3);
    assert.equal(result.utmOutOfRange, true);
    assert.match(result.warnings.join(" "), /outside the standard UTM latitude band/i);
  });

  it("flags coordinates that contradict the document's own country", async () => {
    const text = [
      "تقرير مساحي - المملكة العربية السعودية",
      "P1 48.856600 N 2.352200 E",
      "P2 48.856900 N 2.352200 E",
      "P3 48.856900 N 2.352600 E",
    ].join("\n");

    const result = await resolveLandDocument({ metadata: metadata(text), countryCode: "SA" });
    const boundsCheck = result.strategy?.validations.find((item) => item.code === "COUNTRY_BOUNDS");
    assert.ok(
      result.evidence.coordinatePairs.length === 0 || boundsCheck?.status === "FAIL",
      "out-of-country coordinates must not be presented as confident",
    );
    assert.equal(result.strategy?.requiresReview, true);
  });
});
