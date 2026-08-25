import { NextRequest, NextResponse } from "next/server";
import { canAccessAmrsAdmin } from "@/lib/amrs/access";
import { ensurePgIdentitySchema } from "@/lib/db/pg-identity-schema";
import { getSessionIdentity } from "@/lib/sponsor-auth";
import { getAdminDashboardStats, executeBulkOrganizationAction, getOrganizationsByStatus } from "@/lib/amrs/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  await ensurePgIdentitySchema();
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!canAccessAmrsAdmin(identity)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const q = request.nextUrl.searchParams;

  if (q.has("status")) {
    const status = q.get("status")!;
    const limit = Math.min(parseInt(q.get("limit") ?? "50", 10), 100);
    const orgs = await getOrganizationsByStatus(status, limit);
    return NextResponse.json({ organizations: orgs }, { headers: { "Cache-Control": "no-store" } });
  }

  const stats = await getAdminDashboardStats();
  return NextResponse.json(stats, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  await ensurePgIdentitySchema();
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!canAccessAmrsAdmin(identity)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const action = body.action as string;
  const entityIds = body.entityIds as string[];
  const reason = body.reason as string | undefined;

  if (!action || !["suspend", "activate", "delete"].includes(action)) {
    return NextResponse.json({ error: "INVALID_ACTION" }, { status: 400 });
  }

  if (!Array.isArray(entityIds) || entityIds.length === 0) {
    return NextResponse.json({ error: "EMPTY_ENTITY_IDS" }, { status: 400 });
  }

  if (entityIds.length > 100) {
    return NextResponse.json({ error: "TOO_MANY_ENTITIES" }, { status: 400 });
  }

  const result = await executeBulkOrganizationAction({
    action: action as "suspend" | "activate" | "delete",
    entityIds,
    reason,
  });

  return NextResponse.json(result);
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "GET, POST, OPTIONS" } });
}
