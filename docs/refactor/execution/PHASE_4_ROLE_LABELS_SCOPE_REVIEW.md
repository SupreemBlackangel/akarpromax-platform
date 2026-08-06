# Phase 4 — Commit Scope Review (role-label wiring)

**Commit (planned):** `refactor(auth): wire service roles into admin labels and assignment`
**Parent:** `dbf030e`
**Date:** 2026-08-06

## Files (6)

| Path | Change |
|---|---|
| `app/api/sponsor-access/route.ts` | add `service_provider` + `service_supervisor` to `assignableRoles` |
| `app/admin/sponsors/sponsor-admin-client.tsx` | `roleLabels` entries for both service roles |
| `app/admin/ads/ads-admin-client.tsx` | `roleLabels` entries for both service roles |
| `app/admin/i18n/i18n-admin-client.tsx` | `loadVersions()` wrapped in `window.queueMicrotask` (set-state-in-effect fix) |
| `app/admin/sponsors/_components/SponsorRequestsView.tsx` | `fetchRequests()` microtask fix |
| `app/admin/sponsors/_components/SponsorsListView.tsx` | `fetchAll()` microtask fix |

Follows the roles added in `46f8df5`; the microtask fixes satisfy
`react-hooks/set-state-in-effect` (these were 3 of the 11 clean-tree lint
errors).

## Criterion

**Unrelated files = 0.**
