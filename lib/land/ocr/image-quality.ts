/**
 * Image quality assessment: measure first, process second.
 *
 * A clean 300-DPI scan and a shadowed phone photograph should not travel the
 * same preprocessing chain — the first needs nothing and the second needs
 * everything. This module measures a page cheaply, on a downscaled working
 * copy, and recommends operations by evidence. Every number it produces is
 * explainable, and nothing here mutates the original raster.
 */
import {
  binarize,
  boxBlurGray,
  downscaleGray,
  grayPercentile,
  laplacianVariance,
  otsuThreshold,
  rotateGraySmallAngle,
  type GrayImage,
} from "./raster";

export type RecommendedOperation =
  | "NORMALIZE_BACKGROUND"
  | "STRETCH_CONTRAST"
  | "ADAPTIVE_THRESHOLD"
  | "OTSU_THRESHOLD"
  | "MEDIAN_DENOISE"
  | "DESKEW"
  | "ROTATE_90"
  | "ROTATE_180"
  | "ROTATE_270"
  | "PERSPECTIVE_CORRECTION"
  | "UPSCALE";

export interface ImageQualityAssessment {
  /** Right-angle orientation the page evidence suggests. */
  orientation: 0 | 90 | 180 | 270;
  orientationConfidence: number;
  /**
   * The small-angle rotation that straightens the page, in degrees
   * (counter-clockwise positive). Apply exactly this angle to deskew.
   */
  skewAngle: number;
  skewConfidence: number;
  /** 0..1 — how strongly the page border reads as a non-rectangular quad. */
  perspectiveScore: number;
  /** Laplacian variance on the working copy; low = blurred. */
  blurScore: number;
  /** p2..p98 spread, 0..255; low = faded. */
  contrastScore: number;
  /** Standard deviation of the blurred background; high = shadows. */
  backgroundVariation: number;
  /** Estimated dominant ink-line (text) height in working-copy pixels. */
  estimatedTextPx: number;
  effectiveResolution: { width: number; height: number };
  recommendedOperations: RecommendedOperation[];
  warnings: string[];
}

/** Analysis runs on a copy no larger than this; OCR never reads this copy. */
const ANALYSIS_MAX_DIMENSION = 900;
/** Skew search space, degrees. */
export const SKEW_SEARCH_DEGREES = 10;
const BLUR_SOFT_FLOOR = 60;
const CONTRAST_SOFT_FLOOR = 90;
export const MIN_TEXT_PX_FOR_OCR = 14;

/**
 * Sharpness of the horizontal projection profile: text pages have strongly
 * banded row-ink histograms, and the banding is sharpest when the rows are
 * level. Used for both skew search and 0°/90° orientation evidence.
 */
export function projectionSharpness(ink: Uint8Array, width: number, height: number): number {
  const rows = new Float64Array(height);
  for (let y = 0; y < height; y += 1) {
    let sum = 0;
    for (let x = 0; x < width; x += 1) sum += ink[y * width + x];
    rows[y] = sum;
  }
  let mean = 0;
  for (const value of rows) mean += value;
  mean /= Math.max(1, rows.length);
  let variance = 0;
  for (const value of rows) variance += (value - mean) ** 2;
  return variance / Math.max(1, rows.length);
}

function inkOf(image: GrayImage): Uint8Array {
  return binarize(image, otsuThreshold(image));
}

/** Coarse-to-fine projection-profile skew search over ±SKEW_SEARCH_DEGREES. */
export function detectSkew(working: GrayImage): { angle: number; confidence: number } {
  const base = downscaleGray(working, 500);
  const baseline = projectionSharpness(inkOf(base), base.width, base.height);
  let bestAngle = 0;
  let bestScore = baseline;

  const evaluate = (angle: number) => {
    const rotated = rotateGraySmallAngle(base, angle);
    const score = projectionSharpness(inkOf(rotated), rotated.width, rotated.height);
    if (score > bestScore) {
      bestScore = score;
      bestAngle = angle;
    }
  };
  for (let angle = -SKEW_SEARCH_DEGREES; angle <= SKEW_SEARCH_DEGREES; angle += 1) {
    if (angle !== 0) evaluate(angle);
  }
  for (let offset = -0.75; offset <= 0.75; offset += 0.25) {
    const angle = bestAngle + offset;
    if (Math.abs(angle) <= SKEW_SEARCH_DEGREES && angle !== 0) evaluate(angle);
  }
  // Confidence: how much straightening improved the banding.
  const improvement = baseline > 0 ? (bestScore - baseline) / baseline : 0;
  const confidence = Math.max(0, Math.min(1, improvement / 0.35));
  return { angle: Math.abs(bestAngle) < 0.5 ? 0 : bestAngle, confidence };
}

/**
 * 0° vs 90° from projection banding: text lines band the horizontal profile
 * far more than the vertical one. 180° cannot be told apart from 0° without
 * reading glyphs, so it is decided later by OCR evidence, not here.
 */
export function detectRightAngleOrientation(working: GrayImage): {
  orientation: 0 | 90;
  confidence: number;
} {
  const base = downscaleGray(working, 500);
  const ink = inkOf(base);
  const horizontal = projectionSharpness(ink, base.width, base.height);
  const rotatedInk = new Uint8Array(ink.length);
  for (let y = 0; y < base.height; y += 1) {
    for (let x = 0; x < base.width; x += 1) {
      rotatedInk[x * base.height + (base.height - 1 - y)] = ink[y * base.width + x];
    }
  }
  const vertical = projectionSharpness(rotatedInk, base.height, base.width);
  const total = horizontal + vertical;
  if (total === 0) return { orientation: 0, confidence: 0 };
  const ratio = Math.max(horizontal, vertical) / total;
  return {
    orientation: vertical > horizontal * 1.6 ? 90 : 0,
    confidence: Math.max(0, Math.min(1, (ratio - 0.5) * 2)),
  };
}

/** Dominant ink-run height along columns — a proxy for glyph size. */
export function estimateTextHeight(working: GrayImage): number {
  const base = downscaleGray(working, 700);
  const ink = inkOf(base);
  const runs: number[] = [];
  const step = Math.max(1, Math.floor(base.width / 64));
  for (let x = 0; x < base.width; x += step) {
    let run = 0;
    for (let y = 0; y < base.height; y += 1) {
      if (ink[y * base.width + x]) run += 1;
      else if (run > 0) {
        if (run >= 2 && run <= 60) runs.push(run);
        run = 0;
      }
    }
  }
  if (runs.length < 8) return 0;
  runs.sort((a, b) => a - b);
  const median = runs[Math.floor(runs.length / 2)];
  // Scale the estimate back to the working copy's resolution.
  return median * (Math.max(working.width, working.height) / Math.max(base.width, base.height));
}

/** Per-tile paper level (p85), then the spread of those levels. */
export function tileBackgroundVariation(image: GrayImage, grid = 6): number {
  const tileWidth = Math.max(8, Math.floor(image.width / grid));
  const tileHeight = Math.max(8, Math.floor(image.height / grid));
  const levels: number[] = [];
  for (let ty = 0; ty + tileHeight <= image.height; ty += tileHeight) {
    for (let tx = 0; tx + tileWidth <= image.width; tx += tileWidth) {
      const values: number[] = [];
      for (let y = ty; y < ty + tileHeight; y += 2) {
        for (let x = tx; x < tx + tileWidth; x += 2) {
          values.push(image.data[y * image.width + x]);
        }
      }
      values.sort((a, b) => a - b);
      levels.push(values[Math.floor(values.length * 0.85)]);
    }
  }
  if (levels.length === 0) return 0;
  const mean = levels.reduce((sum, value) => sum + value, 0) / levels.length;
  const variance = levels.reduce((sum, value) => sum + (value - mean) ** 2, 0) / levels.length;
  return Math.sqrt(variance);
}

/** Full assessment on a bounded working copy. */
export function assessImageQuality(working: GrayImage): ImageQualityAssessment {
  const analysis = downscaleGray(working, ANALYSIS_MAX_DIMENSION);
  const warnings: string[] = [];
  const operations: RecommendedOperation[] = [];

  const blurScore = laplacianVariance(boxBlurGray(analysis, 0));
  const contrastScore = grayPercentile(analysis, 0.98) - grayPercentile(analysis, 0.02);
  // Background level per tile, taken as the bright percentile so the ink does
  // not contaminate the measurement: a page of black text on even paper must
  // read as an even background.
  const backgroundVariation = tileBackgroundVariation(analysis);

  const { orientation, confidence: orientationConfidence } = detectRightAngleOrientation(analysis);
  const { angle: skewAngle, confidence: skewConfidence } = detectSkew(analysis);
  const estimatedTextPx = estimateTextHeight(working);

  if (backgroundVariation > 18) {
    operations.push("NORMALIZE_BACKGROUND");
    warnings.push("uneven illumination or shadow across the page");
  }
  if (contrastScore < CONTRAST_SOFT_FLOOR) {
    operations.push("STRETCH_CONTRAST");
    warnings.push("faded page: low tonal range");
  }
  if (blurScore < BLUR_SOFT_FLOOR) {
    warnings.push("page is blurred; OCR reliability is reduced");
  }
  if (orientation === 90 && orientationConfidence >= 0.5) operations.push("ROTATE_90");
  if (skewAngle !== 0 && skewConfidence >= 0.35) operations.push("DESKEW");
  if (estimatedTextPx > 0 && estimatedTextPx < MIN_TEXT_PX_FOR_OCR) {
    operations.push("UPSCALE");
    warnings.push("text is small at this resolution");
  }
  if (backgroundVariation > 30) operations.push("ADAPTIVE_THRESHOLD");
  else operations.push("OTSU_THRESHOLD");
  if (blurScore < BLUR_SOFT_FLOOR && contrastScore >= CONTRAST_SOFT_FLOOR) {
    operations.push("MEDIAN_DENOISE");
  }

  return {
    orientation,
    orientationConfidence,
    skewAngle,
    skewConfidence,
    perspectiveScore: 0, // filled by the geometry stage, which owns quad detection
    blurScore,
    contrastScore,
    backgroundVariation,
    estimatedTextPx,
    effectiveResolution: { width: working.width, height: working.height },
    recommendedOperations: operations,
    warnings,
  };
}
