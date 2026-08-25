import { NextRequest, NextResponse } from "next/server";
import { canAccessAmrsAdmin } from "@/lib/amrs/access";
import { ensurePgIdentitySchema } from "@/lib/db/pg-identity-schema";
import { getSession } from "@/lib/auth/session";
import { getSessionIdentity } from "@/lib/sponsor-auth";
import {
  listPendingVerifications,
  approveVerificationWithEvent,
  expireVerifications,
  renewVerification,
  rejectVerificationWithEvent,
  revokeVerificationWithEvent,
  getTrustPanel,
} from "@/lib/amrs/verification";
import { VERIFICATION_EXPIRY_DEFAULTS } from "@/lib/amrs/contracts/common";

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
  const action = q.get("action") ?? "pending";

  if (action === "pending") {
    const records = await listPendingVerifications();
    return NextResponse.json({ records }, { headers: { "Cache-Control": "no-store" } });
  }

  if (action === "trust-panel") {
    const entityType = (q.get("entityType") ?? "user") as "user" | "professional" | "organization";
    const entityId = q.get("entityId");
    if (!entityId) {
      return NextResponse.json({ error: "MISSING_ENTITY_ID" }, { status: 400 });
    }
    const panel = await getTrustPanel(entityType, entityId);
    return NextResponse.json(panel, { headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json({ error: "INVALID_ACTION" }, { status: 400 });
}

export async function POST(request: NextRequest) {
  await ensurePgIdentitySchema();
  const identity = await getSessionIdentity();
  const session = await getSession(request.headers.get("cookie") ?? undefined);
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
  const recordId = body.recordId as string;
  const entityType = body.entityType as string;
  const entityId = body.entityId as string;
  const verificationType = body.verificationType as string;

  if (!action) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  if (action === "approve") {
    if (!recordId || !entityType || !entityId || !verificationType) {
      return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
    }
    const overrideExpires = typeof body.expiresInDays === "number" ? body.expiresInDays : undefined;
    const expiresInDays = overrideExpires ?? VERIFICATION_EXPIRY_DEFAULTS[verificationType as keyof typeof VERIFICATION_EXPIRY_DEFAULTS];
    if (!session?.userId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    try {
      await approveVerificationWithEvent(
        recordId,
        session.userId,
        entityType as "user" | "professional" | "organization",
        entityId,
        verificationType as "email" | "phone" | "identity" | "professional" | "organization" | "license" | "address",
        expiresInDays ?? undefined,
      );
      return NextResponse.json({ ok: true, status: "verified" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "UNKNOWN";
      if (message === "CANNOT_APPROVE_OWN") {
        return NextResponse.json({ error: "CANNOT_APPROVE_OWN" }, { status: 403 });
      }
      if (message === "RECORD_NOT_FOUND") {
        return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      }
      return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
    }
  }

  if (action === "revoke") {
    if (!recordId || !entityType || !entityId || !verificationType) {
      return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
    }
    try {
      await revokeVerificationWithEvent(
        recordId,
        entityType as "user" | "professional" | "organization",
        entityId,
        verificationType as "email" | "phone" | "identity" | "professional" | "organization" | "license" | "address",
      );
      return NextResponse.json({ ok: true, status: "revoked" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "UNKNOWN";
      if (message === "RECORD_NOT_FOUND") {
        return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      }
      return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
    }
  }

  if (action === "renew") {
    if (!entityType || !entityId || !verificationType) {
      return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
    }
    try {
      const record = await renewVerification(
        entityType as "user" | "professional" | "organization",
        entityId,
        verificationType as "email" | "phone" | "identity" | "professional" | "organization" | "license" | "address",
        "manual",
        typeof body.countryCode === "string" ? body.countryCode : undefined,
      );
      return NextResponse.json({ ok: true, record }, { status: 201 });
    } catch (err) {
      const message = err instanceof Error ? err.message : "UNKNOWN";
      if (message === "ACTIVE_VERIFICATION_EXISTS") {
        return NextResponse.json({ error: "ACTIVE_VERIFICATION_EXISTS" }, { status: 409 });
      }
      return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
    }
  }

  if (action === "expire_due") {
    const changed = await expireVerifications();
    return NextResponse.json({ ok: true, expired: changed }, { status: 200 });
  }

  if (action === "reject") {
    if (!recordId || !entityType || !entityId || !verificationType) {
      return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
    }
    try {
      await rejectVerificationWithEvent(
        recordId,
        entityType as "user" | "professional" | "organization",
        entityId,
        verificationType as "email" | "phone" | "identity" | "professional" | "organization" | "license" | "address",
      );
      return NextResponse.json({ ok: true, status: "failed" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "UNKNOWN";
      if (message === "RECORD_NOT_FOUND") {
        return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      }
      return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "INVALID_ACTION" }, { status: 400 });
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "GET, POST, OPTIONS" } });
}
