import { NextRequest, NextResponse } from "next/server";
import { eq, or } from "drizzle-orm";
import { z } from "zod";
import type { SQL } from "drizzle-orm";

import { users, verificationChallenges } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import {
  buildVerificationEmailUrl,
  buildVerificationRecord,
  generateVerificationTokenValue,
  tokenExpiryMinutes,
} from "@/lib/auth/verification";
import { mapSessionRole } from "@/lib/auth/identity-map";
import { sanitizeRegistrationRole } from "@/lib/auth/access-control";
import { getRuntimeEnv } from "@/lib/config/runtime-env";
import { createRequestId, logSecurityEvent, recordAuditEvent } from "@/lib/security/audit";
import { applySecurityHeaders } from "@/lib/security/headers";
import { assertSafeOrigin } from "@/lib/security/origin";
import { clientIp, enforceRateLimit, normalizeEmail } from "@/lib/security/rate-limit";
import { emailService } from "@/lib/email";
import type { Locale } from "@/lib/email/templates";

export const dynamic = "force-dynamic";

// Validate the production environment at worker boot, before any request.
getRuntimeEnv();

const registerSchema = z
  .object({
    email: z.string().email().optional(),
    phone: z.string().regex(/^\+?\d{7,15}$/, "invalid phone").optional(),
    password: z.string().min(8, "password must be at least 8 characters"),
    name: z.string().optional(),
    fullName: z.string().optional(),
    preferredLanguage: z.enum(["ar", "en", "tr"]).optional(),
  })
  .refine((data) => data.email || data.phone, {
    message: "email or phone is required",
  });

type RegisterBody = z.infer<typeof registerSchema> & { fullName?: string };

function clean(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  assertSafeOrigin(request);

  let body: RegisterBody;
  try {
    body = (await request.json()) as RegisterBody;
  } catch {
    return NextResponse.json(
      { error: "invalid_body", requestId },
      applySecurityHeaders({ status: 400 }),
    );
  }

  const email = clean(body.email, 255).toLowerCase();
  const phone = clean(body.phone, 20);
  const password = typeof body.password === "string" ? body.password : "";
  const name = clean(body.name ?? body.fullName, 190);
  const preferredLanguage: Locale = body.preferredLanguage ?? (email ? "ar" : "ar");

  const parsed = registerSchema.safeParse({
    email: email || undefined,
    phone: phone || undefined,
    password,
    name: name || undefined,
    preferredLanguage: body.preferredLanguage,
  });
  if (!parsed.success) {
    logSecurityEvent("AUTH_REGISTER_FAILED", { requestId, reason: "validation_failed" });
    return NextResponse.json(
      { error: "validation_failed", issues: parsed.error.flatten(), requestId },
      applySecurityHeaders({ status: 400 }),
    );
  }

  const ip = clientIp(request);
  const limited = await enforceRateLimit(
    "register",
    ip,
    email ? normalizeEmail(email) : phone,
  );
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "rate_limited", requestId, retryAfterSeconds: limited.retryAfterSeconds },
      applySecurityHeaders({
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSeconds), "Cache-Control": "no-store" },
      }),
    );
  }

  logSecurityEvent("AUTH_REGISTER_ATTEMPT", { requestId, email: email || undefined, phone: phone || undefined });

  const conditions: SQL[] = [];
  if (email) conditions.push(eq(users.email, email));
  if (phone) conditions.push(eq(users.phone, phone));

  type CreatedUser = {
    id: string;
    email: string | null;
    phone: string | null;
    name: string | null;
    role: string;
    isActive: boolean;
    createdAt: Date;
  };

  // NOTE: role is NEVER taken from the client. Registration is always a base
  // "user" (→ viewer); privileged roles are assigned only by an admin.
  const role = sanitizeRegistrationRole();

  const { db, end } = getDb();
  let existing: { id: string }[] = [];
  let created: CreatedUser | undefined;
  try {
    if (conditions.length) {
      existing = await db
        .select({ id: users.id })
        .from(users)
        .where(or(...conditions))
        .limit(1);
    }

    if (existing[0]) {
      logSecurityEvent("AUTH_REGISTER_FAILED", { requestId, reason: "already_registered" });
      return NextResponse.json(
        { error: "already_registered", requestId },
        applySecurityHeaders({ status: 409, headers: { "Cache-Control": "no-store" } }),
      );
    }

    const passwordHash = await hashPassword(password);

    const [inserted] = await db
      .insert(users)
      .values({
        email: email || null,
        phone: phone || null,
        name: name || null,
        passwordHash,
        role,
        isActive: true,
        status: "pending_verification",
        preferredLanguage,
        emailVerifiedAt: email ? null : null,
      })
      .returning({
        id: users.id,
        email: users.email,
        phone: users.phone,
        name: users.name,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      });

    created = inserted;
  } finally {
    await end();
  }

  if (!created) {
    return NextResponse.json(
      { error: "registration_failed", requestId },
      applySecurityHeaders({ status: 500 }),
    );
  }

  const appOrigin = getRuntimeEnv().appOrigin;
  const requiresVerification = Boolean(email);

  if (email) {
    const rawToken = await generateVerificationTokenValue();
    const challenge = await buildVerificationRecord({
      userId: created.id,
      purpose: "email_verification",
      destination: email,
      tokenValue: rawToken,
    });
    const vcExpiresAt = challenge.expiresAt;
    const { db: db2, end: end2 } = getDb();
    try {
      await db2.insert(verificationChallenges).values({
        userId: challenge.userId,
        purpose: challenge.purpose,
        channel: challenge.channel,
        destination: challenge.destination,
        tokenHash: challenge.tokenHash,
        codeHash: challenge.codeHash,
        attempts: challenge.attempts,
        expiresAt: vcExpiresAt,
      });
    } finally {
      await end2();
    }

    const verificationUrl = buildVerificationEmailUrl(appOrigin, rawToken);
    try {
      await emailService.send("verification", {
        to: email,
        locale: preferredLanguage,
        variables: { recipientName: name ?? undefined },
        urls: { verificationUrl, tokenExpiryMinutes: tokenExpiryMinutes() },
      });
    } catch {
      logSecurityEvent("AUTH_REGISTER_SUCCESS", { requestId, userId: created.id, emailDelivery: "failed" });
    }
  }

  logSecurityEvent("AUTH_REGISTER_SUCCESS", { requestId, userId: created.id, emailDelivery: requiresVerification ? "sent" : "skipped" });
  void recordAuditEvent({
    eventType: "AUTH_REGISTER_SUCCESS",
    userId: created.id,
    ipAddress: ip,
    userAgent: request.headers.get("user-agent"),
    detail: { email: email || null, phone: phone || null, requiresVerification },
  });

  return NextResponse.json(
    {
      requestId,
      requiresVerification,
      user: {
        id: created.id,
        email: created.email,
        phone: created.phone,
        name: created.name,
        role: mapSessionRole(role),
        status: "pending_verification" as const,
        emailVerified: created.email !== null ? false : null,
        isActive: created.isActive,
        preferredLanguage,
        createdAt: created.createdAt,
      },
    },
    applySecurityHeaders({ status: 201, headers: { "Cache-Control": "no-store" } }),
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: { Allow: "POST, OPTIONS", ...applySecurityHeaders().headers },
  });
}
