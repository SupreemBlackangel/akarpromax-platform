/**
 * The browser is where Find My Land actually reads a document, so the wiring
 * between the client and the shared readers is part of the contract. These are
 * source assertions: they fail the moment the page goes back to sending a flat
 * string, or to deciding on OCR by how long that string is.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const CLIENT = readFileSync(fileURLToPath(new URL("../../src/components/tools/FindMyLand.tsx", import.meta.url)), "utf8");
const ROUTE = readFileSync(fileURLToPath(new URL("../../app/api/land/resolve/route.ts", import.meta.url)), "utf8");

describe("Find My Land client wiring", () => {
  it("keeps the position of every word it reads from the PDF text layer", () => {
    assert.match(CLIENT, /fromPdfjsTextItems\(pageNumber, content\.items/);
    assert.match(CLIENT, /positionedItems\.push\(\.\.\.items\)/);
  });

  it("decides on OCR from page evidence, not from a text-length threshold", () => {
    assert.match(CLIENT, /selectPagesForOcr\(pageStats\)/);
    assert.doesNotMatch(CLIENT, /pagesNeedingOcr/, "the old length threshold is gone");
    assert.doesNotMatch(CLIENT, /replace\(\/\\s\/g, ""\)\.length < 80/, "no whole-document length rule remains");
  });

  it("turns OCR words into the same positioned evidence as the text layer", () => {
    assert.match(CLIENT, /fromOcrWordBoxes\(frame\.page, parseTesseractTsv\(result\.tsv\)/);
    assert.match(CLIENT, /imageWidth: frame\.imageWidth/);
  });

  it("chooses OCR languages from the document", () => {
    assert.match(CLIENT, /chooseOcrLanguages\(/);
    assert.doesNotMatch(CLIENT, /createWorker\("ara\+eng"/, "the language is no longer hard-coded");
  });

  it("sends the positioned evidence to the resolver, and re-sends it on a coordinate-system correction", () => {
    const sends = CLIENT.match(/positionedItems:/g) ?? [];
    assert.ok(sends.length >= 3, `expected the payload to carry positionedItems, saw ${sends.length} references`);
    // Re-running for a different zone or hemisphere leaves the document text
    // alone, so the word boxes still describe it and must travel again —
    // without them the resolver falls back to a weaker reading of the table.
    assert.match(CLIENT, /positionedItems: overrideText \? undefined : analysis\.positionedItems/);
  });

  it("drops the positioned evidence when the reader corrects a value", () => {
    // A typed-over number rewrites the document text, and the word boxes, the
    // OCR output and the page images all still describe the text before the
    // correction. Sending them lets the resolver prefer that stale reading and
    // the correction disappears with no error — the worst possible outcome for
    // somebody fixing a misread digit.
    assert.match(CLIENT, /ocrText: overrideText \? undefined : \(analysis\.ocrText \|\| undefined\)/);
    assert.match(CLIENT, /ocrConfidence: overrideText \? undefined : analysis\.ocrConfidence/);
    assert.match(CLIENT, /pages: !overrideText && documentPages\.length > 1/);
    assert.match(CLIENT, /nativeText: overrideText \|\| analysis\.nativeText/);
  });

  it("a correction is a text edit, and only applies when the value is unambiguous", () => {
    // Two identical numbers in one document make "which one did you click"
    // unanswerable, and replacing the wrong one moves a different corner.
    assert.match(CLIENT, /const occurrences = text\.split\(previous\)\.length - 1;/);
    assert.match(CLIENT, /if \(occurrences !== 1\)/);
  });

  it("typed coordinates take the same route as a scanned plan", () => {
    // No second resolve endpoint: a parallel manual pipeline would be a second
    // implementation of the part that must not drift.
    const resolveCalls = CLIENT.match(/fetch\("\/api\/land\/resolve"/g) ?? [];
    assert.ok(resolveCalls.length >= 3, `typed coordinates reuse the resolve route, saw ${resolveCalls.length}`);
    assert.doesNotMatch(CLIENT, /\/api\/land\/manual/);
    assert.match(CLIENT, /pastedRowsAsDocumentText\(pastedRows/);
  });

  it("validates positioned evidence on the way in rather than trusting it", () => {
    assert.match(ROUTE, /sanitizePositionedItems\(input\.positionedItems\)/);
  });
});
