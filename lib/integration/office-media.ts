import { getIntegrationDb } from "@/lib/integration/db";
import { getOfficeMediaBucket } from "@/lib/integration/office-media-store";
import { getOfficePropertyLink } from "@/lib/integration/office-property";

/**
 * Office → website property media.
 *
 * Writes the canonical `property_media` rows that the public property pages
 * already render, and stores the bytes in the same `SPONSOR_ASSETS` R2 bucket
 * `/api/ad-assets` uses. There is no second media model, no second storage
 * system and no second notion of "featured".
 *
 * Ownership always comes from the authenticated device's sponsor through the
 * Phase 3A property mapping, never from anything the desktop sends.
 */

export const OFFICE_MEDIA_MAX_BYTES = 8 * 1024 * 1024;

/** Image types only. Office property media is a public photo gallery. */
export const OFFICE_MEDIA_CONTENT_TYPES = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
} as const;

export type OfficeMediaContentType = keyof typeof OFFICE_MEDIA_CONTENT_TYPES;

/**
 * Object keys are always generated here from a server-side uuid. A desktop
 * filesystem path is never used as, or reflected into, a storage key or a
 * public URL.
 */
export const OFFICE_MEDIA_KEY_PREFIX = "office/property-media/";
const OBJECT_KEY_PATTERN = /^office\/property-media\/[0-9a-f-]{36}\.(png|jpg|webp)$/;

export class OfficeMediaError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, status: number, message?: string) {
    super(message ?? code);
    this.name = "OfficeMediaError";
    this.code = code;
    this.status = status;
  }
}

export type OfficeMediaLink = {
  id: string;
  sponsorId: string;
  propertyId: string;
  externalId: string;
  mediaKey: string;
  contentHash: string | null;
  mediaId: string;
  objectKey: string;
  status: string;
};

export type OfficeMediaRecord = {
  mediaId: string;
  propertyId: string;
  mediaKey: string;
  url: string;
  mimeType: string;
  size: number;
  order: number;
  isPrimary: boolean;
  altText: string;
  created: boolean;
};

function nowIso(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

export function isValidOfficeMediaObjectKey(key: string): boolean {
  return OBJECT_KEY_PATTERN.test(String(key ?? ""));
}

/** Public read URL for a stored object. Never a local path. */
export function publicUrlForObjectKey(objectKey: string): string {
  return `/api/office/v1/media?key=${encodeURIComponent(objectKey)}`;
}

export function contentTypeForObjectKey(key: string): string {
  if (key.endsWith(".png")) return "image/png";
  if (key.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

/**
 * Resolves the declared type, falling back to the file extension, exactly like
 * the existing asset upload route. An unrecognised type is rejected, never
 * guessed at.
 */
export function resolveContentType(declared: unknown, fileName: unknown): OfficeMediaContentType | null {
  const raw = String(declared ?? "").trim().toLowerCase();
  const normalized = raw === "image/jpg" ? "image/jpeg" : raw;
  if (normalized in OFFICE_MEDIA_CONTENT_TYPES) return normalized as OfficeMediaContentType;
  const extension = String(fileName ?? "").split(".").pop()?.toLowerCase() ?? "";
  const byExtension: Record<string, OfficeMediaContentType> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
  };
  return byExtension[extension] ?? null;
}

/**
 * Magic-byte check. This is what stops a script or executable renamed to .jpg
 * from being stored and then served back as an image.
 */
export function signatureMatches(bytes: Uint8Array, contentType: OfficeMediaContentType): boolean {
  if (contentType === "image/png") {
    return bytes.length >= 8 &&
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
      bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  }
  if (contentType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  return bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Resolves the property this device is allowed to touch. The sponsor comes from
 * the authenticated credential; a device can only ever reach a property its own
 * sponsor published.
 */
export async function resolveOwnedProperty(sponsorId: string, externalId: string): Promise<{ propertyId: string; externalId: string }> {
  const sponsor = String(sponsorId ?? "").trim();
  const external = String(externalId ?? "").trim();
  if (!sponsor) throw new OfficeMediaError("SPONSOR_REQUIRED", 401);
  if (!external) throw new OfficeMediaError("ENTITY_ID_REQUIRED", 400);

  const link = await getOfficePropertyLink(sponsor, external);
  if (!link || link.status !== "active") {
    throw new OfficeMediaError("PROPERTY_NOT_FOUND", 404, "no published property maps to this office entity");
  }
  return { propertyId: link.propertyId, externalId: external };
}

export async function getOfficeMediaLink(propertyId: string, mediaKey: string): Promise<OfficeMediaLink | null> {
  const db = await getIntegrationDb();
  const row = await db
    .prepare("SELECT * FROM office_property_media_links WHERE property_id = ?1 AND media_key = ?2 LIMIT 1")
    .bind(String(propertyId), String(mediaKey))
    .first<Record<string, unknown>>();
  if (!row) return null;
  return {
    id: String(row.id),
    sponsorId: String(row.sponsor_id),
    propertyId: String(row.property_id),
    externalId: String(row.external_id),
    mediaKey: String(row.media_key),
    contentHash: row.content_hash == null ? null : String(row.content_hash),
    mediaId: String(row.media_id),
    objectKey: String(row.object_key),
    status: String(row.status ?? "active"),
  };
}

async function nextSortOrder(propertyId: string): Promise<number> {
  const db = await getIntegrationDb();
  const rows = await db
    .prepare('SELECT "order" FROM property_media WHERE property_id = ?1')
    .bind(propertyId)
    .all<Record<string, unknown>>();
  let max = -1;
  for (const row of rows.results ?? []) {
    const value = Number(row.order);
    if (Number.isFinite(value) && value > max) max = value;
  }
  return max + 1;
}

/** At most one featured image per property, always. */
async function applyPrimary(propertyId: string, mediaId: string): Promise<void> {
  const db = await getIntegrationDb();
  const rows = await db
    .prepare("SELECT id FROM property_media WHERE property_id = ?1")
    .bind(propertyId)
    .all<Record<string, unknown>>();
  for (const row of rows.results ?? []) {
    const id = String(row.id);
    await db
      .prepare("UPDATE property_media SET is_featured = ?1 WHERE id = ?2")
      .bind(id === mediaId, id)
      .run();
  }
}

export type UploadOfficeMediaInput = {
  sponsorId: string;
  deviceId?: string | null;
  externalId: string;
  mediaKey: string;
  fileName?: string;
  declaredType?: string;
  bytes: ArrayBuffer;
  sortOrder?: number | null;
  isPrimary?: boolean;
  altText?: string;
  now?: string;
};

/**
 * Stores the bytes, then writes the canonical media row.
 *
 * Order matters: the object is written first, and if the database write then
 * fails the object is deleted again, so a failure can never leave a media row
 * pointing at nothing. Re-uploading the same local image replaces the bytes at
 * the SAME object key and updates the SAME row — it never creates a second one.
 */
export async function uploadOfficePropertyMedia(input: UploadOfficeMediaInput): Promise<OfficeMediaRecord> {
  const owned = await resolveOwnedProperty(input.sponsorId, input.externalId);
  const mediaKey = String(input.mediaKey ?? "").trim().slice(0, 160);
  if (!mediaKey) throw new OfficeMediaError("MEDIA_KEY_REQUIRED", 400);

  const bytes = input.bytes;
  if (!bytes || bytes.byteLength === 0) throw new OfficeMediaError("EMPTY_FILE", 400);
  if (bytes.byteLength > OFFICE_MEDIA_MAX_BYTES) throw new OfficeMediaError("FILE_TOO_LARGE", 413);

  const contentType = resolveContentType(input.declaredType, input.fileName);
  if (!contentType) throw new OfficeMediaError("UNSUPPORTED_MEDIA_TYPE", 415);
  if (!signatureMatches(new Uint8Array(bytes).slice(0, 32), contentType)) {
    throw new OfficeMediaError("INVALID_FILE_SIGNATURE", 415, "the file content does not match its declared image type");
  }

  const contentHash = await sha256Hex(bytes);
  const db = await getIntegrationDb();
  const now = input.now ?? nowIso();
  const existing = await getOfficeMediaLink(owned.propertyId, mediaKey);

  const objectKey = existing && existing.status === "active"
    ? existing.objectKey
    : `${OFFICE_MEDIA_KEY_PREFIX}${crypto.randomUUID()}.${OFFICE_MEDIA_CONTENT_TYPES[contentType]}`;
  const url = publicUrlForObjectKey(objectKey);

  const bucket = await getOfficeMediaBucket();
  await bucket.put(objectKey, bytes, {
    httpMetadata: {
      contentType,
      cacheControl: "public, max-age=31536000, immutable",
      contentDisposition: "inline",
    },
    customMetadata: {
      propertyId: owned.propertyId,
      mediaKey,
      contentHash,
    },
  });

  const altText = String(input.altText ?? "").slice(0, 200);
  const isPrimary = Boolean(input.isPrimary);

  try {
    if (existing && existing.status === "active") {
      const order = input.sortOrder == null ? null : Number(input.sortOrder);
      if (order != null && Number.isFinite(order)) {
        await db
          .prepare('UPDATE property_media SET url = ?1, mime_type = ?2, size = ?3, alt_text = ?4, "order" = ?5 WHERE id = ?6')
          .bind(url, contentType, bytes.byteLength, altText, order, existing.mediaId)
          .run();
      } else {
        await db
          .prepare("UPDATE property_media SET url = ?1, mime_type = ?2, size = ?3, alt_text = ?4 WHERE id = ?5")
          .bind(url, contentType, bytes.byteLength, altText, existing.mediaId)
          .run();
      }
      await db
        .prepare("UPDATE office_property_media_links SET content_hash = ?1, object_key = ?2, device_id = ?3, status = 'active', updated_at = ?4 WHERE id = ?5")
        .bind(contentHash, objectKey, input.deviceId ?? null, now, existing.id)
        .run();
      if (isPrimary) await applyPrimary(owned.propertyId, existing.mediaId);

      const current = await readMediaRow(existing.mediaId);
      return {
        mediaId: existing.mediaId,
        propertyId: owned.propertyId,
        mediaKey,
        url,
        mimeType: contentType,
        size: bytes.byteLength,
        order: current.order,
        isPrimary: current.isPrimary,
        altText,
        created: false,
      };
    }

    const mediaId = crypto.randomUUID();
    const order = input.sortOrder != null && Number.isFinite(Number(input.sortOrder))
      ? Number(input.sortOrder)
      : await nextSortOrder(owned.propertyId);

    await db
      .prepare(
        `INSERT INTO property_media
          (id, property_id, url, type, "order", is_featured, alt_text, size, mime_type, created_at)
         VALUES (?1, ?2, ?3, 'image', ?4, ?5, ?6, ?7, ?8, ?9)`,
      )
      .bind(mediaId, owned.propertyId, url, order, false, altText, bytes.byteLength, contentType, now)
      .run();

    if (existing) {
      await db
        .prepare("UPDATE office_property_media_links SET media_id = ?1, object_key = ?2, content_hash = ?3, device_id = ?4, status = 'active', updated_at = ?5 WHERE id = ?6")
        .bind(mediaId, objectKey, contentHash, input.deviceId ?? null, now, existing.id)
        .run();
    } else {
      await db
        .prepare(
          `INSERT INTO office_property_media_links
            (id, sponsor_id, device_id, property_id, external_id, media_key, content_hash, media_id, object_key, status, created_at, updated_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'active', ?10, ?11)`,
        )
        .bind(
          crypto.randomUUID(), String(input.sponsorId).trim(), input.deviceId ?? null,
          owned.propertyId, owned.externalId, mediaKey, contentHash, mediaId, objectKey, now, now,
        )
        .run();
    }

    if (isPrimary) await applyPrimary(owned.propertyId, mediaId);

    const current = await readMediaRow(mediaId);
    return {
      mediaId,
      propertyId: owned.propertyId,
      mediaKey,
      url,
      mimeType: contentType,
      size: bytes.byteLength,
      order: current.order,
      isPrimary: current.isPrimary,
      altText,
      created: true,
    };
  } catch (error) {
    // Compensate: never leave a stored object that no row references.
    try {
      if (!existing) await bucket.delete(objectKey);
    } catch {
      // reported through the thrown error below
    }
    throw error;
  }
}

async function readMediaRow(mediaId: string): Promise<{ order: number; isPrimary: boolean }> {
  const db = await getIntegrationDb();
  const row = await db
    .prepare("SELECT * FROM property_media WHERE id = ?1 LIMIT 1")
    .bind(mediaId)
    .first<Record<string, unknown>>();
  return {
    order: Number(row?.order ?? 0),
    isPrimary: row?.is_featured === true || row?.is_featured === 1 || row?.is_featured === "1",
  };
}

/**
 * Removes one media item the office published. Idempotent: deleting something
 * already deleted, or never published, is a success with `changed: false`.
 */
export async function deleteOfficePropertyMedia(input: { sponsorId: string; externalId: string; mediaKey: string; now?: string }): Promise<{ mediaId: string | null; changed: boolean; storageRemoved: boolean }> {
  const owned = await resolveOwnedProperty(input.sponsorId, input.externalId);
  const mediaKey = String(input.mediaKey ?? "").trim();
  if (!mediaKey) throw new OfficeMediaError("MEDIA_KEY_REQUIRED", 400);

  const link = await getOfficeMediaLink(owned.propertyId, mediaKey);
  if (!link || link.status !== "active") return { mediaId: null, changed: false, storageRemoved: false };

  const db = await getIntegrationDb();
  const now = input.now ?? nowIso();

  await db.prepare("DELETE FROM property_media WHERE id = ?1 AND property_id = ?2").bind(link.mediaId, owned.propertyId).run();
  await db
    .prepare("UPDATE office_property_media_links SET status = 'deleted', updated_at = ?1 WHERE id = ?2")
    .bind(now, link.id)
    .run();

  // The row is gone either way; a storage failure is reported, never silently
  // turned into a failed delete that would strand the listing.
  let storageRemoved = false;
  try {
    const bucket = await getOfficeMediaBucket();
    await bucket.delete(link.objectKey);
    storageRemoved = true;
  } catch {
    storageRemoved = false;
  }

  return { mediaId: link.mediaId, changed: true, storageRemoved };
}

/** Sets the single featured image for this office's property. */
export async function setOfficePropertyPrimaryMedia(input: { sponsorId: string; externalId: string; mediaKey: string }): Promise<{ mediaId: string }> {
  const owned = await resolveOwnedProperty(input.sponsorId, input.externalId);
  const link = await getOfficeMediaLink(owned.propertyId, String(input.mediaKey ?? "").trim());
  if (!link || link.status !== "active") throw new OfficeMediaError("MEDIA_NOT_FOUND", 404);
  await applyPrimary(owned.propertyId, link.mediaId);
  return { mediaId: link.mediaId };
}

/** Reorders without touching bytes, rows' identity or their property. */
export async function reorderOfficePropertyMedia(input: { sponsorId: string; externalId: string; mediaKeys: string[] }): Promise<{ ordered: number }> {
  const owned = await resolveOwnedProperty(input.sponsorId, input.externalId);
  const db = await getIntegrationDb();
  let position = 0;
  for (const key of input.mediaKeys ?? []) {
    const link = await getOfficeMediaLink(owned.propertyId, String(key ?? "").trim());
    if (!link || link.status !== "active") continue;
    await db
      .prepare('UPDATE property_media SET "order" = ?1 WHERE id = ?2 AND property_id = ?3')
      .bind(position, link.mediaId, owned.propertyId)
      .run();
    position += 1;
  }
  return { ordered: position };
}

export async function listOfficePropertyMedia(input: { sponsorId: string; externalId: string }): Promise<Array<Record<string, unknown>>> {
  const owned = await resolveOwnedProperty(input.sponsorId, input.externalId);
  const db = await getIntegrationDb();
  const rows = await db
    .prepare("SELECT * FROM property_media WHERE property_id = ?1")
    .bind(owned.propertyId)
    .all<Record<string, unknown>>();
  const links = await db
    .prepare("SELECT * FROM office_property_media_links WHERE property_id = ?1")
    .bind(owned.propertyId)
    .all<Record<string, unknown>>();

  const keyByMediaId = new Map<string, string>();
  for (const link of links.results ?? []) {
    if (String(link.status ?? "active") === "active") keyByMediaId.set(String(link.media_id), String(link.media_key));
  }

  return (rows.results ?? [])
    .map((row) => ({
      mediaId: String(row.id),
      mediaKey: keyByMediaId.get(String(row.id)) ?? null,
      url: String(row.url ?? ""),
      mimeType: row.mime_type == null ? "" : String(row.mime_type),
      size: Number(row.size ?? 0),
      order: Number(row.order ?? 0),
      isPrimary: row.is_featured === true || row.is_featured === 1 || row.is_featured === "1",
      altText: row.alt_text == null ? "" : String(row.alt_text),
    }))
    .sort((a, b) => a.order - b.order);
}
