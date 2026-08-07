import { createSecureToken, generateVerificationCode, sha256Hex } from "@/lib/auth/crypto";
import type { VerificationPurpose } from "@/lib/db/schema";

export const VERIFICATION_TOKEN_BYTES = 32;
export const VERIFICATION_TOKEN_TTL_MS = 1000 * 60 * 60 * 24; // 24h for email links
export const OTP_TTL_MS = 1000 * 60 * 10; // 10 min for 6-digit codes
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_CODE_LENGTH = 6;

export type VerificationRecord = {
  userId: string;
  purpose: VerificationPurpose;
  channel: "email" | "sms";
  destination: string;
  tokenHash: string | null;
  codeHash: string | null;
  attempts: number;
  expiresAt: Date;
  consumedAt: Date | null;
  revokedAt: Date | null;
};

export type VerifyResult =
  | { valid: true }
  | { valid: false; reason: "consumed" | "expired" | "revoked" | "too_many_attempts" | "mismatch" };

export async function generateVerificationTokenValue(): Promise<string> {
  return createSecureToken();
}

export function generateOtpValue(): string {
  return generateVerificationCode();
}

export async function hashChallengeValue(value: string): Promise<string> {
  return sha256Hex(value);
}

export function isExpired(record: VerificationRecord, now: Date = new Date()): boolean {
  return record.expiresAt.getTime() <= now.getTime();
}

export function isConsumed(record: VerificationRecord): boolean {
  return record.consumedAt !== null;
}

export function isRevoked(record: VerificationRecord): boolean {
  return record.revokedAt !== null;
}

export function isOtpExhausted(record: VerificationRecord): boolean {
  return record.attempts >= OTP_MAX_ATTEMPTS;
}

/**
 * Pure builder: assembles a verification record (token+OTP) with expiry and
 * no hashes persisted as plaintext. The caller owns persistence.
 */
export async function buildVerificationRecord(params: {
  userId: string;
  purpose: VerificationPurpose;
  destination: string;
  tokenValue?: string;
  otpValue?: string;
  withToken?: boolean;
  withOtp?: boolean;
  ttlMs?: number;
  now?: Date;
}): Promise<VerificationRecord> {
  const now = params.now ?? new Date();
  const ttl = params.ttlMs ?? (params.purpose === "otp" || params.purpose === "password_reset" ? OTP_TTL_MS : VERIFICATION_TOKEN_TTL_MS);
  const withToken = params.withToken ?? true;
  const withOtp = params.withOtp ?? false;
  const tokenValue = withToken ? (params.tokenValue ?? (await generateVerificationTokenValue())) : undefined;
  const otpValue = withOtp ? (params.otpValue ?? generateOtpValue()) : undefined;
  return {
    userId: params.userId,
    purpose: params.purpose,
    channel: "email",
    destination: params.destination,
    tokenHash: withToken ? await hashChallengeValue(tokenValue!) : null,
    codeHash: withOtp ? await hashChallengeValue(otpValue!) : null,
    attempts: 0,
    expiresAt: new Date(now.getTime() + ttl),
    consumedAt: null,
    revokedAt: null,
  };
}

export async function verifyTokenRecord(record: VerificationRecord, submitted: string): Promise<VerifyResult> {
  if (!record.tokenHash) return { valid: false, reason: "mismatch" };
  if (isConsumed(record)) return { valid: false, reason: "consumed" };
  if (isRevoked(record)) return { valid: false, reason: "revoked" };
  if (isExpired(record)) return { valid: false, reason: "expired" };
  const submittedHash = await hashChallengeValue(submitted);
  if (submittedHash !== record.tokenHash) return { valid: false, reason: "mismatch" };
  return { valid: true };
}

export async function verifyOtpRecord(record: VerificationRecord, submitted: string): Promise<VerifyResult> {
  if (!record.codeHash) return { valid: false, reason: "mismatch" };
  if (isConsumed(record)) return { valid: false, reason: "consumed" };
  if (isRevoked(record)) return { valid: false, reason: "revoked" };
  if (isExpired(record)) return { valid: false, reason: "expired" };
  if (isOtpExhausted(record)) return { valid: false, reason: "too_many_attempts" };
  const submittedHash = await hashChallengeValue(submitted.padStart(OTP_CODE_LENGTH, "0"));
  if (submittedHash !== record.codeHash) return { valid: false, reason: "mismatch" };
  return { valid: true };
}

export function markOtpAttempt(record: VerificationRecord): VerificationRecord {
  return { ...record, attempts: record.attempts + 1 };
}

export function consumeRecord(record: VerificationRecord, at: Date = new Date()): VerificationRecord {
  return { ...record, consumedAt: at };
}

export function revokeRecord(record: VerificationRecord, at: Date = new Date()): VerificationRecord {
  return { ...record, revokedAt: at };
}

export function buildVerificationEmailUrl(base: string, token: string): string {
  const normalized = base.replace(/\/+$/, "");
  return `${normalized}/verify-email?token=${encodeURIComponent(token)}`;
}

export function buildPasswordResetEmailUrl(base: string, token: string): string {
  const normalized = base.replace(/\/+$/, "");
  return `${normalized}/reset-password?token=${encodeURIComponent(token)}`;
}

export function buildEmailChangeConfirmUrl(base: string, token: string): string {
  const normalized = base.replace(/\/+$/, "");
  return `${normalized}/confirm-change-email?token=${encodeURIComponent(token)}`;
}

export function tokenExpiryMinutes(): number {
  return Math.round(VERIFICATION_TOKEN_TTL_MS / (1000 * 60));
}

export function otpExpirySeconds(): number {
  return Math.round(OTP_TTL_MS / 1000);
}
