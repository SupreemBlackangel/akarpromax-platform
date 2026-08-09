# AkarProMax Office — Staging Configuration

AkarProMax Office is a **first-class platform client** (see `PART 60`). This
document defines its staging API surface, auth, and required configuration.

Base URL (staging, HTTPS):
```text
https://staging.akarpromax.com
Office API base: https://staging.akarpromax.com/api/office/v1
```
No `localhost`/`127.0.0.1` anywhere in office-facing contracts (audit-verified —
no hardcoded localhost URLs in `app/api/office/*`).

## Endpoint inventory (staging)

| AREA | ROUTE | PURPOSE | AUTH |
|---|---|---|---|
| Pairing | `POST /api/office/v1/pairing` | start pairing, list/revoke codes | platform session (dashboard) |
| Pairing complete | `POST /api/office/v1/pairing/complete` | exchange pairing code → device token | pairing code + protocol gate (rate-limited `office_pairing_complete`) |
| Auth | `POST /api/office/v1/auth` | device auth / token refresh | pairing-issued device credentials |
| Devices | `GET /api/office/v1/devices` | list/manage paired devices | Bearer device token |
| Sync | `POST /api/office/v1/sync` | `property.upsert` / `property.delete` push (+ `retry`/`dead-letter`); push rate-limited `office_sync_push` | Bearer device token, scope `office.sync` |
| Radar | `GET /api/office/v1/radar` | property radar queries (geo service) | Bearer device token, scope `office.radar.read` |
| News | `GET /api/office/v1/news` | office news/ticker (placement-channel isolated) | Bearer device token |
| Ads | `GET/POST /api/office/v1/ads` | office placements via the central ads engine; impression/click recording | Bearer device token, scope `office.ads.read` |
| Notifications | `GET /api/office/v1/notifications` | office notifications | Bearer device token |
| Realtime | `GET /api/office/v1/stream` | SSE (`text/event-stream`), DB-backed replay of missed events (`last-event-id`) | Bearer device token |

## Auth contract

- `Authorization: Bearer <device-token>`.
- Tokens carry scope claims (`office.sync`, `office.radar.read`,
  `office.ads.read`, etc.) enforced via `requireScope`
  (`app/api/office/v1/ads/route.ts:59`, `radar/route.ts:12,22`).
- Device tokens are created only through the pairing flow; revoked devices are
  rejected by `authenticateDeviceToken` (`lib/integration/device`).
- 401 without a token; 403 when the token lacks the required scope.

## Staging configuration

```text
# Server side (no env var exists for office — the platform serves /api/office/v1):
APP_PUBLIC_URL=https://staging.akarpromax.com   # used in any generated links/tokens
TRUSTED_ORIGINS=https://staging.akarpromax.com  # origin checks (auth routes)

# Office CLIENT side (AkarProMax Office app config, not server env):
OFFICE_API_BASE_URL=https://staging.akarpromax.com/api/office/v1
```

There is **no `OFFICE_API_BASE_URL`/`OFFICE_*` environment variable read by the
server** (grep-verified). The office client is pointed at the staging base URL
by its own configuration; the server contract is the `/api/office/v1` path.

## Realtime (SSE) staging notes

- `/api/office/v1/stream` replays missed events from the content DB event log
  (`office_realtime_events`), so a reconnect never loses events published while
  the connection was down.
- `event: ready` marker after replay; `retry: 3000`; `Cache-Control: no-cache`.
- Under staging, ensure the SSE endpoint is not buffered by any proxy/CDN
  (`X-Accel-Buffering: no` is set server-side; proxy config must allow
  `text/event-stream`).

## Readiness checklist

- [ ] Pairing code → device token → protected routes (401 without token)
- [ ] Sync `property.upsert`/`property.delete` round-trip against staging PG
- [ ] Radar query (geo) returns office-scoped results
- [ ] News/ticker returns office-channel placements only (no website leak)
- [ ] Ads: office placements served by the central engine; impressions/clicks
      recorded with `channel="office"`
- [ ] SSE stream: connect, receive `ready`, replay after reconnect
- [ ] Notifications delivered
- [ ] No `localhost` URLs in any office response
