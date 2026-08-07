================================================================================
AKARPROMAX CONNECTED ECOSYSTEM — EXECUTION PLAN
================================================================================

Baseline commit: 5064183 (Phase 4 committed - branch refactor/architecture-foundation)
Current branch: refactor/architecture-foundation
Worktree status: Clean, all 118 tests passing, build successful

Existing Office integration:
- office_links table (id, sponsor_id, office_id, device_id, license_key, application_version, last_sync_at, last_ip, status, activated_at, revoked_at)
- /api/office-links CRUD with license_key-based registration
- OFFICE_LINK / OFFICE_UNLINK permissions
- No pairing flow, no device credentials, no token rotation

Existing realtime infrastructure:
- NONE (no WebSocket, no SSE, no EventSource)
- service_notifications table exists (in-app only for services marketplace)
- Polling-based notification fetching in dashboard

Existing notification system:
- service_notifications (scoped to services marketplace, user_id + email based)
- No multi-channel delivery (no email, no office desktop, no push)
- No deduplication, no quiet hours, no priority system
- No centralized NotificationService - each feature writes directly

Existing geo/PostGIS infrastructure:
- D1 (SQLite) primary, MySQL fallback
- NO PostGIS - all geo matching via Haversine in JS (match-score.ts, ads/geo.ts)
- service_request_matches table stores precomputed matches
- Ads engine has radius_km, latitude, longitude targeting

Existing property sync:
- NONE - no property push/pull from desktop
- property_listings table exists (public marketplace only)
- No externalId/syncVersion/officeId fields

Existing news delivery:
- news table with scope (global/country/city), targeting by country/city
- /api/news public + admin CRUD
- No delivery to office desktop clients

Existing ads delivery:
- ad_campaigns with geo targeting (country, city, radius_km, lat/lng)
- Sophisticated matching engine (lib/ads/engine.ts)
- No office-specific placements or delivery tracking

Files to inspect:
- lib/runtime-db.ts, lib/db/schema.ts, lib/db/index.ts
- lib/sponsor-auth.ts, lib/auth/session.ts, lib/auth/identity-map.ts
- lib/services/marketplace.ts, lib/services/matching.ts, lib/services/match-score.ts
- lib/ads/engine.ts, lib/ads/geo.ts, lib/ads/events.ts
- app/api/office-links/route.ts, app/api/news/route.ts, app/api/service-notifications/*
- app/dashboard/services/*, app/admin/services/*
- src/constants/permissions.ts, src/constants/roles.ts

Files to modify:
- lib/runtime-db.ts (add office integration schema)
- lib/sponsor-auth.ts (add device authentication)
- app/api/office-links/route.ts (add pairing, device auth endpoints)
- src/constants/permissions.ts (add office integration permissions)
- src/constants/roles.ts (verify service_supervisor/sponsor_admin scopes)
- app/dashboard/services/* (add device management, radar settings, sync monitoring)

Files to create:
- lib/office/device.ts (device registration, pairing, credentials)
- lib/office/auth.ts (device token management, scopes, rotation)
- lib/office/sync.ts (property push/pull, conflict detection, idempotency)
- lib/office/radar.ts (shared geo radar for properties + services)
- lib/notification/engine.ts (centralized notification service)
- lib/notification/channels.ts (in-app, email, office desktop delivery)
- lib/realtime/sse.ts (SSE endpoint for realtime delivery)
- app/api/office/pairing/* (pairing flow endpoints)
- app/api/office/token/* (device token refresh)
- app/api/office/sync/* (property sync endpoints)
- app/api/office/radar/* (radar events for office)
- app/api/office/notifications/* (office notification delivery)
- app/api/realtime/sse/* (SSE connection)
- app/dashboard/services/integration/* (office devices, radar settings, sync)
- app/admin/integrations/* (integration monitoring center)
- docs/integrations/* (12 documentation files)

Dependencies proposed:
- NONE - all within existing stack (D1/SQLite, Next.js, Vinext)
- PostGIS NOT required - use existing Haversine + spatial indexes in SQLite

Dependencies rejected:
- WebSocket libraries (use SSE instead - simpler, works over HTTP/2)
- Push notification providers (out of scope)
- External sync frameworks (build lightweight custom engine)

Office device model:
- OfficeDevice: id, sponsor_id, office_id, device_id, device_name, device_type, platform, app_version, installation_id, public_key, status (PENDING/ACTIVE/SUSPENDED/REVOKED/OFFLINE), last_seen_at, last_sync_at, registered_at, revoked_at, metadata
- PairingCode: id, sponsor_id, code, expires_at, used_at, device_id (nullable)
- DeviceCredential: device_id, access_token_hash, refresh_token_hash, scopes, expires_at, rotated_at

Pairing strategy:
1. Admin/user generates pairing code in workspace (short-lived, 5 min, one-time)
2. Desktop enters code → POST /api/office/pairing/complete
3. Server validates code, checks sponsor permissions, creates OfficeDevice + DeviceCredential
4. Returns device_id + access_token + refresh_token
5. Pairing code invalidated, audit logged

Device authentication strategy:
- Short-lived access tokens (15 min) + refresh tokens (30 days)
- Token rotation on refresh (invalidate old refresh token)
- Scopes: office.news.read, office.ads.read, office.properties.read, office.properties.write, office.notifications.read, office.radar.read, office.sync
- Revocation via device status = REVOKED + token blacklist (short TTL)
- TLS mandatory (enforced by Cloudflare)

Protocol versioning strategy:
- /api/office/v1/ prefix
- Version in Accept header: application/vnd.akarpromax.office.v1+json
- Device sends app_version + protocol_version in headers
- Server responds with min_supported_version, current_version
- Status: SUPPORTED / UPDATE_RECOMMENDED / UPDATE_REQUIRED / BLOCKED

Property sync strategy:
- Push: Desktop POST /api/office/v1/sync/properties with batch (idempotency_key per property)
- Pull: Desktop GET /api/office/v1/sync/properties?since=timestamp
- Fields: externalId (office reference), serverId, syncVersion, updatedAt
- Private fields stripped: owner_name, owner_id, national_id, title_deed, private_notes, internal_comments, sensitive_documents
- Conflict detection: compare syncVersion + updatedAt
- Resolution: server-wins for non-overlapping fields, conflict response for overlapping

Idempotency strategy:
- Idempotency-Key header required for all mutating sync operations
- Key format: {deviceId}:{entityType}:{externalId}:{operation}
- Store in sync_idempotency_keys table (key, device_id, entity_type, entity_id, created_at)
- 24-hour TTL, automatic cleanup

Conflict resolution strategy:
- Three-way merge for non-overlapping fields
- Conflict response includes: server_version, client_version, changed_fields, resolution_options
- Desktop decides: accept_server, force_client, manual_merge
- Audit log for all conflicts

Offline/retry strategy:
- SyncQueue table: id, device_id, entity_type, entity_id, external_id, operation, payload, status (QUEUED/SENDING/SYNCED/FAILED/CONFLICT/RETRYING), attempts, last_attempt_at, error, idempotency_key
- Exponential backoff: 1m, 2m, 4m, 8m, 16m, 30m (max 30m)
- Max 10 attempts before DEAD_LETTER
- Heartbeat updates last_seen_at (60-300s interval)

Geo radar strategy:
- REUSE existing match-score.ts computeMatchScore + matching.ts runMatching
- EXTEND to support property listings (not just service requests)
- Unified GeoRadarService with match strategies: PROPERTY_RADAR, SERVICE_RADAR
- Spatial indexes on latitude/longitude + city_id + category_id
- Privacy: radar runs server-side, only district/city names in notifications (no exact coordinates)
- Batch processing for performance (max 500 providers per run)

Property radar strategy:
- Trigger: PROPERTY_PUBLISHED event (new active property_listing)
- Match: offices with property radar enabled, matching property_type, transaction_type, within radius
- Notify: office devices via notification channel

Services radar strategy:
- REUSE existing runMatching for service_requests
- Already implemented in lib/services/matching.ts
- Extend notification to office devices (not just providers)

Spatial indexing strategy:
- SQLite: composite indexes on (latitude, longitude, city_id, property_type, status)
- MySQL: same + SPATIAL INDEX if available
- Consider rtree module for SQLite if performance requires

Notification architecture:
- Centralized NotificationService (lib/notification/engine.ts)
- Event → Rules → AudienceResolver → NotificationRecord → DeliveryChannels
- Channels: InApp, Email, OfficeDesktop (SSE + polling fallback)
- Deduplication: eventId + recipientId + channel unique key
- Priority: LOW/NORMAL/HIGH/URGENT (URGENT only for security/critical)
- Quiet hours: per user/office (default 22:00-07:00), non-URGENT delayed
- Retention: 90 days, then archive

Realtime transport choice:
- Server-Sent Events (SSE) - NOT WebSocket
- Reason: Works over HTTP/2, auto-reconnect, simpler on Cloudflare Workers, no sticky sessions needed
- Endpoint: /api/realtime/sse?lastEventId={cursor}
- Events: notification.created, property.updated, sync.status.changed, radar.match
- Client fetches full data via API after event (no full row over SSE)

Reconnect strategy:
- EventSource native reconnect + lastEventId
- Server stores last 1000 events in memory (per instance) + persistent in notification_events table
- On reconnect, fetch missed events since lastEventId
- Exponential backoff for connection failures

News delivery:
- On NEWS_PUBLISHED (status=active), resolve audience by scope
- Create notifications for matching office devices
- Deliver via OfficeDesktop channel (SSE + in-app)
- OfficeDesktop payload: title, summary, image, published_at, link, priority, locale

Ads delivery:
- Define office placements: OFFICE_DASHBOARD_HERO, OFFICE_DASHBOARD_SIDEBAR, OFFICE_NEWS_INLINE, OFFICE_PROPERTIES_INLINE, OFFICE_SERVICES_INLINE
- Reuse ad_campaigns with office_types targeting
- Match via existing ad engine with office device context
- Track impression/viewability/click with deviceId, officeId, placementId
- Deduplicate impressions per session

Office workspace UI:
- /dashboard/services/integration (devices, radar, sync tabs)
- Device management: list, pair new, rename, revoke, view last_seen, version, sync status
- Radar settings: enable property/services radar, types, cities, radius, quiet hours
- Sync monitoring: last sync, pending, errors, conflict count, retry queue
- Notification inbox: unified (web + office), read/unread, priority, actions

Admin integration UI:
- /admin/integrations (overview, devices, sync, radar, notifications, health)
- Overview: connected devices, online/offline, sync ops today, failed, conflicts, radar matches, notification delivery
- Sync monitoring: table with filters (syncId, office, device, entity, operation, status, attempts, error)
- Dead letter: retry, inspect sanitized error, mark resolved, cancel
- Health: device heartbeat age, API error rates, sync latency, radar query duration

RBAC/scopes:
- Permissions: OFFICE_DEVICES_MANAGE, OFFICE_RADAR_CONFIGURE, OFFICE_SYNC_MONITOR, OFFICE_INTEGRATION_ADMIN
- Roles: service_supervisor (service radar only), sponsor_admin (full), super_admin (full)
- Device scopes: office.news.read, office.ads.read, office.properties.read, office.properties.write, office.notifications.read, office.radar.read, office.sync

Security strategy:
- TLS enforced (Cloudflare)
- No master API key, no secrets in client
- Device credentials rotated, revocable
- Rate limiting on pairing, token refresh, sync endpoints
- Input validation (Zod) on all API
- Output DTO filtering (no private fields)
- Audit logging for all device/sync/radar events
- Multi-tenant isolation: office A cannot access office B devices/sync/radar

Privacy strategy:
- Radar: server-side only, notifications show district/city only
- Property sync: private owner fields stripped before public API
- Device tracking: IP summary only (no precise geo), last_seen only
- Notification content: no sensitive data in push/desktop payload

Observability strategy:
- Structured logs: sync_duration, sync_failure_rate, realtime_connections, notification_delivery_latency, radar_query_duration, radar_match_count, office_api_error_rate, device_heartbeat_age
- Metrics via existing audit_logs + new integration_metrics table
- No new monitoring platform

Seed strategy:
- Offices: "Jeddah Office Alpha", "Jeddah Office North", "Makkah Survey Office", "Riyadh Property Office", "Dammam Services Office"
- Devices: OFFICE-PC-001, OFFICE-PC-002, OFFICE-LAPTOP-001 (various versions, statuses)
- Radar test sites: Jeddah, Makkah, Riyadh, Dammam, Madinah (inside/outside radius, wrong category, disabled)
- Notifications: unread, read, expired, high priority, desktop delivered/failed, email delivered
- Sync: successful, retryable failure, conflict, duplicate idempotency, offline retry, dead letter
- Production protection: NODE_ENV !== 'production' check, idempotent, cleanup command

Database impact:
- NEW tables: office_devices, pairing_codes, device_credentials, sync_queue, sync_idempotency_keys, notification_rules, notification_deliveries, realtime_events, integration_metrics
- EXTEND: office_links (add device_id FK, public_key, app_version, protocol_version)
- EXTEND: property_listings (add external_id, office_id, sync_version, last_synced_at)
- EXTEND: news (add office_delivery_status JSON)
- EXTEND: ad_campaigns (add office_placements JSON)

Migration impact:
- Additive only - no breaking changes
- Office links migration: populate device_id from new office_devices
- Property listings: external_id nullable, backfill from office imports

API impact:
- NEW: /api/office/v1/pairing/start, /api/office/v1/pairing/complete
- NEW: /api/office/v1/token/refresh, /api/office/v1/device/heartbeat
- NEW: /api/office/v1/sync/properties (POST push, GET pull)
- NEW: /api/office/v1/radar/events (GET nearby properties/services)
- NEW: /api/office/v1/notifications (GET, POST read)
- NEW: /api/realtime/sse (SSE connection)
- EXTEND: /api/office-links (add pairing, device management)
- DEPRECATE: None (coexist)

Desktop protocol impact:
- Desktop must implement: pairing flow, token storage/rotation, SSE client, sync queue with retry, heartbeat
- Minimum protocol version: 1.0
- Update check on startup + periodic

Testing plan:
- Unit: pairing flow, token rotation, idempotency, conflict detection, radar matching, notification deduplication, quiet hours
- Integration: device registration → sync → radar → notification → realtime
- Security: revoked device denied, expired token denied, wrong scope denied, cross-office isolation
- Geo: nearby matches, outside radius excluded, wrong category excluded, disabled office excluded
- Realtime: connect, reconnect, lastEventId resume, missed event recovery
- RBAC: service_supervisor limited to service radar, sponsor_admin full, viewer denied
- Performance: radar query < 100ms for 1000 providers, sync batch < 500ms for 50 properties

Performance plan:
- Radar: composite indexes, batch matching (500 max), cache provider locations 60s
- Sync: batch upsert (50 per transaction), async conflict resolution
- Notifications: async delivery, deduplication at write
- SSE: connection pooling, event buffer per instance

Rollback plan:
- Git revert to 5064183
- DB: DROP new tables, ALTER office_links/property_listings DROP new columns
- No data migration to rollback (additive only)
- Seed cleanup: DELETE FROM office_* WHERE email LIKE '%@localhost.akarpromax'

Out-of-scope:
- Mobile app (iOS/Android) push notifications
- WhatsApp/SMS notification providers
- WebSocket-based realtime (SSE chosen)
- PostGIS migration (D1/SQLite + Haversine sufficient)
- Advanced ML matching (rule-based only)
- Desktop app implementation (API only)
- Multi-region deployment automation
- Copying reference project code
================================================================================