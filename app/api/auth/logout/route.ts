import { NextRequest, NextResponse } from "next/server";

import { destroySession, getSession, getSessionUser } from "@/lib/auth/session";
import { getRuntimeEnv } from "@/lib/config/runtime-env";
import { createRequestId, logSecurityEvent, recordAuditEvent } from "@/lib/security/audit";
import { applySecurityHeaders } from "@/lib/security/headers";
import { assertSafeOrigin } from "@/lib/security/origin";
import { clientIp } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

// Validate the production environment at worker boot, before any request.
getRuntimeEnv();

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  assertSafeOrigin(request);

  const session = await getSession(request.headers.get("cookie") ?? undefined);
  const ip = clientIp(request);
  void recordAuditEvent({
    eventType: "AUTH_SESSION_INVALIDATED",
    userId: session?.userId,
    ipAddress: ip,
    userAgent: request.headers.get("user-agent"),
    detail: {},
  });

  await destroySession();
  logSecurityEvent("AUTH_SESSION_INVALIDATED", { requestId, ip });
  return NextResponse.json(
    { signedOut: true, requestId },
    applySecurityHeaders({ headers: { "Cache-Control": "no-store" } }),
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: { Allow: "POST, OPTIONS", ...applySecurityHeaders().headers },
  });
}

// Internal helper re-exported for the client side to resolve the active viewer.
export { getSessionUser };
