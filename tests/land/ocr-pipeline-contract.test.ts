import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { OCR_PIPELINE_VERSION, OCR_POLICY } from "@/lib/land/ocr/ocr-engine";

const ENGINE = readFileSync(fileURLToPath(new URL("../../lib/land/ocr/ocr-engine.ts", import.meta.url)), "utf8");
const ANALYZE = readFileSync(fileURLToPath(new URL("../../app/api/land/analyze/route.ts", import.meta.url)), "utf8");
const RESOLVER = readFileSync(fileURLToPath(new URL("../../lib/land/intelligence/resolver.ts", import.meta.url)), "utf8");

describe("OCR pipeline contract", () => {
  it("is versioned separately from the coordinate engine", () => {
    assert.match(OCR_PIPELINE_VERSION, /^2\.\d+\.\d+$/);
  });

  it("keeps every safety ceiling exactly where the baseline set it", () => {
    assert.equal(OCR_POLICY.PAGE_TIMEOUT_MS, 30_000);
    assert.equal(OCR_POLICY.DOCUMENT_TIMEOUT_MS, 120_000);
    assert.equal(OCR_POLICY.MAX_CONCURRENT_WORKERS, 2);
    assert.match(ANALYZE, /REQUEST_TIMEOUT_MS = 150_000/);
  });

  it("never hands the Node worker a Blob", () => {
    // A Blob crashes the tesseract worker at the event level in Node; the
    // engine passes Buffers only.
    assert.doesNotMatch(ENGINE, /recognize\(\s*new Blob/);
    assert.match(ENGINE, /worker\.recognize\(Buffer\.from/);
  });

  it("registers a worker error handler so a worker crash cannot kill the process", () => {
    assert.match(ENGINE, /errorHandler/);
  });

  it("terminates every worker it starts", () => {
    assert.match(ENGINE, /terminateAll/);
    assert.match(ENGINE, /finally\s*\{\s*await pool\.terminateAll\(\)/);
  });

  it("has no first-N-pages rule anywhere", () => {
    assert.doesNotMatch(ENGINE, /slice\(0,\s*[36]\)/);
    assert.match(ENGINE, /selectPagesForOcr/);
  });

  it("feeds OCR cell rejections into the resolver's row accounting", () => {
    assert.match(ANALYZE, /ocrRejections: ocr\.cellRejections/);
    assert.match(RESOLVER, /input\.ocrRejections/);
  });

  it("bounds ROI work explicitly", () => {
    assert.equal(typeof OCR_POLICY.MAX_ROI_PASSES, "number");
    assert.ok(OCR_POLICY.MAX_ROI_PASSES <= 8);
  });

  it("exposes an explainable quality object, not a bare score", () => {
    assert.match(ENGINE, /tableQuality/);
    assert.match(ENGINE, /languagesUsed/);
    assert.match(ENGINE, /preprocessingUsed/);
  });

  it("logs diagnostics without document content", () => {
    const diagnostics = ENGINE.slice(ENGINE.indexOf("function logOcrDiagnostics"), ENGINE.indexOf("/** Per-page evidence"));
    assert.doesNotMatch(diagnostics, /text|owner|words/i);
  });
});
