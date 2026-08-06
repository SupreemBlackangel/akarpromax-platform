import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity } from "@/lib/sponsor-auth";
import { getRequestFull, cancelRequestFull } from "@/lib/services/marketplace";
import { SERVICE_ERROR_CODES } from "@/lib/services/constants";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  const { id } = await params;
  const existing = await getRequestFull(id);
  if (!existing) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.NOT_FOUND }, { status: 404 });
  }
  const body = (await request.json().catch(() => null)) as { reason?: string } | null;
  try {
    await cancelRequestFull(id, identity.email, body?.reason ? body.reason.trim().slice(0, 500) || null : null, { userId: identity.email, ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null });
  } catch (error) {
    if (error instanceof Error && error.message === "REQUEST_STATUS_INVALID") {
      return NextResponse.json({ error: "request_status_invalid" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "ONLY_CUSTOMER") {
      return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
    }
    throw error;
  }
  return NextResponse.json({ ok: true });
}
