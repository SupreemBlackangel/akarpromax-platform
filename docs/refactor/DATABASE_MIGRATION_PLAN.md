# DATABASE MIGRATION PLAN

## Goal
- Consolidate the production system onto **PostgreSQL + PostGIS only**.
- Migrate data from current legacy sources **without direct deletion** of MySQL or Cloudflare D1/SQLite until validation succeeds.
- Keep migration history and reconciliation evidence.
- Do not execute migration in this phase.

## Source Systems Compared

| Source | Current Role | Schema Shape | Main Findings |
| --- | --- | --- | --- |
| PostgreSQL | current auth authority | typed Drizzle PG schema in `lib/db/schema.ts` | only `users` exists; auth is incomplete compared to the rest of the platform |
| MySQL | runtime data fallback and operational content source | typed Drizzle MySQL schemas in `db/mysql/*.ts` | broadest typed schema coverage: auth-adjacent, sponsors, ads, news, i18n, services, office links |
| Cloudflare D1 / SQLite | dev/runtime content source | mixed typed SQLite schema + runtime bootstrap SQL | content and runtime tables are partially dynamic and not fully declared in one static schema source |

## Repeated Table Families Across Sources

### Present in MySQL and D1/SQLite families
- `roles`
- `users`
- `verification_challenges`
- `sessions`
- `policy_documents`
- `audit_logs`
- `sponsor_access`
- `sponsors`
- `sponsor_events`
- `ad_assets`
- `ad_campaigns`
- `ad_creatives`
- `ad_events`
- `sponsor_profiles`
- `sponsor_users`
- `sponsor_branches`
- `sponsor_plans`
- `sponsor_subscriptions`
- `sponsor_contracts`
- `sponsor_documents`
- `sponsor_payments`
- `sponsor_invoices`
- `sponsor_activity_logs`
- `office_links`

### Present in MySQL and D1 runtime bootstrap family
- i18n tables:
  - `i18n_namespaces`
  - `i18n_keys`
  - `i18n_translations`
  - `i18n_versions`
  - `i18n_change_log`
- service marketplace tables:
  - `service_categories`
  - `service_listings`
  - `service_requests`
  - `service_offers`
  - `service_orders`
  - `service_messages`
  - `service_reviews`
  - `service_disputes`
  - `service_bookmarks`
- ad analytics/runtime tables created by ad schema bootstrap:
  - `ad_impressions`
  - `ad_clicks`
  - `ad_conversions`
  - `ad_daily_statistics`

## Tables Present in One Source but Not Properly Modeled in Others

### PostgreSQL only today
- `users` in `lib/db/schema.ts`
- This table is currently the only typed PostgreSQL production-style schema.

### MySQL has explicit typed declarations that D1 handles more loosely
- `news`
- i18n tables are explicitly modeled in MySQL but runtime-created for D1
- service tables are explicitly modeled in MySQL but runtime-created for D1

### D1/SQLite-specific structural issue
- D1 runtime content parity depends on bootstrap SQL in:
  - `lib/runtime-db.ts`
  - `lib/i18n-schema.ts`
  - `lib/services-schema.ts`
  - `lib/ad-schema.ts`
- This means the actual D1 runtime schema is not represented in one canonical typed declaration.

## Data Type Differences

| Concern | PostgreSQL current | MySQL current | D1/SQLite current | Target direction |
| --- | --- | --- | --- | --- |
| Primary IDs | `uuid` in auth users | `varchar(36)` | `text` | normalize to UUID in PostgreSQL |
| Timestamps | `timestamp` | timestamp strings / DATETIME | text timestamps | normalize to `timestamptz` |
| Booleans | `boolean` | `boolean` or `int` flags | `integer` flags | normalize to `boolean` |
| Arrays / lists | not modeled yet | JSON-like strings in text/varchar | JSON-like strings in text | normalize to `jsonb` or join tables |
| Coordinates | mostly absent in PG current | `real`, `text`, split lat/lng | `real` or `text`, split lat/lng | normalize to PostGIS geometry/geography columns |
| Roles | `role` string in PG auth users | `roleId` and `sponsor_access.role` | `roleId` and `sponsor_access.role` | normalize to RBAC role keys and scope assignments |

## Key Naming Differences
- PostgreSQL auth table uses:
  - `name`
  - `passwordHash`
  - `isActive`
- MySQL/D1 app schemas use:
  - `fullName`
  - `passwordHash`
  - `status`
  - `roleId`
  - snake_case physical column names behind camelCase Drizzle mappings
- Sponsor/ad/runtime SQL tables use mixed conventions such as:
  - `country_code`
  - `city_id`
  - `created_at`
  - `updated_at`

## Relationship Differences
- Current PostgreSQL auth table is mostly isolated.
- MySQL and D1/SQLite store broad platform data but rely heavily on application-managed references instead of strict foreign keys.
- Sponsor domain is split across two overlapping models:
  - `sponsor_profiles` for organization/profile data
  - `sponsors` for sponsorship campaign/placement data
- Permissions are split across:
  - auth user role fields
  - `sponsor_access`
  - static frontend role catalogs
  - a separate minimal RBAC helper in `lib/rbac/permissions.ts`

## User and Permission Differences
- PostgreSQL current users:
  - `role`
  - `isActive`
- MySQL/D1 users:
  - `roleId`
  - `status`
  - verification timestamps
  - country/city fields
- Scoped access currently lives outside users in `sponsor_access`.
- Final target must separate:
  - identity profile
  - role assignment
  - scoped assignment
  - temporary restriction
  - audit trail

## Target PostgreSQL / PostGIS Schema Direction
- `identity.users`
- `identity.verification_challenges`
- `identity.sessions`
- `rbac.roles`
- `rbac.role_permissions`
- `rbac.user_roles`
- `rbac.scope_assignments`
- `rbac.temporary_restrictions`
- `legal.policy_documents`
- `audit.logs`
- `organizations.organizations`
- `organizations.sponsorships`
- `organizations.members`
- `organizations.branches`
- `billing.subscription_plans`
- `billing.subscriptions`
- `billing.contracts`
- `billing.documents`
- `billing.payments`
- `billing.invoices`
- `audit.organization_activity_logs`
- `ads.assets`
- `ads.campaigns`
- `ads.creatives`
- `ads.events`
- `ads.impressions`
- `ads.clicks`
- `ads.conversions`
- `ads.daily_statistics`
- `content.news`
- `content.i18n_namespaces`
- `content.i18n_keys`
- `content.i18n_translations`
- `content.i18n_versions`
- `content.i18n_change_log`
- `marketplace.service_categories`
- `marketplace.service_listings`
- `marketplace.service_requests`
- `marketplace.service_offers`
- `marketplace.service_orders`
- `marketplace.service_messages`
- `marketplace.service_reviews`
- `marketplace.service_disputes`
- `marketplace.service_bookmarks`
- `offices.office_links`

## PostGIS-Specific Normalization Rules
- `lat/lng`, `latitude/longitude` pairs are converted into a canonical `geometry(Point, 4326)` or `geography(Point, 4326)` field.
- Keep raw imported numeric/text latitude/longitude in staging during migration.
- Ad geofencing fields (`latitude`, `longitude`, `radius_km`) become normalized geo-targeting fields in PostgreSQL.
- Branches and marketplace entities with invalid coordinates are migrated without geometry and flagged for review.

## Migration Sequence
1. Design final PostgreSQL/PostGIS schema and staging schema.
2. Extract data from PostgreSQL current auth, MySQL, and D1/SQLite snapshots.
3. Load raw extracts into staging tables without transformation loss.
4. Build legacy-to-target ID map tables.
5. Normalize identity and RBAC first.
6. Normalize organizations/sponsorships and billing domain second.
7. Normalize ads/content/services/office data third.
8. Validate counts, nullability expectations, referential integrity, and sampling.
9. Cut reads and writes to PostgreSQL only after sign-off.
10. Retire legacy sources only after post-cutover verification succeeds.

## Mapping Table

| Source database | Source table | Source column | Target table | Target column | Transformation | Nullable | Conflict rule | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PostgreSQL current | `users` | `id,email,phone,name,passwordHash,role,isActive,createdAt` | `identity.users` + `rbac.user_roles` | `id,email,phone,full_name,password_hash,status,created_at,role_key` | rename `name -> full_name`; derive `status` from `isActive`; move `role` into RBAC assignment | mixed | if email exists in MySQL/D1 copy, PostgreSQL password hash wins; metadata merged by freshness rule | user count by email/phone, sample login verification |
| MySQL + D1/SQLite | `users` | `id,email,phone,passwordHash,fullName,roleId,status,countryCode,city,emailVerifiedAt,phoneVerifiedAt,lastLoginAt,createdAt,updatedAt` | `identity.users` + `rbac.user_roles` | `legacy_source_id,email,phone,password_hash,full_name,status,country_code,city,email_verified_at,phone_verified_at,last_login_at,created_at,updated_at,role_key` | normalize email/phone casing; map `roleId` to final RBAC role; preserve verification and location metadata | mixed | match to existing canonical user by email first, then phone; unresolved collisions go to reconciliation queue | row counts, duplicate-email review, verified-state spot checks |
| MySQL + D1/SQLite | `verification_challenges` | `*` | `identity.verification_challenges` | `*` | migrate only active unconsumed rows; archive expired/consumed rows separately | mixed | active challenge per user+purpose must remain unique | count active challenges before/after; verify expiry windows |
| MySQL + D1/SQLite | `sessions` | `*` | `identity.sessions_archive` | `legacy_session_*` | do not migrate as active sessions; archive only and force re-login at cutover | yes | no direct active-session import | zero active legacy sessions after cutover |
| MySQL + D1/SQLite | `roles` | `id,nameAr,nameEn,permissions` | `rbac.roles` + `rbac.role_permissions` | `role_key,name_ar,name_en,permissions` | normalize role keys; explode permission arrays into relation rows if needed | no | target role catalog wins if key already exists; legacy permissions diff logged | role count, permission diff report |
| MySQL + D1/SQLite | `sponsor_access` | `email,displayName,role,countryCode,status` | `rbac.scope_assignments` | `principal_user_id,scope_type,scope_id,role_key,status,display_name_snapshot` | resolve email to canonical user; map sponsor scope to organization/country scope assignment | mixed | rows with unmatched users remain staged for manual resolution | matched-user ratio, scoped-role sample checks |
| MySQL + D1/SQLite | `sponsor_profiles` | `id,sponsorCode,companyNameAr,companyNameEn,logoUrl,coverUrl,commercialRegistration,taxNumber,countryCode,cityId,districtId,governorate,village,street,addressAr,addressEn,contactName,email,phone,website,status,verifiedAt,approvedAt,suspendedAt,createdBy,createdAt,updatedAt` | `organizations.organizations` | `id,organization_code,name_ar,name_en,logo_url,cover_url,registration_no,tax_no,country_code,city_id,district_id,governorate,village,street,address_ar,address_en,contact_name,email,phone,website,status,verified_at,approved_at,suspended_at,created_by,created_at,updated_at` | mostly rename and normalize field names; preserve timestamps and external references | mixed | `sponsor_profiles` is canonical org profile source; collisions resolved by `organization_code`, then email | organization count, country/status distribution, sample profile QA |
| MySQL + D1/SQLite | `sponsors` | `id,countryCode,nameAr,nameEn,nameTr,tier,status,websiteUrl,logoUrl,bannerUrl,contactName,contactEmail,contactPhone,placements,startAt,endAt,priority,createdBy,createdAt,updatedAt` | `organizations.sponsorships` | `id,organization_id,country_code,name_ar,name_en,name_tr,tier,status,website_url,logo_url,banner_url,placements,start_at,end_at,priority,created_by,created_at,updated_at` | convert placements JSON-text to `jsonb`; link to organization profile by normalized country+name/email matching or explicit mapping table | mixed | unresolved sponsor-to-organization links staged for manual review | sponsorship count, unresolved-link report |
| MySQL + D1/SQLite | `sponsor_users` | `*` | `organizations.members` | `*` | resolve sponsor/org link and canonical user ID; normalize role/status | mixed | unmatched user or organization rows staged | member count per organization |
| MySQL + D1/SQLite | `sponsor_branches` | `id,sponsorId,nameAr,nameEn,countryCode,cityId,districtId,governorate,village,street,addressAr,addressEn,phone,email,lat,lng,status,createdAt,updatedAt` | `organizations.branches` | `id,organization_id,name_ar,name_en,country_code,city_id,district_id,governorate,village,street,address_ar,address_en,phone,email,geom,status,created_at,updated_at` | parse `lat/lng`; build PostGIS point when valid; keep raw coordinates in staging | mixed | invalid geo rows migrate without geometry and are flagged | branch count, geometry-valid ratio |
| MySQL + D1/SQLite | `sponsor_plans` | `*` | `billing.subscription_plans` | `*` | normalize money fields, booleans, and feature arrays | mixed | `code` must remain unique; duplicates resolved by most recent active plan policy | plan count, unique code report |
| MySQL + D1/SQLite | `sponsor_subscriptions` | `*` | `billing.subscriptions` | `*` | link to normalized organization and plan IDs; normalize status enum | mixed | subscriptions with missing plan/org stay staged | active subscription counts by status |
| MySQL + D1/SQLite | `sponsor_contracts` | `*` | `billing.contracts` | `*` | preserve contract metadata and organization link | mixed | duplicate contract references deduped by organization+reference+date | contract count and reference uniqueness report |
| MySQL + D1/SQLite | `sponsor_documents` | `*` | `billing.documents` | `*` | preserve file metadata and organization/subscription linkage where possible | mixed | unresolved parent references staged | document count by organization |
| MySQL + D1/SQLite | `sponsor_payments` | `*` | `billing.payments` | `*` | normalize amount/currency/status and link to subscriptions/invoices | mixed | duplicate payment provider refs deduped by external reference | payment totals and count reconciliation |
| MySQL + D1/SQLite | `sponsor_invoices` | `*` | `billing.invoices` | `*` | normalize money/status fields and invoice relationships | mixed | invoice number collisions resolved by organization+issue date policy | invoice count and total reconciliation |
| MySQL + D1/SQLite | `sponsor_events` | `*` | `organizations.sponsorship_events` | `*` | preserve placement/event-type analytics tied to sponsorship or organization | mixed | events with unresolved sponsorship link attach to staging reference only | event count by type and country |
| MySQL + D1/SQLite | `sponsor_activity_logs` | `*` | `audit.organization_activity_logs` | `*` | preserve actor/action/entity metadata; normalize timestamps | mixed | orphan actor IDs kept nullable but source ID retained | activity count and date-range reconciliation |
| MySQL + D1/SQLite | `ad_assets` | `*` | `ads.assets` | `*` | mostly direct rename/normalize | mixed | `object_key` uniqueness must be preserved | asset count and key uniqueness report |
| MySQL + D1/SQLite | `ad_campaigns` | `*` including `countries,cities,languages,devices,placements,pageTypes,sectionScopes,latitude,longitude,radiusKm` | `ads.campaigns` | normalized scalar columns + `jsonb` targeting fields + `target_geom` + `radius_meters` | convert JSON-like text arrays to `jsonb`; convert geo targeting to PostGIS-compatible shape; normalize booleans and budgets | mixed | campaign ID preserved; invalid targeting payloads staged for repair | campaign count by status/type + geo-target validity report |
| MySQL + D1/SQLite | `ad_creatives` | `*` | `ads.creatives` | `*` | preserve campaign linkage, positions, durations, media metadata | mixed | missing parent campaigns block final load | creative count per campaign |
| MySQL + D1/SQLite | `ad_events` | `*` | `ads.events` | `*` | preserve summary event feed with normalized enums | mixed | unresolved campaign links staged | event count by campaign/event type |
| MySQL + D1 runtime / bootstrap | `ad_impressions,ad_clicks,ad_conversions,ad_daily_statistics` | `*` | `ads.impressions`, `ads.clicks`, `ads.conversions`, `ads.daily_statistics` | `*` | preserve analytics facts; normalize geo/user/session fields; convert dates/timestamps | mixed | keep fact tables append-only; duplicates resolved by natural-event keys where available | totals by campaign/day before and after |
| MySQL runtime + D1 runtime | `news` | `*` | `content.news` | `*` | normalize scope fields and active window timestamps | mixed | duplicate news items resolved by source ID and updated timestamp | news count by scope/status |
| MySQL + D1 runtime | `i18n_namespaces,i18n_keys,i18n_translations,i18n_versions,i18n_change_log` | `*` | `content.i18n_*` | `*` | preserve namespace/key identity; normalize versioning; convert statuses to canonical enums | mixed | `namespace+key` uniqueness enforced; conflicting values require latest-published rule | namespace count, key count, locale completeness report |
| MySQL + D1 runtime | `service_categories,service_listings,service_requests,service_offers,service_orders,service_messages,service_reviews,service_disputes,service_bookmarks` | `*` | `marketplace.*` | `*` + `geom` for listing/request locations | convert location fields to PostGIS where available; normalize status enums and participant links | mixed | unresolved user links staged; invalid geo rows migrate without geometry | counts by table/status plus geo-valid ratio |
| MySQL + D1/SQLite | `office_links` | `*` | `offices.office_links` | `*` | preserve organization/user linkage and status metadata | mixed | unresolved user/office links staged | office-link count by status |
| MySQL + D1/SQLite | `policy_documents` | `*` | `legal.policy_documents` | `*` | preserve scope/type/version semantics | mixed | `scope+type+version` uniqueness enforced | policy count and active version validation |
| MySQL + D1/SQLite | `audit_logs` | `*` | `audit.logs` | `*` | normalize timestamps and metadata payload to `jsonb` | mixed | orphan actor IDs allowed but source IDs preserved | audit count and date-range reconciliation |

## Validation Rules
- Validate every table by record count before and after transform.
- Validate every critical business domain by aggregate values, not count alone:
  - users by status
  - sponsorships by country/status
  - campaigns by type/status
  - payments/invoices by totals
  - news by scope/status
  - marketplace rows by status
- Run sampled entity-level QA on at least:
  - 25 users
  - 25 organizations
  - 25 campaigns
  - 25 service records
- Produce unresolved-conflict queues instead of silently dropping rows.

## Explicit Non-Goals For This Phase
- No migration execution now
- No schema deletion now
- No data cleanup by assumption now
- No forced denormalization decisions without validation evidence
