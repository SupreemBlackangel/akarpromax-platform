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

  it("sends the positioned evidence to the resolver, and re-sends it on a correction", () => {
    const sends = CLIENT.match(/positionedItems:/g) ?? [];
    assert.ok(sends.length >= 3, `expected the payload to carry positionedItems, saw ${sends.length} references`);
    assert.match(CLIENT, /positionedItems: analysis\.positionedItems/);
  });

  it("validates positioned evidence on the way in rather than trusting it", () => {
    assert.match(ROUTE, /sanitizePositionedItems\(input\.positionedItems\)/);
  });
});
