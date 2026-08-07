# Connected Ecosystem API Reference — Stage B

Status: **Implemented** · Base prefix: `/api/office/v1`

All endpoints authenticate via Bearer `apd_*` device credential
(`x-protocol-version`, `x-app-version` headers; see `docs/integrations/AUTH.md`).

## Pairing (sponsor session)

| Method | Path | Scope/permission | Purpose |
| --- | --- | --- | --- |
| POST | `/api/office/v1/pairing` | `OFFICE_PAIRING_MANAGE` | create pairing code |
| GET | `/api/office/v1/pairing` | `OFFICE_INTEGRATION_VIEW` | list codes |
| DELETE | `/api/office/v1/pairing?id=` | `OFFICE_PAIRING_MANAGE` | revoke code |
| POST | `/api/office/v1/pairing/complete` | device (rate-limited) | exchange code → credential |

## Devices

| Method | Path | Scope | Purpose |
| --- | --- | --- | --- |
| GET | `/api/office/v1/devices` | `office.properties.read` (list) | list devices |
| PATCH | `/api/office/v1/devices/:id/revoke` | `office.properties.update` | revoke device |
| POST | `/api/office/v1/auth?action=rotate` | `office.sync` | rotate credential |
| POST | `/api/office/v1/auth` | `office.sync` | heartbeat |

## Sync

| Method | Path | Scope | Purpose |
| --- | --- | --- | --- |
| POST | `/api/office/v1/sync` | `office.sync` | push ops (rate-limited) |
| GET | `/api/office/v1/sync?sinceId=&limit=` | `office.sync` | pull ops |
| GET | `/api/office/v1/sync?action=operations` | `office.sync` | op log |
| POST | `/api/office/v1/sync?action=retry` | `office.sync` | requeue failures |
| POST | `/api/office/v1/sync?action=dead-letter` | `office.sync` | dead-letter |

## Radar

| Method | Path | Scope | Purpose |
| --- | --- | --- | --- |
| POST | `/api/office/v1/radar` | `office.radar.read` | run scan |
| GET | `/api/office/v1/radar` | `office.radar.read` | scan history |

## Notifications

| Method | Path | Scope | Purpose |
| --- | --- | --- | --- |
| GET | `/api/office/v1/notifications` | `office.notifications.read` | deliveries |
| GET/PUT | `/api/office/v1/notifications/rules` | `office.notifications.read` / `office.notifications.write` | rules |

## News / Ads / Realtime

| Method | Path | Scope | Purpose |
| --- | --- | --- | --- |
| GET | `/api/office/v1/news` | `office.news.read` | news feed |
| POST | `/api/office/v1/news/:id/delivered` | `office.news.read` | mark delivered |
| GET | `/api/office/v1/ads` | `office.ads.read` | ads by placement |
| POST | `/api/office/v1/ads/events` | `office.ads.read` | impression/click |
| GET | `/api/office/v1/stream` | any office scope | SSE event stream |

## Admin

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| GET | `/api/admin/integration-overview` | `OFFICE_ADMIN_VIEW` | cross-sponsor aggregate |

## Error conventions

- `{ error: string }` with 400/403/404/409/410/429/501 statuses.
- Protocol gate: 403 (`BLOCKED`) / 409 (`UPDATE_REQUIRED`).
- Realtime unsupported runtime: 501.
