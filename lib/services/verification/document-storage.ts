import { join, resolve } from "node:path";

/**
 * Where verification documents live, and what a valid reference to one looks
 * like.
 *
 * These files are identity papers, trade licences and professional
 * certificates. They are written to a directory outside the web root and are
 * NOT served by nginx: `/uploads/properties/` is aliased to disk, but
 * `/uploads/` otherwise proxies to the application, which is what lets an
 * authorization check stand in front of every byte.
 *
 * The stored reference is validated on the way in and again on the way out. The
 * upload route mints the name itself, so a reference that is not exactly
 * `/uploads/verifications/<uuid>.<ext>` did not come from the upload route --
 * it came from the client, which supplies `fileUrl` in the metadata POST and
 * could otherwise point a document row at another provider's file or at a path
 * outside the directory entirely.
 */

export const VERIFICATION_UPLOAD_DIR =
  process.env.VERIFICATION_UPLOAD_DIR || "/var/www/uploads/verifications";

export const VERIFICATION_URL_PREFIX = "/uploads/verifications/";

const STORED_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|png|jpg|webp)$/i;

const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
};

/** The bare stored file name, or null if this is not one of our documents. */
export function storedFileName(fileUrl: unknown): string | null {
  if (typeof fileUrl !== "string") return null;
  const value = fileUrl.trim();
  if (!value.startsWith(VERIFICATION_URL_PREFIX)) return null;
  const name = value.slice(VERIFICATION_URL_PREFIX.length);
  return STORED_NAME.test(name) ? name : null;
}

export function isVerificationFileUrl(fileUrl: unknown): boolean {
  return storedFileName(fileUrl) !== null;
}

export function contentTypeFor(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
}

/**
 * Absolute path for a stored document, or null.
 *
 * The name is already constrained to a UUID and a known extension, so it cannot
 * contain a separator or a `..` segment. Resolving and re-checking the prefix
 * anyway means a future change to that pattern cannot turn into a traversal.
 */
export function documentPath(fileUrl: unknown): string | null {
  const name = storedFileName(fileUrl);
  if (!name) return null;
  const base = resolve(VERIFICATION_UPLOAD_DIR);
  const path = resolve(join(base, name));
  return path.startsWith(base + "/") || path.startsWith(base + "\\") ? path : null;
}
