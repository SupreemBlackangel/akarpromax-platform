import { isProduction } from "@/lib/config/runtime-env";

// Content-Security-Policy (Report-Only) inventory of the app's real asset
// sources (see docs/security/SECURITY_HEADERS_POLICY.md for the inventory):
//   - inline scripts: the AkarProMax theme boot script (data-theme restore)
//   - inline styles: Tailwind-injected <style> + RTL/Dark theme variables
//   - images: sponsor logos/ads (https:, data:, blob:), map tiles, avatars
//   - fonts: local/webfont and data: URIs
//   - connect: same-origin API calls only
// No wildcard *, no 'unsafe-eval', no 'unsafe-hashes'.
export function cspReportOnly(): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

export function securityHeaders(): Record<string, string> {
  const production = isProduction();
  const headers: Record<string, string> = {
    "Content-Security-Policy-Report-Only": cspReportOnly(),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(self), camera=(), microphone=(), payment=(), usb=()",
    "X-Frame-Options": "SAMEORIGIN",
    "Cross-Origin-Opener-Policy": "same-origin",
  };
  if (production) {
    headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains";
  }
  return headers;
}

export function applySecurityHeaders(init: ResponseInit = {}): ResponseInit {
  const merged: Record<string, string> = {};
  const existing = init.headers;
  if (existing instanceof Headers) {
    for (const [key, value] of existing.entries()) merged[key] = value;
  } else if (existing) {
    Object.assign(merged, existing);
  }
  Object.assign(merged, securityHeaders());
  return { ...init, headers: merged };
}
