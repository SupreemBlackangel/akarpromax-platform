import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { matchesFileSignature } from "@/lib/security/file-signatures";

/**
 * One pipeline for every property image the platform stores: validate the
 * magic bytes, convert to WebP capped at 1600px wide (quality 80) via sharp,
 * and write into PROPERTY_UPLOAD_DIR. If sharp is unavailable the original
 * bytes are stored unchanged — uploading never fails because optimization did.
 */

export const PROPERTY_UPLOAD_DIR = process.env.PROPERTY_UPLOAD_DIR || "/var/www/uploads/properties";
export const MAX_PROPERTY_IMAGE_BYTES = 8 * 1024 * 1024;

const EXT_BY_MIME: Record<string, string> = { png: "png", jpeg: "jpg", jpg: "jpg", webp: "webp" };

/**
 * Whether the bytes match a declared image type.
 *
 * Delegates to lib/security/file-signatures.ts. This used to carry its own
 * copy, in which the final `return` was the JPEG test AND the fallback for any
 * type it did not recognise -- so it answered "yes, that is a valid X" for
 * types it had never heard of. It also required eight bytes for PNG while
 * testing only four of them.
 */
export function imageSignatureMatches(bytes: Uint8Array, mime: string): boolean {
  const declared = mime.startsWith("image/") ? mime : `image/${mime === "jpg" ? "jpeg" : mime}`;
  return matchesFileSignature(bytes, declared);
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
