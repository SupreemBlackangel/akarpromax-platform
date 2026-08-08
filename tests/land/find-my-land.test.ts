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
  });

  it("returns PARTIALLY_RESOLVED when only parcel present", async () => {
    const r = await resolveLandDocument({
      metadata: metadata("صك ملكية - رقم القطعة 1234 - رقم المخطط 5678"),
    });
    assert.equal(r.status, "PARTIALLY_RESOLVED");
    assert.equal(r.parcelIdentifiers?.parcelId, "1234");
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
