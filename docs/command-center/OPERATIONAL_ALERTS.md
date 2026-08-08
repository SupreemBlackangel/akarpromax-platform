# Command Center Operational Alerts

## Overview

The Command Center provides operational alerts through three mechanisms: system health monitoring, aging metrics, and coverage gap detection. These alerts are informational and do not trigger automated actions.

## Health Monitoring

The system health panel monitors six components:

| Component | Detection Method | Statuses |
|-----------|-----------------|----------|
| Database | Query success/failure | healthy, degraded, unavailable |
| Authentication | User table accessibility | healthy, degraded, unavailable |
| Realtime | Radar query success | healthy, degraded, unavailable |
| Office Integration | Device table accessibility | healthy, degraded, unavailable |
| Email | Not directly measurable | degraded (always) |
| Uptime | Server start timestamp | healthy |

## Aging Alerts

### Service Disputes
- **Threshold**: Disputes older than 7 days
- **Metric**: `oldestDisputeAge` (days since oldest open dispute)
- **Action**: Manual review required

### Pending Verifications
- **Threshold**: Provider verifications pending > 3 days
- **Metric**: `oldestPendingVerificationAge` (days since oldest pending)
- **Action**: Manual review required

### Stale Properties
- **Threshold**: Listings not updated in 30+ days
- **Metric**: `staleCount` (listings with `updated_at < now - 30 days`)
- **Action**: Review for accuracy/removal

### Stale Devices
- **Threshold**: Devices not seen in 7+ days
- **Metric**: `staleDevices` (devices with `last_seen_at < now - 7 days`)
- **Action**: Check device connectivity

## Coverage Gap Alerts

- **Threshold**: Cities with >= 2 service requests but no approved providers
- **Metric**: `coverageGaps` (list of underserved cities)
- **Action**: Consider provider recruitment

## Ending Soon Alerts

- **Threshold**: Ad campaigns ending within 7 days
- **Metric**: `endingSoon` (campaigns with `end_at <= now + 7 days`)
- **Action**: Review campaign performance and renewal options

## Implementation

All alerts are computed server-side in `lib/command-center/service.ts` and returned as part of the `CommandCenterOverview` object. The client renders alerts using semantic CSS classes:

- `.cc-status-ok` — Healthy/normal status
- `.cc-status-warn` — Warning/alert status
- `.cc-status-error` — Critical/error status

## Future Enhancements

- Email/webhook notifications for critical alerts
- Historical alert tracking
- Automated actions (e.g., auto-escalate old disputes)
- Customizable thresholds per user/role
