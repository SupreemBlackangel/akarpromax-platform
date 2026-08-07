import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { changePassword as doChangePassword } from "@/lib/auth/verification-actions";
import { getSession } from "@/lib/auth/session";
import { getRuntimeEnv } from "@/lib/config/runtime-env";
import { createRequestId, recordAuditEvent } from "@/lib/security/audit";
import { applySecurityHeaders } from "@/lib/security/headers";
import { assertSafeOrigin } from "@/lib/security/origin";
import { clientIp, enforceRateLimit } from "@/lib/security/rate-limit";
import type { Locale } from "@/lib/email/templates";

export const dynamic = "force-dynamic";

getRuntimeEnv();

const bodySchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "password must be at least 8 characters"),
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

  const ip = clientIp(request);
  const result = await doChangePassword(session.userId, parsed.data.currentPassword, parsed.data.newPassword, parsed.data.locale);
  void recordAuditEvent({
    eventType: result.ok ? "AUTH_CHANGE_PASSWORD" : "AUTH_CHANGE_PASSWORD",
    userId: session.userId,
    ipAddress: ip,
    userAgent: request.headers.get("user-agent"),
    detail: { result: result.ok ? "success" : "failed", reason: result.reason },
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.reason, requestId },
      applySecurityHeaders({ status: result.reason === "wrong_password" ? 403 : 400, headers: { "Cache-Control": "private, no-store" } }),
    );
  }

  return NextResponse.json(
    { changed: true, requestId },
    applySecurityHeaders({ status: 200, headers: { "Cache-Control": "private, no-store" } }),
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: { Allow: "POST, OPTIONS", ...applySecurityHeaders().headers },
  });
}
