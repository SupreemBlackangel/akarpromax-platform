/**
 * OCR V2 runtime regression over the real regional corpus.
 *
 * Every assertion here runs the actual PDF bytes through the actual
 * production entry point (`extractDocumentData`) and the actual resolver.
 * The corpus files are real land records, so they are not committed: the
 * suite skips cleanly where they are absent. OCR also needs trained data;
 * where none is resolvable the OCR-dependent suites skip rather than fail.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { extractDocumentData, OCR_POLICY } from "@/lib/land/ocr/ocr-engine";
import { resolveTessdata } from "@/lib/land/ocr/tessdata";
import { resolveLandDocument } from "@/lib/land/intelligence/resolver";

const CORPUS_DIR = fileURLToPath(new URL("../../tmp/_scratch/holdout/", import.meta.url));
const H01 = "H01_Oman_Duqm_Krooki.pdf";
const H02 = "H02_Turkey_Manisa.pdf";
const H05 = "H05_Oman_Duqm_MasterPlan.pdf";
const H06 = "H06_UAE_AbuDhabi_SitePlan.pdf";

const available = (name: string) => existsSync(CORPUS_DIR + name);
const ocrReady = resolveTessdata("tur+eng").source !== "CDN";

async function runPipeline(name: string) {
  const bytes = readFileSync(CORPUS_DIR + name);
  const started = Date.now();
  const ocr = await extractDocumentData(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
    "application/pdf",
  );
  const result = await resolveLandDocument({
    metadata: { fileName: name, mimeType: "application/pdf", sizeBytes: bytes.byteLength, nativeText: ocr.text },
    positionedItems: ocr.positionedItems,
    ocrRejections: ocr.cellRejections,
  });
  return { ocr, result, elapsedMs: Date.now() - started };
}

describe("OCR V2 — H01 must not change", {
  skip: !available(H01) && "corpus not present",
  timeout: 120_000,
}, () => {
  it("still reads the krooki from its text layer, without spending OCR", async () => {
    const { ocr, result, elapsedMs } = await runPipeline(H01);
    assert.equal(ocr.ocrPages.length, 0, "no OCR page needed");
    assert.equal(result.status, "RESOLVED_EXPLICIT_COORDINATES");
    assert.equal(result.evidence.coordinatePairs.length, 4);
    assert.equal(result.crsSelection?.zone, 40);
    assert.equal(result.crsSelection?.hemisphere, "N");
    assert.equal(result.geometry?.type, "polygon");
    assert.equal(result.rowAccount?.reviewRequired, false);
    assert.ok(elapsedMs < 60_000);
  });
});

describe("OCR V2 — H02 Turkish raster krokisi", {
  skip: (!available(H02) && "corpus not present") || (!ocrReady && "no local trained data"),
  timeout: 150_000,
}, () => {
  it("recovers the coordinate table and asks for the zone instead of inventing one", async () => {
    const { ocr, result, elapsedMs } = await runPipeline(H02);

    // OCR actually ran, in Turkish.
    assert.ok(ocr.ocrPages.length >= 1, "OCR activated");
    assert.ok(ocr.quality.languagesUsed.some((lang) => lang.includes("tur")));
    // The evidence reached the shared pipeline: a survey ROI and a table.
    assert.ok(ocr.rois.length >= 1, "survey table ROI detected");
    const table = result.layoutTables?.[0];
    assert.ok(table, "layout table read from OCR evidence");
    assert.ok(table.rowCount >= 15, `coordinate rows ${table.rowCount}`);

    // The zone is NOT invented: the document names none, so the engine asks.
    assert.notEqual(result.status, "RESOLVED_EXPLICIT_COORDINATES");
    assert.equal(result.crsSelection?.required, true, "zone/CRS selection requested");
    assert.notEqual(result.crsSelection?.source, "DOCUMENT");
    assert.equal(result.geometry, undefined, "no forced polygon");

    // Row accounting balances even across OCR rejections.
    const account = result.rowAccount;
    assert.ok(account);
    assert.equal(account.detectedRows, account.acceptedRows + account.rejectedRows);

    // Substantially faster than the 150-second catastrophic stop.
    assert.ok(elapsedMs < 90_000, `elapsed ${elapsedMs}ms`);
    assert.equal(ocr.quality.pageCountOCRd >= 1, true);
  });
});

for (const name of [H05, H06]) {
  describe(`OCR V2 — ${name.slice(0, 3)} stays safe`, {
    skip: (!available(name) && "corpus not present") || (!ocrReady && "no local trained data"),
    timeout: 150_000,
  }, () => {
    it("produces no parcel, no polygon, and no invented coordinates", async () => {
      const { result } = await runPipeline(name);
      assert.equal(result.evidence.coordinatePairs.length, 0);
      assert.equal(result.geometry, undefined);
      assert.equal(result.parcel, undefined);
      if (result.crsSelection?.zone !== undefined) {
        // A zone may be named by the document's own text; it must never be
        // conjured from OCR noise as a bare letter fragment.
        assert.equal(result.crsSelection.source, "DOCUMENT");
      }
    });
  });
}

describe("OCR V2 — bounded work", () => {
  it("keeps the ceilings that stop a hung request", () => {
    assert.equal(OCR_POLICY.PAGE_TIMEOUT_MS, 30_000);
    assert.equal(OCR_POLICY.DOCUMENT_TIMEOUT_MS, 120_000);
  });
});
