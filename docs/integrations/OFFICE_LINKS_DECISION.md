# office_links — Analysis & Classification (Stage B · B1)

Status: **Accepted** · Decision: **KEEP (legacy) + MIGRATE (new source of truth)**

## Existing surface

- Table `office_links` (`lib/runtime-db.ts`) — id, sponsor_id, office_id, device_id,
  license_key (UNIQUE), application_version, last_sync_at, last_ip, status
  (active/inactive/revoked), activated_at, revoked_at, timestamps.
- Route `app/api/office-links/route.ts` — sponsor-session CRUD guarded by
  `PERMISSIONS.OFFICE_LINK` / `PERMISSIONS.OFFICE_UNLINK`.

## Classification

| Concern | Classification |
| --- | --- |
| Historical license records | **KEEP** — untouched, still readable/writable by legacy admin UI |
| Device registration truth | **MIGRATE** → new `office_devices` table becomes the system of record |
| Pairing / auth / sync lifecycle | **NEW** — `office_pairing_codes`, `office_device_credentials`, `office_sync_operations` |
| `license_key` as an auth secret | **DEPRECATE** — license key is an identifier, NOT a credential; never used for device auth |

## Why not WRAP or merge

- Merging would break existing admin flows that already read/write `office_links`
  and would entangle a human-facing license record with device lifecycle state.
- WRAP (route-only facade) adds indirection without removing the legacy table.

## Co-existence rule

- `office_devices.office_id` is authoritative for which office a device belongs to.
- When a pairing completes against a sponsor that already has an `office_links`
  row for the same office, the device row records `legacy_link_id` for back-compat
  (write of a new `office_links` row only when no matching legacy row exists).
- `office_links.status` is never used to gate device auth. Device auth is gated by
  `office_devices.status` + credential scopes/expiry only.
