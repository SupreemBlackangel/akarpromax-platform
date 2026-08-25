import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { auditEvents, organizationMembers, organizations } from "@/lib/db/schema";
import { ensurePgIdentitySchema } from "@/lib/db/pg-identity-schema";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };

function platformReviewer(session: { role: string; permissions: string[] }): boolean {
  return (
    session.role === "super_admin" ||
    session.permissions.includes("*") ||
    session.permissions.includes("organizations.review")
  );
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  await ensurePgIdentitySchema();

  const session = await getSession(request.headers.get("cookie") ?? undefined);
  if (!session?.userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!platformReviewer(session)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const action = typeof body?.action === "string" ? body.action : "";
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

  if (!["approve", "reject", "suspend", "reactivate"].includes(action)) {
    return NextResponse.json({ error: "INVALID_ACTION" }, { status: 400 });
  }
  if (["reject", "suspend"].includes(action) && !reason) {
    return NextResponse.json({ error: "REASON_REQUIRED" }, { status: 400 });
  }

  const { db, end } = getDb();
  try {
    return await db.transaction(async (tx) => {
      const [selfMembership] = await tx
        .select({ id: organizationMembers.id })
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, id),
            eq(organizationMembers.userId, session.userId),
            eq(organizationMembers.status, "active"),
          ),
        )
        .limit(1);

      if (selfMembership) {
        return NextResponse.json({ error: "CANNOT_REVIEW_OWN_ORGANIZATION" }, { status: 403 });
      }

      const [current] = await tx
        .select()
        .from(organizations)
        .where(eq(organizations.id, id))
        .limit(1);
      if (!current || current.status === "deleted") {
        return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      }

      const expected =
        action === "approve" || action === "reject"
          ? "pending_review"
          : action === "suspend"
            ? "active"
            : "suspended";

      if (current.status !== expected) {
        return NextResponse.json({ error: "INVALID_ORGANIZATION_TRANSITION" }, { status: 409 });
      }

      const nextStatus =
        action === "approve"
          ? "active"
          : action === "reject"
            ? "rejected"
            : action === "suspend"
              ? "suspended"
              : "active";

      const [updated] = await tx
        .update(organizations)
        .set({
          status: nextStatus,
          updatedAt: new Date(),
          ...(action === "approve" ? { approvedAt: new Date(), suspendedAt: null } : {}),
          ...(action === "suspend" ? { suspendedAt: new Date() } : {}),
          ...(action === "reactivate" ? { suspendedAt: null } : {}),
        })
        .where(and(eq(organizations.id, id), eq(organizations.status, expected)))
        .returning();

      if (!updated) {
        return NextResponse.json({ error: "ORGANIZATION_REVIEW_RACE" }, { status: 409 });
      }

      await tx.insert(auditEvents).values({
        userId: session.userId,
        eventType: `ORGANIZATION_${action.toUpperCase()}`,
        detail: {
          organizationId: id,
          fromStatus: expected,
          toStatus: nextStatus,
          reason: reason || null,
        },
      });

      return NextResponse.json({ ok: true, organization: updated });
    });
  } finally {
    await end();
  }
}
