import { NextRequest, NextResponse } from "next/server";
import { eq, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import { ApiError } from "@/lib/errors/api-error";

import { users } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { mapSessionRole, permissionsForSessionRole } from "@/lib/auth/identity-map";
import { accountBlockReason, isAccountUsable } from "@/lib/auth/access-control";
import { getRuntimeEnv } from "@/lib/config/runtime-env";
import { augmentPermissionsForServiceProviderCapability } from "@/lib/services/identity";
import { createRequestId, logSecurityEvent, recordAuditEvent } from "@/lib/security/audit";
import { applySecurityHeaders } from "@/lib/security/headers";
import { assertSafeOrigin } from "@/lib/security/origin";
import { clientIp, enforceRateLimit, normalizeEmail } from "@/lib/security/rate-limit";
import { normalizeEmailIdentity } from "@/lib/auth/email-identity";

export const dynamic = "force-dynamic";

// Validate the production environment at worker boot, before any request.
getRuntimeEnv();

type LoginBody = {
  email?: string;
  phone?: string;
  identifier?: string;
  password?: string;
};

function clean(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  try {
    assertSafeOrigin(request);
  } catch (error) {
    // A rejected Origin is a deliberate 403 policy decision, not a server
    // crash: surface it as structured JSON instead of an opaque HTTP 500 so
    // clients (and operators) can tell CSRF/origin misconfiguration apart
    // from real backend failures. The security event is already logged by
    // assertSafeOrigin.
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message, requestId },
        applySecurityHeaders({ status: error.status, headers: { "Cache-Control": "no-store" } }),
      );
    }
    throw error;
  }

  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json(
      { error: "invalid_body", requestId },
      applySecurityHeaders({ status: 400 }),
    );
  }

  const rawIdentifier = typeof body.identifier === "string" ? body.identifier.trim() : "";
  const looksLikeEmail = rawIdentifier.includes("@");
  const email = normalizeEmailIdentity(body.email ?? (rawIdentifier && looksLikeEmail ? rawIdentifier : ""));
  const phone = clean(body.phone ?? (rawIdentifier && !looksLikeEmail ? rawIdentifier : ""), 20);
  const password = typeof body.password === "string" ? body.password : "";

  const identifier = email || phone;
  if (!identifier || !password) {
    return NextResponse.json(
      { error: "missing_credentials", requestId },
      applySecurityHeaders({ status: 400 }),
    );
  }

  const ip = clientIp(request);
  const limited = await enforceRateLimit("login", ip, identifier ? normalizeEmail(identifier) : undefined);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "rate_limited", requestId, retryAfterSeconds: limited.retryAfterSeconds },
      applySecurityHeaders({
        status: 429,
        headers: {
          "Retry-After": String(limited.retryAfterSeconds),
          "Cache-Control": "no-store",
        },
      }),
    );
  }

  const conditions: SQL[] = [];
  if (email) conditions.push(eq(users.email, email));
  if (phone) conditions.push(eq(users.phone, phone));

  const { db, end } = getDb();
  let user: (typeof users.$inferSelect) | undefined;
  try {
    const rows = conditions.length
      ? await db.select().from(users).where(or(...conditions)).limit(1)
      : [];
    user = rows[0];
  } finally {
    await end();
  }

  if (!user) {
    logSecurityEvent("AUTH_LOGIN_FAILED", { requestId });
    void recordAuditEvent({
      eventType: "AUTH_LOGIN_FAILED",
      ipAddress: ip,
      userAgent: request.headers.get("user-agent"),
      detail: { reason: "unknown_identifier" },
    });
    return NextResponse.json(
      { error: "invalid_credentials", requestId },
      applySecurityHeaders({ status: 401, headers: { "Cache-Control": "no-store" } }),
    );
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    logSecurityEvent("AUTH_LOGIN_FAILED", { requestId });
    void recordAuditEvent({
      eventType: "AUTH_LOGIN_FAILED",
      userId: user.id,
      ipAddress: ip,
      userAgent: request.headers.get("user-agent"),
      detail: { reason: "bad_password" },
    });
    return NextResponse.json(
      { error: "invalid_credentials", requestId },
      applySecurityHeaders({ status: 401, headers: { "Cache-Control": "no-store" } }),
    );
  }

  if (!isAccountUsable(user.status, user.isActive)) {
    const reason = accountBlockReason(user.status, user.isActive) ?? "account_blocked";
    logSecurityEvent("AUTH_ACCOUNT_BLOCKED", { requestId, userId: user.id, reason });
    void recordAuditEvent({
      eventType: "AUTH_ACCOUNT_BLOCKED",
      userId: user.id,
      ipAddress: ip,
      userAgent: request.headers.get("user-agent"),
      detail: { reason },
    });
    return NextResponse.json(
      { error: "account_blocked", reason, requestId },
      applySecurityHeaders({ status: 403, headers: { "Cache-Control": "no-store" } }),
    );
  }

  await createSession({ userId: user.id, role: user.role, permissions: [] });

  const { db: db2, end: end2 } = getDb();
  try {
    await db2.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  } catch {
    // lastLoginAt is best-effort; do not fail the login.
  } finally {
    await end2();
  }

  logSecurityEvent("AUTH_LOGIN_SUCCESS", { requestId, userId: user.id });
  const permissions = await augmentPermissionsForServiceProviderCapability(
    user.email?.trim().toLowerCase() ?? null,
    permissionsForSessionRole(user.role),
  );
  void recordAuditEvent({
    eventType: "AUTH_LOGIN_SUCCESS",
    userId: user.id,
    ipAddress: ip,
    userAgent: request.headers.get("user-agent"),
    detail: {},
  });

  return NextResponse.json(
    {
      requestId,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        role: mapSessionRole(user.role),
        status: user.status,
        emailVerified: user.emailVerifiedAt !== null ? true : user.email !== null ? false : null,
        isActive: user.isActive,
        onboardingCompleted: user.onboardingCompletedAt !== null,
        createdAt: user.createdAt,
        permissions,
      },
    },
    applySecurityHeaders({ headers: { "Cache-Control": "no-store" } }),
  );
}

// Kept for compatibility with the deprecated 2FA-style endpoint; routes callers
// that supplied { challengeId, code } to the dedicated /otp/verify handler.
export async function PUT(request: NextRequest) {
  return NextResponse.json(
    { error: "method_not_supported", message: "Use POST /api/auth/login or POST /api/auth/otp/verify", requestId: createRequestId() },
    applySecurityHeaders({ status: 405, headers: { Allow: "POST, OPTIONS", "Cache-Control": "no-store" } }),
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: { Allow: "POST, OPTIONS", ...applySecurityHeaders().headers },
  });
}
