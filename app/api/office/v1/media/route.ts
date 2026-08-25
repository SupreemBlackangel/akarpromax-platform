import { NextRequest, NextResponse } from "next/server";
import { authenticateOfficeRequest, requireScope } from "@/lib/integration/office-auth";
import { logSecurityEvent } from "@/lib/security/audit";
import { getOfficeMediaBucket } from "@/lib/integration/office-media-store";
import {
  OfficeMediaError,
  contentTypeForObjectKey,
  deleteOfficePropertyMedia,
  isValidOfficeMediaObjectKey,
  listOfficePropertyMedia,
  reorderOfficePropertyMedia,
  setOfficePropertyPrimaryMedia,
  uploadOfficePropertyMedia,
} from "@/lib/integration/office-media";

export const dynamic = "force-dynamic";

/**
 * Office property media.
 *
 * One authenticated route, discriminated by `?action=` exactly like the other
 * Office v1 routes (`auth?action=rotate`, `sync?action=retry`). The previous
 * implementation dispatched on URL path segments that this file can never
 * receive — `/api/office/v1/media` yields segments[2] === "v1" — so every branch
 * was unreachable, no bytes were ever stored, and the ownership check ignored
 * the device entirely. All of that is replaced here.
 *
 * The only unauthenticated branch is `GET ?key=` which streams a stored object,
 * mirroring how `/api/ad-assets` serves its public assets.
 */

function fail(error: unknown): NextResponse {
  if (error instanceof OfficeMediaError) {
    return NextResponse.json({ success: false, error: error.code, message: error.message }, { status: error.status });
  }
  throw error;
}

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(req: NextRequest) {
  const action = (new URL(req.url).searchParams.get("action") ?? "upload").trim().toLowerCase();

  const auth = await authenticateOfficeRequest(req);
  if ("error" in auth) return auth.error;
  const blocked = requireScope(auth.device, "office.properties.update");
  if (blocked) return blocked;

  const sponsorId = auth.device.sponsorId;

  try {
    if (action === "upload") {
      const form = await req.formData();
      const file = form.get("image");
      if (!(file instanceof File)) {
        return NextResponse.json({ success: false, error: "IMAGE_REQUIRED" }, { status: 400 });
      }

      const sortOrderRaw = text(form, "sortOrder");
      const record = await uploadOfficePropertyMedia({
        sponsorId,
        deviceId: auth.device.deviceId,
        externalId: text(form, "entityId"),
        mediaKey: text(form, "mediaKey"),
        fileName: file.name,
        declaredType: file.type,
        bytes: await file.arrayBuffer(),
        sortOrder: sortOrderRaw === "" ? null : Number(sortOrderRaw),
        isPrimary: text(form, "isPrimary") === "true",
        altText: text(form, "altText"),
      });

      logSecurityEvent("OFFICE_MEDIA_UPLOAD", {
        deviceId: auth.device.deviceId,
        propertyId: record.propertyId,
        mediaId: record.mediaId,
        size: record.size,
        created: record.created,
      });

      return NextResponse.json({ success: true, data: record }, { status: record.created ? 201 : 200 });
    }

    if (action === "delete") {
      const form = await req.formData();
      const result = await deleteOfficePropertyMedia({
        sponsorId,
        externalId: text(form, "entityId"),
        mediaKey: text(form, "mediaKey"),
      });

      logSecurityEvent("OFFICE_MEDIA_DELETE", {
        deviceId: auth.device.deviceId,
        mediaId: result.mediaId,
        changed: result.changed,
        storageRemoved: result.storageRemoved,
      });

      return NextResponse.json({ success: true, data: result });
    }

    if (action === "primary") {
      const form = await req.formData();
      const result = await setOfficePropertyPrimaryMedia({
        sponsorId,
        externalId: text(form, "entityId"),
        mediaKey: text(form, "mediaKey"),
      });
      return NextResponse.json({ success: true, data: result });
    }

    if (action === "reorder") {
      const form = await req.formData();
      const keys = text(form, "mediaKeys").split(",").map((key) => key.trim()).filter(Boolean);
      const result = await reorderOfficePropertyMedia({ sponsorId, externalId: text(form, "entityId"), mediaKeys: keys });
      return NextResponse.json({ success: true, data: result });
    }
  } catch (error) {
    return fail(error);
  }

  return NextResponse.json({ success: false, error: "UNKNOWN_ACTION" }, { status: 400 });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key") ?? "";

  // Public object read, same shape as /api/ad-assets. The key format is fixed
  // and server-generated, so nothing here can reach outside the media prefix.
  if (key) {
    if (!isValidOfficeMediaObjectKey(key)) {
      return NextResponse.json({ success: false, error: "INVALID_ASSET_KEY" }, { status: 400 });
    }
    const bucket = await getOfficeMediaBucket();
    const object = await bucket.get(key);
    if (!object) return NextResponse.json({ success: false, error: "ASSET_NOT_FOUND" }, { status: 404 });
    return new Response(object.body, {
      headers: {
        "Content-Type": object.httpMetadata?.contentType || contentTypeForObjectKey(key),
        "Content-Length": String(object.size),
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const auth = await authenticateOfficeRequest(req);
  if ("error" in auth) return auth.error;
  const blocked = requireScope(auth.device, "office.properties.read");
  if (blocked) return blocked;

  try {
    const media = await listOfficePropertyMedia({
      sponsorId: auth.device.sponsorId,
      externalId: (url.searchParams.get("entityId") ?? "").trim(),
    });
    return NextResponse.json({ success: true, data: media });
  } catch (error) {
    return fail(error);
  }
}
