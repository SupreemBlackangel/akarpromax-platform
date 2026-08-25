import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { getRuntimeDb } from "@/lib/runtime-db";
import { addRequestAttachments, getProviderProfileByUserId, getRequestFull, listRequestAttachments, listRequestMatches } from "@services/marketplace";
import { PERMISSIONS } from "@/src/constants/permissions";
import { SERVICE_ERROR_CODES } from "@services/constants";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }

  const { id } = await params;
  const serviceRequest = await getRequestFull(id);
  if (!serviceRequest) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.REQUEST_NOT_FOUND }, { status: 404 });
  }

  const isCustomer = String(serviceRequest.customer_user_id) === identity.email;
  const isAdmin = hasSponsorPermission(identity, PERMISSIONS.SERVICE_REQUESTS_MANAGE_ALL);
  let isMatchedProvider = false;

  if (!isCustomer && !isAdmin) {
    const provider = await getProviderProfileByUserId(identity.email);
    if (provider?.status === "approved") {
      const matches = await listRequestMatches(id);
      isMatchedProvider = matches.some((match) => String(match.provider_id) === String(provider.id));
    }
  }

  if (!isCustomer && !isAdmin && !isMatchedProvider) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
  }

  const attachments = await listRequestAttachments(id);
  return NextResponse.json({ attachments }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest, { params }: Params) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { attachments?: Array<{ fileName?: string; fileUrl?: string; fileSize?: number; mimeType?: string }> } | null;
  const attachments = Array.isArray(body?.attachments)
    ? body.attachments
        .map((a) => ({
          fileName: typeof a.fileName === "string" ? a.fileName.trim().slice(0, 255) : "",
          fileUrl: typeof a.fileUrl === "string" ? a.fileUrl.trim().slice(0, 1000) : "",
          fileSize: typeof a.fileSize === "number" && Number.isFinite(a.fileSize) ? a.fileSize : 0,
          mimeType: typeof a.mimeType === "string" ? a.mimeType.trim().slice(0, 120) || null : null,
        }))
        .filter((a) => a.fileName && a.fileUrl)
    : [];
  if (!attachments.length) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  const db = await getRuntimeDb();
  const requestRow = await db.prepare("SELECT customer_user_id FROM service_requests WHERE id = ?1").bind(id).first<{ customer_user_id: string }>();
  if (!requestRow) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.REQUEST_NOT_FOUND }, { status: 404 });
  }
  const isCustomer = requestRow.customer_user_id === identity.email;
  if (!isCustomer && !hasSponsorPermission(identity, PERMISSIONS.SERVICE_REQUESTS_MANAGE_ALL)) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
  }
  await addRequestAttachments(id, identity.email, attachments);
  return NextResponse.json({ ok: true }, { status: 201 });
}
