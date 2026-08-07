import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { resendEmailVerification } from "@/lib/auth/verification-actions";
import { getRuntimeEnv } from "@/lib/config/runtime-env";
import { createRequestId, recordAuditEvent } from "@/lib/security/audit";
import { applySecurityHeaders } from "@/lib/security/headers";
import { assertSafeOrigin } from "@/lib/security/origin";
import { clientIp, enforceRateLimit, normalizeEmail } from "@/lib/security/rate-limit";
import type { Locale } from "@/lib/email/templates";

export const dynamic = "force-dynamic";

getRuntimeEnv();

const bodySchema = z.object({
  email: z.string().email(),
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

  const email = parsed.data.email.toLowerCase();
  const ip = clientIp(request);
  const limited = await enforceRateLimit("email_verification_resend", ip, normalizeEmail(email));
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "rate_limited", requestId, retryAfterSeconds: limited.retryAfterSeconds },
      applySecurityHeaders({
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSeconds), "Cache-Control": "no-store" },
      }),
    );
  }

  await resendEmailVerification(email, parsed.data.locale);
  void recordAuditEvent({
    eventType: "AUTH_VERIFY_EMAIL_SUCCESS",
    ipAddress: ip,
    userAgent: request.headers.get("user-agent"),
    detail: { reason: "resent" },
  });

  return NextResponse.json(
    { sent: true, requestId },
    applySecurityHeaders({ status: 200, headers: { "Cache-Control": "no-store" } }),
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: { Allow: "POST, OPTIONS", ...applySecurityHeaders().headers },
  });
}
