/**
 * Geometric correction: orientation, deskew, and conservative perspective.
 *
 * Every correction is applied only on measured evidence with a stated
 * confidence, and each applied step is recorded so a result can always answer
 * "what was done to this page before it was read". When evidence is weak the
 * page is left exactly as it arrived — a wrong warp destroys survey geometry
 * far more thoroughly than a skewed but honest image ever could.
 */
import {
  assessImageQuality,
  type ImageQualityAssessment,
} from "./image-quality";
import {
  adaptiveThreshold,
  binarize,
  downscaleGray,
  medianFilter3,
  normalizeBackground,
  otsuThreshold,
  rotateGrayRightAngle,
  rotateGraySmallAngle,
  scaleGray,
  stretchContrast,
  warpQuadToRect,
  type GrayImage,
} from "./raster";
import { MIN_TEXT_PX_FOR_OCR } from "./image-quality";

export interface AppliedOperation {
  operation: string;
  detail?: string;
  confidence?: number;
}

export interface GeometryResult {
  image: GrayImage;
  assessment: ImageQualityAssessment;
  applied: AppliedOperation[];
}

interface QuadPoint {
  x: number;
  y: number;
}

export interface PageQuad {
  corners: [QuadPoint, QuadPoint, QuadPoint, QuadPoint];
  /** 0..1 — evidence that this quad is the page border, not content. */
  confidence: number;
  /** Degrees by which the worst edge departs from the rectangle. */
  distortionDegrees: number;
}

/** Below this confidence no perspective warp is ever applied. */
export const PERSPECTIVE_MIN_CONFIDENCE = 0.65;
/** A quad more rectangular than this is left alone — nothing to correct. */
export const PERSPECTIVE_MIN_DISTORTION_DEGREES = 1.5;
/** The paper must dominate the photograph before its border is trusted. */
const QUAD_MIN_AREA_RATIO = 0.35;
const QUAD_MAX_AREA_RATIO = 0.985;

/**
 * Finds the page's paper quadrilateral in a photograph.
 *
 * Strategy: the paper is the large bright region against a darker desk. The
 * brightness mask's extreme points along each border give corner candidates;
 * the quad is accepted only when it is large, convex, and its edges hug the
 * mask tightly. Cadastral drawings live INSIDE the paper, so gating on the
 * bright-region border keeps parcel boundary lines from ever being mistaken
 * for the page edge.
 */
export function detectPageQuad(image: GrayImage): PageQuad | null {
  const work = downscaleGray(image, 400);
  const threshold = otsuThreshold(work);
  // Paper mask: bright pixels.
  const paper = new Uint8Array(work.width * work.height);
  for (let index = 0; index < work.data.length; index += 1) {
    paper[index] = work.data[index] > threshold ? 1 : 0;
  }
  let area = 0;
  for (const value of paper) area += value;
  const areaRatio = area / paper.length;
  if (areaRatio < QUAD_MIN_AREA_RATIO || areaRatio > QUAD_MAX_AREA_RATIO) return null;

  // Corner candidates: extreme paper pixels by the four diagonal scores.
  let topLeft: QuadPoint | null = null;
  let topRight: QuadPoint | null = null;
  let bottomRight: QuadPoint | null = null;
  let bottomLeft: QuadPoint | null = null;
  let bestTl = Number.POSITIVE_INFINITY;
  let bestTr = Number.NEGATIVE_INFINITY;
  let bestBr = Number.NEGATIVE_INFINITY;
  let bestBl = Number.POSITIVE_INFINITY;
  for (let y = 0; y < work.height; y += 1) {
    for (let x = 0; x < work.width; x += 1) {
      if (!paper[y * work.width + x]) continue;
      const sum = x + y;
      const diff = x - y;
      if (sum < bestTl) { bestTl = sum; topLeft = { x, y }; }
      if (sum > bestBr) { bestBr = sum; bottomRight = { x, y }; }
      if (diff > bestTr) { bestTr = diff; topRight = { x, y }; }
      if (diff < bestBl) { bestBl = diff; bottomLeft = { x, y }; }
    }
  }
  if (!topLeft || !topRight || !bottomRight || !bottomLeft) return null;

  const corners: [QuadPoint, QuadPoint, QuadPoint, QuadPoint] = [topLeft, topRight, bottomRight, bottomLeft];
  const quadArea = polygonArea(corners);
  if (quadArea / paper.length < QUAD_MIN_AREA_RATIO) return null;

  // Edge support: sample along each edge; paper must sit just inside it.
  let supported = 0;
  let samples = 0;
  for (let edge = 0; edge < 4; edge += 1) {
    const a = corners[edge];
    const b = corners[(edge + 1) % 4];
    const inward = inwardNormal(a, b, corners);
    for (let t = 0.1; t <= 0.9; t += 0.1) {
      const px = Math.round(a.x + (b.x - a.x) * t + inward.x * 3);
      const py = Math.round(a.y + (b.y - a.y) * t + inward.y * 3);
      samples += 1;
      if (px >= 0 && py >= 0 && px < work.width && py < work.height && paper[py * work.width + px]) {
        supported += 1;
      }
    }
  }
  const support = samples > 0 ? supported / samples : 0;

  // Distortion: the worst departure of an interior angle from 90 degrees.
  let distortionDegrees = 0;
  for (let index = 0; index < 4; index += 1) {
    const previous = corners[(index + 3) % 4];
    const current = corners[index];
    const next = corners[(index + 1) % 4];
    const angle = interiorAngleDegrees(previous, current, next);
    distortionDegrees = Math.max(distortionDegrees, Math.abs(angle - 90));
  }

  const scale = Math.max(image.width, image.height) / Math.max(work.width, work.height);
  return {
    corners: corners.map((corner) => ({ x: corner.x * scale, y: corner.y * scale })) as PageQuad["corners"],
    confidence: Math.max(0, Math.min(1, support * (areaRatio < QUAD_MAX_AREA_RATIO ? 1 : 0.5))),
    distortionDegrees,
  };
}

function polygonArea(points: readonly QuadPoint[]): number {
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const a = points[index];
    const b = points[(index + 1) % points.length];
    area += a.x * b.y - b.x * a.y;
  }
  return Math.abs(area) / 2;
}

function inwardNormal(a: QuadPoint, b: QuadPoint, corners: readonly QuadPoint[]): QuadPoint {
  const cx = corners.reduce((sum, point) => sum + point.x, 0) / corners.length;
  const cy = corners.reduce((sum, point) => sum + point.y, 0) / corners.length;
  const nx = -(b.y - a.y);
  const ny = b.x - a.x;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const toward = (cx - mx) * nx + (cy - my) * ny;
  const length = Math.hypot(nx, ny) || 1;
  const sign = toward >= 0 ? 1 : -1;
  return { x: (nx / length) * sign, y: (ny / length) * sign };
}

function interiorAngleDegrees(a: QuadPoint, b: QuadPoint, c: QuadPoint): number {
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const dot = v1x * v2x + v1y * v2y;
  const magnitude = (Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y)) || 1;
  return (Math.acos(Math.max(-1, Math.min(1, dot / magnitude))) * 180) / Math.PI;
}

/**
 * The full geometric + adaptive-enhancement pass for one page raster.
 *
 * Ordering: perspective (works on the raw photograph) → right-angle
 * orientation → small-angle deskew → adaptive enhancement → upscale. Cheap
 * measurement decides each step; clean scans pass through almost untouched.
 */
export async function correctPageGeometry(original: GrayImage): Promise<GeometryResult> {
  const applied: AppliedOperation[] = [];
  let image = original;

  // --- Perspective, first and most conservative -------------------------
  const quad = detectPageQuad(image);
  let perspectiveScore = 0;
  if (quad) {
    perspectiveScore = Math.min(1, quad.distortionDegrees / 12) * quad.confidence;
    if (
      quad.confidence >= PERSPECTIVE_MIN_CONFIDENCE
      && quad.distortionDegrees >= PERSPECTIVE_MIN_DISTORTION_DEGREES
    ) {
      const width = Math.round(Math.max(
        Math.hypot(quad.corners[1].x - quad.corners[0].x, quad.corners[1].y - quad.corners[0].y),
        Math.hypot(quad.corners[2].x - quad.corners[3].x, quad.corners[2].y - quad.corners[3].y),
      ));
      const height = Math.round(Math.max(
        Math.hypot(quad.corners[3].x - quad.corners[0].x, quad.corners[3].y - quad.corners[0].y),
        Math.hypot(quad.corners[2].x - quad.corners[1].x, quad.corners[2].y - quad.corners[1].y),
      ));
      if (width > 50 && height > 50) {
        image = warpQuadToRect(image, quad.corners, width, height);
        applied.push({
          operation: "PERSPECTIVE_CORRECTION",
          detail: `distortion ${quad.distortionDegrees.toFixed(1)}°`,
          confidence: quad.confidence,
        });
      }
    }
  }

  // --- Measure the (possibly warped) page -------------------------------
  const assessment = { ...assessImageQuality(image), perspectiveScore };

  if (assessment.orientation === 90 && assessment.orientationConfidence >= 0.5) {
    // Reading direction is not knowable from banding alone, so the smaller
    // correction (90° counter-clockwise) is applied; OCR-confidence evidence
    // upstream can still ask for the opposite turn.
    image = rotateGrayRightAngle(image, 270);
    applied.push({
      operation: "ROTATE_90",
      detail: "text lines ran vertically",
      confidence: assessment.orientationConfidence,
    });
  }

  if (assessment.skewAngle !== 0 && assessment.skewConfidence >= 0.35) {
    // skewAngle IS the straightening rotation — apply it as measured.
    image = rotateGraySmallAngle(image, assessment.skewAngle);
    applied.push({
      operation: "DESKEW",
      detail: `${assessment.skewAngle.toFixed(1)}°`,
      confidence: assessment.skewConfidence,
    });
  }

  // --- Adaptive enhancement, by measurement only ------------------------
  const wants = new Set(assessment.recommendedOperations);
  if (wants.has("NORMALIZE_BACKGROUND")) {
    image = normalizeBackground(image);
    applied.push({ operation: "NORMALIZE_BACKGROUND" });
  }
  if (wants.has("STRETCH_CONTRAST")) {
    image = stretchContrast(image);
    applied.push({ operation: "STRETCH_CONTRAST" });
  }
  if (wants.has("MEDIAN_DENOISE") && image.width * image.height <= 4_000_000) {
    image = medianFilter3(image);
    applied.push({ operation: "MEDIAN_DENOISE" });
  }
  if (wants.has("ADAPTIVE_THRESHOLD")) {
    image = adaptiveThreshold(image);
    applied.push({ operation: "ADAPTIVE_THRESHOLD" });
  } else if (wants.has("OTSU_THRESHOLD") && (assessment.contrastScore < 120 || assessment.backgroundVariation > 12)) {
    const threshold = otsuThreshold(image);
    const ink = binarize(image, threshold);
    const data = new Uint8ClampedArray(image.data.length);
    for (let index = 0; index < data.length; index += 1) data[index] = ink[index] ? 0 : 255;
    image = { width: image.width, height: image.height, data };
    applied.push({ operation: "OTSU_THRESHOLD", detail: `threshold ${threshold}` });
  }

  // --- Resolution policy -------------------------------------------------
  if (wants.has("UPSCALE") && assessment.estimatedTextPx > 0) {
    const factor = Math.min(2.5, MIN_TEXT_PX_FOR_OCR * 1.6 / assessment.estimatedTextPx);
    if (factor > 1.15) {
      image = await scaleGray(image, factor);
      applied.push({ operation: "UPSCALE", detail: `×${factor.toFixed(2)}` });
    }
  }

  return { image, assessment, applied };
}
