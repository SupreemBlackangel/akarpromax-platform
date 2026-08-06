import { NextResponse } from "next/server";

import { getSessionIdentity } from "@/lib/sponsor-auth";
import { listMatchedRequestsForProvider } from "@/lib/services/marketplace";
import { SERVICE_ERROR_CODES } from "@/lib/services/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  const requests = await listMatchedRequestsForProvider(identity.email, { limit: 100 });
  return NextResponse.json({ requests }, { headers: { "Cache-Control": "no-store" } });
}
