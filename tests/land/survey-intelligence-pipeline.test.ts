import assert from "node:assert/strict";
import { describe, it } from "node:test";

import proj4 from "proj4";

import { WGS84_PROJ4, wgs84ToUtm } from "@/lib/geo/utm";
import { localPlaneDefinition } from "@/lib/land/boundary/local-plane";
import { resolveLandDocument } from "@/lib/land/intelligence/resolver";
import type { Point } from "@/lib/geo/contracts";

const RIYADH: Point = { lat: 24.7136, lon: 46.6753 };
const MUSCAT: Point = { lat: 23.5859, lon: 58.4059 };

/** Exact metre-dimensioned rectangle around an origin, corner by corner. */
function rectangle(origin: Point, width: number, height: number): Point[] {
  const definition = localPlaneDefinition(origin);
  return ([[0, 0], [width, 0], [width, height], [0, height]] as [number, number][]).map(([x, y]) => {
    const [lon, lat] = proj4(definition, WGS84_PROJ4, [x, y]);
    return { lat, lon };
  });
}

function metadata(nativeText: string, fileName = "survey.pdf") {
  return { fileName, mimeType: "application/pdf", sizeBytes: Math.max(2048, nativeText.length), nativeText };
}

function wgs84Rows(points: readonly Point[]): string[] {
  return points.map((point, index) => {
    const latText = `${Math.abs(point.lat).toFixed(8)} ${point.lat < 0 ? "S" : "N"}`;
    const lonText = `${Math.abs(point.lon).toFixed(8)} ${point.lon < 0 ? "W" : "E"}`;
    return `P${index + 1} ${latText} ${lonText}`;
  });
}

function utmRows(points: readonly Point[], zone: number, hemisphere: "N" | "S"): string[] {
  return points.map((point, index) => {
    const projected = wgs84ToUtm(point.lat, point.lon, { zone, hemisphere })!;
    return `P${index + 1} ${zone}${hemisphere} ${projected.easting.toFixed(3)} ${projected.northing.toFixed(3)}`;
  });
}

describe("Saudi survey document, end to end", () => {
  const parcel = rectangle(RIYADH, 25.4, 20);
  const text = [
    "المملكة العربية السعودية",
    "وزارة العدل - كتابة العدل",
    "صك إلكتروني - رقم الصك 310123456789",
    "مدينة الرياض - حي النرجس",
    "رقم المخطط 2870 - رقم القطعة 1173",
    "المساحة 508 م2",
    "الحد الشمالي بطول 25.40 م",
    "الحد الجنوبي بطول 25.40 م",
    "الحد الشرقي بطول 20.00 م",
    "الحد الغربي بطول 20.00 م",
    "الإحداثيات:",
    ...wgs84Rows(parcel),
  ].join("\n");

  it("identifies the country, the authority, and the document family", async () => {
    const result = await resolveLandDocument({ metadata: metadata(text, "deed.pdf") });
    const intelligence = result.documentIntelligence;
    assert.ok(intelligence);
    assert.equal(intelligence.country.code, "SA");
    assert.equal(intelligence.country.level, "HIGH");
    assert.ok(intelligence.country.evidence.some((hit) => hit.kind === "AUTHORITY"));
    assert.equal(intelligence.documentType.kind, "PROPERTY_DEED");
    assert.equal(intelligence.adapter, "SA");
  });

  it("reconstructs the parcel in the documented order", async () => {
    const result = await resolveLandDocument({ metadata: metadata(text) });
    const parcelResult = result.parcel;
    assert.ok(parcelResult);
    assert.equal(parcelResult.vertices.length, 4);
    assert.deepEqual(parcelResult.vertices.map((vertex) => vertex.label), ["P1", "P2", "P3", "P4"]);
    assert.deepEqual(parcelResult.boundary.documentSequence, [0, 1, 2, 3]);
    assert.equal(parcelResult.boundary.documentOrderValid, true);
    assert.equal(parcelResult.orderConfirmedByUser, false);
  });

  it("measures the parcel and agrees with the registered area", async () => {
    const result = await resolveLandDocument({ metadata: metadata(text) });
    const boundary = result.parcel?.boundary;
    assert.ok(boundary);
    assert.ok(Math.abs((boundary.areaSquareMeters ?? 0) - 508) < 0.5);
    assert.equal(boundary.areaComparison?.verdict, "MATCH");
    assert.ok(Math.abs(boundary.areaComparison?.statedSquareMeters ?? 0) === 508);
    assert.ok(Math.abs((boundary.perimeterMeters ?? 0) - 90.8) < 0.5);
  });

  it("confirms the written side lengths against the coordinates", async () => {
    const result = await resolveLandDocument({ metadata: metadata(text) });
    const boundary = result.parcel?.boundary;
    assert.ok(boundary);
    assert.equal(result.parcel?.documented.sides.length, 4);
    assert.equal(boundary.sideLengthComparison?.verdict, "MATCH");
    assert.equal(boundary.sideLengthComparison?.matched, 4);
    const sideCheck = boundary.validations.find((entry) => entry.code === "SIDE_LENGTH_AGREEMENT");
    assert.equal(sideCheck?.status, "PASS");
  });

  it("keeps each corner traceable to the text it came from", async () => {
    const result = await resolveLandDocument({ metadata: metadata(text) });
    for (const vertex of result.parcel?.vertices ?? []) {
      assert.ok(vertex.sourceText.length > 0);
      assert.ok(vertex.extractedBy.includes("/"));
      assert.equal(vertex.crs, "wgs84");
      assert.ok(vertex.confidence > 0);
    }
  });
});

describe("Omani survey document, end to end", () => {
  const parcel = rectangle(MUSCAT, 30, 24);

  it("identifies Oman from an Arabic ownership document", async () => {
    const text = [
      "سلطنة عُمان",
      "وزارة الإسكان والتخطيط العمراني",
      "سند ملكية",
      "محافظة مسقط - ولاية بوشر",
      "رقم القسيمة 45/2024",
      "المساحة 720 م2",
      "الإحداثيات:",
      ...wgs84Rows(parcel),
    ].join("\n");

    const result = await resolveLandDocument({ metadata: metadata(text, "sanad.pdf") });
    assert.equal(result.documentIntelligence?.country.code, "OM");
    assert.equal(result.documentIntelligence?.country.level, "HIGH");
    assert.equal(result.documentIntelligence?.documentType.kind, "PROPERTY_DEED");
    assert.equal(result.parcel?.vertices.length, 4);
    assert.equal(result.parcel?.boundary.documentOrderValid, true);
  });

  it("handles a bilingual Omani survey plan in UTM without assuming a zone", async () => {
    const text = [
      "SULTANATE OF OMAN - سلطنة عمان",
      "MINISTRY OF HOUSING AND URBAN PLANNING",
      "LAND SURVEY PLAN - مخطط مساحي",
      "MUSCAT GOVERNORATE",
      "Coordinate Reference System: UTM Zone 40N",
      "AREA = 720 SQ. M.",
      ...utmRows(parcel, 40, "N"),
    ].join("\n");

    const result = await resolveLandDocument({ metadata: metadata(text, "oman-survey.pdf") });
    assert.equal(result.documentIntelligence?.country.code, "OM");
    assert.equal(result.crsSelection?.zone, 40);
    assert.equal(result.crsSelection?.hemisphere, "N");
    assert.equal(result.crsSelection?.epsg, 32640);
    assert.equal(result.parcel?.vertices.length, 4);
    for (const vertex of result.parcel?.vertices ?? []) {
      assert.equal(vertex.crs, "utm");
      assert.equal(vertex.original.zone, 40);
      assert.equal(vertex.original.hemisphere, "N");
      assert.ok((vertex.original.easting ?? 0) > 100_000);
    }
  });

  it("reads Arabic-Indic digits in an Omani document", async () => {
    const text = [
      "سلطنة عمان - وزارة الإسكان",
      "سند ملكية - رقم القسيمة ٤٥",
      "المساحة ٧٢٠ م2",
      "الإحداثيات:",
      ...wgs84Rows(parcel),
    ].join("\n");

    const result = await resolveLandDocument({ metadata: metadata(text) });
    assert.equal(result.documentIntelligence?.arabicNumerals, true);
    assert.equal(result.parcel?.documented.area?.squareMeters, 720);
    assert.equal(result.parcel?.boundary.areaComparison?.verdict, "MATCH");
  });
});

describe("The generic core works without a country adapter", () => {
  const parcel = rectangle({ lat: -33.8688, lon: 151.2093 }, 40, 30);

  it("analyses an international survey document with no country evidence", async () => {
    const text = [
      "LAND SURVEY REPORT",
      "Coordinate Reference System: WGS84",
      "AREA = 1200 SQ. M.",
      "Boundary coordinates",
      ...wgs84Rows(parcel),
    ].join("\n");

    const result = await resolveLandDocument({ metadata: metadata(text, "international.pdf") });
    assert.notEqual(result.documentIntelligence?.country.level, "HIGH");
    assert.equal(result.documentIntelligence?.adapter, "UNKNOWN");
    assert.equal(result.documentIntelligence?.documentType.kind, "SURVEY_REPORT");
    assert.equal(result.parcel?.vertices.length, 4);
    assert.equal(result.parcel?.boundary.documentOrderValid, true);
    assert.equal(result.parcel?.boundary.areaComparison?.verdict, "MATCH");
    assert.ok(result.parcel?.vertices.every((vertex) => vertex.point.lat < 0));
  });

  it("does not require a known country for a UTM south document", async () => {
    const text = [
      "CADASTRAL SURVEY",
      "Coordinate Reference System: UTM Zone 56S",
      ...utmRows(parcel, 56, "S"),
    ].join("\n");

    const result = await resolveLandDocument({ metadata: metadata(text) });
    assert.equal(result.documentIntelligence?.adapter, "UNKNOWN");
    assert.equal(result.crsSelection?.epsg, 32756);
    assert.equal(result.parcel?.vertices.length, 4);
    assert.equal(result.parcel?.boundary.documentOrderValid, true);
  });
});

describe("Boundary problems are surfaced, not repaired", () => {
  const parcel = rectangle(RIYADH, 25.4, 20);
  const crossing = [parcel[0], parcel[2], parcel[1], parcel[3]];

  it("refuses a polygon for a crossing documented order", async () => {
    const text = ["LAND SURVEY - boundary schedule", ...wgs84Rows(crossing)].join("\n");
    const result = await resolveLandDocument({ metadata: metadata(text) });
    assert.equal(result.parcel?.boundary.documentOrderValid, false);
    assert.ok((result.parcel?.boundary.selfIntersections.length ?? 0) > 0);
    assert.equal(result.parcel?.boundary.areaSquareMeters, undefined);
    assert.equal(result.geometry, undefined);
  });

  it("offers a proposal without applying it", async () => {
    const text = ["LAND SURVEY - boundary schedule", ...wgs84Rows(crossing)].join("\n");
    const result = await resolveLandDocument({ metadata: metadata(text) });
    const proposal = result.parcel?.boundary.suggestedSequence;
    assert.ok(proposal, "a rectangle's corners admit one boundary");
    assert.equal(result.parcel?.orderConfirmedByUser, false);
    assert.deepEqual(result.parcel?.boundary.documentSequence, [0, 1, 2, 3]);
    assert.match(result.warnings.join(" "), /alternative boundary order/i);
  });

  it("applies a confirmed order and re-measures the parcel", async () => {
    const text = ["LAND SURVEY - boundary schedule", "AREA = 508 SQ. M.", ...wgs84Rows(crossing)].join("\n");
    const pending = await resolveLandDocument({ metadata: metadata(text) });
    const proposal = pending.parcel?.boundary.suggestedSequence;
    assert.ok(proposal);

    const confirmed = await resolveLandDocument({
      metadata: metadata(text),
      confirmedOrder: proposal.order,
    });
    assert.equal(confirmed.parcel?.orderConfirmedByUser, true);
    assert.equal(confirmed.parcel?.boundary.documentOrderValid, true);
    assert.ok(Math.abs((confirmed.parcel?.boundary.areaSquareMeters ?? 0) - 508) < 0.5);
    assert.equal(confirmed.parcel?.boundary.areaComparison?.verdict, "MATCH");
  });

  it("reports an area that contradicts the document", async () => {
    const text = [
      "LAND SURVEY REPORT",
      "AREA = 900 SQ. M.",
      ...wgs84Rows(parcel),
    ].join("\n");
    const result = await resolveLandDocument({ metadata: metadata(text) });
    assert.equal(result.parcel?.boundary.areaComparison?.verdict, "MISMATCH");
    assert.match(result.warnings.join(" "), /differs from the registered area/i);
  });

  it("reports side lengths that contradict the coordinates", async () => {
    const text = [
      "تقرير مساحي",
      "الحد الشمالي بطول 40.00 م",
      "الحد الجنوبي بطول 40.00 م",
      "الحد الشرقي بطول 30.00 م",
      "الحد الغربي بطول 30.00 م",
      "الإحداثيات:",
      ...wgs84Rows(parcel),
    ].join("\n");
    const result = await resolveLandDocument({ metadata: metadata(text) });
    assert.equal(result.parcel?.boundary.sideLengthComparison?.verdict, "MISMATCH");
    assert.match(result.warnings.join(" "), /side lengths do not match/i);
  });

  it("treats a repeated closing point as closure", async () => {
    const closed = [...parcel, parcel[0]];
    const text = ["LAND SURVEY", ...wgs84Rows(closed)].join("\n");
    const result = await resolveLandDocument({ metadata: metadata(text) });
    assert.equal(result.parcel?.boundary.distinctCount, 4);
    assert.ok(result.parcel?.boundary.closingDuplicateIndex !== undefined);
    assert.equal(result.parcel?.boundary.documentOrderValid, true);
  });
});

describe("Multi-page documents", () => {
  const parcel = rectangle(RIYADH, 25.4, 20);

  it("merges a table that continues on the next page and records each page", async () => {
    const rows = wgs84Rows(parcel);
    const pages = [
      ["تقرير مساحي - صفحة 1", "الإحداثيات:", rows[0], rows[1]].join("\n"),
      ["صفحة 2 - تابع جدول الإحداثيات", rows[2], rows[3]].join("\n"),
    ];
    const result = await resolveLandDocument({
      metadata: metadata(pages.join("\n")),
      pages,
    });

    assert.equal(result.documentIntelligence?.pageCount, 2);
    assert.equal(result.parcel?.vertices.length, 4, "the table spans both pages");
    const pagesSeen = new Set(result.parcel?.vertices.map((vertex) => vertex.page));
    assert.deepEqual([...pagesSeen].sort(), [1, 2]);
    assert.equal(result.parcel?.boundary.documentOrderValid, true);
  });

  it("reports a single page when no page split is supplied", async () => {
    const text = ["LAND SURVEY", ...wgs84Rows(parcel)].join("\n");
    const result = await resolveLandDocument({ metadata: metadata(text) });
    assert.equal(result.documentIntelligence?.pageCount, 1);
  });
});

describe("Bearings as supporting evidence", () => {
  const parcel = rectangle(RIYADH, 25.4, 20);

  it("extracts bearings when the document states them", async () => {
    const text = [
      "SURVEY REPORT",
      "from point 1 to point 2 length 25.40 m Azimuth 90°00'",
      "from point 2 to point 3 length 20.00 m Azimuth 0°00'",
      ...wgs84Rows(parcel),
    ].join("\n");
    const result = await resolveLandDocument({ metadata: metadata(text) });
    assert.ok((result.parcel?.documented.bearings.length ?? 0) >= 1);
    assert.equal(result.parcel?.documented.segments.length, 2);
    assert.equal(result.parcel?.documented.segments[0].from, "1");
    assert.equal(result.parcel?.documented.segments[0].lengthMeters, 25.4);
  });

  it("completes the analysis when no bearings are present", async () => {
    const text = ["SURVEY REPORT", ...wgs84Rows(parcel)].join("\n");
    const result = await resolveLandDocument({ metadata: metadata(text) });
    assert.equal(result.parcel?.documented.bearings.length, 0);
    assert.equal(result.parcel?.boundary.documentOrderValid, true);
  });

  it("computes a bearing for every reconstructed segment", async () => {
    const text = ["SURVEY REPORT", ...wgs84Rows(parcel)].join("\n");
    const result = await resolveLandDocument({ metadata: metadata(text) });
    const segments = result.parcel?.boundary.segments ?? [];
    assert.equal(segments.length, 4);
    for (const segment of segments) {
      assert.ok(segment.bearingDegrees >= 0 && segment.bearingDegrees < 360);
      assert.ok(segment.lengthMeters > 0);
    }
    // The first side of the rectangle runs due east.
    assert.ok(Math.abs(segments[0].bearingDegrees - 90) < 1);
  });
});
