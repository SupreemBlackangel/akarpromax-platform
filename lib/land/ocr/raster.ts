/**
 * Raster primitives for the OCR pipeline.
 *
 * Everything here works on plain `ImageData`-shaped buffers so the logic is
 * testable without a canvas, and uses `@napi-rs/canvas` — the backend PDF.js
 * already ships — only at the edges (decode, encode, affine transforms). No
 * new native dependency is introduced.
 *
 * The uploaded bytes and the first decoded raster are immutable evidence:
 * every operation returns a new buffer and never writes into its input.
 */

export interface GrayImage {
  width: number;
  height: number;
  /** One byte per pixel, row-major, 0 = black. */
  data: Uint8ClampedArray;
}

export interface RgbaImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

/** Hard resource ceilings. Exceeding callers must downscale, not crash. */
export const RASTER_LIMITS = {
  MAX_DIMENSION: 4_000,
  MAX_MEGAPIXELS: 12,
} as const;

type CanvasModule = typeof import("@napi-rs/canvas");

let canvasModulePromise: Promise<CanvasModule | null> | null = null;

/** The canvas backend, or null where the native binding is unavailable. */
export function loadCanvas(): Promise<CanvasModule | null> {
  canvasModulePromise ??= import("@napi-rs/canvas").then(
    (module) => module,
    () => null,
  );
  return canvasModulePromise;
}

export function toGray(image: RgbaImage): GrayImage {
  const out = new Uint8ClampedArray(image.width * image.height);
  const source = image.data;
  for (let index = 0, pixel = 0; pixel < out.length; pixel += 1, index += 4) {
    out[pixel] = Math.round(
      0.299 * source[index] + 0.587 * source[index + 1] + 0.114 * source[index + 2],
    );
  }
  return { width: image.width, height: image.height, data: out };
}

export function grayToRgba(image: GrayImage): RgbaImage {
  const out = new Uint8ClampedArray(image.width * image.height * 4);
  for (let pixel = 0, index = 0; pixel < image.data.length; pixel += 1, index += 4) {
    const value = image.data[pixel];
    out[index] = out[index + 1] = out[index + 2] = value;
    out[index + 3] = 255;
  }
  return { width: image.width, height: image.height, data: out };
}

/** Nearest-neighbour downscale used by analysis passes; never for OCR input. */
export function downscaleGray(image: GrayImage, maxDimension: number): GrayImage {
  const largest = Math.max(image.width, image.height);
  if (largest <= maxDimension) return image;
  const factor = maxDimension / largest;
  const width = Math.max(1, Math.round(image.width * factor));
  const height = Math.max(1, Math.round(image.height * factor));
  const out = new Uint8ClampedArray(width * height);
  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(image.height - 1, Math.round(y / factor));
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(image.width - 1, Math.round(x / factor));
      out[y * width + x] = image.data[sourceY * image.width + sourceX];
    }
  }
  return { width, height, data: out };
}

/** Percentile of the gray histogram, 0..255. */
export function grayPercentile(image: GrayImage, fraction: number): number {
  const histogram = new Uint32Array(256);
  for (const value of image.data) histogram[value] += 1;
  const target = Math.max(1, Math.floor(image.data.length * fraction));
  let seen = 0;
  for (let value = 0; value < 256; value += 1) {
    seen += histogram[value];
    if (seen >= target) return value;
  }
  return 255;
}

/** Otsu global threshold. */
export function otsuThreshold(image: GrayImage): number {
  const histogram = new Uint32Array(256);
  for (const value of image.data) histogram[value] += 1;
  const total = image.data.length;
  let sum = 0;
  for (let value = 0; value < 256; value += 1) sum += value * histogram[value];
  let sumBackground = 0;
  let weightBackground = 0;
  let best = 128;
  let bestVariance = 0;
  for (let value = 0; value < 256; value += 1) {
    weightBackground += histogram[value];
    if (weightBackground === 0) continue;
    const weightForeground = total - weightBackground;
    if (weightForeground === 0) break;
    sumBackground += value * histogram[value];
    const meanBackground = sumBackground / weightBackground;
    const meanForeground = (sum - sumBackground) / weightForeground;
    const variance = weightBackground * weightForeground
      * (meanBackground - meanForeground) ** 2;
    if (variance > bestVariance) {
      bestVariance = variance;
      best = value;
    }
  }
  return best;
}

/**
 * Binarise: true where the pixel is at or below the threshold (ink).
 * Inclusive on purpose: on a clean two-tone page Otsu's optimum lands ON the
 * ink bin, and a strict comparison would then see no ink at all.
 */
export function binarize(image: GrayImage, threshold: number): Uint8Array {
  const out = new Uint8Array(image.data.length);
  for (let index = 0; index < image.data.length; index += 1) {
    out[index] = image.data[index] <= threshold ? 1 : 0;
  }
  return out;
}

/**
 * Box blur with a running-sum, O(n) per axis. Used for background
 * normalisation and blur scoring, not for OCR input directly.
 */
export function boxBlurGray(image: GrayImage, radius: number): GrayImage {
  if (radius < 1) return image;
  const { width, height } = image;
  const horizontal = new Float32Array(width * height);
  const size = radius * 2 + 1;
  for (let y = 0; y < height; y += 1) {
    let running = 0;
    for (let x = -radius; x <= radius; x += 1) {
      running += image.data[y * width + Math.min(width - 1, Math.max(0, x))];
    }
    for (let x = 0; x < width; x += 1) {
      horizontal[y * width + x] = running / size;
      const leaving = Math.min(width - 1, Math.max(0, x - radius));
      const entering = Math.min(width - 1, x + radius + 1);
      running += image.data[y * width + entering] - image.data[y * width + leaving];
    }
  }
  const out = new Uint8ClampedArray(width * height);
  for (let x = 0; x < width; x += 1) {
    let running = 0;
    for (let y = -radius; y <= radius; y += 1) {
      running += horizontal[Math.min(height - 1, Math.max(0, y)) * width + x];
    }
    for (let y = 0; y < height; y += 1) {
      out[y * width + x] = Math.round(running / size);
      const leaving = Math.min(height - 1, Math.max(0, y - radius)) * width + x;
      const entering = Math.min(height - 1, y + radius + 1) * width + x;
      running += horizontal[entering] - horizontal[leaving];
    }
  }
  return { width, height, data: out };
}

/** Variance of a 3x3 Laplacian: the standard sharpness measure. */
export function laplacianVariance(image: GrayImage): number {
  const { width, height, data } = image;
  if (width < 3 || height < 3) return 0;
  let sum = 0;
  let sumSquares = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      const value = 4 * data[index]
        - data[index - 1] - data[index + 1]
        - data[index - width] - data[index + width];
      sum += value;
      sumSquares += value * value;
      count += 1;
    }
  }
  if (count === 0) return 0;
  const mean = sum / count;
  return sumSquares / count - mean * mean;
}

/**
 * Divides out uneven illumination: a heavily blurred copy approximates the
 * background, and the ratio flattens shadows a phone camera leaves behind.
 */
export function normalizeBackground(image: GrayImage): GrayImage {
  const radius = Math.max(8, Math.round(Math.min(image.width, image.height) / 16));
  const background = boxBlurGray(image, radius);
  const out = new Uint8ClampedArray(image.data.length);
  for (let index = 0; index < image.data.length; index += 1) {
    const flat = (image.data[index] / Math.max(1, background.data[index])) * 220;
    out[index] = Math.max(0, Math.min(255, Math.round(flat)));
  }
  return { width: image.width, height: image.height, data: out };
}

/** Linear stretch between the 2nd and 98th percentile. */
export function stretchContrast(image: GrayImage): GrayImage {
  const low = grayPercentile(image, 0.02);
  const high = grayPercentile(image, 0.98);
  const range = Math.max(1, high - low);
  const out = new Uint8ClampedArray(image.data.length);
  for (let index = 0; index < image.data.length; index += 1) {
    out[index] = Math.max(0, Math.min(255, Math.round(((image.data[index] - low) / range) * 255)));
  }
  return { width: image.width, height: image.height, data: out };
}

/**
 * Local-mean adaptive threshold, for pages whose illumination the global Otsu
 * cannot follow. `windowRadius` scales with the page.
 */
export function adaptiveThreshold(image: GrayImage, offset = 10): GrayImage {
  const radius = Math.max(8, Math.round(Math.min(image.width, image.height) / 32));
  const localMean = boxBlurGray(image, radius);
  const out = new Uint8ClampedArray(image.data.length);
  for (let index = 0; index < image.data.length; index += 1) {
    out[index] = image.data[index] < localMean.data[index] - offset ? 0 : 255;
  }
  return { width: image.width, height: image.height, data: out };
}

/** 3x3 median, for salt-and-pepper photocopy noise. Bounded to small images. */
export function medianFilter3(image: GrayImage): GrayImage {
  const { width, height, data } = image;
  const out = new Uint8ClampedArray(data.length);
  const window = new Uint8ClampedArray(9);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let cursor = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        const sy = Math.min(height - 1, Math.max(0, y + dy));
        for (let dx = -1; dx <= 1; dx += 1) {
          const sx = Math.min(width - 1, Math.max(0, x + dx));
          window[cursor] = data[sy * width + sx];
          cursor += 1;
        }
      }
      const sorted = [...window].sort((a, b) => a - b);
      out[y * width + x] = sorted[4];
    }
  }
  return { width, height, data: out };
}

/**
 * Projective warp by inverse mapping with bilinear sampling.
 *
 * The four source corners (top-left, top-right, bottom-right, bottom-left)
 * are mapped onto an upright rectangle of the given size. Implemented by
 * hand because the canvas 2D API only offers affine transforms; bounded by
 * the caller to the working-copy resolution.
 */
export function warpQuadToRect(
  image: GrayImage,
  quad: readonly { x: number; y: number }[],
  outWidth: number,
  outHeight: number,
): GrayImage {
  const h = computeHomography(
    [
      { x: 0, y: 0 },
      { x: outWidth, y: 0 },
      { x: outWidth, y: outHeight },
      { x: 0, y: outHeight },
    ],
    quad,
  );
  const out = new Uint8ClampedArray(outWidth * outHeight);
  for (let y = 0; y < outHeight; y += 1) {
    for (let x = 0; x < outWidth; x += 1) {
      const denominator = h[6] * x + h[7] * y + h[8];
      const sourceX = (h[0] * x + h[1] * y + h[2]) / denominator;
      const sourceY = (h[3] * x + h[4] * y + h[5]) / denominator;
      out[y * outWidth + x] = sampleBilinear(image, sourceX, sourceY);
    }
  }
  return { width: outWidth, height: outHeight, data: out };
}

function sampleBilinear(image: GrayImage, x: number, y: number): number {
  if (x < 0 || y < 0 || x > image.width - 1 || y > image.height - 1) return 255;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(image.width - 1, x0 + 1);
  const y1 = Math.min(image.height - 1, y0 + 1);
  const fx = x - x0;
  const fy = y - y0;
  const top = image.data[y0 * image.width + x0] * (1 - fx) + image.data[y0 * image.width + x1] * fx;
  const bottom = image.data[y1 * image.width + x0] * (1 - fx) + image.data[y1 * image.width + x1] * fx;
  return Math.round(top * (1 - fy) + bottom * fy);
}

/**
 * Homography from four point correspondences (destination -> source), solved
 * with Gaussian elimination on the standard 8x8 system.
 */
export function computeHomography(
  destination: readonly { x: number; y: number }[],
  source: readonly { x: number; y: number }[],
): number[] {
  const a: number[][] = [];
  const b: number[] = [];
  for (let index = 0; index < 4; index += 1) {
    const d = destination[index];
    const s = source[index];
    a.push([d.x, d.y, 1, 0, 0, 0, -d.x * s.x, -d.y * s.x]);
    b.push(s.x);
    a.push([0, 0, 0, d.x, d.y, 1, -d.x * s.y, -d.y * s.y]);
    b.push(s.y);
  }
  const solution = solveLinear(a, b);
  return [...solution, 1];
}

function solveLinear(matrix: number[][], vector: number[]): number[] {
  const n = vector.length;
  const a = matrix.map((row, index) => [...row, vector[index]]);
  for (let column = 0; column < n; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < n; row += 1) {
      if (Math.abs(a[row][column]) > Math.abs(a[pivot][column])) pivot = row;
    }
    [a[column], a[pivot]] = [a[pivot], a[column]];
    const lead = a[column][column] || 1e-12;
    for (let row = 0; row < n; row += 1) {
      if (row === column) continue;
      const factor = a[row][column] / lead;
      for (let k = column; k <= n; k += 1) a[row][k] -= factor * a[column][k];
    }
  }
  return a.map((row, index) => row[n] / (row[index] || 1e-12));
}

/** Rotate by a right-angle multiple. 90 = clockwise. */
export function rotateGrayRightAngle(image: GrayImage, degrees: 0 | 90 | 180 | 270): GrayImage {
  if (degrees === 0) return image;
  const { width, height, data } = image;
  if (degrees === 180) {
    const out = new Uint8ClampedArray(data.length);
    for (let index = 0; index < data.length; index += 1) out[data.length - 1 - index] = data[index];
    return { width, height, data: out };
  }
  const out = new Uint8ClampedArray(data.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = data[y * width + x];
      if (degrees === 90) out[x * height + (height - 1 - y)] = value;
      else out[(width - 1 - x) * height + y] = value;
    }
  }
  return { width: height, height: width, data: out };
}

/** Small-angle rotation with bilinear sampling; positive = counter-clockwise. */
export function rotateGraySmallAngle(image: GrayImage, degrees: number): GrayImage {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const cx = image.width / 2;
  const cy = image.height / 2;
  const out = new Uint8ClampedArray(image.data.length);
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      out[y * image.width + x] = sampleBilinear(image, cx + dx * cos - dy * sin, cy + dx * sin + dy * cos);
    }
  }
  return { width: image.width, height: image.height, data: out };
}

/** High-quality upscale via the canvas backend; falls back to bilinear. */
export async function scaleGray(image: GrayImage, factor: number): Promise<GrayImage> {
  const width = Math.min(RASTER_LIMITS.MAX_DIMENSION, Math.round(image.width * factor));
  const height = Math.min(RASTER_LIMITS.MAX_DIMENSION, Math.round(image.height * factor));
  if ((width * height) / 1e6 > RASTER_LIMITS.MAX_MEGAPIXELS) return image;
  const canvasModule = await loadCanvas();
  if (canvasModule?.createCanvas) {
    const sourceCanvas = canvasModule.createCanvas(image.width, image.height);
    const sourceContext = sourceCanvas.getContext("2d");
    const rgba = grayToRgba(image);
    const imageData = sourceContext.createImageData(image.width, image.height);
    imageData.data.set(rgba.data);
    sourceContext.putImageData(imageData, 0, 0);
    const target = canvasModule.createCanvas(width, height);
    const targetContext = target.getContext("2d");
    targetContext.imageSmoothingEnabled = true;
    targetContext.imageSmoothingQuality = "high";
    targetContext.drawImage(sourceCanvas, 0, 0, width, height);
    return toGray({ width, height, data: targetContext.getImageData(0, 0, width, height).data });
  }
  // Bilinear fallback keeps the pipeline alive without the native binding.
  const out = new Uint8ClampedArray(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      out[y * width + x] = sampleBilinear(image, x / factor, y / factor);
    }
  }
  return { width, height, data: out };
}

/** Encode a gray image as PNG via the canvas backend. */
export async function grayToPng(image: GrayImage): Promise<Uint8Array | null> {
  const canvasModule = await loadCanvas();
  if (!canvasModule?.createCanvas) return null;
  const canvas = canvasModule.createCanvas(image.width, image.height);
  const context = canvas.getContext("2d");
  const rgba = grayToRgba(image);
  const imageData = context.createImageData(image.width, image.height);
  imageData.data.set(rgba.data);
  context.putImageData(imageData, 0, 0);
  return canvas.toBuffer("image/png");
}

/** Decode an uploaded image (png/jpeg/webp) to gray via the canvas backend. */
export async function decodeToGray(bytes: Uint8Array): Promise<GrayImage | null> {
  const canvasModule = await loadCanvas();
  if (!canvasModule?.loadImage) return null;
  try {
    const image = await canvasModule.loadImage(Buffer.from(bytes));
    let width = image.width;
    let height = image.height;
    const largest = Math.max(width, height);
    if (largest > RASTER_LIMITS.MAX_DIMENSION) {
      const factor = RASTER_LIMITS.MAX_DIMENSION / largest;
      width = Math.max(1, Math.round(width * factor));
      height = Math.max(1, Math.round(height * factor));
    }
    const canvas = canvasModule.createCanvas(width, height);
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0, width, height);
    return toGray({ width, height, data: context.getImageData(0, 0, width, height).data });
  } catch {
    return null;
  }
}
