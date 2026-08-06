import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity } from "@/lib/sponsor-auth";
import { getProviderProfileByUserId, addProviderDocument, listProviderDocuments } from "@/lib/services/marketplace";
import { SERVICE_ERROR_CODES } from "@/lib/services/constants";

export const dynamic = "force-dynamic";

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const documents = await listProviderDocuments(id);
  return NextResponse.json({ documents }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest, { params }: Params) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  const { id } = await params;
  const ownProfile = await getProviderProfileByUserId(identity.email);
  if (!ownProfile || String(ownProfile.id) !== id) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  const fileName = clean(body.fileName, 300);
  const fileUrl = clean(body.fileUrl, 800);
  const type = clean(body.type, 40);
  if (!fileName || !fileUrl || !type) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  const documentId = await addProviderDocument(
    {
      providerId: id,
      type,
      fileName,
      fileUrl,
      fileSize: body.fileSize == null || !Number.isFinite(Number(body.fileSize)) ? undefined : Math.round(Number(body.fileSize)),
      mimeType: clean(body.mimeType, 120) || null,
      notes: clean(body.notes, 500) || null,
      uploadedBy: identity.email,
    },
    { userId: identity.email, ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null },
  );
  return NextResponse.json({ ok: true, id: documentId }, { status: 201 });
}
