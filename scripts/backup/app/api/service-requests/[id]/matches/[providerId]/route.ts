import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity } from "@/lib/sponsor-auth";
import { getRequestFull, markMatchContacted, providerIgnoreMatch } from "@services/marketplace";
import { SERVICE_ERROR_CODES } from "@services/constants";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; providerId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  const { id, providerId } = await params;
  const existing = await getRequestFull(id);
  if (!existing) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.NOT_FOUND }, { status: 404 });
  }
  if (String(existing.customer_user_id) !== identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as { action?: string } | null;
  const action = body?.action === "contact" ? "contact" : body?.action === "ignore" ? "ignore" : "";
  if (action === "contact") {
    await markMatchContacted(id, String(providerId), { userId: identity.email });
  } else if (action === "ignore") {
    await providerIgnoreMatch(id, String(providerId), { userId: identity.email });
  } else {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
