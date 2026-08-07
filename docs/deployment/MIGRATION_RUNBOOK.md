# Migration Runbook

## Philosophy

Production should NOT rely on the first user request creating the schema. The content area schema bootstrap (`lib/content-schema.ts` via `lib/pg-runtime.ts`) is **idempotent** and runs once on the readiness probe (`/api/health`), then latches via `ak_content_schema_meta`. Auth DDL is similarly additive.

## Steps

1. Build: `npm run build`.
2. Readiness gate: `GET /api/health` until `schema.ready === true` and `schema.mode === "postgres"`.
3. Only then route traffic.

## Verifying completion

```
GET /api/health
{"status":"ok","schema":{"mode":"postgres","ready":true}}
```

If `mode` is not `postgres` under production, **fail the deploy** (no silent fallback).

## Manual schema inspection (if needed)

```sql
SELECT version FROM ak_content_schema_meta;   -- expect 1
\d users verification_challenges audit_events ; -- auth tables present
```

## Adding a new schema version

1. Bump `CONTENT_SCHEMA_VERSION` in `lib/content-schema.ts`.
2. Add the new DDL to `CONTENT_TABLES_SQL` (idempotent).
3. Update `ensureContentSchema` seed gating if new seed data is required.
4. Re-run readiness gate.

## Rollback

A previous application version is compatible with a newer schema only if additive. If a deploy changes column types incompatibly, use the rollback procedure in `ROLLBACK_RUNBOOK.md`.
