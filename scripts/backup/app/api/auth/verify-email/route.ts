import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { activateAccount } from "@/lib/auth/verification-actions";
import { getRuntimeEnv } from "@/lib/config/runtime-env";
import { createRequestId, logSecurityEvent, recordAuditEvent } from "@/lib/security/audit";
import { applySecurityHeaders } from "@/lib/security/headers";
import { assertSafeOrigin } from "@/lib/security/origin";
import { clientIp, enforceRateLimit } from "@/lib/security/rate-limit";
import type { Locale } from "@/lib/email/templates";

export const dynamic = "force-dynamic";

getRuntimeEnv();

const tokenSchema = z.object({ token: z.string().min(1) });

function localeOf(request: NextRequest): Locale {
  const qp = request.nextUrl.searchParams.get("locale");
  if (qp === "ar" || qp === "en" || qp === "tr") return qp;
  return "ar";
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  assertSafeOrigin(request);

  const locale = localeOf(request);

  let body: { token?: string };
  try {
    body = (await request.json()) as { token?: string };
  } catch {
    return NextResponse.json(
      { error: "invalid_body", requestId },
      applySecurityHeaders({ status: 400 }),
    );
  }

  const parsed = tokenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_token", requestId },
      applySecurityHeaders({ status: 400 }),
    );
  }

  const ip = clientIp(request);
  const limited = await enforceRateLimit("verify_email", ip);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "rate_limited", requestId, retryAfterSeconds: limited.retryAfterSeconds },
      applySecurityHeaders({
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSeconds), "Cache-Control": "no-store" },
      }),
    );
  }

  const result = await activateAccount(parsed.data.token, locale);
  void recordAuditEvent({
    eventType: result.ok ? "AUTH_VERIFY_EMAIL_SUCCESS" : "AUTH_VERIFY_EMAIL_FAILED",
    ipAddress: ip,
    userAgent: request.headers.get("user-agent"),
    detail: { reason: result.reason, locale },
  });

  if (!result.ok) {
    logSecurityEvent("AUTH_VERIFY_EMAIL_FAILED", { requestId, reason: result.reason });
    return NextResponse.json(
      { error: result.reason, requestId },
      applySecurityHeaders({ status: 400, headers: { "Cache-Control": "no-store" } }),
    );
  }

  return NextResponse.json(
    { verified: true, requestId },
    applySecurityHeaders({ headers: { "Cache-Control": "no-store" } }),
  );
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  if (!token) {
    return NextResponse.json(
      { error: "invalid_token", requestId: createRequestId() },
      applySecurityHeaders({ status: 400 }),
    );
  }
  const locale = localeOf(request);
  const ip = clientIp(request);
  const limited = await enforceRateLimit("verify_email", ip);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "rate_limited", requestId: createRequestId(), retryAfterSeconds: limited.retryAfterSeconds },
      applySecurityHeaders({ status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } }),
    );
  }
  const result = await activateAccount(token, locale);
  void recordAuditEvent({
    eventType: result.ok ? "AUTH_VERIFY_EMAIL_SUCCESS" : "AUTH_VERIFY_EMAIL_FAILED",
    ipAddress: ip,
    userAgent: request.headers.get("user-agent"),
    detail: { reason: result.reason, via: "link", locale },
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.reason, requestId: createRequestId() },
      applySecurityHeaders({ status: 400, headers: { "Cache-Control": "no-store" } }),
    );
  }
  return NextResponse.json(
    { verified: true, requestId: createRequestId() },
    applySecurityHeaders({ headers: { "Cache-Control": "no-store" } }),
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: { Allow: "GET, POST, OPTIONS", ...applySecurityHeaders().headers },
  });
}
