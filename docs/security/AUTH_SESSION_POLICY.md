# Session & Cookie Policy

Single source of truth: `lib/auth/session.ts`.

## Session model

- Server-side session represented by a signed **JWT** in the `akar_session` cookie.
- JWT signed with `SESSION_SECRET` (HS256). `alg` whitelisted to `HS256`; no `none`.
- Payload: `{ userId, role, permissions, jti, iat, exp }` — `exp` = 7 days.
- The cookie is the **only** identity source for `/api/auth/me`, `/api/user-context`, and every `getSponsorIdentity()` / `requireSessionUser()` gate.

## Cookie attributes

```
akar_session = <jwt>
HttpOnly; SameSite=Lax; Path=/; Secure=<NODE_ENV==="production">
Max-Age = 604800 (7 days)
```

- `HttpOnly=true` — no JS access (mitigates XSS session theft).
- `Secure=true` in production (`NODE_ENV=production`) — HTTPS only.
- `SameSite=Lax` — mitigates CSRF for top-level navigations.
- `Path=/`.

## Reading the cookie

`readSessionCookieValue()` reads in order:
1. Explicit `cookie` header passed by the caller (e.g. `verify-otp` route).
2. Raw `Cookie` header via `headers().get("cookie")` — works under both `vinext dev` and `vinext start`.
3. Fallback to `cookies().get("akar_session")` — for runtimes where `headers()` is unavailable.

This order is why session reads work under `vinext start` over HTTP.

## Logout / revocation

- `destroySession()` revokes the JWT `jti` via `revokeSessionJti` (in-memory `revokedSessionJtis` set) and deletes the cookie.
- A revoked `jti` makes `verifySessionPayload` return `null` → `/me` → 401.
- **Limitation**: revocation is process-local (in-memory). A horizontally-scaled deployment (multiple `vinext start` instances) cannot share revocations across processes. Tracked for a shared-store fix. JWT TTL (7d) bounds the window.

## Local HTTP testing

Under local `vinext start` (HTTP, `NODE_ENV=production`), browsers won't resend `Secure` cookies over HTTP. The E2E harness injects the `Cookie` header explicitly (read from the `Set-Cookie` response). This is a local-only strategy and does not weaken production HTTPS security.
