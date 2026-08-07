# Health Checks

## Endpoints

| Path | Purpose | Success | Failure |
|---|---|---|---|
| `GET /api/health` | Readiness + liveness combined | `200 {status:"ok", schema:{mode, ready:true}}` | `503 {status:"degraded", schema:{...}}` |
| `GET /api/health/live` | Liveness (process alive) | `200 {status:"alive"}` | process down |
| `GET /api/health/ready` | Readiness (DB + schema) | `200 {status:"ready", schema:{mode:"postgres", ready:true}}` | `503 {status:"not_ready"}` |

## What readiness checks

- Runtime env resolved (`getRuntimeEnv()` — fails on bad/missing `SESSION_SECRET`, `APP_URL`).
- DB provider resolved (`decideSchemaMode`) — **fails fast with `SchemaModeError`** for an impossible provider/binding mix (no silent fallback).
- Content schema initialized (`ensureContentSchema` + `ak_content_schema_meta` latch).
- DB reachable (the schema init itself exercises a Postgres round-trip).

## Public data

Readiness does **not** leak: connection string, host, username, database name, or raw SQL errors. It exposes only `mode` ("postgres"|"mysql"|"d1") and a boolean `ready`.

## Usage

```bash
# Liveness
curl -sf http://localhost:3011/api/health/live || kill -9 $(pgrep -f 'vinext start')

# Readiness (deployment gate)
curl -sf http://localhost:3011/api/health/ready
```

The deployment gate must pass BEFORE traffic is routed.
