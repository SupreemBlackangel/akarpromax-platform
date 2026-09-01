import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * One pipeline for every property image the platform stores: validate the
 * magic bytes, convert to WebP capped at 1600px wide (quality 80) via sharp,
 * and write into PROPERTY_UPLOAD_DIR. If sharp is unavailable the original
 * bytes are stored unchanged — uploading never fails because optimization did.
 */

export const PROPERTY_UPLOAD_DIR = process.env.PROPERTY_UPLOAD_DIR || "/var/www/uploads/properties";
export const MAX_PROPERTY_IMAGE_BYTES = 8 * 1024 * 1024;

const EXT_BY_MIME: Record<string, string> = { png: "png", jpeg: "jpg", jpg: "jpg", webp: "webp" };

export function imageSignatureMatches(bytes: Uint8Array, mime: string): boolean {
  if (mime === "png") return bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (mime === "webp") return bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff; // jpeg/jpg
}

export function detectImageMime(bytes: Uint8Array): "png" | "jpeg" | "webp" | null {
  if (imageSignatureMatches(bytes, "png")) return "png";
  if (imageSignatureMatches(bytes, "webp")) return "webp";
  if (imageSignatureMatches(bytes, "jpeg")) return "jpeg";
  return null;
}

async function optimizeToWebp(buffer: Buffer): Promise<Buffer | null> {
  try {
    const sharpModule = (await import("sharp")) as unknown as { default?: (input: Buffer) => SharpLike } & ((input: Buffer) => SharpLike);
    const sharp = (sharpModule.default ?? sharpModule) as (input: Buffer) => SharpLike;
    return await sharp(buffer)
      .rotate() // honor EXIF orientation
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    return null;
  }
}

type SharpLike = {
  rotate(): SharpLike;
  resize(options: { width: number; withoutEnlargement: boolean }): SharpLike;
  webp(options: { quality: number }): SharpLike;
  toBuffer(): Promise<Buffer>;
};

/**
 * Store one validated image buffer, optimized when possible.
 * Returns the public /uploads/properties/... URL, or null when invalid.
 */
export async function storePropertyImage(buffer: Buffer, declaredMime?: string): Promise<string | null> {
  if (buffer.byteLength === 0 || buffer.byteLength > MAX_PROPERTY_IMAGE_BYTES) return null;
  const mime = detectImageMime(buffer);
  if (!mime) return null;
  if (declaredMime && EXT_BY_MIME[declaredMime.toLowerCase()] && !imageSignatureMatches(buffer, declaredMime.toLowerCase())) return null;

  await mkdir(PROPERTY_UPLOAD_DIR, { recursive: true });
  const optimized = await optimizeToWebp(buffer);
  const finalBuffer = optimized ?? buffer;
  const ext = optimized ? "webp" : EXT_BY_MIME[mime];
  const fileName = `${crypto.randomUUID()}.${ext}`;
  await writeFile(join(PROPERTY_UPLOAD_DIR, fileName), finalBuffer);
  return `/uploads/properties/${fileName}`;
}
