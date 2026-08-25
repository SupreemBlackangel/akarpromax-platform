# AKARPROMAX — PROPOSED IMPLEMENTATION ORDER

**Phase 0.5 deliverable.** Derived from the dependency analysis in `FEATURE-DEPENDENCY-MAP.md`,
the **2,563** capability rows in `FEATURE-PARITY-MATRIX.csv`, the entries in
`REGRESSION-RISK-REGISTER.md`, the Web↔Office findings in `WEB-OFFICE-CONTRACT-MATRIX.md`,
and the runtime-verified defects in `docs/release/PHASE-0-BASELINE.md`.

**This order is a proposal, not an instruction to start work.** Phase 0.5 is read-only and ends here.

> **Revised 19 Aug 2026 — see Part II at the end of this document.** Round 2 added the actual V1 source and
> the actual desktop C# source. The phase *sequence* below survives unchanged; the *content* and *scale* of
> several phases change, and **objection #5 in §1 is withdrawn** (the desktop does contain a V2 office API
> client — see the note inline).

---

## 1. Why the starting hypothesis is not the recommended order

The starting hypothesis supplied with this phase was:

> 1 Release Gate + Emergency Security · 2 Identity + Ownership + Permissions · 3 Messaging Core +
> Notifications · 4 FindMyLand + Land + AMRS · 5 Properties · 6 Services Marketplace ·
> 7 Organizations + Offices + Professionals + Ranks · 8 Auctions · 9 Office Contract Unification ·
> 10 Storage + Media + Realtime · 11 Auth + Email + OAuth · 12 Ads + News + Geo + Currency +
> Localization · 13 Community + Knowledge + Vehicles + Tools · 14 Admin + Analytics + Monitoring ·
> 15 Cross-feature UAT · 16 Staging + Final Release Certification

The dependency evidence contradicts it in five specific places. Each is a *dependency* objection,
not a preference:

| # | Hypothesis says | Evidence says | Consequence if the hypothesis order is followed |
|---|---|---|---|
| **1** | Schema is not a phase at all | 75 tables exist only because a request-time `ensure*` path creates them; **54 Drizzle-declared tables have no creator anywhere** — including `properties`, which 83 files consume; **8 table names are declared twice, incompatibly** (`ad_campaigns`, `ad_creatives`, `service_requests`, `service_offers`, `service_categories`, `service_reviews`, `auction_bids`, `auction_terms`); one table (`office_media_upload_sessions`) is written by code and defined nowhere; migrations `0004`–`0010` are missing from `drizzle-pg/` while `meta/_journal.json` still lists them | Every domain phase from 2 onward would be validated against a database whose shape is undefined and environment-dependent. Work would be redone. |
| **2** | Identity is phase 2, but "ownership" is treated as one thing | There are **four uncorrelated identity key spaces**: `users.id` (uuid, used by Properties/Auctions/Community/Knowledge/Companies), the lower-cased **e-mail string** used as the user id across Services/Office/Ads (`lib/services/identity.ts:28`), `sponsor_access.email`, and `office_device_credentials.sponsor_id` | The three P0 messaging authorization defects cannot be fixed correctly in phase 3, because "is this the same person?" is not answerable. Any fix would be re-worked after the key spaces are unified. |
| **3** | Storage is phase 10 | There is **no working server-side byte storage at all**. `lib/runtime-assets.ts:1-5` imports `cloudflare:workers` unconditionally and throws under Node. Seven domains depend on it — ad creatives, property media, office media, service attachments, provider documents, land documents, profile/company logos — and today all of them either store a client-supplied URL string, fabricate a URL and discard the bytes, or throw | Properties (phase 5), Services (phase 6), Ads (phase 12) and Office (phase 9) would each be "completed" without the media capability their features actually require, then all four re-opened in phase 10. |
| **4** | Geo is phase 12 | Geo is shared infrastructure with in-edges from Properties, Services matching, Ads targeting, Radar, Offices, Companies and Professionals; **four incompatible geo models coexist** and the `geo-schema` tables have no creator | Phases 4–8 would each build against a different geo model. |
| **5** ⚠️ **WITHDRAWN in Round 2 — see Part II §1 item 2. The desktop *does* contain a purpose-built V2 office API client (`Services/OfficeApiClient.cs`). The objection below was based on binary-only evidence and is superseded; the phase still moves, but for reconciliation reasons, not evidence reasons.** | Office contract unification is phase 9, after Messaging/Properties | ~~The two applications **share no API surface at all**: every endpoint the shipped desktop calls (`/api/program/sync`, `/api/program/subscription-status`, `/api/desktop`, `/ads/placement/desktop_portal_bottom_banner`) is absent from the web, and every route under `app/api/office/v1/**` has no desktop caller. 9 of 15 desktop→web calls are `WEB ROUTE MISSING`. The desktop C# source is **not available** | The contract cannot be unified in phase 9 or any other phase until the C# source is attached. Scheduling it as a build phase would produce a second speculative contract on top of the first. It must be scheduled as *evidence gathering first*, then design.~~ |

Two parts of the hypothesis are strongly confirmed and kept: **Release Gate + Emergency Security
first**, and **Cross-feature UAT → Staging → Certification last**.

---

## 2. The recommended order

Numbering is deliberately continuous with the hypothesis so the two can be compared, but the
content of each phase is derived, not inherited.

### Phase 1 — Release Gate, Emergency Security, and Deployability

**Why first:** there is currently no trustworthy way to detect a regression, and there are three live
data-exposure defects. Restoring a single feature before the gate exists risks losing another
silently — which is precisely what this audit exists to prevent.

| Work | Evidence |
|---|---|
| Replace the hard-coded 19-file `test` script with directory discovery so all 79 test files run; decouple `npm test` from `npm run build` | `package.json:13`; Phase 0 §5 |
| Fix the 6 stale-expectation test files (**fix the test, not the product**): `tests/amrs/db-schema.test.ts`, `tests/rendered-html.test.mjs`, `tests/command-center.test.mjs`, `tests/public-shell.test.mjs`, `tests/organizations-hardening-f1.test.mjs`, `tests/e2e/production-runtime.test.mjs` | Phase 0 §5.3 |
| Close **P0-1** `/api/messages/[id]` has no participant check; **P0-2** cross-provider message leak; **P0-3** `startMessageThread` has no authorization — each with the regression test written first | Phase 0 N7/N8/N9; `REGRESSION-RISK-REGISTER.md` RR-17/RR-18 |
| Close the roles-API privilege escalation: `app/api/admin/roles/route.ts:19` and `roles/assign/route.ts:9,26` gate on `getSession()` alone | `ADMIN` rows in the registry |
| Make deployment work: reconcile `package.json` `start` with `next.config.js` `output: 'standalone'`; add the `.next/static` + `public` copy step; stop copying `.env` into the artifact | Phase 0 N1/N2/N3 |
| Re-run the Phase 0 baseline on a machine with database egress and Google-Fonts egress to close the two UNVERIFIED items | Phase 0 §0, P1-12 |

**Exit criteria:** `npm test` green over all discoverable tests · a documented production command that
boots and serves CSS · the three messaging authorization defects have failing-then-passing regression
tests · no secret in the build artifact.

**Forbidden regressions:** none yet — this phase adds the mechanism that makes "forbidden regression"
enforceable.

---

### Phase 2 — Schema Truth and the Data-Access Layer

**Why here:** Tier 0 of the dependency analysis. Every domain edge terminates in
`lib/runtime-db.ts` or `lib/db/index.ts`, and those two layers currently disagree about table shape,
id type, SQL dialect and identity key.

| Work | Evidence |
|---|---|
| Decide the single source of schema truth — migrations or `ensure*` — and make the other a no-op | 75 ensure-only tables; 54 creator-less Drizzle tables |
| Resolve the 8 duplicate table-name declarations | `lib/ad-schema.ts` vs `lib/db/schemas/advertising-schema.ts`; `lib/services-schema.ts` vs `lib/db/schemas/services-schema.ts`; the two auction declarations |
| Restore migrations `0004`–`0010` from the snapshot trees (`ref/akarpromax-source`, `ref/akarpromax-properties-current`) or regenerate and re-baseline. **`0004_add_new_tables.sql` is the only DDL anywhere for `forum_*`, `knowledge_items`, `news_ticker_items`** | `REFERENCE-SOURCES.md` §6.5 |
| Move DDL out of the request path into an explicit idempotent migration step; revoke DDL privileges from the application role | Phase 0 N18 / P0-6 |
| Fix `drizzle.config.ts` — it omits 6 live schema files and includes an abandoned one, so `db:generate` cannot reproduce the live schema and would drop the auction hardening tables | Phase 0 N20 |
| Choose one data-access layer; retire the parallel ones behind it | 5 parallel layers |
| Add a short DB connect timeout (failures currently surface after 30 s) | Phase 0 N23 |

**Exit criteria:** a fresh database built only from migrations passes the full test suite · no
`CREATE TABLE` executes during a user request · `db:generate` reproduces the live schema ·
`REGRESSION-RISK-REGISTER.md` RR-31 (ensure-only tables lost during migration) has a passing guard test.

---

### Phase 3 — Identity, Ownership Key Space, Permissions, Auth & OAuth

**Why here (moved up from hypothesis phases 2 + 11):** ownership is the precondition for every
authorization fix, and OAuth cannot be corrected before the key space is settled — a Google login
must produce the *same* identity as a password login.

| Work | Evidence |
|---|---|
| Unify the four identity key spaces onto one canonical key; provide a mapping for the e-mail-keyed services/office/ads data | `lib/services/identity.ts:28` and its 22 hand-rolled repair UPDATEs at `:52-73` |
| Make role/permission changes actually take effect: the admin users screen writes `sponsor_access` while permissions resolve from `users.role` | `lib/identity-auth.ts:98-102`; `app/api/advertiser-access/route.ts:101-113` |
| Fix `scripts/seed-auth-admin.ts:34-49` (never sets `status='active'`, so the seeded super-admin cannot log in) — **there is currently no working path to an admin account** | registry AUTH-043 |
| Fix OAuth: absolute redirect base (`new URL("/", "/")` throws), add `state`, boot-time credential validation, document `NEXT_PUBLIC_BASE_URL` | Phase 0 N4/N5/N6 |
| Make onboarding persist what it collects (`app/onboarding/page.tsx:43-48` posts an empty body) and add a profile-edit endpoint (none exists for name/phone/avatar) | registry AUTH-017, PROF-002/003 |
| Add organization creation (no UI anywhere POSTs `/api/amrs/organizations`) | registry AUTH-007/008 |
| Stop returning draft/rejected/suspended provider profiles with phone and e-mail | registry PROF-012 |

**Exit criteria:** one canonical identity per human across web + services + office + ads · role grants
change effective permissions · an admin account can be created and can log in · OAuth success and
error paths both return correct responses with `state` verified.

---

### Phase 4 — Shared Infrastructure: Storage, Geo, Notifications transport, Realtime

**Why here (moved up from hypothesis phases 10 and 12):** seven domains block on storage, seven on
geo. Building any of them first guarantees rework.

| Work | Evidence |
|---|---|
| Server-side object storage that works on Node — guard/replace `lib/runtime-assets.ts` the way `lib/pg-runtime.ts:22-31` already guards the DB | Phase 0 N17 / P1-3 |
| Move user-authored data off in-memory `Map`s: `lib/land/saved-land.ts:3`, `lib/land/quote.ts:3`; add the missing session check at `app/api/land/route.ts:34,57` | infra fragment 1.3 |
| Consolidate the four geo models onto one; the `geo-schema` tables need a creator | infra fragment 2.1 |
| Consolidate the two rate limiters and the two caches onto shared state | infra fragment 1.4 |
| Give realtime a publisher — `DbRealtimeTransport.publish` has **zero callers**, so the SSE stream is permanently empty | Phase 0 N16 |
| Point the admin audit console at the trail that is actually written (`audit_events` read vs `audit_logs` written) | registry ADMIN rows |

**Exit criteria:** an uploaded file can be stored and served on Node · one geo model · a published
realtime event reaches a subscribed client · no user-authored data lives in process memory.

---

### Phase 5 — Messaging Core and Notifications

**Why here (hypothesis phase 3, deferred by two):** the P0 *security* holes are closed in Phase 1;
the *consolidation* of three parallel messaging systems requires the unified identity key (Phase 3),
real attachment storage (Phase 4) and a realtime publisher (Phase 4).

| Work | Evidence |
|---|---|
| Choose the canonical messaging surface and consolidate three families onto it **without losing either side's capabilities** — attachments, archive and per-participant read state exist only in the Drizzle family; the context enum, validation and the 4,000-char cap only in the raw-SQL family | `RESTORE-OR-MERGE-LIST.md` §E; `REGRESSION-RISK-REGISTER.md` RR-15/RR-16 |
| Create the messaging tables — `message_threads`, `message_participants`, `messages`, `message_attachments` are created by **no migration** | registry MSG rows |
| Property conversations: derive the owner/office/company participant and notify them (today the participant list is empty, nobody is told, and `listInbox` hides the thread) | Phase 0 N10 |
| Fix the client contracts: `StartThreadButton` reads snake_case off a camelCase response → `?open=undefined%3Aundefined`; `app/messages/page.tsx:26` reads a key the API never returns; unvalidated `recipientId` | Phase 0 N11/N12/N25 |
| Wire the messaging entry points that render a button with no handler (`/offices/[id]:47`, `/companies/[id]:47`, `/providers/[id]:409`) | registry MSG rows |
| Notifications: only 7 of 16 declared event types ever fire; `dispatchOfficeNotification`, `upsertNotificationRule` and `processOutbox` have zero callers; the notifications page reads `n.read` while the API returns `is_read` | registry NOTIF rows |
| **Rewrite `tests/messages-contract.test.mjs:81-83`**, which currently codifies the cross-provider shared room as expected behaviour | RR-18 |

**Exit criteria:** per-provider conversation isolation proven by test · every context has exactly one
implementation · every declared notification event either fires or is explicitly recorded as
deferred · attachments round-trip through real storage.

---

### Phase 6 — Properties, Ownership Resolution and Land Persistence

| Work | Evidence |
|---|---|
| `properties` and its 7 sibling tables need a creator | infra 2.2 |
| Make the public list show real listings — `app/properties/page.tsx:83` reads `data.properties`, the API returns `{success,data,pagination}`, so the page always falls back to `src/data/demo-properties.ts` | registry PROP rows |
| `/dashboard/properties` must send `mine=1` — today "my properties" lists everyone's approved listings and hides the user's own drafts | `hooks/useProperties.ts:26-36` |
| Resolve every property to a responsible user/office/company for editing, messaging and notifications; stop trusting `officeId` from the request body | `app/api/properties/[id]/route.ts:110-115,246-251`; `app/api/properties/route.ts:169` |
| Wire publication: `POST /api/properties/[id]/submit` has zero callers and nothing calls `/api/admin/properties/[id]/review` — listings sit in `pending_review` with no queue anywhere | registry PROP/ADMIN rows |
| Property image upload (there is none — media is a raw URL text field) | depends on Phase 4 storage |
| Land persistence, land sharing and the saved-land store | Phase 4 |

**Exit criteria:** a property created in the UI reaches the public list · its owner can be resolved
and messaged and notified · an admin can approve it · images upload and render.

---

### Phase 7 — FindMyLand, Land Intelligence, AMRS and Surveyor Discovery

**Why after Properties (hypothesis had it before):** surveyor discovery depends on the organization
directory and on geo radius, both of which land in Phases 4 and 6; and the FindMyLand restore work is
parser work that must not be attempted while the storage and identity layers are still moving.

| Work | Evidence |
|---|---|
| Restore the FindMyLand UI capabilities lost when `/tools/find-my-land` became a 5-line redirect: DXF/KML/KMZ/CSV/TXT input, manual coordinate paste, add-point-on-map, **KML download**, perimeter output, share link + QR — all still supported server-side by `app/api/land/analyze/route.ts`, which no UI calls | `RESTORE-OR-MERGE-LIST.md` A.5 |
| **Merge**, do not resurrect, the old LandMapper parser behaviours into `lib/land/intelligence/strategy.ts`: Arabic labelled point rows (`نقطة` — current matches only `نقطه`), header-less generic 3-column UTM rows, accumulate-from-all-patterns instead of first-match-wins | `RESTORE-OR-MERGE-LIST.md` §B.1; RR-01…RR-06 |
| **Preserve** the current engine's genuine improvements: zone inference, constraint-verified OCR repair, geodesic area, coordinate-order protection | `RESTORE-OR-MERGE-LIST.md` §D |
| Arabic coordinate column headers — never supported in **any** version; this is new work, not a restore | Phase 0 A3 |
| Make surveyor discovery return candidates: `lib/amrs/directory.ts:117` hard-codes `isVerified:false`, the candidate mapper omits `location`, and "surveyor" is matched as a literal substring of the organization name | registry SURV rows |
| Give the survey-request/RFQ flow a session, persistence, a surveyor inbox and accept/decline | registry SURV rows |
| Decide AMRS's status (product vs library) and either wire it into live flows or record it as a library | `RESTORE-OR-MERGE-LIST.md` §F |
| Put `tests/land/**`, `tests/geo/**`, `tests/amrs/**` into the release gate | Phase 0 §6 |

**Exit criteria:** every capability in the FindMyLand old-vs-current diff is either present or has a
recorded product-owner deferral · the two legacy land endpoints are either retained deliberately or
their capabilities are merged before they are touched · surveyor discovery returns candidates.

---

### Phase 8 — Services Marketplace

| Work | Evidence |
|---|---|
| **Let customers post a service request again** — session role `user` maps to `viewer`, whose permission list is `[TOOLS_USE]`, so the 8-step wizard ends in 403 | `app/api/service-requests/route.ts:68`; `lib/auth/identity-map.ts:5`; `src/constants/roles.ts:43` |
| Restore the three endpoints turned into proxies pointing at routes that were never built: `/api/services/orders/[id]`, `/api/services/orders/[id]/review`, `/api/services/disputes` — **disputes are lost end-to-end**, with service layer, table, UI page and counter all still present | `RESTORE-OR-MERGE-LIST.md` A.3 |
| Restore service bookmarks (`/api/service-bookmarks` does not exist; `app/dashboard/services/favorites/page.tsx:22` calls it) | same |
| Make the admin console load — `getAdminMarketplaceSnapshot` selects `o.agreed_price` and `o.scheduled_at`, columns no schema creates | `lib/services/marketplace.ts:1783` |
| Reconcile the two API generations onto one canonical surface | `RESTORE-OR-MERGE-LIST.md` §E |
| Resolve the third, unmigrated Drizzle model live in `app/api/services/route.ts` and `app/api/service-analytics/route.ts` | registry SVC rows |
| Settle the radius policy (engine caps at 10 km, the profile writer still defaults providers to 50 km) — **product-owner decision** | `lib/services/match-score.ts:62,99-100,111`; `marketplace.ts:116,140` |
| **Preserve** the 8-step wizard, the match-score model and the state machine | `RESTORE-OR-MERGE-LIST.md` §D |

**Exit criteria:** a customer can post a request, receive offers from several providers, hold private
per-provider conversations, accept an offer, complete an order, leave a review, and open a dispute.

---

### Phase 9 — Organizations, Offices, Companies, Professionals, Ranks & Reputation

| Work | Evidence |
|---|---|
| Organization creation and governance through the UI (onboarding posts an empty body; the "add company/office" CTAs point at it) | registry ORG rows |
| Rebuild `app/admin/organizations` and `app/admin/professionals` (both present in `ref/akarpromax-source`, absent now) | `RESTORE-OR-MERGE-LIST.md` A.2 |
| Add `organizations.review` / `verification.review` to `src/constants/permissions.ts` so the review APIs are grantable | registry ORG rows |
| Fix the case mismatch that empties the public directory (`country=om` sent lowercase against uppercase-stored codes) | `useServicesPage.ts:41`; `app/api/amrs/organizations/route.ts:98` |
| Restore `GET /api/professionals` (deleted from the tree, still advertised by `app/api/docs/route.ts:7`) | registry PRO-001 |
| Make ranks have product effect — `lib/amrs/directory.ts:43-65` ignores the `reputationLevel`, `classification`, `isVerified` filters and hardcodes the outputs at `:106-119,126-160` | registry RANK rows |
| Reviews: eligibility, verified-transaction relationship, moderation, aggregate reputation | registry REV rows |

---

### Phase 10 — Advertising, News, Currency, Localization

| Work | Evidence |
|---|---|
| Choose one advertising engine; the two declare incompatible `ad_campaigns`/`ad_creatives` schemas for the same table names | `RESTORE-OR-MERGE-LIST.md` §E |
| Restore the `sponsor_events` writer — five current read sites still join it, so every advertiser impression/click number in admin is permanently 0 | registry ADS-051 |
| Adopt `/api/ads/match-batch` **without losing the 30 s server-side cache** the singular route has | Phase 0 F1/F2; RR-27 |
| Re-wire the self-serve ad request (`AdRequestDialog`, `FloatingAdSlotActions`, `requestable` slots) and widen the placement whitelist beyond `side_left`/`side_right` | `RESTORE-OR-MERGE-LIST.md` A.4 |
| Restore the public country-based sponsor identity and logo fallback | registry ADS-009 |
| Decide ordered creative playlists (deliberately replaced by one-creative-per-delivery) — **product-owner decision** | `RESTORE-OR-MERGE-LIST.md` §F |
| News: post to `/api/news/telemetry` so eligibility, per-user display limits and analytics stop being inert; reconcile three news data models and two `NewsTicker` components; build `/api/advertising/news-ticker`, which the admin page already calls | registry NEWS rows |
| Currency: 12-currency requirement is real (`AGENTS.md:205`, `scripts/seed-currency-data.ts:5-16`) but `/api/currencies` has zero callers, the creating migration is missing, a dead 23-currency list survives in `src/data/locations.ts:29-53`, and three price formatters disagree | registry CUR rows |
| Localization: **dynamic admin translation without redeploy is PARTIAL** — the DB pipeline works, but the flagship pages render `copy: translations[locale]`, a compile-time import; only 21 of 53 hook consumers call `t(`. Complete it, invalidate the 60 s cache on save, and keep the static dictionary as a fallback | registry I18N rows |

---

### Phase 11 — Auctions, Community, Knowledge, Vehicles, Tools

| Work | Evidence |
|---|---|
| Wire auction contract signing (the route is fully built with a per-party signature ledger and has zero UI callers) and repair the CP1256-mangled Arabic in the printable contract — **do not reformat those literals before recording the intended text** | registry AUC rows; RR-63 |
| Break the auction-organizer chicken-and-egg: the grant screen populates its picker from an endpoint that already requires a grant | `auction-organizers-client.tsx:69`; `lib/auctions/policy.ts:131-143` |
| Fix community topic creation (posts `categoryId:''` into a `uuid` FK → 500 on every submission) | `app/community/new/page.tsx:31` |
| Knowledge and Vehicles: complete the UI↔API↔DB wiring; **Vehicles stays in scope unless the product owner removes it** | registry KNOW/VEH rows |
| Restore the tools permission gate (`ToolsGate.tsx` has no importer — tools are now fully public) and reconcile the duplicate tool set at `app/tools/[id]` | registry TOOL rows |

---

### Phase 12 — Office Contract: Evidence, then Design, then Build

**This phase cannot start as a build phase.** It has three ordered sub-stages:

**12a — Evidence.** Attach the AkarApp_LIVE C# source and establish whether a server for
`akar-promax.com/api/program/*` exists (`REFERENCE-SOURCES.md` §6.1, §6.2). Until then, 9 of 15
desktop→web calls remain `WEB ROUTE MISSING` and 2 remain `UNKNOWN`, and any web-side work is
speculative.

**12b — Design.** Reconcile the two authentication models (web device-token pairing vs desktop
HWID + offline licence), the two "radar" products (web geospatial scan vs desktop requirement
matching with a tolerance percentage), the two coordinate systems (desktop UTM vs web WGS84), and the
two property stores (`property_listings` vs `properties`). Decide whether office-synced listings
surface publicly — **product-owner decision**.

**12c — Build.** Repair `/api/office/v1/media` (four independent defects, every request currently
400s and uploaded bytes are discarded), give `syncPull` a real web→desktop direction, restore the
eight columns and the NOT-NULL backfill lost from `pickPropertyColumns`, fix the `features_*`
`String()` corruption and the OMR→SAR currency flip, scope `retry`/dead-letter per tenant, and fix
the missing parentheses in the `realtime.ts:58-62` `OR` clause that would leak events across sponsors.

Fix in the same stage: the office dashboard pages call device-token routes through `apiFetch`, which
sends no `Authorization` header — every one returns 401.

---

### Phase 13 — Admin, Analytics, Monitoring

| Work | Evidence |
|---|---|
| Build the admin UI for backends that are complete and unreachable: verifications, organization review, property review, the whole AMRS admin | registry ADMIN rows |
| Remove the 25 admin/supervisor routes advertised by `src/config/sidebar.ts` that do not exist, or build them — **each is a product-owner call, not a cleanup** | registry ADMIN rows |
| Give the 4 `/admin/advertising` pages the APIs they call and an auth gate (they currently have neither) | registry ADMIN/ADS rows |
| Send the `action` field from report resolution so suspension/hiding/deactivation can actually happen | `lib/services/marketplace.ts:1713-1730` |
| Replace the hardcoded Command Center System Health panel with the real probe that already exists and has zero consumers | `lib/command-center/service.ts:385-395`; `lib/health/health.service.ts` |
| Restore `/admin/settings` plan CRUD (263 lines → a 19-line empty state) — gated on the Phase 14 commercial decision | `app/admin/settings-admin-client.tsx:13-16` |

---

### Phase 14 — Commercial Layer (decision-gated)

Nothing in this phase is built until the product owner answers `RESTORE-OR-MERGE-LIST.md` §F.
The seven advertiser back-office subsystems (plans, subscriptions, contracts, documents, invoices,
payments, activity) still have their tables created on every boot, their permissions granted in the
roles UI, and their complete 838-line API preserved in `hist/old-tag/app/api/sponsor-*`.
**`seedSponsorPlans()` still inserts four priced tiers (0/99/299/999 per month) into the live
database on boot** — that alone requires a decision before any release.

The desktop's licence/subscription system (`SubscriptionService`, `OfflineLicenseService`,
`AKAR_OFFLINE_LICENSE_2026`) is a live commercial capability with **no web counterpart**, and the
desktop's offline licence defeats the web-side revoke at `app/api/office-links/route.ts:51`.

---

### Phase 15 — Cross-feature UAT

Executed against the Master Feature Registry, not against a hand-written checklist. Every row whose
`current_status` is `FULL` at the end of Phase 14 must be demonstrated. Every row still `PARTIAL`,
`BROKEN`, `REGRESSION` or `UNKNOWN` is a release blocker or an explicitly signed deferral.

---

### Phase 16 — Staging and Final Release Certification

No certification may reuse or cite any of the six historical certification documents; Phase 0
established that all of them certify a runtime that no longer exists. Certification must be produced
fresh, from executed behaviour.

---

## 3. Order at a glance

| Recommended | Phase | Hypothesis said |
|---|---|---|
| 1 | Release Gate, Emergency Security, Deployability | 1 ✔ |
| **2** | **Schema Truth and Data-Access Layer** | *(absent)* |
| 3 | Identity, Ownership, Permissions, Auth, OAuth | 2 + **11** |
| **4** | **Shared Infrastructure — Storage, Geo, Notifications transport, Realtime** | **10** + part of 12 |
| 5 | Messaging Core + Notifications | 3 |
| 6 | Properties, Ownership Resolution, Land Persistence | 5 |
| 7 | FindMyLand, Land Intelligence, AMRS, Surveyors | 4 |
| 8 | Services Marketplace | 6 |
| 9 | Organizations, Offices, Companies, Professionals, Ranks, Reviews | 7 |
| 10 | Advertising, News, Currency, Localization | 12 |
| 11 | Auctions, Community, Knowledge, Vehicles, Tools | 8 + 13 |
| 12 | Office Contract — evidence → design → build | 9 |
| 13 | Admin, Analytics, Monitoring | 14 |
| **14** | **Commercial Layer (decision-gated)** | *(absent)* |
| 15 | Cross-feature UAT | 15 ✔ |
| 16 | Staging + Final Certification | 16 ✔ |

---

## 4. Feature-preservation gates — required for every phase above

No phase may be marked PASS on the strength of a successful build or an HTTP 200. Every phase
carries the same seven-part gate.

| Gate element | What it means concretely |
|---|---|
| **Pre-change feature baseline** | Before the first commit of the phase, snapshot the phase's rows from `FEATURE-PARITY-MATRIX.csv` (their `current_status` values) into `docs/product-audit/baselines/PHASE-<n>-BEFORE.csv`. |
| **Regression tests** | Every capability in the phase whose row carries `regression_risk = High`, and every entry in `REGRESSION-RISK-REGISTER.md` assigned to the phase, has a test **written and failing before the change**. |
| **New tests** | Every newly restored or newly built capability ships with a test that would fail if the capability were removed. |
| **Expected retained features** | The explicit list of registry IDs that must still be `FULL` after the phase. Taken from `RESTORE-OR-MERGE-LIST.md` §D for the phase's domains. |
| **Expected improvements** | The explicit list of registry IDs whose status must move (e.g. `MISSING → FULL`, `BROKEN → FULL`). A phase that improves nothing on this list has not met its objective. |
| **Forbidden regressions** | The explicit list of registry IDs that may not move backwards, plus a blanket rule: no row anywhere in the matrix may move from `FULL` to anything else without a recorded product-owner approval. |
| **Exit criteria** | The phase's own exit criteria above, **plus**: full test suite green; the before/after CSV diff attached to the phase result; every status change explained; zero rows moved to `UNKNOWN`. |

### Enforcement mechanism

1. `docs/product-audit/baselines/PHASE-<n>-BEFORE.csv` and `PHASE-<n>-AFTER.csv` are both committed.
2. A diff script compares them and fails the phase if any row regressed without an approval marker.
3. The phase result document lists: retained, improved, newly restored, still deferred, and the
   product-owner approvals relied upon.
4. `npm test` must, by the end of Phase 1, represent the complete intended release suite; from
   Phase 2 onward "the tests pass" and "the release gate passed" mean the same thing.

---

## 5. What this order deliberately does not do

- It does not schedule the removal of any legacy code. Phase 0 inventoried the dead runtime residue;
  `REGRESSION-RISK-REGISTER.md` RR-64…RR-70 record that several "dead" files
  (`AdRequestDialog.tsx`, `FloatingAdSlotActions.tsx`, `ToolsGate.tsx`,
  `organization-profile-page.tsx`, `LandMapper.tsx`, `professional.matcher.ts`) are the **only
  surviving specification** of a capability. Removal is scheduled *after* the capability is merged,
  never before.
- It does not decide any commercial question. Those are escalated in `RESTORE-OR-MERGE-LIST.md` §F.
- It does not assume the desktop contract can be designed from the current evidence. It cannot.


---

# PART II — REVISION AFTER ROUND 2 (19 August 2026)

Part I was derived from the V2 lineage only. Round 2 added the actual V1 source and the actual desktop C#
source. **The phase sequence in Part I survives the new evidence** — but four things change: the *content* of
several phases, the *justification* for Phase 12, one new phase-0 gate, and the scale.

## 1. What Round 2 changes

| # | Change | Evidence |
|---|---|---|
| **1** | **The preservation obligation roughly triples.** Part I planned around 44 old-V2 capabilities that were FULL and are now MISSING. Round 2 finds **204 capabilities that V1 shipped at depth L4/L5 and are now MISSING, BROKEN or REGRESSED**, and 408 at L4/L3/PARTIAL. Every phase's "expected retained features" list grows accordingly. | `FEATURE-PARITY-MATRIX.csv`, 2,563 rows |
| **2** | **Phase 12 (Office contract) is no longer evidence-blocked.** Part I said it could not start until the C# source was attached. It is attached. `Services/OfficeApiClient.cs` is a purpose-built V2 office client — the Round-1 conclusion that "the two applications share no API surface" is **disproved and withdrawn**. Phase 12a becomes *reconciliation*, not *acquisition*. | `WEB-OFFICE-CONTRACT-MATRIX.md` §2 |
| **3** | **Two defects are now certain to be one-line fixes with outsized value.** V2 pairing fails because the desktop serialises PascalCase and the route reads `body.code`; and it would still fail because V2 returns `{device:{…}}` while the desktop deserialises flat. Neither side has a contract test. This moves a piece of Phase 12 into Phase 1 as a *test*, not a fix. | contract matrix rows D-02, D-03 |
| **4** | **Messaging gains a second, larger scope.** Part I planned to consolidate three V2 families. There are **five** implementations once V1's two servers are counted, and the unified core must additionally carry realtime, presence, typing, read receipts, edit/delete, voice, block and a moderation **access log** — all of which V1 had and V2 never did. | `frag2/12`, 97 rows |
| **5** | **Advertising gains a business layer.** Part I planned to unify two engines. Round 2 adds eight V1 business capabilities with no V2 counterpart — tier-as-product, the working self-serve funnel, approve-with-price and revenue, the ticker channel, hero playlists, creative-shape governance, the office ad product with trigger semantics and caps, and screen-time as a sellable unit. | `frag2/13`, 120 rows |
| **6** | **A whole domain appears that Part I did not plan for: office finance.** 178 desktop capabilities, of which treasury, ledgers, installments, post-dated checks, commissions, vouchers, receipts and tax/fee types have **no counterpart in either web generation**. This is a product-scope decision, not an engineering one. | `frag2/15` |
| **7** | **Three V1 subsystems are production-grade and absent from V2**: suspicious-relist/anti-manipulation with auto-suspend and proof deadlines; city-match supply alerts delivered in-app *and* by e-mail; office reputation computed from real auction outcomes on an hourly schedule. | `frag2/17`, `frag2/18` |

## 2. Revised phase content

Only the deltas are listed; everything in Part I still applies.

**Phase 1 — Release Gate, Emergency Security, Deployability.** *Add:* a pairing contract test that asserts
the exact JSON casing both sides use (it fails today, and it is the cheapest possible proof that the Office
contract is real). *Add:* the security defects Round 2 found in V1 patterns that were carried into V2 —
verify none of them survived.

**Phase 2 — Schema Truth.** *Add:* decide the fate of V1's 63 Prisma models. They are the only complete
data model AkarProMax ever had for marketers, tenders, auctions-intelligence, suppliers, partners, licensing
and support. They are a **specification input** to the V2 schema, not a migration target.

**Phase 3 — Identity.** *Add:* the desktop's `ROLE → PERMISSION → ENTITY SCOPE` model is the only working
implementation of scoped grants in the whole ecosystem; the target `IDENTITY_ACCESS` kernel must be able to
express a branch-scoped grant or it regresses against the desktop. *Add:* the five-way separation —
membership, rank, verification, subscription, account status — becomes a schema requirement, not a guideline.

**Phase 4 — Shared Infrastructure.** *Add:* `GEO_INTELLIGENCE` must reconcile **six** parallel city
vocabularies, two of which have drifted by 6 governorates and 28 cities, plus the desktop's UTM coordinates
against the web's WGS84.

**Phase 5 — Messaging.** *Add:* realtime, presence, typing, read receipts, edit/delete, voice notes,
block/unblock and the moderation access log — all carried from V1. *Add:* `AUCTION`, `TENDER` and `SUPPORT`
contexts to the taxonomy. *Restate:* isolation must be a property of the **thread key**, not the guard.

**Phase 6 — Properties.** *Add:* image upload (V1 had multer + MIME whitelist + disk write; V2 accepts a URL
string), the listing presentation layer (gallery, map, share, mobile contact bar), office discovery of open
buyer requests, and the property finance toolkit with the server amortisation engine.

**Phase 7 — Land / FindMyLand.** *Add:* seven MapMyDeed capabilities with no V2 equivalent — image deskew,
adaptive thresholding, min-resolution upscale, multi-parcel table splitting, the raw-source-text column,
PDF preview, and the per-point share payload. *Confirm:* the three V1 parser behaviours already recorded as
V2 regressions are present in V1 source and are therefore restorable, not speculative.

**Phase 8 — Services.** *Add:* the third delivery mode. The target model is
**Standard Request/RFQ · Urgent Dispatch · Tender/Competitive Bid**, with V2 supplying the architecture and
V1 supplying the dispatch and tender capability. Urgent Dispatch is a complete product design over an empty
data model in V1 — the largest single new build in the plan.

**Phase 9 — Organizations.** *Add:* the marketer/brokerage subsystem (6 V1 models, versioned code of
conduct, dual-signature contracts, auto-renewal, commission ledger, rank ladder — with zero server routes)
is the largest scope decision in this domain and is gated on a product-owner call. *Add:* suppliers.

**Phase 10 — Advertising / News / Currency / Localization.** *Add:* the eight V1 business capabilities.
*Add:* the real i18n picture — 5,192 inline `isRTL ?` ternaries across 167 of 275 V1 components versus 137
`t()` calls in 17 files. Any localization estimate based on the translation bundle is wrong by an order of
magnitude.

**Phase 11 — Auctions and content.** *Add:* the 30 V1 auction capabilities V2 lacks — auto-bid, anti-sniping,
cron closure, participant registry, deposits, suspicious-relist detection, sale-proof verification, the ban
cascade, office rating, early warnings, bidder recommendations, the realtime bid namespace, and the public
stats/history/FAQ/terms pages. Six of these were previously recorded as `OLD SOURCE REQUIRED`; the source now
exists and they are re-classified `RESTORE`.

**Phase 12 — Office contract.** *Replaces* Part I's 12a/12b/12c. New shape:
- **12a — Reconcile** (no longer "acquire"): fix the pairing casing and response shape on both sides; decide
  whether the desktop's `/api/desktop/*` family or V2's `/api/office/v1/*` family is canonical; wire the
  heartbeat that currently has no caller so a paired device's 90-day credential stops silently dying.
- **12b — Design**: one authentication model spanning HWID + licence + device token; one "radar" definition
  (the desktop's weighted requirement-matching engine and V2's geospatial scan are different products); one
  coordinate system; one property store.
- **12c — Build**: the media route, the real web→desktop sync direction, the lost sync columns, per-tenant
  retry scoping, and the realtime publisher.
- **12d — NEW: licensing and activation.** `LicenseService.GenerateKeyForHwid` is `SHA256(HWID + compiled
  salt)` — validator and generator are the same function and the generator UI ships behind a keystroke. This
  is a commercial-integrity problem, and it is a product-owner decision before it is an engineering task.

**Phase 13 — Admin.** *Add:* the five V1 admin consoles that govern nothing (Tickets, SEO, Lookups, Reports,
Settings are localStorage-only with zero consumers) are **product intent to be built**, not features to be
restored. *Add:* admin-edited legal text that never reaches users is a compliance item, not a cosmetic one.

**Phase 14 — Commercial.** *Add:* V1's licensing and subscription surface, the desktop's licence economy, and
the marketer commission model all land here. **Every licence purchase in V1 became a 30-day trial** and the
buyer identity and amount paid were discarded — a commercial-integrity decision is required before anything
in this phase is built.

## 3. Two new cross-cutting workstreams

**W1 — Engineering platform (parallel, independent).** V1 carries 40 engineering engines, of which 30 are at
depth L3, one at L4 and none at L5, with no persistence and three stub server contracts. A separate
Engineering archaeology pass must establish which formulas are real before any of it is scheduled. Its
worklist is in `frag2/20-v1-engineering.md`. Nothing in Phases 1–16 depends on it.

**W2 — V1 data-model harvest (parallel, documentation only).** Extract the 63 Prisma models as a
specification input for Phase 2. This is reading, not migrating.

## 4. The order itself — unchanged

Phases 1 → 16 as published in Part I. Round 2 changed what is *inside* the phases and how large they are; it
did not change what must come before what. The dependency argument is now stronger, not weaker: the nine
kernels in `AKARPROMAX-PRODUCT-CONSTITUTION.md` Article 8 and the graph in `FEATURE-DEPENDENCY-MAP.md`
Part II both derive the same sequence independently.
