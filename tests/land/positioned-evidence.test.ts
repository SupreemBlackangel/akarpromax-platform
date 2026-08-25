import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MAX_POSITIONED_ITEMS,
  compactPositionedItems,
  fromOcrWordBoxes,
  parseTesseractTsv,
  sanitizePositionedItems,
} from "@/lib/land/intelligence/positioned-evidence";

describe("OCR words become the same evidence as PDF text", () => {
  it("flips the raster origin so OCR and text-layer rows share a frame", () => {
    const [item] = fromOcrWordBoxes(2, [{ text: "567350.49", left: 100, top: 200, width: 80, height: 20 }], {
      pageWidth: 595, pageHeight: 842, imageWidth: 1190, imageHeight: 1684,
    });
    assert.equal(item.page, 2);
    assert.equal(item.x, 50, "x is scaled into page units");
    assert.equal(item.y, (1684 - 200 - 20) / 2, "y counts upward from the foot of the page");
    assert.equal(item.width, 40);
  });

  it("drops words with no text or no geometry", () => {
    const items = fromOcrWordBoxes(1, [
      { text: "  ", left: 1, top: 1, width: 1, height: 1 },
      { text: "ok", left: Number.NaN, top: 1, width: 1, height: 1 },
      { text: "keep", left: 10, top: 10, width: 10, height: 10 },
    ], { pageWidth: 100, pageHeight: 100, imageWidth: 100, imageHeight: 100 });
    assert.equal(items.length, 1);
    assert.equal(items[0].text, "keep");
  });

  it("returns nothing when the raster size is unknown", () => {
    assert.deepEqual(
      fromOcrWordBoxes(1, [{ text: "a", left: 0, top: 0, width: 1, height: 1 }], { pageWidth: 10, pageHeight: 10, imageWidth: 0, imageHeight: 0 }),
      [],
    );
  });

  it("reads word rows out of Tesseract TSV and ignores the rest", () => {
    const tsv = [
      "level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext",
      "4\t1\t1\t1\t1\t0\t0\t0\t0\t0\t-1\t",
      "5\t1\t1\t1\t1\t1\t100\t200\t80\t20\t91\t567350.49",
      "5\t1\t1\t1\t1\t2\t200\t200\t90\t20\t88\t2170025.51",
      "5\t1\t1\t1\t1\t3\t300\t200\t10\t20\t20\t   ",
    ].join("\n");
    const words = parseTesseractTsv(tsv);
    assert.equal(words.length, 2);
    assert.equal(words[0].text, "567350.49");
    assert.equal(words[1].confidence, 88);
    assert.deepEqual(parseTesseractTsv(null), []);
  });
});

describe("Positioned items arriving from outside the process", () => {
  it("keeps only well-formed items and rounds them", () => {
    const items = sanitizePositionedItems([
      { page: 1, x: 10.123456, y: 20.987654, width: 5, height: 6, text: "ok" },
      { page: 0, x: 1, y: 1, width: 1, height: 1, text: "bad page" },
      { page: 1, x: "x", y: 1, width: 1, height: 1, text: "bad x" },
      { page: 1, x: 1, y: 1, width: 1, height: 1, text: "   " },
      "not an object",
    ]);
    assert.equal(items.length, 1);
    assert.equal(items[0].x, 10.12);
    assert.equal(items[0].y, 20.99);
  });

  it("caps the number of items it will accept", () => {
    const many = Array.from({ length: MAX_POSITIONED_ITEMS + 500 }, (_, index) => ({
      page: 1, x: index, y: index, width: 1, height: 1, text: "t",
    }));
    assert.equal(sanitizePositionedItems(many).length, MAX_POSITIONED_ITEMS);
    assert.equal(sanitizePositionedItems(many, 10).length, 10);
  });

  it("ignores anything that is not a list", () => {
    assert.deepEqual(sanitizePositionedItems(undefined), []);
    assert.deepEqual(sanitizePositionedItems({ page: 1 }), []);
  });

  it("compacts for transport without reordering", () => {
    const compacted = compactPositionedItems([
      { page: 1, x: 1.23456, y: 2.34567, width: 3.45678, height: 4.56789, text: "b" },
      { page: 1, x: 5, y: 6, width: 7, height: 8, text: "a" },
    ]);
    assert.deepEqual(compacted.map((item) => item.text), ["b", "a"]);
    assert.equal(compacted[0].x, 1.23);
  });
});
