# PHASE 4 — Pre-Implementation Audit

**Date:** 2026-08-05
**Scope:** Full services marketplace build (Phase 4).
**Auditor:** opencode (working independently, order per build spec)

---

## 1. Current state of the services subsystem

The platform already ships a **minimal two-sided services core** used by real pages:

| File | Role |
|---|---|
| `lib/services-schema.ts` | D1/MySQL CREATE TABLE for `service_categories`, `service_listings`, `service_requests`, `service_offers`, `service_orders`, `service_messages`, `service_reviews`, `service_disputes`, `service_bookmarks` |
| `lib/services/core.ts` | `createCategory`, `listCategories`, `createListing`, `updateListingStatus`, `listListings`, `createRequest`, `getRequest`, `cancelRequest`, `listRequests`, `createOffer`, `listOffers`, `acceptOffer`, `updateOrderStatus`, `addReview`, `reviewsForReviewee`, `providerAverageRating`, `openDispute`, `resolveDispute`, `sendMessage`, `threadMessages`, `distanceKm` |
| `lib/services/constants.ts` | `REQUEST_STATUS {open,offered,ordered,cancelled,expired}`, `OFFER_STATUS {sent,withdrawn,accepted,rejected}`, `ORDER_STATUS {created,accepted,in_progress,delivered,completed,cancelled,disputed}`, `ORDER_FLOW`, `UNIT_TYPES`, `SERVICE_ERROR_CODES` |
| `lib/services/db.ts` | `insertRow` helper |
| `lib/services/audit.ts` | `writeAudit` |
| `scripts/seed-services.ts` | Seeds 5 OM categories (codes like `cleaning`) via i18n keys |
| `app/api/services/*` | REST routes over the core |

### Gaps vs Phase 4 spec (confirmed by audit)

1. **Categories** are code-only (code + i18n key): no `name_ar/en/tr`, no `icon`, no `image_url`, no `requires_license` / `requires_visit`, no price ranges, no dynamic field definitions.
2. **Provider profiles do not exist.** No provider account concept, no onboarding/approval workflow, no provider–category coverage, no documents/portfolio, no ratings aggregate.
3. **Requests** are minimal: no `draft -> published` machine, no `urgency` / `needs_visit` / `preferred_period` / `pricing_type` / `reference_number`, no dynamic-field answers, no attachments, no status history, no geographic matching (no `service_request_matches`, no engine).
4. **Offers** are single-shot: no materials/tax/visit-fee breakdown, no revision chain, no expiry check on accept, no close-siblings side effects with notifications.
5. **Jobs** = orders only; no timeline, no `scheduled` / `waiting_customer_confirmation` workspace states, no job notifications.
6. **Messaging** has no read state and no inbox aggregation.
7. **Reviews** are single-dimension; no hidden/moderation state, no provider-rating recompute hooks.
8. **Reports/moderation do not exist.**
9. **Notifications + outbox do not exist.**
10. **Ad engine** has no `domain` targeting dimension (needed for `service_ads`-scoped campaigns).
11. **Roles** have no `service_provider` / `service_supervisor`.

---

## 2. Architecture decisions

### 2.1 Schema strategy (D1 + MySQL parity)

- New module `lib/services-marketplace-schema.ts` exporting `ensureServicesMarketplaceSchema(db)`.
- **New tables** via `CREATE TABLE IF NOT EXISTS` (SQLite-safe; verified the MySQL shim `translateSql` in `lib/mysql-runtime.ts` only rewrites `INSERT OR IGNORE` -> `INSERT IGNORE`, `ON CONFLICT` -> `ON DUPLICATE KEY`, index `IF NOT EXISTS`, and `datetime('now')` — everything else passes through).
- **New columns on existing tables** via the `ADD COLUMN` + duplicate-column catch pattern already proven in `lib/ad-schema.ts::ensureAdSchema` (works on SQLite and MySQL).
- Wired into both `lib/runtime-db.ts::ensureSponsorSchema` and `lib/mysql-runtime.ts::ensureMysqlSchema`, immediately after `ensureServicesSchema`.

### 2.2 Request status machine (backward-compatible extension)

- Keep legacy values valid for old rows; extend `REQUEST_STATUS` with the Phase-4 states: `draft, published, receiving_offers, offer_selected, scheduled, in_progress, waiting_customer_confirmation, completed, cancelled, expired, disputed`.
- `createRequest` writes `draft`; `publishRequest` transitions `draft -> published` and fires matching. Transitions are server-controlled through `canTransitionRequest` and logged to `service_request_status_history`.
- Legacy `open -> published`, `offered -> receiving_offers`, `ordered -> offer_selected` at read/UI layer.

### 2.3 Matching engine (pure + DB-thin)

- `lib/services/matching.ts`:
  - `computeMatchScore(request, provider, categories)` pure function: category coverage (40), distance within provider radius (decayed), urgency bonus, budget fit, rating bonus, response-rate bonus.
  - `runMatching(requestId)`: loads request, finds approved providers in the request country/city within radius and covering the category, upserts `service_request_matches` (idempotent re-score), writes notifications + outbox `SERVICE_REQUEST_MATCHED`.
- The pure function is directly unit-testable.

### 2.4 Provider identity

- Providers are logged-in users (session identity, sponsor_access-backed) with a `service_provider_profiles` row (`user_id` unique).
- New roles: `service_provider` (self-service: apply, manage own profile/offers/jobs, notifications) and `service_supervisor` (moderation/ops/categories). `super_admin` keeps everything.
- Workflow: `draft -> submitted -> under_review -> approved | rejected | suspended`.
- Only approved providers receive matches and can send offers.

### 2.5 Offer model

- Extend `service_offers`: `material_cost`, `labor_cost`, `visit_fee`, `tax_amount`, `total_price`, `materials_included`, `nearest_date`, `duration_text`, `offer_notes`, `terms`, `valid_until`, `needs_visit`.
- `service_offer_revisions` snapshots each version with an incrementing `revision_number`.
- `acceptOfferFlow`: validates request open + offer `sent` + not expired (`valid_until`), writes the order, closes sibling offers, records timeline + notifications + outbox. Legacy `core.acceptOffer` is kept.

### 2.6 Jobs / workspace

- Every order status change appends a `service_job_timeline` entry (via `updateOrderStatus` + new `updateJobStatus`).
- Order states surfaced: `accepted -> scheduled -> in_progress -> delivered -> completed`, plus `cancelled`, `disputed`, `waiting_customer_confirmation`.
- Job workspace = order detail (timeline + terms + chat + review links).

### 2.7 Ads domain targeting

- Add `domain` column to `ad_campaigns` (ALTER + MySQL CREATE), a `domain` field on `ResolvedAdContext`, `MatchRequest` + `buildContext`, and a `domains: string[]` field on `ParsedAd`.
- Scoring rule: empty `domains` -> matches everywhere (backward compatible); otherwise context domain must be included (or `general`).

### 2.8 Permissions / roles

- New permissions: `service_categories.manage`, `service_providers.apply`, `service_providers.manage`, `service_providers.review`, `service_requests.manage_own`, `service_requests.manage_all`, `service_offers.manage_own`, `service_offers.manage_all`, `service_jobs.manage_own`, `service_reports.manage`, `service_notifications.view`, `service_ads.manage`.
- `service_provider` and `service_supervisor` added to `SponsorRole`, `ROLE_CATALOG`, `ROLE_ORDER`, translation role labels, `mapSessionRole`, and assignable-roles lists.

---

## 3. Files to create / modify

### Create

- `lib/services-marketplace-schema.ts` — new tables + ALTERs + ensure fn.
- `lib/services/marketplace.ts` — provider workflows, request lifecycle, offers/revisions, jobs/timeline, reviews, reports, notifications, outbox.
- `lib/services/matching.ts` — matching engine (pure + runner).
- `lib/services/copy.ts` — trilingual UI strings for the marketplace pages.
- `scripts/seed-services-marketplace.ts` — idempotent demo seed (categories, providers, requests, offers, job, reviews).
- `app/api/service-categories/route.ts`, `app/api/service-categories/[id]/route.ts`
- `app/api/service-providers/route.ts`, `/me`, `/[id]`, `/[id]/apply`, `/[id]/status`, `/[id]/portfolio`, `/[id]/documents`, `/[id]/categories`
- `app/api/service-requests/route.ts`, `/[id]`, `/[id]/publish`, `/[id]/cancel`, `/[id]/history`, `/[id]/matching`, `/[id]/answers`, `/[id]/attachments`
- `app/api/service-offers/route.ts`, `/[id]`, `/[id]/revise`, `/[id]/accept`, `/[id]/withdraw`
- `app/api/service-jobs/route.ts`, `/[id]`, `/[id]/status`, `/[id]/timeline`, `/[id]/review`
- `app/api/service-messages/route.ts`, `/threads`
- `app/api/service-reports/route.ts`, `/[id]/resolve`
- `app/api/service-notifications/route.ts`, `/read-all`
- `app/api/service-admin/route.ts` — categories CRUD, provider review, reports queue, moderation, overview.
- `app/services/page.tsx`, `app/services/catalog/page.tsx`, `app/services/catalog/[code]/page.tsx`
- `app/service-requests/page.tsx`, `/new`, `/[id]`
- `app/providers/page.tsx`, `/apply`, `/[id]`
- `app/dashboard/services/page.tsx`, `app/dashboard/services/offers/[id]/page.tsx`, `app/dashboard/services/jobs/[id]/page.tsx`, `app/dashboard/services/messages/page.tsx`, `app/dashboard/services/reviews/page.tsx`, `app/dashboard/services/notifications/page.tsx`, `app/dashboard/services/profile/page.tsx`
- `app/admin/services/page.tsx`, `/categories`, `/providers`, `/moderation`, `/ads`
- `src/components/services/*` client components.
- `tests/services-marketplace.test.mjs`, `tests/services-matching.test.mjs`, `tests/services-e2e.mjs`.

### Modify

- `src/constants/permissions.ts` — new permission keys.
- `src/constants/roles.ts` — new roles + catalog + order.
- `lib/auth/identity-map.ts` — role mappings.
- `src/data/translations.ts` — role labels for new roles.
- `app/api/sponsor-access/route.ts` + `src/components/admin/UsersAdminClient.tsx` (or equivalent) — assignable roles.
- `lib/runtime-db.ts`, `lib/mysql-runtime.ts` — call `ensureServicesMarketplaceSchema` + auto-seed.
- `lib/ad-schema.ts`, `lib/mysql-runtime.ts` (ad_campaigns CREATE), `lib/ads/types.ts`, `lib/ads/context.ts`, `lib/ads/engine.ts` — domain targeting.
- `app/api/ads/route.ts` — accept/store `domain`.
- `src/constants/advertising.ts` — section/pageType entries for `services` if missing.
- `src/components/AdSlot.tsx` — pass `domain` context on services pages.
- `src/components/shared/Header.tsx` — services nav links.
- `package.json` — seed:services:marketplace script.

---

## 4. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Schema mismatch D1 vs MySQL | Only use `CREATE TABLE IF NOT EXISTS`, numbered `?1..?N` placeholders, `INSERT OR IGNORE`, booleans as INTEGER 0/1; ALTER pattern with duplicate-column catch (ad-schema precedent). |
| `vinext start` cannot load PG/cloudflare | Marketplace data routes use the runtime DB (D1 under dev, MySQL under start), same as news/ads. No postgres dependency added. |
| Memory-limited tsc (approx 2 GB free) | Keep new files type-clean, run typecheck with targeted `--noEmit`, avoid importing heavy deps into test-only modules. |
| eslint `react-hooks/set-state-in-effect` | Use `window.queueMicrotask(() => { void fn(); })` in effects that set state (existing convention). |
| Legacy status values | Keep old values valid + map at read layer; new writes always use new machine. |
| Seeding clobbering existing DBs | All seeds guarded by count checks + `INSERT OR IGNORE`; categories also get name-field UPDATE by code. |

---

## 5. Build order

1. Permissions + roles + identity map + translations.
2. Marketplace schema + wiring + seeder.
3. Backend `lib/services/marketplace.ts` + `lib/services/matching.ts`.
4. Ads domain extension.
5. API routes.
6. Frontend pages (landing/catalog, wizard, requests, providers, dashboard/jobs/messages/reviews/notifications, admin).
7. Tests (unit, API, E2E).
8. Lint + typecheck + build + fix.
9. Final `PHASE_4_SUMMARY.md`.
