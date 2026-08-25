import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkDocumentSecurity, isGeoRelevant, geoRelevanceScore } from "@/lib/geo/security-gate";
import { classifyDocument } from "@/lib/geo/classification";
import { extractText } from "@/lib/geo/text-extraction";
import {
  extractCoordinateEvidence,
  extractParcelEvidence,
  extractAddressEvidence,
  parseDmsLatLon,
  parseDecimalLatLon,
  parseHemisphereDecimalLatLon,
  parseUtmCoordinates,
} from "@/lib/geo/evidence-extraction";
import {
  detectCrs,
  convertUtmToWgs84,
  toWgs84,
  utmZoneFromLon,
} from "@/lib/geo/crs";
import {
  validateGeometry,
  isValidPoint,
  isPointInCountryBounds,
} from "@/lib/geo/geometry";
import { geocodeAddress, selectBestCandidate } from "@/lib/geo/geocoding";
import { runPipeline, resolveLocation } from "@/lib/geo/pipeline";

describe("Geo Security Gate", () => {
  it("allows a valid PDF upload", () => {
    const result = checkDocumentSecurity({
      fileName: "deed.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024,
    });
    assert.equal(result.passed, true);
  });

  it("rejects blocked extensions", () => {
    const result = checkDocumentSecurity({ fileName: "malware.exe", sizeBytes: 100 });
    assert.equal(result.passed, false);
    assert.match(result.reason ?? "", /BLOCKED_EXTENSION/);
  });

  it("rejects oversized files", () => {
    const result = checkDocumentSecurity({ fileName: "big.pdf", sizeBytes: 26 * 1024 * 1024 });
    assert.equal(result.passed, false);
    assert.match(result.reason ?? "", /FILE_TOO_LARGE/);
  });

  it("rejects empty files", () => {
    const result = checkDocumentSecurity({ fileName: "empty.pdf", sizeBytes: 0 });
    assert.equal(result.passed, false);
    assert.match(result.reason ?? "", /EMPTY_FILE/);
  });

  it("rejects unsupported mime", () => {
    const result = checkDocumentSecurity({
      fileName: "thing.zip",
      mimeType: "application/zip",
      sizeBytes: 100,
    });
    assert.equal(result.passed, false);
    assert.match(result.reason ?? "", /UNSUPPORTED_MIME/);
  });

  it("infers mime from extension when mime missing", () => {
    const result = checkDocumentSecurity({ fileName: "scan.png", sizeBytes: 500 });
    assert.equal(result.passed, true);
    assert.equal(result.normalizedMime, "image/png");
  });

  it("detects malicious script content", () => {
    const result = checkDocumentSecurity({
      fileName: "note.txt",
      mimeType: "text/plain",
      sizeBytes: 200,
      nativeText: "hello <script>alert(1)</script> world",
    });
    assert.equal(result.passed, false);
    assert.match(result.reason ?? "", /MALICIOUS_CONTENT/);
  });

  it("allows plain text content", () => {
    const result = checkDocumentSecurity({
      fileName: "note.txt",
      mimeType: "text/plain",
      sizeBytes: 200,
      nativeText: "صك ملكية قطعة 1234",
    });
    assert.equal(result.passed, true);
  });
});

describe("Geo Relevance Gate", () => {
  it("detects explicit coordinate keywords", () => {
    assert.equal(isGeoRelevant("Coordinates: 24.71 46.67", 2), true);
  });

  it("detects Arabic geo keywords", () => {
    assert.equal(isGeoRelevant("صك ملكية قطعة 1234 مخطط 5678", 2), true);
  });

  it("rejects irrelevant documents", () => {
    assert.equal(isGeoRelevant("فاتورة هاتف للشهر الماضي", 2), false);
  });

  it("scores weighted keywords higher", () => {
    const coordScore = geoRelevanceScore("longitude latitude coordinates");
    const weakScore = geoRelevanceScore("a plan document");
    assert.ok(coordScore > weakScore);
  });
});

describe("Geo Document Classification", () => {
  it("classifies title deeds", () => {
    const result = classifyDocument("صك ملكية صادر من وزارة العدل");
    assert.equal(result.category, "title_deed");
  });

  it("classifies land plans", () => {
    const result = classifyDocument("مخطط أرض رقم 1234 تقسيم المناطق");
    assert.equal(result.category, "land_plan");
  });

  it("classifies surveys", () => {
    const result = classifyDocument("survey boundary report topographic");
    assert.equal(result.category, "survey");
  });

  it("classifies address documents", () => {
    const result = classifyDocument("national address residence الحي");
    assert.equal(result.category, "address_document");
  });

  it("classifies contracts", () => {
    const result = classifyDocument("عقد إيجار واتفاقية بيع");
    assert.equal(result.category, "contract");
  });

  it("defaults to other with low confidence", () => {
    const result = classifyDocument("just some random prose here");
    assert.equal(result.category, "other");
    assert.ok(result.confidence < 0.3);
  });

  it("returns high confidence for strong matches", () => {
    const result = classifyDocument("deed title ownership deed");
    assert.equal(result.category, "title_deed");
    assert.ok(result.confidence >= 0.5);
  });
});

describe("Geo Text Extraction", () => {
  it("prefers sufficiently long native text over OCR", () => {
    const result = extractText({ nativeText: "native PDF text with enough useful characters", ocrText: "ocr" });
    assert.equal(result.method, "native_text");
    assert.equal(result.text, "native PDF text with enough useful characters");
  });

  it("prefers OCR when native PDF text is only a short fragment", () => {
    const result = extractText({ nativeText: "native", ocrText: "complete OCR result" });
    assert.equal(result.method, "ocr");
  });

  it("falls back to OCR when no native text", () => {
    const result = extractText({ ocrText: "ocr result" });
    assert.equal(result.method, "ocr");
  });

  it("falls back to vision when only vision text", () => {
    const result = extractText({ visionText: "vision result" });
    assert.equal(result.method, "vision");
  });

  it("returns none when no text source", () => {
    const result = extractText({});
    assert.equal(result.method, "none");
    assert.equal(result.charCount, 0);
  });

  it("normalizes Arabic presentation forms extracted from PDFs", () => {
    const result = extractText({ nativeText: "ﺗﻘﺮﻳﺮ ﻣﺴﺎﺣﻲ - ﺻﻚ ﻣﻠﻜﻴﺔ ﺃﺭﺽ" });
    assert.equal(result.method, "native_text");
    assert.equal(result.text, "تقرير مساحي - صك ملكية أرض");
  });
});

describe("Geo Coordinate Evidence Extraction", () => {
  it("extracts decimal lat/lon", () => {
    const evidence = extractCoordinateEvidence("point is 24.7136, 46.6753 here");
    assert.equal(evidence.length, 1);
    assert.equal(evidence[0].format, "decimal");
    assert.ok(Math.abs(evidence[0].point!.lat - 24.7136) < 0.0001);
    assert.ok(Math.abs(evidence[0].point!.lon - 46.6753) < 0.0001);
  });

  it("parses PDF-style longitude/latitude with suffix hemispheres", () => {
    const point = parseHemisphereDecimalLatLon("39.20592066741188 E 21.885762907392643 N");
    assert.ok(point);
    assert.ok(Math.abs(point.lat - 21.885762907392643) < 1e-12);
    assert.ok(Math.abs(point.lon - 39.20592066741188) < 1e-12);
  });

  it("parses decimal with swapped hemisphere", () => {
    const p = parseDecimalLatLon("97.51, 24.6753");
    assert.ok(p);
    assert.ok(Math.abs(p!.lat - 24.6753) < 0.0001);
    assert.ok(Math.abs(p!.lon - 97.51) < 0.0001);
  });

  it("rejects out-of-range longitude", () => {
    const p = parseDecimalLatLon("24.7, 246.6");
    assert.equal(p, null);
  });

  it("does not treat table dimensions or dates as decimal coordinates", () => {
    const evidence = extractCoordinateEvidence("1447/07/14 — الأبعاد 40 40 15 15");
    assert.equal(evidence.length, 0);
  });

  it("parses DMS coordinates", () => {
    const p = parseDmsLatLon('24\u00b042\'51.7"N 46\u00b043\'26.7"E');
    assert.ok(p);
    assert.ok(Math.abs(p!.lat - 24.71436) < 0.001);
    assert.ok(Math.abs(p!.lon - 46.72408) < 0.001);
  });

  it("handles DMS with southern/western hemispheres", () => {
    const p = parseDmsLatLon('33\u00b052\'S 151\u00b012\'E');
    assert.ok(p);
    assert.ok(p!.lat < 0);
    assert.ok(p!.lon > 0);
  });

  it("extracts UTM coordinates", () => {
    const parsed = parseUtmCoordinates("38N 400000 3860000");
    assert.ok(parsed);
    assert.equal(parsed!.zone, 38);
    assert.equal(parsed!.northernHemisphere, true);
  });

  it("extracts UTM evidence with zone letter", () => {
    const evidence = extractCoordinateEvidence("UTM zone 38S 500000 1000000");
    assert.equal(evidence.length, 1);
    assert.equal(evidence[0].format, "utm");
  });
});

describe("Geo Parcel Evidence Extraction", () => {
  it("extracts Arabic parcel numbers", () => {
    const parcels = extractParcelEvidence("قطعة رقم 1234");
    assert.equal(parcels.length, 1);
    assert.equal(parcels[0].parcelId, "1234");
  });

  it("extracts Arabic plan numbers", () => {
    const parcels = extractParcelEvidence("مخطط رقم 5678");
    assert.ok(parcels.some((p) => p.planId === "5678"));
  });

  it("extracts English parcel references", () => {
    const parcels = extractParcelEvidence("parcel #9876");
    assert.ok(parcels.some((p) => p.parcelId === "9876"));
  });

  it("extracts English plot references", () => {
    const parcels = extractParcelEvidence("plot 456");
    assert.ok(parcels.some((p) => p.plotId === "456"));
  });

  it("deduplicates parcel evidence", () => {
    const parcels = extractParcelEvidence("قطعة 1234 و قطعة 1234");
    assert.equal(parcels.length, 1);
  });
});

describe("Geo Address Evidence Extraction", () => {
  it("extracts city names", () => {
    const addresses = extractAddressEvidence("مدينة الرياض");
    assert.ok(addresses.some((a) => a.city === "الرياض"));
  });

  it("extracts districts", () => {
    const addresses = extractAddressEvidence("حي العليا الرياض");
    assert.ok(addresses.some((a) => a.district === "العليا"));
  });

  it("extracts streets", () => {
    const addresses = extractAddressEvidence("شارع الملك فهد");
    assert.ok(addresses.some((a) => a.street === "الملك فهد"));
  });

  it("extracts postal codes", () => {
    const addresses = extractAddressEvidence("postal 11564");
    assert.ok(addresses.some((a) => a.postalCode === "11564"));
  });

  it("extracts governorates", () => {
    const addresses = extractAddressEvidence("مكة المكرمة");
    assert.ok(addresses.some((a) => a.city === "مكة المكرمة"));
  });
});

describe("Geo CRS Detection", () => {
  it("detects UTM from zone + hemisphere", () => {
    const result = detectCrs({ format: "utm", raw: "38N 400000 3860000" });
    assert.equal(result.kind, "utm");
    assert.equal(result.zone, 38);
    assert.equal(result.northernHemisphere, true);
  });

  it("detects WGS84 from declaration", () => {
    const result = detectCrs("Latitude 24.7 Longitude 46.6");
    assert.equal(result.kind, "wgs84");
  });

  it("detects WGS84 from hemisphere letters", () => {
    const result = detectCrs('24\u00b042\'N 46\u00b043\'E');
    assert.equal(result.kind, "wgs84");
  });

  it("returns unknown when no indicators", () => {
    const result = detectCrs("no coordinate info here");
    assert.equal(result.kind, "unknown");
  });
});

describe("Geo UTM to WGS84 Conversion", () => {
  it("computes a sane zone from longitude", () => {
    assert.equal(utmZoneFromLon(46.6), 38);
    assert.equal(utmZoneFromLon(39.1), 37);
  });

  it("converts a known UTM point near Riyadh to WGS84", () => {
    const p = convertUtmToWgs84(38, 669000, 2734000, true);
    assert.ok(Math.abs(p.lat - 24.711) < 0.01);
    assert.ok(Math.abs(p.lon - 46.671) < 0.01);
  });

  it("handles southern hemisphere", () => {
    const p = convertUtmToWgs84(56, 500000, 8000000, false);
    assert.ok(p.lat < 0);
  });

  it("toWgs84 converts decimal evidence", () => {
    const result = toWgs84({ format: "decimal", raw: "24.7136, 46.6753" });
    assert.ok(result);
    assert.ok(Math.abs(result!.point.lat - 24.7136) < 0.0001);
  });

  it("toWgs84 converts UTM evidence", () => {
    const result = toWgs84({ format: "utm", raw: "38N 655000 2734000" });
    assert.ok(result);
    assert.ok(Math.abs(result!.point.lat - 24.7) < 0.1);
  });

  it("toWgs84 converts DMS evidence", () => {
    const result = toWgs84({ format: "dms", raw: '24\u00b042\'N 46\u00b043\'E' });
    assert.ok(result);
    assert.ok(Math.abs(result!.point.lat - 24.7) < 0.001);
  });

  it("returns null for unparseable evidence", () => {
    const result = toWgs84({ format: "decimal", raw: "not a coordinate" });
    assert.equal(result, null);
  });
});

describe("Geo Geometry Validation", () => {
  it("accepts a valid point", () => {
    const result = validateGeometry({ type: "point", coordinates: { lat: 24.7, lon: 46.6 } });
    assert.equal(result.valid, true);
  });

  it("rejects an out-of-range latitude", () => {
    assert.equal(isValidPoint({ lat: 95, lon: 46 }), false);
  });

  it("rejects an out-of-range longitude", () => {
    assert.equal(isValidPoint({ lat: 24, lon: 190 }), false);
  });

  it("rejects NaN coordinates", () => {
    assert.equal(isValidPoint({ lat: NaN, lon: 46 }), false);
  });

  it("checks country bounds", () => {
    assert.equal(isPointInCountryBounds({ lat: 24.7, lon: 46.6 }, "SA"), true);
    assert.equal(isPointInCountryBounds({ lat: 10, lon: 10 }, "SA"), false);
  });

  it("validates polygon closure", () => {
    const open = validateGeometry({
      type: "polygon",
      coordinates: [
        { lat: 24, lon: 46 },
        { lat: 25, lon: 46 },
        { lat: 25, lon: 47 },
      ],
    });
    assert.equal(open.valid, false);
    assert.ok(open.errors.some((e) => /closed/.test(e)));
  });

  it("accepts a closed valid polygon", () => {
    const closed = validateGeometry({
      type: "polygon",
      coordinates: [
        { lat: 24, lon: 46 },
        { lat: 25, lon: 46 },
        { lat: 25, lon: 47 },
        { lat: 24, lon: 47 },
        { lat: 24, lon: 46 },
      ],
    });
    assert.equal(closed.valid, true);
  });

  it("rejects a degenerate polygon with zero area", () => {
    const degenerate = validateGeometry({
      type: "polygon",
      coordinates: [
        { lat: 24, lon: 46 },
        { lat: 24.5, lon: 46 },
        { lat: 24, lon: 46 },
        { lat: 24, lon: 46 },
      ],
    });
    assert.equal(degenerate.valid, false);
  });

  it("requires at least 2 points for linestring", () => {
    const result = validateGeometry({ type: "linestring", coordinates: [{ lat: 24, lon: 46 }] });
    assert.equal(result.valid, false);
  });
});

describe("Geo Geocoding", () => {
  it("resolves a known city from address evidence", () => {
    const candidates = geocodeAddress({
      addresses: [{ city: "الرياض", raw: "الرياض", source: "text" }],
      parcels: [],
    });
    assert.ok(candidates.length > 0);
    assert.equal(candidates[0].label, "الرياض");
    assert.ok(candidates[0].score > 0.7);
  });

  it("sorts candidates by score descending", () => {
    const candidates = geocodeAddress({
      addresses: [{ city: "جدة", raw: "جدة", source: "text" }],
      parcels: [],
    });
    for (let i = 1; i < candidates.length; i++) {
      assert.ok(candidates[i - 1].score >= candidates[i].score);
    }
  });

  it("selects the best candidate", () => {
    const candidates = geocodeAddress({
      addresses: [{ city: "الرياض", raw: "الرياض", source: "text" }],
      parcels: [],
    });
    const best = selectBestCandidate(candidates);
    assert.ok(best);
    assert.equal(best!.label, "الرياض");
  });

  it("adds parcel candidates with moderate score", () => {
    const candidates = geocodeAddress({
      addresses: [],
      parcels: [{ parcelId: "1234", raw: "قطعة 1234", source: "text" }],
    });
    assert.ok(candidates.some((c) => c.source === "parcel"));
    assert.ok(candidates.some((c) => c.score === 0.45));
  });

  it("returns empty for no evidence", () => {
    const candidates = geocodeAddress({ addresses: [], parcels: [] });
    assert.equal(candidates.length, 0);
  });
});

describe("Geo Pipeline Orchestration", () => {
  it("blocks uploads that fail the security gate", () => {
    const { gate, result } = runPipeline({
      metadata: { fileName: "x.exe", sizeBytes: 10 },
    });
    assert.equal(gate.securityPassed, false);
    assert.ok(result!.location.status === "failed");
  });

  it("resolves explicit decimal coordinates", () => {
    const { result } = runPipeline({
      metadata: {
        fileName: "deed.pdf",
        nativeText: "coordinates 24.7136, 46.6753 صك ملكية",
      },
    });
    assert.equal(result!.location.status, "resolved");
    if (result!.location.status === "resolved") {
      assert.equal(result!.location.path, "coordinates");
      assert.ok(Math.abs(result!.location.point.lat - 24.7136) < 0.001);
    }
  });

  it("resolves DMS coordinates through conversion", () => {
    const { result } = runPipeline({
      metadata: {
        fileName: "deed.pdf",
        nativeText: 'صك ملكية 24\u00b042\'51.7"N 46\u00b043\'26.7"E',
      },
    });
    assert.equal(result!.location.status, "resolved");
    if (result!.location.status === "resolved") {
      assert.ok(Math.abs(result!.location.point.lat - 24.71436) < 0.001);
    }
  });

  it("resolves UTM coordinates through CRS conversion", () => {
    const { result } = runPipeline({
      metadata: {
        fileName: "survey.pdf",
        nativeText: "UTM 38N 669000 2734000 survey boundary",
      },
    });
    assert.equal(result!.location.status, "resolved");
    if (result!.location.status === "resolved") {
      assert.ok(result!.location.steps.some((s) => /wgs84/i.test(s)));
    }
  });

  it("falls back to geocoding when no explicit coordinates", () => {
    const { result } = runPipeline({
      metadata: {
        fileName: "address.docx",
        nativeText: "حي العليا مدينة الرياض",
      },
    });
    assert.equal(result!.location.status, "resolved");
    if (result!.location.status === "resolved") {
      assert.equal(result!.location.path, "geocoding");
      assert.equal(result!.location.point.lat, 24.7136);
    }
  });

  it("produces partial result for parcel-only evidence", () => {
    const { result } = runPipeline({
      metadata: {
        fileName: "plan.pdf",
        nativeText: "مخطط رقم 5678",
      },
    });
    assert.equal(result!.location.status, "partial");
  });

  it("fails when no geo evidence present", () => {
    const { result } = runPipeline({
      metadata: {
        fileName: "note.txt",
        nativeText: "فاتورة هاتف عادية",
      },
    });
    assert.equal(result!.location.status, "failed");
  });

  it("rejects coordinates outside country bounds", () => {
    const { result } = runPipeline({
      metadata: {
        fileName: "deed.pdf",
        nativeText: "coordinates 10.0, 10.0",
      },
      countryCode: "SA",
    });
    assert.equal(result!.location.status, "failed");
  });

  it("uses OCR text when native text missing", () => {
    const { result } = runPipeline({
      metadata: { fileName: "scan.jpg", mimeType: "image/jpeg", sizeBytes: 2048 },
      ocrText: "صك ملكية قطعة 7777",
    });
    assert.equal(result!.extraction.method, "ocr");
    assert.equal(result!.location.status, "partial");
  });

  it("runs classification on extracted text", () => {
    const { result } = runPipeline({
      metadata: { fileName: "d.pdf", nativeText: "صك ملكية قطعة 1234" },
    });
    assert.equal(result!.document.category, "title_deed");
  });

  it("resolveLocation returns failed for empty evidence", () => {
    const result = resolveLocation({ explicitCoordinates: [], parcels: [], addresses: [] });
    assert.equal(result.status, "failed");
  });
});
