# AKARPROMAX — FEATURE COVERAGE MAP
**Phase 0.5** · user journey → UI route/component → API → service/domain function → database table → notification/realtime → test

Read this document to find features that have **UI but no backend**, **backend but no UI**,
**a database table with no consumer**, or **tests that cover a dead implementation**.
Every "NONE" below is a coverage hole, not a formatting placeholder.

---


# Identity, Profiles & Ranks (Domains A, B, C)

| # | User journey | UI route / component | API | Service fn | DB table | Notification / realtime | Test file |
|---|---|---|---|---|---|---|---|
| 1 | Sign up → activate → first login | `app/register/page.tsx` → `app/verify-email/page.tsx` → `app/login/page.tsx` | `POST /api/auth/register`, `POST\|GET /api/auth/verify-email`, `POST /api/auth/login` | `hashPassword` (`lib/auth/password.ts:3`), `buildVerificationRecord` (`lib/auth/verification.ts:59`), `activateAccount` (`lib/auth/verification-actions.ts:35`) | `users`, `verification_challenges`, `audit_events` | verification + welcome e-mail (`lib/email`); NO realtime | `tests/auth-phase4.test.mjs` (in `npm test`); `tests/auth-core.test.ts` (NOT run) |
| 2 | Forgot → reset password | `app/forgot-password/page.tsx` → `app/reset-password/page.tsx` | `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` | `issuePasswordReset` / `applyPasswordReset` (`lib/auth/verification-actions.ts:135,189`) | `verification_challenges`, `users`, `audit_events` | reset + password-changed e-mail | `tests/auth-phase4.test.mjs` |
| 3 | Admin promotes a user to a privileged role | `app/admin/users/page.tsx` → `app/admin/users-admin-client.tsx:91` | `POST /api/advertiser-access` | inline SQL (`app/api/advertiser-access/route.ts:101-113`) | `sponsor_access`, `audit_logs` | none | **NONE** — and the write does not affect the target user's session permissions (AUTH-044) |
| 4 | Craftsman applies and becomes searchable | `app/providers/apply/page.tsx` → `app/dashboard/services/provider-profile` | `POST /api/service-providers/[id]/apply`, `PATCH /api/service-providers/[id]/status` | `setProviderStatus`, `updateProviderAdminSettings` (`lib/services/marketplace.ts:210`) | `service_provider_profiles`, `service_provider_categories`, `service_provider_documents` | `service_notifications` (no realtime) | `tests/services-authz.test.mjs`, `tests/services-marketplace.test.mjs` (both in `npm test`) |
| 5 | Office/company registers and is approved | **NO UI** → `app/dashboard/office/profile/page.tsx` (edit only) | `POST /api/amrs/organizations`, `POST /api/amrs/organizations/[id]/submit`, `PATCH /api/admin/organizations/[id]/review` | `createOrganization` (`lib/amrs/organization.ts:80`) | `organizations`, `organization_members`, `audit_events` | none | `tests/organizations-hardening-f1.test.mjs`, `tests/organizations-workspace-f3.test.mjs` (NOT in `npm test`) |
| 6 | Entity earns a rank and it shows up in discovery | **NO UI to trigger**; display `app/organizations/[id]/page.tsx:119-120` (raw text) | `POST /api/amrs/reputation` (admin), `GET /api/amrs/directory` | `evaluateReputation` (`lib/amrs/reputation.ts:140`), `searchDirectory` (`lib/amrs/directory.ts:67`) | `reputation_profiles`, `reputation_evaluations`, `reputation_history` | **NONE** (event bus unwired, `lib/amrs/events.ts`) | `tests/amrs/amrs5-policy.test.ts`, `tests/amrs/amrs7-directory.test.ts` (NOT in `npm test`) — and the directory never reads the reputation tables (RANK-014/015) |


# Properties, Land, FindMyLand, Engineering Tools, Geo (Domains D, E, F, U, V)

| # | Journey | UI route → component | API | Service fn | DB table | Notification | Test |
|---|---|---|---|---|---|---|---|
| 1 | Browse properties | `/properties` → `cur/app/properties/page.tsx:38-110` | `GET /api/properties` | inline Drizzle query `cur/app/api/properties/route.ts:90-102` | `properties` | none | **none** |
| 2 | Search properties by offer type | `/properties/search` → `cur/app/properties/search/page.tsx:19-77` | `GET /api/properties/search` | inline join `cur/app/api/properties/search/route.ts:45-100` | `properties` + `property_offers` + `property_offer_types` | none | **none** |
| 3 | Publish a property | `/dashboard/properties/new` → `cur/app/dashboard/properties/new/page.tsx` / `PropertyFormWithOffers.tsx:293-350` | `POST /api/properties` → `POST /api/properties/[id]/submit` → `POST /api/admin/properties/[id]/review` | `assertPropertyOfferPolicies` (`cur/lib/properties/offer-policy.ts:14`) | `properties`, `property_media`, `property_offers` | **none at any step** | **none** |
| 4 | Buyer request → office offer → accept | `/dashboard/properties/property-requests` → `page.tsx:18-29`; office side is read-only `cur/app/dashboard/office/property-requests/page.tsx` | `POST /api/property-requests`, `POST /api/property-requests/[id]/offers`, `PATCH /api/property-requests/[id]/offers` | inline (`offers/route.ts:118-140,168-193`) | `property_requests`, `property_request_offers` | **none** | **none** |
| 5 | Message the owner from a listing | `/properties/[id]` → `StartThreadButton.tsx:35` | `POST /api/service-messages/threads` | `startMessageThread` (`cur/lib/services/...`) | `message_threads`, `message_participants` | none (Phase 0: no realtime) | `cur/tests/messages-contract.test.mjs` |
| 6 | Analyse a deed with FindMyLand | `/tools?tool=findmyland` → `cur/src/components/tools/FindMyLand.tsx:793-899` | `POST /api/land/resolve` | `resolveLandDocument` (`cur/lib/land/intelligence/resolver.ts:115`) | none (in-memory `cur/lib/land/resolve-store.ts:9`) | none | `cur/tests/land/find-my-land.test.ts` — **not in `npm test`** |
| 7 | Save located land + request a surveyor quote | `FindMyLand.tsx:1127-1202` | `POST /api/land`, `GET /api/land/discover-surveyors`, `POST /api/land/[id]/surveyors/quote` | `saveLand` (`cur/lib/land/saved-land.ts:11`), `surveyor-discovery.ts`, `quote.ts` | **none — in-memory `Map`** | **none** | `cur/tests/land/land-flow.test.ts` — **not in `npm test`** |
| 8 | Desktop office pushes a property to the cloud | AkarApp desktop (`CloudSyncQueue`) → `https://akar-promax.com/api/program/sync` (`inv/dll_urls.txt`) | `POST /api/office/v1/sync` | `syncPush` (`cur/lib/integration/sync.ts`) | `property_listings` + `office_sync_operations` (**not** `properties`) | Phase 0: SSE stream never emits | `cur/tests/integrations-sync.test.mjs` |


# AMRS, Surveyor Discovery, Organizations / Offices / Companies / Professionals (Domains G, H, M)

**J1 — Visitor finds an office/company and contacts it**
`app/offices/page.tsx:36` → `app/api/offices/route.ts:9-41` → `app/offices/[id]/page.tsx:17` → `app/api/offices/[id]/route.ts:10-38` → contact button `app/offices/[id]/page.tsx:47` (**dead end**).
Status: PARTIAL. Search/list/detail work; branches + member count returned but unrendered (OFFICE-ORG-003); no messaging, no lead capture, no reviews, no rank/rating (ORG-018/019/020).

**J2 — User creates an office/company and gets it approved**
Intended: onboarding → create org → complete profile → submit → admin review → active.
Actual: `app/onboarding/page.tsx:44-47` discards the choice (ORG-005); `POST /api/amrs/organizations` (`:85-152`) exists but no UI calls it; `POST /api/amrs/organizations/[id]/submit` (`:12-63`) has no UI; `PATCH /api/admin/organizations/[id]/review` (`:20-118`) has no Admin page and needs an ungrantable permission (`:16`).
Status: BROKEN end-to-end via UI; API-only chain proven by `scripts/organizations-f2-production-e2e.mjs:85-178`.

**J3 — Organization owner manages members and branches**
`app/dashboard/offices/page.tsx:10` → `app/dashboard/office/page.tsx:13` → members `:16-22` (read-only) / branches `app/dashboard/office/branches/page.tsx:35-62` (full CRUD) → APIs `app/api/amrs/organizations/[id]/members/route.ts:103-274`, `app/api/office/branches/route.ts:5-8`.
Status: PARTIAL. Branches FULL; member add/role/remove exists only as API (OFFICE-ORG-005); email invitations MISSING (AMRS-018).

**J4 — Organization gets verified and ranked**
`POST /api/amrs/verification` (`:60-152`, no UI) → `verification_records` → `PATCH /api/admin/verifications/[id]` (`:18-56`, no UI) → `syncOrganizationVerifiedAt` (`lib/amrs/organization-verification.ts:41-63`) → badge (`app/offices/[id]/page.tsx:40`); reputation via `POST /api/amrs/reputation` with hand-supplied signals (`app/api/amrs/reputation/route.ts:75-98`) → shown at `app/organizations/[id]/page.tsx:54`.
Status: PARTIAL/BROKEN. Verified badge works once an admin acts via API; reputation has no automatic signal source (AMRS-041); trust panel is admin-only (AMRS-029); no admin UI anywhere.

**J5 — Landowner finds a nearby surveyor and requests a quote**
`src/components/tools/FindMyLand.tsx:1161-1180` → `GET /api/land/discover-surveyors` (`:8-41`) → `lib/land/amrs-directory.ts:45-79` → `lib/amrs/directory.ts:67-125` → `lib/land/surveyor-discovery.ts:34-85` → `FindMyLand.tsx:1183-1199` → `POST /api/land/[id]/surveyors/quote` (`:7-40`) → `lib/land/quote.ts:34-51`.
Status: BROKEN. Discovery always returns 0 (SURV-004); distance never computed (SURV-003); role matching is a name substring (SURV-005); the quote endpoint is unauthenticated (SURV-012), stores to memory (SURV-011), and the surveyor is never notified and has no way to respond (SURV-014/015/016).

**J6 — Platform admin governs organizations and professionals**
`app/admin/admin-sidebar.tsx:43` → `app/admin/companies/page.tsx` (taxonomy only). Everything else is API-only: `app/api/amrs/admin/dashboard/route.ts`, `app/api/amrs/admin/verification/route.ts`, `app/api/amrs/admin/retention/route.ts`, `app/api/admin/organizations/[id]/review/route.ts`, `app/api/admin/verifications/**`.
Status: MISSING. Company taxonomy is the only organization capability reachable from Admin; professionals have neither UI nor API in Admin (PRO-010).

---


# Services Marketplace (Domain I)

| # | Journey | UI route | Component | API | Service fn | DB table | Notification | Test |
|---|---|---|---|---|---|---|---|---|
| J1 | Customer posts a service request | `/service-requests/new` (`cur/app/service-requests/new/page.tsx:111`) | wizard steps `:389-604`, `ServiceLocationPicker` | `POST /api/service-requests` (`route.ts:63`) → `POST /api/service-requests/[id]/publish` (`page.tsx:301`) | `createRequestFull` `marketplace.ts:763`; `publishRequest` `:799` | `service_requests`, `service_request_attachments`, `service_request_status_history` | `SERVICE_REQUEST_MATCHED` to customer `matching.ts:126-139` | `tests/services-marketplace.test.mjs:71` — **blocked at runtime by SVC-149 (403)** |
| J2 | Provider applies and gets approved | `/providers/apply` → `/dashboard/services/provider-profile` | `apply/page.tsx:34-42`, `provider-profile/page.tsx:82-185` | `POST /api/service-providers`, `POST /api/service-providers/[id]/categories`, `POST /api/service-providers/[id]/apply`, `PATCH /api/service-providers/[id]/status` | `upsertProviderProfile` `:95`; `addProviderCategory` `:281`; `submitProviderApplication` `:150`; `setProviderStatus` `:166` | `service_provider_profiles`, `service_provider_categories`, `service_provider_documents` | `PROVIDER_APPROVED`/`REJECTED`/`SUSPENDED` `marketplace.ts:178-197` | `tests/services-api.test.mjs:81,103`; `tests/services-marketplace.test.mjs:213` |
| J3 | Matching fans a request out to providers | — (server-side on publish) | — | `POST /api/service-requests/[id]/matching` (`matching/route.ts:35`) | `runMatching` `matching.ts:43` → `computeMatchScore` `match-score.ts:70` | `service_request_matches`, `service_notifications`, `service_outbox_events` | `SERVICE_REQUEST_MATCHED` to each provider `matching.ts:92-105` — **link `/dashboard/services/requests/{id}` is not a route** | `tests/services-matching.test.mjs:111` |
| J4 | Provider submits an offer | `/service-requests/[id]/offer` (`offer/page.tsx:64-96`) | offer form | `POST /api/service-offers` (`service-offers/route.ts:31`) | `createOfferFull` `marketplace.ts:1088` (+ eligibility `:1107`, revision `:1167`) | `service_offers`, `service_offer_revisions` | `SERVICE_OFFER_RECEIVED` to customer `:1175-1182` | `tests/services-marketplace.test.mjs:71` |
| J5 | Customer compares and accepts an offer | `/service-requests/[id]` → `/dashboard/services/offers/[id]` | `offers/[id]/page.tsx:157-172` | `POST /api/service-offers/[id]/accept` | `acceptOfferFlow` `marketplace.ts:1320` | `service_orders`, `service_job_timeline`, `service_request_status_history` | `SERVICE_OFFER_ACCEPTED` to provider `:1373`; outbox `:1382`; **losing bidders get no notification** (`:1358-1361` silently sets `rejected`) | `tests/services-marketplace.test.mjs:71` |
| J6 | Job execution to completion | `/dashboard/services/jobs/[id]` (`jobs/[id]/page.tsx:56-71`) | status buttons `:160`, timeline `:170` | `PATCH /api/service-jobs/[id]/status`, `GET /api/service-jobs/[id]/timeline` | `updateJobStatus` `marketplace.ts:1407`; `addJobTimeline` `:1460` | `service_orders`, `service_job_timeline` | `SERVICE_JOB_COMPLETED` `:1434` | `tests/services-marketplace.test.mjs:71,228` |
| J7 | Review after completion | `/dashboard/services/jobs/[id]` (`:84,208`) | review form | `POST /api/service-jobs/[id]/review` | `addReviewFull` `marketplace.ts:1518`; `recomputeProviderRating` `:1579` | `service_reviews`, `service_provider_profiles` | `SERVICE_REVIEW_RECEIVED` `:1567` | `tests/services-marketplace.test.mjs:71` |
| J8 | Conversation between customer and provider | `/dashboard/services/inbox` (`inbox/page.tsx:34,96`) and `jobs/[id]:194` | `ThreadMessages.tsx:31,50`, `StartThreadButton.tsx:35` | `GET /api/service-messages/threads`, `GET/POST /api/service-messages/threads/[threadType]/[threadId]`, `POST /api/service-messages` | `listInbox` `:2009`; `isThreadParticipant` `:1915`; `sendMessageFull` `:1861`; `threadMessages` `:1889` | `service_messages`, `service_message_threads`, `service_message_participants` | `SERVICE_MESSAGE` `:1875` — **wrong recipient on request threads** (`:1967`) | `tests/messages-contract.test.mjs`; **cross-provider leak confirmed** `docs/release/PHASE-0-BASELINE.md:479` |


# Messaging & Notifications (Domains J, K)

| # | Journey | Path through the code | Verdict |
|---|---|---|---|
| 1 | **Buyer asks about a property** | `/properties/[id]` → `StartThreadButton` (`app/properties/[id]/page.tsx:225`) → `POST /api/service-messages/threads` → `startMessageThread` (`lib/services/marketplace.ts:1985`) → redirect to inbox | **BROKEN at two points**: owner never added as participant (MSG-002); redirect reads `thread.thread_type` off a camelCase response → `?open=undefined%3Aundefined` (MSG-050). Message is written, nobody is notified, thread is invisible to both parties (`listInbox` skips zero-message threads, `:2051`). |
| 2 | **Customer negotiates with a provider on a request** | `/service-requests/[id]` (no messaging UI) → inbox thread `request:<id>` → `GET /api/service-messages/threads/request/<id>` → `isThreadParticipant` (`:1924-1932`) → `threadMessages` (`:1892`) | **WORKS BUT LEAKS** — every non-withdrawn bidder reads every other bidder's messages. No entry point on the request page itself; the thread only appears in the inbox after someone sends the first message. |
| 3 | **Customer and provider run an accepted job** | `/dashboard/services/jobs/[id]` → `<ThreadMessages threadType="order">` (`app/dashboard/services/jobs/[id]/page.tsx:194`) → send (`app/api/service-messages/route.ts`) → `notify(SERVICE_MESSAGE)` | **WORKS END TO END** — the only fully functional messaging journey. No realtime; the other party sees nothing until reload. |
| 4 | **Visitor contacts an office / company / professional** | `/offices/[id]:47`, `/companies/[id]:47`, `/providers/[id]:409` — all render a message button | **DEAD** — none of the three buttons has an `onClick`. The one correct implementation (`organization-profile-page.tsx:186`) is an unimported file. |
| 5 | **User checks their inbox and unread counts** | sidebar (`src/config/sidebar.ts:43`) → `/dashboard/services/inbox` → `GET /api/service-messages/threads` → `listInbox` | **PARTIAL** — inbox renders and per-thread counts are right, but the sidebar badge is hardcoded `0` (`app/api/service-dashboard/counts/route.ts:44`) and the **provider sidebar has no inbox item at all** (`src/config/sidebar.ts:57-74`), so providers have no navigation to their messages. |
| 6 | **User receives and acts on a notification** | `notify()` (`lib/services/marketplace.ts:2081`) → `GET /api/service-notifications` → `/dashboard/services/notifications` → click → `contextLinkFor` target → `POST /[id]/read` | **PARTIAL** — 7 of 16 event types fire; the page reads `n.read` while the API returns `is_read`, so everything renders permanently unread (NOTIF-001); no email, no push, no realtime. |

---


# Auctions, Community, Knowledge, Vehicles, News (Domains L, N, O, P, Q)

**J1 — Organizer runs a 72-hour closed auction and reaches a signed contract.**
Admin grants the organizer (`app/api/admin/auction-organizers/route.ts:100`) → organizer picks an eligible org (`app/api/auctions/organizers/route.ts:11`) → creates the auction (`app/api/auctions/route.ts:196`, 72 h at `:143`) → status `pending_seller_terms` (`:211`) → property owner accepts and the 72 h clock restarts (`app/api/auctions/[id]/terms/route.ts:64-71`) → bidders bid (`bid/route.ts:16`) → after server-time expiry the organizer closes (`end/route.ts:62`) → `settleAuction` writes award + contract (`lib/auctions/settlement.ts:172`) → parties download (`contract/route.ts:11`).
**Breaks at:** the admin grant screen cannot list organisations to grant to (AUC-019); nothing auto-closes the auction (AUC-040); the HTML contract is mojibake (AUC-047); and the journey **cannot be completed** because contract signing has no UI (AUC-049). No notification reaches seller, bidders or winner at any step (AUC-056).

**J2 — Seller runs an open auction and decides on the winner.**
Seller creates with `acceptSellerTerms` → immediately `active` (`app/api/auctions/route.ts:211`) → bids → seller closes (`end/route.ts:38-40`) → `awaiting_seller_decision` (`:100-120`) → accept/reject (`decision/route.ts:50`,`:67`) → accept settles as J1.
**Breaks at:** the seller is never told the auction ended or that a decision is pending — the state is only visible if they reopen the page (`app/auctions/[id]/page.tsx:242`); custom end dates are silently discarded (AUC-011); same signing gap.

**J3 — Bidder discovers an auction, bids, and tracks it.**
`/auctions` is not in the public navigation (AUC-063) so discovery depends on `/services` (`app/services/page.tsx:93`) or a typed URL → detail page → accept bidder terms and bid with an idempotency key (`app/auctions/[id]/page.tsx:148`) → anonymised history (`app/api/auctions/[id]/route.ts:72`).
**Breaks at:** no listing images (AUC-005); no filters or search (AUC-004); no live price — the page shows a local countdown but a stale price (AUC-057); no "my bids" view (AUC-034); no outbid notification (AUC-056); no deposit gate (AUC-036).

**J4 — Member posts in the community and gets a reply.**
`/community` (in navigation, `src/config/public-navigation.ts:131`) → "موضوع جديد" → submit.
**Breaks immediately:** the form posts `categoryId: ''` into a `uuid` FK, so creation fails with a 500 for every user (COMM-005), and on a fresh database the `forum_*` tables do not even exist (COMM-020). If a topic is seeded directly, the detail page then shows raw UUIDs as authors (COMM-013) and the feed's reply count stays 0 (COMM-009).

**J5 — Visitor finds and downloads a knowledge resource.**
`/knowledge` (in navigation, `:141`) → catalogue.
**Breaks at:** the cards are not links and the on-card download button has no handler (KNOW-002), so the detail page is unreachable without typing the URL; on a fresh database `knowledge_items` does not exist (KNOW-018). Given a direct URL, download works (`app/knowledge/[id]/page.tsx:41`) but is unauthenticated and ignores `isFree` (KNOW-012, KNOW-013).

**J6 — Editor ingests an RSS item, targets it to one page group, and measures it.**
`/admin/news` → add source (`app/api/news/sources/route.ts:47`) → "fetch now" (`sources/fetch/route.ts:11` → `lib/news/ingestion.ts:110`, SSRF-guarded at `lib/news/security.ts:36`) → review/approve → create a placement with page mode, geo, language, schedule and limits (`app/api/news/placements/route.ts:122`) → the ticker and `/news` resolve through `lib/news/delivery.ts:286` → analytics tab.
**Breaks at:** ingestion never runs on a schedule (NEWS-012); the analytics tab is permanently zero and every display limit is inert because no client posts telemetry (NEWS-026); `/news` is an orphan route with no item detail page (NEWS-036/037); OFFICE_* and PUSH/IN_APP placements can be created but are never delivered (NEWS-024, NEWS-040).


# Advertising, Currency, Localization (Domains R, W, X)

| # | Journey | Path through the system | Coverage |
|---|---|---|---|
| 1 | **Advertiser onboarding** (advertiser applies → admin approves → account exists) | `/advertise` form → `/api/advertising/request` **(404, ADS-088)** · alternative `AdRequestDialog` → `/api/ads/request` **(UI orphaned, ADS-086)** · admin review `cur/app/admin/advertisers/_components/AdvertiserRequestsView.tsx:35,46` → `/api/advertiser-profiles` PATCH | **BROKEN** — no working public entry point; only an admin can create an advertiser |
| 2 | **Campaign authoring → live delivery** (admin builds a campaign, it appears on the site) | `/admin/ads` wizard (`ads-admin-client.tsx:599`) → `/api/admin/ads` POST → `ad_campaigns` + `ad_creatives` → `loadActiveAds` (`engine.ts:171-208`) → `matchAds` → `AdSlot` render | **PARTIAL** — end-to-end logic complete, but media upload is dead (ADS-030) so no creative can be produced in-product |
| 3 | **Ad delivery + measurement on a public page** (visitor loads a page, sees ads, impressions/clicks recorded) | `standard-public-ad-layout.tsx:66-101` → 8 × `AdSlot.tsx:176` `/api/ads/match` → render → `AdSlot.tsx:242` `/api/ads/impression` → `AdSlot.tsx:282` `/api/ads/click` → `recordImpression`/`recordClick` (`lib/ads/events.ts:118,170`) → `ad_daily_statistics` → `/api/admin/ads/stats` | **FULL but inefficient** — works; 8 round-trips per page and cross-slot campaign duplication (N+1) |
| 4 | **Office (desktop) ad delivery** (a campaign targeted at AkarProMax Office reaches the desktop app) | admin sets `channels=["office"]` (`ads-admin-client.tsx:837`) → `/api/office/v1/ads` (`route.ts:15-54`, device token + `office.ads.read`) → desktop client | **BROKEN at the last hop** — `inv/dll_urls.txt` shows the shipped binary calls only `/api/program/*` and `/api/desktop` |
| 5 | **Price display across currencies** (a listing priced in one currency shown to a visitor in another country) | `GeoContext` resolves country + `currencyCode` (`GeoContext.tsx:25,139`) → *no consumer* → cards format with `formatMoney` (default OMR, `services-client.ts:141`) or a hardcoded SAR map (`LuxuryPropertyCard.tsx:36`); `CurrencyService.convert` (`currency.service.ts:48`) has no caller | **MISSING** — no conversion anywhere in the render path; the header currency chip that used to show the active currency is gone (CUR-008) |
| 6 | **Admin changes a UI string without redeploying** | `/admin/i18n` (`i18n-admin-client.tsx:133`) → `/api/i18n/admin/values` → `i18n_translations` → `invalidateLocaleCaches()` → `/api/i18n/{locale}` (`core.ts:53-57`) → `useServicesPage.t(key)` (`useServicesPage.tsx:88`) | **PARTIAL** — the pipe is intact and reaches `t()`, but the copy most pages actually render comes from `copy: translations[locale]` (`useServicesPage.tsx:138`), a compile-time import that no admin edit can change (I18N-014) |


# Admin, Analytics, Search, Favorites, Reviews (Domains AB, AC, AA, Y, Z)

**J1 — Admin approves a newly submitted property.** Owner submits → `status:'pending_review'`
(`app/api/properties/[id]/submit/route.ts:81`) → **DEAD END**: no admin screen lists pending
properties; `app/api/admin/properties/[id]/review/route.ts:17` has zero UI consumers. Coverage
**BROKEN at step 2 of 4**.

**J2 — Admin investigates an abuse report about a review.** Report created
(`marketplace.ts:1651`) → appears in `/admin/services` reports table
(`admin-client.tsx:69`) → admin clicks resolve → `window.prompt` for a note
(`admin-client.tsx:145-148`) → POST **without `action`** → `moderateTarget` never runs
(`marketplace.ts:1713`) → the review stays visible. Coverage **PARTIAL — the report closes, nothing
happens**. Then the admin looks for the audit trail: `/admin/audit` reads `audit_events` while
`writeAudit` wrote `audit_logs` (`lib/services/audit.ts:17` vs `app/api/admin/audit/route.ts:86`) →
**no record visible**.

**J3 — Admin reviews yesterday's ad performance.** `/admin/reports` → `/api/admin/analytics` →
4 KPI tiles. Ad impressions/clicks are real (`ad_events`); **advertiser impressions/clicks and the
whole "top advertisers" panel read `sponsor_events`, which nothing writes** → half the page is
permanently zero (`reports-admin-client.tsx:33-34,118-122`). Coverage **PARTIAL**.

**J4 — Buyer searches, saves and is alerted.** Search works (`app/properties/search/page.tsx:53`,
case-sensitive keyword) → save the search (`/api/saved-searches`, one of two identical APIs) →
toggle "notify me" (`saved-searches/[id]/notify/route.ts:24`) → **nothing ever runs the search
again**; no cron, no matcher, no notification. Coverage **BROKEN at step 4 of 4**. The desktop app
does implement this (`RadarMatches.IsNotified`).

**J5 — Buyer favourites a property, returns tomorrow.** Heart on a card
(`LuxuryPropertyCard.tsx:31`) → row written (`properties/favorites/route.ts:43`) → next visit the
heart renders **empty** because `useFavorites` initialises `isFavorite:false` and only checks on
click (`hooks/useFavorites.ts:5,21`) → the favourites page lists **raw UUIDs** because the API never
joins `properties` (`dashboard/properties/favorites/page.tsx:49` vs `route.ts:23`).
Coverage **PARTIAL — data survives, the experience does not**.

**J6 — Provider earns a rank after good reviews.** Job completes → customer reviews
(`service-jobs/[id]/review/route.ts:39`) → eligibility enforced (`marketplace.ts:1532-1543`) →
`recomputeProviderRating` updates the star average (`:1566`) → **stop**. AMRS weights `rating` at
0.15 (`lib/amrs/reputation.ts:59`) but nothing calls `evaluateReputation` after a review, and there
is no admin screen for ranks at all. Coverage **BROKEN at step 5 of 6**.

---


# Cross-cutting: storage & database coverage

**9 distinct storage mechanisms** exist across the web platform and the desktop build.
Only ONE of them (S1) stores bytes on a server, and it cannot run in the deployed runtime.

### S1 — Cloudflare R2 object storage (`lib/runtime-assets.ts`) — BROKEN under Node

| Field | Value |
|---|---|
| Definition | `lib/runtime-assets.ts:1-5` — `getSponsorAssetsBucket()` does `await import("cloudflare:workers")` and returns `runtime.env.SPONSOR_ASSETS` |
| Binding declared | `types/cloudflare-runtime.d.ts:37` (`interface R2Bucket`), `:50-53` (`declare module "cloudflare:workers" { … SPONSOR_ASSETS: R2Bucket }`) |
| **Only consumer** | `app/api/ad-assets/route.ts:3` (`import { getSponsorAssetsBucket }`), incl. multipart upload at `:24` (`MultipartBucket`) |
| Domains depending on it | **Advertising only** (ad creatives/assets). Nothing else in the tree imports it. |
| Domains that USED to depend on it | Sponsor/advertiser branding — `hist/old-tag/app/api/sponsor-assets/route.ts:1-171` used the same bucket for logo upload; that route no longer exists |
| Status | **BROKEN** under `vinext start`/Node. `import("cloudflare:workers")` throws `ERR_UNSUPPORTED_ESM_URL_SCHEME` outside the Workers runtime — the same failure mode documented for the DB path at `lib/pg-runtime.ts:13-19` and probed defensively at `lib/runtime-db.ts:85-92`. `lib/runtime-assets.ts` has **no such guard**: it imports unconditionally and has no Node fallback. Matches the Phase-0 verified fact "Ad-creative storage broken under Node". |
| Incompatibility / duplication | The runtime layer learned to detect Workers-vs-Node (`lib/pg-runtime.ts:22-31 detectWorkersRuntime`, `lib/runtime-db.ts:85-92 isD1Available`); the storage layer never did. Storage and DB therefore disagree about which runtime they are in. |
| Also runtime-coupled the same way | `db/index.ts:1` — `import { env } from "cloudflare:workers"` at **module top level** (not dynamic). This file has zero importers (see fragment 10 COMM-LEG-034), so it does not currently break a build, but it is a second un-guarded Workers coupling in the tree. |

### S2 — Client-supplied raw URL text columns — the de-facto storage of the platform

There is **no upload endpoint** for any of the surfaces below. The client sends a string; the server
stores the string. Nothing validates that the URL resolves, is an image, is on a domain the platform
controls, or will still exist tomorrow.

| Surface | Column / field | Evidence | Domain |
|---|---|---|---|
| Property media | `property_media.url` (`text().notNull()`) | schema `lib/db/schemas/properties-schema.ts:77`; write path `app/api/properties/route.ts:175-186` maps `validated.media[].url` straight in | Properties |
| Advertiser logo | `logoUrl` | `app/admin/advertisers/advertiser-admin-client.tsx:357` — a bare `<input dir="ltr" placeholder="https://example.com/logo.png">`. **Regression**: replaced the drag-and-drop R2 uploader at `hist/old-tag/app/admin/sponsors/sponsor-admin-client.tsx:197-241,416-433` | Advertising |
| Advertiser banner | `bannerUrl` | `app/admin/advertisers/advertiser-admin-client.tsx:71-74` — a fixed preset list of four `/sponsors/*.webp` paths (S6) | Advertising |
| Company / office logo + cover | `logoUrl`, `coverUrl` | `app/api/companies/[id]/profile/route.ts:49-50` (field map, PATCH at `:55`) | Companies / Offices |
| Service-request attachments | `fileUrl` (max 1000 chars) | `app/api/service-requests/[id]/attachments/route.ts:52-59` — POST takes `attachments[].fileUrl` as JSON text; there is no multipart branch | Services / Messaging |
| Service-provider documents | `fileUrl` (max 800 chars) | `app/api/service-providers/[id]/documents/route.ts:36,46` | Services |
| Land project documents | `fileUrl` | `lib/land/storage/project-storage.ts:28-40` — `storeProjectFile()` inserts a caller-supplied `fileUrl` into `land_documents` | Land / FindMyLand |
| Commercial documents (orphaned) | `sponsor_documents.file_url`, `sponsor_contracts.file_url`, `sponsor_invoices.file_url` | `lib/content-schema.ts:336-349,316-334,369-388` | Commercial (dead — fragment 10) |
| Knowledge downloads | counter only, **no file column read** | `app/api/knowledge/[id]/download/route.ts:10-13` increments `downloadCount` and returns `{success:true}` — it never serves a file | Knowledge |

**Status:** PARTIAL / by-convention-only. **Incompatibility:** the platform has no owned object store on
the Node runtime (S1 is Workers-only), so raw URLs are the only mechanism that works — meaning all
user media is hosted off-platform, unversioned, and un-deletable by the platform.

### S3 — Synthetic ("phantom") URL generation — bytes discarded

| Field | Value |
|---|---|
| Where | `app/api/office/v1/media/route.ts` |
| What it does | Accepts a real multipart `File` (`:80`, `:119`), validates size/MIME (`:16-37`), then inserts `` `/media/${propertyId}/${uploadId}/${generateId()}` `` into `property_media.url` (`:156`) and returns the same fabricated string (`:187`). **`generateId()` is called again for the returned URL, so the stored URL and the returned URL are different strings.** The file bytes are never written anywhere. |
| Also | Writes to `office_media_upload_sessions` (`:97`, `:171`) — a table **no schema file creates**. `grep -rn office_media_upload_sessions` across `lib/`, `drizzle*/`, `db/` returns only these two lines. Every write is guaranteed to fail. |
| Also | Uses the reserved word `order` unquoted in SQL (`:151`, `:199`, `:222`, `:283`) — a syntax error on Postgres. |
| Also | Route dispatch is broken: the file lives at `app/api/office/v1/media/route.ts`, so `segments = ["api","office","v1","media"]` and `segments[2]` is always `"v1"`; every branch (`:69`, `:116`, `:196`, `:216`, `:250`) is unreachable, falling through to `400 "Unknown media action"` (`:293`). This is the Phase-0 verified "Office media API dead (400 on every request), uploads discarded". |
| Domains depending on it | Office desktop integration → Properties media |
| Status | **BROKEN** (four independent defects) |

### S4 — In-memory, module-level `Map` stores (process-local, lost on restart, not shared across instances)

| Module | Line | What it holds | Domain | Consequence |
|---|---|---|---|---|
| `lib/land/saved-land.ts` | `:3` `const store = new Map<string, SavedLand>()` | **User-saved land parcels** — the primary artefact of FindMyLand | Land | User data lost on every restart; invisible to a second instance. Also `app/api/land/route.ts:34,57-61` trusts a **client-supplied `ownerId`** with no session check — any caller can read any owner's lands |
| `lib/land/quote.ts` | `:3` `const quotes = new Map<string, QuoteRequest>()` | **Surveyor quote requests** (measurement, boundary survey, valuation, GIS) — a commercial lead surface | Land / Services | Quote requests silently lost on restart |
| `lib/land/resolve-store.ts` | `:9` `const store = new Map<string, StoredResult>()`, TTL 1 h (`:10`) | Land resolution results shared by id | Land | Shared/permalink land results break across restart and across instances |
| `lib/cache.ts` | `:3` `const cache = new Map<string, CacheEntry>()`, 30 s default TTL | Generic response cache | Ads, News | Per-process only |
| `lib/cache/cache.service.ts` | `:1` `let memoryCache = new Map(...)` | **Second, independent cache implementation** with a different API (`getCache`/`setCache`/`clearCachePattern`) | — | Duplication: two caches, neither aware of the other |
| `lib/security/rate-limit.ts` | `:65` `private buckets = new Map<string, Bucket>()` | Auth rate limiting (login, register, OTP, password reset, office pairing, office sync — `:5-18`) | Identity, Office | Rate limits are per-process: N instances ⇒ N× the intended limit |
| `lib/amrs/security.ts` | `:32` `const store: Map<string, RateLimitEntry> = new Map()` | **Second, independent rate limiter** (60 req/min default, `:18-21`) | AMRS, Geo, Land, News | Duplication: two rate limiters with different algorithms and no shared state |
| `lib/i18n/core.ts` | `:8-9` `fallbackFlatCache`, `dbFlatCache` | Translation bundles per locale | i18n (all domains) | Stale translations per process after an admin edit |

**Status:** these are the only *server-side* writable stores that actually work under Node.
**Incompatibility:** none of them survive a restart or a horizontal scale-out; two of them
(`saved-land`, `quote`) hold user-authored business data, not cache.

### S5 — Database columns used as structured blobs

| Pattern | Evidence | Domain |
|---|---|---|
| JSON serialised into a `TEXT` column (D1-shim world) | `sponsors.placements` `'["header","content","footer"]'` (`lib/content-schema.ts`, parsed at `app/api/advertisers/route.ts:52-57`); `ad_campaigns.countries/cities/languages/devices/channels` (`lib/content-schema.ts:85`); `sponsor_plans.features` (`lib/content-schema.ts:537`); `audit_logs.metadata` (`lib/services/audit.ts:25`); `sponsor_activity_logs.old_values/new_values` (`lib/services/audit.ts:52`); `office_realtime_events.payload` (`lib/integration/realtime.ts:38`) | Advertising, Commercial, Audit, Office |
| Native `jsonb` (Drizzle/Postgres world) | `saved_searches.filters` (`lib/db/schemas/properties-schema.ts:102`); `ad_campaigns.targeting` (`lib/db/schemas/advertising-schema.ts:15`); `land_documents.metadata` (`lib/land/storage/project-storage.ts:38`) | Properties, Advertising, Land |
| **Incompatibility** | The same logical concept (targeting) is a JSON-in-TEXT string in one system and a `jsonb` column in the other — on the same table name `ad_campaigns` (see "Table-name collisions" below). A `JSON.parse` on a `jsonb` value, or a `->>` on a TEXT value, fails. | — |
| **No BLOB/BYTEA column exists anywhere** | `grep -rniE "\bblob\b|bytea|binary\(" lib/*.ts lib/**/*.ts drizzle*/*.sql` → no binary column in any schema. Confirms S1-S3: the platform has no byte storage of any kind in its own database. | — |

### S6 — Static repository assets (`public/`)

| Field | Value |
|---|---|
| Evidence | `app/admin/advertisers/advertiser-admin-client.tsx:71-74,86` — banner presets `/sponsors/oman-gold.webp`, `/sponsors/saudi-emerald.webp`, `/sponsors/turkiye-crimson.webp`, `/sponsors/arab-blue.webp`; default in schema `db/schema.ts:139` (`bannerUrl … .default("/sponsors/arab-blue.webp")`) |
| Domains | Advertising (sponsor/advertiser banner art) |
| Status | PRESENT |
| Incompatibility / naming drift | The paths are still `/sponsors/…` after the sponsor→advertiser rename; the JSX source keeps the lowercase `sponsors` directory while the surrounding product vocabulary says advertiser. A rename of the directory would silently 404 every banner. |

### S7 — Desktop local filesystem paths

| Field | Value |
|---|---|
| Configured roots | `AkarDB.sqlite` table `Settings`: `StoragePath1`, `StoragePath2`, `DocumentsBasePath`, `AutoBackupPath`, `LogoPath`, `PrintBackgroundPath` (commands `SelectStoragePath1Command`, `SelectStoragePath2Command`, `SelectBackupPathCommand` — `inv/dll_strings.txt:3017-3018,3005`) |
| Per-record file paths | `PostDatedChecks.CheckImagePath`, `PowersOfAttorney.PdfPath`, `ESignatures.SignatureImagePath`, `SaleContracts.ContractImagePath`/`Witness1ImagePath`/`Witness2ImagePath`, `OfficeAuthContracts.SignedContractImagePath`/`Witness*IdImagePath`, `Contracts.ContractImagePath`, `MaintenanceTickets.AttachmentPath`, `Users.AvatarPath`, `AdCampaigns.ImagePath` (all `AkarApp_LIVE/AkarDB.sqlite`) |
| Licence file | `GetLicenseFilePath`, `LicenseFileName` (`inv/dll_strings.txt:4753,5156`) |
| Domains | Desktop: contracts, e-signature, PoA, cheques, maintenance, property attachments, branding, licensing |
| Status | FULL (desktop) |
| **Incompatibility with the web** | The desktop stores **absolute local paths**; the web stores **URL strings** (S2). There is no path→URL translation layer anywhere. `app/api/office/v1/media/route.ts` was evidently intended to be that bridge and is dead (S3). Any desktop→web sync of a document therefore carries a path the web cannot resolve, and any web→desktop sync carries a URL the desktop cannot open offline. |

### S8 — Desktop local SQLite database

| Field | Value |
|---|---|
| File | `AkarApp_LIVE/AkarDB.sqlite`, **55 tables** (verified by `sqlite_master` enumeration) |
| Domains | Everything on the desktop: Properties, Clients, Contracts, Treasury/Ledgers, Commissions, Radar, Ads, Users/RBAC, Leads |
| Status | FULL (desktop-only) |
| Incompatibility | Integer autoincrement PKs (`PK_PropertyInstallments … AUTOINCREMENT`, `inv/dll_strings.txt:9`) vs the web's `uuid`/`text` PKs. No shared id space, so no record can be correlated across desktop and web without a mapping table — and none exists. |

### S9 — Desktop cloud backup / sync queue

| Field | Value |
|---|---|
| Evidence | `Settings.CloudBackupUploadUrl`, `Settings.EnableCloudBackup`, `Settings.CloudBackupIntervalMinutes` (`AkarDB.sqlite`); `CloudBackupSyncService+<RunCycleAsync>` (`inv/dll_strings.txt:1688,2134`); migration `20260306031543_AddBackupAndLanguageSettings` (`:1415`); local queue table `CloudSyncQueue` (TableName, RecordId, Operation, PayloadJson, SyncStatus, SyncAttempts, LastAttemptAt, ErrorMessage) |
| Target | `https://akar-promax.com/api/program/sync` (`inv/dll_urls.txt`) |
| Domains | Desktop → cloud, all tables |
| Status | **MISSING on the web** — no `app/api/program/*` route exists in `cur/`. The web's device integration is `app/api/office/v1/*` with a different contract (`lib/integration/sync.ts`, bearer device tokens via `lib/integration/office-auth.ts`) |
| Incompatibility | Two unrelated sync protocols: the shipped desktop binary speaks `/api/program/sync`; the web implements `/api/office/v1/sync`. The shipped desktop cannot talk to the current web platform. |

### Storage: negative findings (verified absences)

| Claim | Verification |
|---|---|
| **No local/disk writes in the web app** | `grep -rn "writeFile\|createWriteStream\|mkdir\|fs/promises\|from \"fs\"" app lib src components scripts` → only `scripts/apply-oauth-schema.ts:2` and `scripts/apply-auction-fields.ts:2`, both `readFileSync` (read-only, build-time scripts). No runtime write path exists. |
| **No base64 / data-URL persistence** | `grep -rn "base64\|toDataURL\|data:image"` → `lib/ads/events.ts:22-57` (base64url **tracking-token** encode/decode, not storage), `lib/geo/security-gate.ts:66` (an *injection blocklist* pattern), `src/components/ui/Checkbox.tsx:38` (a static inline SVG in CSS). No user content is stored as base64 anywhere. |
| **No S3/GCS/Azure/Redis object client** | `package.json` dependencies contain no storage SDK. `ioredis` **is** a dependency but `grep -rn "ioredis\|new Redis" app lib` → **no importer**: an unused dependency, and neither cache (S4) uses it. |

---

### Three database providers behind one interface

| Provider | Entry point | Selection | Notes |
|---|---|---|---|
| Postgres | `lib/pg-runtime.ts:224-236` `getPgRuntimeDb()` | `lib/runtime-db.ts:56-58` when `DB_PROVIDER=postgres` | A hand-written **D1-emulation adapter** (`class PgRuntimeDb implements D1Database`, `:181`) that rewrites D1 SQL into Postgres at `:70-88` (`translateSql`: backtick→double-quote, `INSERT OR IGNORE`→`ON CONFLICT DO NOTHING`, `DATETIME`→`TIMESTAMP`, `datetime('now')`→`now()`) and expands `?1`/`?` placeholders to `$N` at `:95-106` |
| MySQL | `lib/mysql-runtime.ts:28` `getMysqlRuntimeDb()` | `lib/runtime-db.ts:59-61` when `DB_PROVIDER=mysql` | Second D1-emulation adapter |
| Cloudflare D1 | `lib/runtime-db.ts:62-65` — `(await import("cloudflare:workers")).env.DB` | `DB_PROVIDER=d1`, requires the binding (`lib/runtime-db.ts:19-23` throws `SchemaModeError` otherwise) | The native dialect the other two emulate |

**Plus a fourth, unmediated path:** `lib/db/index.ts:1-14` — a *direct* Drizzle + `postgres-js`
connection (`export const db` module-level singleton at `:8`, plus `getDb()` returning a
fresh client at `:10-13`). This bypasses `runtime-db.ts`, `translateSql`, and all provider
selection. **It only ever works on Postgres.**

**Plus a fifth:** `lib/mysql-db.ts:22` `getMySqlDb()` — Drizzle over `mysql2` bound to
`db/mysql/schema`. Exactly **one** consumer: `app/api/auth/verify/route.ts:7,59`.
So the email-verification route talks to MySQL through Drizzle while its sibling
`app/api/auth/register/route.ts` talks to Postgres through `lib/db`.

#### Which domains use which layer (SOURCE VERIFIED by import scan of `app/api/**`)

| Layer | Domains |
|---|---|
| `lib/db` (Drizzle → Postgres, direct) | Properties, Property-requests, Saved-searches, Offer-types, Messages, Auctions, Community, Knowledge, Vehicles, Companies, Offices, Advertising (`/api/advertising/*`), Contracts, Contact/Leads, Geo (`/api/geo`), Currencies, Professionals, AMRS, Auth (register/login/session) |
| `lib/runtime-db` (D1 shim → PG \| MySQL \| D1) | Ads (`/api/ads/*`, `/api/admin/ads/*`), Advertisers + advertiser-*, Office-links, News, i18n, Office v1 integration, Services marketplace (`/api/service-*`, `/api/services/*`), Admin audit/stats/moderators/taxonomy, Land (partly) |
| `lib/mysql-db` (Drizzle → MySQL) | `app/api/auth/verify` only |

**Consequence — the split runs through single domains.** `app/api/services/*` imports `@/lib/db` +
`lib/db/schemas/services-schema` (Drizzle/PG) while `app/api/service-requests/*` imports
`@/lib/runtime-db` + `@services/marketplace` (raw SQL). Both address tables called
`service_requests` and `service_offers`. See collisions below.

### Drizzle schema files vs raw-SQL "ensure" paths

#### The 11 "ensure" paths

| # | Function | File:line | Tables it creates | Invoked from |
|---|---|---|---|---|
| 1 | `ensureContentSchema` | `lib/content-schema.ts:567` | `ak_content_schema_meta`, `audit_logs`, `moderator_scopes`, `news`, `office_links`, `sponsors`, `sponsor_access`, `sponsor_events`, `sponsor_profiles`, `sponsor_users`, `sponsor_branches`, `sponsor_plans`, `sponsor_subscriptions`, `sponsor_contracts`, `sponsor_documents`, `sponsor_payments`, `sponsor_invoices`, `sponsor_activity_logs`, `ad_assets`, `ad_campaigns`, `ad_creatives`, `ad_events` (22) | `lib/pg-runtime.ts:227` (every PG boot) and `lib/runtime-db.ts:64` (every D1 boot) |
| 2 | `ensureAdSchema` | `lib/ad-schema.ts:170` | `ad_impressions`, `ad_clicks`, `ad_conversions`, `ad_daily_statistics` (4) | `lib/content-schema.ts:588`, `lib/mysql-runtime.ts:639`, **and per-request** at `app/api/admin/ads/route.ts:123`, `app/api/ads/request/route.ts:54` |
| 3 | `ensureI18nSchema` | `lib/i18n-schema.ts:61` | `i18n_namespaces`, `i18n_keys`, `i18n_translations`, `i18n_versions`, `i18n_change_log` (5) | `lib/content-schema.ts:589`, `lib/mysql-runtime.ts:640` |
| 4 | `ensureServicesSchema` | `lib/services-schema.ts:141` | `service_categories`, `service_listings`, `service_requests`, `service_offers`, `service_orders`, `service_messages`, `service_reviews`, `service_disputes`, `service_bookmarks` (9) | `lib/content-schema.ts:590`, `lib/mysql-runtime.ts:641` |
| 5 | `ensureServicesMarketplaceSchema` | `lib/services-marketplace-schema.ts:370` | `service_provider_profiles`, `service_provider_categories`, `service_provider_documents`, `service_provider_portfolio`, `service_request_answers`, `service_request_attachments`, `service_request_matches`, `service_request_status_history`, `service_offer_revisions`, `service_job_timeline`, `service_message_threads`, `service_message_participants`, `service_notifications`, `service_outbox_events`, `service_reports`, `service_marketplace_settings` (16) | `lib/content-schema.ts:591`, `lib/mysql-runtime.ts:642` |
| 6 | `ensurePropertiesSchema` | `lib/properties-schema.ts:74` | `property_categories`, `property_types`, `property_listings` (3) | `lib/content-schema.ts:592`, `lib/mysql-runtime.ts:643` |
| 7 | `ensureCompanySchema` | `lib/company-schema.ts:29` | `company_specialties`, `organization_specialties` (2) | `lib/content-schema.ts:593`, **and per-request** at `app/api/admin/companies/taxonomy/route.ts:15` and `[id]/route.ts:18,53,87` |
| 8 | `ensureIntegrationSchema` | `lib/integration/schema.ts:158` | `office_devices`, `office_device_credentials`, `office_pairing_codes`, `office_sync_operations`, `office_radar_queries`, `office_notification_rules`, `office_notification_deliveries`, `office_news_deliveries`, `office_realtime_events` (9) | `lib/content-schema.ts:594` **only** |
| 9 | `ensureNewsSchema` | `lib/news/schema.ts:126` | `news_extended`, `news_sources`, `news_placements`, `news_events`, `news_delivery_counters` (5) | `lib/content-schema.ts:595`, `lib/mysql-runtime.ts:644` |
| 10 | `ensureMysqlSchema` | `lib/mysql-runtime.ts:630` | the 22 content tables (MySQL dialect, `:…-628`) then chains 2,3,4,5,6,9 | `lib/mysql-runtime.ts` boot |
| 11 | `ensurePgIdentitySchema` | `lib/db/pg-identity-schema.ts:423` | `users`, `verification_challenges`, `session_revocations`, `audit_events`, `organizations`, `organization_members`, `organization_branches`, `verification_records`, `reputation_profiles`, `reputation_evaluations`, `reputation_history` (11) — **native Postgres SQL, not through the D1 shim** | `app/api/admin/verifications/route.ts:20`, `[id]/route.ts:20`, `expire/route.ts:10`, `app/api/admin/organizations/[id]/review/route.ts:22` (per-request), and `scripts/…` via `npm run db:migrate:pg` |

**Schema latch:** `lib/content-schema.ts:567-585` short-circuits the replay when
`isContentSchemaApplied()` is true, but only when `isProduction()` or `DB_PROVIDER` is postgres/mysql.
In dev-on-D1, **all ~75 tables are re-DDL'd on every process start**.

#### The 3 migration directories

| Dir | Config | Dialect | Tables created | Status |
|---|---|---|---|---|
| `drizzle-pg/` (10 files, `0000`…`0016`) | `drizzle.config.ts:1-22` (`out: "./drizzle-pg"`, 12 schema files) | Postgres | `users`, `verification_challenges`, `audit_events`, `organizations`, `organization_members`, `organization_branches`, `verification_records`, `reputation_profiles`, `reputation_evaluations`, `reputation_history`, `user_oauth_accounts`, `auction_terms`, `auction_terms_acceptance`, `auction_awards`, `auction_contracts`, `auction_contract_signatures`, `auction_events`, `auction_bids`, `limited_auction_organizers` (19) | ACTIVE — but note `drizzle.config.ts` lists **12 schema files** while the migrations only cover identity + auctions |
| `drizzle-mysql/` (2 files + `seed.sql` + `services-translations/`) | `drizzle.mysql.config.ts:1-9` (`schema: "./db/mysql/schema.ts"`) | MySQL | the 25 old commercial/ad/identity tables + `news` | **STALE** — generated from `db/mysql/schema.ts`, which is byte-identical to `hist/old-tag/db/mysql/schema.ts` and predates every services/properties/integration/news-extended table |
| `drizzle/` (3 files, `0000`…`0002`) | **no config points at it** — `drizzle.config.ts` → `drizzle-pg`, `drizzle.mysql.config.ts` → `drizzle-mysql` | SQLite/D1 | `roles`, `users`, `sessions`, `verification_challenges`, `policy_documents`, `audit_logs`, `sponsors`, `sponsor_access`, `sponsor_events`, `ad_assets`, `ad_campaigns`, `ad_creatives`, `ad_events` (13) | **ORPHANED** — no drizzle-kit config, no runner in `package.json` scripts (`db:generate`, `db:migrate:pg`, `db:generate:mysql`, `db:migrate:mysql` — none targets `drizzle/`) |

#### `db/` and `db/mysql/` (the old-generation schema, still in tree)

| File | Importers | Verdict |
|---|---|---|
| `db/schema.ts` (20 155 bytes, 25 sqliteTables) | **zero** (`grep '@/db/schema'` → no hits) | DEAD-BUT-PRESENT; byte-identical to `hist/old-tag/db/schema.ts` |
| `db/index.ts` | **zero** | DEAD-BUT-PRESENT; top-level `import { env } from "cloudflare:workers"` (`:1`) |
| `db/mysql/schema.ts` | `lib/mysql-db.ts:4`, `app/api/auth/verify/route.ts:4` | LIVE for one route; re-exports `db/mysql/i18n-schema` (`:560`) and `db/mysql/services-schema` (`:561`) |
| `db/mysql/services-schema.ts`, `db/mysql/i18n-schema.ts` | via the above | LIVE only through the MySQL Drizzle path |

### Tables created by an "ensure" path with NO migration

**All 75 of them.** No `ensure*` table appears in `drizzle-pg/`, and `drizzle-mysql/` only covers the
22 content tables in the MySQL dialect (stale). Full list by owner:

| Owner | Tables with no migration |
|---|---|
| `lib/content-schema.ts` | `ak_content_schema_meta`, `moderator_scopes`, `news`, `office_links`, `sponsors`, `sponsor_access`, `sponsor_events`, `sponsor_profiles`, `sponsor_users`, `sponsor_branches`, `sponsor_plans`, `sponsor_subscriptions`, `sponsor_contracts`, `sponsor_documents`, `sponsor_payments`, `sponsor_invoices`, `sponsor_activity_logs`, `ad_assets`, `ad_campaigns`, `ad_creatives`, `ad_events`, `audit_logs` (22) |
| `lib/ad-schema.ts` | `ad_impressions`, `ad_clicks`, `ad_conversions`, `ad_daily_statistics` (4) |
| `lib/i18n-schema.ts` | `i18n_namespaces`, `i18n_keys`, `i18n_translations`, `i18n_versions`, `i18n_change_log` (5) |
| `lib/services-schema.ts` | `service_categories`, `service_listings`, `service_requests`, `service_offers`, `service_orders`, `service_messages`, `service_reviews`, `service_disputes`, `service_bookmarks` (9) |
| `lib/services-marketplace-schema.ts` | 16 `service_*` tables (listed above) |
| `lib/properties-schema.ts` | `property_categories`, `property_types`, `property_listings` (3) |
| `lib/company-schema.ts` | `company_specialties`, `organization_specialties` (2) |
| `lib/integration/schema.ts` | 9 `office_*` tables (listed above) |
| `lib/news/schema.ts` | `news_extended`, `news_sources`, `news_placements`, `news_events`, `news_delivery_counters` (5) |

Plus **1 phantom table** created by nothing at all: `office_media_upload_sessions`
(written at `app/api/office/v1/media/route.ts:97,171`, defined nowhere).

### Drizzle-declared tables with NO migration and NO ensure path

54 of the 73 `pgTable(...)` declarations in `lib/db/schema.ts` + `lib/db/schemas/*.ts` have neither a
`drizzle-pg/` migration nor an `ensure*` creator. Under `DB_PROVIDER=postgres` on a fresh database
these tables simply do not exist, and the routes below fail at first query.

| Schema file | Tables with no creator |
|---|---|
| `lib/db/schemas/properties-schema.ts` | `properties`, `property_media`, `property_favorites`, `saved_searches`, `property_requests`, `property_request_offers`, `property_inquiries`, `property_views` (8) — **`properties` alone has 83 consuming files** |
| `lib/db/schemas/services-schema.ts` | `service_providers`, `service_jobs`, `service_portfolio` (3) — the other 4 collide (below) |
| `lib/db/schemas/messages-schema.ts` | `message_threads`, `message_participants`, `messages`, `message_attachments` (4) |
| `lib/db/schemas/geo-schema.ts` | `countries`, `governorates`, `cities`, `districts`, `streets` (5) |
| `lib/db/schemas/auctions-schema.ts` | `auctions`, `auction_participants`, `certified_professionals`, `engineering_inspections`, `valuations` (5) |
| `lib/db/schemas/land-schema.ts` | `land_parcels`, `land_documents`, `land_valuations`, `land_favorites` (4) |
| `lib/db/schemas/leads-schema.ts` | `leads`, `lead_activities`, `lead_assignments` (3) |
| `lib/db/schemas/community-schema.ts` | `forum_categories`, `forum_topics`, `forum_posts` (3) |
| `lib/db/schemas/roles-schema.ts` | `admin_roles`, `admin_role_assignments`, `user_business_cards` (3) |
| `lib/db/schemas/advertising-schema.ts` | `ad_analytics`, `featured_properties`, `news_ticker_items` (3) — the other 2 collide (below) |
| `lib/db/schemas/offer-types-schema.ts` | `property_offer_types`, `property_offers` (2) |
| `lib/db/schemas/vehicle-schema.ts` | `vehicles`, `locations` (2) |
| `lib/db/schemas/knowledge-schema.ts` | `knowledge_items` (1) |
| `lib/db/schemas/currency-schema.ts` | `currencies` (1) |
| `lib/db/schema.ts` | `session_revocations` — covered by `ensurePgIdentitySchema` but **not** by any `drizzle-pg` migration (1) |

### Table-name collisions: the same name defined twice, incompatibly, on the same database

`CREATE TABLE IF NOT EXISTS` means the schema that boots first wins and the other consumer queries
columns that do not exist. Because `ensureContentSchema` runs at connection setup
(`lib/pg-runtime.ts:227`) and the Drizzle side has no creator at all, **the ensure-path always wins**.

| Table | Ensure-path definition | Drizzle definition | Broken consumer |
|---|---|---|---|
| `ad_campaigns` | `lib/content-schema.ts:74-86` — `id TEXT`, `internal_name`, `advertiser_name`, `media_url`, JSON-in-TEXT targeting | `lib/db/schemas/advertising-schema.ts:5-19` — `id uuid`, `name`, `type`, `targeting jsonb`, `max_views`, `max_clicks` | `lib/advertising/core/matching.engine.ts`, `app/api/advertising/match/route.ts` |
| `ad_creatives` | `lib/content-schema.ts` (`campaign_id TEXT`, `media_url`, `position`, `duration_seconds`) | `lib/db/schemas/advertising-schema.ts:21-25` (`campaign_id uuid`, `language`, `title`) | same |
| `service_requests` | `lib/services-schema.ts:32-50` — `id VARCHAR(36)`, `customer_user_id`, `category_id`, `country_code`, `city_id`, `title_key`, `budget_min/max` | `lib/db/schemas/services-schema.ts:46-67` — `id uuid`, `user_id uuid`, `title`, `description`, `urgency`, `governorate`, `radius`, `budget decimal` | `app/api/services/route.ts`, `app/api/service-analytics/route.ts`, `lib/services/matching/professional.matcher.ts` **vs** `app/api/service-requests/*`, `lib/services/marketplace.ts` |
| `service_offers` | `lib/services-schema.ts:51-57` (`request_id VARCHAR(36)`, `provider_user_id`, `price INTEGER`) | `lib/db/schemas/services-schema.ts:69-71` (`request_id uuid`) | `app/api/service-analytics/route.ts`, `lib/command-center/service.ts` |
| `service_categories` | `lib/services-schema.ts` (VARCHAR(36) id) | `lib/db/schemas/services-schema.ts` (uuid id) | 7 consumers incl. `app/admin/ads/ads-admin-client.tsx`, `app/api/admin/ads/route.ts` |
| `service_reviews` | `lib/services-schema.ts` | `lib/db/schemas/services-schema.ts` | `app/api/service-analytics/route.ts`, `lib/command-center/service.ts` |
| `auction_bids` | — | declared **twice in Drizzle**: `lib/db/schemas/properties-schema.ts` *and* `lib/db/schemas/auctions-schema.ts` | `app/api/auctions/*` (5 files) |
| `auction_terms`, `auction_terms_acceptance` | — | declared **twice in Drizzle**: `auctions-schema.ts` *and* `auction-hardening-schema.ts` (the latter has a `drizzle-pg` migration, the former does not) | `lib/auctions/policy.ts`, `lib/auctions/settlement.ts` |

### Migration tables with no code consumer

| Table | Migration | Consumers |
|---|---|---|
| `user_oauth_accounts` | `drizzle-pg/0015_add_user_oauth_accounts.sql` | `lib/auth/oauth.ts` only — and OAuth is a Phase-0 verified "100% broken, callbacks 500" |
| `auction_contract_signatures` | `drizzle-pg/0012_auction_contract_closure_f3.sql` | `app/api/auctions/[id]/contract/sign/route.ts` only |
| `limited_auction_organizers` | `drizzle-pg/0014_limited_auction_organizers.sql` | `app/api/admin/auction-organizers/route.ts`, `lib/auctions/policy.ts` |
| `policy_documents` | `drizzle/0000` + `drizzle-mysql/0000` | **zero** — `grep -rn policy_documents app lib` returns nothing |
| `roles` (table) | `drizzle/0000` + `drizzle-mysql/0000` | **zero** — the product uses `src/constants/roles.ts` and `admin_roles` instead |
| `sessions` | `drizzle/0000` + `drizzle-mysql/0000` | **zero** — superseded by the JWT cookie (`lib/auth/session.ts:11`) + `session_revocations` |
| entire `drizzle/` directory (13 tables) | no config, no runner | **orphaned migration set** |
| `sponsor_plans`, `sponsor_subscriptions`, `sponsor_contracts`, `sponsor_documents`, `sponsor_payments`, `sponsor_invoices`, `sponsor_activity_logs` | `drizzle-mysql/0000` | **zero readers/writers** (see fragment 10, COMM-LEG-030) |

### Provider parity gap

`lib/mysql-runtime.ts:630-649` (`ensureMysqlSchema`) chains `ensureAdSchema`, `ensureI18nSchema`,
`ensureServicesSchema`, `ensureServicesMarketplaceSchema`, `ensurePropertiesSchema`, `ensureNewsSchema`
— but **omits** `ensureCompanySchema` and `ensureIntegrationSchema`, both of which
`lib/content-schema.ts:593-594` does call.

⇒ Under `DB_PROVIDER=mysql`, `company_specialties`, `organization_specialties` and **all nine
`office_*` integration tables** are never created. The entire Office/desktop integration domain
(pairing, sync, radar, notifications, realtime, news delivery) cannot run on MySQL.
Additionally, `ensurePgIdentitySchema` is Postgres-only native SQL, so identity/AMRS cannot run on
MySQL or D1 at all.

---



---

# PART II — ROUND 2 COVERAGE (V1 + DESKTOP)

V1 architecture, data models and protocol contracts recovered from actual source. Read alongside Part I.



## Round 2 — V1 Messaging & Notifications

## V1 messaging architecture

**V1 messaging is a second, standalone server process, not part of the V1 REST API.**

| Layer | What V1 actually does | Evidence |
|---|---|---|
| **Process** | A dedicated Express + Socket.IO server on port `3008`, launched by `npm run chat:server` → `npx tsx server/chat-server.ts`. It is a *different process* from the main V1 API (`server/api/src/index.ts`, port `PORT`). | `v1/server/chat-server.ts:12`, `v1/package.json:12`, `v1/server/.env:2` |
| **Transport** | Socket.IO v4 WebSocket, rooms `conv_<id>` (per conversation), `user_<id>` (per user, presence + block fan-out), `oversight_<id>` (per moderated conversation). CORS is wide open: `origin:"*"`. | `v1/server/chat-server.ts:210-212,567,572,594,726` |
| **Storage** | Raw `node:sqlite` (`DatabaseSync`) against `server/../prisma/dev.db`. **All nine messaging tables are created by hand-written `CREATE TABLE IF NOT EXISTS` statements at process start** — there is no ORM and no migration. | `v1/server/chat-server.ts:4,27-30,33-132` |
| **Second datastore** | The Prisma API keys off `server/api/prisma/schema.prisma` with `DATABASE_URL="file:./dev.db"` → `server/api/prisma/dev.db`. The chat server opens `v1/prisma/dev.db`. **These are two different SQLite files.** The chat DB carries its own shadow `users` and `notifications` tables. | `v1/server/api/.env:1`, `v1/server/api/prisma/schema.prisma:7-9`, `v1/server/chat-server.ts:27,33-37,117-123` |
| **Identity key** | `INTEGER` user id, taken from the JWT `id` claim and **upserted into the chat DB's own `users` table on every connection** from JWT claims (`fullName`, `role`) — never read from the API's user table. Email is written as `""`. | `v1/server/chat-server.ts:138-141,566` |
| **Auth** | HS256 JWT verified with `JWT_SECRET`; socket handshake `auth:{token,userId}`; HTTP `Authorization: Bearer`. Role comes from the token claim, not from a DB lookup. | `v1/server/chat-server.ts:13-17,215-222,494-505` |
| **Conversation model** | `conversations(type ∈ {private,group}, name, group_avatar, created_by, created_at, updated_at)`. **There is no context column, no entity foreign key, no `thread_type`/`thread_id`.** A V1 conversation is not attached to anything. | `v1/server/chat-server.ts:38-43`; `.cjs` variant adds the CHECK constraint `v1/server/chat-server.cjs:36` |
| **Participant model** | `conversation_participants(conversation_id, user_id, role ∈ {member,admin,owner}, joined_at, last_read_at, is_deleted)`, unique on `(conversation_id,user_id)`. Soft-leave via `is_deleted`. | `v1/server/chat-server.ts:44-53`, `v1/server/chat-server.cjs:50` |
| **Message model** | `messages(conversation_id, sender_id, type, content, iv, metadata, file_url, is_deleted, is_edited, reply_to_id, created_at, updated_at)` with `reply_to_id → messages(id) ON DELETE SET NULL`. | `v1/server/chat-server.ts:54-64` |
| **Encryption** | Server-side AES-256-GCM on `type='text'` bodies only. See §"Encryption claim". | `v1/server/encryption.ts:1-51`, `v1/server/chat-server.ts:9,24,647-648` |
| **Client** | One React context (`ChatProvider`) owning a single socket, mounted app-wide in `App.tsx`, feeding three surfaces: floating `ChatWidget`, `/messages` (`ChatApp`), and admin oversight inside `ChatWindow`. | `v1/src/contexts/ChatContext.tsx:65-202`, `v1/src/App.tsx:363-382` |
| **Second server implementation** | `server/chat-server.cjs` (432 lines) is an **older, plaintext, CommonJS twin** against a *third* database `server/chat.sqlite`. It has no encryption, no `blocked_users`, no `load-older`, no `edit-message`/`delete-message`, no admin REST API, and its `request-oversight` has no access-log write. It is not referenced by any npm script. | `v1/server/chat-server.cjs:15,60-78,109-119,291-411`; absent from `v1/package.json:12` |

**Architectural consequence for the unified core:** V1 proves out realtime, presence, receipts,
oversight and at-rest encryption, but it has **no conversation-to-entity binding whatsoever**. The
context taxonomy that V2 has (`MSG-001`…`MSG-015`) does not exist in V1 in any form. The two systems
are complementary, not overlapping: V1 owns the *live conversation experience*, V2 owns the
*contextual thread model*.

---

## V1 Socket.IO event contract

`io.use` middleware (`v1/server/chat-server.ts:494-505`) is the **only** authorization gate on the
entire socket surface. It proves the caller holds a valid JWT. **No handler below re-checks that the
caller is a participant of the conversation it names.** Client→server events are marked ⬆, server→
client ⬇.

| Event | Dir | Payload | Authorization | Side effects | Persistence |
|---|---|---|---|---|---|
| *(handshake)* | ⬆ | `auth:{token, userId}` | `jwt.verify(token, JWT_SECRET)`; `socket.data.{userId,fullName,role}` from claims (`:499-503`) | Rejects with `Error("Unauthorized")` / `Error("Invalid token")` | none |
| *(connection)* | — | — | authenticated | `upsertUser` from JWT claims; joins `user_<id>`; joins `conv_<id>` for every conversation the user participates in; broadcasts `user-online` to **all** sockets (`:566-572`) | `users` upsert, `last_seen` |
| `init` | ⬇ | `{userId, conversations[], onlineUsers[]}` — each conversation `{id,name,isGroup,avatar,participants[],lastMessage{text,senderId,time},unread,online}` | own conversations only (`getUserConvs` filters `cp.user_id = ?`) | last message decrypted server-side for the preview (`:552`) | read-only |
| `join-conversation` | ⬆ | `{convId, before?}` | **NONE.** Joins `conv_<cid>` and reads the last 30 messages for *any* `convId` an authenticated user names (`:592-607`) | joins room; marks all unread as read; emits `messages-read` to the room; emits `conversation-messages` | inserts `message_read_receipts` rows (`:618`) |
| `conversation-messages` | ⬇ | `{convId, messages[], hasMore}` — 30/page, `hasMore` via fetch-31-drop-1 | — | text decrypted per message (`:514`) | read-only |
| `load-older` | ⬆ | `{convId, before}` (message id cursor) | **NONE** (`:628-641`) | emits `older-messages` | read-only |
| `older-messages` | ⬇ | `{convId, messages[], hasMore}` — 30/page | — | — | read-only |
| `send-message` | ⬆ | `{convId, text, type='text', attachment?, replyToId?}` | **NONE** — no participant check, no block check, no length cap, no type whitelist (`:644-665`) | encrypts text, inserts, bumps `conversations.updated_at`, broadcasts `new-message` to `conv_<cid>` | `messages` insert; `attachment` JSON into `metadata`; `attachment.url` into `file_url` |
| `new-message` | ⬇ | `{id,convId,senderId,senderName,text,type,attachment?,time,read,isMine,iv?}` | broadcast to room members present | client plays sound + desktop notification when `document.hidden` and not muted (`ChatContext.tsx:133-137`) | — |
| `mark-read` | ⬆ | `convId` (bare value, **not** an object) | **NONE** (`:668-673`) | inserts receipts for every unread message not sent by the caller; emits `messages-read` | `message_read_receipts` |
| `messages-read` | ⬇ | `{convId}` | — | client sets every message in that conversation `read:true`, zeroes unread (`ChatContext.tsx:163-166`) | — |
| `typing` | ⬆ | `{convId, isTyping}` | **NONE** — relays into any room (`:676-680`) | `socket.to(conv_<id>).emit("user-typing", …)` | none (ephemeral) |
| `user-typing` | ⬇ | `{userId, fullName, convId, isTyping}` | — | client shows "X is typing…" (`ChatWindow.tsx:334-340`) | none |
| `edit-message` | ⬆ | `{msgId, text}` | **ownership enforced in SQL**: `UPDATE … WHERE id=? AND sender_id=?`; zero-row result returns silently (`:203,683-693`) | re-encrypts, sets `is_edited=1`, broadcasts `message-edited` | `messages.content`, `is_edited`, `updated_at` |
| `message-edited` | ⬇ | `{msgId, text, senderId}` — **plaintext on the wire** | — | client patches the bubble | — |
| `delete-message` | ⬆ | `{msgId}` | **ownership enforced in SQL** (`:204,696-704`) | soft-deletes, broadcasts `message-deleted` | `messages.is_deleted=1` (row retained) |
| `message-deleted` | ⬇ | `{msgId}` | — | client removes the bubble; the *sender's* client copies it into a localStorage trash (`ChatContext.tsx:261-276`) | — |
| `block-user` | ⬆ | `{userId: targetId}` | authenticated only | inserts a block row; emits `user-blocked` into the **target's** room; echoes `blocked` | `blocked_users` insert |
| `user-blocked` | ⬇ | `{by}` | — | **no client handler exists** — `ChatContext.tsx` never subscribes to `user-blocked` | — |
| `unblock-user` | ⬆ | `{userId: targetId}` | authenticated only | deletes the block row; echoes `unblocked` | `blocked_users` delete |
| `request-oversight` | ⬆ | `{convId}` | **NONE — no admin check.** `socket.data.role` is read at `:502` and never consulted here. Any authenticated socket receives the **fully decrypted** transcript of any conversation id (`:724-742`) | joins `oversight_<cid>`; writes an access-log row attributing the access to the caller; emits `oversight-activated` then `oversight-data` | `moderation_access_logs` insert (`:736`) |
| `oversight-activated` / `oversight-deactivated` | ⬇ | *(no payload)* | — | client toggles the amber "admins monitoring" banner (`ChatWindow.tsx:236-245`) | — |
| `oversight-data` | ⬇ | `{convId, messages[] (each `{…, text: <plaintext>, encrypted:true, iv}`), decrypted:true}` | — | replaces the message pane | — |
| `stop-oversight` | ⬆ | `{convId?}` — falls back to `socket.data.oversightConvId` | authenticated only | leaves the oversight room | none |
| `user-online` / `user-offline` | ⬇ | `{userId}` | broadcast to **every** connected socket, including users with no relationship to the subject (`:568,754`) | client maintains a global `onlineUsers[]` | `users.last_seen` on disconnect (`:755`) |
| `disconnect` | ⬆ | — | — | broadcasts `user-offline`; stamps `last_seen` | `users.last_seen` |

**Events the client emits or handles that have no server counterpart:** none. **Server events with
no client handler:** `user-blocked`, `blocked`, `unblocked` (`ChatContext.tsx:112-197` subscribes to
13 events; these three are absent — the block UI is driven entirely from localStorage).

**Not implemented anywhere in V1:** create-conversation, add/remove participant, leave conversation,
delete conversation, forward message, react to message, pin message, report message, upload
endpoint (attachments are sent as `data:` URLs or `blob:` URLs — see `V1-MSG-020`).

---

## V1 messaging HTTP contract

Two separate HTTP surfaces exist and **they do not agree with each other**.

### A. Chat server REST (port 3008) — the one that works

| Endpoint | Payload / query | Authorization | Side effects | Persistence |
|---|---|---|---|---|
| `GET /api/admin/conversations/:id` | — | `Bearer` JWT **and** `decoded.role === "admin"` → 401 / 403 (`chat-server.ts:227-229`) | Returns the conversation, its participants, and **every message decrypted server-side** (`:243`); non-text bodies returned raw | writes `moderation_access_logs` (`:239`) |
| `GET /api/admin/audit-logs` | `?page` (≥1), `?limit` (1-50, default 20) | admin only (`:259-261`) | Returns `{logs, total, page, limit, pages}` joined to the moderator's `fullName` | read-only |
| `POST /api/admin/oversight` | `{conversationId, reason?}` | admin only (`:278-280`) | Creates a `moderation_requests` row **pre-approved by the requester themselves** (`status='approved'`, `reviewed_by = self`, `reviewed_at = now`, `:191-194`) **and** an access-log row | 2 inserts |
| `GET /health` | — | none | `{status, uptime}` | — |

Also mounted on the same process but out of messaging scope: `/api/payment-options/*`,
`/api/calculator/{mortgage,flexible,fixed}`, `/api/{listing-types,rent-options,sale-options,offer-types,filter-options}`,
`/api/properties/expanded/*` (`chat-server.ts:294-489`). Their presence on the chat port is an
architectural accident worth recording — a "delete the chat server" decision would silently delete
the installment calculators and the property payment-options API with it.

### B. Main API `adminRouter` (port `PORT`) — what the admin console actually calls

`v1/src/services/chatAdminService.ts` targets `apiRequest(...)` (the **main** API base), not port
3008. Result:

| Client call | Target | Server reality | Verdict |
|---|---|---|---|
| `fetchConversations(search)` → `GET /admin/conversations` | `chatAdminService.ts:3-6` | **route does not exist** in `server/api/src/routes/admin.ts` | 404 — the admin conversation list is permanently empty |
| `fetchConversationMessages(id)` → `GET /admin/conversations/:id` | `chatAdminService.ts:8-10` | not on the main API; the working one is on port 3008 | 404 |
| `sendSystemMessage(id,msg)` → `POST /admin/oversight {conversationId,message,type:"system"}` | `chatAdminService.ts:12-18` | `admin.ts:571-582` accepts `{action,targetId,details}` and only writes an `ActivityLog` row — **the message text is discarded** | writes an audit row, sends nothing |
| `closeConversation(id)` → `POST /admin/conversations/:id/close` | `chatAdminService.ts:20-22` | `admin.ts:585-589` — `res.json({success:true})` with **no body at all** | no-op that reports success |
| `fetchAuditLogs()` → `GET /admin/audit-logs` | `chatAdminService.ts:24-26` | not on the main API | 404 |
| `flagUser(userId,reason)` → `POST /admin/oversight {userId,action:"flag",reason}` | `chatAdminService.ts:28-34` | `admin.ts:571-582` reads `targetId`, not `userId` → the flag is logged with `userId: undefined` | audit row with no target |

`adminRouter` itself is correctly guarded: `adminRouter.use(requireAuth, requireRole("admin"))`
(`admin.ts:9`).

### C. Notification / push HTTP (main API)

| Endpoint | Auth | Notes |
|---|---|---|
| `GET /api/push/vapid-public-key` | none | Returns `process.env.VAPID_PUBLIC_KEY` **or a hard-coded placeholder string** (`server/api/src/index.ts:127`) |
| `POST /api/auction-enhancements/push/subscribe` | `requireAuth` | expects `{endpoint,p256dh,auth}` (`auction-enhancements.ts:20-27`) |
| `POST /api/auction-enhancements/push/unsubscribe` | `requireAuth` | `{endpoint}` (`:29-34`) |
| `GET /api/auction-enhancements/notifications` | `requireAuth` | `?limit`(50)/`?offset`; returns `{notifications, unreadCount}` (`:37-47`) |
| `POST /api/auction-enhancements/notifications/:id/read` | `requireAuth` | scoped by `userId` (`:49-54`, `notification-sender.ts:194-196`) |
| `POST /api/auction-enhancements/notifications/read-all` | `requireAuth` | `:56-61` |

**Defect:** `usePushNotifications` posts to `/api/push/subscribe` and `/api/push/unsubscribe`
(`v1/src/hooks/usePushNotifications.ts:64,86`) — paths that are **not mounted** — and sends
`{endpoint, keys:{p256dh,auth}}` where the real route expects flat `{endpoint,p256dh,auth}`. Web
push subscription in V1 therefore never reaches the server on either path or payload.

---

## V1 messaging data model

### Part 1 — the messaging tables (raw SQLite, created in code, **absent from Prisma**)

`grep "^model" v1/server/api/prisma/schema.prisma` returns 63 models and **none of them is
`Conversation`, `Message`, `MessageReadReceipt`, `ModerationRequest`, `ModerationAccessLog` or
`BlockedUser`.** The single Prisma migration on disk
(`v1/server/api/prisma/migrations/20260708231014_add_interested_cities`) contains no messaging DDL.
The authoritative schema is therefore `chat-server.ts:33-96` (and its `.cjs` twin), reproduced in
full below with product meaning.

**`users`** (chat-DB shadow copy — `chat-server.ts:33-37`)

| Field | Type | Product meaning |
|---|---|---|
| `id` | INTEGER PK | Mirrors the API user id; supplied by the JWT `id` claim, never validated against the API DB |
| `fullName` | TEXT NOT NULL | Display name in bubbles, conversation titles and audit logs; copied from the JWT claim on every connect |
| `email` | TEXT | Declared but always written `""` (`:566`) |
| `phone` | TEXT | Declared, never written by any code path |
| `avatar` | TEXT | Conversation-row avatar for 1:1 chats (`:549`); never written by the chat server — only ever NULL in practice |
| `role` | TEXT DEFAULT 'user' | Copied from the JWT; the admin REST API trusts the **token's** role, not this column |
| `last_seen` | DATETIME | Stamped on connect and on disconnect (`:140,755`); the raw material for "last seen at…" which V1 never renders |

**`conversations`** (`chat-server.ts:38-43`)

| Field | Type | Product meaning |
|---|---|---|
| `id` | INTEGER PK | Conversation identity; also the socket room name `conv_<id>` and the oversight room `oversight_<id>` |
| `type` | TEXT DEFAULT 'private' | `'private'` (1:1) or `'group'`. The `.cjs` twin enforces this with a CHECK (`chat-server.cjs:36`); the `.ts` server does not |
| `name` | TEXT | Group title. For `private` the display name is derived from the *other* participant at read time (`:546`) |
| `group_avatar` | TEXT | Group picture. **The `.ts` server never reads it** — it returns `""` for groups (`:549`); only the `.cjs` twin uses it (`chat-server.cjs:241`) |
| `created_by` | INTEGER | Creator. Written only by the seed script (`seed-chat.ts:75,85`); no runtime path sets it |
| `created_at` / `updated_at` | DATETIME | `updated_at` is the inbox sort key, bumped on every send (`:176,652`) |

**`conversation_participants`** (`chat-server.ts:44-53`)

| Field | Type | Product meaning |
|---|---|---|
| `id` | INTEGER PK | — |
| `conversation_id` | INTEGER FK→conversations CASCADE | Membership edge |
| `user_id` | INTEGER FK→users CASCADE | Membership edge; `UNIQUE(conversation_id,user_id)` prevents double enrolment |
| `role` | TEXT DEFAULT 'member' | Intended `member` / `admin` / `owner` (CHECK in `chat-server.cjs:50`). **Never read by any code path** — group moderation was modelled and not built |
| `joined_at` | DATETIME | Join time; never surfaced |
| `last_read_at` | DATETIME | Per-participant read watermark. Selected in `getUserConvs` (`:145`) but **never used** — unread is computed from `message_read_receipts` instead (`:179-182`). Two competing read models coexist |
| `is_deleted` | INTEGER DEFAULT 0 | Soft-leave / hide-conversation. Filtered on read (`:147,151`) but **no code path ever sets it to 1** — "leave conversation" was modelled and not built |

**`messages`** (`chat-server.ts:54-64`)

| Field | Type | Product meaning |
|---|---|---|
| `id` | INTEGER PK | Also the pagination cursor (`load-older … WHERE m.id < ?`, `:163`) |
| `conversation_id` | INTEGER FK CASCADE | Owning conversation |
| `sender_id` | INTEGER FK CASCADE | Author; the basis of every ownership check (edit/delete) and of `isMine` |
| `type` | TEXT DEFAULT 'text' | `.cjs` CHECK enumerates `text,image,audio,video,file,location` (`chat-server.cjs:65`); the `.ts` server accepts **any string from the client unvalidated** (`:644`). Client maps `audio`→`voice` for display (`:515`) |
| `content` | TEXT NOT NULL | For `type='text'`: the AES-GCM packed string `iv:tag:ciphertext`. For every other type: **plaintext**, and for images/files the entire `data:` URL is stored here or in `file_url` |
| `iv` | TEXT | A *duplicate* of the first field of `content` (`:648`) — informational only; `decrypt()` re-parses `content` and ignores this column (`encryption.ts:42`) |
| `metadata` | TEXT | JSON of the attachment descriptor `{url,name,size}` (`:649`) |
| `file_url` | TEXT | Attachment URL; the filename shown to the user is `file_url.split("/").pop()` (`:516`) |
| `is_deleted` | INTEGER DEFAULT 0 | Soft delete. Rows are **never** hard-deleted, so an admin oversight read still sees deleted text (`getMessages` at `:158` filters it, but the row survives) |
| `is_edited` | INTEGER DEFAULT 0 | Set by `edit-message`. **Never read by the server formatter** (`fmtMsg`, `:508-522`, does not emit it) — the "(edited)" marker only appears for the editing client's optimistic state (`ChatWidget.tsx:475`) |
| `reply_to_id` | INTEGER FK→messages SET NULL | Threaded reply. Accepted and persisted by `send-message` (`:651`) but **never emitted, never rendered, and no UI ever sets it** |
| `created_at` / `updated_at` | DATETIME | Ordering and edit tracking |

**`message_read_receipts`** (`chat-server.ts:65-71`)

| Field | Type | Product meaning |
|---|---|---|
| `id` | INTEGER PK | — |
| `message_id` | INTEGER FK CASCADE | — |
| `user_id` | INTEGER FK CASCADE | Who read it; `UNIQUE(message_id,user_id)` makes `INSERT OR IGNORE` idempotent (`:184`) |
| `read_at` | DATETIME | Read time; never surfaced to the UI |

Derived semantics: a message is "read" if **≥1** receipt exists (`m.read_count > 0`, `:518,533`).
In a group of five this means one reader marks the message read for the sender's ✓✓ — V1 has no
per-recipient delivery matrix in the UI even though the table can express one.

**`moderation_requests`** (`chat-server.ts:72-81`)

| Field | Type | Product meaning |
|---|---|---|
| `id` | INTEGER PK | — |
| `conversation_id` | INTEGER FK CASCADE | Conversation to be moderated |
| `requester_id` | INTEGER FK CASCADE | Who asked for oversight |
| `reason` | TEXT NOT NULL | Free-text justification, defaulted to `"Admin oversight request"` (`:285`) |
| `status` | TEXT DEFAULT 'pending' | Intended `pending/approved/rejected/reviewed` (CHECK at `chat-server.cjs:98`). **The only writer hard-codes `'approved'`** (`:193`) — the review workflow is modelled, never exercised |
| `reviewed_by` | INTEGER FK SET NULL | **Always set to the requester themselves** (`:285`) — self-approval |
| `review_notes` | TEXT | Never written |
| `created_at` / `reviewed_at` | DATETIME | Both stamped at creation |

**`moderation_access_logs`** (`chat-server.ts:82-88`) — the privacy-critical table

| Field | Type | Product meaning |
|---|---|---|
| `id` | INTEGER PK | — |
| `conversation_id` | INTEGER FK CASCADE | Which private conversation was opened |
| `moderator_id` | INTEGER FK CASCADE | Who opened it |
| `access_reason` | TEXT NOT NULL | One of three literals in practice: `"Admin REST API view"` (`:239`), `"Oversight (WebSocket)"` (`:736`), or the free-text reason from `POST /api/admin/oversight` (`:286`) |
| `accessed_at` | DATETIME | When |

This is the strongest privacy primitive in either generation: **every decryption of a private
conversation by a third party writes an immutable row.** V2 has no equivalent (`MSG-041` MISSING).

**`blocked_users`** (`chat-server.ts:90-96`)

| Field | Type | Product meaning |
|---|---|---|
| `id` | INTEGER PK | — |
| `user_id` | INTEGER FK CASCADE | Blocker |
| `blocked_user_id` | INTEGER FK CASCADE | Blocked; `UNIQUE(user_id,blocked_user_id)` |
| `created_at` | DATETIME | When |

**Enforcement is absent.** `isBlocked` (`:199`) and `getBlocks` (`:200`) are prepared and **never
called** — `grep -n "isBlocked\|getBlocks" chat-server.ts` returns only the two declaration lines.
`send-message` does not consult the table. Blocking in V1 stores a row, notifies the blocked party's
room, and changes nothing.

### Part 2 — Prisma models that carry messaging-adjacent product meaning

**`Notification`** (`schema.prisma:1100-1117`) — the in-app notification record

| Field | Type | Product meaning |
|---|---|---|
| `id` | Int PK | — |
| `userId` | Int → users CASCADE (`@map("user_id")`) | Recipient. Indexed `[userId,isRead]` for the unread badge |
| `type` | String default `"info"` | Event key; the emitter vocabulary is the 15-value `NotificationEvent` union (`notification-sender.ts:35-39`) |
| `title` / `titleAr` | String / String? | **Bilingual headline** — English and Arabic stored side by side, not translated at render time |
| `body` / `bodyAr` | String? / String? | Bilingual body |
| `link` | String? | Deep link to the entity (`/tenders/:id`, `/properties/:id`, `/requests/:id`) |
| `isRead` | Boolean default false | Read state |
| `createdAt` | DateTime | Indexed for reverse-chronological listing |

A **second, divergent `notifications` table** is created inside the *chat* DB
(`chat-server.ts:117-123`) with camelCase columns (`userId`, `isRead`, `createdAt`) instead of the
Prisma snake_case mapping — the tender cron writes there (`:770,774`), so those rows are invisible to
`GET /api/auction-enhancements/notifications`, which reads the Prisma DB.

**`PushSubscription`** (`schema.prisma:1085-1098`)

| Field | Type | Product meaning |
|---|---|---|
| `id` | Int PK | — |
| `userId` | Int → users CASCADE | Owner |
| `endpoint` | String | Push service endpoint; `@@unique([userId,endpoint])` = one row per device |
| `p256dh` / `auth` | String / String | Web-Push encryption keys |
| `userAgent` | String? | Device fingerprint for the user to recognise "which browser" |
| `createdAt` | DateTime | — |

Delivery: `sendPush` (`notification-sender.ts:69-84`) fans out to every subscription and
**self-heals** — a `410`/`404` from the push service deletes the row (`:78-80`).

**`EmailLog`** (`schema.prisma:1119-1133`)

| Field | Type | Product meaning |
|---|---|---|
| `id` | Int PK | — |
| `to` | String (indexed) | Recipient address |
| `subject` | String | Subject line |
| `body` | String? | Full HTML body retained |
| `status` | String default `"PENDING"` (indexed) | `PENDING` → `SENT` \| `FAILED` (`notification-sender.ts:168-179`) |
| `error` | String? | SMTP failure text |
| `sentAt` | DateTime? | Delivery time |
| `createdAt` | DateTime (indexed) | Queue time |

Every email is logged **before** the transport is attempted, so V1 has a durable outbound-mail audit
even when SMTP is unconfigured (`transporter` stays null and the row remains `PENDING`).

**`Booking`** (`schema.prisma:1191-1206`) — property-viewing request, a messaging-adjacent inbox item

| Field | Type | Product meaning |
|---|---|---|
| `id` | Int PK | — |
| `propertyId` | Int | Subject property |
| `userId` | Int | Requester |
| `officeId` | Int? | Handling office |
| `status` | String default `"PENDING"` | Lifecycle |
| `fullName` / `phone` / `email` | String / String / String? | Contact channel **carried on the booking**, not via chat |
| `message` | String? | Free-text note — a one-shot message with no reply channel |
| `preferredDate` | DateTime? | Requested viewing slot |
| `createdAt` / `updatedAt` | DateTime | — |

**`Inquiry`** (`schema.prisma:707-719`) — the property contact form

| Field | Type | Product meaning |
|---|---|---|
| `id` | Int PK | — |
| `name` / `email` / `phone` | String ×3 (all required) | Contact identity — **anonymous, not tied to `userId`** |
| `message` | String | The enquiry body |
| `propertyId` | Int? | Subject listing |
| `isEliteLead` | Boolean default false | Manual admin flag (per `BRIEF2.md:71` — not computed) |
| `createdAt` / `updatedAt` | DateTime | — |

`Inquiry` is how a V1 buyer actually contacts a seller (`PropertyDetail.tsx:213-221`
`POST /inquiries`). **It is a write-only funnel with no thread and no reply path.**

**Supporting models referenced by the messaging surfaces:** `Moderator` (`:695-705`, `userId` +
`roleId`, unique per user) and `Role` (`:683-693`, `permissions` JSON string) define a moderator
concept that the chat server **never consults** — oversight authorization reads the JWT `role` claim
only. `ServiceHubFeedback` (`:836-845`, `requestId,userId,message,sentiment`) is a one-way
post-job message. `ActivityLog` (`:847-855`) receives the main-API `oversight_*` audit rows.

---


## Round 2 — V1 Advertising

## V1 advertising business engine

**One table, one placement string, one geo funnel.** V1 has exactly one ad entity — Prisma `Ad`
(`v1/server/api/prisma/schema.prisma:526-581`, table `ads`). There is no campaign/creative split, no advertiser table, no
budget ledger. A "campaign" *is* a creative: one row = one image + one link + one placement + one geo scope + one flight window.

**Placement taxonomy.** The `position` string is the single delivery key. V1 defines 47 web positions
(`v1/src/pages/AdminAds.tsx:174-221`): 12 fixed layout slots `ad-slot-01…ad-slot-12` (IAB sizes: 300×250 rails, 728×90
footer/inline, 970×90 top, 180×600 sticky), `top`, `between_listings`, `property_detail`, `popup`, and **30 per-page hero
positions** (`home_hero`, `properties_hero`, … `arch-ai_hero`, enumerated at `AdminAds.tsx:81-92` and labelled at
`:613-644`). Placement is constrained by page: `WEBSITE_PAGES` (`AdminAds.tsx:225-242`) maps each of 16 site pages to the
placements legal on it, and the admin form resets `position` to the first legal placement whenever the page changes
(`AdminAds.tsx:1256-1262`). A 48th target page, `AKAR_V2` (`AdminAds.tsx:244-247`), is the desktop program, whose
placements are `side` / `bottom` / `any` with **hard active-campaign caps of 2 / 3 / ∞** enforced in the placement dropdown
(`AdminAds.tsx:250-254`, `:1284-1292`). A separate 5-zone desktop map (`desktop_startup`, `desktop_sidebar`,
`desktop_dashboard`, `desktop_reports`, `desktop_popup`) carries trigger semantics (`onStartup`, `always`, `onDashboard`,
`onReports`, `oncePerDay`) at `AdminAds.tsx:256-262`.

**Creative-shape governance.** Every placement carries a target pixel size and an accepted aspect-ratio band
(`POSITION_SPECS`, `AdminAds.tsx:16-80` — e.g. hero 1600×640 ratio 1.8–3.5, rail 300×250 ratio 0.9–1.5, leaderboard
728×90 ratio 6–11, desktop sidebar 250×400 ratio 0.5–0.8). The admin loads the image, measures `naturalWidth/Height` and
compares to the band before allowing save (`AdminAds.tsx:805-815`, edit path `:1871-1878`). **Regression inside V1:** the
current `validateHeroImage` always resolves `ok:true` (`AdminAds.tsx:96-108`); the enforcing version that returned
`ok:false` with a "الصورة لا تطابق نسبة الموضع" reason lives only in `AdminAds.tsx.bak.0`. The specs, the UI and the call
sites survive; only the verdict was neutralised.

**Delivery.** Three public read paths, all unauthenticated:
`GET /api/ads/public` (`v1/server/api/src/routes/ads.ts:20-42`) filters `isActive`, optional `position`, optional `page`
(with `page="all"` meaning "no page filter"), then ORs the geo predicates —
`{isGlobal:true} OR {targetCountry} OR {targetRegion} OR {targetGovernorate} OR {targetCity}` (`ads.ts:29-34`) — and
orders by `displayOrder ASC` (`ads.ts:37-38`).
`GET /api/ads/hero` (`ads.ts:7-18`) is the hero-specific variant (position + page + country + city, `displayOrder ASC`).
`GET /api/desktop/ads/placement/:zone` (`v1/server/api/src/routes/desktop.ts:176-185`) returns the single highest-priority
active ad for a desktop zone, plus `GET /api/desktop/sync/ads` (`desktop.ts:242-250`) for bulk pull.
A fourth path, `GET /ads/next` (single next ad with `source: "campaign" | "property" | "brand"`), is **called by the client
but does not exist on the Express server** (`v1/src/components/RotatingAd.tsx:45`; implemented only in the dev mock
`v1/src/lib/api.ts:905-928` and the Vite middleware `v1/vite.config.ts:272-283`).

**Ranking and rotation.** Server-side ordering is `displayOrder ASC` only. Everything else is client-side:
`GeoAdsContext` sorts the whole fetched set by sponsor tier `platinum > gold > silver > standard`
(`v1/src/contexts/GeoAdsContext.tsx:32,72-77`), caches it for 5 minutes keyed on `country:city`
(`GeoAdsContext.tsx:43-44,56-62`), and exposes `getAdsForPosition()` which returns the **first** match per slot
(`GeoAdsContext.tsx:83-84`, consumed at `v1/src/components/GeoAdBanner.tsx:56`). Rotation is per-component, not per-engine:
`AdBanner` cycles a supplied array every 9 s with a fade and a per-instance start offset
(`v1/src/components/AdBanner.tsx:46-79`), `HeroAdsBanner` rotates fetched hero ads every 5 s with dot navigation
(`v1/src/components/HeroAdsBanner.tsx:24,43-47,82-96`), `PageHeroSlideshow` schedules the next slide from the campaign's own
`rotationSeconds` clamped to 5–60 s and pauses on hover (`v1/src/components/PageHeroSlideshow.tsx:139,164-172,193-211`),
`RotatingAd` re-fetches every 15 s with a random 0–2 s desync offset (`v1/src/components/RotatingAd.tsx:28,57-72`).

**Language targeting** is a stored field (`language ∈ {ar,en,both}`, `AdminAds.tsx:1150-1158`) applied **client-side only**
(`GeoAdBanner.tsx:51-54`); the server never filters on it.

**End conditions — the V1 commercial model.** The admin picks exactly one of four end modes
(`AdminAds.tsx:1364-1463`): `date` (start/end datetime), `duration` (hours of on-screen time), `views` (`maxViews`),
`clicks` (`maxClicks`). The `duration` mode is converted to an impression quota at save time:
`maxViews = round(displayDurationHours × 3600 / rotationSeconds)` (`AdminAds.tsx:843-848`) — i.e. V1 sells **screen-time,
priced as impressions**, with `rotationSeconds` as the conversion rate. The UI shows the computed impression count live
(`AdminAds.tsx:1423-1436`). **Critical gap:** nothing enforces any of it at delivery time. `GET /ads/public` and
`/ads/hero` never compare `viewCount` to `maxViews`, `clickCount` to `maxClicks`, or `now` to `startDate`/`endDate`
(`ads.ts:7-42`); expiry is only *rendered* as a badge in the admin list (`AdminAds.tsx:310-318`). Caps and flight windows
are authoring-only in V1.

**Counting.** `POST /api/ads/:id/view` and `/click` increment `view_count` / `click_count` unconditionally and
anonymously (`ads.ts:177-193`); the desktop mirrors are `POST /api/desktop/ads/:adId/view|click` (`desktop.ts:187-203`).
Client dedup is a per-mount `Set` (`GeoAdsContext.tsx:47,86-90`; `AdBanner.tsx:83-89`; `GeoAdBanner.tsx:65-70`;
`PageHeroSlideshow.tsx:213-219`). There is no viewability gate, no session/user dimension, no per-day rollup, no signed
token, and no CTR anywhere in V1. Aggregate reporting is three numbers computed in the browser from the admin list —
total views, total clicks, total revenue = Σ`price` (`AdminAds.tsx:911-913`, rendered `:1024-1037`).

**Approval workflow.** Self-serve requests land via `POST /api/ads/request` (unauthenticated,
`ads.ts:142-175`) with `isActive:false, status:"pending"`. Admin approval sets `isActive:true, status:"active"` and
**stamps the negotiated price and an internal note in the same call** (`ads.ts:122-130`, UI `AdminAds.tsx:885-894`,
price/note inputs `:969-980`). Rejection sets `isActive:false, status:"rejected"` with a note (`ads.ts:132-140`).
No notification is sent to the requester on either branch.

**Advertiser-facing funnel.** `/advertise` (`v1/src/pages/Advertise.tsx`) is a public 3-card form: advertiser identity
(name/email/phone, `:238-256`), ad details with a **clickable visual layout diagram** that highlights the selected slot
inside a mock page (`LayoutDiagram`, `:33-113`), page→placement cascade reusing the admin's own `WEBSITE_PAGES`
(`:276-326`), geo (country/city/village, `:329-348`), flight dates (`:351-360`), multi-image upload + video URL
(`:365-393`). It deep-links from every empty slot: `AdBanner`, `GeoAdBanner` and `PageHeroSlideshow`'s empty state all
render an "اعلن هنا / Advertise Here" CTA to `/advertise?position=<placement>`
(`AdBanner.tsx:176-183`, `GeoAdBanner.tsx:76-85`, `PageHeroSlideshow.tsx:43-77`), and the page pre-selects that placement
from the query string (`Advertise.tsx:139-143`). Submission returns a request number shown on a confirmation card
(`:207-227`).

**Surface reality check (honest depth).** `PageWithAds` (`v1/src/components/PageWithAds.tsx:10-86`) renders the full
12-slot furniture — rails 01–04, top 08, inline 09/10, footer 05–07, sticky 11/12 — on **34 pages**. But those slots are
`AdSlot` components fed by DOM `CustomEvent`s, not by the API: `AdSlot` listens for an `ad-update` event and exposes a
`window.__adSlot_<id>` setter (`v1/src/components/AdSlot.tsx:26-46`), and the only writer is `updateAd()`
(`v1/src/lib/updateAd.ts:22-42`) which is attached to `window` "for console/external use" (`v1/src/main.tsx:9-13`).
No code path connects `/api/ads/public` to `AdSlot`. Only **Home** (`v1/src/pages/Home.tsx:63-181`) and **Estates**
(`v1/src/pages/Estates.tsx:197-401`) use the API-driven `GeoAdBanner` for those same 12 positions. Likewise `top`,
`popup`, `between_listings`, `property_detail` and all `desktop_*` positions are authorable in the admin but have **no web
renderer at all**. The genuinely wired public surfaces are: per-page hero (`PageHeroSlideshow` on 30 pages,
`HeroAdsBanner` on 5), the home/estates `GeoAdBanner` grid, `PageHeroGallery`'s `gallery_side` rail, and the news ticker.

**News ticker** is a first-class promotional channel in V1, not an ad placement: `NewsTickerItem` +
`NewsTickerSettings` models, admin CRUD (`v1/server/api/src/routes/admin.ts:483-529`), per-page settings
(`admin.ts:532-553`), public read scoped to a page with `maxItems`/`enabled` honoured (`v1/server/api/src/routes/news-ticker.ts:6-33`),
a marquee mounted globally in the layout with hover-pause (`v1/src/components/layout/NewsTicker.tsx:40-49,53,60-61`,
mounted `v1/src/components/layout/Layout.tsx:24-28,54`), a desktop feed (`desktop.ts:165-174`), and an **auto-generation
job** that mints ticker items from the newest properties, services, offices, blog posts and auctions with dedup by
`sourceType+sourceId` and a 4-minute cooldown (`news-ticker.ts:35-87`).

---

## V1 Ad data model

`Ad` — `v1/server/api/prisma/schema.prisma:526-581` (table `ads`). Every field and its product meaning:

| Field (column) | Type / default | Product meaning |
|---|---|---|
| `id` | Int PK | Ad identity; used in every tracking URL (`ads.ts:177,186`). |
| `title` | String, required | Arabic headline drawn over the creative (`AdBanner.tsx:154-158`). Required by `POST /ads` (`ads.ts:54`). |
| `titleAr` (`title_ar`) | String? | Second Arabic/English title. The admin sends the **English** title into this column (`AdminAds.tsx:819`) while `GeoAdBanner.tsx:95-97` reads a `titleEn` that the schema does not have → the English overlay never resolves. Schema/UI mismatch. |
| `subtitle` | String? | Hero sub-headline (`PageHeroSlideshow.tsx:136,241`); not editable in the admin form, only via `/ads/request` (`ads.ts:149`). |
| `badge` | String? | Hero corner badge text, defaulting to "إعلان"/"Ad" (`PageHeroSlideshow.tsx:238,270-274`). Authorable only in the edit dialog payload (`AdminAds.tsx:1884`). |
| `imageUrl` (`image_url`) | String? | Creative. Accepts an external URL, a server upload path `/uploads/<file>` (`ads.ts:60,107`), or a **base64 data URL** produced by the admin's 5 MB client-side reader (`AdminAds.tsx:1181-1192`). |
| `linkUrl` (`link_url`) | String? | Click destination; opened `target=_blank rel=noopener` (`AdBanner.tsx:99-101`). Absence turns the creative into a non-clickable div. |
| `position` | String, required | **The delivery key.** One of the 47 web placements, the 3 `AKAR_V2` placements, or a `desktop_*` zone (`AdminAds.tsx:174-262`). |
| `page` | String, default `"home"` | Page scope. `"all"` = every page (server skips the filter, `ads.ts:25`); `"AKAR_V2"` = desktop program. |
| `country` | String, default `"OM"` | **Display** country — drives the flag/location chip drawn on the creative (`AdBanner.tsx:27-40,103-111`), *not* targeting. |
| `city` | String? | Display city for the same chip. Not targeting. |
| `isActive` (`is_active`) | Bool, default true | Master on/off; the only filter every public query applies (`ads.ts:10,24`). Toggled from every admin list (`AdminAds.tsx:877-883`). |
| `clickCount` (`click_count`) | Int, default 0 | Lifetime clicks; incremented by `/ads/:id/click` and `/desktop/ads/:id/click`. |
| `viewCount` (`view_count`) | Int, default 0 | Lifetime impressions; incremented by `/ads/:id/view` and the desktop mirror. |
| `ctaText` (`cta_text`) | String? | Button label; falls back to "تصفح العقارات"/"Browse Properties" (`AdBanner.tsx:113`). |
| `companyName` (`company_name`) | String? | Advertiser brand shown on hero slides (`PageHeroSlideshow.tsx:285-300`). Settable only through `/ads/request` (`ads.ts:154`). |
| `companyLogo` (`company_logo`) | String? | Round brand logo on hero slides, with a platform-logo fallback on error (`PageHeroSlideshow.tsx:290-296`). |
| `phoneNumber` (`phone_number`) | String? | Advertiser phone rendered on hero slides — a direct call-to-action channel. |
| `displayDuration` (`display_duration`) | Int, default 6 | Legacy per-slide seconds, still mapped by `useHeroSliders` (`v1/src/hooks/useHeroSliders.ts:159`). Superseded by `rotationSeconds`. |
| `displayOrder` (`display_order`) | Int, default 1 | **The only server-side ranking signal** (`ads.ts:15,38`); also the hero-slider sequence. Admin: "smaller numbers show first; blank appends chronologically" (`AdminAds.tsx:1240-1252`). |
| `targetType` (`target_type`) | String? | Audience-type slot; accepted by the API (`ads.ts:70`) but never set by any UI and never read. INTENDED ONLY. |
| `desktopZone` (`desktop_zone`) | String? | Desktop placement key used by `GET /desktop/ads/placement/:zone` (`desktop.ts:176-183`) and by the shipped C# client. **No admin surface ever writes it** (grep `desktopZone` in `AdminAds.tsx` → none), so desktop delivery cannot be filled from the console. |
| `startDate` (`start_date`) | String? | Flight start. Rendered as a "مجدوَل/scheduled" badge (`AdminAds.tsx:315`) but **never enforced** in any query. |
| `endDate` (`end_date`) | String? | Flight end. Rendered as "منتهي/expired" (`AdminAds.tsx:314`); **never enforced** at delivery. |
| `targetCountry` (`target_country`) | String? | Geo targeting — ISO country (`AdminAds.tsx:1594-1606`, matched `ads.ts:30`). |
| `targetRegion` (`target_region`) | String? | Geo targeting — one of 10 macro-regions: gcc, levant, iraq, egypt, north_africa, horn_africa, yemen, turkey, usa, world (`v1/src/lib/adLocations.ts:7-18`); auto-derived from the chosen country (`AdminAds.tsx:1596-1598`). |
| `targetGovernorate` (`target_governorate`) | String? | Geo targeting — governorate, cascaded from the country's governorate list (`AdminAds.tsx:1619-1633`). |
| `targetCity` (`target_city`) | String? | Geo targeting — free-text city (`AdminAds.tsx:1637-1640`). |
| `targetVillage` (`target_village`) | String? | Geo targeting — village/neighbourhood, free text (`AdminAds.tsx:1642-1645`). **Stored and authored but never used in any query** (`ads.ts:29-34` omits it). |
| `isGlobal` (`is_global`) | Bool, default true | "Show to everyone regardless of location"; forced true when `page="all"` (`AdminAds.tsx:858`). The OR-base of the geo funnel (`ads.ts:29`). |
| `language` | String?, default `"both"` | `ar` / `en` / `both`. Filtered **client-side only** (`GeoAdBanner.tsx:51-54`). |
| `icon` | String? | Emoji or icon URL rendered inside the CTA button (`AdBanner.tsx:166`). |
| `accentColor` (`accent_color`) | String? | Hex colour of the CTA button (`AdBanner.tsx:164`). |
| `backgroundFrom` (`background_from`) | String? | Gradient start for the **desktop program** banner (`AdminAds.tsx:1479-1485`, preview `:1505`). |
| `backgroundTo` (`background_to`) | String? | Gradient end for the same. Together they let the office banner be a text+gradient creative with no image. |
| `sponsorTier` (`sponsor_tier`) | String?, default `"standard"` | Commercial tier `standard/silver/gold/platinum` (`AdminAds.tsx:161-166`). Drives client-side ranking (`GeoAdsContext.tsx:32,72-77`) and the on-creative border/glow/crown badge (`GeoAdBanner.tsx:17-46,101-106`). |
| `sponsorName` (`sponsor_name`) | String? | Sponsor attribution chip drawn on the creative for non-standard tiers (`GeoAdBanner.tsx:128-132`, `RotatingAd.tsx:113-117`). |
| `advertiserName` (`advertiser_name`) | String? | Back-office contact name; shown on every admin card (`AdminAds.tsx:961-963`). |
| `advertiserEmail` (`advertiser_email`) | String? | Back-office contact email; the dedup/contact key of the request flow (`Advertise.tsx:165-168`). |
| `advertiserPhone` (`advertiser_phone`) | String? | Back-office contact phone. |
| `price` | Float? | Amount charged for this ad, in OMR (ر.ع). Stamped at approval (`ads.ts:127`) and summed into the admin "total revenue" tile (`AdminAds.tsx:913,1029`). V1's entire ad-revenue accounting. |
| `notes` | String? | Internal note; also the rejection reason (`ads.ts:137`), surfaced on the card (`AdminAds.tsx:964`). |
| `maxViews` (`max_views`) | Int? | Impression cap, or the impression equivalent of a purchased screen-time block (`AdminAds.tsx:843-848`). Authoring-only — not enforced at delivery. |
| `maxClicks` (`max_clicks`) | Int? | Click cap. Authoring-only — not enforced. |
| `rotationSeconds` (`rotation_seconds`) | Int?, default 5 | Seconds this creative holds the slot. Doubles as the hours→impressions conversion rate. Honoured by the hero slideshow, clamped 5–60 s (`PageHeroSlideshow.tsx:164-172`). |
| `status` | String?, default `"active"` | Lifecycle: `pending` → `active` / `rejected` (`ads.ts:127,137,170`). Drives the admin tab split (`AdminAds.tsx:907-909`). |
| `createdAt` / `updatedAt` | DateTime | Audit stamps; `createdAt DESC` is the admin list order (`ads.ts:46`). |

**Fields the API accepts that the schema does not define** — `titleEn`, `targetScope`, `currency`, `displayDurationHours`,
`lat`, `lng`, `radiusKm`, `createdBy` are all in `AD_FIELDS` (`ads.ts:66-76`) and `currency` is force-defaulted on create
(`ads.ts:57`), but none exist on `model Ad`. Any create/patch carrying them raises a Prisma unknown-argument error →
`500 "Failed to create ad"` (`ads.ts:63`). `targetScope` (global/country/city, `AdminAds.tsx:168-172`) is a **dead
targeting concept** superseded by the Geo-Power fields. Radius targeting is INTENDED ONLY in V1.

`NewsTickerItem` — `schema.prisma:645-662` (`news_ticker_items`):
`id`; `text` (English/base copy, required); `textAr` (Arabic copy, chosen when RTL, `NewsTicker.tsx:86,93`);
`target` default `"both"` — the **delivery channel**: `website` / `desktop` / `both` (`AdminNewsTicker.tsx:245-252`);
`isActive`; `linkUrl` (click destination, rendered as a router link, `NewsTicker.tsx:82-88`);
`icon` (icon key mapped to an emoji, `NewsTicker.tsx:24-32`); `color` (hex, applied to the item text);
`targetPages` (JSON array of page keys, matched by `contains` on the server, `news-ticker.ts:22-24`);
`displayOnAllPages` (bool; true ⇒ page-agnostic); `sourceType` (`manual` | `auto_property` | `auto_service` |
`auto_office` | `auto_blog` | `auto_auction`, `news-ticker.ts:52-79`); `sourceId` (originating entity id, the dedup key);
`createdAt`/`updatedAt`.

`NewsTickerSettings` — `schema.prisma:664-674` (`news_ticker_settings`): `page` (unique — settings are **per page**);
`maxItems` default 5 (server `take`, `news-ticker.ts:10,27`); `refreshInterval` default 300 s (authored
`AdminNewsTicker.tsx:389-392`; **the public marquee never polls**, `NewsTicker.tsx:40-49` fetches once per page change —
INTENDED ONLY); `enabled` default true (false ⇒ server returns `[]`, `news-ticker.ts:11-16`); timestamps.

`migrate_ads_new_fields.sql:1-16` is the migration that introduced the commercial layer onto an older `ads` table:
`language, icon, accent_color, background_from, background_to, sponsor_tier, sponsor_name, advertiser_name,
advertiser_email, advertiser_phone, price, notes, max_views, max_clicks, rotation_seconds, status` — i.e. V1's
sponsor-tier, advertiser-CRM, pricing and cap model was bolted on after the fact.

---


## Round 2 — V1 Identity, Authorization, Moderators, Rank, Membership

## V1 account types

V1 has **no single account-type field**. Identity is smeared across five independent mechanisms,
and they disagree with each other:

| Mechanism | Storage | Values |
|---|---|---|
| `users.role` | Prisma column, default `"user"` | `user` · `moderator` · `admin` (`v1/server/api/prisma/schema.prisma:37`; enum enforced only at `v1/server/api/src/routes/admin.ts:56`) |
| `users.userType` | Prisma `enum UserType`, **nullable** | `INDIVIDUAL` · `ARTISAN` · `REALTOR` · `OFFICE` · `COMPANY` (`schema.prisma:12-18,39`) |
| Registration `accountType` | request field, never stored | `individual` · `professional` · `company` (`v1/src/pages/Register.tsx:56`; mapped at `v1/server/api/src/routes/auth.ts:148`) |
| Profile rows | separate tables | `MarketerProfile`, `ServiceHubProfile`, `Office`, `Partner` |
| Client-only flags | `localStorage` | `akar_active_account`, `akar_companies` (`v1/src/contexts/CompanyContext.tsx:38-39`) |

`UserType` has 5 values but registration can only produce 3 of them: `userTypeMap` at
`v1/server/api/src/routes/auth.ts:148` maps `individual→INDIVIDUAL`, `professional→ARTISAN`,
`company→COMPANY`. **`REALTOR` and `OFFICE` have no creation path anywhere in V1** — no route, no
admin action, no migration writes them. `AuthContext.mapServerUserType` (`v1/src/contexts/AuthContext.tsx:7-19`)
additionally accepts the wire values `BUSINESS→COMPANY` and `PROFESSIONAL→ARTISAN`, which no V1
server ever emits — dead compatibility shims for a system not in this tree.

| Type | Creation path | Data model | Capabilities | UI surfaces | Depth |
|---|---|---|---|---|---|
| **Normal user (individual)** | `/register` → `accountType="individual"` → `POST /api/auth/register` (`Register.tsx:56,410`; `auth.ts:93-285`) | `users` row, `role="user"`, `userType=INDIVIDUAL`, `status="active"`, `isVerified=false` (`schema.prisma:37-40`) | browse, submit property (pending), bid, tender, message, subscribe | `/dashboard`, `/profile/:username`, `/inbox` | **L4 END_TO_END_WIRED** |
| **Professional / craftsman (حرفي)** | same form, `accountType="professional"`; requires `nationalId` + `idImage` + `profession` + `craftType` + `experienceYears` + `workDescription` ≥20ch + `bio` + `address` (`Register.tsx:81-101`) | `users.userType=ARTISAN` + `profession`, `craftType`, `experienceYears`, `workDescription`, `address`, `geoLink` (`schema.prisma:49-55`) + an `IdentityVerification` row (`auth.ts:198-207`) | claims to be reviewed (`pendingReview:true`, `auth.ts:278`) — **but no route ever reads, approves or rejects the `IdentityVerification` row** | `/upgrade-artisan`, `/artisan-dashboard`, `/my-service` | **L3 PARTIAL_FLOW** |
| **Artisan by self-promotion** | `/upgrade-artisan` button | **none — `localStorage.setItem("akar_user", {...userType:"ARTISAN"})`** (`v1/src/pages/UpgradeToArtisan.tsx:60-61`) | every ARTISAN-gated UI branch, with zero server state change | `/upgrade-artisan` | **L1 UI_ONLY** |
| **Office / Company (مكتب / شركة)** | same form, `accountType="company"` — the tile is rendered **only when `accountType !== "individual"`**, so the user must first select "حرفي" to reveal it (`Register.tsx:427-437`) | `users.userType=COMPANY` + `companyName`, `licenseNumber` (`schema.prisma:61-62`) | property submission, office listing | `/create-company`, `/my-companies` | **L3 PARTIAL_FLOW** |
| **Real-estate office (`Office` entity)** | **no user-facing creation path** — `offices` rows exist only via seed/admin | `Office` (`schema.prisma:434-465`) with the only true org-level capability flags in V1: `isVerified`, `canCreateAuctions`, `isAuctionsBanned` (`schema.prisma:455-457`) | `canCreateAuctions` gates auction creation server-side | `/offices`, `/offices/:id`, `/office-requests` | **L3 PARTIAL_FLOW** |
| **`OFFICE` / `REALTOR` userType** | **none** | enum values only (`schema.prisma:15-16`) | branched on in UI (`Dashboard.tsx:269`, `DashboardProfile.tsx:151`) but unreachable | — | **L2 DATA_MODEL_ONLY** |
| **Company (client-side org)** | `/create-company` → `createCompany()` (`v1/src/pages/CreateCompany.tsx:36`) | **`localStorage["akar_companies"]` only** — `{id:Date.now(), managerId, supervisors:[{userId,name,permissions:["post"]}]}` (`CompanyContext.tsx:38,57-72`) | personal↔company context switch | `/my-companies`, `AccountSwitcher` | **L1 UI_ONLY** |
| **Company supervisor** | `window.prompt` for a name and a raw integer user id (`v1/src/pages/MyCompanies.tsx:28-32`) | localStorage array element; `permissions` hardcoded to `["post"]` and **never read anywhere** (`CompanyContext.tsx:77`) | none enforced | `/my-companies` | **L1 UI_ONLY** |
| **Marketer (مسوّق)** | `/marketer/register` → `POST /api/marketer/register` (`v1/src/pages/marketer/MarketerRegister.tsx:64`) | `MarketerProfile` + `MarketerRank` + `MarketingContract` + `MarketingProposal` + `Commission` + `MarketerSettings` (`schema.prisma:189-381`) | **none — the entire `/api/marketer/*` + `/api/admin/marketers/*` surface (20 distinct endpoints) does not exist on the V1 server**; `server/api/src/routes/` has no marketer file and `index.ts` mounts none | 8 pages under `/marketer/*` + `/advertiser/*` | **L2 DATA_MODEL_ONLY** |
| **Advertiser (معلن)** | never created as an account — it is a *counterparty role* on a contract | `MarketingContract.advertiserId → users.id` (`schema.prisma:284-285`) | signs marketing contracts | `/advertiser/proposals`, `/advertiser/contracts` | **L2 DATA_MODEL_ONLY** |
| **Supplier (مورّد)** | **no self-registration** | `Supplier` (`schema.prisma:491-510`) — **not linked to `users` at all**, no `userId` column | catalogue entry only | `/suppliers`, `/suppliers/:id` | **L2 DATA_MODEL_ONLY** |
| **Partner (شريك)** | **no registration route** | `Partner` — its **own `email` + `passwordHash`, no FK to `users`** (`schema.prisma:870-880`); read-only listing at `GET /api/partners` (`v1/server/api/src/routes/other.ts:48-52`) | none; **a second, parallel credential store with no login endpoint** | `/partner-portal`, `/partner-portal/dashboard` | **L2 DATA_MODEL_ONLY** |
| **Technician** | none — a UI persona only | no model | inbox + settings screens | `/technician/inbox`, `/technician/settings` | **L1 UI_ONLY** |
| **Consultant** | none — a UI persona only | no model | `/arch-ai` output | `/consultant-dashboard` | **L1 UI_ONLY** |
| **Service-hub provider** | `POST /api/service-hub/profile` (`v1/server/api/src/routes/service-hub.ts:15`) | `ServiceHubProfile` (`schema.prisma:790-807`) | ringing-queue dispatch, availability toggle | `/service-hub`, `/my-service` | **L4 END_TO_END_WIRED** |
| **Moderator** | `POST /api/admin/moderators {userId, roleId}` (`admin.ts:339-345`) **and/or** `PUT /api/admin/users/:id/role {role:"moderator"}` (`admin.ts:104-113`) — two unlinked mechanisms | `Moderator(userId UNIQUE, roleId)` + `Role(name, permissions JSON)` (`schema.prisma:683-705`) | **only `users.role` matters**; the `Moderator`/`Role` tables are never read by any authorization path | `/admin/moderators`; `ModeratorPanel.tsx` **has no route** | **L2 DATA_MODEL_ONLY** |
| **Admin** | `PUT /api/admin/users/:id/role {role:"admin"}` — an existing admin only; **no bootstrap path exists in V1 either** (no seed script, no first-user promotion) | `users.role="admin"` | everything under `requireRole("admin")` | 36 `Admin*.tsx` pages | **L3 PARTIAL_FLOW** |
| **Dev admin (mock)** | `admin@akarpromax.com` / `admin123` hardcoded in the client (`v1/src/lib/api.ts:21-36`), DEV builds only (`api.ts:76`) | none — returns a literal `"mock-jwt-token-"+Date.now()` (`api.ts:92`) | full client-side admin | every admin page | **L1 UI_ONLY** |
| **Dev admin (pre-signed JWT)** | `/dev-login?uid=3` (`v1/src/pages/DevLogin.tsx:7,33`) | a checked-in, **never-expiring** HS256 JWT `{"id":3,"fullName":"Admin","role":"admin","iat":1782878787}` | see §V1 authentication | `/dev-login` (registered unconditionally, `v1/src/App.tsx:319`) | **L4 END_TO_END_WIRED** |
| **Desktop client** | not a user — a process identity | shared static `DESKTOP_SIGNATURE` secret (`v1/server/api/src/routes/desktop.ts:6-13`), committed at `v1/server/.env:6` | 4 signed endpoints + HWID licence binding | desktop app | **L4 END_TO_END_WIRED** |

**Count: 21 distinguishable account identities; only 5 have a working end-to-end creation path**
(individual, professional, company, service-hub provider, desktop client). Registration itself
offers exactly **three** choices (`Register.tsx:56`).

---

## V1 authentication & session model

| Concern | V1 behaviour | Evidence |
|---|---|---|
| Password hashing | bcrypt, cost 12 | `v1/server/api/src/routes/auth.ts:57,145,436` |
| Password policy (client) | ≥8 chars + upper + lower + digit + symbol, live meter | `v1/src/pages/Register.tsx:64-69,119-123` |
| Password policy (server) | **length ≥ 8 only** — no character-class check | `auth.ts:130-133` |
| Session token | HS256 JWT, claims `{id,email,role,fullName}`, `expiresIn:"30d"` | `v1/server/api/src/middleware/auth.ts:27-29` |
| Token storage | `localStorage["akar_token"]` — **not HttpOnly, XSS-readable** | `AuthContext.tsx:166`, `v1/src/lib/api.ts:1193` |
| User cache | full user object incl. `role` in `localStorage["akar_user"]` | `AuthContext.tsx:167` |
| Refresh | `GET /auth/me` once on mount; on failure **only clears if localStorage is already empty** | `AuthContext.tsx:96-152` (esp. `:143-150`) |
| Logout | client-side only — removes two localStorage keys; **no server revocation, no denylist** | `AuthContext.tsx:172-177` |
| Rate limiting | 20 req / 15 min on `/api/auth/*` only | `v1/server/api/src/index.ts:67-73,81` |
| Brute-force record | `LoginAttempt` model exists — **zero writers in the entire server** | `schema.prisma:161-171`; grep `prisma.loginAttempt` → 0 hits |
| IP blocking | `BlockedIp` model exists — **zero writers, zero readers** | `schema.prisma:149-159` |
| Email verification | 1 h JWT emailed; `GET /auth/verify?token=` sets `isVerified=true` | `auth.ts:210-217,336-361` |
| Login gate on verification | **client-side only** — `LoginForm` refuses to call `login()` when `!data.user.isVerified`, but `POST /auth/login` itself returns a valid 30-day token regardless | `v1/src/components/LoginForm.tsx:54-62` vs `auth.ts:53-91` |
| Password reset | 15 min JWT, also persisted to `users.resetToken` + `resetTokenExpiry`, single-use | `auth.ts:374-386,407-451` |
| Enumeration safety | `/forgot-password` and `/resend-verification` always return 200 | `auth.ts:369-372,293-296` |
| API keys | `akr_<64hex>`, SHA-256 stored, shown once | `auth.ts:469-486` |
| OAuth | **none in V1** — no Google/Facebook code in any V1 file | grep over `v1/src`, `v1/server` |
| 2FA / TOTP | **none in V1** | grep |
| Quick register | `POST /auth/quick-register` returns `{success:true}` and does nothing | `auth.ts:488-490` |

### The JWT secret findings (three, verified at file:line)

**1. The archaeology claim is real but unreachable in the main API.** `auth.ts` uses the fallback
literal `process.env.JWT_SECRET || "my_super_secret_key"` at **five** sites —
`v1/server/api/src/routes/auth.ts:212, 304, 343, 376, 417` — covering email-verification issuance,
resend, verification, password-reset issuance and password-reset verification. However
`v1/server/api/src/middleware/auth.ts:4-10` throws at module load when `JWT_SECRET` is unset, and
`auth.ts:10` imports it, so the process cannot start without the env var. **The literal is
therefore dead in the main API but is a latent footgun the moment that guard is relaxed.** The
archaeology doc lists it without noting the guard.

**2. The secret is committed to the repository.** `JWT_SECRET=72DECEE8F8…22C1DC31` appears in
plaintext at `v1/server/.env:3` and `v1/server/api/.env:4`; `ENC_KEY`, `ENC_SALT` and
`DESKTOP_SIGNATURE` at `v1/server/.env:4-6`. Any deployment using this checked-in file has a
publicly-known signing key.

**3. The exploitable one: a checked-in, never-expiring admin JWT.**
`v1/src/pages/DevLogin.tsx:33` embeds a literal HS256 token. Decoded (CRYPTOGRAPHICALLY VERIFIED):

```
header  {"alg":"HS256","typ":"JWT"}
payload {"id":3,"fullName":"Admin","role":"admin","iat":1782878787}   ← no "exp" claim
```

Its signature verifies against the secret `local-dev-jwt-secret-for-testing-1234567890`, which is
the exact literal hardcoded at **`v1/server/chat-server.cjs:12`** (`process.env.JWT_SECRET || "local-dev-jwt-secret-for-testing-1234567890"`)
and **`v1/server/seed-chat.ts:6`**. Consequences:
- against `chat-server.cjs` with `JWT_SECRET` unset, this token authenticates as a valid admin **forever**;
- `jwt.verify` accepts a token with no `exp`, so it never ages out (`middleware/auth.ts:39`);
- `DevLogin` guards navigation with `import.meta.env.PROD` (`DevLogin.tsx:16`), but the token is a
  **module-level string literal and is therefore compiled into the production bundle** and
  extractable from any shipped JS;
- the `/dev-login` route is registered unconditionally at `v1/src/App.tsx:319`.

### The mock-identity layer (the single most important depth fact about V1 identity)

`v1/src/lib/api.ts` intercepts **every** request inside `if (import.meta.env.DEV)` (`api.ts:76`,
closing at `:1186`) — 1,110 of its 1,268 lines. In a dev build the V1 backend is **never contacted**:

- hardcoded credentials `admin@akarpromax.com`/`admin123` → `role:"admin"` and
  `user@test.com`/`user123` (`api.ts:20-52`);
- "tokens" are the strings `"mock-jwt-token-"+Date.now()` and `"mock-jwt-reg-"+Date.now()`
  (`api.ts:92,178`) — not JWTs, not verifiable by anything;
- **every registered user's plaintext password is written to `localStorage["akar_credentials"]`**
  (`api.ts:14-18,156-157`), and password reset just overwrites it in place with an explicit
  "don't actually hash (it's a mock)" comment (`api.ts:1012-1016`);
- email verification, resend, forgot/reset password, public profile and profile update are all
  simulated against that localStorage blob (`api.ts:930-1108`).

A **third** mock layer exists and is dead: `v1/src/mocks/handlers.ts` (1,267 lines, MSW) is wired
into `v1/src/mocks/browser.ts:4` but **nothing imports `mocks/browser`** — grep over `v1/src`
returns only the file itself. It is the only place `/api/marketer/*` and `/api/users/:id/public` are
implemented at all.

**Depth verdict for V1 authentication: L3 PARTIAL_FLOW.** A real bcrypt + JWT server exists, but the
shipped dev experience never touches it, session invalidation does not exist, and the verification
gate is client-side.

---

## V1 authorization model as implemented

**One primitive, one input.** All V1 server authorization is
`requireRole(...roles)` comparing `req.user.role` — a value taken **verbatim from the JWT claim**,
never re-read from the database (`v1/server/api/src/middleware/auth.ts:56-68`, `:39`). Usage across
all 27 route files:

| Guard | Count | Where |
|---|---|---|
| `requireRole("admin")` | 27 | `admin.ts:9` (router-wide) + 26 individual routes |
| `requireRole("admin","moderator")` | 8 | `properties.ts:56,161,166,171`; `auctions.ts:399,436,452,467` |
| `requireAuth` only | ~60 | everywhere else |
| nothing | many | see below |

**`Role.permissions` is never consulted.** The `Role` table stores a JSON permission blob
(`schema.prisma:686`) and `admin.ts:292-317` reads/writes it, but **no middleware, route or service
anywhere in `v1/server` reads `Role.permissions` or the `Moderator` table to make an authorization
decision.** Verified by grep for `prisma.role`/`prisma.moderator`/`permissions` over
`server/api/src` — the only hits are the CRUD endpoints themselves. The 15-permission catalogue in
`AdminModerators.tsx:18-34` is decorative.

### Client-side authorization is trivially forgeable

`ProtectedRoute` (`v1/src/components/ProtectedRoute.tsx:22,39`) gates on `user?.role !== "admin"`,
where `user` is parsed from `localStorage["akar_user"]` (`AuthContext.tsx:83-88`) — a value the
client itself wrote from the login response (`LoginForm.tsx:62` → `AuthContext.tsx:154-170`).
**Editing that one localStorage field to `"admin"` unlocks all 33 guarded admin pages**, including
every page that persists to localStorage rather than to the server. The startup `/auth/me` refresh
does not fix this: on error it clears only when localStorage is *already* empty (`AuthContext.tsx:143-150`).

### Admin pages with no authorization — the verified numbers

The archaeology claim **"18 of 32 admin pages have NO auth check"**
(`arch/PASS_A_STATUS.md:85`, `arch/PASS_A_COVERAGE_VALIDATION.md:107`) is **not reproducible as
stated**. The denominator 32 does not match any countable set, and at the routing level the claim is
badly wrong. Three separate, precise numbers:

**(a) Admin routes with no client-side guard: 1 of 34.**
`v1/src/App.tsx:282-315` registers 34 `/admin/*` routes; 33 use `<ProtectedRoute … adminOnly />`.
The single exception is **`/admin/auctions`** — `<Route path="/admin/auctions" component={AdminAuctions} />`
at `v1/src/App.tsx:312`, no guard of any kind. (Its server endpoints *are* guarded —
`auctions.ts:436,452` — so the exposure is read-only page shell + a 403 on write.)

**(b) Admin surfaces with no route at all (unreachable): 4.**
`AdminFreeResources.tsx`, `AdminServiceMarket.tsx`, `AdminUsersPage.tsx` (0 bytes), and
**`ModeratorPanel.tsx`** — the only moderator work queue in V1 is not routed.

**(c) The substantive number — admin surfaces whose mutations reach NO server-side authorization:
19 of 37.** Denominator = 36 real `Admin*.tsx` (37 files minus `AdminAds.tsx.bak.0`) minus the
0-byte `AdminUsersPage.tsx`, plus `marketer/AdminMarketers.tsx`, plus `ModeratorPanel.tsx`.

| # | Page | Why it has no server-side authorization | Evidence |
|---|---|---|---|
| 1 | `AdminArtisans` | no network calls at all; state in `localStorage` | 0 `fetch`/`apiRequest` in file |
| 2 | `AdminBlog` | localStorage-only | 3 `localStorage`, 0 fetch |
| 3 | `AdminContent` | localStorage-only | 2 `localStorage`, 0 fetch |
| 4 | `AdminLookups` | localStorage-only (7 taxonomies) | 2 `localStorage`, 0 fetch |
| 5 | `AdminNotifications` | localStorage-only | 5 `localStorage`, 0 fetch |
| 6 | `AdminReports` | localStorage-only | 3 `localStorage`, 0 fetch |
| 7 | `AdminSEO` | localStorage-only (meta, sitemap, robots, JSON-LD) | 5 `localStorage`, 0 fetch |
| 8 | `AdminSettings` | localStorage-only | 2 `localStorage`, 0 fetch |
| 9 | `AdminTickets` | localStorage-only; no server ticket API exists | 3 `localStorage`, 0 fetch |
| 10 | `AdminPlans` | `POST/PUT/DELETE /plans/*` are **`requireAuth` only** — any logged-in user can create, reprice or delete any subscription plan | `v1/server/api/src/routes/plans.ts:17,26,37`; caller `AdminPlans.tsx:103,105,116,127,141` |
| 11 | `AdminDiscounts` | `POST/PUT/DELETE /coupons/*` are **`requireAuth` only** | `v1/server/api/src/routes/coupons.ts:24,34,43`; caller `AdminDiscounts.tsx:109,110,121,131` |
| 12 | `AdminServiceReviews` | four endpoints *named* `/admin/*` guarded by **`requireAuth` only** — any logged-in user can delete any service review and blacklist any provider or client | `v1/server/api/src/routes/service-hub.ts:257,267,276,287`; caller `AdminServiceReviews.tsx:52,57,63,69` |
| 13 | `AdminEliteLeads` | `GET /inquiries/all` is **`requireAuth` only** — every contact enquiry, to any authenticated user; `PATCH /elite-leads/:id/mark` has no handler | `v1/server/api/src/routes/inquiries.ts:7`; caller `AdminEliteLeads.tsx:29,77` |
| 14 | `AdminActivityLog` | `GET /api/activity-log` is **fully anonymous** (`otherRouter` has no guard; its `requireAuth` import at `other.ts:3` is unused) | `v1/server/api/src/routes/other.ts:3,7`; `index.ts:104`; caller `AdminActivityLog.tsx:57` |
| 15 | `AdminFreeResources` | `DELETE /free-resources/:id` is anonymous **and a no-op returning `{success:true}`** | `other.ts:162-166`; `index.ts:105` |
| 16 | `AdminMarketRates` | `PUT /api/market-rates/:code` is sent with **no `Authorization` header at all**, and no PUT handler exists | `v1/src/pages/AdminMarketRates.tsx:96-98`; `other.ts` has no `put` |
| 17 | `AdminVerification` | targets `/api/verification/requests` — **no such route exists** on the V1 server | `AdminVerification.tsx:40,45`; absent from `index.ts:77-138` |
| 18 | `AdminServiceMarket` | 8 calls to `/api/admin/services/*` — **no such routes exist** | `AdminServiceMarket.tsx:52,88,91,103,113,144,147,169` |
| 19 | `AdminChat` | `/admin/conversations`, `/admin/conversations/:id`, `/admin/audit-logs` **do not exist on the API server** — those live on the separate chat process, where `request-oversight` has no admin check at all | `v1/src/services/chatAdminService.ts:5,9,25`; cf. `frag2/12-v1-messaging.md` |

### Unauthenticated privilege escalations in the V1 API (independent of any page)

| Hole | Effect | Evidence |
|---|---|---|
| `POST /api/subscriptions` | **anonymous**; takes `userId` + `planId` from the body and creates a `UserSubscription` that defaults to `status:"active"` — anyone can grant themselves or anyone else a paid plan | `v1/server/api/src/routes/other.ts:79-89`; mounted `index.ts:108`; default `schema.prisma:177` |
| `POST /api/activity-log` | **anonymous**; `userId` and `action` taken from the body — the audit trail is attacker-forgeable | `other.ts:65-77`; `index.ts:104` |
| `POST /api/licenses/redeem`, `/codes/redeem`, `/api/license-codes`, `/api/subscriptions/redeem` | **anonymous**; `userId` from the body — redeem any licence code onto any account. Four copies of the same handler | `v1/server/api/src/routes/licenses.ts:53-77,79-103`; `other.ts:90-113,129-153` |
| `GET /api/coupons/public` | **anonymous**; returns every active coupon row including `code` and `discount` | `coupons.ts:7-15` |
| `otherRouter.delete("/:id")` | **anonymous**; mounted under 12 paths; always returns `{success:true}` without deleting | `other.ts:162-166`; `index.ts:104-136` |
| Desktop signature | one shared static secret for all installs, committed to the repo — any holder of the binary is "the desktop" | `desktop.ts:6-13`; `v1/server/.env:6` |
| `POST /api/desktop/license/validate` | no signature check; binds HWID on first use | `desktop.ts:205,224` |

### Archaeology claims checked

| Claim (`arch/PASS_A_*`) | Verdict |
|---|---|
| "AdminMembership has NO auth guard — any logged-in user can access 14 admin endpoints" | **FALSE.** `/admin/membership` is `adminOnly` (`App.tsx:283`) and all 16 of its calls are `/api/admin/*`, under `requireRole("admin")` (`admin.ts:9`). The real AdminMembership defects are different — see §Membership. |
| "18 of 32 admin pages have NO auth check" | **NOT REPRODUCIBLE.** Real numbers: 1 of 34 routes unguarded; 4 unrouted; **19 of 37** with no server-side authorization on their write path. |
| "JWT fallback secret in auth.ts" | **TRUE but incomplete** — 5 sites, unreachable behind the `middleware/auth.ts:4-10` fail-fast. The exploitable secret is the DevLogin token + `chat-server.cjs:12`. |
| "Fake payment verification" | **TRUE** — verified at file:line, see §Membership. |
| "Desktop HWID reset has NO auth" | **FALSE.** `POST /api/admin/license/:id/reset-hwid` is under the router-wide admin guard (`admin.ts:9,390`). |
| "Plans and Coupons have NO role check" | **TRUE** (`plans.ts:17,26,37`; `coupons.ts:24,34,43`). |
| "Inquiries `/all` has NO role check" | **TRUE** (`inquiries.ts:7`). |

---

## V1 moderator operating model

V1 declares a moderator system three times, at three different fidelities, and only the weakest one
is enforced.

**Layer 1 — the declared catalogue (UI only).** `v1/src/pages/AdminModerators.tsx:18-34` defines
**15 permissions in 4 groups**, plus an `isFullAdmin` master toggle (`:74,82-90`):

| Group (`PERMISSION_GROUPS`, `:36`) | Permission keys |
|---|---|
| المحتوى (Content) | `manage_properties` · `manage_offices` · `manage_suppliers` · `manage_blog` · `manage_software` · `manage_free_resources` · `manage_other_services` · `manage_property_requests` |
| المستخدمون (Users) | `manage_users` · `manage_admins` |
| المالية (Finance) | `manage_ads` · `manage_subscriptions` |
| الدعم (Support) | `manage_inquiries` · `view_analytics` · `manage_settings` |

**Layer 2 — the storage model.** `Role(id, name UNIQUE, permissions String @default("{}"))` and
`Moderator(userId UNIQUE, roleId)` (`schema.prisma:683-705`). CRUD at `admin.ts:290-354`. There is
**no scope column of any kind** — no entity scope, no geography, no city, no category.

**Layer 3 — what is actually enforced.** `requireRole("admin","moderator")` on exactly **8 routes
in 2 domains**:

| Domain | Actions a `moderator` can perform | Evidence |
|---|---|---|
| **Property moderation** | list pending · approve · reject · mark-sold | `v1/server/api/src/routes/properties.ts:56,161,166,171` |
| **Auction moderation** | resolve report · cancel auction · block auction · block bidder | `v1/server/api/src/routes/auctions.ts:399,436,452,467` |

**That is the entire evidence-supported moderator domain set: PROPERTY and AUCTION.** The other 13
permission keys grant nothing. A "manage_users" moderator cannot call `/api/admin/users` — the
router-wide `requireRole("admin")` at `admin.ts:9` rejects `moderator` outright.

### The moderator admin screen is broken end-to-end (4 independent defects)

1. **Response shape.** `AdminModerators.tsx:374-375` does `setRoles(rolesRes.data)` /
   `setModerators(modRes.data)`, but `apiRequest` returns the parsed JSON body directly
   (`v1/src/lib/api.ts:1223`) and `GET /admin/roles` returns a bare array (`admin.ts:293`).
   `.data` is `undefined` → both lists are permanently empty.
2. **Role creation.** The form posts `{nameAr, description, permissions[], isFullAdmin}`
   (`AdminModerators.tsx:204`); the server reads `data.name` (`admin.ts:301`) and the `Role` model
   has no `nameAr`, `description` or `isFullAdmin` columns (`schema.prisma:683-693`). `name` is
   `undefined` → Prisma create fails. **No role can be created from this screen.**
3. **Moderator creation.** The form posts `{roleId, roleType, newUser}`
   (`AdminModerators.tsx:222,415`); the server expects `{userId, roleId}` and does
   `parseInt(undefined)` → `NaN` (`admin.ts:341-342`). **No moderator can be assigned.**
4. **Moderator removal.** The client passes a **user** id into `DELETE /admin/moderators/:id`
   (`AdminModerators.tsx:427`), which the server treats as the `Moderator` **row** id
   (`admin.ts:349-351`) — wrong key, silent mis-delete.

`ModeratorPanel.tsx` — the only actual moderator work surface (pending-property queue with an
approve button and a reject-with-reason dialog, `ModeratorPanel.tsx:41-63,126-144`) — checks
`role !== "moderator" && role !== "admin"` client-side (`:32,65`) and calls the correctly-guarded
property endpoints. **It has no route in `App.tsx` and is therefore unreachable.**

### Reconciled with V2

| Aspect | V1 | V2 | Verdict |
|---|---|---|---|
| Permission vocabulary | 15 flat keys, UI constant only (`AdminModerators.tsx:18-34`) | **two incompatible models**: 88 flat dotted strings (`cur/src/constants/permissions.ts:1-88`) and a nested module/action object where **every value is literally `true`** (`cur/lib/roles/permissions.ts:1-12`) | V2 richer, but duplicated — matches registry `AUTH-041` |
| Role→permission mapping | `Role.permissions` JSON, **never read** | `ROLE_CATALOG` compile-time constant, 12 roles (`cur/src/constants/roles.ts:11-32`), **is** read (`lib/auth/identity-map.ts:16-21`) | **V2 BETTER THAN OLD** |
| Dynamic (DB) roles | `Role` table with CRUD, unenforced | `admin_roles`/`admin_role_assignments` with CRUD, **unenforced, tables never migrated, and `if (!session)`-only authz** (`AUTH-043`) | **both broken; V2 is additionally unsafe** |
| Scope model | **none at all** | `moderator_scopes(user_id, module, country_code, city_id)` — 6 modules `sponsors/ads/news/services/i18n/reports` (`cur/app/api/admin/moderators/route.ts:8`), full CRUD, admin-guarded on `ROLES_VIEW`/`ROLES_MANAGE` (`:29,69`), UI inside `cur/app/admin/roles-admin-client.tsx:177,232,261` | **V2 NEW IMPROVEMENT — but write-only** |
| Scope enforcement | n/a | **none.** `moderator_scopes` is selected by exactly one file — its own CRUD route. And `hasScopedPermission` ignores its `scope` argument entirely: `if (!scope) return true; return true;` (`cur/src/constants/permissions.ts:112-113`) | **V2 REGRESSION-EQUIVALENT — same defect as V1, one generation later** |
| Moderator work queue | `ModeratorPanel.tsx`, unrouted | no equivalent; moderation is folded into `app/admin/*` | **V1 idea worth restoring** |
| Guard on the roles page | `adminOnly` (`App.tsx:291`) | `cur/app/admin/roles/page.tsx:1-5` has **no permission guard** (unlike `app/admin/users/page.tsx:10-14`) — API-side checks still apply | V2 client gap |
| Desktop (the only working model) | — | `Users.Permissions` pipe-delimited keys **including a branch scope token** `branch:1:المكتب الرئيسي`; `Users.Role`; boolean capabilities `CanDeleteRecords/CanViewFinancials/CanManageUsers/HideTrueOwner`; `Users.TenantId`/`BranchId`; and a real grant table `UserRolePermissions(UserId, PermissionKey, IsAllowed, GrantedByUserId, GrantedAt)` (`AkarApp_LIVE/AkarDB.sqlite`); resolver `desk/AkarApp_Next/AkarApp/ViewModels/AppSession.cs:13-49`, scope applied at `:49` (`EffectiveBranchId`) | **the only tree in the family that implements ROLE → PERMISSION → SCOPE end-to-end** |

**Evidence-supported moderator domains for the target model** (V1 enforcement ∪ V1 declared
catalogue ∪ V2 `moderator_scopes` modules), each nameable and each with a real backing surface:
`properties` · `auctions` · `services` · `service_reviews` · `advertising/ads` · `news_content` ·
`users` · `verification` · `subscriptions_finance` · `inquiries_support` · `i18n` · `reports` ·
`settings`. Thirteen domains. Only the first two were ever enforced.

---

## V1 membership / subscription / plans / coupons / payments

### Data model

| Model | Fields with product meaning | Evidence |
|---|---|---|
| `Plan` | `name`, `nameAr`, `price`, `currency` (`OMR`), `duration` + `durationUnit`, `features` (JSON string), `isPopular`, **`targetType`** (audience segmentation) | `schema.prisma:583-600` |
| `UserSubscription` | `userId?`, `planId?` (**both nullable**), `status` default `"active"`, `startDate`, `endDate?` | `schema.prisma:173-187` |
| `Coupon` | `code UNIQUE`, `discount`, `discountType` (`percent`\|other), `isActive`, `usageLimit` (100), `usedCount` | `schema.prisma:602-614` |
| `Setting` | key/value; the only membership key used is `free_trial_days` (default 7) | `schema.prisma:676-681`; `admin.ts:157-158` |
| `SoftwareLicense` | `key UNIQUE`, `status`, `type` (`trial`/`yearly`/`full`), `hwid`, `expiresAt`, `userId?` | `schema.prisma:616-629` |
| `LicenseCode` | `code UNIQUE`, `duration` (365), `plan` (`professional`), `status`, `usedById`, `usedAt` | `schema.prisma:631-643` |

### The fake payment chain (verified at file:line)

| Step | What V1 does | Evidence |
|---|---|---|
| Gateways advertised | Thawani + Tap, both `enabled:true`, as a **module-level array literal** | `v1/server/api/src/routes/payments.ts:7-10` |
| Methods advertised | visa · mastercard · omancard · applepay · googlepay, in **module-level mutable memory** — admin toggles are lost on restart | `payments.ts:12-18,28-35` |
| Checkout | `POST /payments/thawani/checkout` fabricates `sessionId = "thawani_"+Date.now()+random` and returns `paymentUrl: "https://checkout.thawani.om/pay/<fake-id>"`. **No gateway call, no API key, no secret.** Unauthenticated. | `payments.ts:37-48`; caller `Subscribe.tsx:278` |
| Charge | `POST /payments/tap/charge` fabricates `chargeId` and returns `status:"captured"`. **No gateway call.** Unauthenticated. | `payments.ts:57-69`; caller `Subscribe.tsx:258` |
| **Verification** | `POST /payments/thawani/verify` returns **`{verified:true, sessionId, status:"paid"}` for any input** — the `sessionId` is read from the body and echoed, never checked against anything. Unauthenticated. Identically `POST /payments/tap/verify` → `{verified:true, status:"captured"}`. | **`payments.ts:50-55` and `payments.ts:71-76`** |
| UI consequence | `PaymentReturn.tsx:30-31` calls verify and, on any non-throwing response, renders "تم الدفع بنجاح! / Payment Successful" | `v1/src/pages/PaymentReturn.tsx:28-36,51-60` |
| **Entitlement consequence** | **nothing writes `UserSubscription` on payment.** The only writers are `PUT /admin/users/:id/subscription`, `POST /admin/manual-activate` (`admin.ts:132-152,267-287`) and the **anonymous** `POST /api/subscriptions` (`other.ts:79-89`). A "successful" payment grants no entitlement. | grep `prisma.userSubscription` |

So V1 payment is simultaneously **BROKEN** (money is never taken) and **an authorization hole**
(entitlement can be self-granted anonymously without paying).

### Membership administration defects

- **Rank/badge writes are no-ops.** `AdminMembership.tsx:134,144` call
  `PUT /admin/users/:id/rank` with `{rankLevel}` / `{academicBadge}`. The handler is
  `try { res.json({ success:true }) }` — **`v1/server/api/src/routes/admin.ts:115-119`**. It never
  touches Prisma, and no such column exists. The UI shows a success toast; nothing is stored.
- **The rank catalogue is empty.** `GET /admin/catalog/ranks` returns `[]` unconditionally
  (`admin.ts:443-445`), so `AdminMembership.tsx:112,317,351` renders an empty `<select>` and falls
  back to a nonexistent `rankByKey.explorer`.
- **Subscription edits are silently dropped.** `AdminMembership.tsx:163,172` send `{clear:true}`
  and `{durationDays, amount}`; the server's Zod schema accepts only `{planId?, endDate?, status?}`
  (`admin.ts:63-67`) and strips unknown keys, so `safeParse` succeeds with `{}` and the update runs
  with all-`undefined` data (`admin.ts:141-148`). **"Extend membership" and "clear membership" both
  do nothing.**
- **Trial length is global-only** — a single `free_trial_days` setting, no per-plan or per-segment
  trial (`admin.ts:155-172`).
- **Coupons are never consumed.** `POST /coupons/validate` checks `isActive` and
  `usedCount >= usageLimit` but **never increments `usedCount`** (`coupons.ts:52-62`), so a
  100-use coupon is infinite-use. `Subscribe.tsx:181` is the only caller.
- **Plans are public-writable** (`plans.ts:17,26,37`) and **coupons are public-writable**
  (`coupons.ts:24,34,43`) — `requireAuth` only.
- **`UserSubscription.userId` and `planId` are both nullable** (`schema.prisma:175-176`), so an
  orphan subscription attached to nobody is a valid row.
- **No expiry enforcement.** No cron, no middleware and no route ever compares
  `UserSubscription.endDate` to now — the six `setInterval` jobs at `index.ts:169-196` cover
  auctions, relists, ratings, warnings, tenders and news, **not subscriptions**.
- **No entitlement gate anywhere.** Grep finds no route that reads `UserSubscription` to decide
  whether an action is allowed. Membership in V1 buys **nothing** that is enforced.

---

## V1 rank, reputation, trust score, verification, academic badge, distinguished status

This is the section where V1's product ambition is furthest ahead of its implementation.

| Concept | What it is meant to be | How it is computed or set | What it affects | Depth |
|---|---|---|---|---|
| **`isVerified`** | account-level verification badge | set `true` by email verification (`auth.ts:349`) **or** by admin approve (`admin.ts:90`) — **the same boolean is used for two unrelated meanings**: "email confirmed" and "identity documents approved" | a blue badge (`AdminUsers.tsx:448,601`); the client-side login gate (`LoginForm.tsx:54`) | **L4** (as email flag) / **L1** (as identity badge) |
| **`IdentityVerification`** | document review workflow: `nationalId`, `idImageUrl`, `status` (`pending`), `reviewedBy`, `reviewedAt`, `rejectReason` | **created once, at registration, for `company`/`professional` accounts** (`auth.ts:198-207`) | **nothing.** No route reads, approves or rejects it — `prisma.identityVerification` has exactly one occurrence in the whole server | **L2 DATA_MODEL_ONLY** |
| **`AdminVerification` page** | the review queue for the above | calls `/api/verification/requests` (`AdminVerification.tsx:40,45`) | **the endpoint does not exist** (only in the dead MSW file `mocks/handlers.ts:967-987`) | **L1 UI_ONLY** |
| **`isOfficial`** | "official account" mark | column exists, default `false` (`schema.prisma:64`); returned by login/profile (`auth.ts:80`, `profile.ts:47`) | **no writer anywhere** | **L2 DATA_MODEL_ONLY** |
| **`isDistinguished`** | "distinguished member" status | **not a database column.** It exists only in the frontend type and mapping (`AuthContext.tsx:49,119,196`; `Profile.tsx:49,395`) and `/auth/me` never returns it (`auth.ts:456`) | permanently `undefined` → the badge at `Profile.tsx:395` never renders | **L1 UI_ONLY (phantom field)** |
| **`approvedPostsCount`** | earned-trust counter driving distinction | **not a database column**; same three phantom sites (`AuthContext.tsx:50,120,197`) | `Dashboard.tsx:156` and `Profile.tsx:424` always display `0` | **L1 UI_ONLY (phantom field)** |
| **`rank` (user)** | a rank object `{key, ar, en, icon, color, emoji}` on the public profile | supplied by `GET /api/users/:id/public` — **which does not exist**; there is no users router in `index.ts:77-138`. The comment at `Profile.tsx:28` cites a backend `RANK_REGISTRY`/`BADGE_REGISTRY` that exists **nowhere in the V1 tree** | `Profile.tsx:258,320,337` would render it; the fetch always fails | **L0 IDEA_ONLY** |
| **`academicBadge`** | PhD / Engineer academic credential | same nonexistent endpoint; the renderer is `EliteBadge.tsx:18,35`, which accepts only `"phd"` (دكتوراه, `:18-32`) and `"engineer"` (مهندس, `:35-49`) and returns `null` for anything else (`:52`) | rendered on office/supplier cards via `office.ownerTitle` / `supplier.ownerTitle` (`OfficeCard.tsx:125`, `Suppliers.tsx:109`, `OfficeDetail.tsx:166`) — **fields that do not exist in the `Office` or `Supplier` Prisma models** | **L1 UI_ONLY** |
| **`rankLevel` (admin-settable)** | admin assigns a rank to a user | `PUT /admin/users/:id/rank` — **a no-op returning `{success:true}`** (`admin.ts:115-119`); catalogue `GET /admin/catalog/ranks` returns `[]` (`admin.ts:443-445`) | nothing | **L1 UI_ONLY** |
| **`membershipLevel`** | office/supplier tier `basic` \| `professional` \| `promax` | **not a column** in `Office` (`schema.prisma:434-465`) or `Supplier` (`schema.prisma:491-510`); the client coalesces to `"basic"` (`OfficeCard.tsx:40`, `Suppliers.tsx:57`, `OfficeDetail.tsx:108`) | a gold `Crown` border and a "بروماكس" chip (`OfficeCard.tsx:32,79-83,117-121`) that can never be reached | **L1 UI_ONLY** |
| **`Office.rating`** | office star rating | **genuinely computed** — `recalculateAllOfficeRatings()` runs hourly (`index.ts:179-181`) and snapshots to `OfficeRatingSnapshot` (`schema.prisma:1135`) | display; `EarlyWarning` scanning | **L4 END_TO_END_WIRED** |
| **`MarketerRank`** | a real, admin-defined marketer ladder: `nameAr`/`nameEn`, `minProperties`, `maxProperties`, `defaultCommission`, `requiredExperience`, `requiresLicense`, `badge`, `sortOrder`, `isActive` | **no API** — `/api/admin/marketers/ranks` does not exist | commission rate on a contract, in theory | **L2 DATA_MODEL_ONLY** |
| **`MarketerProfile` stats** | `totalProperties`, `successfulDeals`, `totalCommission`, `rating`, `reviewsCount`, `status` (`PENDING`), `approvedBy`, `rejectedReason` | no API writes them | nothing | **L2 DATA_MODEL_ONLY** |
| **`tokenBalance`** | in-app credit | `POST /admin/tokens/grant` increments it (`admin.ts:557-568`) | displayed (`AdminUsers.tsx`, `AuthContext.tsx:121`); **no route ever spends or checks it** | **L3 PARTIAL_FLOW** |
| **`agreedToCharter`** | integrity-pledge timestamp (ميثاق الشرف) | written at registration from `agreeToCharter === "true"` (`auth.ts:182`) | **never read by anything**; `AdminUsers.tsx:449` shows a "وقّع الميثاق" badge from a *different*, local `integrityPledgeAccepted` field | **L2 DATA_MODEL_ONLY** |
| **`CodeOfConduct` / `CodeOfConductAcceptance`** | versioned conduct document with per-user acceptance recording `ipAddress` + `userAgent` and `@@unique([userId,codeId])` — a genuinely good model (`schema.prisma:211-242`) | **zero writers, zero readers** on the server; the only caller is `MarketerRegister.tsx:40` → `/api/marketer/code-of-conduct`, which does not exist | nothing | **L2 DATA_MODEL_ONLY** |
| **`Blacklist`** | ban list `targetId` + `targetType` + `reason` | written by two service-hub endpoints guarded by **`requireAuth` only** (`service-hub.ts:276,287`) | **never read for any authorization decision** | **L2 DATA_MODEL_ONLY** |
| **`banReason` / `bannedAt` / `status="banned"`** | account ban | `PUT /admin/users/:id/status` writes `status` (`admin.ts:121-130`) but **never `banReason` or `bannedAt`**; those two columns have no writer | server-side: **nothing checks `status` on login** (`auth.ts:53-91`) — only the DEV mock does (`api.ts:84-91`) | **L2 DATA_MODEL_ONLY** |
| **`isBannedFromAuctions`** | auction-specific ban | `schema.prisma:94`; written by `auctions.ts` block endpoints | genuinely gates bidding | **L4 END_TO_END_WIRED** |
| **`leadScore` / elite leads** | lead prioritisation | `/elite-leads` returns `[]` (`other.ts:44-47`); `PATCH /elite-leads/:id/mark` has no handler | nothing | **L1 UI_ONLY** |

**Summary: of 20 trust/rank concepts V1 declares, exactly 3 are real** (`isVerified` as an email
flag, `Office.rating`, `isBannedFromAuctions`). Two of the most prominent (`isDistinguished`,
`approvedPostsCount`) are **phantom fields that exist in no database anywhere**. The
"gold / ProMax / elite" vocabulary the reconciliation brief asks about **does not exist in V1 at
all** — the only V1 tier literal is the unreachable `"promax"` CSS branch in `OfficeCard.tsx:32`,
and the only rank key literal in V1 source is `"explorer"` (`AdminMembership.tsx:317`), used as a
fallback into an always-empty catalogue.

---

## Concept separation table

The governing principle: **RANK ≠ PERMISSION.** A reputation tier (gold / ProMax / elite /
distinguished) must never, under any circumstance, grant administrative authority. It may change
*visibility*, *ordering*, *quota* and *presentation* — never *authority*.

| # | Concept | Definition | What V1 did | What V2 does | Target model |
|---|---|---|---|---|---|
| 1 | **IDENTITY** | the one human/legal person behind every session | one `users` row (`schema.prisma:20`), int PK; but `Partner` is a **second credential store** (`schema.prisma:870-880`) and the chat server keeps a **third shadow `users` table** upserted from JWT claims (`server/chat-server.ts:138-141`); DEV builds use a **fourth** localStorage store (`api.ts:20-52`) | four uncorrelated key spaces: `users.id` uuid, `sponsor_access.email`, services `*_user_id` = lower-cased e-mail, `office_device_credentials.sponsor_id` (registry `AUTH-052`, `frag/01-identity.md` special answer (a)) | **exactly one** `identities` row per person, UUID PK, immutable. Every other table carries `identity_id` FK. E-mail is an attribute, never a key. Device and desktop identities are `credentials` rows pointing at it. |
| 2 | **CAPABILITY** | what an identity is *able to do* by virtue of what it is (a professional, a provider, an office owner) | conflated into `users.userType` (`schema.prisma:39`) and, for artisans, granted by a **localStorage write** (`UpgradeToArtisan.tsx:60-61`) | partially separated: an approved `service_provider_profiles` row augments the permission set (`AUTH-047`, `cur/lib/services/identity.ts:20-42`) — the healthiest capability idea in the family | first-class `capabilities` table: `(identity_id, capability, granted_by, granted_at, evidence_ref, status)`. Capabilities are **earned or verified**, never self-asserted, never client-writable. |
| 3 | **ORGANIZATION MEMBERSHIP** | the fact that an identity belongs to an org | `localStorage["akar_companies"].supervisors[]`, added by typing a raw integer into `window.prompt` (`MyCompanies.tsx:28-32`); no invitation, no consent, no server | `organization_members(user_id, role)` (`cur/lib/db/schema.ts:138-141`) — real table, real FK, but **no invite/role-change UI** (`AUTH-050`, `PROF-017`) | `organization_members(org_id, identity_id, status, invited_by, accepted_at)` with an explicit **invite → accept** handshake. Membership is bilateral; nobody is added without consenting. |
| 4 | **ORGANIZATION ROLE** | authority *inside* one org | `supervisors[].permissions = ["post"]` — hardcoded and **never read by any code** (`CompanyContext.tsx:77`) | `owner`/`admin`/`manager`/`agent`/`member` (`cur/lib/db/schema.ts:141`; `AUTH-049`) — modelled, thinly enforced | org role grants **only org-scoped permissions**, resolved as `(identity, org) → permissions`. An org owner has zero platform authority. |
| 5 | **PLATFORM ROLE** | authority over the *platform* | `users.role` ∈ {`user`,`moderator`,`admin`}, read **from the JWT claim, never from the DB** (`middleware/auth.ts:39,62`) — a 30-day token keeps stale authority after demotion, and there is no revocation | `users.role` → `ROLE_CATALOG` (12 roles, `cur/src/constants/roles.ts:11-32`); admin UI writes the wrong table so promotion is inert (`AUTH-044`) and there is no working bootstrap (`AUTH-045`) | platform role stored once, **re-read from the database on every request** (or cached with an explicit, short TTL + revocation). Exactly one writer, fully audited. Default role grants nothing beyond "authenticated". |
| 6 | **PERMISSION** | an atomic, checkable authority to perform one action | declared as 15 UI keys (`AdminModerators.tsx:18-34`) and stored as `Role.permissions` JSON (`schema.prisma:686`) — **never read for any decision**. Real enforcement is 2 role strings | two incompatible vocabularies: 88 dotted strings (`cur/src/constants/permissions.ts`) and a nested object whose every value is `true` (`cur/lib/roles/permissions.ts:1-12`) — `AUTH-041` | a single canonical permission vocabulary, `domain.resource.action`, enumerated in one place, **server-enforced, default deny**. No UI-only permission constants. |
| 7 | **SCOPE (entity)** | *which rows* a permission applies to | **does not exist.** No scope column on `Role` or `Moderator` (`schema.prisma:683-705`) | `moderator_scopes.module` exists and is CRUD-complete (`cur/app/api/admin/moderators/route.ts:8,98`), but **is selected by exactly one file — its own CRUD route** | every grant carries an optional entity scope (`org:*`, `org:123`, `category:plumbing`). Absent scope = **empty**, not universal. |
| 8 | **SCOPE (geo)** | *where* a permission applies | **does not exist** | `moderator_scopes.country_code` + `city_id` exist (`cur/lib/content-schema.ts:183-191`) but `hasScopedPermission` **ignores its `scope` argument**: `if (!scope) return true; return true;` (`cur/src/constants/permissions.ts:112-113`) | geo scope is a first-class predicate in the check, evaluated server-side against the target row's country/governorate/city. A scoped grant with no matching geo denies. |
| 9 | **REPUTATION RANK** | earned standing, visible to other users | phantom (`isDistinguished`, `approvedPostsCount` — not columns anywhere); admin rank write is a **no-op returning `{success:true}`** (`admin.ts:115-119`); catalogue returns `[]` (`admin.ts:443`) | real 5-tier engine with 9 weighted signals and per-entity-type policies (`RANK-001…005`), but signals are **typed in by an admin** (`RANK-008`) and the rank affects nothing — no badge, no directory ordering, no quota, no privilege (`RANK-012…018`) | rank is computed from **observed platform events only**, published as a read-only projection. It may drive badge, directory weighting and quota. It **must never appear in any authorization predicate.** |
| 10 | **VERIFICATION** | an assertion about an identity confirmed by evidence | `isVerified` is **one boolean doing two jobs** — "email confirmed" (`auth.ts:349`) and "documents approved" (`admin.ts:90`); the `IdentityVerification` workflow table has **one writer and zero readers** (`auth.ts:199`) | properly generalised: `verification_records(entity_type, entity_id, type ∈ email/phone/identity/professional/organization/licence/address, status)` (`PROF-020`) — the best model in the family; `document_url` is annotated "encrypted at rest" but is a plain varchar (`PROF-022`) | keep V2's shape. One record per (subject, type). **Email verification is not identity verification.** Verification may unlock capabilities; it never grants platform authority. |
| 11 | **SUBSCRIPTION** | a paid commercial entitlement | `UserSubscription` with **both FKs nullable** (`schema.prisma:175-176`), no expiry job, **no route anywhere reads it to gate anything**, and it can be created **anonymously** (`other.ts:79-89`) | plan limits (`max_branches/users/properties/ads`) survive as columns but the enforcing APIs were deleted (`RANK-016`, `AUTH-009`) | `subscriptions(subject, plan, status, period)` → a computed **entitlement set** (quotas + feature flags). Entitlements are checked separately from permissions and can never be escalated into authority. Payment state is authoritative and gateway-verified. |
| 12 | **ACCOUNT STATUS** | whether the account may be used at all | `status ∈ active/pending/banned/rejected` (`admin.ts:60`) — **but `POST /auth/login` never checks it** (`auth.ts:53-91`); `banReason`/`bannedAt` have no writer; `BlockedIp` and `LoginAttempt` have **zero writers** | five statuses + `is_active` with typed block reasons, checked on login (`AUTH-019`, `AUTH-048`) — genuinely better; no admin suspend API/UI | a status machine checked on **every** request, not only at login, with a typed reason and an audit row. Status overrides every permission: a suspended super-admin can do nothing. |

### RANK ≠ PERMISSION — every violation found, with evidence

| # | Tree | Violation | Evidence | Severity |
|---|---|---|---|---|
| 1 | **V1** | Rank and permission are administered **from the same screen and the same endpoint family**: `AdminMembership.tsx:134,144` writes rank/badge via `PUT /admin/users/:id/rank` while `:154` writes account status via `/admin/users/:id/status` — one surface, one mental model, no separation | `v1/src/pages/AdminMembership.tsx:133-176` | conceptual |
| 2 | **V1** | The `Role.permissions` blob and the `MarketerRank` ladder are both called "rank/role" and both carry a `badge` field; `MarketerRank.defaultCommission` makes a **reputation tier directly determine money** | `schema.prisma:189-208` (`badge`, `defaultCommission`, `requiresLicense`) | real |
| 3 | **V1** | `Office.canCreateAuctions` — a genuine **authority** flag — sits in the same record as `Office.rating`, the reputation number, and is toggled by the same admin surface | `schema.prisma:455-457` | design smell |
| 4 | **V1** | `EliteBadge` renders an *academic credential* ("دكتوراه", "مهندس") as a trust chip on office and supplier cards with no verification record behind it — an unverified claim presented as platform-endorsed standing | `EliteBadge.tsx:18-49`; `OfficeCard.tsx:125`; `Suppliers.tsx:109`; `OfficeDetail.tsx:166` | real |
| 5 | **V1** | `membershipLevel: "promax"` renders a gold `Crown` and a distinct card border — **paid tier presented as trust rank**, blurring commerce and reputation | `OfficeCard.tsx:32,79-83,117-121`; `Suppliers.tsx:44-57` | real |
| 6 | **V2** | `PermissionScope` declares `geo` and `entity` and `hasScopedPermission` **returns `true` unconditionally** — so *any* holder of a permission holds it everywhere, which is the mechanism by which a locally-scoped grant silently becomes global authority | `cur/src/constants/permissions.ts:105-114` (lines 112-113) | **critical** |
| 7 | **V2** | `cur/lib/roles/permissions.ts:1-12` exports a `PERMISSIONS` object in which **every leaf is literally `true`**, and `hasPermission(permissions, module, action)` returns `true` whenever that object is passed — an allow-all table one import away from any call site | `cur/lib/roles/permissions.ts:1-22` | **critical** |
| 8 | **V2** | `POST /api/admin/roles` and `/api/admin/roles/assign` authorize on `if (!session)` alone — **any authenticated user can mint a role with arbitrary permissions and assign it**; a user's *presence* becomes authority | registry `AUTH-043`; `cur/app/api/admin/roles/route.ts:8-9`, `cur/app/api/admin/roles/assign/route.ts:41-42` | **critical** |
| 9 | **V2** | `sponsors.tier` (`exclusive`) + `priority` drive ad placement — a **commercial tier** deciding platform-controlled visibility with no separate entitlement concept | registry `RANK-018` | moderate |
| 10 | **V2** | `service_provider_profiles.is_featured` + `featured_rank` are admin-set and **outrank the earned rating** in provider search ordering — a manual rank overriding an earned one | registry `RANK-019` | moderate |
| 11 | **V2** | `user_business_cards` carries a free-text **`rank`** column with no API, no writer and no relation to `reputation_profiles.level` — a third, unreconciled rank vocabulary | registry `PROF-025` | latent |
| 12 | **Desktop** | `AppSession.IsSuperAdmin` is true if `Perm.Has(Permissions, "admin")` — a **permission string promotes to a role**, inverting the hierarchy; and `Role`/`Permissions` are mutually derived (`Role` inferred *from* `Permissions` at `:77-97`), so the two can never disagree but also can never be independently governed | `desk/AkarApp_Next/AkarApp/ViewModels/AppSession.cs:25,77-97` | moderate |

**No V1 or V2 rank currently grants administrative authority — because no V1 or V2 rank grants
anything at all.** The violations above are *structural*: the two concepts share screens, share
tables, share vocabulary, and in V2 share a check function that cannot distinguish them. The risk is
that the first time a rank is made to *do* something, it will be wired through the permission path,
because that is the only path that exists.

---


## Round 2 — V1 Properties, Leads, Organizations, Marketers, Suppliers, Partners

## AdminEmperor — product meaning

`v1/src/pages/AdminEmperor.tsx` (23 KB, 371 lines), routed at `v1/src/App.tsx:293`
(`/admin/emperor`, `ProtectedRoute … adminOnly`), lazy-imported at `v1/src/App.tsx:58`, entry point linked
from the user dashboard at `v1/src/pages/Dashboard.tsx:178`
("👑 لوحة القيصر — التحليلات المتقدمة").

**The verified starting point holds: it is a read-only executive/growth dashboard, not a control surface.**
Re-verified below against source, with one correction — it is not merely un-wired at the data level, its
endpoint does not exist anywhere in the V1 server.

1. **Why it was designed.** To answer one founder-level question, printed on the page itself:
   *"متى تُفعّل الاشتراكات المدفوعة؟" / "Emperor's Insight — When to Activate Paid Tiers?"*
   (`AdminEmperor.tsx:322`). The final section (`:314-363`) is three hard-coded activation gates —
   craftsmen `/200` (`:329-333`), offices `/50` (`:340-344`), total registered `/500` (`:351-355`) — each
   drawn as a progress bar. The dashboard exists to tell the owner when supply liquidity is thick enough to
   switch monetisation on.
2. **Who uses it.** The platform owner / super-admin only. Client-side guard at `AdminEmperor.tsx:74`
   (`if (!user || user.role !== "admin") { navigate("/"); return null; }`) plus the route-level `adminOnly`
   at `App.tsx:293`. There is no per-permission model and no server-side guard, because there is no server
   endpoint (see 5).
3. **What problem it solves.** Growth intelligence in one screen: marketplace supply counters, demand mix,
   visitor→registrant conversion, weekly retention, and monetisation-readiness — replacing spreadsheet
   guesswork about launch timing.
4. **Data read.** Four namespaces off one payload (`AdminEmperor.tsx:82-85`):
   `counters` (`totalUsers`, `newUsersThisWeek`, `newUsersThisMonth`, `totalCraftsmen`, `totalOffices`,
   `usersWithOfficeName`, `totalProperties`, `totalServiceRequests`, `pendingServiceRequests`, `engineers`,
   `phDs` — `:133-140`); `activity` (`topCategories`, `topSpecialties`, `recentRequests` with
   `clientName/category/specialty/status` — `:157-226`); `conversion` (`totalSessions`,
   `registeredSessions`, `visitorSessionsThisWeek`, `visitorSessionsThisMonth`, `conversionRate` —
   `:240-265`); `retention` (`activeThisWeek`, `returningThisWeek`, `newThisWeek`, `retentionRate` —
   `:281-309`).
5. **API called.** `GET /api/admin/emperor` (`AdminEmperor.tsx:78`) with `refetchInterval: 60_000`
   (`:79`). **This endpoint does not exist in the V1 backend.** `grep -rn "emperor" v1/server/` returns
   nothing; `v1/server/api/src/routes/admin.ts` mounts 50 admin endpoints (`:76-593`) and none is
   `/emperor`. The only implementation anywhere is the dead mock at `v1/src/mocks/handlers.ts:1010-1012`,
   which returns `{status:"ok", uptime:"99.9%", version:"7.0.0"}` — a shape that shares **zero** fields
   with what the page renders. On top of that, the call is double-prefixed to `/api/api/admin/emperor`
   (fact 1) and double-parsed via `.then(r => r.json())` (fact 2).
6. **Data written.** None. There is no mutation, no form, no `POST`/`PATCH` anywhere in the file. The only
   write-shaped control is `refetch()` (`:108`).
7. **Actions available.** Exactly one: **Refresh** (`:108-111`). Everything else is display. This is the
   decisive evidence that it is a read-only surface.
8. **State changes.** None to server state. Client-only: React Query cache for key `["emperor-dashboard"]`
   and the `dataUpdatedAt` timestamp shown in the header (`:87,104-105`).
9. **Notifications.** None emitted, none consumed. No `Notification`/push/email path touches this page.
10. **Relation to properties / services / offices / marketers.** Read-only aggregation across all of them:
    `totalProperties` (properties), `totalOffices` + `usersWithOfficeName` (offices), `totalCraftsmen` +
    `totalServiceRequests` + `topCategories`/`topSpecialties`/`recentRequests` (Service Hub), `engineers`
    and `phDs` (professional segmentation from registration). It **reads about** marketers only indirectly
    (they are counted inside `totalCraftsmen`); no marketer-specific counter exists.
11. **Really wired or only UI?** **Only UI.** The layout, RTL/EN copy, colour system, badge thresholds
    (conversion ≥5% "Excellent", ≥2% "Good"; retention ≥40% "Very Strong", ≥20% "Good" — `:259-265,303-309`)
    and Arabic-Egyptian number formatting (`:15`) are all finished; the data source is absent. It renders as
    a full page of zeros/`—` in every environment.

**Depth: L1 UI_ONLY.** Product idea is valuable and fully specified; the implementation is a façade.

---

## Elite Leads — product meaning

`v1/src/pages/AdminEliteLeads.tsx` (9.4 KB, 145 lines), routed `/admin/elite-leads` at
`v1/src/App.tsx:297`.

**The verified starting point holds: it is a manual admin `isEliteLead` toggle, and `leadScore` is
*displayed*, not computed.** Re-verified, with two corrections that make the picture worse: `leadScore`
does not exist in the database at all, and the mark mutation has no route.

1. **Why it was designed.** To let an admin triage the raw property-inquiry stream and hand-flag the small
   number of high-value buyers ("Elite Leads") worth personal follow-up — the human layer on top of an
   otherwise undifferentiated contact-form firehose.
2. **Who uses it.** Platform admin only (`AdminEliteLeads.tsx:73`, same client-side pattern as Emperor;
   route `adminOnly` at `App.tsx:297`). Not exposed to offices or marketers, even though the underlying
   inquiry belongs to a property that belongs to an office.
3. **What problem it solves.** Lead qualification and prioritisation: a searchable inbox
   (name / phone / email — `:80-84`), three KPI tiles (total / elite / unread — `:113-121`), and a two-tab
   split Elite vs. everything else (`:126-139`). Contact is one tap away — the phone renders as a `tel:`
   link (`:46`).
4. **Data read.** `GET /inquiries/all` (`:77`), i.e. the whole `Inquiry` table, admin-side, unpaginated.
   The page's TS interface (`:19-23`) expects `senderName`, `senderEmail`, `senderPhone`, `propertyTitle`,
   `officeId`, `isRead`, `budgetAmount`, `leadScore`, `isEliteLead`.
5. **Data written / API called.** `PATCH /elite-leads/:id/mark` with body `{ isEliteLead: boolean }`
   (`:29`). **No such route exists.** `v1/server/api/src/index.ts:135` mounts `/api/elite-leads` onto the
   generic `otherRouter`, and `v1/server/api/src/routes/other.ts` declares only `GET /` (`:7`), `POST /`
   (`:65`), `POST /subscribe` (`:122`), `POST /redeem` (`:129`), `GET /resources` (`:155`) and
   `DELETE /:id` (`:162`). There is **no PATCH handler**, so the toggle 404s and never persists.
   `GET /api/elite-leads` itself is a hardcoded `res.json([])` (`other.ts:44-47`).
6. **Where `leadScore` really originates — the required answer: nowhere.** The Prisma `Inquiry` model
   (`v1/server/api/prisma/schema.prisma:707-719`) has exactly six business fields —
   `name`, `email`, `phone`, `message`, `propertyId` — plus `isEliteLead` (`:714`), `createdAt`,
   `updatedAt`. There is **no `leadScore` column, no scoring service, no scheduled job, no formula**
   anywhere in `v1/server/`. `grep -rn "leadScore" v1/` matches only `AdminEliteLeads.tsx:22,41,42`.
   The score badge at `:41-43` is therefore permanently hidden (`leadScore != null && > 0` is never true).
   **This is not AI and never was**; nothing in the backend computes it. (The only lead-scoring *language*
   in V1 is marketing copy on the partner portal: "كل عميل محتمل تم فلترته وتقييمه بدرجة دقيقة" /
   "Every lead is filtered and scored with precision", `v1/src/pages/PartnerPortal.tsx:39,44` — a promise
   with no implementation behind it.)
7. **Field-contract break (additional finding).** The API returns `name/email/phone`; the page reads
   `senderName/senderEmail/senderPhone`. `AdminEliteLeads.tsx:81` calls
   `i.senderName.toLowerCase()` unconditionally, so with real backend rows the filter throws a
   `TypeError` on the first record and the page crashes to the error boundary. `propertyTitle`,
   `officeId`, `isRead`, `budgetAmount` are likewise not returned by any V1 endpoint — the unread badge
   (`:87,104`) always shows 0.
8. **Actions.** Two: free-text search (`:110`) and Mark/Remove Elite (`:55-59`). No reply, no assign, no
   status, no note, no export, no delete.
9. **State changes.** Intended: `inquiries.is_elite_lead` flips. Actual: none (see 5).
10. **Notifications.** None. Marking a lead Elite notifies nobody — not the office that owns the property,
    not the lead, not a marketer. Only a local toast (`:30`).
11. **Relation to properties / offices / marketers.** Weak by design and broken in practice: `Inquiry` has
    `propertyId` (`schema.prisma:713`) but **no FK relation**, so the server cannot join the property or
    its office; `officeId`/`propertyTitle` in the page interface have no source. Marketers are entirely
    disconnected — a lead can never be routed to a `MarketerProfile`.

**Depth: L2 DATA_MODEL_ONLY** — the `isEliteLead` boolean is genuinely persisted in the schema and the read
path (`GET /inquiries/all`, `v1/server/api/src/routes/inquiries.ts:7-12`) is real, but the write path,
the score, and half the displayed fields are not.

---

## Matchmaking — product meaning

`v1/src/pages/AdminMatchmaking.tsx` (9.0 KB, 139 lines), routed `/admin/matchmaking` at
`v1/src/App.tsx:295`, in the admin sidebar at `v1/src/components/layout/AppSidebar.tsx:36`.

**The verified starting point is half right and must be corrected.** The *product intent* is exactly
"buyer/property requests ↔ developer projects, with a page-triggered server-side `run` / `run-all`".
But the brief asks for the algorithm to be described precisely, and the honest answer from source is:
**there is no algorithm.** No matchmaking route, no service, no model, no scoring function exists anywhere
in `v1/server/`.

1. **Why it was designed.** To close the loop between two V1 datasets that never meet: buyers who post a
   wanted-property brief (`PropertyRequest`) and developers who list off-plan projects (the "projects" of
   the Partner Portal). Instead of buyers hunting listings, the platform pushes qualified demand at
   developer inventory, and sells the resulting introduction — the Partner Portal prices a lead at
   `leadPrice` default `"50"` (`v1/src/pages/PartnerDashboard.tsx:206`).
2. **Who uses it.** Platform admin (`AdminMatchmaking.tsx:25`, route `adminOnly` at `App.tsx:295`). It is
   an operator console, not a self-serve developer tool — matching is a batch an admin *fires*, per project
   or across all projects.
3. **What problem it solves.** Cold inventory + orphan demand. A developer project sits in a city with a
   price band; buyer requests sit with `city`, `propertyType`, `minPrice`, `maxPrice`
   (`schema.prisma:721-739`). Matchmaking is meant to be the join that turns both into a lead list, with a
   per-project audit trail (`lastMatchedAt`, `matchCount`, `requestCount` — `AdminMatchmaking.tsx:113-126`).
4. **Data read.** `data.stats` = `{ totalProjects, totalRequests, totalMatches, lastRun }` (`:82-85`);
   `data.activeProjects[]` = `{ id, nameAr, city, projectType ∈ residential|commercial|mixed
   (`:27-31`), priceFrom, matchCount, requestCount, lastMatchedAt }` (`:101-127`).
5. **Data written.** Intended: match rows + `lastMatchedAt` + counters. Actual: none.
6. **API called.** `GET /api/matchmaking/stats` (`:35`), `POST /api/matchmaking/run/:projectId` (`:39`),
   `POST /api/matchmaking/run-all` (`:48`). **None of the three exists.**
   `grep -rn "matchmaking" v1/server/` → no matches. There is also **no `DeveloperProject`/`Project` model**
   in `v1/server/api/prisma/schema.prisma` (`grep -n "^model "` lists 62 models; none is a project), so the
   entity the algorithm would match *against* has no table. All three paths are additionally
   double-prefixed to `/api/api/matchmaking/...` (fact 1) and double-parsed (fact 2).
7. **The "algorithm", precisely.** The only executable definition in the repository is the dead mock:
   `v1/src/mocks/handlers.ts:999-1002` → `POST */api/api/matchmaking/run/:id` returns the constant
   `{ success: true, matched: 3 }`; `:1004-1006` → `run-all` returns the constant
   `{ success: true, matched: 10 }`; `:994-997` returns a fixed `stats` object. There is no distance
   function, no price-band overlap, no type match, no scoring, no threshold, no persistence — the numbers
   are literals. The page's success toasts even read fields the mock never returns
   (`result.total` at `:42`, `result.totalMatched`/`result.projectsProcessed` at `:51`), so even against the
   mock the toast prints `undefined`.
8. **Actions.** Refresh (`:72`), **Run Full Matching** (`:73-75`), and per-project **Run** (`:117-121`)
   with a spinner bound to `runningId` (`:22,118-119`).
9. **State changes.** Client-only: `runningId`/`runningAll` flags and a React Query invalidation of
   `["admin-matchmaking"]` (`:41,50`).
10. **Notifications.** None — not to the developer whose project matched, not to the buyer whose request
    matched, not to an office. Only local toasts (`:42,51`).
11. **Relation to properties / services / offices / marketers.** It is the intended bridge between
    `PropertyRequest` (which *is* wired — `v1/server/api/src/routes/property-requests.ts:7-99`) and
    developer projects (which are UI-only, created from `PartnerDashboard.tsx:205-208,224-227`). Offices are
    bypassed entirely: the existing office-offer flow (`OfficeRequests.tsx:78`) is the *manual* competitor
    to this automated path, and the two were never reconciled. Marketers are not referenced. The page title
    calls it "ذكاء الاقتران العقاري (AI Matchmaking)" / "AI Property Matchmaking" (`:67`) and the SEO
    description claims "AI-powered property matchmaking" (`:61`) — **unsupported by any backend code**.

**Depth: L1 UI_ONLY** (the operator console is real; the engine, the entity and the endpoints are absent).

---

## V1 property data model

Source: `v1/server/api/prisma/schema.prisma` (62 models total).

| Model | Lines | Shape | Notes |
|---|---|---|---|
| `Property` | `:383-431` | 40 fields | Bilingual `title/titleAr`, `description/descriptionAr`, `city/cityAr`, `governorate/governorateAr`; `type` (sale/rent, `:389`), `category`, `price`+`currency` (`:391-392`), `area`, `bedrooms`, `bathrooms`, `floor`, `country`+`countryCode` (`:401-402`), `facade` (`:403`), `propertyAge` (`:404`), `images` as a **JSON string** (`:405`), `videoUrl`, `status` (`:407`), `lat`/`lng` (`:408-409`), `isFeatured`, `views`, `userId`, `officeId?`, and a marketing block `marketingEnabled/StartDate/EndDate/NotesAr/NotesEn` (`:414-418`). Relations: `user`, `office?`, `auctions[]`, `suspiciousRelsits[]` (sic), `marketingContracts[]`, `marketingProposals[]`. |
| `Office` | `:434-465` | 24 fields | `name/nameAr`, `city/cityAr`, `governorate`, `phone`, `email`, `imageUrl`, `description/descriptionAr`, `licenseNumber`, `propertyCount` (denormalised), `rating`, `userId`, `isVerified`+`verifiedAt` (`:452-453`), `canCreateAuctions`, `isAuctionsBanned` (`:454-455`), `auctionSettings?`, `ratingSnapshots[]`. |
| `Inquiry` | `:707-719` | 6 business fields | `name`, `email`, `phone`, `message`, `propertyId?` (**no FK relation**), `isEliteLead` (`:714`). No `leadScore`, no `isRead`, no `officeId`, no `budgetAmount`, no status, no assignment. |
| `PropertyRequest` | `:721-739` | 9 fields | `userId`, `title?`, `description?`, `propertyType?`, `city?`, `neighborhood?`, `minPrice?`, `maxPrice?`, `status` default `"open"`. Relations `user`, `offers[]`. No area range, no bedrooms, no district JSON, no agent assignment. |
| `PropertyOffer` | `:741-755` | 6 fields | `propertyRequestId`, `userId`, `message?`, `price?`, `status` default `"pending"`. **No `propertyId`** — an office cannot attach the listing it is offering. |
| `Booking` | `:1191-1206` | 11 fields | `propertyId`, `userId`, `officeId?`, `status` default `"PENDING"`, `fullName`, `phone`, `email?`, `message?`, `preferredDate?`. **Zero server references** (`grep -rn "prisma.booking" v1/server/` → none). This is the V1 viewing-request table, never used. |
| `SuspiciousRelist` | `:1032-1060` | 15 fields | `oldAuctionId`, `newAuctionId`, `propertyId`, `officeId`, `winnerId?`, `previousSoldPrice`, `newStartPrice`, `priceDropPercent`, `status`, `adminNote?`, `proofDeadline`, `resolvedAt?`; indexed on status/office/property. |
| `SaleProof` | `:1062-1083` | 13 fields | `relistId`, `contractUrl?`, `paymentReceiptUrl?`, `buyerSignatureUrl?`, `transactionDate?`, `notes?`, `status`, `reviewedBy?`, `reviewedAt?`, `rejectReason?`. |
| `OfficeRatingSnapshot` | `:1135-1156` | 14 fields | `overallScore`, `badge` (default `BRONZE`), `completionRate`, `responseSpeed`, `complaintScore`, `manipulationScore`, `clientRating`, `totalAuctions`, `completedAuctions`, `totalComplaints`, `manipulationCases`. Written only by `v1/server/api/src/services/auction-intelligence.ts:41`. |
| `Supplier` / `SupplierProduct` | `:491-510` / `:512-524` | 15 / 8 | Supplier: `name/nameAr`, `category`, `city/cityAr`, `phone`, `email`, `imageUrl`, `description/descriptionAr`, `website`, `rating`. Product: `name/nameAr`, `price`, `currency`, `description`, `imageUrl`, cascade-deleted with supplier. |
| `Partner` | `:870-880` | 5 fields | `email` (unique), `passwordHash`, `name`, `company?`. **No campaigns, no projects, no leads, no tier, no apiKey** — everything the Partner Portal UI manipulates. |
| `Blacklist` | `:882-890` | `targetId`, `targetType`, `reason?` | Written only from Service Hub (`v1/server/api/src/routes/service-hub.ts:280,291`). |
| `PortfolioMedia` | `:119-129` | `url`, `caption?`, `order`, `userId` | Wired: read at `v1/server/api/src/routes/auth.ts:61,245`, written at `auth.ts:189` and `profile.ts:95` (with a count guard at `profile.ts:94`). |
| `AuctionPriceHistory` / `EarlyWarning` | `:1158-1172` / `:1174-1189` | — | Both written by `auction-intelligence.ts` (`:291`, `:106/127/156`); `EarlyWarning` read by `auction-enhancements.ts:132-136`. |

**Not in the V1 model at all** (but assumed by V1 UI): property amenities, property media table
(images are a JSON string), property boundary/polygon, price history per listing, favourites table,
saved-search table, property-view log, expanded listing terms (see `V1-PROP-035`), office membership /
branches / staff, company entity, developer project.

Desktop comparison (`AkarDB.sqlite`, 55 tables; models `desk/AkarApp_Next/AkarApp/Models/`): the desktop app
carries `Properties`, `PropertyAttachments`, `PropertyAmenities`, `PropertyBounds`, `PropertyBrokers`,
`PropertyGisPolygons`, `PropertyInstallments`, `PropertyLegalStatus`, `Ownerships`, `Units`, `Coordinates`,
`CoBrokingRequests`, `RentInstallments`, `SaleInstallments`, `Contracts`, `HandoverSchedules` — i.e. the
desktop data model is **substantially richer than V1 web** on exactly the axes V1 web is missing.

---

## V1 lead & request data model

The V1 lead surface is four disconnected islands. There is no shared lead entity.

1. **Property inquiry (`Inquiry`)** — created by the public property detail form,
   `v1/src/pages/PropertyDetail.tsx:221` → `POST /inquiries`, handled at
   `v1/server/api/src/routes/inquiries.ts:14-25`. **Contract break:** the server requires
   `name`, `email`, `message` (`inquiries.ts:16-19`) but the client sends
   `{ propertyId, senderName, senderPhone, senderEmail, message }` (`PropertyDetail.tsx:140,221`), so every
   real submission returns `400 "Name, email, and message are required"`. Read back only by
   `GET /inquiries/all` (`inquiries.ts:7-12`, `requireAuth` only — **any logged-in user can read every
   inquiry on the platform**, not just admins).
2. **Buyer property request (`PropertyRequest` + `PropertyOffer`)** — the genuinely working marketplace.
   Create: `v1/src/pages/Properties.tsx:322` (inline "اطلب عقارك من المكاتب" form) →
   `POST /property-requests` (`property-requests.ts:29-52`). Buyer inbox:
   `v1/src/pages/MyPropertyRequests.tsx:49` → `GET /property-requests/mine` (`property-requests.ts:19-27`).
   Office discovery: `v1/src/pages/OfficeRequests.tsx:55` → `GET /property-requests`
   (`property-requests.ts:7-17`, returns all `status:"open"` requests with user + offers).
   Office offer: `OfficeRequests.tsx:78` → `POST /property-requests/:id/offers`
   (`property-requests.ts:55-73`). Buyer accept/reject: `MyPropertyRequests.tsx:62` →
   `PATCH /property-requests/:requestId/offers/:offerId` (`property-requests.ts:87-99`). Close:
   `MyPropertyRequests.tsx:72` → `PATCH /property-requests/:id/close` (`property-requests.ts:75-85`).
3. **City-interest alert (the real V1 "saved-search alert")** —
   `v1/server/api/src/services/notification-sender.ts:101-112` `findMatchingUsers(city)` scans active,
   verified users and JSON-parses `User.interestedCities`; `notifyCityMatch(city, type, title, id)`
   (`:114-164`) writes an in-app `Notification` row (`:142-152`) **and** sends an email via
   `sendEmail` (`:155-159`, logged to `EmailLog` at `:168`). It is invoked on new property
   (`v1/server/api/src/routes/properties.ts:151-153`) and new property request
   (`property-requests.ts:46-48`).
4. **Elite Leads** — the admin triage layer over island 1; see the product-meaning section above.

Nothing joins these: an `Inquiry` cannot become a `PropertyRequest`, a `PropertyOffer` cannot become a
`Commission`, and a matched developer project cannot become anything at all.

---


## Round 2 — V1 Services, Artisans, Urgent Dispatch, Tenders, Auctions

## V1 Service Hub architecture

V1 does **not** have one services system. It has **four independent delivery modes** plus a fifth
"directory of companies", selected by *which page the user lands on*, not by a mode switch:

| Mode | Entry point | Selection mechanism | Backing store |
|---|---|---|---|
| **A. Company/service directory** (`OtherService`) | `OtherServices.tsx:42`, detail `ServiceDetail.tsx:41`, owner CRUD `MyServiceDashboard.tsx:67` | Category + city + free-text filter (`OtherServices.tsx:57`) | `other_services` + `other_service_items` (schema.prisma:757,776), routes `services.ts:20-149` |
| **B. Provider directory + direct contact** (Service Hub) | `ServiceHub.tsx:1244` | 4 sector tabs → specialty card → provider list → chat / call / book / quote (`ServiceHub.tsx:1862`, `:1911`, `:2254`) | `ServiceHubProfile` (schema.prisma:790) + client-side `localStorage` mirror `lib/artisanData.ts:1` |
| **C. Urgent Dispatch ("ringing")** | `VehicleServices.tsx:284` (client side), `TechnicianInbox.tsx:64` (provider side) | Geo-required form → server returns ≤10 nearby providers → **client curates the candidate list** → dispatch (`VehicleServices.tsx:498`, `:536`, `:570`) | `ServiceHubRequest` (schema.prisma:809), routes `service-hub.ts:73-194` |
| **D. Tender / competitive bid** | `Tenders.tsx:37`, `TenderCreate.tsx:38`, `TenderDetail.tsx:26` | Client posts an RFQ with budget range + duration; verified artisans place **sealed** bids; client awards one | `ServiceTender` / `TenderBid` / `TenderActivityLog` / `TenderSetting` (schema.prisma:1208,1243,1266,1303), routes `tenders.ts` |
| **E. Engineering consultancy review** | `ConsultantDashboard.tsx:383` | 5-pillar approval matrix (arch / str / mep / elec_elv / life_safety) + version timeline + digital sign-off | **none** — `MOCK_PROJECTS` in-file (`ConsultantDashboard.tsx:48`) |

Taxonomy for A/B is server-driven: `Category` (schema.prisma:1283) keyed by `type`
(`other_service` | `service_hub`) × `section` (`OTHER_SERVICES` | `CRAFTS` | `ENGINEERING` |
`PHOTOGRAPHY` | `DISPUTE_RESOLUTION`) — see `AdminCategories.tsx:26-30` and
`ServiceHub.tsx:1265` (`GET /api/categories?type=service_hub&active=true`), `:1274-1277` (section→tab fan-out).
Icons are string keys resolved to Lucide components client-side (`ServiceHub.tsx:74-79`).

Mode B is what the user sees first, and it is deliberately **non-dispatching**: the comment at
`ServiceHub.tsx:1286` reads "Submitting via direct contact — no dispatch request needed". The specialty
form collects description, phone and precise location, then lists providers with distance, tier, rating,
working hours and portfolio, and hands over to chat (`:1497`), `tel:` (`:1502`), appointment (`:2299`)
or quote (`:2308`).

**Depth reality check.** Mode B's directory calls `GET /service-providers` (`ServiceHub.tsx:1449`),
appointments/quotes call `POST /service-requests` (`:941`, `:1057`), and the inbox calls
`GET /service-providers/my-requests` (`:1383`). **None of these three paths is mounted on the V1 server**
— `server/api/src/index.ts:81-137` registers no `/api/service-providers` and no `/api/service-requests`.
`apiRequest` throws on any non-2xx (`src/lib/api.ts:1205-1219`) and has no mock for these paths, so the
provider list silently renders empty (`ServiceHub.tsx:1451`) and booking/quote submissions always toast
"Failed to send request" (`:955`). Mode B is therefore **L3 PARTIAL_FLOW**, not L4, however polished.

---

## Urgent Dispatch mechanics

This is V1's most distinctive product idea and has **no counterpart anywhere in V2**. The full designed
spec is recoverable from the frontend contracts; the server implements only a thin subset.

### States (request)
`pending` → `accepted` → `completed`, with side branches `rejected`, `not_agreed`, `excused`,
plus client-facing labels `sent`, `dispatching` ("Searching"), `failed` ("No Response"), `closed`,
`expired` (`ServiceHub.tsx:1510-1520`; server transitions `service-hub.ts:148,160,172,184,53`).
Provider-side "active job" = `accepted` or `in_progress` (`service-hub.ts:130`).

### Client-side dispatch composition (two-step, `VehicleServices.tsx`)
1. Validation gate: name + phone required (`:470`), **location mandatory** — either GPS coords or a
   pasted map link (`:478-487`).
2. `POST /service-hub/requests/preview` with `{specialty, lat, lng}` (`:494-505`) returns
   `{providers:[{userId,name,tier,isTopRated,photoUrl,distanceKm}]}` (`:524`).
3. Empty result → "No nearby provider is currently available" (`:526-533`).
4. Curation dialog: up to 10 candidates, **all pre-selected** (`:536`), select-all / clear
   (`:1043-1048`), per-provider tier + Top badge + distance in m/km (`:1088-1096`).
5. `POST /service-hub/requests` with `{category ("home_vehicle"|"vehicles"), specialty, description,
   clientPhone, city, locationLink, lat, lng, selectedProviderIds}` (`:562-575`).

### Provider-side ring loop (`TechnicianInbox.tsx`)
- Poll every **5 000 ms** (`:22`, `:146`) across three endpoints: profile, `requests/ringing`,
  `requests/active` (`:110-114`).
- Ringing payload contract (`:24-36`): `id, category, specialty, description, status,
  **timeLeft** (seconds), **previousNote**, createdAt, **clientCaution**, **clientBlacklisted**,
  **clientWarnings**`. `timeLeft` is rendered as a live countdown badge (`:460`) and the card pulses
  (`:451`).
- Profile payload contract (`:50-57`): `notificationsEnabled, notificationsSuspended, suspensionReason,
  **pendingExcuse**, **missedCount**, **activeRequestId**`.
- Accept (`:159`) → server sets `providerId` + `accepted`; UI expects the response to carry the client's
  phone (`:170`) and immediately re-fetches `requests/:id/phone` (`:121`).
- Reject with an optional note (`:184-188`) — the note is explicitly **handed to the next technician**
  ("this note will be passed to the next technician", `:576-577`) and re-displayed to them as
  "Note from previous technician" (`:473-479`).
- "Not agreed" after acceptance requires ≥3 chars of reason (`:205`) and **transfers the job onward**
  ("Transferred", `:224`; note visible to the next technician `:599-600`).
- Complete (`:238`) then non-blocking private client rating (`:249-259`).

### Escalation / discipline ladder
- `missedCount` counts unanswered dispatches. **5 missed → a forced excuse + pledge dialog** that cannot
  be dismissed (`:722-723` `onInteractOutside` prevented; auto-opened at `:151-153`), excuse text must be
  ≥10 chars (`:277`); **10 missed → admin suspension** (`TechnicianSettings.tsx:227-228`).
- While `notificationsSuspended`, the availability toggle is disabled (`TechnicianSettings.tsx:218`) and a
  red banner shows `suspensionReason` (`TechnicianInbox.tsx:334-347`).
- Provider self-mute: `notificationsEnabled=false` ⇒ "no new requests will be sent to you"
  (`TechnicianSettings.tsx:211-212`).
- Working-hours gate: "Outside these hours, you won't receive dispatches" (`TechnicianSettings.tsx:243-245`).
- Proximity gate: "We use your location to send the nearest jobs first"; without coords "we can't
  prioritize you by proximity" (`TechnicianSettings.tsx:286-306`).
- Single-active-job invariant: `activeRequestId` on the profile; the UI hides the ringing card whenever an
  active job exists (`TechnicianInbox.tsx:450` `!active && ringing`).

### Data written / privacy rules
- Client phone is withheld until acceptance — client-side promise at `ServiceHub.tsx:2018-2019`
  ("Your number is hidden until a professional accepts"), reveal endpoint `service-hub.ts:138`.
- Location travels as both raw `lat/lng` and a Google Maps URL; the technician gets a one-tap map link
  (`TechnicianInbox.tsx:413-424`).
- Client risk flags (`clientCaution`, `clientWarnings`) are rendered as a red pre-acceptance warning
  ("this client has N prior negative notes", `TechnicianInbox.tsx:481-490`).

### What the V1 server actually implements (the gap)
| Designed | Server reality |
|---|---|
| Per-provider ring with `timeLeft` timeout | none — `service-hub.ts:113-123` returns **all** `pending` requests whose `specialty` equals the provider's `category`, as an **array**, while the UI assigns it to a single object (`TechnicianInbox.tsx:116`) |
| Tiered/sequential escalation over `selectedProviderIds` | `selectedProviderIds` is never read; `POST /requests` (`service-hub.ts:73-87`) stores only `userId, specialty, description, estimatedPrice, estimatedDuration` — `category`, `clientPhone`, `city`, `lat`, `lng`, `locationLink` are all dropped |
| Distance-ranked preview | `requests/preview` (`service-hub.ts:89-101`) ignores `lat`/`lng`, matches `category === specialty`, orders by `rating desc`, `take 10`, and returns a **bare array** while the UI reads `data.providers` (`VehicleServices.tsx:524`) |
| `missedCount` / `pendingExcuse` / suspension | **absent from the DB** — `ServiceHubProfile` (schema.prisma:790-807) has no such columns; `excuse` merely sets the *request* status to `"excused"` (`service-hub.ts:53-64`) and the payload key mismatches (`reason` sent, `requestId` read) |
| Availability / working hours / GPS persistence | `PATCH /profile/availability` (`service-hub.ts:66-71`) **echoes the input and writes nothing**; `workingHoursStart/End`, `currentLat/Lng`, `locationUpdatedAt` do not exist in the schema |
| Phone reveal authorization | `GET /requests/:id/phone` (`service-hub.ts:138-146`) has **no ownership check** — any authenticated user can read any requester's phone number by id |
| Reject/not-agreed note relay | notes are accepted by the UI but never persisted (`service-hub.ts:160-182` ignore `req.body`) |

**Verdict:** Urgent Dispatch is **L3 PARTIAL_FLOW**. The product design is fully and unambiguously
specified by the client contracts; the persistence and the dispatch engine were never built.

---

## Provider availability, working hours, GPS and dispatch log

- **Availability model, server-intended:** boolean `notificationsEnabled` (self) × `notificationsSuspended`
  (admin) × working-hours window × `activeRequestId` (busy) × proximity. Only the first two + the window
  appear in the UI contract (`TechnicianSettings.tsx:18-31`); none of the five is stored.
- **Availability model, actually persisted:** a client-side `localStorage` record —
  `lib/artisanData.ts:1` (`akar_artisans`), `available:boolean` + `workingHours[{day,from,to}]`
  (`:3-7`, `:23-24`), mutated by `updateAvailability` (`:75`) and by the admin toggle
  (`AdminArtisans.tsx:48`). Seven demo artisans ship as defaults (`lib/artisanData.ts:33-40`).
- **Working hours, two incompatible shapes:** per-day rows in Mode B
  (`ServiceHub.tsx:308-310`, editor `:562-612`, day list `:323-324`) versus a single start/end pair in
  dispatch (`TechnicianSettings.tsx:247-268`). Appointment slots are derived from the per-day rows by
  matching the weekday of the chosen date (`ServiceHub.tsx:927-935`, slot chips `:998-1015`).
- **GPS capture, three ways, on both sides:** browser geolocation
  (`ServiceHub.tsx:1417-1436` client, `:624-636` provider, `TechnicianSettings.tsx:107-121` technician),
  an OpenStreetMap picker with Nominatim search and manual lat/lng
  (`ServiceHub.tsx:669-781`, embed `:738`), and Google-Maps-URL parsing supporting `?q=`, `/@`, `?ll=`
  (`lib/artisanData.ts:227-241`, wired at `ServiceHub.tsx:2114`). Client coords persist to
  `localStorage["akar_search_location"]` (`ServiceHub.tsx:1421`).
- **Distance:** haversine + nearest-first sort, city-name fallback, "no location ⇒ no distances"
  (`lib/artisanData.ts:88-118`); rendered as m under 1 km (`ServiceHub.tsx:2195-2199`).
- **Availability alerts ("notify me when free"):** watch list in
  `localStorage["akar_availability_alerts"]` (`lib/artisanData.ts:247-289`), UI button only shown for
  unavailable providers (`ServiceHub.tsx:2313-2337`), **10-second polling** that toasts and auto-unwatches
  when the artisan flips available (`ServiceHub.tsx:1479-1493`).
- **Ringtone subsystem** (`hooks/useRingtone.ts`): five WebAudio-synthesised patterns —
  `classic` 3.5 s period, `urgent` 1.2 s square-wave triple-beep, `melody` C-E-G-C, `pulse`, `bell` with
  two harmonics (`:42-93`); `startRinging(durationMs = 60000, tone)` loops the pattern on an interval and
  hard-stops after the duration (`:112-143`); persistence key `akar_ringtone` (`:20`).
  **No caller exists** — `grep` finds no import of `useRingtone` outside the hook, so the 60-second ring
  window is the only surviving trace of the intended per-dispatch timeout. `L2 DATA_MODEL_ONLY`
  as shipped, but it is the concrete artefact of the "ringing" metaphor.
- **Dispatch log:** V1 has an audit log for tenders (`TenderActivityLog`, schema.prisma:1266) and
  auctions (`AuctionLog`, schema.prisma:996) but **no dispatch log model at all**. The only generic sink is
  `ActivityLog` (schema.prisma:847), which the service-hub routes never write. The per-request history the
  technician UI implies (previous rejections, previous notes, hop count) has no storage.

---

## V1 tender / competitive bid model

Fully server-implemented and the most production-like services surface in V1 (`L4 END_TO_END_WIRED`).

**Create** (`tenders.ts:35-81`): `{category, city, title, titleAr, description, descriptionAr,
budgetFrom, budgetTo, currency (default SAR), durationDays, images[]}`. Duration **hard-bounded 3–30 days**
(`:43-46`) and additionally capped by the owner's `TenderSetting.maxDurationDays` (`:47-52`, default 30,
schema.prisma:1308). `endsAt = now + days` (`:53`). Writes a `CREATED` activity-log row (`:70`) and
notifies the owner (`:73-78`). UI: `TenderCreate.tsx:38-127` (bilingual title/description, 10 categories
`Tenders.tsx:117-127`, city select, budget range, duration hint `:119`).

**Discover** (`tenders.ts:84-107`): filters status / category / city (contains) / free-text on
`title|titleAr`, sorts newest / oldest / budget_high / budget_low; default status filter is
`{OPEN, AWARDED}`. Every item is decorated with `bidCount`, `isExpired`, `timeRemaining`
(`:24-32`) and rendered with a d/h countdown (`Tenders.tsx:72-76`).

**Bid** (`tenders.ts:151-187`) — eligibility stack, in order:
verified user only ("Only verified artisans can bid", `:157`) → account `status === "active"` (`:158`) →
tender `OPEN` (`:161`) → **not your own tender** (`:162`) → not expired (`:163`) →
**one bid per artisan per tender** enforced both in code (`:164-167`) and by
`@@unique([tenderId, artisanId])` (schema.prisma:1260). Bid = `{amount, description, durationDays}`;
created with **`isHidden: true`** (`:173`).

**Sealed-bid visibility.** `TenderBid.isHidden` defaults true (schema.prisma:1252). The owner sees every
bid; a bidder sees only their own plus any non-hidden bid (`TenderDetail.tsx:67-69`), and is told
"Your bid is hidden from competitors" (`:252`). The server, however, returns the **full bid list including
artisan identity** on `GET /tenders/:id` (`tenders.ts:118-121`) — the sealing is enforced only in the
browser. **Confidentiality defect.**

**Owner actions.** Edit while OPEN and unexpired, whitelisted fields only (`tenders.ts:131-148`);
**award** a specific bid in a transaction that flips tender→`AWARDED`, bid→`AWARDED`, sets
`awardedBidId`/`awardedAt`, logs `AWARDED` and notifies the winner (`:236-271`);
**close early** → `CLOSED`, `endsAt = now`, notify every pending bidder (`:274-299`);
**extend** by 1–30 extra days subject to the same `maxDurationDays` ceiling measured from `createdAt`
(`:302-324`). Bidder may **update** (`:190-212`) or **withdraw** → status `WITHDRAWN` (`:215-233`).

**Lifecycle automation.** `closeExpiredTenders()` (`tenders.ts:394-419`) runs every 5 minutes
(`server/api/src/index.ts:187-191`): OPEN + past `endsAt` → `CLOSED` + `CLOSED_AUTO` log + an
in-app notification to every pending bidder **and** to the owner ("Review bids and award").

**Audit + notifications.** `TenderActivityLog` records CREATED / BID_PLACED / BID_WITHDRAWN / AWARDED /
CLOSED_EARLY / EXTENDED / CLOSED_AUTO / CANCELLED (`tenders.ts:71,177,229,260,286,320,404,383`), surfaced
on the detail page (`tenders.ts:122`). Five notification types flow through
`notifyUser` → `Notification` row + web-push (`services/notification-sender.ts:51-84`,
type union `:39`).

**Dashboards.** Owner: `DashboardTenders.tsx:31` (`/tenders/my/list`, tabs open/closed/awarded `:42-43`).
Bidder: `DashboardTenderBids.tsx:26` (`/tenders/my/bids`, tabs active/won/withdrawn `:54`), reachable from
the Service Hub header as "Available Tenders" (`ServiceHub.tsx:1605-1610`).
Admin: `AdminTenders.tsx:30` (`/tenders/admin/all`, status filter, cancel) backed by
`requireRole("admin")` (`tenders.ts:356,373`) with bidder notifications on admin cancel (`:385-388`).

**Defects.** (a) `TenderDetail.tsx:256` "Edit" reopens the same dialog that calls `handleBid` → `POST`
(`:80`), which 400s with "You already have a bid"; the working `PUT /tenders/:id/bid` has no caller.
(b) `DashboardTenders.tsx:51` cancels via the **admin** endpoint `PATCH /tenders/admin/:id/cancel`, which
is `requireRole("admin")` ⇒ 403 for the tender's own owner; no owner-cancel route exists.
(c) `budgetFrom/budgetTo` are never validated against the bid amount.

---

## V1 auction operating system

V1's auction subsystem is far broader than V2's. Below, one subsection per Part-B capability.

**Domain model.** `Auction` (schema.prisma:905) — property-backed, office-owned,
`startPrice / minBidIncrement / currentPrice / startDate / endDate / status / type (AUCTION|TENDER) /
isBinding / winnerId / winningPrice / currency / **version** (optimistic lock)`. Statuses in play:
`PENDING, ACTIVE, SUSPENDED, SOLD, ENDED, CANCELLED`.

### FAQ
`AuctionFAQ.tsx` — 10 curated Q&As in both languages (`:18-98`): what public auctions are, how to
participate, fees, **auction types**, **how auto-bidding works**, whether a bid can be cancelled, what
happens on winning, **what happens when the reserve price is not met**, dispute resolution, and how to
report a violation. Static content, `L1 UI_ONLY`, SEO head at `:104`.

### Terms
`AuctionTerms.tsx` — six numbered legal sections per language (`:16-160`): General Terms, **Bidder
Obligations**, **Auctioneer (Seller) Obligations**, **Payment & Settlement**, **Dispute Resolution**,
Closing Provisions; icon+colour per section (`:187-200`). Static, `L1 UI_ONLY`, no versioning/acceptance
ledger (contrast V2 AUC-050/052 which have hashes and acceptance rows but no authoring UI).

### History
`AuctionHistory.tsx` — closed-auction archive: `GET /api/auctions?status=SOLD&limit=100` (`:39`),
client-side search (`:57`), and per-auction **price-history drill-down** via
`GET /api/auction-enhancements/price-history/:id` (`:49`).

### Stats
`AuctionStats.tsx` — public KPI dashboard on `GET /api/auction-enhancements/stats` (`:30`) with
**60-second auto-refresh** (`:34`); six tiles (total / active / completed / total bids / avg price /
completion rate, `:101-107`), a Recharts sold-price trend over the last 30 days (`:65-68`), and
**client-side PDF export** via jspdf + html2canvas with a branded header band (`:37-63`).

### Auto-bid
Server engine `processAutoBids` (`auctions.ts:482-519`): proxy bidding, recursion **depth-capped at 5**
(`:483`), picks the auto-bidder with the highest `maxAutoBid` above the highest *manual* bid (`:496-498`),
bids `min(highestManual + minBidIncrement, maxAutoBid)` (`:499`), writes inside a transaction guarded by
the `version` optimistic lock (`:509-512`), emits `auto_bid_triggered`, recurses. Registration endpoint
`POST /auctions/:id/auto-bid` (`:267-298`) validates `maxAutoBid > currentPrice` and stores a marker bid
with `isAutoBid` + `maxAutoBid` (schema.prisma:949-950). UI: `components/auctions/AutoBidToggle.tsx`
(switch + max amount + save). **Directly answers V2 AUC-037** (`is_auto_bid` hard-coded false in V2).

### Bid increments
`minBidIncrement` per auction (schema.prisma:910, default 1000), defaulted from
`AuctionSetting.defaultMinIncrement` at creation (`auctions.ts:127`); enforced server-side
(`amount < currentPrice + minBidIncrement` → `BID_TOO_LOW`, `:211-212`) and mirrored in the form's
`min`/`step` and live minimum hint (`components/auctions/AuctionBidForm.tsx:22,29,55-58`).

### Countdown + anti-sniping
`components/auctions/AuctionCountdown.tsx`: 1-second tick, d/hh:mm:ss, `onEnd` callback, and an
**urgency mode under 5 minutes** that switches to a pulsing burgundy display (`:47-70`).
Server anti-sniping: any bid landing with **< 5 minutes** remaining pushes `endDate` to `now + 5 min`
(`auctions.ts:226-228`) and emits an `extended` event (`:248-253`). `AuctionSetting.autoExtendMinutes`
(schema.prisma:987, default 5) exists but is **not read** — the 5 minutes are hard-coded.
**Directly answers V2 AUC-028** (V2 has no anti-sniping at all).

### Participant eligibility / registration
`AuctionParticipant` (schema.prisma:963) with `@@unique([auctionId, userId])`. A participant row is
**upserted on first bid** (`auctions.ts:230-234`), giving an auditable bidder registry
(`participantCount` surfaced at `:38`). Eligibility checks at bid time: auction `ACTIVE` (`:201`),
not ended (`:202`), **not your own auction** (`:203-205`), **participant not blocked** (`:206-209`).
Office-side eligibility to *create*: `Office.canCreateAuctions` + `isAuctionsBanned`
(`auctions.ts:99-109`) + property must belong to that office (`:112-114`).
**Directly answers V2 AUC-038** (participant table unused in V2).

### Deposits
`AuctionParticipant.hasDeposit` / `depositRef` (schema.prisma:967-968) and
`AuctionSetting.requiresDeposit` / `depositPercentage` (schema.prisma:985-986). Grep confirms
**zero readers/writers** in `server/` and `src/` ⇒ `L2 DATA_MODEL_ONLY`. Still the only deposit/bid-bond
schema that exists in any tree — V2 AUC-036 records no deposit concept whatsoever.

### Reports
`AuctionReport` (schema.prisma:1012) with `status / resolvedById / resolvedAt`.
Report: `POST /auctions/:id/report` with a mandatory reason (`auctions.ts:350-365`) + `REPORTED` log.
UI: `components/auctions/AuctionReportButton.tsx` (flag icon → reason dialog).
Resolve: `POST /auctions/:id/resolve-report`, `requireRole("admin","moderator")` (`auctions.ts:399-413`),
bulk-resolves all PENDING reports for the auction and logs `REPORT_RESOLVED`.
Admin console shows a per-auction report count and a "reported" KPI (`AdminAuctions.tsx:179,211`).

### Risk / fraud logic
Five distinct mechanisms, all V1-only:
1. **Suspicious relist detection** (below).
2. **Early-warning scan** (below).
3. **Office rating engine** (below) with an explicit manipulation penalty.
4. **Bidder blocking** per auction (`auctions.ts:452-479`, two endpoints, admin/moderator).
5. **Platform-wide auction bans**: `User.isBannedFromAuctions` and `Office.isAuctionsBanned`
   (set by `relist-monitoring.ts:281-292`).
Supporting evidence capture: every bid stores `ipAddress` (`auctions.ts:220`, schema.prisma:951);
`@@unique([auctionId, bidderId, amount])` (schema.prisma:959) blocks duplicate identical bids;
`Auction.version` gives optimistic concurrency on price updates (`auctions.ts:224`, `:510`).

### Suspicious relisting detection
`checkSuspiciousRelist(newAuctionId)` (`relist-monitoring.ts:38-106`), fired non-blocking on every auction
creation (`auctions.ts:141`) and on demand by an admin (`relist-monitoring.ts:109-116`):
find a previous **SOLD** auction for the *same property* within **30 days** with a winner and a winning
price (`:45-58`) → compute `dropPercent` (`:60`) → **flag only if the drop exceeds 15 %** (`:63`) →
dedupe against an open case (`:66-69`) → create a `SuspiciousRelist` (schema.prisma:1032) with
`previousSoldPrice`, `newStartPrice`, `priceDropPercent`, `status = PENDING_REVIEW` and a
**7-day `proofDeadline`** (`:83`) → **immediately suspend the new auction** (`:88-91`) → write a
`SUSPENDED_RELIST` audit row (`:93-105`). The product theory: an office and a colluding "winner" fake a
sale, then relist cheaply.

### Sale-proof verification
`SaleProof` (schema.prisma:1062): `contractUrl`, `paymentReceiptUrl`, `buyerSignatureUrl`,
`transactionDate`, `notes`, `status`, `reviewedBy/At`, `rejectReason`.
Office submits (`relist-monitoring.ts:176-216`, ownership-checked `:185`, only from `PENDING_REVIEW`
`:188`) → case → `PROOF_SUBMITTED`. UI `components/auctions/SaleProofForm.tsx` requires at least one
document (`:35-38`) and warns "Submitting false documents will result in permanent ban" (`:124`);
it is surfaced to the office inside its own dashboard (`DashboardAuctions.tsx:45,109-111,53`).
Admin **verify** (`:219-260`): proof→VERIFIED, auction un-suspended back to ACTIVE, case→VERIFIED,
`RELIST_VERIFIED` log. Admin **reject** (`:263-322`) is the punitive branch — see next.
Admin **clear** as a false positive (`:325-354`).

### Office auction bans
On reject (`relist-monitoring.ts:280-318`) **and** automatically when the 7-day proof deadline lapses
(`processExpiredRelists`, `:416-463`, cron every 5 min `server/api/src/index.ts:174-178`):
`Office.canCreateAuctions = false` **and** `isAuctionsBanned = true`; the previous winner gets
`User.isBannedFromAuctions = true`; the new auction is CANCELLED; **every other ACTIVE/PENDING auction of
that office is CANCELLED in bulk**; the case becomes `BLOCKED` (or `EXPIRED`) with an admin note; a
`RELIST_BLOCKED` / `RELIST_EXPIRED` audit row is written. The ban is re-checked at creation time
(`auctions.ts:106-109`).

### Bidder recommendations
`getBidderRecommendations(userId, limit)` (`services/auction-intelligence.ts:172-231`) — three ranked
buckets from the user's last 20 bids: **similarProperties** (same city or category as previously bid,
excluding already-bid auctions, ordered by fewest bids), **lowCompetition** (≤3 bids, ending soonest), and
**withinBudget** (`currentPrice ≤ 1.5 × the user's largest previous bid`, fallback budget 100 000).
Exposed at `GET /auction-enhancements/recommendations` (`auction-enhancements.ts:115-121`).
**No page consumes it** ⇒ `L3 PARTIAL_FLOW`.

### Auction intelligence
Four more engines in the same service:
- **Office rating engine** (`auction-intelligence.ts:5-71`): score = completion 30 % + response 20 % +
  client-diversity 30 %, minus 10 per complaint and **20 per confirmed manipulation case**, clamped 0–100;
  badge GOLD ≥80 / SILVER ≥50 / BRONZE (`:38`); every run persists an `OfficeRatingSnapshot`
  (schema.prisma:1135) with all sub-scores; recalculated **hourly** for every auction-enabled office
  (`server/api/src/index.ts:179-182`). Note `responseSpeed` is a hard-coded `0.8` proxy (`:26`).
- **Auction classification** (`:74-92`): tiers `suspicious` (SUSPENDED) / `hot` (≥20 bids, or price ≥2×
  start, or ≤1 h left with ≥5 bids) / `high-value` (≥500 000) / `active` (≥5 bids) / `normal`, bilingual
  labels; endpoint `GET /auction-enhancements/classify/:id`. **Not rendered on any card.**
- **Public stats aggregation** (`:234-279`) — feeds `AuctionStats.tsx`, incl. `manipulationRate` and a
  top-5 office leaderboard by rating snapshot.
- **Price-history read/write helpers** (`:282-294`).

### Realtime bid socket
`services/auction-socket.ts`: a dedicated Socket.IO namespace `/auctions` (`:8`), **JWT-authenticated at
handshake** with disconnect on missing/invalid token (`:11-22`), per-auction rooms via
`join-auction` / `leave-auction` (`:24-30`), and `emitAuctionEvent(auctionId, event, data)` broadcasting
`auction:<event>` (`:34-38`). Seven event types are emitted by the routes: `new_bid`, `outbid`, `extended`
(`auctions.ts:245-252`), `accepted`, `won` (`:323-324`), `rejected` (`:345`), `ended`
(`:187`, `:446`, `:539-550`), `auto_bid_triggered` (`:517`).
**`initAuctionSocket` has zero callers** (`server/chat-server.ts:210` builds the only Socket.IO server and
never wires it) ⇒ `io` stays null and every emit is a no-op; no client subscribes either.
`L3 PARTIAL_FLOW` — but a complete, mergeable realtime design.

### Auction contract generation
`services/auction-contract.ts:4-92` — a pdf-lib A4 contract: serial
`AUTO-YYYY-MMDD-#####` (`:24`), burgundy header band, field block (auction id, date, seller office,
winner + email + phone, property, final price, **binding auction vs non-binding tender**), a six-clause
**LEGAL DECLARATION** (`:65-73`), two signature lines, and an **OTP verification box** (`:88-89`).
Status: **no route, no caller, and the import `import { pdfLib } from "pdf-lib"` (`:1`) is not a valid
pdf-lib export** ⇒ would throw on load. `L1 UI_ONLY` / BROKEN. Contrast V2 AUC-045/046/049, which have a
working hash-bound contract + signature ledger (and the AUC-047 mojibake defect) — V1 contributes the
**OTP + serial + binding/non-binding distinction**, nothing else.

### Price history
`AuctionPriceHistory` (schema.prisma:1158) with `price`, optional `bidderId`, `source` (default `BID`).
Read path complete (`auction-intelligence.ts:282-288` → `auction-enhancements.ts:107-112` →
`AuctionHistory.tsx:49`). **Write path orphaned**: `logPriceChange` (`auction-intelligence.ts:290-294`) is
imported once (`auction-enhancements.ts:14`) and never invoked; the bid transaction never records a point
⇒ the chart is always empty. `L3 PARTIAL_FLOW`.

### Early warning
`runEarlyWarningScan()` (`auction-intelligence.ts:95-169`), cron **every 6 hours**
(`server/api/src/index.ts:183-186`), writes `EarlyWarning` rows (schema.prisma:1174) of three types:
`RAPID_LISTING` (office created <7 days ago with >5 properties, MEDIUM),
`HABITUAL_BIDDER_NO_WIN` (>10 bids in a week, zero lifetime wins, LOW),
`REPEAT_BIDDER_PAIR` (the same bidder appears in ≥3 auctions of the same office that has ≥3 auctions,
MEDIUM — a collusion-ring heuristic). Admin API: list with type/resolved filters, manual scan trigger,
and resolve (`auction-enhancements.ts:124-157`, all `requireRole("admin")`).
**No admin UI renders early warnings** ⇒ `L3 PARTIAL_FLOW`.

### Admin surfaces
`AdminAuctions.tsx` — the auction management console V2 lacks (V2 AUC-060 = "none"): search + status +
type filters (`:44-46`), four KPI tiles (`:171-184`), a table with bids/reports/owner/end-date
(`:207-214`), cancel (`:74`) and **block-a-bidder** (`:89`) with confirmation.
`AdminRelistMonitoring.tsx` — monthly report tiles (flagged / blocked / avg drop / manipulation rate,
`:148-160`), status filter, case table, verify / reject / clear actions with an admin note (`:74-82`),
and **CSV + PDF export** (`:94-108`).

### Client surfaces
`Auctions.tsx` — public grid with status/type/category filters + debounced search (`:54-73`).
`AuctionDetail.tsx` — image gallery + lightbox (`:176-190`), countdown, bid form, auto-bid toggle,
bids list, status badge, report button (`:13-18`).
`DashboardAuctions.tsx` — office view, tabs active/pending/ended + a create tab
(`:134-147`), relist-case banner with the proof form (`:109-111`).
`DashboardBids.tsx` — the bidder's own bid dashboard V2 lacks (V2 AUC-034), a table of auction / my bid /
my status / auction status / date (`:38`, `:82-126`).
`components/auctions/CreateAuctionForm.tsx` — property picker from `/properties/mine`, office eligibility
pre-check from `/offices/mine` (`:44-45`), start price, increment, end date, **AUCTION vs TENDER**,
currency (`:33-38`).

### Auction defects found in V1
1. **`GET /auctions/my` and `/auctions/my-bids` are shadowed** by `GET /auctions/:id` declared earlier
   (`auctions.ts:74` vs `:368`, `:382`) ⇒ `parseInt("my")` → NaN → 400 "Invalid id". Both dashboards
   (`DashboardAuctions.tsx:52`, `DashboardBids.tsx:38`) are dead on arrival.
2. Same shadowing for `GET /relist-monitoring/my` (`relist-monitoring.ts:139` before `:153`) ⇒ the office
   never sees its own relist cases.
3. `AuctionDetail.tsx:91` calls `GET /auctions/:id/bids`, which **does not exist**; the `Promise.all`
   rejects and the page renders "Auction Not Found" for every auction.
4. `DashboardAuctions.tsx:79` calls `PATCH /auctions/:id/cancel`; the real routes are `DELETE /auctions/:id`
   and `PATCH /auctions/admin/:id/cancel`.
5. `POST /auctions/:id/bid` self-bid guard compares `auction.officeId === req.user.id`
   (`auctions.ts:203`) — an office **id** against a user **id**; the check is meaningless.
6. `PUT /auctions/settings/:officeId` is `requireAuth` only for the read (`:558`) — the read leaks any
   office's auction settings to any logged-in user.
7. `AuctionSetting.autoExtendMinutes`, `requiresDeposit`, `depositPercentage`, `Auction.isBinding` are
   written but never read by any decision path.

---


## Round 2 — V1 Acquisition, Smart Landing, Support, SEO, Lookups, Knowledge, Licensing, i18n

## A. V1 acquisition funnels

V1 shipped a deliberate **four-funnel acquisition architecture**, hubbed on `/about`. `About.tsx:12-46`
defines a `SECTORS` array of exactly three sector cards — 🛠️ `/for-professionals`, 🏢 `/for-offices`,
🌐 `/for-corporates` — rendered as the "We Serve Every Sector" router at `About.tsx:212-237`. Two of those
three funnel into a single shared conversion page, `/join` (`JoinFounders.tsx`); the third deliberately
funnels to e-mail instead. All four are routed in `App.tsx:200-203` and pre-fetched on hover
(`routePrefetch.ts:55-58`).

```
About.tsx:212 (3 sector cards)
   ├─ /for-professionals ──► /join?redirect=/service-hub      (craftsman account)
   ├─ /for-offices ───────► /join?redirect=/dashboard          (office account)
   │                     └► /join?redirect=/dashboard/submit   (second CTA)
   │                     └► /download, /software, /pricing     (desktop up-sell)
   └─ /for-corporates ────► mailto:corporate@akarpromax.com    (no account at all)
```

### A.1 `/join` — JoinFounders (the shared conversion engine)

| Dimension | Finding |
|---|---|
| Route / entry | `App.tsx:200`; lazy `App.tsx:99`; prefetch `routePrefetch.ts:58` |
| Target audience | Everybody. 8 self-declared user types, bilingual: buyer/renter, investor, engineer, contractor-craftsman, broker, developer, lawyer, other (`JoinFounders.tsx:21-41`) |
| Value proposition | "🚀 انضم كمؤسس — مجاناً / Join as Founder — Free", "وصول فوري لجميع الميزات بدون انتظار / Instant access to all features — no waiting" (`:164-170`) |
| Trust / rank claim | Badge "عضوية المؤسسين — مجاناً للأبد / Founder Membership — Free Forever" (`:387`); data-protection promise "لن نشاركها مع أي طرف ثالث" (`:411-413`) |
| Benefits promised | 6 items (`:60-67`): advanced search + full property detail · direct contact with owners · **professional engineering tools free** · **huge technical library** · instant new-listing alerts · **coverage of 22 Arab countries + Turkey** |
| Commercial claims | Free forever; no price, no card, no tier |
| Governance gate | **Professional Integrity Pledge** — a required checkbox (`:310-343`) whose full text (`:337-338`) grants the platform the right to permanently ban an account for proven misconduct "without any right to compensation", signed under "الفيحاء للتجارة العامة، سجل تجاري 1448067". Submit is disabled until accepted (`:347`) and a toast blocks submit otherwise (`:101-104`) |
| Data captured | fullName ≥3, phone ≥7, email, password ≥6, userType, city — all required, Zod-validated bilingually (`:86-93`) |
| City vocabulary | A **fourth, independent** city list: 39 hardcoded Arabic city names + 8 English duplicates + an "Other City" escape hatch (`:43-58`). Does not use `citiesData.json`, `locationsData.json`, `arabCountries.ts` or `AdminLookups` |
| Redirect contract | `?redirect=` is read on mount (`:79-84`), defaults `/`, is honoured 1.8 s after success (`:110`) and is forwarded to `/login` (`:369`) |
| Account type created | **None specified.** The payload carries `userType` as a free Arabic/English *string*, not a role. There is no `role`, no `accountType`, no office/company creation |
| **Does the CTA reach a working registration path?** | **No.** `POST /auth/quick-register` (`:107`) resolves to `v1/server/api/src/routes/auth.ts:488-490`, whose entire body is `res.json({ success: true })`. No user row, no token, no session. `login(data.token, data.user)` (`:108`) then stores `undefined`/`undefined`, the success screen renders (`:120-141`) and the visitor is redirected as a **logged-out user**. There is no DEV mock for the path either (`grep quick-register src/lib/api.ts` → none), so the defect is identical in dev and production |

**Parity status: BROKEN. Decision: FIX REGRESSION (P0).** This is the single conversion point of three of
the four funnels and it creates nothing.

### A.2 `/for-professionals` — LandingProfessionals (craftsman / contractor supply funnel)

* **Audience** — trades and crafts. 8 illustrated professions: plumbing, electrical, construction, painting,
  HVAC, carpentry, cleaning, interior design (`LandingProfessionals.tsx:21-30`).
* **Value proposition** — "انضم لأقوى رنين في المنطقة / Join the Region's Strongest Network" +
  "احصل على عقودك بضغطة زر / Get Your Contracts with One Tap" (`:43-52`).
* **Benefits promised** — 6 (`:12-19`): instant alerts for contracts in your area · a rating system that
  builds professional reputation automatically · a **"Verified Provider" badge** · work-schedule and weekly
  calendar management · **monthly income reports** · direct client contact with no middleman.
* **Trust / rank claims** — the Verified-Provider badge (`:15`) and the reputation engine (`:14`) are the
  rank promise; the **Professional Integrity Pledge** is restated in full on the page (`:111-125`).
* **Commercial claims** — "التسجيل مجاني — لا عمولات — لا رسوم خفية / Free registration — no commissions —
  no hidden fees" (`:134`). This is a **zero-commission promise**, materially different from every V2
  services-marketplace assumption.
* **CTAs (3)** — `/join?redirect=/service-hub` ("🚀 سجّل مجاناً الآن", `:59-63`); `/service-hub`
  ("استعرض سوق الخدمات", `:64-68`); `/join?redirect=/service-hub` again in the closing CTA (`:136-140`).
* **Conversion path** — hero → professions grid → benefits → integrity pledge → CTA → `/join` → (intended)
  craftsman account → `/service-hub`.
* **Account type it tries to create** — a service provider / craftsman. Nothing in the funnel communicates
  that to `/join`: the redirect target is the only signal, and `JoinFounders` never reads it as a role.
* **Does the CTA reach a working registration path?** No — see A.1.

**Parity status: PARTIAL (page FULL, conversion BROKEN). Decision: RESTORE (P0).**

### A.3 `/for-offices` — LandingOffices (real-estate office / SaaS funnel)

* **Audience** — real-estate offices of every size.
* **Value proposition** — "أدر مكتبك بذكاء واربط عقاراتك بالعالم / Manage Your Office Smartly and Connect
  Your Properties to the World" (`LandingOffices.tsx:37-46`).
* **Benefits promised** — 6 (`:11-18`): exposure to 22 Arab countries + Turkey · **a complete desktop office
  management system (AKAR)** · a live listing-performance analytics dashboard · instant alerts on client
  property requests · flexible subscription tiers · a **Verified Office badge**.
* **Trust / rank claims** — Verified Office badge (`:17`); the **Real Estate Office Integrity Charter**
  (`:166-180`), which promises authentic-listings-only, legal commission rates, client-data protection, and
  states that breach triggers immediate ban **and suspension of the AKAR desktop software** — i.e. the web
  charter is the enforcement lever over the desktop licence.
* **Commercial claims — four, mutually inconsistent** —
  1. a 3-tier plan ladder: Basic 5 active listings · **Professional 25 + analytics (“Most Popular”)** ·
     Premium unlimited + priority placement (`:20-24`);
  2. "عرض حصري للمكاتب: 3 أشهر تفعيل مجاني / Exclusive for Offices: 3 Months Free Activation" (`:120`);
  3. "حمّل الآن — مجاناً 3 أشهر / Download Now — 3 Months Free" (`:147`);
  4. "أول 30 يوم مجاناً — بدون بطاقة ائتمانية / First 30 days free — no credit card required" (`:189`).
  The page therefore promises 3 months *and* 30 days on the same screen. The server issues **30 days**
  (`v1/server/api/src/routes/desktop.ts:281-282`, `expiresAt + 30`). See D/F findings and `V1-LIC-004`.
* **Desktop cross-sell** — an entire dark panel (`:114-163`) sells AKAR: contracts & commissions, internal
  client database, pro invoices & reports, automatic backups, "works offline", "Windows, Mac and Linux".
  The Linux/macOS claim is not supportable from the shipped build (`cur/AkarApp_LIVE` is .NET WPF,
  Windows-only).
* **CTAs (7)** — `/join?redirect=/dashboard` (`:49`) · `/download` ×2 (`:54`, `:144`) · `/pricing` ×2
  (`:60`, `:104`) · `/software` (`:150`) · `/join?redirect=/dashboard/submit` (`:191`).
* **Conversion path** — hero → 6 benefits → 3-tier preview → desktop panel → integrity charter → CTA.
  Two exits: *register* (`/join`) and *download* (`/download`).
* **Account type it tries to create** — an **office** account. Nothing in the funnel creates an
  `Office` row; `/join` has no office fields at all.
* **Does the CTA reach a working registration path?** No. Worse, the *pricing* CTA is also dead: `/pricing`
  resolves to `PricingComingSoon` (`App.tsx:35,212`), a "Plans Page Under Development" placeholder, so
  "استعرض الباقات / View Plans", "اعرف السعر / See Pricing" (×3) all land on a page that shows no plan and
  no price. The full `Pricing.tsx` (332 lines, 4 audience tabs, monthly/yearly toggle, coupon banner, 6
  payment gateways) is **orphaned** — nothing imports it (`grep "pages/Pricing\"" src/` → none).

**Parity status: PARTIAL — page FULL, every commercial CTA lands on a stub or a dead endpoint.
Decision: FIX REGRESSION (P0).**

### A.4 `/for-corporates` — LandingCorporates (B2B / enterprise funnel)

* **Audience** — large corporations and enterprise buyers, GCC-first.
* **Value proposition** — "شريكك اللوجستي والتقني المعتمد في الخليج والعالم العربي / Your certified
  Logistics & Technology Partner across the Gulf & Arab World" (`LandingCorporates.tsx:33-42`).
* **Services promised** — 6 (`:11-18`): commercial-property coverage across 22 countries + Turkey ·
  **integrated logistics for equipment and goods transport & storage** · **custom enterprise tech
  solutions (software, platforms, automation)** · certified strategic partnerships with accredited offices ·
  custom market reports and deep investment analytics · **licensing-procedure and legal-compliance support
  across the GCC**. Three of the six are not real-estate services at all — this funnel sells the parent
  company, not the platform.
* **Trust / rank claims** — a 13-flag coverage strip (`:20`, `:69-73`); three credential tiles: C.R.
  **1448067**, **22+** countries, **3** specialised sectors (`:97-107`); a parent-company paragraph naming
  Nizwa, Oman as HQ and IT / Construction / Logistics as the sectors (`:110-120`).
* **Commercial claims** — none. No price, no plan, no free tier. Deliberately quote-based:
  "تواصل مع فريق الشركات للحصول على عرض مخصص / Contact our corporate team for a custom proposal" (`:130`).
* **CTAs (3)** — `mailto:corporate@akarpromax.com` ×2 (`:45`, `:134`) and `/contact` (`:50`).
* **Account type it tries to create** — **none.** This funnel intentionally creates a *sales lead*, not a
  user. That is a legitimate product decision and must be preserved as such.
* **Does the CTA reach a working path?** The `mailto:` CTAs work by definition. The `/contact` CTA does
  **not**: `Contact.tsx:21-29` fakes submission with `setTimeout(…, 1500)` and a success toast, and posts
  nothing anywhere — despite a working, unauthenticated `POST /api/inquiries` existing
  (`v1/server/api/src/routes/inquiries.ts:14-26`). **Every enterprise lead submitted through the contact
  form is silently discarded.**

**Parity status: PARTIAL — page and mailto FULL, `/contact` BROKEN. Decision: FIX REGRESSION (P0).**

### A.5 Supporting acquisition surfaces

**`/about`** (`About.tsx`, 19 KB) — the funnel router plus brand/legal substance: 4 values
(`:50-55`), the sector cards (`:212-237`), a two-card **Legal & Technical Disclaimer** stating the platform
is *infrastructure only* and bears no construction or contractual liability, and disclaims third-party
misuse of data (`:240-278`), and a C.R.-1448067 legal badge (`:281-292`). Reads nothing from a server and is
**not** wired to `AdminContent`'s `about` page record (see F). L1 UI_ONLY, FULL as authored content.

**`/` Home** (`Home.tsx`) — the organic entry point. It is the only consumer of `useSmartLanding`
(`:20`), gates `SmartLandingBanner` on a resolved category (`:49-53`), and filters featured listings to the
visitor's country currency (`:29-36`) with a location-aware heading and a location-aware empty state whose
CTAs are `/properties` and `/dashboard/submit` (`:141-151`). It hosts 12 geo ad slots (`ad-slot-01…12`)
plus `HeroAdsBanner` — cross-reference `frag2/13`.

**`/pricing`** — see A.3. `PricingComingSoon.tsx:39-44` re-states the **3-months-free** desktop offer and
routes to `/download`; `Pricing.tsx` (orphaned) is the real commercial artefact: 4 audience tabs (offices,
suppliers, technicians, desktop software) from `/subscription-plans?targetType=…` (`:77-80`), monthly/yearly
toggle with a "Save 20%" badge (`:263-273`) and a computed per-plan saving (`:123-127`), a public coupon
banner with copy-to-clipboard and an **Arabic transliteration table for 18 promo-code words** (`:47-66`),
`maxListings` display (`:128-132`), bilingual feature lists with fallback (`:134-146`), `Subscribe Now` →
`/subscribe/:id?cycle=`, and a 6-gateway trust strip: Mada, Visa, Mastercard, Apple Pay, STC Pay, Tabby
(`:305-311`) with "payment available from all Arab countries" (`:324`).

**`/advertise`** — the fourth commercial funnel; fully covered in `frag2/13-v1-advertising.md`
(`V1-ADS-070…076`, `V1-ADS-108`). Acquisition-specific facts only: it is **unauthenticated**, creates a
`pending` `Ad` row rather than an account, and is the one V1 funnel that is end-to-end wired
(`Advertise.tsx:151-198` → `ads.ts:142-175`).

---

## B. Smart Landing rulebook

Re-verified against source. **Three of the four numbers in the previously "independently verified" starting
point are wrong** and are corrected here.

| Claim in the starting point | Verified count | Evidence |
|---|---|---|
| 28 aliases | **30** alias keys | `v1/src/hooks/useSmartLanding.ts:23-52` (one key per line, 23→52 inclusive) |
| 10 categories | **10** canonical categories ✓ | `useSmartLanding.ts:22-53` distinct values |
| 26 city entries | **33** alias keys → **18 distinct cities** | `useSmartLanding.ts:60-92` |
| 8 countries | **9** country codes (SA, AE, OM, KW, QA, EG, JO, LB, **US**) | `useSmartLanding.ts:60-92` |
| analytics POST | ✓ confirmed | `useSmartLanding.ts:165-185` |
| chalet + warehouse have no banner config | ✓ confirmed | aliases `useSmartLanding.ts:49-52`; `BANNER_CONFIGS` has 8 keys only, `SmartLandingBanner.tsx:30-155`; miss → `return null` at `:167` |

### B.1 Input signals (12 URL parameters, 5 with Arabic synonyms)

Read once on mount from `window.location.search` (`useSmartLanding.ts:114-138`; the `useMemo` dependency
array is `[]`, so **the rulebook never re-evaluates during a SPA session** — an in-app navigation that
changes the query string is ignored).

| Signal | Accepted keys, in precedence order | Line |
|---|---|---|
| city | `city` → `مدينة` | `:116` |
| category | `cat` → `category` → `فئة` | `:117` |
| country | `country` → `دولة` | `:118` |
| governorate | `gov` → `region` → `منطقة` | `:119` |
| source | `source` → `utm_source` | `:120` |
| utm_source / utm_campaign / utm_medium | verbatim | `:121-123` |

`hasParams` is true if **any** of city, cat, country, gov, source, utm_source, utm_campaign is present —
note `utm_medium` alone does **not** set it (`:135`).

### B.2 Category rule — 30 aliases → 10 canonical keys

`CAT_ALIASES` (`useSmartLanding.ts:22-53`), matched on `rawCat.trim().toLowerCase()`; an unknown value
falls through to `rawCat.trim()` unchanged (`:125`).

| Canonical | Aliases (Latin + Arabic) | Banner config? |
|---|---|---|
| `maintenance` | maintenance · صيانة · maintain · repair | ✔ `SmartLandingBanner.tsx:31-49` |
| `apartment` | apartments · apartment · شقق · شقة | ✔ `:50-64` |
| `villa` | villas · villa · فيلا · فلل | ✔ `:65-79` |
| `land` | land · lands · أرض · اراضي | ✔ `:80-94` |
| `commercial` | commercial · تجاري | ✔ `:95-109` |
| `office` | offices · office · مكتب · مكاتب | ✔ `:110-124` |
| `rent` | rent · إيجار | ✔ `:125-139` |
| `sale` | sale · بيع | ✔ `:140-154` |
| **`chalet`** | chalet · شاليه (`:49-50`) | ✘ **none — banner silently suppressed** |
| **`warehouse`** | warehouse · مستودع (`:51-52`) | ✘ **none — banner silently suppressed** |

Lower-casing is applied to the whole key, which is a no-op for the 12 Arabic aliases but means the Latin
aliases are case-insensitive. `اراضي` is stored without the hamza (`أراضي` would **not** match).

### B.3 City rule — 33 aliases → 18 cities → 9 countries

`resolveCity()` (`useSmartLanding.ts:56-96`), matched on `rawCity.trim().toLowerCase()`. A miss returns
`{ city: rawCity }` with **no** country and **no** governorate (`:95`).

| Country | City aliases → canonical | Governorate emitted |
|---|---|---|
| SA | `jeddah`, `jedda`, `جدة` → جدة | **`منطقة مكة المكرمة`** ⚠ |
| SA | `riyadh`, `الرياض` → الرياض | `الرياض` ✔ |
| SA | `mecca`, `مكة` → مكة المكرمة | **`منطقة مكة المكرمة`** ⚠ |
| SA | `medina`, `المدينة` → المدينة المنورة | `المدينة المنورة` ✔ |
| SA | `dammam`, `الدمام` → الدمام | **`المنطقة الشرقية`** ⚠ |
| AE | `dubai`, `دبي` → دبي | `دبي` ✔ |
| AE | `abudhabi`, `abu dhabi`, `أبوظبي` → أبوظبي | *(none)* |
| OM | `muscat`, `مسقط` → مسقط | *(none)* |
| KW | `kuwait`, `الكويت` → الكويت | *(none)* |
| QA | `doha`, `الدوحة` → الدوحة | *(none)* |
| EG | `cairo`, `القاهرة` → القاهرة | *(none)* |
| JO | `amman`, `عمان` → عمان | *(none)* |
| LB | `beirut`, `بيروت` → بيروت | *(none)* |
| **US** | `houston`, `dallas`, `austin`, `los angeles`, `san francisco` (Latin only) | *(none)* |

⚠ **Defect — three of the five SA governorate values are not valid keys.** `citiesData.json` is keyed by
bare governorate name: it contains `مكة المكرمة` and `الشرقية`, and contains **neither**
`منطقة مكة المكرمة` **nor** `المنطقة الشرقية` (verified: 269 governorate keys / 652 cities). The same three
strings are also absent from `ARAB_COUNTRIES[SA].governorates`
(`v1/src/lib/arabCountries.ts:24`: `["الرياض","مكة المكرمة","المدينة المنورة","الشرقية",…]`). Consequence:
`?city=jeddah`, `?city=mecca` and `?city=dammam` — the three highest-value Saudi ad keywords — set the
location context to a governorate that resolves to an empty city list. `LocationContext.tsx:21` even carries
the comment *"v4: cleared old 'منطقة مكة المكرمة' mismatch bug"* — the fix was applied to `JEDDAH_DEFAULT`
(`:25`) but **not** to `useSmartLanding`.

### B.4 Country validation and precedence

`countryCode = rawCountry.trim().toUpperCase() || resolved?.countryCode || ""` (`:129`), then discarded if
it is not in `ALL_SUPPORTED_COUNTRIES` (`:131`) — 22 Arab countries + TR + US = **24 supported codes**
(`arabCountries.ts:21-133,135-175,184`). US therefore survives validation; the 5 US cities are live.

**Precedence, exactly:**
```
country := ?country|?دولة   ELSE  country-of(city alias)   ELSE  ""      (:129)
           → dropped if not one of the 24 supported codes                (:131)
city     := canonical(city alias)  ELSE  raw ?city verbatim              (:133)
gov      := ?gov|?region|?منطقة    ELSE  governorate-of(city alias)  ELSE ""   (:134)
```
The header comment (`:12`) states *"URL params > Geo detection > Jeddah default"*; the code implements it
by **writing into `LocationContext` after mount** rather than by ranking sources, so the real rule is:
Jeddah default renders first (`LocationContext.tsx:255-257`), geo overwrites it when it resolves
(`:268-328`), and the URL params overwrite that on a staggered timer.

### B.5 The apply sequence (a timing rule, not a priority rule)

`useSmartLanding.ts:141-155`, gated on `params.hasParams`:
```
t=0ms    loc.setCountry(countryCode)       — also clears governorate and city (LocationContext.tsx:330-344)
t=50ms   loc.setGovernorate(governorate)   — clears city (LocationContext.tsx:346-352)
t=100ms  loc.setCity(city)                 — only when a governorate was present
         (if no governorate: t=100ms loc.setCity(city) directly, :151-152)
```
Every one of those three setters calls `setSessionManual(true)`, so **a single ad click permanently pins the
visitor's location for the rest of the browser tab** and suppresses geo (`LocationContext.tsx:270`) until
`resetToGeo()` is called. There is no matching/normalisation on the way in: the raw string is stored.

### B.6 Geo default and the geo pipeline it overrides

`GeoContext.tsx` — cache key `akar_geo_v2`, TTL **6 h** (`:6-7`); resolution order **browser GPS →
Nominatim reverse-geocode (`:74-77`, 5 s timeout, `accept-language=ar,en`) → `GET /api/geo` IP lookup
(`:95`) → hardcoded SA/جدة/مكة المكرمة fallback (`:36-42`)**; the fallback is deliberately never cached
(`:150`). `LocationContext.tsx` then matches the geo region to a real governorate through a 6-step ladder
(`:165-198`): exact alias → lower-case alias → prefix/suffix-normalised alias (`normalizeRegion` strips
`منطقة|محافظة|إمارة|ولاية|مقاطعة|بلدية` and `province|region|governorate|emirate|state|county|district|
municipality`, `:155-162`) → exact list match → fuzzy contains → reverse fuzzy; then reverse-looks-up the
city across every governorate's city list (`:292-308`).

**Two alias defects in the same table.** `GOVERNORATE_ALIASES` (`LocationContext.tsx:31-123`, ~150 entries
across 11 countries) maps `"eastern province"|"eastern region"|"ash sharqiyah"` → `المنطقة الشرقية`
(`:45`) and every Abu Dhabi variant → `أبوظبي` (`:48-49`), but the SA list contains `الشرقية` and the AE
list contains `أبو ظبي` **with a space** (`arabCountries.ts:24,29`). Both alias groups fail the
`governorates.includes(...)` guard at `:174/:178/:182`, and neither survives the fuzzy steps. Saudi Eastern
Province and Abu Dhabi — two of the region's largest markets — cannot be resolved from geo.

**Third defect: manual location does not persist.** `writeStored()` writes `akar_location_v4` on every
setter (`:132-136,325,336,351,358`) but `readStored()` (`:125-130`) has **zero call sites** — the value is
written and never read. Only the `sessionStorage` "manual" flag survives, and only for the tab.

### B.7 Banner outputs — the exact copy contract

`SmartLandingBanner` renders only when `Home.tsx:49` sees a resolved `landing.category` **and** a config
exists (`SmartLandingBanner.tsx:166-167`). Each config supplies icon, two gradient stops, an accent colour,
bilingual badge/title/subtitle/CTA label and a `ctaHref`; the visitor's city is appended to the title as
`في {city}` / `in {city}` (`:178-180,227-229`). Dismiss is component-local state, **not persisted**
(`:164,199`).

| Category | Badge (AR / EN) | CTA label | `ctaHref` | Extras |
|---|---|---|---|---|
| maintenance | 🔧 خدمة مميزة / Featured Service | تواصل الآن / Contact Now | `/services` | **5-star rating block** (`:48,235-244`), address "حي الفيصلية، جدة" (`:46-47`), **`tel:` button with the literal placeholder `+966-12-XXX-XXXX`** (`:45,266-274`) |
| apartment | 🏢 شقق مميزة | تصفح الشقق | `/properties?category=apartment` | — |
| villa | 🏡 فلل فاخرة | تصفح الفلل | `/properties?category=villa` | — |
| land | 🌍 أراضي استثمارية | تصفح الأراضي | `/properties?category=land` | — |
| commercial | 🏬 عقارات تجارية | تصفح التجاري | `/properties?category=commercial` | — |
| office | 🖥 مكاتب احترافية | تصفح المكاتب | `/properties?category=office` | — |
| rent | 🔑 عقارات للإيجار | تصفح الإيجار | `/properties?type=rent` | — |
| sale | 💰 عقارات للبيع | تصفح البيع | `/properties?type=sale` | — |

The `maintenance` config is a **single named advertiser** hard-coded into the component ("مركز الصيانة
الدقيقة / High Accuracy Maintenance Center", Al-Faisaliyah, Jeddah, 5 stars). That is an ad placement living
in source code, un-authored, un-dated and un-billed — it belongs in the `Ad` model
(cross-reference `frag2/13`).

### B.8 The analytics POST — what is sent and what survives

`useSmartLanding.ts:158-187`, fired **once per mounted hook** (`logged` ref), `fetch` with
`.catch(() => {})` so failures are invisible. Endpoint `${BASE_URL}/api/analytics/track`.

Payload (`:168-183`):
```
action      "landing_entry" when hasParams, else "organic_visit"
city        resolved city | null          region     resolved governorate | null
country     params.countryCode | loc.countryCode | null
source      params.source | params.utmSource | "organic"
sessionId   sessionStorage "akar_session_id" (lib/sessionId.ts:1-13)
deviceType  "mobile" if /Mobi|Android/ else "desktop"       (:163)
metadata    { category, utmSource, utmCampaign, utmMedium, urlParams, referrer }
```

**The receiver destroys all of it.** `v1/server/api/src/routes/analytics.ts:6-19` destructures
`{ action, details, userId }` only, and writes `ActivityLog { action, details, userId }`
(`schema.prisma:847-855`). `details` is undefined → stored `null`. **City, region, country, source, session,
device and the entire UTM/campaign/referrer block are silently discarded on every landing.** The one
surviving column is the literal string `"landing_entry"` or `"organic_visit"`.

**And the report that was designed to consume it does not exist.** `AdminAnalytics.tsx:213-270` renders a
finished "نقاط الدخول الذكية — Smart Landing Analytics" section — Targeted (Ad) Visits · Organic Visits ·
Distinct Cities · Traffic Sources, plus three ranked cards (Top Entry Cities, Traffic Sources, Ad
Categories) — from `GET /api/analytics/landing-entries?from&to` (`:63`). `analytics.ts` has exactly one
route, `POST /track`. The endpoint, `GET /api/analytics/market-trends` (`:55`) and
`GET|POST /api/analytics/reports` (`:59,67`) are all absent, and every one of those calls additionally
carries both `apiRequest` transport defects (leading `/api` → `/api/api/...`, plus `.then(r => r.json())`).

**Net rulebook verdict.** The routing half of Smart Landing (aliases, precedence, banner copy, geo default)
is real, deliberate and worth keeping. The measurement half is a closed loop that is severed at both ends,
and 3 of the 5 Saudi city keywords write an unusable governorate.

### B.9 Adjacent personalisation surfaces

* **`WelcomeBanner.tsx`** (40 lines) — an Arabic-only, RTL-locked geo greeting
  ("مرحباً بزوارنا من {city} · {country} 🎉 — تم تخصيص الإعلانات والمحتوى لمنطقتك تلقائياً") with a
  dismiss persisted to `akar_geo_dismissed` (`GeoContext.tsx:126-129`). **It is imported by nothing**
  (`grep WelcomeBanner src/` → only its own file). Dead component, live idea.
* **`PageHeroBanner.tsx`** (70 lines) — a random-start, 5 s-rotating hero built from featured listings that
  have images, with dot navigation (`:20-34,55-67`). Also imported by nothing. The shipped hero is
  `PageHeroSlideshow`/`HeroAdsBanner` (see `frag2/13`).
* **`InstallPWA.tsx`** — captures `beforeinstallprompt` (`:14-20`) and drives `src/pwa.ts:11-32`. Also
  **never mounted**; only `registerSW()` is called (`App.tsx:19,354`), so V1 registers `/sw.js` but never
  offers installation.
* **`routePrefetch.ts`** — 41 route patterns → lazy-chunk importers, installed once (`App.tsx:18,353`) via
  three passive capturing delegates on `mouseover`/`touchstart`/`focusin` (`:106-108`), de-duplicated by
  regex source with rollback on failure (`:62-72`), query/hash stripped before matching (`:87-91`). It is
  the only performance-personalisation layer in V1 and it is **complete and correct** — including entries
  for all four acquisition funnels (`:55-58`). Note `:28` prefetches `PricingComingSoon`, confirming the
  stub is the intended `/pricing` target.

---

## C. Support & ticket system

**The verified starting point is CONFIRMED, at file:line.**

* `AdminTickets` is localStorage-only: `STORAGE_KEY = "akar_support_tickets"`
  (`v1/src/pages/AdminTickets.tsx:38`), `loadTickets()` reads it and seeds it on first run
  (`:104-112`), `saveTickets()` writes it (`:114-116`), and all three mutations
  (`handleSendReply` `:151-170`, `handleChangeStatus` `:172-179`, `handleChangePriority` `:181-188`)
  call `saveTickets` only. There is **no `apiRequest`, no `fetch`, no `useQuery`** anywhere in the file.
* **No server ticket API exists.** `grep -rni "ticket" v1/server/ --include=*.ts --include=*.prisma`
  returns **zero matches** — no route, no service, no Prisma model, and no mount in
  `v1/server/api/src/index.ts:81-139`.
* The page ships **6 hardcoded fake tickets** with real-looking Arabic customer names and e-mails
  (`:56-102`), written into the operator's browser on first visit (`:110`).

Route `/admin/tickets`, `ProtectedRoute … adminOnly` (`v1/src/App.tsx:304`; lazy `:71`).

### C.1 Product intent (preserve this even though the implementation is local)

The data model is a complete, conventional helpdesk contract (`AdminTickets.tsx:14-36`):

| Concept | Values | Line |
|---|---|---|
| **Status** | `open` → `in_progress` → `resolved` → `closed` | `:30`, `:54` |
| **Priority** | `low` · `medium` · `high` · `urgent` | `:31`, `:53` |
| **Category** | `general` · `technical` · `billing` · `property` · `service` · `report` | `:32`, `:52` |
| **Requester** | `userId`, `userName`, `userEmail` denormalised onto the ticket | `:24-26` |
| **Thread** | `responses: TicketResponse[]` with `adminId`, `adminName`, `isAdmin`, `createdAt` | `:14-21`, `:35` |
| **Timestamps** | `createdAt` + `updatedAt`, touched on every mutation | `:33-34`, `:164,174,183` |

Behavioural rules that are real product decisions, all implemented:

1. **Auto-transition on first reply** — replying to an `open` ticket moves it to `in_progress`
   (`:163`); any other status is left alone. This is an implicit "first response" SLA marker.
2. **Closed tickets are read-only** — the reply textarea and send button are disabled when
   `status === "closed"`, with an explanatory line (`:404,406,410-414`).
3. **Status-grouped inbox** — the list is bucketed by status in fixed order with a coloured dot and a
   per-bucket count, and empty buckets are hidden (`:146-149,275-284`).
4. **Three-axis filtering + free-text search** over subject and requester name (`:135-144,236-265`).
5. **Two-pane responsive shell** with an explicit mobile List/Ticket toggle (`:127,213-220,224,315`).
6. **Chat-shaped conversation** — requester message first, then admin/user bubbles mirrored by
   `isAdmin` and RTL (`:373-391`); Enter sends, Shift+Enter newlines (`:401`).

### C.2 What the intent is missing

* **No assignment.** There is no `assignedTo`/`assigneeId` field and no assignment UI. Every reply is
  attributed to the literal constants `adminId: 1, adminName: "Admin"` (`:155-156`).
* **No SLA.** No `dueAt`, no first-response or resolution clock, no breach state, no escalation. Rule 1 is
  the only SLA-adjacent behaviour in the system.
* **No ticket creation path for a user.** Nothing in `v1/src` writes `akar_support_tickets` except this
  admin page. There is no `/support`, no "open a ticket" affordance, and the only public contact surface
  (`Contact.tsx`) discards its input (see below).
* **No attachments, no internal notes, no merge, no ticket-to-entity link** (property/service/auction).
* **Imports betray planned actions never built** — `AlertTriangle`, `CheckCircle2`, `XCircle`, `Eye`,
  `Trash2` are imported at `:2-4` and never rendered.

### C.3 The adjacent inbound channels that do exist

| Channel | Path | Reality |
|---|---|---|
| **Contact form** | `v1/src/pages/Contact.tsx:81-116` | 5 fields (name*, phone*, email, subject*, message*), fully i18n via `t("contact.*")`. `handleSubmit` (`:21-29`) is `setTimeout(…,1500)` → success toast → `form.reset()`. **Nothing is posted.** Published support addresses `info@akarpromax.com` / `support@akarpromax.com` (`:65-66`) are the only working escalation. |
| **Property inquiries** | `v1/server/api/src/routes/inquiries.ts:14-26` | A real, unauthenticated `POST /api/inquiries` writing `Inquiry{name,email,phone,message,propertyId,isEliteLead}` (`schema.prisma:707-719`), plus `GET /all` behind `requireAuth` (`:7-12`). `Contact.tsx` does **not** use it. |
| **Admin ↔ user chat** | `v1/src/types/chat.ts:1-42` | A parallel, *typed but server-less* support concept: `AdminConversation` (open/closed, `unreadCount`, denormalised user identity), `AdminMessage` with `senderRole: user|admin|system` and `type: text|system|warning`, and `AuditLogEntry` (`adminId`, `actionType`, `targetUserId`). Consumed by `AdminChat` — cross-reference `frag2/12-v1-messaging.md`. The **`system` / `warning` message types and the audit entry are the closest thing V1 has to ticket automation**, and they live in a different subsystem. |

**Depth classification, honestly:** `AdminTickets` is **L1 UI_ONLY** — a complete triage UI over browser
storage, seeded with fiction, with no server, no model, no user-facing intake and no cross-device state.
Two operators see two different ticket queues; clearing site data destroys the queue. The **product intent**
(4 statuses × 4 priorities × 6 categories, threaded replies, auto-transition, closed-lock) is worth
restoring in full; the implementation is not a foundation.

---

## D. SEO management system

**The verified starting point is CONFIRMED, at file:line.** `AdminSEO.tsx` (608 lines) persists to
`localStorage` only: `STORAGE_KEY = "akar_seo_settings"` (`:46`), `loadSettings()` (`:127-136`),
`persist()` = `localStorage.setItem` (`:157-159`), and the four save handlers
(`handleSaveGlobal` `:169-172`, `handleSaveRobots` `:174-177`, `handleSaveSitemapSettings` `:179-182`,
`savePageMeta` `:220-227`) all call it. Structured data goes to three further keys —
`akar_schema_organization`, `akar_schema_local_business`, `akar_schema_website` (`:242-244`). The file
contains **no `apiRequest`, no `fetch`, no `useQuery`**. Route `/admin/seo`, `adminOnly` (`App.tsx:309`).

### D.1 The seven managed concerns and where each is (not) persisted

| Concern | Authored in AdminSEO | Persisted to | Read by the running app? |
|---|---|---|---|
| **Global meta** — titleSuffix, defaultOgImage, twitterCard (`summary`\|`summary_large_image`), facebookAppId, googleVerification, bingVerification | `:30-37`, UI `:283-330` | `localStorage.akar_seo_settings` | **No** |
| **Per-page meta** — 20 seeded routes × {titleAr, titleEn, descriptionAr, descriptionEn, ogImage, noIndex, canonicalUrl} | `:17-27`, `:49-70`, editor `:440-451` | same key | **No** |
| **Sitemap** — `autoUpdate`, `excludedRoutes[]`, `lastGenerated`, XML generator + browser download | `:38-42`, `:185-212` | same key (settings) / a `.xml` **file download**, never the server | **No** |
| **robots.txt** — a single editable text blob | `:44`, default `:87` | same key | **No** |
| **JSON-LD / structured data** — 3 seeds: `Organization`, `LocalBusiness`, `WebSite`+`SearchAction` | `:89-125`, validator `:229-239` | 3 separate keys | **No** |
| **OG / Twitter cards** | global tab | same key | **No** — see D.2 |
| **Canonical URLs** | per-page field `:26` | same key | **No** |
| **hreflang** | *not modelled at all* | — | `grep -rn hreflang v1/src v1/index.html v1/server` → **zero matches** |

**The decisive finding: nothing in V1 consumes any of it.**
`grep -rn "akar_seo_settings\|akar_schema_" v1/src/ | grep -v AdminSEO` returns **zero results**.
`SeoHead.tsx` — the component every page uses — takes only `{title, description, image}` props and emits a
fixed 9-tag block via `react-helmet-async`: `<title>`, `description`, `og:title`, `og:description`,
`og:type=website`, `og:site_name`, optional `og:image`, `twitter:card=summary_large_image`, `twitter:title`,
`twitter:description`. It never reads `localStorage`. Therefore:

* the `titleSuffix` field is inert — `SeoHead` hardcodes `` `${title} - عقار بروماكس | AkarPromax` ``,
  which is a *different* suffix from the AdminSEO default `" | AkarPromax | عقار بروماكس"` (`:31`);
* `noIndex` renders no `<meta name="robots">` anywhere — the tooltip at `:448` promises it, and `/dashboard`
  is seeded `noIndex: true` (`:62`), but every admin and dashboard route is indexable;
* `canonicalUrl` emits no `<link rel="canonical">` anywhere in V1;
* the three JSON-LD documents are validated (`JSON.parse`) and stored, and **never injected** — V1 ships
  zero structured data;
* the generated `sitemap.xml` exists only as a file the admin downloads to their own machine and must
  upload manually; `autoUpdate` (`:40`) toggles nothing;
* the edited `robots.txt` — which correctly disallows `/admin/`, `/dashboard/`, `/dev-login` and declares
  `Sitemap: https://akarpromax.com/sitemap.xml` (`:87`) — is never served.

### D.2 What is actually emitted at runtime

`v1/index.html` (static, 24 head tags):

* `<html lang="ar" dir="rtl">` — **hardcoded**, so an English visitor is served an Arabic-declared document;
* title, description, `keywords`, `author` = "Al-Fayhaa General Trading — C.R. 1448067";
* Open Graph: `og:type`, `og:url=https://akarpromax.com/`, `og:title`, `og:description`, `og:site_name`
  — **no `og:image`**;
* Twitter: **`twitter:card` = `summary`**, contradicting both `SeoHead` (`summary_large_image`) and the
  AdminSEO default (`summary_large_image`, `:33`);
* PWA: `manifest.json`, `theme-color=#2563EB`, `mobile-web-app-capable`, `apple-mobile-web-app-*`,
  `apple-touch-icon=/icons/icon-192.png`, `favicon.svg`;
* performance: 4 preconnect/dns-prefetch hints + a Google Fonts stylesheet (Tajawal / Inter / Poppins);
* **absent: canonical, hreflang, robots, JSON-LD, `og:image`, `og:locale`.**

`SeoHead` is applied on 100+ pages, giving V1 real per-page titles and descriptions — including on all four
acquisition funnels (`JoinFounders.tsx:145`, `LandingProfessionals.tsx:38`, `LandingOffices.tsx:32`,
`LandingCorporates.tsx:28`) — but always in **English only**, hardcoded in the JSX, ignoring the bilingual
AR/EN pairs AdminSEO was built to manage.

### D.3 Public artefacts

`v1/public/` **does not exist in the staged tree** (`ls v1/public` → *No such file or directory*), so the
seven artefacts named in the task manifest — `.htaccess`, `manifest.json`, `robots.txt`, `sitemap.xml`,
`sw.js`, `offline.html`, `mockServiceWorker.js` — are reported from that manifest, not verified on disk.
Four of them are referenced from staged source and are therefore **required to exist** for V1 to function:
`manifest.json` (`index.html:12`), `sw.js` (`v1/src/pwa.ts:4`, registered at `App.tsx:354`),
`mockServiceWorker.js` (the MSW worker for `v1/src/mocks/browser.ts`, which is never started — see
`frag2/17`), and `robots.txt`/`sitemap.xml` (declared to each other by the AdminSEO default at `:87`).
`offline.html` and `.htaccess` have no importer in staged source; `.htaccess` implies an Apache SPA-rewrite
deployment, which conflicts with the Express `express.static` + SPA fallback in
`v1/server/api/src/index.ts:155`. **All seven must be re-supplied before any parity claim about hosting,
crawling or offline behaviour can be made — flagged `OLD SOURCE REQUIRED`.**

**Depth classification:** `AdminSEO` is **L1 UI_ONLY**. It is the most convincing false-positive surface in
V1 — four polished tabs, a JSON validator, a working XML generator — governing nothing.

---

## E. Lookup & taxonomy system

**The verified starting point is CONFIRMED, at file:line.** `AdminLookups.tsx` (451 lines) is
localStorage-only: `STORAGE_KEY = "akar_lookups"` (`:36`), `loadData()` (`:137-150`), `persist()` =
`localStorage.setItem` + `setState` (`:176-179`). No `apiRequest`, no `fetch`, no `useQuery`. And it holds
exactly **7 taxonomy categories** — `cities`, `propertyTypes`, `specializations`, `serviceCategories`,
`amenities`, `tags`, `listingPurposes` (`:24-32`, tab order `:162-175`). Route `/admin/lookups`, `adminOnly`
(`App.tsx:310`).

### E.1 The 7 taxonomies, their shape and their seeds

Every entry is a `LookupCategory` (`:15-22`): `id` (base-36 timestamp + random, `:38-40`), `nameAr`,
`nameEn`, `slug` (auto-derived: lowercase, spaces→hyphens, non-`[a-z0-9-]` stripped, `:52-54`),
`sortOrder`, `isActive`. The UI supports add/edit/delete/activate-toggle/search per tab
(`:2`, `:180-210`, dialog `:169`).

| # | Taxonomy | Seed count | Seed content | Lines |
|---|---|---|---|---|
| 1 | `cities` | 10 | **Omani only** — مسقط, السيب, بوشر, مطرح, العامرات, الخوير, صحار, صلالة, نزوى, عبري | `:57-68` |
| 2 | `propertyTypes` | 6 | شقة, فيلا, أرض, تجاري, مستودع, مكتب | `:69-76` |
| 3 | `specializations` | 15 | سباكة, كهرباء, نجارة, دهان, تبريد وتكييف, بناء عام, بلاط وسيراميك, جبس, حدادة, زجاج ومرايا, دهانات ديكور, عزل مائي, ألمنيوم, نقاشة سيارات, فني الكترونيات | `:77-94` |
| 4 | `serviceCategories` | 10 | صيانة منزلية, تنظيف, نقل عفش, ديكور وتصميم, حدائق وتنسيق, مكافحة حشرات, حماية وأمن, سباكة, كهرباء, استشارات هندسية | `:95-106` |
| 5 | `amenities` | 10 | مسبح, موقف سيارات, مصعد, أمن وحراسة, حديقة, صالة رياضية, نادي صحي, غرفة غسيل, مكيف مركزي, طاقة شمسية | `:107-118` |
| 6 | `tags` | 10 | مطلوب, للبيع, للإيجار, مميز, عرض خاص, مفروش, استثماري, تجاري, سكني, مكتب | `:119-130` |
| 7 | `listingPurposes` | 2 | بيع, تأجير | `:131-134` |

**63 seed items total.** `loadData()` merges per key and falls back to `SEED[key]` for any key that is
missing or not an array (`:141-147`), so a partial write cannot corrupt the whole store.

### E.2 Consumers — there are none

`grep -rn "akar_lookups" v1/src/ | grep -v AdminLookups` → **zero results**. Not one property form, service
form, filter chip, amenity picker or tag selector in V1 reads this store. Every one of the 7 taxonomies is
duplicated elsewhere as a hardcoded constant, and those duplicates are what the product actually uses:

| Taxonomy | What the rest of V1 actually reads | Source of truth |
|---|---|---|
| cities | `citiesData.json` — **269 governorate keys → 652 cities**, loaded synchronously as a bundled import via `getCitiesForGovernorate()` (`v1/src/lib/citiesData.ts:1-6`) | **hardcoded file** |
| cities (2nd copy) | `locationsData.json` — **22 countries / 275 governorates / 680 cities**, read *server-side only* by `locations.ts:10-16` | **hardcoded file** |
| cities (3rd copy) | `JoinFounders.tsx:43-58` — 47 literal strings | **hardcoded page constant** |
| cities (4th copy) | `useSmartLanding.ts:59-93` — 33 aliases → 18 cities | **hardcoded hook constant** |
| governorates | `arabCountries.ts` `governorates`/`governoratesEn` per country (24 countries) | **hardcoded file** |
| propertyTypes | `AdminAnalytics.tsx:45-48` label map (6) · `SmartLandingBanner` category configs (8) · `TURKISH_PROPERTY_TYPE_MAP` (`arabCountries.ts:206`) | **hardcoded, 3 divergent copies** |
| specializations / serviceCategories | `Category` rows via `GET /api/categories` — a real DB taxonomy with `type` ∈ {`other_service`,`service_hub`} and `section` ∈ {`OTHER_SERVICES`,`CRAFTS`,`ENGINEERING`,`PHOTOGRAPHY`,`DISPUTE_RESOLUTION`} (`schema.prisma:1283-1301`, route `categories.ts:8-24`) | **server** |
| amenities | property forms — cross-reference `frag2/17` | hardcoded |
| tags | `BlogPost.tags` is a JSON string column (`schema.prisma:478`); blog categories are 5 hardcoded server rows (`blog.ts:7-13`) | hardcoded |
| listingPurposes | `sale`/`rent` literals throughout (`SmartLandingBanner.tsx:138,153`) | hardcoded |

### E.3 The one real server taxonomy — and its broken admin

`Category` is the only taxonomy in V1 with a database table, a unique constraint
(`@@unique([key, type, section])`, `schema.prisma:1299`) and a guarded CRUD API:
`GET /` (public, filters `type`/`section`/`active`, ordered by section→sortOrder→id, `categories.ts:8-24`),
`GET /:id` (`:26-36`), and `POST`/`PUT`/`DELETE` all behind `requireAuth, requireRole("admin")` with P2002
duplicate handling (`:38-77`). It is a genuinely well-built endpoint.

**Its admin page cannot call it.** `AdminCategories.tsx` uses a *fetch-style* signature against
`apiRequest(method, path, body?, token?)` on all five call sites:

```
:59   apiRequest("/api/categories")                                     → method="/api/categories", path=undefined
:93   apiRequest(`/api/categories/${id}`, { method:"PUT",  body:… })    → body passed as `path`
:96   apiRequest("/api/categories",       { method:"POST", body:… })
:108  apiRequest(`/api/categories/${id}`, { method:"PUT",  body:… })
:118  apiRequest(`/api/categories/${id}`, { method:"DELETE" })
```

Every call builds `fetch(baseUrl + "undefined", { method: "/api/categories" })` — an invalid HTTP method
against a non-existent path — and `:60` then calls `.json()` on the already-parsed result. **All five
operations fail**; the page shows "فشل تحميل الفئات" on load (`:62`). The 5 sections it can author
(`:25-31`) map exactly to the Prisma `section` comment, so the intent is correct and only the transport is
wrong. Route `/admin/categories`, `adminOnly` (`App.tsx:315`).

### E.4 The locations API nobody calls

`locations.ts` is mounted at the bare `/api` prefix (`index.ts:111`) and exposes three clean endpoints —
`GET /api/countries`, `GET /api/governorates/:countryCode`, `GET /api/cities/:governorate` (`:18-42`) —
each returning `{id, nameAr, nameEn}` from `locationsData.json`. `grep -rn "/countries\|/governorates/\|
/cities/" v1/src` returns **zero frontend callers**. The entire geo hierarchy is served to the browser as a
bundled JSON import instead, which is why `citiesData.json` (client, 269 keys) and `locationsData.json`
(server, 275 governorates) have **drifted apart by 6 governorates and 28 cities** and why the governorate
key mismatches in §B.3/§B.6 exist at all.

`Setting` (`schema.prisma:676-681`, `key`/`value`) is the only generic server-side config store and is used
for exactly **one** key — `free_trial_days` (seeded `"14"` at `seed.ts:52`, read/written by
`admin.ts:157,165`). Note this is a **third** trial duration, alongside the 30 days the code actually issues
and the 90 days/3 months the funnels promise.

**Depth classification:** `AdminLookups` is **L1 UI_ONLY** (localStorage, zero consumers).
`AdminCategories` is **L1 UI_ONLY** in practice over an **L4** server (`Category` CRUD is END_TO_END_WIRED
and authorised; only the client transport is broken). The bundled geo files are **L2 DATA_MODEL_ONLY** —
real data, no management surface.

---

## F. Content, knowledge and licensing

### F.1 Blog / editorial — a blog engine branded as a forum

**Framing.** `/blog` is titled `t("nav.forum")` (`v1/src/pages/Blog.tsx:71`) and `/blog/write` is
"موضوع جديد / New Topic" — "اكتب موضوعاً جديداً في المنتدى / Start a new forum discussion"
(`WriteBlog.tsx:82-83`). The model, API and cards are a blog. Preserve the *forum* product intent
separately from the *blog* implementation.

**Server (real, and the only server-backed content system in this fragment).**
`blog.ts` exposes 5 hardcoded categories — real-estate, market-news, investment-tips, legal-guide,
construction (`:7-18`); `GET /` with `q`/`category`/`limit`/`offset`, `published: true` forced, OR-search
across title/content/excerpt, `include: author{id,fullName,avatar}`, returning `{posts,total}` (`:20-43`);
`GET /:id` (`:45-56`); `POST /` behind `requireAuth`, auto-slugging from the English title, `tags` stored as
a JSON string, `published` defaulting **true**, `country` defaulting `"OM"` (`:58-82`).
`BlogPost` (`schema.prisma:467-489`) is fully bilingual — `title/titleAr`, `excerpt/excerptAr`,
`content/contentAr` — plus `category`, `coverImage`, unique `slug`, `tags`, `published`, `country`, `city`,
`authorId` FK.

**Six defects across the editorial chain:**

1. **No update, no delete, no unpublish.** `blog.ts` has only GET ×3 and POST. There is no `PUT`, no
   `DELETE`, no publish toggle — an author cannot correct a typo and an admin cannot take a post down.
2. **`AdminBlog` is localStorage-only.** `STORAGE_KEY = "akar_blog_posts"` seeded from `MOCK_POSTS`
   (`AdminBlog.tsx:31,42-49`). The admin blog console and the public blog are two disconnected datasets.
3. **`BlogPostDetail` writes the server post into that same fake store.** `archiveBlogPosts()`
   (`BlogPostDetail.tsx:69-95`) copies every viewed post into `akar_blog_posts` on render, silently
   remapping fields (`coverImage → image`, invented `status`/`featured`). This is the only bridge between
   the two datasets and it runs as a **side effect during render**, not in an effect.
4. **Rich text is authored but rendered as plain text.** `WriteBlog.tsx:116` composes with
   `RichTextEditor` (a `contentEditable` + `document.execCommand` toolbar that inlines pasted images as
   base64 data-URLs, `RichTextEditor.tsx:20-52`, and previews via `dangerouslySetInnerHTML` at
   `WriteBlog.tsx:102` / `RichTextEditor.tsx:111`). The public page renders `{content}` inside
   `whitespace-pre-wrap` (`BlogPostDetail.tsx:197-198`). **Every formatted post displays its raw HTML tags
   to readers.**
5. **Comments are per-browser.** `akar_comments` in `localStorage`, add and delete with no ownership check
   (`BlogPostDetail.tsx:33-63`) — any visitor can delete any comment they can see, and nobody else ever
   sees a comment.
6. **Ban enforcement is client-side and fake.** `WriteBlog.tsx:51-58` and `FreeResources.tsx:154-161`
   both check a banned flag by reading `localStorage.akar_users` — a store the user controls.

`BlogCard.tsx` is sound: links to `/blog/:id` from image and title (`:59,96`), per-category emoji + i18n
label map (`:76-77`), AR/EN author and title fallback (`:51-53`).

**`AdminContent`** (`AdminContent.tsx`) manages **4 static pages** — `about`, `terms`, `privacy`, `faq`
(`:29-77`) — each with `titleAr/titleEn`, `contentAr/contentEn`, `metaDescriptionAr/metaDescriptionEn`,
`published`, `updatedAt`. The seeded copy is substantial and legally specific (a **14-day refund window**
and Sultanate-of-Oman governing law in `terms`; a cookie clause and a no-sale-of-data promise in `privacy`;
5 seeded FAQ Q&As including "basic registration is free"). It is `localStorage`-only
(`akar_static_content`, `:27,82,105`) and **`grep -rn akar_static_content v1/src | grep -v AdminContent`
returns nothing** — `About.tsx`, `Terms`, `Privacy` render their own hardcoded copy. Editing the legal text
in the admin console changes nothing a user can see. **This is a compliance risk, not a cosmetic one.**

### F.2 Knowledge / free resources — an upload pipeline with no receiver

`FreeResources.tsx` (457 lines) is a two-tab library — **books** and **software** (`:21`) — with a full
publisher dialog: bilingual title/description gated on a language selector (`ar` / `en` / `both`,
`:190-192`), 6 book categories and 5 software categories (`:186-187`), a required file plus an optional
cover, and progress feedback (`:135-137`). Download is auth-gated with a toast (`:337-340`), streams a blob,
sets `a.download = resource.fileName`, and optimistically increments the visible `downloadCount`
(`:344-355`). Admins get a delete action (`:359+`). `AdminFreeResources.tsx` fetches book and software lists
in parallel and deletes by id (`:57-70`).

**Every one of those server interactions is a dead end:**

| Call | Resolves to | Result |
|---|---|---|
| `POST /api/free-resources` (multipart, `FreeResources.tsx:176`) | `other.ts:65-119` — `"free-resources"` matches **no** POST branch | falls through to `res.json({success:true})` at `:118`. **No row created, the uploaded file and cover discarded** (there is no multer/upload middleware on the route at all). The UI then toasts "تم النشر بنجاح / Published Successfully". |
| `GET /api/free-resources?type=book\|software&lang=` (`:324`, `AdminFreeResources.tsx:58-59`) | `other.ts:10-14` | returns **all** `FreeResource` rows; `type` and `lang` are ignored. |
| `GET /api/free-resources/:id/download` (`:346`) | no such route | 404 — **every download fails**. |
| `DELETE /api/free-resources/:id` (`AdminFreeResources.tsx:68`) | `other.ts:162-165` | unconditional `{success:true}` no-op. **Nothing is deleted**, and the UI reports success. |

**And the model cannot hold the product.** `FreeResource` (`schema.prisma:857-868`) is
`{title, description, fileUrl, category, downloadCount}` — it has **no `type`** (so books and software are
indistinguishable), **no `fileName`**, **no `titleAr/titleEn`/`descriptionAr/descriptionEn`** (so the
bilingual capture is unstorable), **no `language`**, **no `coverImage`**, and **no uploader FK**.

### F.3 Software, download and licensing

**`/software`** renders a product page — price tiers, feature list, screenshot gallery
(`Software.tsx:46,56-62,75-82`) — from `useListSoftwareProducts()` →
`apiRequest("GET","/software/products")` (`workspace-api-client-stub.ts:324-330`). That path is mounted on
the catch-all (`index.ts:106`) and `other.ts:53-60` answers it with
`prisma.softwareLicense.findMany({ where: { status: "active" } })` — i.e. **the public product catalogue is
served a list of issued licence keys**. `SoftwareLicense` (`schema.prisma:616-629`) has
`key/status/type/hwid/expiresAt/userId/notes` and none of `name`, `price*`, `features`, `screenshots`
(`workspace-api-client-stub.ts:158-168`), so every price tier is filtered out by
`.filter(p => p.price != null)` (`Software.tsx:46`) and the page renders empty. It is also an
**information-disclosure defect**: active licence keys are returned on an unauthenticated endpoint.

**`/download`** (`Download.tsx`) is the desktop acquisition path and is broken in three places:

1. `POST /api/desktop/free-trial-license` (`:92`) **exists and works** — but it is
   **unauthenticated**, takes no body, and mints a real `SoftwareLicense{type:"trial",status:"active"}` with
   **`expiresAt = now + 30 days`** and **no `userId`** (`desktop.ts:277-288`). Anyone can farm unlimited
   anonymous keys, and no key is attributable to a customer.
2. **Duration contradiction across four surfaces** — the funnels promise **3 months**
   (`LandingOffices.tsx:120,147`, `PricingComingSoon.tsx:39,43`), the purchase page comments **90 days**
   (`BuyLicense.tsx:129`), the `Setting` store says **14** (`seed.ts:52`), and the server issues **30**
   (`desktop.ts:281-282`).
3. `GET /api/download/setup` (`:107`) **is not mounted**. The only `/download` mount is the bare
   `app.use("/download", … redirect("/api/desktop/version"))` (`index.ts:140`), outside the `/api` prefix;
   the desktop router's own `GET /setup` (`desktop.ts:289-291`) is at `/api/desktop/setup` and merely
   redirects to `/api/desktop/version`, whose JSON returns `downloadUrl` while the client looks for
   `data.url` (`Download.tsx:117-121`). **The installer never downloads.**

**`/buy-license`** (`BuyLicense.tsx`, 516 lines) is the richest commercial surface in V1: 4 licence types
(`trial` / `monthly` / `yearly` / `lifetime`, `:61`), price resolution per type with a lifetime→yearly
fallback (`:86-90`), a live gateway-availability probe (`GET /payments/gateways`, `:75`), PayPal plus
bank-transfer with copy-to-clipboard IBAN, holder name/e-mail/phone capture, and a pending-order state.
`useCreateLicense()` posts `{softwareId, holderName, holderEmail, holderPhone, licenseType, amountPaid}`
(`:97-105`) to `POST /api/licenses`, which destructures `{type = "trial", durationDays = 30, notes}`
(`licenses.ts:18-36`). **None of the six fields sent is a field the server reads.** Every purchase —
monthly, yearly or lifetime — therefore creates a **30-day trial**, the buyer's identity and the amount paid
are discarded, and the success handler reads `data.licenseKey` (`:110`) while the server returns `key`.

**`/verify-license`** (`VerifyLicense.tsx`) renders four outcome states — valid / expired / revoked /
not-found — from `validation.status` (`:38-46`). `POST /licenses/validate` returns
`{valid, expired, license}` with **no `status` field** (`licenses.ts:38-51`), and answers not-found with a
`404` that `apiRequest` converts into a thrown error (`api.ts:1207-1217`), so no result renders at all.
Three of the four states are unreachable.

**Admin licensing** is the one part of this chain that works. `AdminSoftwareLicenses.tsx` calls
`/admin/licenses` (list `:97`) and `/admin/licenses/:id/revoke` (`:100`), which exist at
`admin.ts:448,455,474` behind the router-wide `requireAuth, requireRole("admin")` guard (`admin.ts:9`).
`AdminLicenseKeys.tsx` (560 lines) drives the desktop key lifecycle — list (`/admin/license/desktop`, `:77`),
generate-free (`:80`), convert-to-yearly (`:92`), **reset-HWID** (`:101`) and revoke (`:110`) — against
`admin.ts:357-405`, all guarded. Its KPI tiles filter on `r.licenseType` (`:119`) while the API returns raw
`SoftwareLicense` rows carrying `type`, so the active/trial/educational counters read zero; the mutations
themselves are correct. `LicenseCode` redemption is implemented **three times** with identical bodies —
`other.ts:90-113`, `other.ts:129-153`, `licenses.ts:53-78` and `licenses.ts:80-103` — reachable as
`POST /api/license-codes`, `/api/license-codes/redeem`, `/api/licenses/redeem` and
`/api/licenses/codes/redeem`. `DesktopVersion` (`schema.prisma:892-903`) supports `minVersion` +
`forceUpdate` + `releaseNotes`, served by `desktop.ts:16-42` with a hardcoded 2.0.0 fallback — but there is
**no admin surface to publish a version**, so the fallback is what ships.

### F.4 Notifications & PWA

Delivery (web push, e-mail, in-app, `notification-sender.ts`, `Notification`/`PushSubscription`/`EmailLog`,
the unmounted `/api/push/*` client paths, and the localStorage-only `AdminNotifications` composer) is fully
audited in **`frag2/12-v1-messaging.md`, rows `V1-NOTIF-001…025`** — not repeated here.

New here, PWA-side only:

* `src/pwa.ts:1-7` registers `/sw.js` on `window.load` with errors swallowed; called once at
  `App.tsx:19,354`. The service-worker file itself is in the unstaged `public/` (see D.3).
* `src/pwa.ts:9-32` implements a complete install-prompt broker (`captureInstallPrompt`,
  `showInstallPrompt` returning the user's choice, `isInstallable`), and `components/InstallPWA.tsx`
  wires it to `beforeinstallprompt`. **`InstallPWA` is never mounted** — V1 ships a PWA that can never be
  installed from within the app.
* `NotificationPermissionBanner.tsx` **is** mounted (`App.tsx:17,375`) and is well-gated — hidden when
  unsupported, logged-out, already subscribed, denied, or dismissed (`akar_push_banner_dismissed` via
  `push_banner_dismissed`, `:14-31`) — with a 3-second success state (`:34-38`). It is the entry point to
  the broken `/api/push/subscribe` path documented in `V1-NOTIF-015`.

### F.5 Market intelligence

`AdminMarketRates`, `MarketHistory` and `InvestmentRadar` are already covered by
**`frag2/17-v1-properties-orgs.md` rows `V1-ORG-027`, `V1-ORG-028`, `V1-ORG-029`** and are not duplicated.
One supporting detail belonging to this fragment: the three `[]`-returning branches and the hardcoded FX
triple those rows depend on are all in the catch-all router — `other.ts:24-31` (`usd-omr 0.385`,
`sar-omr 0.1026`, `aed-omr 0.1048`, `change: 0`) and `other.ts:32-35` (investment-radar / history / diwan).
Separately, `useCurrency.ts:5-22` carries a **fourth**, unrelated FX table: 17 hardcoded rates against AED,
labelled "أسعار صرف تقريبية", used for the approximate `≈` conversion shown next to every price
(`:79-88`). V1 has no single source of exchange-rate truth.

### F.6 i18n / localization

**The bundle.** `i18n.ts:14-33` initialises i18next + `react-i18next` +
`i18next-browser-languagedetector`, resources `ar` and `en`, `lng` seeded from `localStorage.akar_lang`
defaulting `"ar"`, `fallbackLng: "ar"`, `supportedLngs: ["ar","en"]`, detection restricted to
`order: ["localStorage"]` with `lookupLocalStorage: "akar_lang"` and `caches: ["localStorage"]` — i.e.
**no browser-language, no query, no cookie, no path detection**. `setLanguage()` (`:35-43`) changes the
language, persists it, and sets `documentElement.dir`, `.lang` and `data-lang` (the font switch); the same
three attributes are applied synchronously at module load (`:53-57`) so first paint is never mis-directed.
`useLanguage()` (`useLanguage.ts:4-27`) returns `{t, lang, isRTL, dir, toggleLanguage, switchTo, languages}`.

**Locale parity is perfect and the bundle is barely used.** `ar.json` and `en.json` each hold exactly
**720 leaf keys across 22 namespaces** (about, admin, auctions, auth, blog, brand, common, contact, footer,
home, marketer, nav, notFound, offices, pricing, properties, relist, sidebar, stats, tenders, ticker, tools)
with **zero keys present in one file and missing in the other** — a genuinely maintained dictionary.
But across `src/pages` + `src/components` (275 `.tsx`):

* `t("…")` appears **137 times in 17 files**;
* the inline pattern `isRTL ? "عربي" : "English"` appears **5,192 times in 167 files**.

**That 38:1 ratio is the real V1 localization architecture**: copy lives in JSX ternaries, not in the
bundle. Consequences to carry forward — a third language cannot be added without editing 167 components;
no copy can be changed without a redeploy; the four acquisition funnels, `AdminSEO`, `AdminLookups`,
`AdminTickets` and `AdminContent` are all 100% ternary-based; and `WelcomeBanner.tsx` is hardcoded
Arabic-only with `dir="rtl"` regardless of language.

**Country-aware formatting** is a separate, well-built layer: `useDateFormat()` switches US → MM/DD/YYYY
vs everyone → DD/MM/YYYY off `LocationContext.countryCode` (`useDateFormat.ts:8-27`); `useCurrency()`
resolves the visitor's currency from geo and formats with `toLocaleString("ar-SA"|"en-US")` plus AR/EN short
labels for 18 currencies and full English names for 19 (`useCurrency.ts:24-96`); `getAreaUnit`/`formatArea`
switch sqft vs sqm by country (`arabCountries.ts:190-204`). Cross-reference `frag/07-ads-currency-i18n.md`
for the V2 side.

**Two more platform hooks in scope.** `useTheme()` (`useTheme.ts`) is a complete
light/dark/system tri-state persisted to `akar_theme`, resolving `system` through
`matchMedia("(prefers-color-scheme: dark)")` with a live change listener and a `documentElement.classList`
toggle (`:29-66`) — production-quality. `useIsMobile()` is a 768 px `matchMedia` breakpoint hook
(`use-mobile.tsx:3-19`). `useEnterKeyNavigation()` (131 lines) is a distinctive Arabic-data-entry
affordance: Enter advances to the next field for text/number/tel/email inputs and selects, textareas keep
Enter for newlines and use Ctrl+Enter to advance, the last field fires `onLastFieldEnter()`, and three
declarative escape hatches exist — `data-enter-skip`, `data-enter-next="fieldId"`, `data-enter-trigger`
(`:4-27`). This is a real productivity feature for the office/data-entry persona and has no V2 equivalent.

### F.7 Admin operations not covered elsewhere

| Page | Route (all `adminOnly`) | Backing | Verdict |
|---|---|---|---|
| `AdminAnalytics` (310 ln) | `App.tsx:292` | 5 calls to `/api/analytics/*` — `market-trends`, `reports` (GET+POST), `reports/:id/download`, `landing-entries` — **none of which exist** (`analytics.ts` has only `POST /track`), each carrying both `apiRequest` transport defects (`:55,59,63,67,70`) | **BROKEN**. Intent is rich: total events, top city, top property type, highest avg budget, top-10 city bars, source breakdown (web vs desktop_app), budget-by-city, a paid market-report generator (3 report types, price, free flag, JSON export) and the Smart-Landing report of §B.8 |
| `AdminActivityLog` (138 ln) | `App.tsx:296` | `GET /activity-log?…` → `other.ts:7-62`; `"activity-log"` matches **no** branch → `res.json([])` at `:61` | **BROKEN**. `POST /api/activity-log` *does* write real rows (`other.ts:68-77`) and `POST /api/analytics/track` writes to the same table — so V1 collects an audit trail it can never read |
| `AdminReports` (373 ln) | `App.tsx:306` | `localStorage` `akar_reported_content` (`:31,99`) | **L1**. Intent: content moderation over 5 reportable types (property, office, review, message, artisan) × 4 statuses (pending, reviewed, resolved, dismissed) with reason + details. No server model, no report-submission path anywhere in V1 |
| `AdminSettings` (509 ln) | `App.tsx:307` | `localStorage` `akar_system_settings` (`:50,109`) | **L1**. 30 fields: bilingual site name/description, admin e-mail/phone/address, 6 social links, **maintenanceMode + message**, **registrationEnabled**, **emailVerificationRequired**, default currency/timezone, meta suffix/description/OG/favicon/logo, **Google Analytics ID**, **Facebook Pixel ID**, custom header/footer scripts. The three governance switches control nothing; `Setting` (server) holds one unrelated key |
| `AdminDiscounts` (406 ln) | `App.tsx:290` | **Real** — `/coupons` GET/POST/PUT/DELETE + `isActive` toggle, all `requireAuth` (`coupons.ts:17-50`), plus public `GET /coupons/public` (`:7`) and `POST /coupons/validate` (`:52`) | **L4 END_TO_END_WIRED** — the only fully working admin page in this fragment. Its public consumer is the orphaned `Pricing.tsx:34-38` promo banner |
| `AdminNewsTicker` (421 ln) | — | cross-reference `frag2/13-v1-advertising.md` | not duplicated |
| `AdminNotifications` (267 ln) | `App.tsx:305` | cross-reference `frag2/12`, row `V1-NOTIF-025` (`akar_admin_notifications` / `akar_pending_notifications`, `:24-25`) | not duplicated |

---


## Round 2 — V1 Engineering platform, CAD/BIM, Land/OCR, MapMyDeed

## V1 engineering platform architecture

### One page, one wizard, forty modules

`src/pages/ArchitecturalConsultant.tsx` (174 KB, 2 500 lines) is the **entire** engineering platform.
It is a **5-step linear wizard** held in `useState` (`:814-838`), mounted at `/arch-ai` behind
`ProtectedRoute` (`src/App.tsx:244`). Steps (`:992-998`):

| Step | Title | Modules mounted |
|---|---|---|
| 1 | Land Geometry (هندسة الأرض) | `LandGeometryModule` (`:1055`) + street/setback form (`:1060-1090`) |
| 2 | Project Type | 8 hard-coded sector cards `PROJECT_TYPES` (`:136-145`) |
| 3 | Expert Survey | `SECTOR_QUESTIONS[projectType]`, complexity-filtered (`:852-869`); CAD panel `CADProcessor` (`:1788`); `StructuralConfigurator` (`:1802`); `GlobalConfiguratorPanel` (`:1812`) |
| 4 | Design Config | facade / cladding / floor / wall / ceiling / door / window / roof pickers |
| 5 | Engineering Report | 25 engines + 4 report tabs + `DrawingEngine` (`:1825-2460`) |

All 33 `.tsx` engines are `React.lazy`-imported at `:39-69`; the 7 `.ts` modules are static imports inside
other engines. **All 40 files are reachable** — none is an orphan (`BIMViewer` is loaded lazily by
`CADProcessor.tsx:26,441`; `DXFWriter` / `MEPLayoutEngine` / `SectionElevationEngine` /
`ResidentialFloorPlanDXF` by `DrawingEngine.tsx:14-19`; `CADParser` / `CADGeometryEngine` by
`CADProcessor.tsx:23-24`; `UserPreferences` by `LayerMapper.tsx:26`, `PriceManager.tsx:22`,
`BilingualPDFContract.tsx:13`).

### Data flow

`landGeo` → derived `area` / `perimeter` / `buildableWidth|Depth` / `bcr` (`:872-885`, setbacks from
`SETBACK_RULES[land.frontStreetType]`) → `boqInput` (`:970-990`) → `BOQEngine` emits `BOQQuantities`
(`:2015-2019`) → consumed by `CostEstimator` (`:2022`), `PriceManager` (`:2141`), `ContractGenerator`
(`:2172`) and `DrawingEngine` (`:2443`). `PriceManager` emits `PriceSummary` → `ContractPackager` emits
`PackageState[]` → `BilingualPDFContract`. Sector engines are gated on `projectType` / `answers[...]`
(e.g. `HighRiseStructuralEngine` only when floors ≥ 10, `:2302-2323`; `BankingSecurityEngine` only when
`answers["c_type"] === "bank"`, `:961`).

### What a "project" is — and whether anything persists

**A "project" in V1 is a React state object that lives until the browser tab reloads.** There is:

- **no Prisma model** for any engineering artefact — `server/api/prisma/schema.prisma` has no `Project`,
  `BOQ`, `Contract`, `Drawing`, `MarketRate` or `Consultant*` model (`grep '^model ' | grep -i
  'arch|project|contract|boq|cad|drawing|consult|diwan|market'` returns only marketer/marketing models);
- **no persistence in the page** — `ArchitecturalConsultant.tsx` contains zero `fetch`, `apiRequest`,
  `axios` or `localStorage` calls;
- **a "New Consultation" button that wipes 20 state slots** (`:2482`) with no save prompt.

Only **three** server touch-points exist in the whole `components/arch/` tree:

| Caller | Endpoint | Server reality | Effect |
|---|---|---|---|
| `CostEstimator.tsx:166` | `GET /api/market-rates` | `server/api/src/index.ts:128` → `routes/other.ts:24-30` returns 3 **FX rates** `{type,rate,change}` | Shape mismatch — see V1-ENG-016 |
| `ContractGenerator.tsx:175` | `POST /api/arch-contracts` | `index.ts:132` → `other.ts:118` falls through to `res.json({success:true})` | **Nothing is written**; UI shows "saved" |
| `ConsultantValidationEngine.tsx:162,314,574,587,630` | `/api/diwan/projects*` | `index.ts:131` → `other.ts:32-34` returns `[]` for GET `/`; sub-paths `/projects/:code`, `/lock`, `/resolve`, `/consultant` have **no route at all** | 404 / TypeError |

Consequence: **the entire engineering platform is client-only.** The only artefacts a user can take away are
(a) the ZIP produced by `DrawingEngine`, (b) `window.print()` output from four contract/title-block
components, and (c) clipboard copies. Under BRIEF2's rule ("real formulas but no persistence and no server
route is L3 PARTIAL_FLOW at most") **only `DrawingEngine` reaches L4**, because its export demonstrably
writes a file.

### Two adjacent pages

- `src/pages/ConsultantDashboard.tsx` (463 lines, `/consultant-dashboard`, `App.tsx:245`) — a 5-pillar
  approval matrix (arch / str / mep / elec_elv / life_safety) over **`MOCK_PROJECTS` declared in-file**
  (`:48`, filtered at `:387-393`). No API, no DB. **L1.**
- `src/pages/ProjectVerify.tsx` (235 lines, `/verify/:code`, `App.tsx:228`) — public QR-landing page that
  calls `GET /api/diwan/verify/:code` (`:59`), which does not exist. **L1, BROKEN.**

---

## Engine-by-engine inventory

`Real computation?` = arithmetic derived from the user's inputs (**not** an assertion of engineering
correctness — see worklist). `Export?` = a user-obtainable artefact. `Persist?` = anything surviving reload.

| # | Engine | File (`v1/src/components/arch/`) | Lines | Produces | Inputs | Real computation? | Export? | Persist? | Depth | V2 counterpart |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | AcademicSpecialtyEngine | `AcademicSpecialtyEngine.tsx` | 618 | Auditorium sightline/rake + RT60, lab fume-hood & acid-neutralisation BOQ, library STC zoning | `projectType`, `hasLabs`, `hasAuditorium` + local rows/spacing state (`:284`) | yes — `calcSightlines` (`:284`), Sabine RT60 | no | no | **L3** | none found |
| 2 | BankingSecurityEngine | `BankingSecurityEngine.tsx` | 617 | `BankingSecurityQuantities` — vault/CIT/panic-room/data-centre BOQ across 8 security levels | `buildableArea`, `floors`, `perimeter`, `securityLevel 1-8`, 5 option flags (`:13-23`) | yes — `calcBankingSecurity(input)` (`:178`) | no | no | **L3** | none found |
| 3 | BilingualPDFContract | `BilingualPDFContract.tsx` | 411 | Side-by-side AR/EN contract, print-ready via CSS `@media print` | `packages`, `priceSummary`, `landGeo`, `projectType` | no (layout only) | yes — `window.print()` (`:67`) | no | **L3** | none found |
| 4 | BIMViewer | `BIMViewer.tsx` | 356 | Interactive three.js BIM model from parsed DXF (walls extruded, floors planes, columns cylinders, discipline colour legend, orbit/zoom) | `ParsedDXF`, `LayerMapping`, `floorHeight` (`:14-17`) | yes — `lineLength`/`polylineArea`/`unitToMeter` | no | no | **L3** | none found (V2 has no three.js) |
| 5 | BOQEngine | `BOQEngine.tsx` | 683 | Sectioned Bill of Quantities + flat `BOQQuantities` (concrete, rebar t, flooring, plaster, paint, tiles, block count, ceilings, cladding, doors, windows) | `BOQInput` (`:9-28`) incl. floor system / soil / foundation | yes — `calculateBOQ(input)` (`:577`), `REBAR_RATIO` from `StructuralConfigurator` | no | no | **L3** | none found |
| 6 | Building3DVisualizer | `Building3DVisualizer.tsx` | 259 | Live 3D massing (`@react-three/fiber` + `drei`, orbit + environment) reflecting facade/window/roof/floor choices | `floors`, `width`, `depth`, 4 design keys (`ArchitecturalConsultant.tsx:1901-1909`) | yes — geometry from inputs | no | no | **L3** | none found |
| 7 | CADGeometryEngine | `CADGeometryEngine.ts` | 401 | Master layer matrix (disciplines A-/S-/E-/M-/H-/F-), `runCADTakeoff` (`:183`), `deriveBOQFromCAD` (`:339`), wastage factors (`:377`) | `ParsedDXF` + `LayerMapping` | yes — linear/area/count accumulation per standard layer (`:250-306`) | no | **localStorage** layer profiles (`:135,139,148`) | **L3** | `cur/src/lib/cad/*` is export-only, has no take-off |
| 8 | CADParser | `CADParser.ts` | 302 | `ParsedDXF` — layers, entities (LINE/LWPOLYLINE/POLYLINE/ARC/CIRCLE/INSERT/HATCH), blocks, drawing unit | ASCII DXF text | yes — hand-written parser, no dependency (`:1-4`) | no | no | **L3** | none found (V2 depends on `dxf-parser`? no — V2 has no DXF *reader*) |
| 9 | CADProcessor | `CADProcessor.tsx` | 462 | 4-step wizard: upload → layer map → take-off table → 3D BIM; emits `(CADTakeoffSummary, CADDerivedBOQ)` to the wizard (`:123`) | `.dxf` file (`ACCEPTED=".dxf,.dwg"` `:38`; DWG refused with an export-to-DXF hint `:62-68`) | yes | **no** (no download in the component) | via `LayerMapper` profiles only | **L3** | none found |
| 10 | ClimateGeoEngine | `ClimateGeoEngine.tsx` | 787 | City → applicable building-code set; ASHRAE climate zone → auto-spec matrix; multi-discipline compliance score | `city`, `countryCode`, `projectType` from `LocationContext` (`ArchitecturalConsultant.tsx:2277-2281`) | yes — `complianceScore` (`:360`) over a code database | no | no | **L3** | none found |
| 11 | ConsultantTitleBlockPDF | `ConsultantTitleBlockPDF.tsx` | 275 | Official title block with 5 discipline stamps + **QR code** to `/verify/<projectCode>` | `projectTitle`, `projectType`, `ownerName`, optional `stamps` | QR generated with `qrcode` (`:57`) | yes — scoped `window.print()` (`:66-79`) | no | **L3** | none found |
| 12 | ConsultantValidationEngine | `ConsultantValidationEngine.tsx` | 886 | "ديوان الهندسة" — create project → consultant reviews (5 pillars) → conflict resolution → owner lock | `boqData`, `gcpData`, `projectTitle`, `ownerName` | no | print (`:382`) | **intended** server, none exists | **L1** | none found |
| 13 | ContractGenerator | `ContractGenerator.tsx` | 494 | Owner–contractor legal contract with per-sector dynamic clauses + BOQ/MEP annexes | `ContractData` (`:14+`) incl. `boqQuantities`, `mepQuantities` | no | yes — print (`:208`); "Save" (`:172-190`) is a **false success** | no | **L3** | none found |
| 14 | ContractPackager | `ContractPackager.tsx` | 401 | Splits BOQ into discipline packages, each with contractor form (Name/CR/Tax ID/Rep/Phone) + subtotal + per-package print | `priceSummary`, `projectType` | yes — package subtotals (`:173`) | print per package | no | **L3** | none found |
| 15 | CostEstimator | `CostEstimator.tsx` | 355 | Cost table by category + 10 % contingency + 8 % engineering fees | `BOQQuantities` + `GET /api/market-rates` | **blocked** — see V1-ENG-016 | no | no | **L1** | none found |
| 16 | **DrawingEngine** | `DrawingEngine.tsx` | 778 | **ZIP containing `Architectural_Set.dxf`, `MEP_Set.dxf`, `Structural_Set.dxf` and `Official_Contract.pdf`**, plus a 4-tab SVG preview (arch / MEP / struct / sections) and a layer-rename modal | land N/S/E/W, floors, answers, BOQ/MEP quantities, finishes, soil, foundation | yes — full plan generation | **yes** — JSZip → Blob → anchor download (`:287,607-613`), jsPDF contract (`:350-602`) | no | **L4** | none found |
| 17 | DXFWriter | `DXFWriter.ts` | 137 | ASCII DXF emitter + `ARCH_LAYERS`/`MEP_LAYERS`/`STRUCT_LAYERS`/`ALL_LAYERS` + ACI colour CSS | `DrawShape[]`, `DXFLayer[]` | yes | via `DrawingEngine` | no | **L3** | `cur/src/lib/cad/dxf-generator.ts` (different layer model) |
| 18 | FireSafetyEngine | `FireSafetyEngine.tsx` | 534 | `FireSafetyQuantities` — fire rating hours, rated partition m², sprinklers, detectors, hydrants, egress widths | `projectType`, `buildableArea`, `floors`, `perimeter`, `isHotelOccupancy` (`:11-18`) | yes — `calculateFireSafety(input)` (`:193`) | no | no | **L3** | none found |
| 19 | GlobalConfiguratorPanel | `GlobalConfiguratorPanel.tsx` | 761 | Spec matrix (default / expert / custom) per item with `costDelta` SAR/m², `timeDelta` days, ROI note and `ibc_violation` flag; emits `GCPOutput` | `buildableArea`, `projectType` | yes — deltas per selection (`:78-130`) | no | no | **L3** | none found |
| 20 | HighRiseStructuralEngine | `HighRiseStructuralEngine.tsx` | 417 | Wind pressure, core sizing, TMD assessment, lateral system recommendation | `floors` (≥10 gate), `windExposureCategory`, `coreType`, `hasTMD`, `countryCode` | yes — `wind` (`:80`), `core` (`:98`) | no | no | **L3** | none found |
| 21 | IndustrialEngine | `IndustrialEngine.tsx` | 377 | Truss sizing, crane specs, hazmat zoning, floor-load and clear-height checks | `activityType`, `craneLoad`, `clearHeight`, `hazmat`, `span`, `floorLoad` | yes — `truss` (`:71`), `crane_specs` (`:86`) | no | no | **L3** | none found |
| 22 | InstitutionalSovereignEngine | `InstitutionalSovereignEngine.tsx` | 669 | Acoustic STC room table, security layers / man-trap / blast zones, N+1 redundancy checklist | `projectType`, `isSovereign` | **no** — three static tables (`:34,113,194`), zero arithmetic | no | no | **L1** | none found |
| 23 | K12SchoolEngine | `K12SchoolEngine.tsx` | 359 | Egress width, daylighting factor, child-safety checks, lab provisions | `level`, `capacity`, `floors`, `labType` | yes — `egress` (`:72`), `daylighting` (`:81`) | no | no | **L3** | none found |
| 24 | LandGeometryModule | `LandGeometryModule.tsx` | 592 | Editable 4-boundary table **or** N/E corner table, canvas polygon sketch, **shoelace** area | boundary lengths + neighbours, or corner northings/eastings, or manual area | yes — `shoelaceArea` (`:50-58,127,262`) | no | no | **L3** | partial: `cur/src/components/tools/AreaCalculator.tsx` (shapes only, no bearings/neighbours) |
| 25 | LandscapeIrrigationEngine | `LandscapeIrrigationEngine.tsx` | 376 | Irrigation demand from PET climate table (10 countries), hardscape/softscape split, drip vs sprinkler BOQ | `parkType`, `greenRatio`, `totalAreaM2`, `countryCode` | yes — `irrigation` (`:87`), `hardscape` (`:104`), `CLIMATE_PET` (`:18`) | no | no | **L3** | none found |
| 26 | LayerMapper | `LayerMapper.tsx` | 338 | Visual mapping table between the master layer matrix and the user's DXF layer names, with named save/load profiles | `ParsedDXF.rawLayerNames` | no | no | **localStorage** (`UserPreferences`, `CADGeometryEngine:135`) | **L2** | `cur/src/components/cad/CadLayersPanel.tsx` (display only, no mapping) |
| 27 | MedicalGradeMEPEngine | `MedicalGradeMEPEngine.tsx` | 569 | ASHRAE 170 pressure zoning, HEPA H11/H13/H14 grades, ACH tables for 35+ room types, Pb shielding, medical-gas manifolds | `projectType`, `specialty`, `hasRadiology` | **no** — filtered lookup tables only (`:241,246`), zero arithmetic | no | no | **L1** | none found |
| 28 | MedSpecialtyEngine | `MedSpecialtyEngine.tsx` | 711 | `MedSpecialtyQuantities` — hospital (beds/OR/radiology) **or** hotel (star rating) specialty BOQ | `projectType`, `isHotelOccupancy`, `starRating`, `bedCategory`, `specialty`, `orCategory`, `radiologyType` | yes — `calculateMedSpecialty(input)` (`:301`) | no | no | **L3** | none found |
| 29 | MEPEngine | `MEPEngine.tsx` | 315 | `MEPQuantities` — 25 fields (supply/soil/waste/vent pipe m, drains, valves, pumps, 4 cable gauges, conduit, 3 breaker ratings, gang boxes, HVAC tons, duct m², bathrooms, kitchens, AC units) | `buildableArea`, `floors`, `floorHeight`, `projectType`, `perimeter`; `MEP_PROFILE` per sector (`:57`) | yes — `calculateMEP(input)` (`:169`) | no | no | **L3** | none found |
| 30 | MEPLayoutEngine | `MEPLayoutEngine.ts` | 123 | MEP shape generation per room rect (routes cable/pipe/duct runs into `DrawShape[]`) | `RoomRect[]`, building box, floor index | yes | via `DrawingEngine` ZIP | no | **L3** | none found |
| 31 | MosqueEngine | `MosqueEngine.tsx` | 395 | Qibla bearing per country (`QIBLA_DEGREES` `:17`), dome geometry, wudu-facility count, minaret sizing, acoustic zoning | `capacity`, `qiblaAlignment`, `minaret`, `hasDome`, `floors`, `city` | yes — `dome` (`:89`), `wudu` (`:101`) | no | no | **L3** | none found |
| 32 | PriceManager | `PriceManager.tsx` | 432 | `PriceSummary` — priced BOQ lines with wastage factors, opening deduction, inline rate editing, 10 % contingency + 8 % eng. fees + **15 % VAT (KSA hard-coded)** (`:38-46`) | `boqQuantities`, `cadDerived`, `floorHeight`; 24 `DEFAULT_RATES` in SAR (`:57-83`) | yes | no | **localStorage** price overrides (`UserPreferences:99-104`) | **L3** | none found |
| 33 | ProjectEnginePassport | `ProjectEnginePassport.tsx` | 309 | "Engineering passport" — which engines fired for this project, with tier badges | 10 boolean/string flags derived from `answers` (`ArchitecturalConsultant.tsx:2266-2275`) | no — static `ENGINES` list (`:59`) | no | no | **L1** | none found |
| 34 | ResidentialFloorPlanDXF | `ResidentialFloorPlanDXF.ts` | 905 | `generateFloorPlan` / `generateGenericPlan` / `shapesToDXF` — room layout, walls, doors, windows, stairs, core, per-floor stacking | land W/D, floors, bedrooms, luxury level, project nature, layer names | yes — the largest geometry generator in the tree | via `DrawingEngine` ZIP | no | **L3** | none found |
| 35 | RetailMallEngine | `RetailMallEngine.tsx` | 827 | Anchor/GLA ratios, atrium & skylight smoke control, F&B ratio services, loading-dock count, escalator/travelator provisioning | `cType`, `anchorCount`, `gfa`, `atriumType`, `skylightType`, `fnbRatio`, `loadingDock`, `floors` | yes (18 arithmetic sites) | no | no | **L3** | none found |
| 36 | SectionElevationEngine | `SectionElevationEngine.ts` | 235 | `generateSectionAA` / `generateSectionBB` / `generateStructuralPlan` → `DrawShape[]` | building box, floor heights, slab/foundation thickness, core position | yes | via `DrawingEngine` ZIP | no | **L3** | none found |
| 37 | SeismicProtectionEngine | `SeismicProtectionEngine.tsx` | 610 | Seismic zone from city, base-isolation BOQ (LRB/FP/HDR), flexible MEP joint counts, post-seismic N+1 | `city`, `countryCode`, `projectType`, `floors` | yes — `seismicLevel` (`:249`) over a zone database | no | no | **L3** | none found |
| 38 | SovereignEthicsShield | `SovereignEthicsShield.tsx` | 138 | Ethics banner: permitted building classes vs excluded (military/weapons) classes, 3 pillars | none | no — three static arrays (`:8,21,31`) | no | no | **L1** | none found |
| 39 | StructuralConfigurator | `StructuralConfigurator.tsx` | 355 | Floor-system / soil / foundation selector + `REBAR_RATIO` constants consumed by `BOQEngine` | user selection | no (selector); auto-foundation rule lives in the page (`ArchitecturalConsultant.tsx:95-99`) | no | no | **L1** | none found |
| 40 | UserPreferences | `UserPreferences.ts` | 202 | Persisted prefs: layer profiles, material brands, price overrides, wastage/opening toggles, currency + EN→AR layer-name auto-translation dictionary (`:107+`) | — | no | no | **localStorage** `akar_user_prefs_v2` (`:63,66,76`) | **L2** | none found |

**Depth distribution across the 40 engines: L5 = 0 · L4 = 1 · L3 = 30 · L2 = 2 · L1 = 7 · L0 = 0.**

Header comment at `UserPreferences.ts:3` claims "syncs to API for authenticated users" — **no such sync
exists in the file**. Treat as INTENDED ONLY.

---

## Tools.tsx inventory

`src/pages/Tools.tsx` (2 034 lines) is public (`src/App.tsx:243`) and exposes **exactly 6 tools** as a
6-column `TabsList` (`:1884-1897`), default tab `deed` (`:1882`). Tab labels at `:1849-1862`.

| Tab | Tool | Implementation | Produces | Export | Server | Depth |
|---|---|---|---|---|---|---|
| `deed` | **Map My Land / حدد أرضك** | `MapMyDeed` lazy (`:26`), wrapped in `AuthGate` (`:1916`) | see next section | clipboard + share links | none (100 % browser) | **L3** |
| `coord` | **Coordinate Converter** | `CoordConverter()` (`:285-878`) | DD ⇄ DMS ⇄ DDM ⇄ UTM, multi-row table | clipboard only — `copyInputTable` (`:336`), `copyOutputTable` (`:351`), per-row copy (`:837,854`), Google Maps deep-link (`:841,858`) | none | **L3** |
| `area` | **Area Calculator** | `AreaCalculator()` (`:996`) | triangle (Heron `:882`), polygon (shoelace `:888`), irregular from sides+angles (`:905`), regular polygon (`:922`); canvas sketch with side labels (`:930`) | none | none | **L3** |
| `dxf` | **Points → DXF** | `PointsToDxf()` (`:1727`) | DXF from `.txt/.csv/.xyz/.dat/.pts/.ne0` (`:1784`), parser `:1624`, emitter `:1645` | **yes** — Blob download (`:1765-1775`) | none | **L4** |
| `pdf` | **File → Word** | `FileToWordConverter()` (`:1280`) | .docx from PDF/image | attempts download (`:1310-1315`) | `POST /api/tools/file-to-word` (`:1302`) — **route does not exist** | **L1** |
| `calc` | **Scientific Calculator** | `ScientificCalculator()` (`:1376`) | deg/rad modes, keyboard support (`:1477`) | none | none | **L3** |

Sub-capabilities worth separate rows (all in `CoordConverter`):
- **Croquis bulk paste** — `parsePastedCoords` (`:189`) auto-detects a leading label token and splits on
  `[\t,;| ]`, for all four coordinate types.
- **Split two-column paste** — `parseSplitPaste` (`:241`) accepts a Northings column and an Eastings column
  pasted separately (the green/orange fields, help text at `:598`), with Arabic decimal comma `،` folding.
- **Per-row error surfacing** (`PRow.error`, `:105`) and **auto UTM zone** (`autoZone` `:35`).

**Dead code in `Tools.tsx`:** `MapContainer`, `TileLayer`, `Polygon`, `CircleMarker`, `Popup`, `useMap`
and `leaflet/dist/leaflet.css` are imported at `:23-24` and **never used** in the file (the map lives inside
`MapMyDeed`). Leaflet CSS is therefore loaded on the tools page for nothing.

---

## Land / OCR / CAD service stack

| Service | Lines | What it does | Importers | Depth |
|---|---|---|---|---|
| `services/landAnalysisService.ts` | 639 | Orchestrator `analyzeLandDocument` (`:525`): file-type detect → PDF text (pdf.js) → **OCR fallback when <30 chars, first 3 pages at scale 2** (`:550-573`) → image OCR + ONNX → `extractLandDetails` (`:126`) → `extractCoordinateTables` (`:389`) | `MapMyDeed.tsx:170` (dynamic) | **L3** |
| `services/ocrProcessor.ts` | 157 | Singleton tesseract worker `ara+eng` with PSM 6 + `preserve_interword_spaces` + `textord_heavy_nr` (`:20-34`); `cleanOCRText` does Arabic letter normalisation, **blind letter→digit repair** (`O/Q→0`, `l/I/|→1`, `S→5`, `B→8`, `Z→2`, `G→6`), decimal-separator repair and intra-number space removal (`:89-131`) | `landAnalysisService` | **L3** |
| `services/imagePreprocessor.ts` | 289 | grayscale (`:21`) → **Otsu** (`:31`) *or* **adaptive** threshold (`:61-68`, default adaptive `:253`) → 3×3 **median filter** (`:101`) → contrast stretch (`:128`) → **skew detection** (`:145`) + `rotateCanvas` (`:198`) → **`ensureMinResolution` upscale** (`:223`) | `ocrProcessor.ts:2` | **L3** |
| `services/pdfProcessor.ts` | 61 | `extractTextFromPDF` (all pages, `:12`) and `renderPDFPageToImage` (canvas → PNG blob, `:38`) via `pdfjs-dist` with a bundled worker URL (`:2-4`) | `landAnalysisService` | **L3** |
| `services/onnxProcessor.ts` | 158 | `analyzeImageWithONNX` — 224×224 tensor → `InferenceSession` on `/models/diagram-analysis.onnx` (`:37-40`) to classify walls/doors/windows/rooms/dimensions | `landAnalysisService:593` (failure swallowed as "non-critical" `:594`) | **L1** — **no `.onnx` file exists anywhere in the V1 tree and there is no `public/` directory**; the session always throws "نموذج التحليل غير متوفر حالياً" |
| `services/dxfExportService.ts` | 234 | `DXFExporter` class + `downloadRoomsDXF(rooms, fileName)` (`:231`) — room-polygon DXF export | **none — orphan** | **L2** |
| `services/auditService.ts` | 61 | Audit trail for `created / modified / exported_dxf / exported_pdf / compliance_check / settings_changed / deleted` into `localStorage['akarmpro-audit-log']` (`:11,31`) | **none — orphan** | **L2** |
| `components/MapMyDeed.tsx` | 594 | See table below | `Tools.tsx:26` | **L3** |

**Caveat (honest):** the V1 snapshot at `/home/claude/work/v1` has no `public/` directory even though
`package.json` declares `msw.workerDirectory: ["public"]`. The ONNX model *may* have shipped in a `public/`
that is absent from this snapshot. Marked **UNKNOWN** in row V1-FML-016 — a later pass must check the
deployed bundle, not this tree.

### V1 engineering dependencies actually declared (`v1/package.json`)

`three@0.183` + `@react-three/fiber@8` + `@react-three/drei@9` · `dxf-parser@1.1.2` (declared; **the code
uses its own `CADParser`, not this package**) · `jspdf@4.2.1` · `jszip@3.10.1` · `pdf-lib@1.17.1`
(declared; **no importer found in `src/`**) · `pdfjs-dist@5.7` · `proj4@2.20.6` · `onnxruntime-web@1.26` ·
`tesseract.js@7` · `leaflet@1.9` + `react-leaflet@4.2` · `qrcode@1.5.4` · `html2canvas@1.4.1` (declared;
no arch importer) · `archiver@7` (server-side) · **no `@turf/*`**, **no `docx`**.

V2 (`cur/package.json`) has `proj4@2.21`, `tesseract.js@7`, `leaflet@1.9` + `react-leaflet@5`,
`@turf/turf@7.4`, `docx@9.7`, `qrcode.react@4.2` — and **no `three`, no `onnxruntime-web`, no `jszip`, no
`jspdf`, no `pdf-lib`, no `dxf-parser`**. The 3D, DXF-reading, ZIP-packaging and PDF-generation
capabilities have **no library basis in V2 at all**.

---