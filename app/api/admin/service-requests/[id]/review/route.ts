import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { reviewRequest } from "@services/marketplace";
import { isRequestReviewAction, SERVICE_ERROR_CODES } from "@services/constants";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * The platform's decision on a customer's service request.
 *
 * One route rather than five (`/accept`, `/reject`, `/request-info`, `/assign`,
 * `/close`): the guard, the identity and the error mapping are identical for
 * all of them, and five files holding four identical halves is four more places
 * for the permission check to drift. The action is in the body and validated
 * against one vocabulary.
 *
 * SERVICE_REQUESTS_MANAGE_ALL is the whole gate. It is the permission the
 * services supervisor and platform admin roles carry and a customer never does,
 * and it is checked here on the server — the admin screens can only offer these
 * actions, never grant them.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  if (!hasSponsorPermission(identity, PERMISSIONS.SERVICE_REQUESTS_MANAGE_ALL)) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  const action = body.action;
  if (!isRequestReviewAction(action)) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }

  const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

  try {
    const result = await reviewRequest(
      id,
      action,
      { reason: text(body.reason, 1000) || null, assignee: text(body.assignee, 200) || null },
      { userId: identity.email, ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null },
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "REQUEST_NOT_FOUND") {
      return NextResponse.json({ error: SERVICE_ERROR_CODES.REQUEST_NOT_FOUND }, { status: 404 });
    }
    if (code === "REQUEST_REVIEW_REASON_REQUIRED") {
      return NextResponse.json({ error: SERVICE_ERROR_CODES.REQUEST_REVIEW_REASON_REQUIRED }, { status: 400 });
    }
    if (code === "REQUEST_ASSIGNEE_REQUIRED") {
      return NextResponse.json({ error: SERVICE_ERROR_CODES.REQUEST_ASSIGNEE_REQUIRED }, { status: 400 });
    }
    throw error;
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "POST, OPTIONS" } });
}
