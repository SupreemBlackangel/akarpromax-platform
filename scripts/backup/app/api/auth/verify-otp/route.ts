import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { confirmEmailChangeOtp } from "@/lib/auth/verification-actions";
import { getSession } from "@/lib/auth/session";
import { getRuntimeEnv } from "@/lib/config/runtime-env";
import { createRequestId, logSecurityEvent, recordAuditEvent } from "@/lib/security/audit";
import { applySecurityHeaders } from "@/lib/security/headers";
import { assertSafeOrigin } from "@/lib/security/origin";
import { clientIp, enforceRateLimit } from "@/lib/security/rate-limit";
import type { Locale } from "@/lib/email/templates";

export const dynamic = "force-dynamic";

getRuntimeEnv();

const bodySchema = z.object({
  code: z.string().min(1),
  purpose: z.enum(["email_change"]).optional().default("email_change"),
  locale: z.enum(["ar", "en", "tr"]).optional().default("ar"),
});

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

  let body: { code?: string; purpose?: string };
  try {
    body = (await request.json()) as { code?: string; purpose?: string };
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
  const limited = await enforceRateLimit("verify_code", ip);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "rate_limited", requestId, retryAfterSeconds: limited.retryAfterSeconds },
      applySecurityHeaders({
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSeconds), "Cache-Control": "no-store" },
      }),
    );
  }

  const locale: Locale = parsed.data.locale ?? "ar";

  const result = await confirmEmailChangeOtp(session.userId, parsed.data.code, locale);
  void recordAuditEvent({
    eventType: result.ok ? "AUTH_OTP_VERIFY_SUCCESS" : "AUTH_OTP_VERIFY_FAILED",
    userId: session.userId,
    ipAddress: ip,
    userAgent: request.headers.get("user-agent"),
    detail: { reason: result.reason, attemptsRemaining: result.detail?.attempts },
  });

  if (!result.ok) {
    logSecurityEvent("AUTH_OTP_VERIFY_FAILED", { requestId, userId: session.userId, reason: result.reason });
    return NextResponse.json(
      { error: result.reason, requestId },
      applySecurityHeaders({ status: result.reason === "too_many_attempts" ? 429 : 400, headers: { "Cache-Control": "no-store" } }),
    );
  }

  return NextResponse.json(
    { verified: true, requestId },
    applySecurityHeaders({ headers: { "Cache-Control": "private, no-store" } }),
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: { Allow: "POST, OPTIONS", ...applySecurityHeaders().headers },
  });
}
