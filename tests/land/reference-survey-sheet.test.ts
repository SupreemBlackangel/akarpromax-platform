import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveLandDocument } from "@/lib/land/intelligence/resolver";
import { utmToWgs84 } from "@/lib/geo/utm";

/**
 * The reference survey sheet: an Omani-style plan with a `WGS84 40N` caption,
 * a `LINE / EASTING / NORTHING / DIST` table whose edges close the ring, and a
 * registered area in the footer.
 */
const REFERENCE_SHEET = [
  "WGS84 40N",
  "",
  "LINE    EASTING       NORTHING       DIST",
  "1  2    565150.50     2550415.28     30.00",
  "2  3    565136.78     2550388.60     10.00",
  "3  4    565127.88     2550393.17     30.00",
  "4  1    565141.61     2550419.85     10.00",
  "",
  "AREA = 300 SQ.m",
].join("\n");

function metadata(nativeText: string, fileName = "survey-sheet.pdf") {
  return { fileName, mimeType: "application/pdf", sizeBytes: 4096, nativeText };
}

describe("Reference survey sheet: LINE / EASTING / NORTHING / DIST", () => {
  it("reads exactly four corners", async () => {
    const result = await resolveLandDocument({ metadata: metadata(REFERENCE_SHEET) });
    assert.equal(result.evidence.coordinatePairs.length, 4);
    assert.equal(result.parcel?.vertices.length, 4);
  });

  it("reads the CRS from the caption above the table", async () => {
    const result = await resolveLandDocument({ metadata: metadata(REFERENCE_SHEET) });
    assert.equal(result.crsSelection?.zone, 40);
    assert.equal(result.crsSelection?.hemisphere, "N");
    assert.equal(result.crsSelection?.epsg, 32640);
    assert.equal(result.crsSelection?.required, false);
  });

  it("converts every corner to the right place on Earth", async () => {
    const result = await resolveLandDocument({ metadata: metadata(REFERENCE_SHEET) });
    const expected = [
      utmToWgs84(565150.5, 2550415.28, 40, "N"),
      utmToWgs84(565136.78, 2550388.6, 40, "N"),
      utmToWgs84(565127.88, 2550393.17, 40, "N"),
      utmToWgs84(565141.61, 2550419.85, 40, "N"),
    ];
    for (let index = 0; index < expected.length; index += 1) {
      const actual = result.evidence.coordinatePairs[index];
      assert.ok(expected[index]);
      assert.ok(Math.abs(actual.lat - expected[index]!.lat) < 1e-9, `P${index + 1} latitude`);
      assert.ok(Math.abs(actual.lon - expected[index]!.lon) < 1e-9, `P${index + 1} longitude`);
    }
    // Zone 40N has its central meridian at 57 degrees east; an easting of
    // 565 km places the parcel about 65 km east of it, inside Oman.
    assert.ok(result.center && result.center.lat > 23 && result.center.lat < 23.1, `lat ${result.center?.lat}`);
    assert.ok(result.center && result.center.lon > 57.6 && result.center.lon < 57.7, `lon ${result.center?.lon}`);
  });

  it("keeps the documented sequence 1 to 2 to 3 to 4", async () => {
    const result = await resolveLandDocument({ metadata: metadata(REFERENCE_SHEET) });
    assert.deepEqual(result.parcel?.boundary.documentSequence, [0, 1, 2, 3]);
    assert.deepEqual(
      result.parcel?.vertices.map((vertex) => vertex.pointNumber),
      ["1", "2", "3", "4"],
    );
    assert.equal(result.parcel?.sequenceEvidence, "EXPLICIT_LINE_TOPOLOGY");
    assert.equal(result.parcel?.orderConfirmedByUser, false);
  });

  it("treats the closing edge as closure, not a fifth corner", async () => {
    const result = await resolveLandDocument({ metadata: metadata(REFERENCE_SHEET) });
    assert.equal(result.parcel?.closedByTopology, true);
    assert.equal(result.parcel?.boundary.distinctCount, 4);
    assert.equal(result.parcel?.vertices.length, 4);
    assert.equal(result.duplicateSourcePoints, undefined);
  });

  it("builds a valid polygon without reordering anything", async () => {
    const result = await resolveLandDocument({ metadata: metadata(REFERENCE_SHEET) });
    assert.equal(result.geometry?.type, "polygon");
    assert.equal(result.parcel?.boundary.documentOrderValid, true);
    assert.equal(result.parcel?.boundary.selfIntersections.length, 0);
    assert.equal(result.parcel?.boundary.suggestedSequence, undefined, "no reorder was needed");
  });

  it("measures each edge and agrees with the DIST column", async () => {
    const result = await resolveLandDocument({ metadata: metadata(REFERENCE_SHEET) });
    const segments = result.parcel?.boundary.segments ?? [];
    assert.equal(segments.length, 4);

    const expected = [30, 10, 30, 10];
    for (let index = 0; index < segments.length; index += 1) {
      assert.equal(segments[index].documentLengthMeters, expected[index], `edge ${index + 1} documented length`);
      assert.ok(
        Math.abs(segments[index].lengthMeters - expected[index]) < 0.05,
        `edge ${index + 1} measured ${segments[index].lengthMeters} against ${expected[index]}`,
      );
      assert.ok((segments[index].deviationMeters ?? 1) < 0.05);
    }
    assert.equal(result.parcel?.boundary.sideLengthComparison?.verdict, "MATCH");
    assert.equal(result.parcel?.boundary.sideLengthComparison?.matched, 4);
  });

  it("computes an area that agrees with the registered 300 m2", async () => {
    const result = await resolveLandDocument({ metadata: metadata(REFERENCE_SHEET) });
    const boundary = result.parcel?.boundary;
    assert.ok(boundary);
    assert.ok(
      Math.abs((boundary.areaSquareMeters ?? 0) - 300) < 1,
      `computed ${boundary.areaSquareMeters} m2 against 300 m2`,
    );
    assert.equal(result.parcel?.documented.area?.squareMeters, 300);
    assert.equal(boundary.areaComparison?.verdict, "MATCH");
    assert.ok(Math.abs(boundary.areaComparison?.differenceSquareMeters ?? 99) < 1);
  });

  it("reports the perimeter the DIST column implies", async () => {
    const result = await resolveLandDocument({ metadata: metadata(REFERENCE_SHEET) });
    assert.ok(Math.abs((result.parcel?.boundary.perimeterMeters ?? 0) - 80) < 0.2);
  });

  it("identifies the sheet as an Omani-zone survey without assuming the country", async () => {
    const result = await resolveLandDocument({ metadata: metadata(REFERENCE_SHEET) });
    // No country wording is present, so the country stays unproven.
    assert.notEqual(result.documentIntelligence?.country.level, "HIGH");
    assert.equal(result.documentIntelligence?.adapter, "UNKNOWN");
    assert.equal(result.documentIntelligence?.documentType.kind, "COORDINATE_SCHEDULE");
  });

  it("lists the table it read, with its topology", async () => {
    const result = await resolveLandDocument({ metadata: metadata(REFERENCE_SHEET) });
    const tables = result.documentIntelligence?.surveyTables ?? [];
    assert.equal(tables.length, 1);
    assert.equal(tables[0].rowCount, 4);
    assert.equal(tables[0].sequenceEvidence, "EXPLICIT_LINE_TOPOLOGY");
    assert.equal(tables[0].closed, true);
    assert.equal(tables[0].zone, 40);
    assert.equal(tables[0].epsg, 32640);
    assert.equal(tables[0].crsSelectionRequired, false);
  });

  it("reaches a confident verdict with no review reasons about the geometry", async () => {
    const result = await resolveLandDocument({ metadata: metadata(REFERENCE_SHEET) });
    assert.equal(result.status, "RESOLVED_EXPLICIT_COORDINATES");
    assert.equal(result.locationConfidence, "HIGH");
    const areaCheck = result.parcel?.boundary.validations.find(
      (entry) => entry.code === "STATED_AREA_AGREEMENT",
    );
    assert.equal(areaCheck?.status, "PASS");
    const intersectionCheck = result.parcel?.boundary.validations.find(
      (entry) => entry.code === "SEGMENT_INTERSECTION",
    );
    assert.equal(intersectionCheck?.status, "PASS");
  });
});

describe("The same sheet in other shapes", () => {
  it("reads it with the zone written after the table", async () => {
    const text = [
      "LINE    EASTING       NORTHING       DIST",
      "1  2    565150.50     2550415.28     30.00",
      "2  3    565136.78     2550388.60     10.00",
      "3  4    565127.88     2550393.17     30.00",
      "4  1    565141.61     2550419.85     10.00",
      "AREA = 300 SQ.m",
      "Coordinate system: UTM Zone 40N",
    ].join("\n");
    const result = await resolveLandDocument({ metadata: metadata(text) });
    assert.equal(result.crsSelection?.zone, 40);
    assert.equal(result.evidence.coordinatePairs.length, 4);
  });

  it("reads it with an EPSG code instead of a zone caption", async () => {
    const text = [
      "EPSG:32640",
      "LINE    EASTING       NORTHING       DIST",
      "1  2    565150.50     2550415.28     30.00",
      "2  3    565136.78     2550388.60     10.00",
      "3  4    565127.88     2550393.17     30.00",
      "4  1    565141.61     2550419.85     10.00",
      "AREA = 300 SQ.m",
    ].join("\n");
    const result = await resolveLandDocument({ metadata: metadata(text) });
    assert.equal(result.crsSelection?.zone, 40);
    assert.equal(result.crsSelection?.epsg, 32640);
    assert.equal(result.evidence.coordinatePairs.length, 4);
  });

  it("asks for a zone when the sheet states none", async () => {
    const text = [
      "LINE    EASTING       NORTHING       DIST",
      "1  2    565150.50     2550415.28     30.00",
      "2  3    565136.78     2550388.60     10.00",
      "3  4    565127.88     2550393.17     30.00",
      "4  1    565141.61     2550419.85     10.00",
      "AREA = 300 SQ.m",
    ].join("\n");
    const pending = await resolveLandDocument({ metadata: metadata(text) });
    assert.equal(pending.crsSelection?.required, true);
    assert.equal(pending.evidence.coordinatePairs.length, 0);
    assert.equal(pending.geometry, undefined);

    const selected = await resolveLandDocument({
      metadata: metadata(text),
      utmZone: 40,
      utmHemisphere: "N",
    });
    assert.equal(selected.evidence.coordinatePairs.length, 4);
    assert.equal(selected.crsSelection?.source, "USER");
    assert.ok(Math.abs((selected.parcel?.boundary.areaSquareMeters ?? 0) - 300) < 1);
  });

  it("reads an Arabic sheet with the same structure", async () => {
    const text = [
      "سلطنة عمان - وزارة الإسكان",
      "نظام الإحداثيات: UTM Zone 40N",
      "الضلع    الشرقيات      الشماليات     المسافة",
      "1  2    565150.50     2550415.28     30.00",
      "2  3    565136.78     2550388.60     10.00",
      "3  4    565127.88     2550393.17     30.00",
      "4  1    565141.61     2550419.85     10.00",
      "المساحة = 300 متر مربع",
    ].join("\n");
    const result = await resolveLandDocument({ metadata: metadata(text) });
    assert.equal(result.documentIntelligence?.country.code, "OM");
    assert.equal(result.evidence.coordinatePairs.length, 4);
    assert.equal(result.crsSelection?.zone, 40);
    assert.equal(result.parcel?.documented.area?.squareMeters, 300);
    assert.ok(Math.abs((result.parcel?.boundary.areaSquareMeters ?? 0) - 300) < 1);
    assert.equal(result.parcel?.boundary.areaComparison?.verdict, "MATCH");
  });

  it("reads the sheet with Arabic-Indic digits throughout", async () => {
    const text = [
      "WGS84 40N",
      "الضلع    الشرقيات      الشماليات     المسافة",
      "١  ٢    ٥٦٥١٥٠٫٥٠     ٢٥٥٠٤١٥٫٢٨     ٣٠٫٠٠",
      "٢  ٣    ٥٦٥١٣٦٫٧٨     ٢٥٥٠٣٨٨٫٦٠     ١٠٫٠٠",
      "٣  ٤    ٥٦٥١٢٧٫٨٨     ٢٥٥٠٣٩٣٫١٧     ٣٠٫٠٠",
      "٤  ١    ٥٦٥١٤١٫٦١     ٢٥٥٠٤١٩٫٨٥     ١٠٫٠٠",
      "المساحة = ٣٠٠ متر مربع",
    ].join("\n");
    const result = await resolveLandDocument({ metadata: metadata(text) });
    assert.equal(result.documentIntelligence?.arabicNumerals, true);
    assert.equal(result.evidence.coordinatePairs.length, 4);
    assert.ok(Math.abs((result.parcel?.boundary.areaSquareMeters ?? 0) - 300) < 1);
  });

  it("does not merge a second table into the parcel", async () => {
    const text = [
      "WGS84 40N",
      "LINE    EASTING       NORTHING       DIST",
      "1  2    565150.50     2550415.28     30.00",
      "2  3    565136.78     2550388.60     10.00",
      "3  4    565127.88     2550393.17     30.00",
      "4  1    565141.61     2550419.85     10.00",
      "AREA = 300 SQ.m",
      "",
      "CONTROL STATIONS",
      "STATION EASTING NORTHING",
      "101 560000.00 2540000.00",
      "102 561000.00 2541000.00",
      "103 562000.00 2542000.00",
    ].join("\n");
    const result = await resolveLandDocument({ metadata: metadata(text) });
    assert.equal(result.evidence.coordinatePairs.length, 4, "only the parcel table is drawn");
    assert.ok((result.documentIntelligence?.surveyTables?.length ?? 0) >= 2);
    assert.ok(Math.abs((result.parcel?.boundary.areaSquareMeters ?? 0) - 300) < 1);
  });
});
