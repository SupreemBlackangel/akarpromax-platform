import { NextRequest, NextResponse } from "next/server";
import { getSessionIdentity } from "@/lib/sponsor-auth";
import {
  listPendingVerifications,
  approveVerificationWithEvent,
  rejectVerificationWithEvent,
  getTrustPanel,
} from "@/lib/amrs/verification";
import { VERIFICATION_EXPIRY_DEFAULTS } from "@/lib/amrs/contracts/common";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
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
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
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

  if (!action || !recordId) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  if (action === "approve") {
    const expiresInDays = VERIFICATION_EXPIRY_DEFAULTS[verificationType as keyof typeof VERIFICATION_EXPIRY_DEFAULTS];
    try {
      await approveVerificationWithEvent(
        recordId,
        identity.email,
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

  if (action === "reject") {
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
