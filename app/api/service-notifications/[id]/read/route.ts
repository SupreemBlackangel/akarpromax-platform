import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity } from "@/lib/sponsor-auth";
import { markNotificationRead } from "@services/marketplace";
import { SERVICE_ERROR_CODES } from "@services/constants";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  const { id } = await params;
  await markNotificationRead(id, identity.email);
  return NextResponse.json({ ok: true });
}
