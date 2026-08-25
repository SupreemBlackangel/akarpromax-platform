import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { organizationMembers, organizations, verificationRecords, auditEvents } from "@/lib/db/schema";
import { listVerifications, submitVerification, getVerificationSummary } from "@/lib/amrs/verification";
import { ensurePgIdentitySchema } from "@/lib/db/pg-identity-schema";

export const dynamic = "force-dynamic";

const ENTITY_TYPES = new Set(["user", "organization"]);
const VERIFICATION_TYPES = new Set(["email", "phone", "identity", "organization", "license", "address"]);

async function canManageSubject(userId: string, entityType: string, entityId: string): Promise<boolean> {
  if (entityType === "user") return userId === entityId;
  if (entityType !== "organization") return false;

  const { db, end } = getDb();
  try {
    const [membership] = await db
      .select({ role: organizationMembers.role })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, entityId),
          eq(organizationMembers.userId, userId),
          eq(organizationMembers.status, "active"),
        ),
      )
      .limit(1);
    return Boolean(membership && ["owner", "admin"].includes(membership.role));
  } finally {
    await end();
  }
}

export async function GET(request: NextRequest) {
  await ensurePgIdentitySchema();

  const session = await getSession(request.headers.get("cookie") ?? undefined);
  if (!session?.userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const q = request.nextUrl.searchParams;
  const entityType = q.get("entityType") ?? "user";
  const entityId = q.get("entityId") ?? session.userId;

  if (!ENTITY_TYPES.has(entityType)) {
    return NextResponse.json({ error: "INVALID_ENTITY_TYPE" }, { status: 400 });
  }
  if (!(await canManageSubject(session.userId, entityType, entityId))) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const records = await listVerifications(entityType as "user" | "organization", entityId);
  const summary = getVerificationSummary(records);
  return NextResponse.json({ records, summary }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: NextRequest) {
  await ensurePgIdentitySchema();

  const session = await getSession(request.headers.get("cookie") ?? undefined);
  if (!session?.userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });

  const entityType = typeof body.entityType === "string" ? body.entityType : "";
  const entityId = typeof body.entityId === "string" ? body.entityId : "";
  const type = typeof body.type === "string" ? body.type : "";

  if (!ENTITY_TYPES.has(entityType)) {
    return NextResponse.json({ error: "INVALID_ENTITY_TYPE" }, { status: 400 });
  }
  if (!entityId || !VERIFICATION_TYPES.has(type)) {
    return NextResponse.json({ error: "INVALID_VERIFICATION_INPUT" }, { status: 400 });
  }
  if (entityType === "organization" && !["organization", "license", "address"].includes(type)) {
    return NextResponse.json({ error: "INVALID_ORGANIZATION_VERIFICATION_TYPE" }, { status: 400 });
  }
  if (!(await canManageSubject(session.userId, entityType, entityId))) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  if (entityType === "organization") {
    const { db, end } = getDb();
    try {
      const [org] = await db
        .select({ status: organizations.status })
        .from(organizations)
        .where(eq(organizations.id, entityId))
        .limit(1);
      if (!org) return NextResponse.json({ error: "ORGANIZATION_NOT_FOUND" }, { status: 404 });
      if (org.status !== "active") {
        return NextResponse.json({ error: "ORGANIZATION_NOT_ACTIVE" }, { status: 409 });
      }
    } finally {
      await end();
    }
  }

  const { db, end } = getDb();
  try {
    const [pending] = await db
      .select({ id: verificationRecords.id })
      .from(verificationRecords)
      .where(
        and(
          eq(verificationRecords.entityType, entityType),
          eq(verificationRecords.entityId, entityId),
          eq(verificationRecords.type, type),
          eq(verificationRecords.status, "pending"),
        ),
      )
      .limit(1);
    if (pending) {
      return NextResponse.json({ error: "ACTIVE_VERIFICATION_EXISTS" }, { status: 409 });
    }
  } finally {
    await end();
  }

  try {
    const record = await submitVerification({
      entityType: entityType as "user" | "organization",
      entityId,
      type: type as "email" | "phone" | "identity" | "organization" | "license" | "address",
      source: "manual",
      countryCode: typeof body.countryCode === "string" ? body.countryCode : undefined,
    });
    const { db, end } = getDb();
    try {
      await db.insert(auditEvents).values({
        userId: session.userId,
        eventType: "VERIFICATION_SUBMITTED",
        detail: {
          recordId: record.id,
          entityType: record.entityType,
          entityId: record.entityId,
          type: record.type,
        },
      });
    } finally {
      await end();
    }
    return NextResponse.json({ ok: true, record }, { status: 201 });
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code === "23505") {
      return NextResponse.json({ error: "ACTIVE_VERIFICATION_EXISTS" }, { status: 409 });
    }
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "GET, POST, OPTIONS" } });
}
