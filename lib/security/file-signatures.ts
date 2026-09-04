/**
 * What a file actually is, read from its first bytes.
 *
 * A browser's `File.type` and a filename's extension are both written by
 * whoever sent the file. The only thing that says what a file really contains
 * is its content, so every upload path checks the leading bytes against the
 * type it claims to be.
 *
 * This existed FIVE times over -- in lib/integration/office-media.ts,
 * app/api/ad-assets/route.ts, lib/integration/desktop-property-publish.ts,
 * lib/properties/image-processing.ts and app/api/ads/request-asset/route.ts --
 * and the copies had already diverged:
 *
 *   - two checked four bytes of the PNG signature, three checked all eight;
 *   - one accepted video containers, the others did not;
 *   - one fell through to the JPEG test for ANY type it did not recognise, so
 *     it answered "yes, that is a valid X" for types it had never heard of.
 *
 * Five copies of a security check is five places for it to be weakened by
 * accident. This is the one place.
 */

/** Types any upload path in this application may accept. */
export type FileSignatureType =
  | "image/png"
  | "image/jpeg"
  | "image/webp"
  | "image/gif"
  | "video/mp4"
  | "video/webm"
  | "video/ogg";

/**
 * Byte sequences that identify each type.
 *
 * `offset` is where the sequence must appear. WebP and MP4 both carry their
 * marker after a leading length or container header, which is why a check that
 * only looks at byte zero cannot identify them.
 */
const SIGNATURES: Record<FileSignatureType, Array<{ offset: number; bytes: number[] }>> = {
  // The full eight-byte PNG signature. The last four (\r\n\x1a\n) exist
  // specifically to catch a file mangled by a text-mode transfer, so a check
  // that stops after PNG's first four bytes throws away the part that detects
  // corruption.
  "image/png": [{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],

  "image/jpeg": [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }],

  // RIFF....WEBP
  "image/webp": [
    { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] },
    { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] },
  ],

  // GIF87a / GIF89a
  "image/gif": [{ offset: 0, bytes: [0x47, 0x49, 0x46, 0x38] }],

  // ....ftyp
  "video/mp4": [{ offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }],

  // EBML
  "video/webm": [{ offset: 0, bytes: [0x1a, 0x45, 0xdf, 0xa3] }],

  // OggS
  "video/ogg": [{ offset: 0, bytes: [0x4f, 0x67, 0x67, 0x53] }],
};

/**
 * Whether the leading bytes match the declared type.
 *
 * @returns false for any type not in {@link SIGNATURES}. An unknown type is
 *   refused rather than falling through to another format's test -- answering
 *   "yes" for a type this function has never heard of is how a check becomes
 *   decoration.
 */
export function matchesFileSignature(bytes: Uint8Array, declaredType: string): boolean {
  const signature = SIGNATURES[declaredType as FileSignatureType];
  if (!signature) return false;

  for (const part of signature) {
    const end = part.offset + part.bytes.length;
    if (bytes.length < end) return false;
    for (let i = 0; i < part.bytes.length; i++) {
      if (bytes[part.offset + i] !== part.bytes[i]) return false;
    }
  }

  return true;
}

/**
 * What the bytes are, regardless of what was claimed.
 *
 * @param allowed Restrict detection to the types a caller accepts. Omitting it
 *   tries every known type.
 */
export function detectFileType(
  bytes: Uint8Array,
  allowed?: readonly FileSignatureType[],
): FileSignatureType | null {
  const candidates = allowed ?? (Object.keys(SIGNATURES) as FileSignatureType[]);
  for (const type of candidates) {
    if (matchesFileSignature(bytes, type)) return type;
  }
  return null;
}

/** How many leading bytes are enough to identify any supported type. */
export const SIGNATURE_PREFIX_BYTES = 32;
