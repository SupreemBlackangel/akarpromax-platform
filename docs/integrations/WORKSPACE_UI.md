# Office Workspace UI — Connected Ecosystem (Stage B)

Status: **Implemented**

## Location

`app/dashboard/office/` — a sponsor-facing office workspace at
`/dashboard/office/*`, wrapped by `src/components/office/OfficeWorkspaceShell.tsx`.

## Pages

| Route | Tab | Content |
| --- | --- | --- |
| `/dashboard/office/integration` | overview | stat cards (active devices, synced ops, conflicts, radar scans, pending deliveries) + recent devices + recent notifications |
| `/dashboard/office/devices` | devices | device table with revoke button; `?tab=pairing` shows pairing codes with create/revoke |
| `/dashboard/office/radar` | radar | scan form (lat/lng/radius/kind) + results with distance + scan history |
| `/dashboard/office/sync` | sync | recent operations with status/attempts/conflict reason |
| `/dashboard/office/notifications` | notifications | delivery list + rules table with enabled/quiet-hours status |

## Client behaviour

- Uses the existing `@services-client` `apiFetch` and `useServicesPage`
  (locale + viewer). Shell dir flips for Arabic (`rtl`).
- Data loads with `AbortController`-guarded fetches; failures fall back to empty
  states so the UI never hard-crashes when a schema backend is absent
  (consistent with the runtime matrix in AGENTS.md).
- `deviceHasScope`-style scoping is enforced server-side; the UI additionally
  hides revoke/pairing controls based on `OFFICE_*` permissions.

## Note

This is the sponsor-side workspace. The admin view is separate
(`/admin/integration`, see `docs/integrations/ADMIN_INTEGRATION.md`). The office
**desktop application** itself is out of scope for Stage B (it consumes
`/api/office/v1/*`).
