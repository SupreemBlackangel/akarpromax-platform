import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { LAND_CLASSIFIER } from "@/lib/land/intelligence/classifier";
import { SaudiDocumentAdapter, GenericLandDocumentAdapter, DEFAULT_ADAPTER } from "@/lib/land/intelligence/adapters";
import { CrsDetector, toWgs84Point } from "@/lib/land/intelligence/crs-detector";
import { protectCoordinateOrder } from "@/lib/land/intelligence/coordinate-protection";
import { buildLandGeometry } from "@/lib/land/intelligence/geometry-builder";
import { computeLocationConfidence, computeBoundaryConfidence } from "@/lib/land/intelligence/confidence";
import { resolveLandDocument } from "@/lib/land/intelligence/resolver";
import { storeResolveResult, getResolveResult, clearResolveResults } from "@/lib/land/resolve-store";
import { extractZoneLessUtmRows } from "@/lib/geo/evidence-extraction";
import { extractLandDetails } from "@/src/lib/tools/land-analysis";

function metadata(nativeText: string, overrides: Record<string, unknown> = {}) {
  return { fileName: "deed.pdf", mimeType: "application/pdf", sizeBytes: 1024, nativeText, ...overrides };
}

describe("Land Document Classifier", () => {
  it("classifies a Saudi title deed as TITLE_DEED", () => {
    const r = LAND_CLASSIFIER.classify("صك ملكية رقم 12345678 - المالك: محمد أحمد - قطعة 12");
    assert.equal(r.category, "TITLE_DEED");
    assert.ok(r.confidence > 0.5);
  });

  it("classifies a survey plan as SURVEY_PLAN", () => {
    const r = LAND_CLASSIFIER.classify("تقرير مساحي - حدود الأرض - مساحة 500 م2");
    assert.equal(r.category, "SURVEY_PLAN");
  });

  it("classifies a parcel plan as PARCEL_PLAN", () => {
    const r = LAND_CLASSIFIER.classify("مخطط رقم 1435 - قطعة 456 - تقسيم");
    assert.equal(r.category, "PARCEL_PLAN");
  });

  it("classifies a cadastral document as CADASTRAL_DOCUMENT", () => {
    const r = LAND_CLASSIFIER.classify("سجل عقاري - خريطة مساحية - رقم القسيمة 888");
    assert.equal(r.category, "CADASTRAL_DOCUMENT");
  });

  it("classifies a municipal document as MUNICIPAL_DOCUMENT", () => {
    const r = LAND_CLASSIFIER.classify("بلدية الرياض - اشتراطات البناء - رخصة رقم 55");
    assert.equal(r.category, "MUNICIPAL_DOCUMENT");
  });

  it("classifies a property document as PROPERTY_DOCUMENT", () => {
    const r = LAND_CLASSIFIER.classify("عقار سكني - أرض - تجاري");
    assert.equal(r.category, "PROPERTY_DOCUMENT");
  });

  it("classifies an address document as ADDRESS_DOCUMENT", () => {
    const r = LAND_CLASSIFIER.classify("العنوان الوطني - رقم المبنى 1234 - شارع الملك");
    assert.equal(r.category, "ADDRESS_DOCUMENT");
  });

  it("returns UNKNOWN_LAND_DOCUMENT for non-land docs", () => {
    const r = LAND_CLASSIFIER.classify("هوية وطنية - بطاقة أحوال");
    assert.equal(r.category, "UNKNOWN_LAND_DOCUMENT");
  });

  it("classifies an English title deed as TITLE_DEED", () => {
    const r = LAND_CLASSIFIER.classify("Title Deed - Owner: John - Parcel 12");
    assert.equal(r.category, "TITLE_DEED");
  });
});

describe("Land detail extraction", () => {
  it("reads the registered area from repeated survey-table values", () => {
    const text = [
      "تقرير مساحي لقطعة أرض",
      "40 40 15 15",
      "600 600",
      "إحداثيات حدود الأرض",
    ].join("\n");

    assert.equal(extractLandDetails(text).area, "600");
  });

  it("prefers a complete SQ. M. area over an earlier corrupted OCR value", () => {
    const text = "AREA: 50050. M.\nLINE NORTHING EASTING DIST (m)\nAREA = 600 SQ. M.";
    assert.equal(extractLandDetails(text).area, "600");
  });

  it("does not display a visibly corrupted OCR token as a district", () => {
    assert.equal(extractLandDetails("حي ححااجات").district, undefined);
    assert.equal(extractLandDetails("حي ححااجات\u200e").district, undefined);
  });
});

describe("Zone-less UTM survey tables", () => {
  const omanTable = [
    "PLOT NO: 47 - AREA: 600 SQ. M.",
    "LINE NORTHING EASTING DIST (m)",
    "1 2 253310507 55932222 19.99",
    "2 3 253312465 55932626 30.00",
    "3 4 253311859 55935564 20.00",
    "4 1 253309900 55935160 30.00",
    "AREA = 600 SQ. M.",
  ].join("\n");

  it("restores OCR-dropped decimal separators using valid UTM ranges", () => {
    const rows = extractZoneLessUtmRows(omanTable);
    assert.equal(rows.length, 4);
    assert.equal(rows[0].northing, 2533105.07);
    assert.equal(rows[0].easting, 559322.22);
    assert.equal(rows[3].northing, 2533099);
  });

  it("repairs ambiguous OCR digits only when the declared sides and area verify them", () => {
    const photographedOcr = [
      "LINE NORTHING EASTING DIST (m)",
      "1 2 253310507 56032222 19.99 OCRCONF 84 85",
      "2 3 253312465 55932626 30.00 OCRCONF 90 91",
      "3 4 253311850 55835564 20.00 OCRCONF 79 80",
      "4 1 253300900 55035160 30.00 OCRCONF 75 37",
      "AREA = 600 SQ. M.",
    ].join("\n");
    const rows = extractZoneLessUtmRows(photographedOcr);
    assert.deepEqual(rows.map(({ northing, easting }) => [northing, easting]), [
      [2533105.07, 559322.22],
      [2533124.65, 559326.26],
      [2533118.59, 559355.64],
      [2533099, 559351.6],
    ]);
    assert.equal(rows[0].ocrCorrected, true);
    assert.equal(rows[2].ocrCorrected, true);
  });

  it("applies Oman product-default UTM zone 40 and resolves all boundary points", async () => {
    const result = await resolveLandDocument({ metadata: metadata(omanTable), countryCode: "OM" });
    assert.equal(result.status, "RESOLVED_EXPLICIT_COORDINATES");
    assert.equal(result.evidence.coordinatePairs.length, 4);
    assert.equal(result.parcelIdentifiers?.plotId, "47");
    assert.ok(result.center && result.center.lat >= 16.6 && result.center.lat <= 26.3);
    assert.ok(result.center && result.center.lon >= 52 && result.center.lon <= 59.9);
    assert.doesNotMatch(result.warnings.join(" "), /UTM zone 40 inferred/i);
    assert.equal(result.strategy?.path, "EXPLICIT_UTM");
    assert.equal(result.crsSelection?.source, "OMAN_DEFAULT");
    assert.equal(result.crsSelection?.zone, 40);
    assert.equal(result.crsSelection?.hemisphere, "N");
    assert.equal(result.strategy?.confidence.location.level, "HIGH");
    assert.equal(result.strategy?.confidence.boundary.level, "HIGH");
    assert.equal(
      result.strategy?.validations.find((check) => check.code === "SIDE_LENGTHS")?.status,
      "PASS",
    );
    assert.equal(
      result.strategy?.validations.find((check) => check.code === "REGISTERED_AREA_MATCH")?.status,
      "PASS",
    );
    assert.ok(!result.strategy?.reviewReasons.includes("UTM_ZONE_INFERRED"));
  });

  it("flags a declared area that does not agree with the survey coordinates", async () => {
    const result = await resolveLandDocument({
      metadata: metadata(omanTable.replaceAll("600 SQ. M.", "650 SQ. M.")),
      countryCode: "OM",
    });
    const areaCheck = result.strategy?.validations.find((check) => check.code === "REGISTERED_AREA_MATCH");
    assert.equal(areaCheck?.status, "FAIL");
    assert.ok((areaCheck?.deviation ?? 0) > 5);
    assert.ok(result.strategy?.reviewReasons.includes("VALIDATION_FAILED"));
  });
});

describe("Country Adapters", () => {
  it("Saudi adapter extracts parcel/plan/city/district", () => {
    const adapter = new SaudiDocumentAdapter();
    const hints = adapter.extractHints("صك ملكية - رقم القطعة 1234 - رقم المخطط 5678 - المدينة الرياض - حي العليا");
    assert.equal(hints.parcels.some((p) => p.parcelId === "1234"), true);
    assert.equal(hints.parcels.some((p) => p.planId === "5678"), true);
    assert.equal(hints.city, "الرياض");
    assert.equal(hints.district, "العليا");
  });

  it("Saudi adapter extracts area landmark", () => {
    const adapter = new SaudiDocumentAdapter();
    const hints = adapter.extractHints("المساحة 500 م2");
    assert.ok(hints.landmarks.some((l) => l.startsWith("area:500")));
  });

  it("adapters do not expose a visibly corrupted OCR district", () => {
    const adapter = new SaudiDocumentAdapter();
    const hints = adapter.extractHints("صك ملكية - حي ححااجات\u200e");
    assert.equal(hints.district, undefined);
    assert.equal(hints.addresses.some((address) => address.district === "ححااجات"), false);
  });

  it("Saudi plausibility rejects out-of-country point", () => {
    const adapter = new SaudiDocumentAdapter();
    assert.equal(adapter.isPlausiblePoint({ lat: 30, lon: 31 }), false);
    assert.equal(adapter.isPlausiblePoint({ lat: 24.7, lon: 46.7 }), true);
  });

  it("Generic adapter works for non-SA country", () => {
    const adapter = new GenericLandDocumentAdapter("AE");
    const hints = adapter.extractHints("Parcel 100 - Plot 200 - Dubai");
    assert.equal(hints.parcels.some((p) => p.parcelId === "100"), true);
    assert.equal(hints.city, "Dubai");
  });

  it("DEFAULT_ADAPTER is the Saudi adapter", () => {
    assert.equal(DEFAULT_ADAPTER.countryCode, "SA");
  });
});

describe("CRS Detector", () => {
  const detector = new CrsDetector();

  it("detects UTM with zone as DETECTED", () => {
    const r = detector.detect("39N 450000 2600000", [{ source: "text", text: "39N 450000 2600000", raw: "39N 450000 2600000", orderConfidence: 1 }]);
    assert.equal(r.kind, "utm");
    assert.equal(r.confidence, "DETECTED");
    assert.equal(r.zone, 39);
  });

  it("detects WGS84 declaration as DETECTED", () => {
    const r = detector.detect("WGS84 EPSG:4326", []);
    assert.equal(r.kind, "wgs84");
    assert.equal(r.confidence, "DETECTED");
  });

  it("detects DMS coordinates as PROBABLE", () => {
    const r = detector.detect("24°42′30″N 46°40′30″E", []);
    assert.equal(r.kind, "wgs84");
    assert.equal(r.confidence, "PROBABLE");
  });

  it("treats plain decimal pairs as AMBIGUOUS", () => {
    const r = detector.detect("24.7136 46.6753", []);
    assert.equal(r.confidence, "AMBIGUOUS");
  });

  it("returns UNKNOWN when nothing found", () => {
    const r = detector.detect("صك ملكية فقط", []);
    assert.equal(r.kind, "unknown");
    assert.equal(r.confidence, "UNKNOWN");
  });

  it("collects EPSG hints", () => {
    const r = detector.detect("EPSG:32639", []);
    assert.ok(r.epsgHints.includes(32639));
  });
});

describe("Coordinate Order Protection", () => {
  const adapter = new SaudiDocumentAdapter();

  it("swaps lat/lon when first value > 90", () => {
    const r = protectCoordinateOrder({ lat: 96.5, lon: 24.7136 }, adapter);
    assert.equal(r.swapped, true);
    assert.equal(r.point.lat, 24.7136);
    assert.equal(r.point.lon, 96.5);
    assert.ok(r.orderConfidence < 1);
  });

  it("keeps a plausible pair in order", () => {
    const r = protectCoordinateOrder({ lat: 24.7136, lon: 46.6753 }, adapter);
    assert.equal(r.swapped, false);
    assert.equal(r.orderConfidence, 1);
  });

  it("rejects non-finite coordinates", () => {
    const r = protectCoordinateOrder({ lat: NaN, lon: 46 }, adapter);
    assert.equal(r.orderConfidence, 0);
  });

  it("rejects zero-zero coordinates", () => {
    const r = protectCoordinateOrder({ lat: 0, lon: 0 }, adapter);
    assert.equal(r.orderConfidence, 0);
  });

  it("flags points outside country bounds", () => {
    const r = protectCoordinateOrder({ lat: 10, lon: 10 }, adapter);
    assert.ok(r.warnings.some((w) => w.includes("outside plausible")));
  });
});

describe("Geometry Builder", () => {
  const adapter = new SaudiDocumentAdapter();

  it("builds a point geometry for one coordinate", () => {
    const r = buildLandGeometry([{ lat: 24.71, lon: 46.67 }], adapter);
    assert.equal(r.geometry?.type, "point");
  });

  it("does not build a polygon for exactly two points", () => {
    const r = buildLandGeometry([
      { lat: 24.71, lon: 46.67 },
      { lat: 24.72, lon: 46.68 },
    ], adapter);
    assert.equal(r.geometry, undefined);
    assert.ok(r.warnings.some((w) => w.includes("2 corner points")));
  });

  it("builds a closed polygon for 3+ distinct points", () => {
    const r = buildLandGeometry([
      { lat: 24.71, lon: 46.67 },
      { lat: 24.72, lon: 46.68 },
      { lat: 24.71, lon: 46.69 },
    ], adapter);
    assert.equal(r.geometry?.type, "polygon");
    const coords = (r.geometry as { coordinates: { lat: number; lon: number }[] }).coordinates;
    assert.equal(coords[0].lat, coords[coords.length - 1].lat);
    assert.equal(coords[0].lon, coords[coords.length - 1].lon);
  });

  it("returns no geometry for empty input", () => {
    const r = buildLandGeometry([], adapter);
    assert.equal(r.geometry, undefined);
  });

  it("dedupes repeated points", () => {
    const r = buildLandGeometry([
      { lat: 24.71, lon: 46.67 },
      { lat: 24.71, lon: 46.67 },
      { lat: 24.72, lon: 46.68 },
      { lat: 24.71, lon: 46.69 },
    ], adapter);
    const coords = (r.geometry as { coordinates: { lat: number; lon: number }[] }).coordinates;
    assert.equal(coords.length - 1, 3);
  });

  it("preserves source order and refuses to manufacture a boundary from crossing points", () => {
    const r = buildLandGeometry([
      { lat: 21.885762907392643, lon: 39.20592066741188 },
      { lat: 21.88578809143258, lon: 39.20550801127744 },
      { lat: 21.885892632901115, lon: 39.205878663428656 },
      { lat: 21.88565836601457, lon: 39.20555001556669 },
    ], adapter);
    assert.equal(r.geometry, undefined);
    assert.ok(r.center);
    assert.ok(r.warnings.some((warning) => warning.includes("self-intersecting")));
  });
});

describe("Confidence Model", () => {
  it("location confidence is HIGH for detected CRS with explicit coords", () => {
    const evidence = {
      explicitCoordinates: [{ raw: "x", text: "x", source: "text", orderConfidence: 1 }],
      coordinatePairs: [{ lat: 24.7, lon: 46.7 }],
      parcels: [],
      addresses: [],
      landmarks: [],
      sourceReferences: [],
    };
    const level = computeLocationConfidence({
      evidence,
      crsConfidence: "DETECTED",
      geometryType: "point",
      geometryValid: true,
      candidatesCount: 0,
    });
    assert.equal(level, "HIGH");
  });

  it("boundary confidence is UNRESOLVED for point geometry", () => {
    const level = computeBoundaryConfidence({
      evidence: {
        explicitCoordinates: [],
        coordinatePairs: [{ lat: 24.7, lon: 46.7 }],
        parcels: [],
        addresses: [],
        landmarks: [],
        sourceReferences: [],
      },
      crsConfidence: "DETECTED",
      geometryType: "point",
      geometryValid: true,
      candidatesCount: 0,
    });
    assert.equal(level, "UNRESOLVED");
  });

  it("boundary confidence is HIGH for valid 4-corner polygon with detected CRS", () => {
    const level = computeBoundaryConfidence({
      evidence: {
        explicitCoordinates: [],
        coordinatePairs: [
          { lat: 24.7, lon: 46.7 },
          { lat: 24.72, lon: 46.7 },
          { lat: 24.72, lon: 46.72 },
          { lat: 24.7, lon: 46.72 },
        ],
        parcels: [],
        addresses: [],
        landmarks: [],
        sourceReferences: [],
      },
      crsConfidence: "DETECTED",
      geometryType: "polygon",
      geometryValid: true,
      candidatesCount: 0,
    });
    assert.equal(level, "HIGH");
  });

  it("location vs boundary are independent (point + geocode)", () => {
    const locationLevel = computeLocationConfidence({
      evidence: {
        explicitCoordinates: [],
        coordinatePairs: [],
        parcels: [],
        addresses: [{ city: "الرياض", raw: "الرياض", source: "text" }],
        landmarks: [],
        sourceReferences: [],
      },
      crsConfidence: "UNKNOWN",
      geometryType: "point",
      geometryValid: true,
      candidatesCount: 1,
      geocodingScore: 0.8,
    });
    const boundaryLevel = computeBoundaryConfidence({
      evidence: {
        explicitCoordinates: [],
        coordinatePairs: [],
        parcels: [],
        addresses: [{ city: "الرياض", raw: "الرياض", source: "text" }],
        landmarks: [],
        sourceReferences: [],
      },
      crsConfidence: "UNKNOWN",
      geometryType: "point",
      geometryValid: true,
      candidatesCount: 1,
    });
    assert.equal(locationLevel, "HIGH");
    assert.equal(boundaryLevel, "UNRESOLVED");
  });
});

describe("Resolver", () => {
  it("rejects non-land documents as NOT_LAND_DOCUMENT", async () => {
    const r = await resolveLandDocument({ metadata: metadata("هوية وطنية - بطاقة أحوال مدنية - رقم الهوية 1098765432") });
    assert.equal(r.status, "NOT_LAND_DOCUMENT");
  });

  it("resolves explicit coordinates to RESOLVED_EXPLICIT_COORDINATES", async () => {
    const r = await resolveLandDocument({
      metadata: metadata("صك ملكية - الموقع: 24.7136 46.6753"),
    });
    assert.equal(r.status, "RESOLVED_EXPLICIT_COORDINATES");
    assert.ok(r.center);
    assert.equal(r.locationConfidence, "HIGH");
    assert.equal(r.extraction.aiUsed, false);
    assert.equal(r.strategy?.path, "COORDINATES_CRS_REVIEW");
  });

  it("ignores unrelated numeric groups instead of drawing a false parcel", async () => {
    const text = [
      "نطاق العمل لمشروع تطوير عقاري",
      "الجدول المالي 41.12947 19.90105",
      "نسبة الإنجاز 24.75000 46.70000",
      "الدفعة التالية 30.25000 55.12500",
      "مدة التنفيذ 22.50000 48.25000",
    ].join("\n");
    const r = await resolveLandDocument({ metadata: metadata(text) });
    assert.equal(r.evidence.coordinatePairs.length, 0);
    assert.equal(r.geometry, undefined);
    assert.match(r.warnings.join(" "), /unlabelled numeric pairs ignored/i);
  });

  it("requires a user-selected UTM zone when a zone-less grid has no country evidence", async () => {
    const text = [
      "تقرير مساحي - حدود قطعة أرض",
      "LINE NORTHING EASTING DIST (m)",
      "1 2 2533105.07 559322.22 20.00",
      "2 3 2533124.65 559326.26 30.00",
      "3 4 2533118.59 559355.64 20.00",
      "4 1 2533099.00 559351.60 30.00",
    ].join("\n");
    const pending = await resolveLandDocument({ metadata: metadata(text) });
    assert.equal(pending.status, "PARTIALLY_RESOLVED");
    assert.equal(pending.evidence.coordinatePairs.length, 0);
    assert.equal(pending.geometry, undefined);
    assert.equal(pending.crsSelection?.required, true);
    assert.equal(pending.crsSelection?.source, "NONE");
    assert.equal(pending.crsSelection?.zone, undefined);
    assert.equal(pending.crsSelection?.hemisphere, undefined);
    assert.equal(pending.strategy?.path, "UTM_ZONE_SELECTION_REQUIRED");

    const selected = await resolveLandDocument({
      metadata: metadata(text),
      utmZone: 40,
      utmHemisphere: "N",
    });
    assert.equal(selected.status, "RESOLVED_EXPLICIT_COORDINATES");
    assert.equal(selected.evidence.coordinatePairs.length, 4);
    assert.equal(selected.crsSelection?.source, "USER");
    assert.equal(selected.crsSelection?.zone, 40);
    assert.equal(selected.crsSelection?.hemisphere, "N");
    assert.equal(selected.strategy?.path, "USER_SELECTED_UTM_ZONE");
  });

  it("accepts Arabic presentation forms and PDF-style hemisphere coordinates", async () => {
    const pdfNativeText = [
      "ﺗﻘﺮﻳﺮ ﻣﺴﺎﺣﻲ - ﺻﻚ ﻣﻠﻜﻴﺔ ﺃﺭﺽ - 1173 ﺭﻗﻢ ﺍﻟﻘﻄﻌﺔ",
      "39.20592066741188 E 21.885762907392643 N",
      "39.20550801127744 E 21.88578809143258 N",
      "39.205878663428656 E 21.885892632901115 N",
    ].join(" ");
    const r = await resolveLandDocument({ metadata: metadata(pdfNativeText) });
    assert.equal(r.status, "RESOLVED_EXPLICIT_COORDINATES");
    assert.notEqual(r.document.category, "UNKNOWN_LAND_DOCUMENT");
    assert.equal(r.evidence.coordinatePairs.length, 3);
    assert.ok(r.center);
  });

  it("keeps every municipal survey row when an area value precedes N/E coordinates", async () => {
    const surveyText = [
      "تقرير مساحي - حدود الأرض - المساحة 600",
      "22470581 39.20592066741188 E 21.885762907392643 N",
      "22470582 39.20550801127744 E 21.88578809143258 N",
      "22470583 39.205878663428656 E 21.885892632901115 N",
      "22470584 39.20555001556669 E 21.88565836601457 N",
      "22470585 39.20550801127744 E 21.88578809143258 N",
    ].join(" ");

    const r = await resolveLandDocument({ metadata: metadata(surveyText) });

    assert.equal(r.status, "RESOLVED_EXPLICIT_COORDINATES");
    assert.equal(r.evidence.coordinatePairs.length, 5);
    assert.deepEqual(r.evidence.coordinatePairs[0], {
      lat: 21.885762907392643,
      lon: 39.20592066741188,
    });
    assert.deepEqual(r.evidence.coordinatePairs[4], r.evidence.coordinatePairs[1]);
    assert.match(
      r.evidence.explicitCoordinates.find((item) => item.parsedLat !== undefined)?.raw ?? "",
      /^22470581\b/,
    );
  });

  it("resolves UTM coordinates and converts to WGS84", async () => {
    const r = await resolveLandDocument({
      metadata: metadata("صك ملكية - 39N 450000 2600000 - حدود الأرض"),
    });
    assert.equal(r.status, "RESOLVED_EXPLICIT_COORDINATES");
    assert.ok(r.center);
    assert.ok(Math.abs(r.center.lat) <= 90);
    assert.ok(Math.abs(r.center.lon) <= 180);
  });

  it("builds a polygon geometry from 3+ corners", async () => {
    const text = ["صك ملكية - إحداثيات الحدود:",
      "24.7136 46.6753",
      "24.7150 46.6760",
      "24.7142 46.6770"].join("\n");
    const r = await resolveLandDocument({ metadata: metadata(text) });
    assert.equal(r.geometry?.type, "polygon");
    assert.equal(r.boundaryConfidence, "MEDIUM");
  });

  it("does not build a polygon from exactly 2 corners", async () => {
    const text = "صك ملكية - نقطة 1: 24.7136 46.6753 - نقطة 2: 24.7150 46.6760";
    const r = await resolveLandDocument({ metadata: metadata(text) });
    assert.equal(r.geometry, undefined);
  });

  it("geocodes when only city is present (RESOLVED_GEOCODED)", async () => {
    const r = await resolveLandDocument({
      metadata: metadata("صك ملكية - المدينة الرياض - حي العليا"),
    });
    assert.equal(r.status, "RESOLVED_GEOCODED");
    assert.equal(r.extraction.geocodingUsed, true);
    assert.equal(r.strategy?.path, "ADDRESS_APPROXIMATION");
    assert.equal(r.strategy?.confidence.boundary.level, "UNRESOLVED");
    assert.ok((r.strategy?.confidence.location.score ?? 100) < 80);
  });

  it("returns PARTIALLY_RESOLVED when only parcel present", async () => {
    const r = await resolveLandDocument({
      metadata: metadata("صك ملكية - رقم القطعة 1234 - رقم المخطط 5678"),
    });
    assert.equal(r.status, "PARTIALLY_RESOLVED");
    assert.equal(r.parcelIdentifiers?.parcelId, "1234");
    assert.equal(r.strategy?.path, "CADASTRAL_LOOKUP_REQUIRED");
    assert.ok(r.strategy?.reviewReasons.includes("OFFICIAL_CADASTRAL_LOOKUP_REQUIRED"));
  });

  it("returns UNRESOLVED for a land doc with no geo evidence", async () => {
    const r = await resolveLandDocument({
      metadata: metadata("صك ملكية - المالك أحمد بن محمد"),
    });
    assert.equal(r.status, "UNRESOLVED");
  });

  it("returns INVALID_DOCUMENT for blocked files", async () => {
    const r = await resolveLandDocument({
      metadata: { fileName: "malware.exe", sizeBytes: 100 },
    });
    assert.equal(r.status, "INVALID_DOCUMENT");
  });

  it("returns INVALID_DOCUMENT when no text extracted", async () => {
    const r = await resolveLandDocument({
      metadata: { fileName: "scan.png", mimeType: "image/png", sizeBytes: 500 },
    });
    assert.equal(r.status, "INVALID_DOCUMENT");
  });

  it("uses OCR text when native text is absent", async () => {
    const r = await resolveLandDocument({
      metadata: { fileName: "scan.png", mimeType: "image/png", sizeBytes: 500 },
      ocrText: "صك ملكية - المدينة الرياض - حي العليا",
    });
    assert.equal(r.status, "RESOLVED_GEOCODED");
    assert.equal(r.extraction.ocrUsed, true);
  });

  it("keeps OCR confidence separate from document and location confidence", async () => {
    const r = await resolveLandDocument({
      metadata: { fileName: "scan.png", mimeType: "image/png", sizeBytes: 500 },
      ocrText: "صك ملكية - الموقع 24.7136 46.6753",
      ocrConfidence: 42,
    });
    assert.equal(r.strategy?.confidence.extraction.score, 42);
    assert.notEqual(r.strategy?.confidence.document.score, 42);
    assert.ok((r.strategy?.confidence.location.score ?? 100) < 80);
  });

  it("never sets aiUsed true (no LLM coordinate fabrication)", async () => {
    const r = await resolveLandDocument({
      metadata: metadata("صك ملكية - الموقع: 24.7136 46.6753"),
    });
    assert.equal(r.extraction.aiUsed, false);
  });
});

describe("Resolve Store", () => {
  it("stores and retrieves a resolve result", () => {
    clearResolveResults();
    const r = {
      status: "UNRESOLVED" as const,
      locationConfidence: "UNRESOLVED" as const,
      boundaryConfidence: "UNRESOLVED" as const,
      crsConfidence: "UNKNOWN" as const,
      evidence: {
        explicitCoordinates: [],
        coordinatePairs: [],
        parcels: [],
        addresses: [],
        landmarks: [],
        sourceReferences: [],
      },
      candidates: [],
      warnings: [],
      document: { category: "UNKNOWN_LAND_DOCUMENT" as const, classificationConfidence: 0 },
      extraction: { method: "none" as const, charCount: 0, ocrUsed: false, aiUsed: false, geocodingUsed: false },
      steps: [],
    };
    const { id, result } = storeResolveResult(r);
    assert.match(id, /^resolve_/);
    assert.equal(getResolveResult(id), result);
    clearResolveResults();
    assert.equal(getResolveResult(id), null);
  });
});

describe("CRS conversion helpers", () => {
  it("converts UTM to WGS84 decimal", () => {
    const point = toWgs84Point("39N 450000 2600000", "utm", "utm", 39, true);
    assert.ok(point);
    assert.ok(point!.lat > 20 && point!.lat < 26);
    assert.ok(point!.lon > 49 && point!.lon < 52);
  });

  it("returns null for unparseable UTM", () => {
    const point = toWgs84Point("garbage", "utm", "utm", 39, true);
    assert.equal(point, null);
  });
});
