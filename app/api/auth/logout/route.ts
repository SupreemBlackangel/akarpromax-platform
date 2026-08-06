import { NextRequest, NextResponse } from "next/server";

import { destroySession } from "@/lib/auth/session";
import { getRuntimeEnv } from "@/lib/config/runtime-env";
import { createRequestId } from "@/lib/security/audit";
import { applySecurityHeaders } from "@/lib/security/headers";
import { assertSafeOrigin } from "@/lib/security/origin";

export const dynamic = "force-dynamic";

// Validate the production environment at worker boot, before any request.
getRuntimeEnv();

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  assertSafeOrigin(request);
  await destroySession();
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
