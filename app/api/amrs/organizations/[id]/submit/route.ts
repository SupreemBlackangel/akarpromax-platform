import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";

import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { auditEvents, organizationMembers, organizations } from "@/lib/db/schema";
import { ensurePgIdentitySchema } from "@/lib/db/pg-identity-schema";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  await ensurePgIdentitySchema();

  const session = await getSession(request.headers.get("cookie") ?? undefined);
  if (!session?.userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { db, end } = getDb();
  try {
    return await db.transaction(async (tx) => {
      const [membership] = await tx
        .select({ role: organizationMembers.role })
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, id),
            eq(organizationMembers.userId, session.userId),
            eq(organizationMembers.status, "active"),
          ),
        )
        .limit(1);

      if (!membership || !["owner", "admin"].includes(membership.role)) {
        return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
      }

      const [updated] = await tx
        .update(organizations)
        .set({ status: "pending_review", updatedAt: new Date() })
        .where(
          and(
            eq(organizations.id, id),
            inArray(organizations.status, ["draft", "rejected"]),
          ),
        )
        .returning();

      if (!updated) {
        return NextResponse.json({ error: "INVALID_ORGANIZATION_TRANSITION" }, { status: 409 });
      }

      await tx.insert(auditEvents).values({
        userId: session.userId,
        eventType: "ORGANIZATION_SUBMITTED",
        detail: { organizationId: id, fromStatus: "draft_or_rejected", toStatus: "pending_review" },
      });

      return NextResponse.json({ ok: true, organization: updated });
    });
  } finally {
    await end();
  }
}
