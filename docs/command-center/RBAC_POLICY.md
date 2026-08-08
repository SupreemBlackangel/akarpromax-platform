# Command Center RBAC Policy

## Overview

The Command Center enforces role-based access control (RBAC) at the API route level. All metric queries are read-only and do not modify system state.

## Required Permissions

Access to the Command Center overview API requires one of the following permissions:

- `ADMIN_DASHBOARD_VIEW` — Full admin dashboard access
- `REPORTS_VIEW` — Reports and analytics access

## Permission Mapping

| Role | Permissions |
|------|------------|
| `super_admin` | All permissions |
| `admin` | `ADMIN_DASHBOARD_VIEW`, `REPORTS_VIEW` |
| `support` | `REPORTS_VIEW` |
| `content_manager` | `REPORTS_VIEW` |
| `property_manager` | `REPORTS_VIEW` |
| `service_manager` | `REPORTS_VIEW` |
| `marketing` | `REPORTS_VIEW` |
| `finance` | `REPORTS_VIEW` |
| `viewer` | `REPORTS_VIEW` |
| `user` | None |
| `guest` | None |

## Enforcement

RBAC is enforced in `app/api/admin/command-center/overview/route.ts`:

```typescript
const user = await requireSessionUser();
if (!user) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

const hasPermission = hasAnyPermission(user.permissions, [
  "ADMIN_DASHBOARD_VIEW",
  "REPORTS_VIEW",
]);

if (!hasPermission) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

## Data Scope

- **Read-only**: All queries use `SELECT` statements only
- **No mutations**: No `INSERT`, `UPDATE`, or `DELETE` operations
- **Aggregated**: Results are pre-aggregated; no raw PII exposed
- **Time-bounded**: Queries use relative time windows (max 90 days)
- **Rate-limited**: 30-second polling interval prevents abuse

## Audit

All Command Center access is logged in the `audit_logs` table with:
- User ID
- Action type (`command_center_view`)
- Timestamp
- IP address (from request headers)

## Security Considerations

- SQL injection prevented via parameterized queries
- No client-side filtering bypasses server-side RBAC
- System health status is inferred, not directly probed
- Geographic data uses city IDs, not exact coordinates
