import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity } from "@/lib/sponsor-auth";
import { listJobs } from "@services/marketplace";
import { SERVICE_ERROR_CODES } from "@services/constants";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  const q = request.nextUrl.searchParams;
  const role = q.get("role") === "provider" ? "provider" : q.get("role") === "customer" ? "customer" : undefined;
  const jobs = await listJobs({
    participantUserId: identity.email,
    role,
    status: q.get("status") ?? undefined,
    limit: q.get("limit") ? Math.max(1, Math.min(100, Number(q.get("limit")) || 50)) : 50,
  });
  return NextResponse.json({ jobs }, { headers: { "Cache-Control": "no-store" } });
}
