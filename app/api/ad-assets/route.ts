import { NextRequest, NextResponse } from "next/server";
import { getSponsorIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { getSponsorAssetsBucket } from "@/lib/runtime-assets";
import { getRuntimeDb } from "@/lib/runtime-db";

export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
const contentTypes = {
  "image/png": { extension: "png", mediaType: "image" },
  "image/jpeg": { extension: "jpg", mediaType: "image" },
  "image/webp": { extension: "webp", mediaType: "image" },
  "video/mp4": { extension: "mp4", mediaType: "video" },
  "video/webm": { extension: "webm", mediaType: "video" },
  "video/ogg": { extension: "ogv", mediaType: "video" },
} as const;

type SupportedContentType = keyof typeof contentTypes;

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
    const bucket = await getSponsorAssetsBucket();
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
  if (!hasSponsorPermission(identity, "ads:read")) {
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
  const buffer = await file.arrayBuffer();
  if (!signatureMatches(new Uint8Array(buffer).slice(0, 32), contentType)) {
    return NextResponse.json({ error: "The uploaded file signature is invalid" }, { status: 415 });
  }

  const id = crypto.randomUUID();
  const key = `ads/media/${id}.${definition.extension}`;
  const url = `/api/ad-assets?key=${encodeURIComponent(key)}`;
  const bucket = await getSponsorAssetsBucket();
  await bucket.put(key, buffer, {
    httpMetadata: {
      contentType,
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
      ).bind(id, key, url, file.name.slice(0, 180), contentType, definition.mediaType, file.size, identity.email),
      db.prepare(
        `INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, metadata)
         VALUES (?1, ?2, 'ad.asset_uploaded', 'ad_asset', ?3, ?4)`,
      ).bind(crypto.randomUUID(), identity.email, id, JSON.stringify({ key, size: file.size, contentType })),
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
  if (!hasSponsorPermission(identity, "ads:edit")) {
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
