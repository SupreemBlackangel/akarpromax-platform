import { eq } from "drizzle-orm";

import { users, type VerificationPurpose } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  buildVerificationEmailUrl,
  buildVerificationRecord,
  generateVerificationTokenValue,
  hashChallengeValue,
  tokenExpiryMinutes,
  verifyOtpRecord,
  verifyTokenRecord,
} from "@/lib/auth/verification";
import { rekeyServiceUserReferences } from "@/lib/services/identity";
import { consumeChallenge, createVerificationChallenge, findActiveChallengeByTokenHash, findLatestActiveOtpChallengeForUser, incrementChallengeAttempts, revokeUserChallenges } from "@/lib/db/verification";
import { recordAuditEvent, logSecurityEvent } from "@/lib/security/audit";
import { getRuntimeEnv } from "@/lib/config/runtime-env";
import { emailService } from "@/lib/email";
import type { Locale } from "@/lib/email/templates";

export type ActionResult = { ok: boolean; reason?: string; userId?: string; detail?: Record<string, unknown> };

const VERIFY = "email_verification" as const;
const RESET = "password_reset" as const;
const EMAIL_CHANGE = "email_change" as const;

export function resolveUserLocale(preferredLanguage: string | null | undefined, fallback: Locale = "ar"): Locale {
  return preferredLanguage === "ar" || preferredLanguage === "en" || preferredLanguage === "tr" ? preferredLanguage : fallback;
}

export async function activateAccount(rawToken: string, locale: Locale = "ar"): Promise<ActionResult> {
  const tokenHash = await hashChallengeValue(rawToken);
  const row = await findActiveChallengeByTokenHash(tokenHash, VERIFY);
  if (!row) {
    logSecurityEvent("AUTH_VERIFY_EMAIL_FAILED", { reason: "invalid_or_expired_token" });
    return { ok: false, reason: "invalid_or_expired_token" };
  }

  const record = {
    userId: row.userId,
    purpose: row.purpose as VerificationPurpose,
    channel: row.channel as "email" | "sms",
    destination: row.destination,
    tokenHash: row.tokenHash,
    codeHash: row.codeHash,
    attempts: row.attempts,
    expiresAt: row.expiresAt,
    consumedAt: row.consumedAt,
    revokedAt: row.revokedAt,
  };
  const result = await verifyTokenRecord(record, rawToken);
  if (!result.valid) {
    logSecurityEvent("AUTH_VERIFY_EMAIL_FAILED", { reason: result.reason, userId: row.userId });
    return { ok: false, reason: result.reason };
  }

  await consumeChallenge(row.id, new Date());

  const { db, end } = getDb();
  try {
    await db
      .update(users)
      .set({ status: "active", emailVerifiedAt: new Date() })
      .where(eq(users.id, row.userId));
  } finally {
    await end();
  }

  void recordAuditEvent({
    eventType: "AUTH_VERIFY_EMAIL_SUCCESS",
    userId: row.userId,
    detail: { purpose: VERIFY },
  });

  const user = await fetchUserSafe(row.userId);
  const deliveryLocale = resolveUserLocale(user?.preferredLanguage, locale);
  if (user?.email) {
    void emailService.send("welcome", {
      to: user.email,
      locale: deliveryLocale,
      variables: { recipientName: user.name ?? undefined },
      urls: {},
    }).catch(() => undefined);
  }

  return { ok: true, userId: row.userId };
}

export async function resendEmailVerification(email: string, locale: Locale = "ar"): Promise<ActionResult> {
  const { db, end } = getDb();
  let userId: string | null = null;
  try {
    const rows = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    userId = rows[0]?.id ?? null;
  } finally {
    await end();
  }

  if (!userId) {
    return { ok: true, reason: "sent_if_exists" };
  }

  await revokeUserChallenges(userId, VERIFY, new Date());

  const rawToken = await generateVerificationTokenValue();
  const challenge = await buildVerificationRecord({
    userId,
    purpose: VERIFY,
    destination: email,
    tokenValue: rawToken,
    withOtp: false,
  });
  await createVerificationChallenge({
    userId,
    purpose: VERIFY,
    destination: email,
    tokenHash: challenge.tokenHash,
    codeHash: null,
    expiresAt: challenge.expiresAt,
  });

  const verificationUrl = buildVerificationEmailUrl(getRuntimeEnv().appOrigin, rawToken);
  void emailService
    .send("verification", {
      to: email,
      locale,
      variables: { recipientName: (await fetchUserSafe(userId))?.name ?? undefined },
      urls: { verificationUrl, tokenExpiryMinutes: tokenExpiryMinutes() },
    })
    .catch(() => undefined);

  void recordAuditEvent({ eventType: "AUTH_VERIFY_EMAIL_SUCCESS", userId, detail: { reason: "resent" } });
  return { ok: true, userId };
}

export async function issuePasswordReset(email: string, locale: Locale = "ar"): Promise<ActionResult> {
  const { db, end } = getDb();
  let userId: string | null = null;
  try {
    const rows = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    userId = rows[0]?.id ?? null;
  } finally {
    await end();
  }

  if (!userId) {
    return { ok: true, reason: "sent_if_exists" };
  }

  const rawToken = await generateVerificationTokenValue();
  const challenge = await buildVerificationRecord({
    userId,
    purpose: RESET,
    destination: email,
    tokenValue: rawToken,
    withOtp: false,
  });

  await createVerificationChallenge({
    userId,
    purpose: RESET,
    destination: email,
    tokenHash: challenge.tokenHash,
    codeHash: null,
    expiresAt: challenge.expiresAt,
  });

  const resetUrl = buildVerificationEmailUrl(getRuntimeEnv().appOrigin, rawToken);
  // The reset link is served under /reset-password but the token is the same
  // shape as an email-verification token; we pass it as `verificationUrl` and
  // the route reads `token`.
  void emailService
    .send("reset", {
      to: email,
      locale,
      urls: { resetUrl, tokenExpiryMinutes: tokenExpiryMinutes() },
    })
    .catch(() => {
      logSecurityEvent("AUTH_PASSWORD_RESET_REQUEST", { userId, emailDelivery: "failed" });
    });

  void recordAuditEvent({
    eventType: "AUTH_PASSWORD_RESET_REQUEST",
    userId,
    detail: { emailDelivery: "sent" },
  });

  return { ok: true, reason: "sent_if_exists", userId };
}

export async function applyPasswordReset(rawToken: string, newPassword: string, locale: Locale = "ar"): Promise<ActionResult> {
  const tokenHash = await hashChallengeValue(rawToken);
  const row = await findActiveChallengeByTokenHash(tokenHash, RESET);
  if (!row) {
    return { ok: false, reason: "invalid_or_expired_token" };
  }
  const record = {
    userId: row.userId,
    purpose: row.purpose as VerificationPurpose,
    channel: row.channel as "email" | "sms",
    destination: row.destination,
    tokenHash: row.tokenHash,
    codeHash: row.codeHash,
    attempts: row.attempts,
    expiresAt: row.expiresAt,
    consumedAt: row.consumedAt,
    revokedAt: row.revokedAt,
  };
  const result = await verifyTokenRecord(record, rawToken);
  if (!result.valid) return { ok: false, reason: result.valid ? "ok" : result.reason };

  await consumeChallenge(row.id, new Date());
  const passwordHash = await hashPassword(newPassword);
  const { db, end } = getDb();
  try {
    await db
      .update(users)
      .set({ passwordHash, passwordChangedAt: new Date(), status: "active", emailVerifiedAt: new Date() })
      .where(eq(users.id, row.userId));
  } finally {
    await end();
  }

  void recordAuditEvent({ eventType: "AUTH_PASSWORD_RESET_SUCCESS", userId: row.userId, detail: {} });

  const user = await fetchUserSafe(row.userId);
  if (user?.email) {
    void emailService.send("password_changed", {
      to: user.email,
      locale,
      variables: { recipientName: user.name ?? undefined },
      urls: {},
    }).catch(() => undefined);
  }
  return { ok: true, userId: row.userId };
}

export async function issueEmailChange(userId: string, newEmail: string, locale: Locale = "ar"): Promise<ActionResult> {
  const { db, end } = getDb();
  let conflict: { id: string } | undefined;
  try {
    const rows = await db.select({ id: users.id }).from(users).where(eq(users.email, newEmail)).limit(1);
    conflict = rows[0];
  } finally {
    await end();
  }
  if (conflict) return { ok: false, reason: "email_in_use" };

  await revokeUserChallenges(userId, EMAIL_CHANGE, new Date());

  const challenge = await buildVerificationRecord({
    userId,
    purpose: EMAIL_CHANGE,
    destination: newEmail,
    withOtp: true,
    withToken: false,
  });
  await createVerificationChallenge({
    userId,
    purpose: EMAIL_CHANGE,
    destination: newEmail,
    tokenHash: null,
    codeHash: challenge.codeHash,
    expiresAt: challenge.expiresAt,
  });

  void recordAuditEvent({ eventType: "AUTH_CHANGE_EMAIL_REQUEST", userId, detail: { newEmail } });

  void emailService
    .send("otp", {
      to: newEmail,
      locale,
      variables: { recipientName: (await fetchUserSafe(userId))?.name ?? undefined, otpCode: undefined },
      urls: { otpExpirySeconds: 600 },
    })
    .catch(() => {
      logSecurityEvent("AUTH_CHANGE_EMAIL_REQUEST", { userId, emailDelivery: "failed" });
    });

  return { ok: true, reason: "otp_sent" };
}

export async function confirmEmailChangeOtp(userId: string, code: string, locale: Locale = "ar"): Promise<ActionResult> {
  const row = await findLatestActiveOtpChallengeForUser(userId, EMAIL_CHANGE);
  if (!row) return { ok: false, reason: "no_active_challenge" };
  if (row.attempts >= 5) return { ok: false, reason: "too_many_attempts" };

  const record = {
    userId: row.userId,
    purpose: row.purpose as VerificationPurpose,
    channel: row.channel as "email" | "sms",
    destination: row.destination,
    tokenHash: row.tokenHash,
    codeHash: row.codeHash,
    attempts: row.attempts,
    expiresAt: row.expiresAt,
    consumedAt: row.consumedAt,
    revokedAt: row.revokedAt,
  };
  const result = await verifyOtpRecord(record, code);
  if (!result.valid) {
    await incrementChallengeAttempts(row.id, row.attempts + 1);
    void recordAuditEvent({ eventType: "AUTH_OTP_VERIFY_FAILED", userId, detail: { reason: result.reason } });
    return { ok: false, reason: result.reason, detail: { attempts: row.attempts + 1 } };
  }

  const currentUser = await fetchUserSafe(userId);
  const oldEmail = currentUser?.email ?? null;
  const newEmail = row.destination;

  if (oldEmail && oldEmail !== newEmail) {
    await rekeyServiceUserReferences(oldEmail, newEmail);
  }

  const { db, end } = getDb();
  try {
    await db
      .update(users)
      .set({ email: newEmail, pendingEmail: null, emailVerifiedAt: new Date() })
      .where(eq(users.id, userId));
  } catch (error) {
    if (oldEmail && oldEmail !== newEmail) {
      await rekeyServiceUserReferences(newEmail, oldEmail).catch(() => undefined);
    }
    throw error;
  } finally {
    await end();
  }

  await consumeChallenge(row.id, new Date());
  void recordAuditEvent({ eventType: "AUTH_EMAIL_CHANGE_CONFIRMED", userId, detail: {} });

  void emailService
    .send("email_changed", {
      to: row.destination,
      locale,
      variables: { recipientName: (await fetchUserSafe(userId))?.name ?? undefined },
      urls: {},
    })
    .catch(() => undefined);

  return { ok: true, userId };
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  locale: Locale = "ar",
): Promise<ActionResult> {
  const { db, end } = getDb();
  let user: (typeof users.$inferSelect) | undefined;
  try {
    const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    user = rows[0];
  } finally {
    await end();
  }
  if (!user) return { ok: false, reason: "user_not_found" };

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    void recordAuditEvent({ eventType: "AUTH_CHANGE_PASSWORD", userId, detail: { result: "failed_bad_password" } });
    return { ok: false, reason: "wrong_password" };
  }

  const passwordHash = await hashPassword(newPassword);
  try {
    const { db: db2, end: end2 } = getDb();
    try {
      await db2
        .update(users)
        .set({ passwordHash, passwordChangedAt: new Date() })
        .where(eq(users.id, userId));
    } finally {
      await end2();
    }
  } finally {
    await end();
  }

  void recordAuditEvent({ eventType: "AUTH_CHANGE_PASSWORD", userId, detail: { result: "success" } });

  if (user.email) {
    void emailService
      .send("password_changed", {
        to: user.email,
        locale,
        variables: { recipientName: user.name ?? undefined },
        urls: {},
      })
      .catch(() => undefined);
  }
  return { ok: true, userId };
}

export async function completeOnboarding(userId: string): Promise<ActionResult> {
  const { db, end } = getDb();
  try {
    await db
      .update(users)
      .set({ onboardingCompletedAt: new Date(), status: "active" })
      .where(eq(users.id, userId));
  } finally {
    await end();
  }
  void recordAuditEvent({ eventType: "AUTH_ONBOARDING_COMPLETE", userId, detail: {} });
  return { ok: true, userId };
}

async function fetchUserSafe(userId: string): Promise<{ email: string | null; name: string | null; preferredLanguage: string | null } | null> {
  const { db, end } = getDb();
  try {
    const rows = await db.select({ email: users.email, name: users.name, preferredLanguage: users.preferredLanguage }).from(users).where(eq(users.id, userId)).limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  } finally {
    await end();
  }
}
