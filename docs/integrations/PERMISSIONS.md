# Permissions & Navigation — Connected Ecosystem (Stage B)

Status: **Implemented**

## New permissions (`src/constants/permissions.ts`)

| Permission | Guards |
| --- | --- |
| `OFFICE_INTEGRATION_VIEW` | office workspace overview + pairing list |
| `OFFICE_PAIRING_MANAGE` | create/revoke pairing codes |
| `OFFICE_DEVICES_MANAGE` | device list / revoke actions in workspace UI |
| `OFFICE_DEVICES_REVOKE` | revoke-specific gate (finer than manage) |
| `OFFICE_SYNC_VIEW` | sync operations UI |
| `OFFICE_RADAR_VIEW` | radar UI |
| `OFFICE_NOTIFICATIONS_VIEW` | notifications UI |
| `OFFICE_ADMIN_VIEW` | admin integration overview + sidebar group |

They are validated by the existing permission model (`hasSponsorPermission`) and
the frontend `ROLE_CATALOG` mapping, so they flow through the same
`/api/user-context` / viewer pipeline as Stage A permissions.

## Workspace navigation

`src/config/sidebar.ts` adds an `officeSidebarConfig` and
`getSidebarConfig("office")`. `OfficeWorkspaceShell` (client) resolves the visible
items from the viewer role + permissions and renders them alongside its own
in-page tabs (overview / devices / radar / sync / notifications).

## Admin navigation

`app/admin/admin-sidebar.tsx` gains a "النظام المتصل" group rendered only when
the viewer has `OFFICE_ADMIN_VIEW`, linking to `/admin/integration`.

## Roles

No new roles were introduced. The permissions map onto existing roles via
`ROLE_CATALOG` (super-admin gets all office permissions; lower roles get the
read/view subset as configured). Adjustments belong in the role catalog, not in
permission definitions.
