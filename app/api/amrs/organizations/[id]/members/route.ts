import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { organizationMembers, organizations, users } from "@/lib/db/schema";
import { ensurePgIdentitySchema } from "@/lib/db/pg-identity-schema";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const MANAGE_ROLES = new Set(["owner", "admin"]);
const ASSIGNABLE_ROLES = new Set(["admin", "manager", "agent", "member"]);
const ASSIGNABLE_STATUSES = new Set(["active", "inactive", "pending"]);

async function actorMembership(organizationId: string, userId: string) {
  const { db, end } = getDb();
  try {
    const [row] = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, userId),
          eq(organizationMembers.status, "active"),
        ),
      )
      .limit(1);
    return row ?? null;
  } finally {
    await end();
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  await ensurePgIdentitySchema();

  const { db, end } = getDb();
  try {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
    if (!org || org.status === "deleted") {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const session = await getSession(request.headers.get("cookie") ?? undefined);
    const platformAdmin = Boolean(session && (session.role === "super_admin" || session.permissions.includes("*")));

    let internal = platformAdmin;
    if (session?.userId && !internal) {
      const [membership] = await db
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
      internal = Boolean(membership);
    }

    if (!internal) {
      if (org.status !== "active") return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      const activeRows = await db
        .select({ id: organizationMembers.id })
        .from(organizationMembers)
        .where(and(eq(organizationMembers.organizationId, id), eq(organizationMembers.status, "active")));
      return NextResponse.json(
        { organization: org, memberCount: activeRows.length, members: [] },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const rows = await db
      .select({
        id: organizationMembers.id,
        userId: organizationMembers.userId,
        role: organizationMembers.role,
        status: organizationMembers.status,
        joinedAt: organizationMembers.joinedAt,
        invitedBy: organizationMembers.invitedBy,
        name: users.name,
        email: users.email,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(users.id, organizationMembers.userId))
      .where(eq(organizationMembers.organizationId, id));

    return NextResponse.json(
      { organization: org, memberCount: rows.filter((row) => row.status === "active").length, members: rows },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } finally {
    await end();
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  await ensurePgIdentitySchema();

  const session = await getSession(request.headers.get("cookie") ?? undefined);
  if (!session?.userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const userId = typeof body?.userId === "string" ? body.userId : "";
  const role = typeof body?.role === "string" ? body.role : "";

  if (!userId || !ASSIGNABLE_ROLES.has(role)) {
    return NextResponse.json({ error: "INVALID_MEMBER_INPUT" }, { status: 400 });
  }

  const actor = await actorMembership(id, session.userId);
  if (!actor || !MANAGE_ROLES.has(actor.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  if (role === "admin" && actor.role !== "owner") {
    return NextResponse.json({ error: "OWNER_REQUIRED_FOR_ADMIN_ROLE" }, { status: 403 });
  }

  const { db, end } = getDb();
  try {
    const [org] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, id)).limit(1);
    if (!org) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    const [targetUser] = await db
      .select({ id: users.id, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!targetUser || !targetUser.isActive) {
      return NextResponse.json({ error: "USER_NOT_AVAILABLE" }, { status: 404 });
    }

    const [existing] = await db
      .select()
      .from(organizationMembers)
      .where(and(eq(organizationMembers.organizationId, id), eq(organizationMembers.userId, userId)))
      .limit(1);

    if (existing?.status === "active") {
      return NextResponse.json({ error: "ALREADY_MEMBER" }, { status: 409 });
    }

    if (existing) {
      const [membership] = await db
        .update(organizationMembers)
        .set({ role, status: "active", invitedBy: session.userId, joinedAt: new Date() })
        .where(eq(organizationMembers.id, existing.id))
        .returning();
      return NextResponse.json({ ok: true, membership, reactivated: true }, { status: 200 });
    }

    const [membership] = await db
      .insert(organizationMembers)
      .values({
        organizationId: id,
        userId,
        role,
        status: "active",
        invitedBy: session.userId,
      })
      .returning();

    return NextResponse.json({ ok: true, membership }, { status: 201 });
  } finally {
    await end();
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const session = await getSession(request.headers.get("cookie") ?? undefined);
  if (!session?.userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const memberId = typeof body?.memberId === "string" ? body.memberId : "";
  const nextRole = typeof body?.role === "string" ? body.role : undefined;
  const nextStatus = typeof body?.status === "string" ? body.status : undefined;

  if (!memberId || (nextRole === undefined && nextStatus === undefined)) {
    return NextResponse.json({ error: "INVALID_MEMBER_UPDATE" }, { status: 400 });
  }
  if (nextRole !== undefined && !ASSIGNABLE_ROLES.has(nextRole)) {
    return NextResponse.json({ error: "INVALID_ROLE" }, { status: 400 });
  }
  if (nextStatus !== undefined && !ASSIGNABLE_STATUSES.has(nextStatus)) {
    return NextResponse.json({ error: "INVALID_STATUS" }, { status: 400 });
  }

  const actor = await actorMembership(id, session.userId);
  if (!actor || !MANAGE_ROLES.has(actor.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { db, end } = getDb();
  try {
    const [target] = await db
      .select()
      .from(organizationMembers)
      .where(and(eq(organizationMembers.id, memberId), eq(organizationMembers.organizationId, id)))
      .limit(1);
    if (!target) return NextResponse.json({ error: "MEMBER_NOT_FOUND" }, { status: 404 });

    if (target.role === "owner") {
      return NextResponse.json({ error: "OWNER_MEMBERSHIP_PROTECTED" }, { status: 409 });
    }
    if ((target.role === "admin" || nextRole === "admin") && actor.role !== "owner") {
      return NextResponse.json({ error: "OWNER_REQUIRED_FOR_ADMIN_ROLE" }, { status: 403 });
    }
    if (target.userId === session.userId && nextStatus && nextStatus !== "active") {
      return NextResponse.json({ error: "CANNOT_DISABLE_SELF" }, { status: 409 });
    }

    const [updated] = await db
      .update(organizationMembers)
      .set({
        ...(nextRole !== undefined ? { role: nextRole } : {}),
        ...(nextStatus !== undefined ? { status: nextStatus } : {}),
      })
      .where(eq(organizationMembers.id, target.id))
      .returning();

    return NextResponse.json({ ok: true, membership: updated });
  } finally {
    await end();
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const session = await getSession(request.headers.get("cookie") ?? undefined);
  if (!session?.userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const memberId = request.nextUrl.searchParams.get("memberId");
  if (!memberId) return NextResponse.json({ error: "MEMBER_ID_REQUIRED" }, { status: 400 });

  const actor = await actorMembership(id, session.userId);
  if (!actor || !MANAGE_ROLES.has(actor.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { db, end } = getDb();
  try {
    const [target] = await db
      .select()
      .from(organizationMembers)
      .where(and(eq(organizationMembers.id, memberId), eq(organizationMembers.organizationId, id)))
      .limit(1);
    if (!target) return NextResponse.json({ error: "MEMBER_NOT_FOUND" }, { status: 404 });

    if (target.role === "owner") {
      return NextResponse.json({ error: "OWNER_MEMBERSHIP_PROTECTED" }, { status: 409 });
    }
    if (target.role === "admin" && actor.role !== "owner") {
      return NextResponse.json({ error: "OWNER_REQUIRED_FOR_ADMIN_ROLE" }, { status: 403 });
    }

    const [updated] = await db
      .update(organizationMembers)
      .set({ status: "inactive" })
      .where(eq(organizationMembers.id, target.id))
      .returning();

    return NextResponse.json({ ok: true, membership: updated });
  } finally {
    await end();
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "GET, POST, PATCH, DELETE, OPTIONS" } });
}
