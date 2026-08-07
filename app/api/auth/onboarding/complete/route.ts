import { NextRequest, NextResponse } from "next/server";

import { completeOnboarding } from "@/lib/auth/verification-actions";
import { getSession } from "@/lib/auth/session";
import { getRuntimeEnv } from "@/lib/config/runtime-env";
import { createRequestId, recordAuditEvent } from "@/lib/security/audit";
import { applySecurityHeaders } from "@/lib/security/headers";
import { assertSafeOrigin } from "@/lib/security/origin";
import { clientIp } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

getRuntimeEnv();

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  assertSafeOrigin(request);

  const session = await getSession(request.headers.get("cookie") ?? undefined);
  if (!session?.userId) {
    return NextResponse.json(
      { error: "unauthenticated", requestId },
      applySecurityHeaders({ status: 401, headers: { "Cache-Control": "private, no-store" } }),
    );
  }

  const ip = clientIp(request);
  const result = await completeOnboarding(session.userId);
  void recordAuditEvent({
    eventType: "AUTH_ONBOARDING_COMPLETE",
    userId: session.userId,
    ipAddress: ip,
    userAgent: request.headers.get("user-agent"),
    detail: { ok: result.ok },
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.reason, requestId },
      applySecurityHeaders({ status: 400, headers: { "Cache-Control": "private, no-store" } }),
    );
  }

  return NextResponse.json(
    { completed: true, requestId },
    applySecurityHeaders({ status: 200, headers: { "Cache-Control": "private, no-store" } }),
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: { Allow: "POST, OPTIONS", ...applySecurityHeaders().headers },
  });
}
