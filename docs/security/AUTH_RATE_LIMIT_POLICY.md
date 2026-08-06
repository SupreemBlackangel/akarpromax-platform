# Auth Rate Limit Policy

Generated: 2026-08-06

Enforced by `lib/security/rate-limit.ts`. Applies to the auth API routes
(`login`, `register`, `verify`) and is available to every operation below via
`enforceRateLimit(operation, ip, identifier?)`.

## Operation table

| Operation | Limit | Window | Cooldown | Dimensions |
| --- | --- | --- | --- | --- |
| `login` | 10 | 60 s | 60 s | IP + normalized identifier (email or phone) |
| `register` | 5 | 60 s | 300 s | IP + normalized identifier |
| `verify_code` | 15 | 60 s | 60 s | IP |
| `password_reset` | 5 | 60 s | 300 s | IP + identifier |
| `password_reset_confirm` | 5 | 60 s | 60 s | IP |
| `otp_resend` | 5 | 60 s | 300 s | IP + identifier |
| `change_email` | 5 | 60 s | 300 s | IP |
| `dev_login` | 10 | 60 s | 60 s | IP (route does not exist; reserved) |

- Bucket keys are `sha256("<operation>:<dimension>")` so identifiers/IPs are
  never stored or logged in plaintext (`InspectableRateLimitStore.keys()` is
  hash-only).
- A dimension counts only when the operation fails before success; once any
  bucket exceeds `limit`, `setCooldown` freezes the key for `cooldownMs`.
- A single `cooldownMs: 0` config falls back to the remaining window as the
  block period.

## Identity normalization

- Email: `trim().toLowerCase()`.
- Phone: `trim()` → remove whitespace and all non-digits, keep last 12 digits
  (country code preserved when present).
- IP (`clientIp`): `cf-connecting-ip` → first `x-forwarded-for` entry →
  `x-real-ip` → `"unknown"`.

## Response contract

A blocked request returns `429` with the unified error shape
(`{ error, code, requestId }`) and a `Retry-After`-style hint derived from
`retryAfterSeconds`. The client-side copy maps the generic failure to a
"try again" message; no rate-limit internals are exposed to the UI.

## Audit

Every block emits `AUTH_RATE_LIMITED { operation }` via
`lib/security/audit.ts`. Normalizer/limiter behaviour is covered by
`tests/rate-limit.test.mjs` (burst/reject, window reset, cooldown, identifier
sharing, IP independence, hashed keys, disabled mode).

## Storage and horizontal scaling

The default store is **in-memory** (`MemoryRateLimitStore`), correct for a
single process. Production logs a startup warning when the in-memory store is
used. Before running multiple instances:

1. Implement `RateLimitStore` backed by a shared key-value store (Redis is the
   planned choice per ADR-001); bucket logic and cooldown semantics must
   match `MemoryRateLimitStore` exactly.
2. Keep `InspectableRateLimitStore` equivalence for audits.
3. Update `setRateLimitStoreForTests`/`getRateLimiter` wiring.

No new dependency (Redis client) was added in Phase 0.
