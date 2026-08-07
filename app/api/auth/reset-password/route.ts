import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { applyPasswordReset } from "@/lib/auth/verification-actions";
import { getRuntimeEnv } from "@/lib/config/runtime-env";
import { createRequestId, recordAuditEvent } from "@/lib/security/audit";
import { applySecurityHeaders } from "@/lib/security/headers";
import { assertSafeOrigin } from "@/lib/security/origin";
import { clientIp, enforceRateLimit } from "@/lib/security/rate-limit";
import type { Locale } from "@/lib/email/templates";

export const dynamic = "force-dynamic";

getRuntimeEnv();

const bodySchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "password must be at least 8 characters"),
  locale: z.enum(["ar", "en", "tr"]).optional().default("ar"),
});

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  assertSafeOrigin(request);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "invalid_body", requestId },
      applySecurityHeaders({ status: 400 }),
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", issues: parsed.error.flatten(), requestId },
      applySecurityHeaders({ status: 400 }),
    );
  }

  const ip = clientIp(request);
  const limited = await enforceRateLimit("password_reset_confirm", ip);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "rate_limited", requestId, retryAfterSeconds: limited.retryAfterSeconds },
      applySecurityHeaders({
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSeconds), "Cache-Control": "no-store" },
      }),
    );
  }

  const result = await applyPasswordReset(parsed.data.token, parsed.data.password, parsed.data.locale);
  void recordAuditEvent({
    eventType: result.ok ? "AUTH_PASSWORD_RESET_SUCCESS" : "AUTH_PASSWORD_RESET_FAILED",
    ipAddress: ip,
    userAgent: request.headers.get("user-agent"),
    detail: { reason: result.reason },
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.reason, requestId },
      applySecurityHeaders({ status: 400, headers: { "Cache-Control": "no-store" } }),
    );
  }

  return NextResponse.json(
    { reset: true, requestId },
    applySecurityHeaders({ status: 200, headers: { "Cache-Control": "no-store" } }),
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: { Allow: "POST, OPTIONS", ...applySecurityHeaders().headers },
  });
}
