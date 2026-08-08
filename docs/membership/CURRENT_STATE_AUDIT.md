# CURRENT STATE AUDIT

## 1. Existing User Model

### PostgreSQL (lib/db/schema.ts:3-25)
- id (uuid PK), email (varchar unique), emailVerifiedAt, phone (varchar unique), phoneVerifiedAt, name (varchar), passwordHash, role (varchar default "user"), status (varchar default "pending_verification"), isActive (boolean), onboardingCompletedAt, welcomeSentAt, lastLoginAt, passwordChangedAt, preferredLanguage (default "ar"), pendingEmail (unique), createdAt

### MySQL (db/mysql/schema.ts:11-34)
- id (varchar PK), email (unique), phone (unique), passwordHash, fullName (NOT name), roleId (FK not inline), status, countryCode, city, emailVerifiedAt, phoneVerifiedAt, lastLoginAt, createdAt, updatedAt

**Key difference:** MySQL uses `fullName` vs PG `name`, `roleId` vs `role`, adds `countryCode`/`city`, lacks `isActive`/`onboardingCompletedAt`/`preferredLanguage`/`pendingEmail`.

## 2. Existing Roles

12 roles in `src/constants/roles.ts`: guest, viewer, analyst, content_editor, service_provider, service_supervisor, country_manager, ad_manager, ads_reviewer, sponsor_admin, sponsor_manager, super_admin

## 3. Existing Permissions

88 permissions in `src/constants/permissions.ts` across 17 groups: admin, sponsors, ads, media, news, users, roles, properties, office, services, service_categories, service_providers, service_requests, service_offers, service_jobs, service_reports, service_notifications, service_ads, tools, i18n, reports, settings

## 4. Existing Auth

- JWT HS256 session cookie (akar_session, 7-day expiry)
- Registration → email verification token → activate account
- Login → email/phone + password → JWT
- Forgot password → reset token → new password
- Change email → OTP verification
- Change password → requires current password
- Session revocation via in-memory JTI blacklist (not persistent)
- Access control: account status checks, role assignment bans, password policy (min 8, max 128)

## 5. Existing Registration

- Email OR phone + password
- Role forced to "user" via sanitizeRegistrationRole()
- Status: "pending_verification"
- Email verification token sent
- No profile creation at registration
- No organization/office linkage

## 6. Existing User Profiles

**No dedicated user profile table.** The users table IS the profile. Related entities:
- sponsor_profiles: company profile for sponsors (company_name, commercial_registration, etc.)
- service_provider_profiles: service provider business profile (bio, logo, ratings, licenses)

## 7. Existing Provider Profiles

service_provider_profiles table: user_id (unique), display_name_ar/en, bio_ar/en, logo/cover, contact info, country/city/district, lat/lng, service_radius_km, status (draft→submitted→under_review→approved/rejected/suspended), verified_at, approved_at, rating_avg/count, jobs_completed, completion_rate, response_rate, avg_response_time_min, licenses/insurance_text, founded_year, team_size, is_business, business_name, tax_number, commercial_registration

## 8. Existing Organizations

**No standalone organizations table.** Organization-like concepts embedded in:
- sponsors + sponsor_profiles: company profiles with branches
- sponsor_users: users linked to sponsors with roles
- sponsor_branches: physical branch locations
- sponsor_plans: 4 tiers (free/basic/professional/enterprise)

## 9. Existing Office Model

8 office integration tables: office_devices, office_pairing_codes, office_device_credentials, office_sync_operations, office_radar_queries, office_notification_rules, office_notification_deliveries, office_realtime_events, office_news_deliveries

Offices identified via sponsor_branches + office_links (no standalone offices table).

## 10. Existing Company Model

**No generic company model.** Sponsor is the only organization unit. Sponsor profiles include:
- Company name (ar/en), logo, cover, commercial_registration, tax_number
- Contact info, location fields
- Status: draft/verified/approved/suspended
- Branches, users, subscriptions, contracts, documents, payments, invoices

## 11. Existing Verification

Multi-layer verification:
- Email verification: token-based (24h TTL)
- OTP: 6-digit, 10min TTL, 5 max attempts
- Password reset: token-based
- Provider document verification: per-document boolean flag
- Provider profile approval: state machine (draft→submitted→under_review→approved/rejected)
- Sponsor profile verification: status-based

## 12. Existing Reviews/Ratings

Service reviews only: 1-5 star + 4 sub-ratings (quality, punctuality, communication, value) + recommend flag. One review per order per reviewer. Hidden/visible moderation. Auto-recompute provider rating.

**No property reviews. No sponsor reviews. No office reviews.**

## 13. Existing Activity Tracking

- audit_logs: global action tracking (actor, action, entity, metadata)
- sponsor_activity_logs: sponsor-scoped with old/new value diffs
- service_job_timeline: order lifecycle events
- service_request_status_history: request status audit trail
- lastLoginAt on users
- lastSeenAt on office devices

## 14. Existing Availability

No real-time online/offline toggle. Availability determined by:
- Provider profile status (approved = available)
- service_radius_km for geographic matching
- Listing status (active/paused/removed)
- Office device status (active/inactive/maintenance/decommissioned)

## 15. Existing Admin Controls

16 admin pages, 7+ admin API routes. Permission-gated sidebar. Command center provides aggregated metrics across all domains.

## 16. Existing Services Integration

21 tables covering categories, listings, requests, offers, orders, messaging, reviews, disputes, provider profiles, documents, portfolio, matching, notifications, outbox.

## 17. Existing Office Integration

9 office integration tables covering devices, pairing, credentials, sync, radar, notifications, realtime events, news delivery.

## 18. Existing Analytics

Command center: 35+ parallel queries across sponsors, ads, properties, services, users, integration, geographic, health, audit. Ad analytics: impressions, clicks, conversions, daily statistics.

## 19. Duplication Issues

### User Duplication
- PG users table vs MySQL users table have different schemas
- SQLite users table mirrors MySQL
- Identity map converts between role systems

### Profile Duplication
- No general user profile
- service_provider_profiles exists for service providers
- sponsor_profiles exists for sponsors
- No unified profile entity

### Provider/Company Duplication
- service_provider_profiles with is_business flag
- sponsor_profiles as company profiles
- No separation between individual providers and business entities

### Verification Duplication
- Email verification (auth system)
- Provider document verification (marketplace)
- Provider profile approval (marketplace)
- Sponsor profile verification (sponsor system)
- No unified verification record

### Review Duplication
- Service reviews only (no property/sponsor/office reviews)
- Rating computed in provider profile (denormalized)

### Directory Duplication
- Service categories (hierarchical)
- Service listings (provider-scoped)
- No unified entity directory

## 20. Gap Analysis Summary

### KEEP
- Auth system (JWT, session, password, OTP)
- Permission model (88 permissions, 12 roles)
- Services marketplace (comprehensive)
- Office integration (comprehensive)
- Command center (analytics)

### REUSE
- Users table (extend, don't replace)
- Audit logging system
- Notification infrastructure
- Design system components

### EXTEND
- Users table → add profile fields
- Provider profiles → add reputation signals
- Sponsor profiles → add verification records

### REFACTOR
- Role system → separate platform vs organization roles
- Verification → unified verification record model
- Activity tracking → unified activity model

### MERGE
- Service provider profiles + sponsor profiles → unified entity model

### DEPRECATE
- MySQL users table schema divergence
- Sponsor_users table (use organization_members)

### CREATE
- Organizations table
- Organization_members table
- Verification_records table
- Reputation_profiles table
- Reputation_evaluations table
- Reputation_history table
- Activity_states table
- Availability_states table
- Profile_strength table
- Badges table
- Achievements table
