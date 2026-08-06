import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { getRequestFull, listRequestMatches } from "@/lib/services/marketplace";
import { runMatching } from "@/lib/services/matching";
import { SERVICE_ERROR_CODES } from "@/lib/services/constants";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const existing = await getRequestFull(id);
  if (!existing) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.NOT_FOUND }, { status: 404 });
  }
  const matches = await listRequestMatches(id);
  return NextResponse.json({ matches }, { headers: { "Cache-Control": "no-store" } });
}

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
  const isCustomer = String(existing.customer_user_id) === identity.email;
  const isAdmin = hasSponsorPermission(identity, PERMISSIONS.SERVICE_REQUESTS_MANAGE_ALL);
  if (!isCustomer && !isAdmin) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
  }
  const matched = await runMatching(id);
  return NextResponse.json({ ok: true, matched });
}
