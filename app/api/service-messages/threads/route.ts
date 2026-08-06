import { NextResponse } from "next/server";

import { getSessionIdentity } from "@/lib/sponsor-auth";
import { listInbox } from "@services/marketplace";
import { SERVICE_ERROR_CODES } from "@services/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  const threads = await listInbox(identity.email);
  return NextResponse.json({ threads }, { headers: { "Cache-Control": "no-store" } });
}
