# Device Sync — Connected Ecosystem (Stage B)

Status: **Implemented** · Protocol v1

## Purpose

Offline-capable offices push property changes to the platform. `lib/integration/sync.ts`
provides an idempotent, conflict-aware operation log plus the property materialization
(`property_listings`).

## Operations

- `syncPush(deviceId, items, decideConflict?)` — for each item:
  1. Idempotency check: `device_id + idempotency_key`; an already-`synced` op is a
     duplicate (counted, not reapplied).
  2. Server-version check: if the existing entity row's `updated_at` is newer than
     `clientUpdatedAt`, a conflict is raised. Default decision is
     `accept-server` (client payload dropped, item marked `conflict` with
     `conflict_reason = 'server_newer'`). A caller may inject
     `decideConflict(serverRow, incoming) → { action: 'client-wins', payload, clientUpdatedAt }`.
  3. Apply (property.upsert → `INSERT ... ON CONFLICT(id) DO UPDATE`; property.delete
     → soft delete `status='deleted'`), then record the op row.
- `syncPull(deviceId, sinceId?, limit)` — returns `synced` ops for the device,
  ascending, optionally after a cursor `id`.
- `retryFailedOperations()` — requeues `failed` ops with `attempts < MAX` (5) as
  `retrying` (bounded by `OFFICE_SYNC_MAX_ATTEMPTS`).
- `deadLetterExpired()` — moves ops past max attempts to `dead_letter`.
- `listSyncOperations(deviceId?, status?, limit)` — admin/devices UI support.

## Statuses

`queued → sending → synced | failed | retrying | conflict | dead_letter`
(all in `OFFICE_SYNC_STATUSES`).

## MySQL portability

`translateSql` converts `ON CONFLICT ... DO UPDATE SET` headers to
`ON DUPLICATE KEY UPDATE`, but it does **not** translate `excluded.` column refs.
The property upsert therefore **binds all values directly** and supplies NOT NULL
defaults (`PROPERTY_NOT_NULL_DEFAULTS`) so the same SQL works on SQLite (dev/D1)
and MySQL (start). `attempts + 1` stays portable.

## API

- `POST /api/office/v1/sync` — rate-limited `office_sync_push` (120/60s). Body:
  `{ items: [{ operationType, entityId, payload, clientUpdatedAt, idempotencyKey }] }`.
  Unsupported operation types are dropped at the route layer.
- `GET /api/office/v1/sync` — pull (`?sinceId=`, `?limit=`) or `?action=operations`.
- `POST /api/office/v1/sync?action=retry` and `?action=dead-letter` — admin/diagnostics.
