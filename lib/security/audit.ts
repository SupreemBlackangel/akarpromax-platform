const SENSITIVE_FIELD_PATTERN =
  /password|secret|token|cookie|authorization|auth-header|otp|reset[_-]?link|reset[_-]?code|session[_-]?id|api[_-]?key|access[_-]?key|private[_-]?key/i;

export type SecurityEventName =
  | "AUTH_LOGIN_FAILED"
  | "AUTH_RATE_LIMITED"
  | "AUTH_ORIGIN_REJECTED"
  | "AUTH_DEV_LOGIN_BLOCKED"
  | "AUTH_SESSION_INVALIDATED"
  | "AUTH_SECRET_VALIDATION_FAILED"
  | "DATABASE_SCHEMA_MISMATCH";

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
