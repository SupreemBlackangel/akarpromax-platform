import { getDb } from "@/lib/db";
import { auditEvents } from "@/lib/db/schema";

const SENSITIVE_FIELD_PATTERN =
  /password|secret|token|cookie|authorization|auth-header|otp|reset[_-]?link|reset[_-]?code|session[_-]?id|api[_-]?key|access[_-]?key|private[_-]?key/i;

export type SecurityEventName =
  | "AUTH_LOGIN_FAILED"
  | "AUTH_LOGIN_SUCCESS"
  | "AUTH_RATE_LIMITED"
  | "AUTH_ORIGIN_REJECTED"
  | "AUTH_DEV_LOGIN_BLOCKED"
  | "AUTH_SESSION_INVALIDATED"
  | "AUTH_SECRET_VALIDATION_FAILED"
  | "AUTH_REGISTER_ATTEMPT"
  | "AUTH_REGISTER_SUCCESS"
  | "AUTH_REGISTER_FAILED"
  | "AUTH_VERIFY_EMAIL_SUCCESS"
  | "AUTH_VERIFY_EMAIL_FAILED"
  | "AUTH_OTP_REQUEST"
  | "AUTH_OTP_VERIFY_SUCCESS"
  | "AUTH_OTP_VERIFY_FAILED"
  | "AUTH_PASSWORD_RESET_REQUEST"
  | "AUTH_PASSWORD_RESET_SUCCESS"
  | "AUTH_PASSWORD_RESET_FAILED"
  | "AUTH_CHANGE_PASSWORD"
  | "AUTH_CHANGE_EMAIL_REQUEST"
  | "AUTH_EMAIL_CHANGE_CONFIRMED"
  | "AUTH_ONBOARDING_COMPLETE"
  | "AUTH_ACCOUNT_BLOCKED"
  | "DATABASE_SCHEMA_MISMATCH"
  | "OFFICE_PAIRING_STARTED"
  | "OFFICE_PAIRING_COMPLETED"
  | "OFFICE_PAIRING_REVOKED"
  | "OFFICE_DEVICE_REVOKED"
  | "OFFICE_CREDENTIAL_ROTATED"
  | "OFFICE_SYNC_PUSH"
  | "OFFICE_RADAR_SCAN"
  | "OFFICE_AD_IMPRESSION"
  | "OFFICE_AD_CLICK";

export function createRequestId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function redactFields(fields: Record<string, unknown> | undefined): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  if (!fields) return output;
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    if (SENSITIVE_FIELD_PATTERN.test(key)) {
      output[key] = "[REDACTED]";
    } else {
      output[key] = value;
    }
  }
  return output;
}

export function logSecurityEvent(event: SecurityEventName, fields?: Record<string, unknown>): void {
  const entry = {
    event,
    requestId: createRequestId(),
    at: new Date().toISOString(),
    ...redactFields(fields),
  };
  console.info(`[security] ${JSON.stringify(entry)}`);
}

export type AuditRecord = {
  eventType: SecurityEventName;
  userId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  detail?: Record<string, unknown> | null;
};

/**
 * Best-effort persistent audit log. Never throws: a DB failure still emits the
 * console `logSecurityEvent` line so security events are never silently lost.
 */
export async function recordAuditEvent(record: AuditRecord): Promise<void> {
  logSecurityEvent(record.eventType, {
    userId: record.userId,
    ipAddress: record.ipAddress,
    detail: record.detail,
  });
  try {
    const { db, end } = getDb();
    try {
      await db.insert(auditEvents).values({
        userId: record.userId ?? null,
        eventType: record.eventType,
        ipAddress: record.ipAddress ?? null,
        userAgent: record.userAgent ?? null,
        detail: record.detail ?? null,
      });
    } finally {
      await end();
    }
  } catch {
    // Console line above is the durable fallback; do not throw.
  }
}
