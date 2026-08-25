import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { reviewVerificationRecord } from "@/lib/amrs/organization-verification";
import { ensurePgIdentitySchema } from "@/lib/db/pg-identity-schema";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };

function canReview(session: { role: string; permissions: string[] }): boolean {
  return (
    session.role === "super_admin" ||
    session.permissions.includes("*") ||
    session.permissions.includes("verification.review")
  );
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  await ensurePgIdentitySchema();

  const session = await getSession(request.headers.get("cookie") ?? undefined);
  if (!session?.userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!canReview(session)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const action = typeof body?.action === "string" ? body.action : "";
  const reason = typeof body?.reason === "string" ? body.reason : undefined;
  const expiresInDays =
    typeof body?.expiresInDays === "number" && Number.isFinite(body.expiresInDays)
      ? Math.max(1, Math.min(Math.floor(body.expiresInDays), 3650))
      : undefined;

  if (!["approve", "reject", "revoke"].includes(action)) {
    return NextResponse.json({ error: "INVALID_ACTION" }, { status: 400 });
  }

  try {
    const record = await reviewVerificationRecord({
      recordId: id,
      reviewerUserId: session.userId,
      action: action as "approve" | "reject" | "revoke",
      reason,
      expiresInDays,
    });
    return NextResponse.json({ ok: true, record });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    if (code === "REASON_REQUIRED") return NextResponse.json({ error: code }, { status: 400 });
    if (code === "RECORD_NOT_FOUND") return NextResponse.json({ error: code }, { status: 404 });
    if (code === "CANNOT_REVIEW_OWN_SUBJECT") return NextResponse.json({ error: code }, { status: 403 });
    if (code === "INVALID_VERIFICATION_TRANSITION") {
      return NextResponse.json({ error: code }, { status: 409 });
    }
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
