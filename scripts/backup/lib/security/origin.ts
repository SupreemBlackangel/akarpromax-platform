import { getTrustedOrigins, isProduction } from "@/lib/config/runtime-env";
import { ApiError } from "@/lib/errors/api-error";
import { logSecurityEvent } from "@/lib/security/audit";

export const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const LOCALHOST_ORIGIN_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

// Explicit webhook routes are exempt from Origin checks because they are
// invoked by trusted server-to-server callers that do not send a browser
// Origin header. No webhooks exist yet; the set is kept as the documented
// extension point (see SECURITY_HEADERS_POLICY.md).
const WEBHOOK_PATHS = new Set<string>([]);

export type SafeOriginRequest = {
  method: string;
  headers: { get(name: string): string | null };
  nextUrl?: { pathname: string };
  url?: string | URL;
};

export type OriginCheckResult = {
  allowed: boolean;
  reason: "safe_method" | "missing_origin" | "webhook" | "trusted" | "untrusted";
};

export function isWebhookPath(pathname: string): boolean {
  const normalized = pathname.split("?")[0].replace(/\/+$/, "");
  return WEBHOOK_PATHS.has(normalized);
}

export function isLocalhostOrigin(origin: string): boolean {
  return LOCALHOST_ORIGIN_PATTERN.test(origin);
}

function requestPathname(request: SafeOriginRequest): string {
  if (request.nextUrl?.pathname) return request.nextUrl.pathname;
  try {
    return new URL(String(request.url ?? "/"), "http://localhost").pathname;
  } catch {
    return "/";
  }
}

export function checkOrigin(input: {
  method: string;
  origin: string | null;
  pathname?: string;
}): OriginCheckResult {
  if (input.pathname && isWebhookPath(input.pathname)) {
    return { allowed: true, reason: "webhook" };
  }
  const method = input.method.toUpperCase();
  if (SAFE_METHODS.has(method)) {
    return { allowed: true, reason: "safe_method" };
  }
  if (!input.origin) {
    // Browsers always send Origin on cross-site state-changing requests; a
    // missing Origin means a non-browser (curl/server-to-server) caller. See
    // ADR-PHASE-0-CSRF-PROTECTION.md.
    return { allowed: true, reason: "missing_origin" };
  }

  let parsed: URL;
  try {
    parsed = new URL(input.origin);
  } catch {
    return { allowed: false, reason: "untrusted" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { allowed: false, reason: "untrusted" };
  }

  if (!isProduction() && isLocalhostOrigin(input.origin)) {
    return { allowed: true, reason: "trusted" };
  }
  if (getTrustedOrigins().includes(parsed.origin)) {
    return { allowed: true, reason: "trusted" };
  }
  return { allowed: false, reason: "untrusted" };
}

export function assertSafeOrigin(request: SafeOriginRequest): void {
  const result = checkOrigin({
    method: request.method,
    origin: request.headers.get("origin"),
    pathname: requestPathname(request),
  });
  if (result.allowed) return;
  logSecurityEvent("AUTH_ORIGIN_REJECTED", { method: request.method, pathname: requestPathname(request) });
  throw new ApiError(403, "origin_rejected", "AUTH_ORIGIN_REJECTED");
}
