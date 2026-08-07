# Admin Integration Overview — Connected Ecosystem (Stage B)

Status: **Implemented**

## Purpose

Give platform admins a single read-only dashboard of the connected ecosystem
across all sponsors: devices, sync operations, radar scans, notification
deliveries and rules.

## Endpoint

`GET /api/admin/integration-overview`

- Guarded by permission `OFFICE_ADMIN_VIEW`.
- Aggregates via `getIntegrationDb()`:
  - `devices` — all `office_devices` (recent first, includes sponsor).
  - `syncs` — `office_sync_operations` (recent 50).
  - `radars` — `office_radar_queries` (recent 20).
  - `deliveries` — `office_notification_deliveries` (recent 50).
  - `rules` — `office_notification_rules`.
- Reads through the runtime DB seam (D1 in dev, MySQL under start).

## UI

`app/admin/integration/` — `page.tsx` (server, permission-gated) + client
component rendering stat cards and tables (devices, syncs, radars). The admin
sidebar gains a "النظام المتصل" group shown only with `OFFICE_ADMIN_VIEW`.

## Notes

- Read-only: pairing, revoke and rule mutation live in the office workspace UI
  and the `/api/office/v1/*` surface.
- Admin counts tolerate a missing table via `?? []` so the page renders even
  when a schema backend is absent (degrades like the rest of the runtime matrix).
