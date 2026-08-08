# Command Center Architecture

## Overview

The Command Center is a unified operational dashboard for AkarPromax that provides real-time metrics across all platform modules. It follows a read-only architecture pattern with server-side RBAC enforcement.

## Architecture

```
Page (/admin)
  → CommandCenterOverview (client component)
    → GET /api/admin/command-center/overview
      → getCommandCenterOverview() (service)
        → getRuntimeDb() → D1Database interface
          → 35+ parallel SQL queries via Promise.all()
```

## Key Files

| File | Purpose |
|------|---------|
| `lib/command-center/service.ts` | Core service with `getCommandCenterOverview()` |
| `app/api/admin/command-center/overview/route.ts` | API endpoint with RBAC |
| `app/admin/command-center-client.tsx` | Golden Reference UI |
| `app/admin/page.tsx` | Admin dashboard page (renders CommandCenterOverview) |
| `app/globals.css` | Command center CSS (`.cc-*` classes) |
| `tests/command-center.test.mjs` | 25 comprehensive tests |

## Data Flow

1. Client fetches `/api/admin/command-center/overview` on mount
2. API route enforces `ADMIN_DASHBOARD_VIEW` or `REPORTS_VIEW` permission
3. Service runs 35+ parallel SQL queries against the runtime database
4. Results are aggregated and returned as a typed `CommandCenterOverview` object
5. Client renders metrics using semantic CSS utility classes

## Metric Sections

- **Sponsors**: total, active, byStatus, byCountry
- **Ads**: total, active, byStatus, byType, byApprovalStatus, endingSoon, impressions, clicks, CTR
- **Properties**: total, active, byStatus, byType, byListingType, byCountry, featured, missingCoordinates, staleCount, recentCount
- **Services**: requests/offers/orders/providers/disputes by status, aging metrics
- **Users**: total, byRole, byStatus, recentRegistrations, suspendedCount, pendingVerification
- **Integration**: devices by status, syncs by status, stale devices, pending pairings, notifications
- **Geographic**: properties/demand/providers by city, coverage gaps
- **Health**: database, auth, realtime, office integration, email status
- **Audit**: recent actions, today count

## Performance

- All queries run in parallel via `Promise.all()`
- 30-second auto-refresh polling
- Existing database indexes cover all GROUP BY columns
- No N+1 query patterns
