# Integration Schema — Connected Ecosystem (Stage B)

Status: **Implemented** · Source of truth: `lib/integration/schema.ts`

## Tables

All created with `CREATE TABLE IF NOT EXISTS` through the runtime DB seam
(`getIntegrationDb()` → `ensureIntegrationSchema`), so they materialize on D1 in
`vinext dev` and on MySQL under `vinext start`. MySQL compatibility relies on the
`translateSql` shim (`lib/mysql-runtime.ts`).

| Table | Purpose | Key notes |
| --- | --- | --- |
| `office_pairing_codes` | Pairing intents | `code_hash` (SHA-256), 15-min TTL, single-use |
| `office_devices` | Registered offices | `office_id` authoritative; `status` pending/active/revoked/expired/suspended |
| `office_device_credentials` | Scoped tokens | `token_hash` only, 90-day expiry, `scopes` JSON |
| `office_sync_operations` | Offline-op log | unique `(device_id, idempotency_key)`; status lifecycle + `attempts` |
| `office_radar_queries` | Geo scan history | lat/lng, radius, kind, filters, matched_count |
| `office_notification_rules` | Per-sponsor/office/event/channel toggles | unique on 4 cols; `office_id` uses `''` sentinel for all |
| `office_notification_deliveries` | Notification log | `dedup_key` unique; defer-not-lost |
| `office_realtime_events` | Realtime log/SSE cursor | scope + sponsor + office filter; ordered by `created_at, id` |
| `office_news_deliveries` | Read-receipt dedup | `(device_id, news_id)` |

## Alterations to existing tables

`INTEGRATION_ALTER_SQL` adds `latitude REAL NULL` and `longitude REAL NULL` to
`property_listings` (idempotent — duplicate-column errors are swallowed via
`isDuplicateKeyError`).

## Portability rules

- TEXT primary keys (`crypto.randomUUID()`), no auto-increment assumptions.
- No `excluded.` column refs in upserts — values are bound directly.
- No `IS ?N` NULL comparisons — use empty-string sentinels.
- `date('now')` → `CURDATE()` via translateSql.
- Indexes use `IF NOT EXISTS` (duplicate-error regex widened to cover both
  MySQL `duplicate` and SQLite `already exists` wording).

## Seeding

`seedIntegrationDemo(db)` inserts two demo notification rules when the rules
table is empty (guarded by count), enabling the workspace UI out of the box.
