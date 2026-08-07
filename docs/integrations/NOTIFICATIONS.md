# Notifications & Quiet Hours — Connected Ecosystem (Stage B)

Status: **Implemented**

## Model

- `office_notification_rules` — per (sponsor, office, event_type, channel)
  toggle (`enabled`), plus quiet window (`quiet_start`/`quiet_end` HH:MM).
  Uniqueness enforced by an index on those four columns. `office_id` uses an
  **empty-string sentinel `''`** for "all offices" because `IS ?2` is not
  MySQL-safe (see AGENTS.md).
- `office_notification_deliveries` — one row per recipient-channel per event,
  keyed by `dedup_key` (`eventId|recipientKey|eventType`) so a notification is
  never delivered twice.

## Dispatch semantics (`dispatchOfficeNotification`)

1. Dedup lookup — a matching `dedup_key` short-circuits with `deduplicated: true`.
2. For each requested channel (default `OFFICE_NOTIFICATION_CHANNELS` =
   `in_app | email | office_desktop`):
   - Resolve the matching rule; `enabled = rule?.enabled !== 0`.
   - If disabled **or** inside a quiet window → delivery status `deferred`
     (**defer-not-lost**: the row is persisted, never dropped).
   - Otherwise → status `queued`, channel recorded.
3. Returns `{ deduplicated, deferred, channel, status, deliveryId }`.

Quiet-window comparison supports midnight wrap (`22:00–06:00`).

## Rule upsert

`upsertNotificationRule` uses `INSERT ... ON CONFLICT(sponsor_id, office_id,
event_type, channel) DO UPDATE SET enabled, quiet_start, quiet_end` — portable
via `translateSql`.

## API

- `GET /api/office/v1/notifications` — deliveries (recent 50), sponsor-scoped.
- `PUT /api/office/v1/notifications/rules` — upsert a rule.
- `GET /api/office/v1/notifications/rules` — list rules.

## Note

Quiet windows are evaluated against server local time (`hoursOfNow()`). Clock
drift between office device and server is out of scope for v1.
