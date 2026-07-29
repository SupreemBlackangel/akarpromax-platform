import { NextRequest, NextResponse } from "next/server";
import { getSponsorIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { getSponsorAssetsBucket } from "@/lib/runtime-assets";

export const dynamic = "force-dynamic";

const MAX_LOGO_BYTES = 4 * 1024 * 1024;
const contentTypes = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
} as const;

function isValidLogoKey(key: string) {
  return /^sponsors\/logos\/[a-f0-9-]{36}\.(png|jpg|webp)$/.test(key);
}

function fileSignatureMatches(bytes: Uint8Array, contentType: keyof typeof contentTypes) {
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

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key") || "";
  if (!isValidLogoKey(key)) {
    return NextResponse.json({ error: "Invalid asset key" }, { status: 400 });
  }

  const bucket = await getSponsorAssetsBucket();
  const object = await bucket.get(key);
  if (!object) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

  const contentType = object.httpMetadata?.contentType ||
    (key.endsWith(".png") ? "image/png" : key.endsWith(".webp") ? "image/webp" : "image/jpeg");
  return new Response(object.body, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(object.size),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": "inline",
      "ETag": object.etag,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, "sponsors:edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Image file is required" }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_LOGO_BYTES) {
    return NextResponse.json({ error: "Image must be smaller than 4 MB" }, { status: 400 });
  }

  const contentType = file.type as keyof typeof contentTypes;
  const extension = contentTypes[contentType];
  if (!extension) {
    return NextResponse.json({ error: "Only PNG, JPG and WebP images are supported" }, { status: 415 });
  }

  const buffer = await file.arrayBuffer();
  if (!fileSignatureMatches(new Uint8Array(buffer), contentType)) {
    return NextResponse.json({ error: "The uploaded file is not a valid image" }, { status: 415 });
  }

  const key = `sponsors/logos/${crypto.randomUUID()}.${extension}`;
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
    },
  });

  return NextResponse.json({
    key,
    url: `/api/sponsor-assets?key=${encodeURIComponent(key)}`,
    name: file.name,
    size: file.size,
  }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, "sponsors:edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const key = request.nextUrl.searchParams.get("key") || "";
  if (!isValidLogoKey(key)) {
    return NextResponse.json({ error: "Invalid asset key" }, { status: 400 });
  }
  const bucket = await getSponsorAssetsBucket();
  await bucket.delete(key);
  return new NextResponse(null, { status: 204 });
}
