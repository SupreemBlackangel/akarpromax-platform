# Admin Operations Inventory — Phase 7 Audit

**Commit**: 72d6d24 | **Date**: 2026-08-08 | **Branch**: refactor/architecture-foundation

## 1. Existing Admin Pages

| Route | Component | Data Source | KPIs |
|-------|-----------|------------|------|
| `/admin` | `dashboard-admin-client.tsx` | `/api/admin/stats` | Active sponsors, active campaigns, sponsor users, platform members, sponsor impressions/clicks, ad impressions/clicks, by-status bars, by-role bars, top countries, audit log |
| `/admin/users` | `users-admin-client.tsx` | — | User list |
| `/admin/roles` | `roles-admin-client.tsx` | — | Roles/permissions |
| `/admin/services` | `admin-client.tsx` | — | Service marketplace management |
| `/admin/sponsors` | `sponsor-admin-client.tsx` | — | Sponsor CRUD |
| `/admin/news` | `news-admin-client.tsx` | — | News CRUD |
| `/admin/i18n` | `i18n-admin-client.tsx` | — | i18n management |
| `/admin/ads` | `ads-admin-client.tsx` | — | Ad campaign management |
| `/admin/reports` | `reports-admin-client.tsx` | `/api/admin/analytics` | 14-day timeline, top sponsors, top campaigns |
| `/admin/settings` | `settings-admin-client.tsx` | `/api/sponsor-plans` | Sponsor plans CRUD |
| `/admin/integration` | `admin-integration-client.tsx` | `/api/admin/integration-overview` | Office devices, syncs, radar, deliveries, rules |

## 2. Existing API Routes

| Endpoint | Handler | RBAC | Returns |
|----------|---------|------|---------|
| `GET /api/admin/stats` | `admin/stats/route.ts` | `ADMIN_DASHBOARD_VIEW` or `REPORTS_VIEW` | Sponsors by status/country, campaigns by status/type, access by role, users by status, events (impressions/clicks), audit log, plans count |
| `GET /api/admin/analytics` | `admin/analytics/route.ts` | `REPORTS_VIEW` | 14-day daily timeline, top sponsors, top campaigns |
| `GET /api/admin/integration-overview` | `admin/integration-overview/route.ts` | — | Devices, syncs, radars, deliveries, rules |
| `GET /api/health` | `health/route.ts` | Public | Schema status, readiness |
| `GET /api/health/ready` | `health/ready/route.ts` | Public | Ready/not_ready |
| `GET /api/health/live` | `health/live/route.ts` | Public | Liveness |
| `GET /api/service-dashboard/counts` | `service-dashboard/counts/route.ts` | — | Service dashboard counts |

## 3. Database Tables (Available for Metrics)

### Auth/Core
- `users` — id, email, role, status, is_active, last_login_at, created_at
- `audit_events` — id, user_id, event_type, ip_address, created_at
- `audit_logs` — id, actor_user_id, action, entity_type, entity_id, created_at

### Sponsors
- `sponsors` — id, country_code, status, name_ar, priority, start_at, end_at
- `sponsor_events` — id, sponsor_id, country_code, placement, event_type, occurred_at
- `sponsor_access` — id, email, role, country_code, status
- `sponsor_profiles` — id, sponsor_code, status, country_code
- `sponsor_users` — id, sponsor_id, role, status
- `sponsor_branches` — id, sponsor_id, country_code, city_id, status
- `sponsor_plans` — id, code, price_monthly, is_active
- `sponsor_subscriptions` — id, sponsor_id, plan_id, status, start_date, end_date
- `sponsor_contracts` — id, sponsor_id, status, value
- `sponsor_payments` — id, sponsor_id, amount, status
- `sponsor_invoices` — id, sponsor_id, total_amount, status
- `sponsor_activity_logs` — id, sponsor_id, action, entity_type, created_at

### Ads
- `ad_campaigns` — id, status, campaign_type, approval_status, total_impressions, total_clicks
- `ad_events` — id, campaign_id, event_type, country_code, occurred_at
- `ad_impressions` — id, campaign_id, country_code, city_id, tracked_at
- `ad_clicks` — id, campaign_id, country_code, city_id, clicked_at
- `ad_daily_statistics` — campaign_id, stat_date, impressions, clicks, conversions

### News
- `news` — id, scope, country_code, status, priority

### Services Marketplace
- `service_categories` — id, country_code, code, is_active
- `service_listings` — id, category_id, country_code, city_id, status, price
- `service_requests` — id, category_id, country_code, city_id, status, budget_min, budget_max
- `service_offers` — id, request_id, provider_user_id, price, status
- `service_orders` — id, request_id, customer_user_id, provider_user_id, price, status
- `service_reviews` — id, order_id, rating
- `service_disputes` — id, order_id, status
- `service_provider_profiles` — id, user_id, status, country_code, rating_avg, jobs_completed
- `service_notifications` — id, user_id, type, is_read, created_at

### Properties
- `property_listings` — id, status, listing_type, property_type, country_code, city_id, price

### Integration
- `office_devices` — id, sponsor_id, status, last_seen_at
- `office_sync_operations` — id, device_id, operation_type, status, attempts
- `office_radar_queries` — id, device_id, latitude, longitude, matched_count
- `office_notification_deliveries` — id, event_type, status, delivered_at
- `office_notification_rules` — id, event_type, channel, enabled

## 4. RBAC Roles

| Role | Key Permissions |
|------|----------------|
| `super_admin` | ALL permissions |
| `sponsor_manager` | Full sponsor CRUD, contracts, payments |
| `sponsor_admin` | Sponsor view, ads analytics, reports |
| `country_manager` | Country-scoped sponsor/ad/news management |
| `service_supervisor` | Service categories, providers, requests, offers, reports |
| `ad_manager` | Ad campaign CRUD, analytics |
| `ads_reviewer` | Ad approval |
| `content_editor` | Sponsor/ad/news content CRUD |
| `analyst` | View-only: sponsors, ads, reports |
| `service_provider` | Own requests/offers/jobs |
| `viewer` | Tools use only |

## 5. Gap Analysis — What Command Center Needs

| Gap | Current State | Phase 7 Target |
|-----|--------------|----------------|
| Unified overview | Split across `/api/admin/stats` + `/api/admin/analytics` | Single `/api/admin/command-center/overview` with all metrics |
| Properties metrics | None | Count, by status, by type, by country |
| Service marketplace metrics | Partial (`/api/service-dashboard/counts`) | Requests, offers, orders, providers, disputes — by status |
| Office integration metrics | Basic list in integration page | Device count, sync success rate, radar queries, delivery rate |
| Notification metrics | None | Unread count, by type, delivery rate |
| System health | 3 separate health endpoints | Unified health panel with DB status, schema version, uptime |
| Geo-heat data | None in admin | Country-level aggregation across sponsors, ads, properties |
| Shared filters | None | Date range, country, role filters shared across widgets |
| Drill-down | None | Click metric → filtered detail view |
| Real-time refresh | None (manual page load) | Periodic refresh with interval selector |
