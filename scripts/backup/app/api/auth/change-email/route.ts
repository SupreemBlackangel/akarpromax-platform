import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { issueEmailChange } from "@/lib/auth/verification-actions";
import { getSession } from "@/lib/auth/session";
import { getRuntimeEnv } from "@/lib/config/runtime-env";
import { createRequestId, recordAuditEvent } from "@/lib/security/audit";
import { applySecurityHeaders } from "@/lib/security/headers";
import { assertSafeOrigin } from "@/lib/security/origin";
import { clientIp, enforceRateLimit, normalizeEmail } from "@/lib/security/rate-limit";
import type { Locale } from "@/lib/email/templates";

export const dynamic = "force-dynamic";

getRuntimeEnv();

const bodySchema = z.object({
  newEmail: z.string().email(),
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

  const newEmail = parsed.data.newEmail.toLowerCase();
  const ip = clientIp(request);
  const limited = await enforceRateLimit("change_email", ip, normalizeEmail(newEmail));
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "rate_limited", requestId, retryAfterSeconds: limited.retryAfterSeconds },
      applySecurityHeaders({
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSeconds), "Cache-Control": "no-store" },
      }),
    );
  }

  const result = await issueEmailChange(session.userId, newEmail, parsed.data.locale);
  void recordAuditEvent({
    eventType: "AUTH_CHANGE_EMAIL_REQUEST",
    userId: session.userId,
    ipAddress: ip,
    userAgent: request.headers.get("user-agent"),
    detail: { newEmail, ok: result.ok, reason: result.reason },
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.reason, requestId },
      applySecurityHeaders({ status: 409, headers: { "Cache-Control": "private, no-store" } }),
    );
  }

  return NextResponse.json(
    { otpSent: true, requestId, message: "check_new_email" },
    applySecurityHeaders({ status: 200, headers: { "Cache-Control": "private, no-store" } }),
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: { Allow: "POST, OPTIONS", ...applySecurityHeaders().headers },
  });
}
