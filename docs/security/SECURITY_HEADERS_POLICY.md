# Security Headers Policy

Generated: 2026-08-06

Enforced by `lib/security/headers.ts` and applied to every API response via
`applySecurityHeaders(init)` (unified handler + `/api/health`).

## Header set

| Header | Value | Notes |
| --- | --- | --- |
| `Content-Security-Policy-Report-Only` | See below | **Report-Only**, not enforced, this phase. |
| `X-Content-Type-Options` | `nosniff` | |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | |
| `Permissions-Policy` | `geolocation=(self), camera=(), microphone=(), payment=(), usb=()` | `self` is preserved for the account dialog's geolocation flow. |
| `X-Frame-Options` | `SAMEORIGIN` | Clickjacking; complements `frame-ancestors 'self'`. |
| `Cross-Origin-Opener-Policy` | `same-origin` | |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` | **Production only.** |

## CSP (Report-Only) source inventory

The policy reflects the app's real asset sources:

| Directive | Sources | Why |
| --- | --- | --- |
| `default-src` | `'self'` | Baseline. |
| `script-src` | `'self' 'unsafe-inline'` | Inline **theme boot script** in `app/layout.tsx` (data-theme restore) and Next-injected inline scripts. |
| `style-src` | `'self' 'unsafe-inline'` | Tailwind-injected `<style>` + RTL/Dark theme variables. |
| `img-src` | `'self' data: blob: https:` | Sponsor logos/ads, map tiles, avatars, `data:` previews. |
| `font-src` | `'self' data:` | Local/webfont and embedded fonts. |
| `connect-src` | `'self'` | Same-origin API calls only. |
| `frame-ancestors` | `'self'` | Clickjacking (CSP form). |
| `object-src` | `'none'` | |
| `base-uri` | `'self'` | |
| `form-action` | `'self'` | |

Explicitly **absent**: `'unsafe-eval'`, wildcard `*`, `'unsafe-hashes'`.

### Why Report-Only

Enforcing CSP today would require a full render audit (every inline script and
`eval`-style pattern in the bundle, plus `next/image` and any third-party
embed). Report-Only gives signal without breaking pages; enforcing the policy
is a follow-up after the inventory stabilizes. See `RADIX_PRIMITIVES_INVENTORY.md`
for the dependency side of the same inventory.

## CSRF complement

- State-changing requests: Origin validation (`ADR-PHASE-0-CSRF-PROTECTION.md`).
- Cookie layer: SameSite `Lax` + HttpOnly (`ADR-PHASE-0-SESSION-COOKIE.md`).
- `frame-ancestors`/`X-Frame-Options` block clickjacking (a CSRF-adjacent
  vector).
- Accepted risk: a caller that omits `Origin` (non-browser) is not blocked by
  the origin layer; it is still subject to rate limiting and cookie security.

## Coverage & tests

- `tests/security-headers.test.mjs` asserts the presence of every header,
  HSTS being production-only, the CSP containing no `'unsafe-eval'`/`*`/enforce
  token, and `applySecurityHeaders` merging with plain-object and `Headers`
  inputs (case-insensitive).
- `GET /api/health` returns 200/503 with `securityHeaders()` applied and no
  credentials/URLs/SQL in the body.
