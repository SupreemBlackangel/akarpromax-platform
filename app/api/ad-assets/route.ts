import { NextRequest, NextResponse } from "next/server";
import { getSponsorIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { getSponsorAssetsBucket } from "@/lib/runtime-assets";
import { getRuntimeDb } from "@/lib/runtime-db";
import { PERMISSIONS } from "@/src/constants/permissions";
import { processAdImage } from "@/lib/ads/image-processing";

export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
const MAX_VIDEO_SECONDS = 15;
const contentTypes = {
  "image/png": { extension: "png", mediaType: "image" },
  "image/jpeg": { extension: "jpg", mediaType: "image" },
  "image/webp": { extension: "webp", mediaType: "image" },
  "video/mp4": { extension: "mp4", mediaType: "video" },
  "video/webm": { extension: "webm", mediaType: "video" },
  "video/ogg": { extension: "ogv", mediaType: "video" },
} as const;

type SupportedContentType = keyof typeof contentTypes;
type MultipartPart = { partNumber: number; etag: string };
type MultipartUpload = { uploadId: string; uploadPart(partNumber: number, value: ArrayBuffer): Promise<MultipartPart>; complete(parts: MultipartPart[]): Promise<unknown> };
type MultipartBucket = R2Bucket & { createMultipartUpload(key: string, options?: unknown): Promise<MultipartUpload>; resumeMultipartUpload(key: string, uploadId: string): MultipartUpload };

function resolveDeclaredContentType(contentType: unknown, fileName: unknown): SupportedContentType | null {
  const declared = typeof contentType === "string" ? contentType : "";
  if (declared in contentTypes) return declared as SupportedContentType;
  const extension = typeof fileName === "string" ? fileName.split(".").pop()?.toLowerCase() : "";
  const byExtension: Record<string, SupportedContentType> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", mp4: "video/mp4", webm: "video/webm", ogg: "video/ogg", ogv: "video/ogg" };
  return extension ? byExtension[extension] ?? null : null;
}

function resolveContentType(file: File): SupportedContentType | null {
  const declared = file.type === "image/jpg" ? "image/jpeg" : file.type;
  if (declared in contentTypes) return declared as SupportedContentType;
  const extension = file.name.split(".").pop()?.toLowerCase();
  const byExtension: Record<string, SupportedContentType> = {
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp",
    mp4: "video/mp4", webm: "video/webm", ogg: "video/ogg", ogv: "video/ogg",
  };
  return extension ? byExtension[extension] ?? null : null;
}

function signatureMatches(bytes: Uint8Array, contentType: SupportedContentType) {
  if (contentType === "image/png") {
    return bytes.length >= 8 &&
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
      bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  }
  if (contentType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (contentType === "image/webp") {
    return bytes.length >= 12 &&
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  }
  if (contentType === "video/mp4") {
    return bytes.length >= 12 &&
      bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70;
  }
  if (contentType === "video/webm") {
    return bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  }
  return bytes.length >= 4 && bytes[0] === 0x4f && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53;
}

function validKey(key: string) {
  return /^ads\/media\/[a-f0-9-]{36}\.(png|jpg|webp|mp4|webm|ogv)$/.test(key);
}

function contentTypeForKey(key: string) {
  if (key.endsWith(".png")) return "image/png";
  if (key.endsWith(".jpg")) return "image/jpeg";
  if (key.endsWith(".webp")) return "image/webp";
  if (key.endsWith(".mp4")) return "video/mp4";
  if (key.endsWith(".webm")) return "video/webm";
  return "video/ogg";
}

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key") || "";
  if (key) {
    if (!validKey(key)) return NextResponse.json({ error: "Invalid asset key" }, { status: 400 });
    const bucket = await getSponsorAssetsBucket() as MultipartBucket;
    const object = await bucket.get(key);
    if (!object) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    return new Response(object.body, {
      headers: {
        "Content-Type": object.httpMetadata?.contentType || contentTypeForKey(key),
        "Content-Length": String(object.size),
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Disposition": "inline",
        "ETag": object.etag,
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.ADS_VIEW)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const db = await getRuntimeDb();
  const rows = await db.prepare(
    `SELECT id, object_key, url, file_name, content_type, media_type, size_bytes, uploaded_by, created_at
     FROM ad_assets ORDER BY created_at DESC LIMIT 200`,
  ).all<{
    id: string; object_key: string; url: string; file_name: string; content_type: string;
    media_type: string; size_bytes: number; uploaded_by: string | null; created_at: string;
  }>();
  return NextResponse.json({
    assets: rows.results.map((row) => ({
      id: row.id,
      key: row.object_key,
      url: row.url,
      fileName: row.file_name,
      contentType: row.content_type,
      mediaType: row.media_type,
      size: Number(row.size_bytes),
      uploadedBy: row.uploaded_by,
      createdAt: row.created_at,
    })),
  }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, "media:upload")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const uploadMode = request.nextUrl.searchParams.get("upload");
  if (uploadMode === "init") {
    const body = await request.json() as { fileName?: unknown; contentType?: unknown; size?: unknown; duration?: unknown };
    const contentType = resolveDeclaredContentType(body.contentType, body.fileName);
    if (!contentType) return NextResponse.json({ error: "Unsupported media type" }, { status: 415 });
    const definition = contentTypes[contentType];
    const size = Number(body.size);
    const maxBytes = definition.mediaType === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (!Number.isFinite(size) || size <= 0 || size > maxBytes) return NextResponse.json({ error: "File size is not allowed" }, { status: 400 });
    const duration = Number(body.duration);
    if (definition.mediaType === "video" && (!Number.isFinite(duration) || duration <= 0 || duration > MAX_VIDEO_SECONDS)) return NextResponse.json({ error: "Video duration must be 15 seconds or less" }, { status: 400 });
    const id = crypto.randomUUID();
    const key = `ads/media/${id}.${definition.extension}`;
    const bucket = await getSponsorAssetsBucket() as MultipartBucket;
    const upload = await bucket.createMultipartUpload(key, { httpMetadata: { contentType, cacheControl: "public, max-age=31536000, immutable", contentDisposition: "inline" } });
    return NextResponse.json({ id, key, uploadId: upload.uploadId, mediaType: definition.mediaType, contentType, fileName: String(body.fileName || "media").slice(0, 180), size, duration: definition.mediaType === "video" ? duration : null });
  }
  if (uploadMode === "part") {
    const key = request.headers.get("x-ad-object-key") || "";
    const uploadId = request.headers.get("x-ad-upload-id") || "";
    const partNumber = Number(request.headers.get("x-ad-part-number"));
    const bytes = await request.arrayBuffer();
    if (!validKey(key) || !uploadId || !Number.isInteger(partNumber) || partNumber < 1 || partNumber > 10000 || !bytes.byteLength || bytes.byteLength > 6 * 1024 * 1024) return NextResponse.json({ error: "Invalid upload part" }, { status: 400 });
    // The single-shot path verifies magic bytes, but the multipart path — which
    // is the one the admin UI actually uses — did not, so the check could be
    // bypassed entirely. The first part carries the file header: verify it
    // against the content type implied by the object key.
    if (partNumber === 1) {
      const extension = key.split(".").pop() ?? "";
      const declared = resolveDeclaredContentType(null, `x.${extension}`);
      if (!declared || !signatureMatches(new Uint8Array(bytes.slice(0, 16)), declared)) {
        return NextResponse.json({ error: "File content does not match its type" }, { status: 400 });
      }
    }
    const bucket = await getSponsorAssetsBucket() as MultipartBucket;
    const upload = bucket.resumeMultipartUpload(key, uploadId);
    const part = await upload.uploadPart(partNumber, bytes);
    return NextResponse.json({ partNumber: part.partNumber, etag: part.etag });
  }
  if (uploadMode === "complete") {
    const body = await request.json() as { id?: string; key?: string; uploadId?: string; fileName?: string; contentType?: string; mediaType?: string; size?: number; parts?: Array<{ partNumber: number; etag: string }> };
    if (!body.id || !validKey(body.key || "") || !body.uploadId || !Array.isArray(body.parts) || !body.parts.length || body.parts.length > 10000) return NextResponse.json({ error: "Invalid upload completion" }, { status: 400 });
    const contentType = resolveDeclaredContentType(body.contentType, body.fileName);
    const definition = contentType ? contentTypes[contentType] : null;
    if (!definition || body.mediaType !== definition.mediaType) return NextResponse.json({ error: "Invalid media metadata" }, { status: 400 });
    const bucket = await getSponsorAssetsBucket() as MultipartBucket;
    const upload = bucket.resumeMultipartUpload(body.key!, body.uploadId);
    await upload.complete(body.parts.map((part) => ({ partNumber: Number(part.partNumber), etag: String(part.etag) })));
    const url = `/api/ad-assets?key=${encodeURIComponent(body.key!)}`;
    const db = await getRuntimeDb();
    await db.batch([
      db.prepare(`INSERT INTO ad_assets (id, object_key, url, file_name, content_type, media_type, size_bytes, uploaded_by) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`).bind(body.id, body.key, url, String(body.fileName || "media").slice(0, 180), contentType, definition.mediaType, Number(body.size), identity.email),
      db.prepare(`INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, metadata) VALUES (?1, ?2, 'ad.asset_uploaded', 'ad_asset', ?3, ?4)`).bind(crypto.randomUUID(), identity.email, body.id, JSON.stringify({ key: body.key, size: body.size, contentType, multipart: true })),
    ]);
    return NextResponse.json({ asset: { id: body.id, key: body.key, url, fileName: body.fileName, contentType, mediaType: definition.mediaType, size: Number(body.size) } }, { status: 201 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Media file is required" }, { status: 400 });
  const contentType = resolveContentType(file);
  if (!contentType) {
    return NextResponse.json({ error: "PNG, JPG, WebP, MP4, WebM or OGG files are supported" }, { status: 415 });
  }
  const definition = contentTypes[contentType];
  const maxBytes = definition.mediaType === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size <= 0 || file.size > maxBytes) {
    return NextResponse.json({ error: definition.mediaType === "video" ? "Video must be smaller than 25 MB" : "Image must be smaller than 8 MB" }, { status: 400 });
  }
  const duration = Number(formData.get("duration"));
  if (definition.mediaType === "video" && (!Number.isFinite(duration) || duration <= 0 || duration > MAX_VIDEO_SECONDS)) {
    return NextResponse.json({ error: "Video duration must be 15 seconds or less" }, { status: 400 });
  }
  const buffer = await file.arrayBuffer();
  if (!signatureMatches(new Uint8Array(buffer).slice(0, 32), contentType)) {
    return NextResponse.json({ error: "The uploaded file signature is invalid" }, { status: 415 });
  }

  // Images run through the ad pipeline (EXIF rotate -> cap width -> WebP) so a
  // creative is never served at its raw upload weight. Videos pass through.
  const processed = definition.mediaType === "image" ? await processAdImage(Buffer.from(buffer)) : null;
  const storedBody: ArrayBuffer | Buffer = processed ? processed.buffer : Buffer.from(buffer);
  const storedContentType = processed ? processed.contentType : contentType;
  const storedExtension = processed ? processed.extension : definition.extension;
  const storedSize = processed ? processed.buffer.byteLength : file.size;

  const id = crypto.randomUUID();
  const key = `ads/media/${id}.${storedExtension}`;
  const url = `/api/ad-assets?key=${encodeURIComponent(key)}`;
  const bucket = await getSponsorAssetsBucket();
  await bucket.put(key, storedBody, {
    httpMetadata: {
      contentType: storedContentType,
      cacheControl: "public, max-age=31536000, immutable",
      contentDisposition: "inline",
    },
    customMetadata: {
      uploadedBy: identity.email || "unknown",
      originalName: file.name.slice(0, 180),
      mediaType: definition.mediaType,
    },
  });

  const db = await getRuntimeDb();
  try {
    await db.batch([
      db.prepare(
        `INSERT INTO ad_assets
          (id, object_key, url, file_name, content_type, media_type, size_bytes, uploaded_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
      ).bind(id, key, url, file.name.slice(0, 180), storedContentType, definition.mediaType, storedSize, identity.email),
      db.prepare(
        `INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, metadata)
         VALUES (?1, ?2, 'ad.asset_uploaded', 'ad_asset', ?3, ?4)`,
      ).bind(crypto.randomUUID(), identity.email, id, JSON.stringify({ key, size: file.size, contentType, duration: definition.mediaType === "video" ? duration : null })),
    ]);
  } catch (error) {
    await bucket.delete(key);
    throw error;
  }

  return NextResponse.json({
    asset: { id, key, url, fileName: file.name, contentType, mediaType: definition.mediaType, size: file.size },
  }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.ADS_DELETE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const key = request.nextUrl.searchParams.get("key") || "";
  if (!validKey(key)) return NextResponse.json({ error: "Invalid asset key" }, { status: 400 });
  const db = await getRuntimeDb();
  const url = `/api/ad-assets?key=${encodeURIComponent(key)}`;
  const used = await db.prepare(
    `SELECT id FROM ad_campaigns
     WHERE media_url = ?1 OR mobile_media_url = ?1 OR poster_url = ?1
     LIMIT 1`,
  ).bind(url).first<{ id: string }>();
  if (used) return NextResponse.json({ error: "Asset is used by a campaign" }, { status: 409 });
  const bucket = await getSponsorAssetsBucket();
  await bucket.delete(key);
  await db.prepare("DELETE FROM ad_assets WHERE object_key = ?1").bind(key).run();
  return new NextResponse(null, { status: 204 });
}
