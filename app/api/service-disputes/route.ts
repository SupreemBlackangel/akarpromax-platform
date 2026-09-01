import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity } from "@/lib/sponsor-auth";
import { listDisputesForUser, openDispute } from "@services/core";
import { SERVICE_ERROR_CODES } from "@services/constants";

export const dynamic = "force-dynamic";

/**
 * Canonical disputes endpoint. Backs the customer disputes dashboard
 * (`/dashboard/services/disputes`, which reaches it via the `/api/services/disputes`
 * compat proxy). A dispute belongs to a service order; a user may only see or open
 * disputes on orders where they are the customer or the provider.
 */

export async function GET(request: NextRequest) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  const q = request.nextUrl.searchParams;
  const status = q.get("status")?.trim() || undefined;
  const limit = q.get("limit") ? Math.max(1, Math.min(100, Number(q.get("limit")) || 50)) : 50;
  const disputes = await listDisputesForUser(identity.email, { status, limit });
  return NextResponse.json({ disputes }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { orderId?: string; reason?: string; description?: string } | null;
  const orderId = typeof body?.orderId === "string" ? body.orderId.trim() : "";
  const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 64) : "";
  const description = typeof body?.description === "string" ? body.description.trim().slice(0, 2000) : "";
  if (!orderId || !reason) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  try {
    const id = await openDispute(
      { orderId, openedByUserId: identity.email, reason, description: description || null },
      { userId: identity.email, ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null },
    );
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    const status = code === "ORDER_NOT_FOUND" ? 404 : code === "NOT_PARTICIPANT" ? 403 : code === "DISPUTE_ALREADY_EXISTS" ? 409 : 400;
    return NextResponse.json({ error: code }, { status });
  }
}
