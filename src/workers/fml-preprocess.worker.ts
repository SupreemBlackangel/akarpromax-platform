/// <reference lib="webworker" />
/**
 * Image preprocessing, off the main thread.
 *
 * The median filter is nine reads per pixel over a raster up to 2000px wide,
 * and on the main thread it freezes the page for seconds with no way to
 * animate a progress bar honestly — the bar cannot move while the thread that
 * would move it is busy. Here it blocks nothing.
 *
 * The pixel work itself is imported, not reimplemented: the main-thread
 * fallback runs the same functions, so a browser without OffscreenCanvas reads
 * a document identically rather than slightly differently.
 */
import { processRaster, targetRasterSize } from "@/lib/land/ocr/preprocess";

export type PreprocessRequest = { id: number; blob: Blob };
export type PreprocessResponse =
  | { id: number; ok: true; blob: Blob; width: number; height: number }
  | { id: number; ok: false; error: string };

const scope = self as unknown as DedicatedWorkerGlobalScope;

scope.addEventListener("message", async (event: MessageEvent<PreprocessRequest>) => {
  const { id, blob } = event.data;
  try {
    const bitmap = await createImageBitmap(blob);
    const { width, height } = targetRasterSize(bitmap.width, bitmap.height);
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("NO_2D_CONTEXT");
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const image = context.getImageData(0, 0, width, height);
    processRaster(image.data, width, height);
    context.putImageData(image, 0, 0);

    const out = await canvas.convertToBlob({ type: "image/png" });
    const response: PreprocessResponse = { id, ok: true, blob: out, width, height };
    scope.postMessage(response);
  } catch (error) {
    const response: PreprocessResponse = {
      id,
      ok: false,
      error: error instanceof Error ? error.message : "PREPROCESS_FAILED",
    };
    scope.postMessage(response);
  }
});
