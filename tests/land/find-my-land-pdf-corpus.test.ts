import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

import { resolveLandDocument } from "@/lib/land/intelligence/resolver";

const FIXTURE_DIR = fileURLToPath(new URL("../fixtures/find-my-land/", import.meta.url));

async function extractNativeText(fileName: string): Promise<string> {
  const data = new Uint8Array(await readFile(`${FIXTURE_DIR}${fileName}`));
  const pdf = await getDocument({ data }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items
      .filter((item): item is typeof item & { str: string } => "str" in item)
      .map((item) => item.str)
      .join(" "));
  }
  return pages.join("\n").trim();
}

async function resolveFixture(fileName: string, options: { utmZone?: number; utmHemisphere?: "N" | "S" } = {}) {
  const nativeText = await extractNativeText(fileName);
  return resolveLandDocument({
    metadata: {
      fileName,
      mimeType: "application/pdf",
      sizeBytes: (await readFile(`${FIXTURE_DIR}${fileName}`)).byteLength,
      nativeText,
    },
    ...options,
  });
}

describe("Find My Land safe PDF regression corpus", () => {
  it("extracts a text WGS84 PDF and preserves boundary point order", async () => {
    const result = await resolveFixture("01-text-wgs84.pdf");
    assert.equal(result.evidence.coordinatePairs.length, 4);
    assert.deepEqual(result.evidence.coordinatePairs[0], { lat: 24.7136, lon: 46.6753 });
    assert.deepEqual(result.evidence.coordinatePairs[3], { lat: 24.7136, lon: 46.6757 });
    assert.equal(result.geometry?.type, "polygon");
    assert.deepEqual(result.geometry?.coordinates.slice(0, 4), result.evidence.coordinatePairs);
  });

  it("extracts an Arabic survey PDF without OCR and resolves its coordinate table", async () => {
    const nativeText = await extractNativeText("02-arabic-wgs84.pdf");
    assert.match(nativeText, /[ء-ي]/);
    const result = await resolveFixture("02-arabic-wgs84.pdf");
    assert.equal(result.extraction.method, "native_text");
    assert.equal(result.evidence.coordinatePairs.length, 4);
    assert.equal(result.geometry?.type, "polygon");
  });

  it("detects explicit UTM zone and converts every row to WGS84", async () => {
    const result = await resolveFixture("03-explicit-utm.pdf");
    assert.equal(result.crsConfidence, "DETECTED");
    assert.equal(result.strategy?.path, "EXPLICIT_UTM");
    assert.ok(result.evidence.explicitCoordinates.every((item) => item.crsHint === "utm"));
    assert.equal(result.evidence.coordinatePairs.length, 4);
    assert.equal(result.geometry?.type, "polygon");
    assert.ok(result.center && result.center.lat > 24 && result.center.lat < 25);
    assert.ok(result.center && result.center.lon > 46 && result.center.lon < 47);
  });

  it("refuses zone-less UTM until the user supplies zone and hemisphere", async () => {
    const pending = await resolveFixture("04-zone-less-utm.pdf");
    assert.equal(pending.status, "PARTIALLY_RESOLVED");
    assert.equal(pending.crsSelection?.required, true);
    assert.equal(pending.evidence.coordinatePairs.length, 0);
    assert.equal(pending.geometry, undefined);

    const selected = await resolveFixture("04-zone-less-utm.pdf", { utmZone: 40, utmHemisphere: "N" });
    assert.equal(selected.crsSelection?.source, "USER");
    assert.equal(selected.evidence.coordinatePairs.length, 4);
    assert.equal(selected.geometry?.type, "polygon");
  });

  it("does not turn unrelated number groups into coordinates or a map polygon", async () => {
    const result = await resolveFixture("05-multiple-number-groups.pdf");
    assert.equal(result.evidence.coordinatePairs.length, 0);
    assert.equal(result.geometry, undefined);
    assert.match(result.warnings.join(" "), /unlabelled numeric pairs ignored/i);
  });

  it("keeps an incomplete two-point result in review without a polygon", async () => {
    const result = await resolveFixture("06-incomplete-two-points.pdf");
    assert.equal(result.evidence.coordinatePairs.length, 2);
    assert.equal(result.geometry, undefined);
    assert.ok(result.strategy?.requiresReview);
  });

  it("detects a valid image-only PDF as having no native text", async () => {
    const nativeText = await extractNativeText("07-no-extractable-text.pdf");
    assert.equal(nativeText, "");
    const result = await resolveLandDocument({
      metadata: {
        fileName: "07-no-extractable-text.pdf",
        mimeType: "application/pdf",
        sizeBytes: (await readFile(`${FIXTURE_DIR}07-no-extractable-text.pdf`)).byteLength,
        nativeText,
      },
    });
    assert.equal(result.status, "INVALID_DOCUMENT");
    assert.equal(result.geometry, undefined);
  });

  it("rejects a malformed PDF before coordinate analysis", async () => {
    await assert.rejects(() => extractNativeText("08-invalid-pdf.pdf"));
  });

  it("reads a LINE-topology survey sheet whose text layer lost its line breaks", async () => {
    // pdfjs joins a page's text items with spaces, so a real survey sheet
    // arrives as one long line. The row structure has to be recovered.
    const nativeText = await extractNativeText("09-line-topology-utm.pdf");
    assert.equal(nativeText.split(/\r?\n/).length, 1, "the fixture reproduces a single-line text layer");

    const result = await resolveFixture("09-line-topology-utm.pdf");
    assert.equal(result.evidence.coordinatePairs.length, 4);
    assert.equal(result.crsSelection?.zone, 40);
    assert.equal(result.crsSelection?.hemisphere, "N");
    assert.equal(result.crsSelection?.epsg, 32640);
    assert.equal(result.parcel?.sequenceEvidence, "EXPLICIT_LINE_TOPOLOGY");
    assert.equal(result.parcel?.closedByTopology, true);
    assert.deepEqual(result.parcel?.vertices.map((vertex) => vertex.pointNumber), ["1", "2", "3", "4"]);
    assert.equal(result.geometry?.type, "polygon");
  });

  it("validates that sheet's distances and registered area", async () => {
    const result = await resolveFixture("09-line-topology-utm.pdf");
    const boundary = result.parcel?.boundary;
    assert.ok(boundary);
    assert.deepEqual(
      boundary.segments.map((segment) => segment.documentLengthMeters),
      [30, 10, 30, 10],
    );
    assert.equal(boundary.sideLengthComparison?.verdict, "MATCH");
    assert.ok(Math.abs((boundary.areaSquareMeters ?? 0) - 300) < 1);
    assert.equal(boundary.areaComparison?.verdict, "MATCH");
  });

  it("reads a POINT table that lists northing before easting", async () => {
    const result = await resolveFixture("10-point-table-northing-first.pdf");
    assert.equal(result.evidence.coordinatePairs.length, 4);
    assert.equal(result.crsSelection?.zone, 40);
    assert.equal(result.parcel?.boundary.documentOrderValid, true);
    assert.ok(Math.abs((result.parcel?.boundary.areaSquareMeters ?? 0) - 300) < 1);
  });

  it("keeps control stations out of the parcel boundary", async () => {
    const result = await resolveFixture("11-two-coordinate-tables.pdf");
    assert.equal(result.evidence.coordinatePairs.length, 4, "only the parcel table is drawn");
    assert.ok((result.documentIntelligence?.surveyTables?.length ?? 0) >= 2);
    assert.ok(Math.abs((result.parcel?.boundary.areaSquareMeters ?? 0) - 300) < 1);
  });
});
