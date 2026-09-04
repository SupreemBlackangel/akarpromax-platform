/**
 * One pipeline for every ad creative image the platform stores.
 *
 * Ad creatives used to be persisted byte-identical to whatever was uploaded —
 * an 8 MB PNG hero was served to phones as-is. This mirrors the property
 * pipeline (validate magic bytes → EXIF rotate → cap width → WebP) and adds the
 * one thing ads specifically need: the intrinsic pixel size, so the slot can
 * reserve its box (no layout shift) and the admin can be warned when a creative
 * does not match its placement's aspect ratio.
 *
 * Optimization never blocks an upload: if sharp is unavailable the original
 * bytes are returned unchanged, with dimensions read from the file header.
 */
import { detectFileType } from "@/lib/security/file-signatures";

/** Wide enough for a full-bleed hero on a 2x desktop display. */
export const MAX_AD_IMAGE_WIDTH = 1920;
export const AD_WEBP_QUALITY = 82;

export type ProcessedAdImage = {
  buffer: Buffer;
  /** "webp" when optimized, otherwise the detected source format. */
  extension: "webp" | "png" | "jpg";
  contentType: string;
  width: number | null;
  height: number | null;
  optimized: boolean;
};

type SharpLike = {
  rotate(): SharpLike;
  resize(options: { width: number; withoutEnlargement: boolean }): SharpLike;
  webp(options: { quality: number }): SharpLike;
  toBuffer(options: { resolveWithObject: true }): Promise<{ data: Buffer; info: { width: number; height: number } }>;
};

/**
 * The image format these bytes really are.
 *
 * Delegates to lib/security/file-signatures.ts, narrowed to the three formats
 * this pipeline processes so a valid video is not mistaken for an image it can
 * resize.
 */
function detectFormat(bytes: Uint8Array): "png" | "jpeg" | "webp" | null {
  const type = detectFileType(bytes, ["image/png", "image/jpeg", "image/webp"]);
  if (type === "image/png") return "png";
  if (type === "image/jpeg") return "jpeg";
  if (type === "image/webp") return "webp";
  return null;
}

/**
 * Intrinsic size straight from the file header — the fallback used when sharp
 * is unavailable, so a creative still gets width/height recorded.
 */
export function readImageSize(bytes: Uint8Array): { width: number; height: number } | null {
  const format = detectFormat(bytes);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  if (format === "png" && bytes.length >= 24) {
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }

  if (format === "webp" && bytes.length >= 30) {
    // VP8X (extended) carries a 24-bit canvas size minus one.
    const chunk = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
    if (chunk === "VP8X") {
      const w = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
      const h = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
      return { width: w, height: h };
    }
    if (chunk === "VP8 " && bytes.length >= 30) {
      return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
    }
    return null;
  }

  if (format === "jpeg") {
    // Walk the segment markers to the frame header that carries the size.
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) { offset += 1; continue; }
      const marker = bytes[offset + 1];
      // SOF0..SOF15, skipping the non-frame markers in that range.
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: view.getUint16(offset + 5), width: view.getUint16(offset + 7) };
      }
      offset += 2 + view.getUint16(offset + 2);
    }
  }

  return null;
}

/**
 * Validate and optimize one ad image. Returns null when the bytes are not a
 * supported image, so callers can reject the upload.
 */
export async function processAdImage(buffer: Buffer): Promise<ProcessedAdImage | null> {
  const bytes = new Uint8Array(buffer);
  const format = detectFormat(bytes);
  if (!format) return null;

  const fallbackSize = readImageSize(bytes);

  try {
    const mod = (await import("sharp")) as unknown as { default?: (input: Buffer) => SharpLike } & ((input: Buffer) => SharpLike);
    const sharp = (mod.default ?? mod) as (input: Buffer) => SharpLike;
    const { data, info } = await sharp(buffer)
      .rotate() // honor EXIF orientation before measuring
      .resize({ width: MAX_AD_IMAGE_WIDTH, withoutEnlargement: true })
      .webp({ quality: AD_WEBP_QUALITY })
      .toBuffer({ resolveWithObject: true });
    return {
      buffer: data,
      extension: "webp",
      contentType: "image/webp",
      width: info.width,
      height: info.height,
      optimized: true,
    };
  } catch {
    // sharp missing or failed — store the original rather than failing the upload.
    const extension = format === "png" ? "png" : format === "webp" ? "webp" : "jpg";
    return {
      buffer,
      extension: extension === "webp" ? "webp" : extension,
      contentType: format === "png" ? "image/png" : format === "webp" ? "image/webp" : "image/jpeg",
      width: fallbackSize?.width ?? null,
      height: fallbackSize?.height ?? null,
      optimized: false,
    };
  }
}
