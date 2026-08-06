# ADR-Phase-0: Session Cookie Hardening

Generated: 2026-08-06

## Status

ACCEPTED (implemented in Phase 0)

## Context

The session cookie (`akar_session`) is the single identity source for auth.
Previously it was issued with weak/no hardening and its payload/signing
behavior was untested. Phase 0 hardens issuance, validation, and revocation.

## Decision

### Cookie attributes (`buildSessionCookieOptions`, `lib/auth/session.ts`)

| Attribute | Value | Notes |
| --- | --- | --- |
| `httpOnly` | `true` | Not readable from JS. |
| `secure` | `NODE_ENV === "production"` | HTTPS only in production; HTTP is expected under `vinext dev` (local). |
| `sameSite` | `lax` | CSRF complement to Origin validation (see ADR-Phase-0-CSRF-PROTECTION). |
| `path` | `/` | Whole site. |
| `maxAge` | 604800 (7 days) | Matches token `exp`. |
| `domain` | unset | No domain scoping — host-only cookie. |

### Token construction (`signSessionPayload` / `verifySessionPayload`)

- Algorithm pinned to `HS256`.
- JWT `jti` (`crypto.randomUUID()`) set on every token → **rotation** (login
  issues a new jti), defeating session fixation.
- `exp` is relative (`"${seconds}s"`). Note: `setExpirationTime(<absolute ms>)`
  signs an already-expired token, and a unitless number string is rejected by
  jose; a relative string is required.
- Payload carries **only** `userId`, `role`, `permissions`, `jti` — no email,
  password material, or personal data (see test contract).
- `verifySessionPayload` re-checks the jti against an in-memory revocation set.

### Revocation (logout / anti-fixation)

- `destroySession` reads the current token, revokes its jti, then deletes the
  cookie.
- **Limitation:** revocation is an in-memory `Set` scoped to the current
  worker/process lifetime (capped at 10k entries). Under horizontal scaling a
  revoked jti may not be observed by another instance until it loads that
  instance's revocation set. A shared store (e.g. Redis) is required before
  scaling — see `AUTH_RATE_LIMIT_POLICY.md` for the same constraint.

### Cookie read path (dev vs start)

`readSessionCookieValue` reads the raw `Cookie` header via `headers()` first,
then falls back to `cookies()`. This works under both `vinext dev` and
`vinext start` **for cookie reads**; the PG-backed auth itself only runs under
`vinext dev` (see AGENTS.md — PG cannot load under `vinext start`).

## Runtime environment notes

- Development and test builds fall back to documented secrets when
  `SESSION_SECRET` is unset (`lib/config/runtime-env.ts`); production fails
  fast on missing/short/weak secrets (see `SECRET_ROTATION_REQUIRED.md`).
- HTTPS is enforced in production via `secure` + HSTS
  (`SECURITY_HEADERS_POLICY.md`). If the app is ever served behind a TLS
  proxy, the proxy must forward `x-forwarded-proto` and the build must treat
  that as the scheme source; this phase does **not** trust forwarded headers
  implicitly.

## Consequences

- Sessions are tamper-evident (HS256), fixer-resistant (jti rotation), and
  readable only by the server (HttpOnly).
- Logout invalidates the token server-side for the lifetime of the process.
- Horizontal scale requires a shared revocation/rate-limit store before
  multi-instance deployment.
