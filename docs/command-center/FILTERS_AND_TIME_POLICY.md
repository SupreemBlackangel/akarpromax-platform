# Command Center Filters & Time Policy

## Overview

The Command Center uses a server-side time policy with client-side display formatting. All timestamps are in UTC at the database level and converted to local time for display.

## Time Policy

- **Database timestamps**: All stored as UTC ISO-8601 strings
- **Query filters**: Use `datetime('now')` (D1) or `NOW()` (PostgreSQL) for relative time comparisons
- **Client display**: JavaScript `Date` constructor handles UTC→local conversion automatically
- **Polling interval**: 30 seconds for auto-refresh

## Filter Categories

### Time-Based Filters
- **Last 24 hours**: `created_at >= datetime('now', '-1 day')`
- **Last 7 days**: `created_at >= datetime('now', '-7 day')`
- **Last 30 days**: `created_at >= datetime('now', '-30 day')`
- **Last 90 days**: `created_at >= datetime('now', '-90 day')`

### Status Filters
- **Properties**: `draft`, `active`, `deleted`
- **Services**: `open`, `in_progress`, `completed`, `cancelled`, `disputed`
- **Ads**: `draft`, `active`, `paused`, `ended`
- **Users**: `active`, `suspended`, `pending_verification`
- **Devices**: `active`, `inactive`, `maintenance`, `decommissioned`
- **Syncs**: `synced`, `pending`, `failed`, `conflict`, `dead_letter`

### Geographic Filters
- **By country**: `country_code` column
- **By city**: `city_id` column (via `GROUP BY`)
- **Coverage gaps**: Computed from demand/supply ratio

## Implementation

All filters are applied server-side in `lib/command-center/service.ts` using parameterized SQL queries. The client receives pre-filtered, aggregated results. No client-side filtering is performed on metric data.

## Data Freshness

- **Real-time**: Audit logs, active operations
- **Near real-time**: User registrations, property listings
- **Batch**: Ad campaign metrics (updated on impression/click events)
- **Static**: System health (inferred from query success)
