# Auth Rate Limit Policy

`lib/security/rate-limit.ts`.

## Model

- In-memory token-bucket / fixed-window store per key.
- Keys: `login:{ip}:{normalized-email}`, `verify_email:{ip}`, `verify_code:{ip}`, `register:{ip}`.

## Production limitation

The in-memory store is **process-local**. Under multiple `vinext start` instances the limit counters are not shared, so a distributed brute-force could exceed per-instance limits. This is logged on startup:

```
[security] rate limiter uses an in-memory store; a shared store is required before horizontal scaling
```

## Shared-store roadmap

For horizontal production scale, swap the in-memory `RateLimitStore` for a Redis-backed implementation (keyed by the same `login:{ip}:{email}` shape). No other call site changes.

## Current limits (defaults in `lib/security/rate-limit.ts`)

| Action | Window | Max attempts |
|---|---|---|
| login | 60s | 10 |
| verify_email | 60s | 10 |
| verify_code | 60s | 10 |
| register | 60s | 5 |

Rate-limited responses return `429` with `Retry-After`.
