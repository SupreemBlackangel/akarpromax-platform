# Multi-Instance Readiness

Audited state in the codebase. Classifications: `SAFE_LOCAL` (safe to be process-local), `PER_INSTANCE`, `DATABASE_BACKED`, `NEEDS_SHARED_STORE`, `DEV_ONLY`.

## State inventory

| State | File | Classification | Notes |
|---|---|---|---|
| `ak_content_schema_meta` latch | `lib/content-schema.ts` | DATABASE_BACKED | Postgres/D1 table; conflict-safe `ON CONFLICT DO NOTHING`; no double-seed. |
| `schemaMode` / `schemaSelectionPromise` | `lib/runtime-db.ts` | DATABASE_BACKED | Reflects DB-selected mode; cached process-locally but re-derived from DB. |
| `sharedClient` (PG pool) | `lib/pg-runtime.ts` | PER_INSTANCE | Node-only; one pool per process. Safe for local. Multi-instance safe because each instance has its own DB connection. |
| `runtimeIsWorkers` | `lib/pg-runtime.ts` | SAFE_LOCAL | Runtime probe cache; per-process correct. |
| `revokedSessionJtis` | `lib/auth/session.ts` | NEEDS_SHARED_STORE | Session revocation is in-memory per process. Logout on instance A does not revoke a session presented to instance B. Bounded by 7-day JWT TTL. See `AUTH_SESSION_POLICY.md`. |
| Rate-limit counters | `lib/security/rate-limit.ts` | NEEDS_SHARED_STORE | In-memory per process; logged on startup. See `AUTH_RATE_LIMIT_POLICY.md`. |
| Audit event log | `lib/security/audit.ts` | DATABASE_BACKED | Written to `audit_events` in Postgres/D1. |
| Verification challenges | `lib/db/verification.ts` | DATABASE_BACKED | Stored in `verification_challenges`; idempotency via DB state. |
| Office pairing code | `lib/office/...` | DATABASE_BACKED | Idempotency via DB `pairing` row. |
| Office heartbeat / sync | `lib/office/...` | DATABASE_BACKED | Persisted in `office_sync`; last-writer-wins by `updated_at`. |
| SSE client registry | `lib/realtime/...` | PER_INSTANCE | Connection-local; event persistence is **not** connection-local (events are DB-backed; clients replay via `Last-Event-ID`/cursor). Reconnect to another instance can recover missed events. |

## Conclusion

- **No correctness-critical data relies on process memory alone.** Schema state, sessions (JWT signature), audit, verification, office pairing/sync are all DB-backed.
- **Two NEEDS_SHARED_STORE items** (session revocation, rate limiting) are bounded by JWT TTL and are acceptable for the Phase 5 production baseline; both are documented as shared-store roadmap items.
- **SSE** is connection-local for the live socket but event-sourced from the DB, so multi-instance reconnect recovery is possible.
