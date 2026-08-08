# Command Center Metric Catalog

## Sponsors

| Metric | Source | Query |
|--------|--------|-------|
| Total sponsors | `sponsors` table | `COUNT(*)` |
| Active sponsors | `sponsors.status = 'active'` | `GROUP BY status` |
| By status | `sponsors.status` | `GROUP BY status` |
| By country | `sponsors.country_code` | `GROUP BY country_code` |

## Advertisements

| Metric | Source | Query |
|--------|--------|-------|
| Total campaigns | `ad_campaigns` table | `COUNT(*)` |
| Active campaigns | `ad_campaigns.status = 'active'` | `GROUP BY status` |
| By status | `ad_campaigns.status` | `GROUP BY status` |
| By type | `ad_campaigns.campaign_type` | `GROUP BY campaign_type` |
| By approval status | `ad_campaigns.approval_status` | `GROUP BY approval_status` |
| Ending soon | `ad_campaigns.end_at` | `WHERE end_at <= now + 7 days` |
| Total impressions | `ad_campaigns.total_impressions` | `SUM()` |
| Total clicks | `ad_campaigns.total_clicks` | `SUM()` |
| CTR | clicks / impressions | Computed |

## Properties

| Metric | Source | Query |
|--------|--------|-------|
| Total properties | `property_listings` table | `COUNT(*)` |
| Active properties | `property_listings.status = 'active'` | `GROUP BY status` |
| By status | `property_listings.status` | `GROUP BY status` |
| By type | `property_listings.property_type` | `GROUP BY property_type` |
| By listing type | `property_listings.listing_type` | `GROUP BY listing_type` |
| By country | `property_listings.country_code` | `GROUP BY country_code` |
| Featured | `property_listings.is_featured = 1` | `COUNT(*)` |
| Missing coordinates | `latitude IS NULL OR longitude IS NULL` | `COUNT(*)` |
| Stale (30+ days) | `updated_at < now - 30 days` | `COUNT(*)` |
| Recent (30 days) | `created_at >= now - 30 days` | `COUNT(*)` |

## Services Marketplace

| Metric | Source | Query |
|--------|--------|-------|
| Total requests | `service_requests` table | `GROUP BY status` |
| Open requests | `service_requests.status = 'open'` | `GROUP BY status` |
| By request status | `service_requests.status` | `GROUP BY status` |
| Total offers | `service_offers` table | `GROUP BY status` |
| By offer status | `service_offers.status` | `GROUP BY status` |
| Total orders | `service_orders` table | `GROUP BY status` |
| Active orders | `in_progress + active` | Computed |
| By order status | `service_orders.status` | `GROUP BY status` |
| Total providers | `service_provider_profiles` table | `GROUP BY status` |
| Approved providers | `status = 'approved'` | `GROUP BY status` |
| By provider status | `service_provider_profiles.status` | `GROUP BY status` |
| Total disputes | `service_disputes` table | `GROUP BY status` |
| Open disputes | `open + in_review` | Computed |
| By dispute status | `service_disputes.status` | `GROUP BY status` |
| Oldest dispute age | `service_disputes.opened_at` | `ORDER BY opened_at ASC LIMIT 1` |
| Oldest pending verification | `service_provider_profiles.created_at` | `WHERE status IN ('submitted', 'under_review')` |

## Users

| Metric | Source | Query |
|--------|--------|-------|
| Total users | `users` table | `GROUP BY role` |
| By role | `users.role` | `GROUP BY role` |
| By status | `users.status` | `GROUP BY status` |
| Recent registrations | `users.created_at >= now - 30 days` | `COUNT(*)` |
| Suspended count | `users.status = 'suspended'` | From byStatus |
| Pending verification | `users.status = 'pending_verification'` | From byStatus |

## Office Integration

| Metric | Source | Query |
|--------|--------|-------|
| Total devices | `office_devices` table | `GROUP BY status` |
| Active devices | `office_devices.status = 'active'` | `GROUP BY status` |
| By device status | `office_devices.status` | `GROUP BY status` |
| Stale devices | `last_seen_at < now - 7 days` | `COUNT(*)` |
| Total syncs | `office_sync_operations` table | `GROUP BY status` |
| Successful syncs | `status = 'synced'` | `GROUP BY status` |
| By sync status | `office_sync_operations.status` | `GROUP BY status` |
| Failed syncs | `status = 'failed'` | From bySyncStatus |
| Conflict syncs | `status = 'conflict'` | From bySyncStatus |
| Dead-letter syncs | `status = 'dead_letter'` | From bySyncStatus |
| Pending pairings | `office_pairing_codes.status = 'pending'` | `COUNT(*)` |
| Notification deliveries | `office_notification_deliveries` table | `GROUP BY status` |

## Geographic Intelligence

| Metric | Source | Query |
|--------|--------|-------|
| Properties by city | `property_listings.city_id` | `GROUP BY city_id LIMIT 10` |
| Demand by city | `service_requests.city_id` | `GROUP BY city_id LIMIT 10` |
| Providers by city | `service_provider_profiles.city_id` | `WHERE status = 'approved'` |
| Coverage gaps | Computed | Cities with demand >= 2 and providers = 0 |

## System Health

| Metric | Source | Method |
|--------|--------|--------|
| Database | Runtime DB connection | Inferred from successful queries |
| Authentication | Users table | Inferred from user count |
| Realtime | Radar queries | Inferred from radar count |
| Office Integration | Devices table | Inferred from device count |
| Email | Not directly measurable | Always "degraded" (no probe) |
