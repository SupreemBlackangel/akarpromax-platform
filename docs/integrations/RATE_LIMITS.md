# Rate Limits — Connected Ecosystem (Stage B)

Status: **Implemented**

## Operations added to `RateLimitOperation`

The `RateLimitOperation` union in `lib/security/rate-limit.ts` is closed; Stage B
extends it additively (configs live in `RATE_LIMIT_CONFIGS`):

| Operation | Window | Limit | Applied at |
| --- | --- | --- | --- |
| `office_pairing_complete` | 60s | 5 | `POST /api/office/v1/pairing/complete` (brute-force guard) |
| `office_sync_push` | 60s | 120 | `POST /api/office/v1/sync` (bulk-offline guard) |

Existing auth/service operations are unchanged.

## Behavior

- `enforceRateLimit(op, clientIp, path)` returns `{ allowed }`; a non-allowed call
  yields `429 { error: "Too many attempts" }` before any auth/DB work happens.
- `clientIp(req)` derives the client from `x-forwarded-for` (first hop) — the
  pairing endpoint specifically rate-limits by device IP, not by device identity,
  because an unpaired client has no credential yet.

## Notes

- Office sync pushes a batch per request; the 120/60s ceiling assumes office
  devices push at most a few batches per minute. `syncPush` itself is idempotent,
  so an occasional 429 is safe to retry.
- Defer-not-lost notification delivery is unaffected by rate limiting (dedup and
  quiet hours happen in the dispatch layer, not the transport).
