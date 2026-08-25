import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assessImageQuality,
  detectRightAngleOrientation,
  detectSkew,
  estimateTextHeight,
} from "@/lib/land/ocr/image-quality";
import { rotateGraySmallAngle, rotateGrayRightAngle, type GrayImage } from "@/lib/land/ocr/raster";

/** A synthetic text page: dark line bands on white, parameterised, no fixtures. */
function textPage(options: {
  width?: number;
  height?: number;
  lineHeight?: number;
  gap?: number;
  ink?: number;
  paper?: number;
} = {}): GrayImage {
  const width = options.width ?? 600;
  const height = options.height ?? 800;
  const lineHeight = options.lineHeight ?? 18;
  const gap = options.gap ?? 16;
  const ink = options.ink ?? 20;
  const paper = options.paper ?? 245;
  const data = new Uint8ClampedArray(width * height).fill(paper);
  for (let y = 60; y < height - 60; y += lineHeight + gap) {
    for (let dy = 0; dy < lineHeight; dy += 1) {
      // Text occupies a ragged 70–90% of the width like real lines do.
      const lineWidth = Math.floor(width * (0.7 + ((y * 7919) % 20) / 100));
      for (let x = 40; x < Math.min(width - 40, 40 + lineWidth); x += 1) {
        // Leave word gaps so it is not one solid bar.
        // Word gaps drift per line, as they do in real text; aligned gaps
        // would build fake vertical stripes into every synthetic page.
        if (((x + y * 13) % 37) < 30) data[(y + dy) * width + x] = ink;
      }
    }
  }
  return { width, height, data };
}

describe("Image quality assessment", () => {
  it("leaves a clean scan almost untouched", () => {
    const assessment = assessImageQuality(textPage());
    assert.equal(assessment.orientation, 0);
    assert.equal(assessment.skewAngle, 0);
    assert.ok(!assessment.recommendedOperations.includes("NORMALIZE_BACKGROUND"));
    assert.ok(!assessment.recommendedOperations.includes("DESKEW"));
    assert.ok(!assessment.recommendedOperations.includes("UPSCALE"));
  });

  it("measures a faded page as low contrast and recommends stretching", () => {
    const faded = textPage({ ink: 140, paper: 200 });
    const assessment = assessImageQuality(faded);
    assert.ok(assessment.contrastScore < 90, `contrast ${assessment.contrastScore}`);
    assert.ok(assessment.recommendedOperations.includes("STRETCH_CONTRAST"));
  });

  it("detects a +3° skew within a degree", () => {
    const skewed = rotateGraySmallAngle(textPage(), 3);
    const { angle, confidence } = detectSkew(skewed);
    assert.ok(Math.abs(-angle - 3) <= 1, `detected ${angle}`);
    assert.ok(confidence > 0.3, `confidence ${confidence}`);
  });

  it("detects a -8° skew within a degree", () => {
    const skewed = rotateGraySmallAngle(textPage(), -8);
    const { angle } = detectSkew(skewed);
    assert.ok(Math.abs(-angle + 8) <= 1, `detected ${angle}`);
  });

  it("reads a 90°-rotated page as sideways", () => {
    const sideways = rotateGrayRightAngle(textPage(), 90);
    const { orientation, confidence } = detectRightAngleOrientation(sideways);
    assert.equal(orientation, 90);
    assert.ok(confidence > 0.3);
  });

  it("does not call an upright page sideways", () => {
    const { orientation } = detectRightAngleOrientation(textPage());
    assert.equal(orientation, 0);
  });

  it("estimates the text height it drew", () => {
    const estimated = estimateTextHeight(textPage({ lineHeight: 12, gap: 14 }));
    assert.ok(estimated >= 8 && estimated <= 18, `estimated ${estimated}`);
  });

  it("recommends upscaling only when the glyphs are small", () => {
    const tiny = textPage({ lineHeight: 5, gap: 7 });
    const tinyAssessment = assessImageQuality(tiny);
    assert.ok(tinyAssessment.recommendedOperations.includes("UPSCALE"));
    const big = textPage({ lineHeight: 22, gap: 16 });
    const bigAssessment = assessImageQuality(big);
    assert.ok(!bigAssessment.recommendedOperations.includes("UPSCALE"));
  });

  it("flags a shadowed page for background normalization", () => {
    const shadowed = textPage();
    // A broad diagonal shadow across the paper.
    for (let y = 0; y < shadowed.height; y += 1) {
      for (let x = 0; x < shadowed.width; x += 1) {
        const factor = 1 - 0.4 * ((x + y) / (shadowed.width + shadowed.height));
        const index = y * shadowed.width + x;
        shadowed.data[index] = Math.round(shadowed.data[index] * factor);
      }
    }
    const assessment = assessImageQuality(shadowed);
    assert.ok(assessment.backgroundVariation > 18, `variation ${assessment.backgroundVariation}`);
    assert.ok(assessment.recommendedOperations.includes("NORMALIZE_BACKGROUND"));
  });
});
