// The pixel work behind OCR, now shared by the worker and the main-thread
// fallback. Two copies of a thresholding algorithm would drift and the tool
// would read a document differently depending on what the browser supported,
// so what matters here is that there is one implementation and it is correct.
import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_OCR_WIDTH,
  enhanceContrastStretch,
  medianFilter,
  otsuThreshold,
  processRaster,
  targetRasterSize,
} from "@/lib/land/ocr/preprocess";

/** An RGBA buffer from a list of grey values. */
function raster(values: number[]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(values.length * 4);
  values.forEach((value, index) => {
    data[index * 4] = data[index * 4 + 1] = data[index * 4 + 2] = value;
    data[index * 4 + 3] = 255;
  });
  return data;
}

const greys = (data: Uint8ClampedArray): number[] =>
  [...data].filter((_, index) => index % 4 === 0);

test("a small scan is upscaled, a large one is capped", () => {
  // A phone photo of a plan is often 4000px wide; above the cap OCR gains
  // nothing and the median filter costs four times as much.
  assert.deepEqual(targetRasterSize(4000, 2000), { width: MAX_OCR_WIDTH, height: 1000 });
  assert.equal(MAX_OCR_WIDTH, 2000);

  // A 900px scan is worth upscaling towards legibility.
  const small = targetRasterSize(900, 600);
  assert.ok(small.width > 900 && small.width <= MAX_OCR_WIDTH, `got ${small.width}`);
  // The aspect ratio survives, or the word boxes land on the wrong rows.
  assert.equal(small.height, Math.round((600 * small.width) / 900));
});

test("the aspect ratio is preserved at the cap", () => {
  const { width, height } = targetRasterSize(3000, 4500);
  assert.equal(width, MAX_OCR_WIDTH);
  assert.equal(height, 3000, "a portrait plan stays portrait");
});

test("a median filter removes a speck without moving an edge", () => {
  // A 3x3 of paper with one black scanner speck in the middle.
  const data = raster([255, 255, 255, 255, 0, 255, 255, 255, 255]);
  medianFilter(data, 3, 3, 3);
  assert.deepEqual(greys(data), [255, 255, 255, 255, 255, 255, 255, 255, 255], "the speck is gone");
});

test("Otsu finds the split between ink and paper", () => {
  const data = raster([10, 12, 8, 240, 245, 250]);
  const threshold = otsuThreshold(data);
  // The convention here is that the returned level is the LAST one counted as
  // background, and processRaster applies it as `value < threshold`. So on a
  // six-pixel toy the level that sits exactly on the boundary (12) falls on
  // the paper side. On a real scan the two clusters are hundreds of levels
  // apart and one boundary level is a sliver, which is why this has never
  // mattered — but the convention is worth pinning so a future change to the
  // comparison is a deliberate one.
  assert.equal(threshold, 12);
  assert.ok(threshold >= 12 && threshold < 240, `threshold ${threshold} lies between the clusters`);
});

test("a real gap between ink and paper is split cleanly", () => {
  // What a scan looks like: a block of ink, a block of paper, nothing between.
  // 10x10 with the top four rows inked, so the 3x3 median has whole
  // neighbourhoods to work in — the assertions skip the two rows either side
  // of the boundary, which the median legitimately mixes, and check the rest.
  const values: number[] = [];
  for (let row = 0; row < 10; row += 1) {
    for (let column = 0; column < 10; column += 1) {
      values.push(row < 4 ? 20 + (column % 5) : 225 + (column % 5));
    }
  }
  const data = raster(values);
  processRaster(data, 10, 10);
  const out = greys(data);
  const rowOf = (row: number) => out.slice(row * 10, row * 10 + 10);

  // Columns 0-8 of the inked rows come out black. Column 9 carries the
  // LIGHTEST ink level, which lands exactly on Otsu's returned level and so
  // falls on the paper side of `value < threshold`. On a real scan that level
  // is the anti-aliased edge of a stroke, so strokes come out a shade thinner
  // than the paper says — shipped behaviour, pinned here rather than changed,
  // because altering the comparison would change how every document already
  // read by this tool is read.
  for (const row of [0, 1, 2]) {
    assert.ok(rowOf(row).slice(0, 9).every((value) => value === 0), `row ${row} is ink`);
    assert.equal(rowOf(row)[9], 255, "the lightest ink level sits on the paper side");
  }
  for (const row of [5, 6, 7, 8, 9]) {
    assert.ok(rowOf(row).every((value) => value === 255), `row ${row} is all paper`);
  }
});

test("a faded photocopy is stretched across the full range", () => {
  const data = raster([100, 120, 140, 160]);
  enhanceContrastStretch(data);
  const out = greys(data);
  assert.equal(out[0], 0, "the darkest ink becomes black");
  assert.equal(out[3], 255, "the lightest paper becomes white");
});

test("a flat image is left alone rather than having noise amplified", () => {
  // Under ten levels of range there is no contrast to recover, and stretching
  // would manufacture edges that are not on the paper.
  const data = raster([128, 130, 132, 134]);
  enhanceContrastStretch(data);
  assert.deepEqual(greys(data), [128, 130, 132, 134]);
});

test("the whole pipeline leaves two tones and nothing between", () => {
  const data = raster([12, 20, 200, 240, 30, 210, 15, 250, 190]);
  processRaster(data, 3, 3);
  const distinct = new Set(greys(data));
  for (const value of distinct) {
    assert.ok(value === 0 || value === 255, `expected two-tone output, saw ${value}`);
  }
  assert.ok(distinct.size <= 2);
});

test("alpha is untouched — a transparent pixel would read as ink", () => {
  const data = raster([12, 240]);
  processRaster(data, 2, 1);
  assert.equal(data[3], 255);
  assert.equal(data[7], 255);
});
