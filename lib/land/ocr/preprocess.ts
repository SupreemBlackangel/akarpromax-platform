/**
 * Turning a photograph of a survey plan into something OCR can read.
 *
 * Pure pixel work: greyscale, a median filter for scanner speckle, a contrast
 * stretch for a faded photocopy, then Otsu's threshold to make it two-tone.
 * No DOM, so it runs identically on the main thread and inside a Web Worker —
 * which matters more than it sounds, because two copies of a thresholding
 * algorithm would drift and the tool would read a document differently
 * depending on what the browser supported.
 */

/**
 * The widest raster handed to OCR.
 *
 * Tesseract gains nothing above roughly this width on a survey table, and the
 * cost is quadratic: the median filter alone is nine reads per pixel, so
 * doubling the width quadruples the work for the same reading.
 */
export const MAX_OCR_WIDTH = 2000;

/** Upscale a small scan towards MAX_OCR_WIDTH, never past it. */
export function targetRasterSize(width: number, height: number): { width: number; height: number } {
  const scale = Math.min(2.5, Math.max(1, 1800 / Math.max(1, width)));
  const targetWidth = Math.min(MAX_OCR_WIDTH, Math.round(width * scale));
  return {
    width: targetWidth,
    height: Math.max(1, Math.round((height * targetWidth) / Math.max(1, width))),
  };
}

/** Speckle from a scanner glass survives a threshold; a median does not pass it. */
export function medianFilter(data: Uint8ClampedArray, w: number, h: number, size = 3): void {
  const src = new Uint8ClampedArray(data);
  const half = Math.floor(size / 2);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const pixels: number[] = [];
      for (let dy = -half; dy <= half; dy++) {
        for (let dx = -half; dx <= half; dx++) {
          const px = Math.min(w - 1, Math.max(0, x + dx));
          const py = Math.min(h - 1, Math.max(0, y + dy));
          pixels.push(src[(py * w + px) * 4]);
        }
      }
      pixels.sort((a, b) => a - b);
      const median = pixels[Math.floor(pixels.length / 2)];
      const idx = (y * w + x) * 4;
      data[idx] = data[idx + 1] = data[idx + 2] = median;
    }
  }
}

/** Otsu: the split that best separates ink from paper, found from the histogram. */
export function otsuThreshold(data: Uint8ClampedArray): number {
  const hist = new Uint32Array(256);
  for (let i = 0; i < data.length; i += 4) hist[Math.round(data[i])]++;
  const total = data.length / 4;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0, wB = 0;
  let maxVariance = 0, threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const meanB = sumB / wB;
    const meanF = (sum - sumB) / wF;
    const between = wB * wF * (meanB - meanF) * (meanB - meanF);
    if (between > maxVariance) { maxVariance = between; threshold = t; }
  }
  return threshold;
}

/** A faded photocopy uses a fraction of the range; this spends all of it. */
export function enhanceContrastStretch(data: Uint8ClampedArray): void {
  let min = 255, max = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] < min) min = data[i];
    if (data[i] > max) max = data[i];
  }
  const range = max - min;
  // An already-flat image has no contrast to recover, and stretching noise
  // across the full range would manufacture edges that are not in the paper.
  if (range < 10) return;
  for (let i = 0; i < data.length; i += 4) {
    const stretched = Math.round(((data[i] - min) / range) * 255);
    data[i] = data[i + 1] = data[i + 2] = stretched;
  }
}

/** Greyscale → despeckle → stretch → threshold, in place. */
export function processRaster(data: Uint8ClampedArray, width: number, height: number): void {
  for (let index = 0; index < data.length; index += 4) {
    data[index] = data[index + 1] = data[index + 2] =
      Math.round(0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2]);
  }
  medianFilter(data, width, height, 3);
  enhanceContrastStretch(data);
  const threshold = otsuThreshold(data);
  for (let i = 0; i < data.length; i += 4) {
    const value = data[i] < threshold ? 0 : 255;
    data[i] = data[i + 1] = data[i + 2] = value;
  }
}
