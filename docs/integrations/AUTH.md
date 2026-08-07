# Office Auth & Device Security — Connected Ecosystem (Stage B)

Status: **Implemented** · Protocol v1 · App compatibility floor: `1.0.0`

## Identity model

- Offices are keyed by **sponsor identity email** (`identity.email ?? "unknown"`) —
  there is no numeric `sponsorId` on `SponsorIdentity`.
- A **paired device** is the identity for every `/api/office/v1/*` call. There is no
  browser session and no reusable bearer secret beyond the issued credential.

## Pairing flow

1. Sponsor (authenticated, permission `OFFICE_PAIRING_MANAGE`) calls
   `POST /api/office/v1/pairing` → returns a **6-char code** (no-confusable alphabet
   from `lib/integration/crypto.ts`). The code is stored **only as SHA-256**
   (`code_hash`), TTL 15 min, single-use.
2. The office desktop/mobile app calls `POST /api/office/v1/pairing/complete`
   (rate-limited `office_pairing_complete`, 5/60s) with the code + installation id +
   app/protocol version. The pairing route runs `checkProtocolVersion` first.
3. On success the server creates `office_devices` (status `active`) and an
   `office_device_credentials` row. The credential's `scopes` are the
   `OFFICE_DEFAULT_SCOPES` catalog. The **raw token is never stored** — only
   `token_hash` + `token_prefix` (first 8 chars for UI display).

## Token lifecycle

- Format: `apd_` + 2× UUID hex (`OFFICE_TOKEN_PREFIX`). Expiry 90 days.
- `authenticateDeviceToken` (device.ts) resolves by `token_hash`, rejects if
  `revoked_at` set or expired, then loads the device and requires `status === "active"`.
  Every successful auth stamps `last_used_at` on the credential and `last_seen_at`
  on the device (heartbeat).
- **Rotation** (`POST /api/office/v1/auth?action=rotate`): revokes the current
  credential, issues a new one with the same scopes. Old token dies immediately.
- **Revoke** (`PATCH /api/office/v1/devices/:id/revoke`): sets device `status =
  'revoked'` and revokes every active credential.

## Scope enforcement

- `deviceHasScope`/`requireScope` gate each route to a specific scope
  (`office.news.read`, `office.ads.read`, `office.notifications.read`,
  `office.properties.read`, `office.properties.create`, `office.properties.update`,
  `office.sync`, `office.radar.read`).
- Headers `x-protocol-version` and `x-app-version` are validated on every request;
  `BLOCKED` → 403, `UPDATE_REQUIRED` → 409.

## Never stored

Pairing codes and device tokens exist in the DB **only as SHA-256 hashes**. The
`logSecurityEvent` helper redacts `password|secret|token|cookie|...` field names.

## HTTP errors (pairing)

`pairingErrorToHttp` maps `PAIRING_CODE_NOT_FOUND` → 404, `PAIRING_CODE_USED` /
`PAIRING_CODE_EXPIRED` → 410, everything else → 400.
