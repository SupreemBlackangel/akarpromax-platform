# RESTORE-OR-MERGE LIST — AkarProMax Phase 0.5

**Status:** decision-support document. Nothing here is a deletion recommendation. No item in this
document is ever "obsolete", "unused" or "safe to drop"; every item is either restored, fixed,
merged, preserved, consolidated, or escalated to the product owner.

**Sources:** `out/docs/product-audit/FEATURE-PARITY-MATRIX.csv` (1,335 rows), the ten domain
fragments in `frag/`, and `out/docs/product-audit/RESTORE-OR-MERGE-LIST-raw.md`.
Trees referenced: `cur/` (current working tree), `hist/old-main` (2026-07-29),
`hist/old-tag` = tag `pre-architecture-refactor` (2026-08-05), `ref/akarpromax-source`
(snapshot 2026-08-08, referred to below as SNAP-SRC), `ref/AkarProMax_ChatGPT_Source_Review`
(2026-08-13, SNAP-CGPT), `ref/akarpromax-properties-current` (SNAP-PROP),
`ref/akarpromax-services-current`, `ref/akarpromax-auth-current`, `ref/akarpromax-auctions-current`,
`cur/AkarApp_LIVE` (desktop binary + `AkarDB.sqlite`, REFERENCE ONLY — no C# source),
`inv/dll_strings.txt`, `inv/dll_urls.txt`.

---

## Preamble — decision counts from the parity matrix

Counted over all 1,335 rows of `FEATURE-PARITY-MATRIX.csv` (decision values normalised: variants
such as `RESTORE (admin UI)`, `RESTORE/BUILD`, `RESTORE — product-owner decision required` are
folded into `RESTORE`; `KEEP (BETTER THAN OLD)` folds into `KEEP`).

| Parity decision | Rows | Where it lands in this document |
|---|---:|---|
| KEEP | 326 | D (forbidden-regression register) |
| KEEP + IMPROVE | 279 | D (forbidden-regression register) |
| **FIX REGRESSION** | **221** | **B** |
| **RESTORE** | **184** | **A** |
| NEW IMPROVEMENT | 134 | D |
| **MERGE INTO NEW SYSTEM** | **99** | **C** and **E** |
| **BLOCKED — product-owner decision required** | **34** | **F** |
| **OLD SOURCE REQUIRED** | **16** | **G** |
| RESTORE + MERGE (hybrid decision) | 5 | A and C |
| SUPERSEDED WITH FULL PARITY | 6 | D (with the parity condition stated) |
| Unclassified / column-shift rows in the CSV | 31 | noted in G.9 as a data-hygiene item |
| **Total** | **1,335** | |

Supporting distributions used to build section A:

| Dimension | Counts |
|---|---|
| `old_status` | MISSING 729 · FULL 280 · PARTIAL 129 · NOT APPLICABLE 39 · OLD SOURCE REQUIRED 32 · REGRESSION 20 · other 106 |
| `current_status` | FULL 310 · MISSING 216 · PARTIAL 113 · BROKEN 46 · BETTER THAN OLD 40 · REGRESSION 36 · STUB 28 · other 546 (incl. qualified strings) |
| `priority` | P0 324 · P1 488 · P2 406 · P3 91 · unparsed 26 |
| **old_status = FULL AND current_status = MISSING** | **44 rows** — every one of them is itemised in A.0 |

### The non-negotiable product rule

AkarProMax must preserve **all** useful capabilities that existed in any previous AkarProMax
version — web, desktop (AkarProMax Office / AkarApp v2.0), or admin — **plus** every improvement
made in the current version. A capability that shipped in an older version may have its code, its
API shape, its database and its UI replaced, but the *functional capability itself* may never
disappear silently: it must be preserved, or explicitly superseded by something demonstrably
equal-or-better, and the supersession must be written down. Nothing in this audit is ever closed by
declaring an old capability irrelevant. Where a capability cannot be verified because the old source
was not supplied (above all the AkarApp_LIVE C# source), it is parked in section G as
**OLD SOURCE REQUIRED**, not resolved. Where a capability is commercially ambiguous — billing,
licensing, quotas, radius policy — it is escalated in section F as a product-owner question with
options and consequences, never decided here.

### How to read every item

Each entry carries: **feature ID(s)** · a one-line statement of the capability · **old evidence**
(`path:line` in an old tree, or "none found") · **current evidence** (`path:line` in `cur/`) ·
and **what specifically must be restored / merged / fixed**. Priorities are the matrix priorities
(P0 highest). Within each domain, items are ordered P0 first.

---

# A. MUST RESTORE

Capabilities that demonstrably existed in an older AkarProMax version (git history, `old-main`,
`old-tag`, or a snapshot tree) or on the shipped desktop product, and that have **no equivalent in
the current tree**. Grouped by domain; P0 first inside each group.

## A.0 — Index: the 44 rows where old_status = FULL and current_status = MISSING

These are the hardest evidence in the whole audit: a capability verified as fully working in an old
tree, with nothing in `cur/` that does it. Every one is expanded in the sections below.

| Feature IDs | Capability | Section |
|---|---|---|
| ADMIN-054, ORG-026, ADS-015, COMM-LEG-001 | Advertiser subscription-plan catalogue | A.1.1 |
| COMM-LEG-005, ORG-027 | Advertiser subscription lifecycle | A.1.2 |
| ORG-024, ADS-016, COMM-LEG-013 | Advertiser contract register | A.1.3 |
| ORG-025, ADS-019, COMM-LEG-015 | Advertiser document vault | A.1.4 |
| ORG-028, ADS-017, COMM-LEG-008 | Advertiser invoice register | A.1.5 |
| ORG-029, ADS-018, COMM-LEG-011 | Advertiser payment register | A.1.6 |
| ORG-030, ADS-020, COMM-LEG-016 | Advertiser activity trail (read API) | A.1.7 |
| ADS-008, COMM-LEG-035, COMM-LEG-036 | Sponsor/advertiser logo upload + verification round-trip | A.1.8 |
| ADS-051 | Sponsor/advertiser impression + click event writer | A.1.9 |
| ADMIN-055 | Advertiser billing console (all six routes) | A.2.2 |
| ADMIN-036, ADS-022 | Advertiser banner-management page | A.2.3 |
| ADS-009 | Public country-based sponsor identity + logo fallback | A.4.2 |
| COMP-008 | Company records admin (approve/suspend/edit) | A.2.6 |
| PRO-001 | `GET /api/professionals` list endpoint | A.7.1 |
| ORG-014 | Organization business-identity fields (CR / tax number) | A.7.6 |
| ORG-022 | Per-organization analytics (impressions/clicks) | A.7.11 |
| AUTH-050 | Per-advertiser member invite / role-change surface | A.8.2 |
| RANK-027 | Advertiser plan tiers + subscription state as a rank input | A.8.9 |
| FML-005 | FindMyLand manual coordinate entry / paste | A.5.2 |
| FML-036 | FindMyLand file export (KML / DXF / CSV / PDF) | A.5.3 |
| FML-031 | FindMyLand perimeter output | A.5.4 |
| CUR-008 | Header currency chip | A.13.1 |
| COMM-LEG-032 | Commercial TypeScript domain model (zero importers) | A.1.10 |
| COMM-LEG-034 | Byte-identical old D1 commercial schema (`cur/db/schema.ts`) | A.1.10 |
| COMM-LEG-009, COMM-LEG-010, COMM-LEG-014 | Invoice tax split, invoice↔subscription/contract links, contract value+currency | A.1.3 / A.1.5 |

(The 44 CSV rows collapse to the 26 capability lines above because several matrix rows describe
sub-fields of one capability — e.g. `COMM-LEG-009` is the tax split *inside* the invoice register.)

---

## A.1 — Advertiser / sponsor commercial back-office (seven subsystems)

All seven tables are still created on every boot (`cur/lib/content-schema.ts:280-404`, MySQL mirror
`cur/lib/mysql-runtime.ts:486-591`), the TypeScript model still exists
(`cur/src/types/sponsor.ts:80-190`), the permissions are still granted in the roles UI
(`cur/src/constants/permissions.ts:15-17`, `cur/src/constants/roles.ts:97,106`) — but every API and
every screen is gone. This is the largest single block of lost capability in the audit.

### A.1.1 — Advertiser subscription plans · P0
- **IDs:** ADMIN-054 · ORG-026 · ADS-015 · COMM-LEG-001 / -002 / -003 / -004 · RANK-016 · RANK-027
- **Capability:** a priced plan catalogue (Free/Basic/Professional/Enterprise) with monthly and
  yearly price, currency, quota columns (`max_branches`, `max_users`, `max_properties`, `max_ads`),
  an Arabic feature-bullet list, a sort order, an active flag, and a public pricing read.
- **Old:** `hist/old-tag/app/api/sponsor-plans/route.ts:41-161` (GET was unauthenticated at `:41-53`
  — a public pricing endpoint); admin CRUD UI `hist/old-tag/app/admin/settings-admin-client.tsx:115-179,242-258`;
  DDL `hist/old-tag/db/schema.ts:357-379`.
- **Current:** table created `cur/lib/content-schema.ts:280-297` and **seeded with four priced tiers
  on every non-production boot** (`:517-541`, called at `:606`); still counted by
  `cur/app/api/admin/stats/route.ts:70`; no route (`app/api/sponsor-plans` does not exist);
  `/admin/settings` is a 19-line empty state (`cur/app/admin/settings-admin-client.tsx:13-16`).
- **Restore:** the plan CRUD API (list/create/update/toggle), the admin plan screen under
  `/admin/settings`, the public pricing read, and — separately — enforcement of the four quota
  columns at the advertiser write paths (`app/api/advertiser-branches`, `advertiser-users`,
  properties create, ads create). Quota enforcement has never existed in `cur` at all.

### A.1.2 — Advertiser subscriptions · P1
- **IDs:** ORG-027 · COMM-LEG-005 / -006 / -007
- **Capability:** per-advertiser subscription to a plan with `plan_id`, start/end dates, status
  lifecycle `trial → active → expired → cancelled → past_due`, `auto_renew` (default true) and
  `payment_method`.
- **Old:** `hist/old-tag/app/api/sponsor-subscriptions/route.ts:9,36-166`; DDL
  `hist/old-tag/db/schema.ts:381-401` (auto-renew `:389`, payment method `:390`).
- **Current:** table `cur/lib/content-schema.ts:299-314`; type `cur/src/types/sponsor.ts:96-110`;
  permission `ADVERTISER_SUBSCRIPTIONS_MANAGE` declared at `cur/src/constants/permissions.ts:16`
  and checked by **no route**. No API, no UI.
- **Restore:** the subscription lifecycle API and its admin surface, including the state machine and
  the auto-renew/payment-method fields, plus a link from the subscription to the plan quotas so
  A.1.1 enforcement has an input.

### A.1.3 — Advertiser contracts · P1
- **IDs:** ORG-024 · ADS-016 · COMM-LEG-013 / -014 · ADMIN-055
- **Capability:** numbered commercial contracts (`CT-XXXXXXXX`) with title, file URL, signed/start/end
  dates, monetary value + currency, and six statuses draft/sent/signed/active/expired/cancelled.
- **Old:** `hist/old-tag/app/api/sponsor-contracts/route.ts:8,14-72`; DDL `hist/old-tag/db/schema.ts:403-427`.
- **Current:** table `cur/lib/content-schema.ts:316-334` (value + currency at `:325-326`); type
  `cur/src/types/sponsor.ts:113-128`; permission `ADVERTISER_CONTRACTS_MANAGE`
  `cur/src/constants/permissions.ts:15` orphaned. `cur/app/api/contracts/route.ts:7-29` is a
  **different feature** (property sale/lease/auction contracts, `route.ts:24`) and must not be
  confused with this one.
- **Restore:** the advertiser contract register API + admin screen, with contract numbering, the
  six-status machine, and the value/currency fields preserved.

### A.1.4 — Advertiser documents · P2
- **IDs:** ORG-025 · ADS-019 · COMM-LEG-015
- **Capability:** typed document vault per advertiser (CR certificate, tax certificate, etc.) with
  `file_name`, `file_url`, `file_size`, `mime_type`, `type`, `uploaded_by`, and DELETE.
- **Old:** `hist/old-tag/app/api/sponsor-documents/route.ts:11-50`; DDL `hist/old-tag/db/schema.ts:429-447`.
- **Current:** table `cur/lib/content-schema.ts:336-349`; type `cur/src/types/sponsor.ts:130-141`;
  no route, no UI.
- **Restore:** upload + list + typed-delete API and the advertiser-detail documents tab. Note the
  dependency on A.1.8 (asset storage) — Phase 0 records R2 broken under Node.

### A.1.5 — Advertiser invoices · P1
- **IDs:** ORG-028 · ADS-017 · COMM-LEG-008 / -009 / -010 · ADMIN-055
- **Capability:** invoice register with auto numbering (`INV-XXXXXXXX`), amount / `tax_amount` /
  `total_amount` split, due date, `paid_at`, file URL, statuses draft/sent/paid/overdue/cancelled,
  and FKs to the subscription and the contract being billed.
- **Old:** `hist/old-tag/app/api/sponsor-invoices/route.ts:8,27-68` (tax at `:35`); DDL
  `hist/old-tag/db/schema.ts:472-497` (links at `:477-478`).
- **Current:** table `cur/lib/content-schema.ts:369-388` (tax split `:375-376`, links `:373-374`);
  type `cur/src/types/sponsor.ts:159-176`; no route, no UI.
- **Restore:** invoice CRUD + numbering + the tax split + the subscription/contract traceability
  links, and an admin invoices tab. The tax split is the only tax-aware money model on the web side.

### A.1.6 — Advertiser payments · P1
- **IDs:** ORG-029 · ADS-018 · COMM-LEG-011 / -012
- **Capability:** payment register against a subscription or an invoice, with amount, method,
  `reference_number` and statuses pending/completed/failed/refunded.
- **Old:** `hist/old-tag/app/api/sponsor-payments/route.ts:8,27-66`; DDL `hist/old-tag/db/schema.ts:449-470`.
- **Current:** table `cur/lib/content-schema.ts:351-367` (status column `:361`); type
  `cur/src/types/sponsor.ts:143-158`; permission `ADVERTISER_PAYMENTS_MANAGE`
  `cur/src/constants/permissions.ts:17` orphaned.
- **Restore:** payment CRUD + the refund state + the reference-number field, and the reconciliation
  view that pairs payments to invoices.

### A.1.7 — Advertiser activity trail (read API) · P2
- **IDs:** ORG-030 · ADS-020 · COMM-LEG-016 · AMRS-059
- **Capability:** queryable per-advertiser action log with `old_values` / `new_values`, IP and
  user-agent — the commercial audit trail.
- **Old:** `hist/old-tag/app/api/sponsor-activity/route.ts:10-22`; DDL `hist/old-tag/db/schema.ts:499-518`.
- **Current:** table `cur/lib/content-schema.ts:390-404`; the **writer still exists with zero
  callers** (`cur/lib/services/audit.ts:33-59`); the AMRS replacement is an in-memory array that is
  never persisted and has no caller outside its own file (`cur/lib/amrs/security.ts:137-167`).
- **Restore:** the read endpoint, wire the surviving writer back into the advertiser mutation paths,
  and surface it on the advertiser detail page. See also E.6 (four audit systems).

### A.1.8 — Sponsor / advertiser logo upload · P1
- **IDs:** ADS-008 · COMM-LEG-035 · COMM-LEG-036 · PROF-015
- **Capability:** real binary logo upload to R2 with magic-byte content sniffing, a 4 MB cap, a
  deterministic key layout, and a **post-upload verification fetch** that re-requested the stored URL
  and asserted `content-type: image/*` before persisting — so a broken logo could never be saved.
- **Old:** `hist/old-tag/app/api/sponsor-assets/route.ts:1-171`; client verification round-trip
  `hist/old-tag/app/admin/sponsors/sponsor-admin-client.tsx:197-241` (assertion at `:219-222`);
  commits `292ef87`, `383b3e8`, `4383e08`, `ae4443f`, `39836db`.
- **Current:** **no** `/api/sponsor-assets` or `/api/advertiser-assets` route in `cur/app/api`; the
  admin form regressed to a free-text URL input (`cur/app/admin/advertisers/advertiser-admin-client.tsx:201,357`);
  `logo_url` / `cover_url` on `organizations` (`cur/lib/db/schema.ts:108-109`) are editable strings
  with no writer (`cur/lib/amrs/workspace-profile-api.ts:9`).
- **Restore:** the upload route (magic-byte validation, size cap, key layout), the verification
  round-trip, and an uploader control in the advertiser and organization profile editors. Blocked on
  the Phase-0 storage defect (`cur/lib/runtime-assets.ts:2` imports `cloudflare:workers`).

### A.1.9 — Sponsor / advertiser impression + click event writer · P1
- **IDs:** ADS-051 · COMM-LEG-020 · ANLY-008 · ORG-022
- **Capability:** `POST /api/sponsor-events` recording impressions and clicks per sponsor, country and
  placement — the billing-relevant exposure counter behind CPM/CPC.
- **Old:** `hist/old-tag/app/api/sponsor-events/route.ts:6-43`; also
  `hist/old-main/app/api/sponsor-events/route.ts`; DDL `hist/old-tag/db/schema.ts:155-169`.
- **Current:** **no route in `cur`**, while the table is still created (`cur/lib/content-schema.ts`)
  and still JOINed by five read sites — `cur/app/api/advertisers/route.ts:44-45,47`,
  `cur/app/api/admin/analytics/route.ts:32,49`, `cur/app/api/admin/stats/route.ts:49,76,80` — and
  rendered as advertiser impression/click/CTR columns
  (`cur/app/admin/advertisers/advertiser-admin-client.tsx:305,317-319`). Every one of those numbers
  is permanently zero.
- **Restore:** the event writer (or a documented redirect of those five readers onto `ad_events`),
  so that advertiser reporting stops displaying fabricated zeros.

### A.1.10 — The two intact commercial restore sources · P0/P1 (preserve, do not touch)
- **IDs:** COMM-LEG-032 (types) · COMM-LEG-034 (schema)
- **Capability:** `cur/src/types/sponsor.ts:80-190` is the complete TypeScript model of the commercial
  system (`SponsorPlanType`, `SponsorSubscription`, `SponsorContract`, `SponsorDocument`,
  `SponsorInvoice`, `SponsorPayment`) with **zero importers**; `cur/db/schema.ts` is
  **byte-identical** to `hist/old-tag/db/schema.ts` (all 25 tables including every commercial table)
  and also has zero importers.
- **Old:** `hist/old-tag/src/types/sponsor.ts` (191 lines, added in `4c13c3e`); `hist/old-tag/db/schema.ts`.
- **Current:** as above.
- **Restore action:** these two files are the cleanest restore source for A.1.1–A.1.7. They must be
  preserved untouched until sections F.1–F.7 are answered, and then used as the contract for the
  rebuilt APIs rather than re-derived from scratch.

### A.1.11 — Orphaned commercial permissions · P1
- **IDs:** COMM-LEG-026
- **Capability:** `advertisers.manage_contracts`, `advertisers.manage_subscriptions`,
  `advertisers.manage_payments` — three permissions that are declared, granted to roles, and rendered
  as grantable checkboxes in the roles admin UI, but checked by no route.
- **Old:** `hist/old-tag/src/constants/permissions.ts` (as `SPONSORS_*`, enforced by six sponsor routes).
- **Current:** declared `cur/src/constants/permissions.ts:15-17`; granted `cur/src/constants/roles.ts:97,106`;
  labelled `cur/app/admin/roles-admin-client.tsx:36-38`; zero enforcement sites.
- **Restore:** re-attach each permission to the API restored in A.1.2 / A.1.3 / A.1.6. Until then the
  roles UI is promising an authority that does not exist.

---

## A.2 — Deleted admin surfaces

The current admin is a superset of the 2026-08-08 snapshot in some areas (it adds auction-organizers,
offer-types, verifications, organization and property review APIs); every loss below dates from the
`old-tag → snapshot` transition or is an API that shipped with no screen.

### A.2.1 — `/admin/settings` platform configuration · P0
- **IDs:** ADMIN-053 · ADMIN-054
- **Capability:** the settings console — in the old build a full subscription-plan CRUD
  (create/edit/toggle/delete; price monthly + yearly, currency, quota limits, feature list, sort
  order); intended to also cover currencies, commission, tax, SMTP, branding and feature flags.
- **Old:** `hist/old-tag/app/admin/settings-admin-client.tsx:1-263` (plan CRUD at `:115-179,242-258`).
- **Current:** `cur/app/admin/settings-admin-client.tsx:13-16` — 19 lines rendering the empty state
  "لا توجد أقسام إعدادات بعد"; the sidebar still links to it (`cur/app/admin/admin-sidebar.tsx:79`).
- **Restore:** the plan CRUD first (it is the only settings capability that provably existed), then
  decide the rest of the settings surface in F.

### A.2.2 — Advertiser billing console · P0
- **IDs:** ADMIN-055 (covers ORG-024…ORG-030)
- **Capability:** one admin area for contracts / invoices / payments / subscriptions / documents /
  activity of an advertiser.
- **Old:** the six routes at `hist/old-tag/app/api/sponsor-{contracts,invoices,payments,subscriptions,documents,activity}/route.ts`
  plus the sponsor detail screens `hist/old-tag/app/admin/sponsors/{[id],[id]/edit}`.
- **Current:** all six routes deleted; `/admin/advertisers` (11 files) preserves list/detail/edit/new/requests
  but has no billing tab at all.
- **Restore:** rebuild the six APIs (A.1.2–A.1.7) and attach them as tabs on the existing, working
  `/admin/advertisers/[id]` detail screen — do not build a second console.

### A.2.3 — Advertiser banner management page · P1
- **IDs:** ADMIN-036 · ADS-022
- **Capability:** a dedicated page for managing the advertiser banner rail.
- **Old:** `hist/old-tag/app/admin/sponsors/banner/page.tsx:1-13`.
- **Current:** no `cur/app/admin/advertisers/banner` (the 11 files under `app/admin/advertisers`
  contain no banner route).
- **Restore:** the banner route under the advertisers console, wired to whichever ad stack wins F.14.

### A.2.4 — `app/admin/organizations` · P0
- **IDs:** AMRS-013 · AMRS-047 · AMRS-048 · AMRS-049 · ADMIN-015 · ADMIN-028
- **Capability:** the organization admin console — dashboard stats (totals/active/pending, member
  counts, verification counts, reputation distribution), an organizations-by-status review queue, per
  record approve/reject/suspend/reactivate, and bulk actions with per-id error collection.
- **Old:** the directory `ref/akarpromax-source/app/admin/organizations` existed in the 2026-08-08
  snapshot; functionally the ancestor is the sponsor console
  `hist/old-tag/app/admin/sponsors/{page,new,[id],[id]/edit,requests,banner}` with
  `_components/SponsorRequestsView.tsx:1-111` and `_components/SponsorsListView.tsx`.
- **Current:** **the directory does not exist.** The backend is complete and correctly gated:
  `cur/lib/amrs/admin.ts:21-88` (stats), `:102-142` (bulk), `:144-165` (by status);
  `cur/app/api/amrs/admin/dashboard/route.ts:9-30,21-26,32+`;
  `cur/app/api/admin/organizations/[id]/review/route.ts:20-118` with the
  `CANNOT_REVIEW_OWN_ORGANIZATION` guard at `:55`. Zero UI consumers, not in the sidebar.
- **Restore:** the `app/admin/organizations` screens on top of the existing APIs. Also add
  `organizations.review` to `cur/src/constants/permissions.ts` — today it is not in the catalogue,
  so only `super_admin`/`*` can review and the permission cannot be granted from `/admin/roles`.

### A.2.5 — `app/admin/professionals` + `app/api/admin/professionals` · P0
- **IDs:** PRO-010
- **Capability:** approve / suspend / rank professionals from Admin.
- **Old:** both directories present in `ref/akarpromax-source` (`app/admin/professionals`,
  `app/api/admin/professionals`).
- **Current:** neither exists. There is no professional admin surface of any kind and no list API
  (see A.7.1).
- **Restore:** the admin list + moderation API over `service_provider_profiles`, and the screen.

### A.2.6 — Company records admin · P0
- **IDs:** COMP-008
- **Capability:** approve / suspend / edit company records from Admin.
- **Old:** `hist/old-tag/app/admin/sponsors/[id]/page.tsx`, `[id]/edit/page.tsx`,
  `_components/SponsorsListView.tsx`.
- **Current:** `cur/app/admin/companies/**` manages **the specialty taxonomy only**
  (`cur/app/admin/companies/page.tsx:11-13`, gated on `PROPERTIES_MANAGE`); sidebar link
  `cur/app/admin/admin-sidebar.tsx:43`. No company record list, approve, suspend or edit.
- **Restore:** company record management as part of the A.2.4 organizations console (companies are
  `organizations` rows of type `business`/`other`), not as a separate stack.

### A.2.7 — Office (real-estate organization) admin · P1
- **IDs:** ADMIN-026
- **Capability:** approve / manage real-estate offices and law offices.
- **Old:** covered by the sponsor console (`hist/old-tag/app/admin/sponsors/*`).
- **Current:** none. `cur/app/api/offices/route.ts:18` filters `organizations.type = 'real_estate'`
  for the public directory; there is no `app/admin/offices` and no admin API.
- **Restore:** as a type filter inside the A.2.4 console.

### A.2.8 — Verification review queue UI · P0
- **IDs:** ADMIN-010 · AMRS-024 · AMRS-050 · PROF-021
- **Capability:** approve / reject / expire / revoke identity and organization verification records,
  with an expected-status guard, a mandatory reason, jsonb metadata merge, a self-review block and an
  audit event.
- **Old:** the nearest ancestor is the plain status update at
  `hist/old-tag/app/api/sponsor-profiles/route.ts:158-201` (no audit, no guard).
- **Current:** two complete backends and **no screen** —
  `cur/app/api/admin/verifications/route.ts:22-49` (list), `[id]/route.ts:18-56` (decide),
  `expire/route.ts:12-23`; and `cur/app/api/amrs/admin/verification/route.ts:32-35`;
  library `cur/lib/amrs/organization-verification.ts:78-178`.
- **Restore:** one review screen. Consolidate the two parallel queues first (see C.6) and add
  `verification.review` to the permission catalogue — it is currently ungrantable.

### A.2.9 — Property moderation queue UI · P0
- **IDs:** ADMIN-011 · PROP-066 · PROP-025 · PROP-067
- **Capability:** an admin queue listing `pending_review` properties, with approve/reject and an
  owner notification.
- **Old:** none found on the web side.
- **Current:** the API exists and is permission-gated
  (`cur/app/api/admin/properties/[id]/review/route.ts:17-70`, review body `:106-149`) with **zero UI
  consumers**; `cur/app/admin/properties/properties-admin-client.tsx` only manages taxonomy
  (`:80,:140,:163,:190`). The submit endpoint `cur/app/api/properties/[id]/submit/route.ts:81` sets
  `pending_review` and **no component calls it**, so nothing can even enter the queue.
- **Restore:** the submit-for-review control on the owner side, the moderation queue on the admin
  side, and an owner notification on approval/rejection (today `review/route.ts:106-149` writes the
  row and returns silently).

### A.2.10 — Dispute console · P0
- **IDs:** ADMIN-021 (see also A.3.1)
- **Capability:** admin arbitration of a customer↔provider dispute.
- **Old:** `hist/old-tag/app/api/services/disputes/route.ts:11-109` (list / open / resolve, gated by
  `SERVICES_VIEW` and `SERVICES_DISPUTE_RESOLVE`).
- **Current:** no admin UI; the customer page calls a 404
  (`cur/app/dashboard/services/disputes/page.tsx:32,52` → `/api/service-disputes`); the count is
  still computed in the command centre (`cur/lib/command-center/service.ts:224`) and the dashboard
  counter (`cur/app/api/service-dashboard/counts/route.ts:33`); sidebar links 404
  (`cur/src/config/sidebar.ts:93,124`).
- **Restore:** the dispute API (A.3.1) and then the admin arbitration screen.

### A.2.11 — Community and Knowledge moderation · P0/P1
- **IDs:** ADMIN-044 · ADMIN-045 · COMM-017 · KNOW-017
- **Capability:** delete / lock / pin / hide forum content; approve, edit, unpublish and delete
  knowledge resources.
- **Old:** none found (both verticals are newer than `old-tag`).
- **Current:** `cur/app/api/community/topics/route.ts:21-25` and `topics/[id]/posts/route.ts:9-14`
  let any logged-in user post; the moderation columns exist and nothing toggles them
  (`cur/lib/db/schemas/community-schema.ts:23-25` — `isPinned`, `isLocked`, `status`);
  `cur/app/api/knowledge/route.ts:22-24` lets any session publish, force-published at `:45`;
  `cur/app/api/knowledge/[id]/route.ts` exports GET only. No `/admin/community`, no `/admin/knowledge`.
- **Restore (build):** moderation APIs + admin screens for both, before either vertical is opened
  publicly. This is a "RESTORE/BUILD" item — the capability never existed but the product rule
  requires that UGC not ship unmoderated; F.29 records the alternative (gate posting behind a role).

### A.2.12 — Platform user administration · P0
- **IDs:** ADMIN-003 · AUTH-048
- **Capability:** list, inspect, suspend, ban and reset **platform members** (the `users` table).
- **Old:** `hist/old-tag/app/admin/users-admin-client.tsx:70,91,113` → `/api/sponsor-access` — the old
  screen at least drove the table that then decided permissions.
- **Current:** `cur/app/admin/users-admin-client.tsx:70,91,113` → `/api/advertiser-access` (a rename
  only). It edits `sponsor_access`, which no longer participates in permission resolution
  (`cur/lib/identity-auth.ts:98-102` reads `users.role`). The five account states and typed block
  reasons exist (`cur/lib/auth/access-control.ts:4-37`, `cur/lib/db/schema.ts:14-15`) and **no admin
  API or UI can set any of them**.
- **Restore:** a real platform-user admin (list/suspend/reactivate/delete with the typed reason), and
  either repoint or supplement the existing screen (F.36).

### A.2.13 — Services supervision surfaces · P1
- **IDs:** ADMIN-017 · ADMIN-019 · ADMIN-020
- **Capability:** admin views of service listings, service requests, and offers/orders.
- **Old:** none found.
- **Current:** listing deactivation is reachable only through `moderateTarget`
  (`cur/lib/services/marketplace.ts:1725`) via a report action; the sidebar promises 25 routes that
  do not exist — `cur/src/config/sidebar.ts:83-98` (14 `/dashboard/services/supervisor/*`) and
  `:118-125` (8 `/admin/services/*`), all 404.
- **Restore:** pick one home (F.38) and build the listing/request/offer/order admin views there;
  remove the dead nav entries only after the replacement exists.

### A.2.14 — Geo and currency administration · P1
- **IDs:** ADMIN-050 · ADMIN-051 · GEO-008
- **Capability:** manage the country/governorate/city/district/street hierarchy; set enabled
  currencies and FX rates.
- **Old:** none found.
- **Current:** `/api/geo` is GET-only (`cur/app/api/geo/route.ts:7`); `cur/app/api/currencies/route.ts`
  is GET-only and `convert/route.ts:6` computes from hardcoded literals; no admin route or page for
  either. Cities are free-text strings throughout the services and properties schemas.
- **Restore (build):** admin CRUD for the geo hierarchy and the currency/FX catalogue. Note the geo
  hierarchy is currently seeded for Saudi Arabia only (`cur/scripts/seed-geo-data.ts`) while the UI
  offers 23 countries — see F.24.

### A.2.15 — Office licence-link console · P1
- **IDs:** COMM-LEG-027 (raw item 16)
- **Capability:** an admin page over `office_links` (the licence-key link records that the shipped
  desktop's activation model actually matches).
- **Old:** `hist/old-tag/app/api/office-links/route.ts` — a working, permission-gated API.
- **Current:** `cur/app/api/office-links/route.ts` still exists and is still permission-gated, with
  **no admin page anywhere in `cur/app/admin/`**; `office_devices` is now the system of record and
  `office_devices.legacy_link_id` (`cur/lib/integration/schema.ts:226`) is never populated.
- **Restore:** the console, and the migration bridge that fills `legacy_link_id` so already-activated
  desktops have a path into the new device table (see A.12.8).

---

## A.3 — Services marketplace

The old generation (`hist/old-tag`) shipped a small but complete `/api/services/*` family. The current
tree keeps the URLs as proxies but three of them forward to routes that were never built, so the
capability behind them is unreachable. `cur/lib/services/core.ts` still contains the working
implementations of every one of them.

### A.3.1 — Dispute capability (open / resolve / list) · P0
- **IDs:** SVC-097 · SVC-098 · SVC-099 · ADMIN-021
- **Capability:** a customer or provider opens a dispute against an order; staff list open disputes
  and resolve them with an outcome. Gated in the old build by `SERVICES_VIEW` (list) and
  `SERVICES_DISPUTE_RESOLVE` (resolve).
- **Old:** `hist/old-tag/app/api/services/disputes/route.ts:11-27` (list), `:35-74` (open),
  `:81-109` (resolve); service layer `hist/old-tag/lib/services/core.ts:477-511`.
- **Current:** the service layer survives verbatim (`cur/lib/services/core.ts:477-500` open,
  `:502-511` resolve) but the only route proxies to `/api/service-disputes`, which does not exist
  (`cur/app/api/services/disputes/route.ts:19,23,27`); the customer page 404s
  (`cur/app/dashboard/services/disputes/page.tsx:32,52`); the count is still computed
  (`cur/app/api/service-dashboard/counts/route.ts:33`, `cur/lib/command-center/service.ts:224`);
  two sidebar links 404 (`cur/src/config/sidebar.ts:93,124`).
- **Restore:** build `/api/service-disputes` (GET list / POST open / PATCH resolve) over the surviving
  `core.ts` functions, re-attach the two permissions, then add the admin arbitration screen (A.2.10).

### A.3.2 — Order status endpoint · P0
- **IDs:** SVC-082
- **Capability:** `PATCH /api/services/orders/[id]` moved an order along its status flow.
- **Old:** `hist/old-tag/app/api/services/orders/[id]/route.ts:13-48` — fully implemented.
- **Current:** `cur/app/api/services/orders/[id]/route.ts:18-21` proxies to `/api/service-orders/{id}`,
  a route that does not exist. The functional successor is `/api/service-jobs/[id]/status`
  (`cur/lib/services/marketplace.ts:1407-1458`) at a different path with no alias.
- **Restore:** either implement `/api/service-orders/[id]` as a thin adapter onto
  `updateJobStatus`, or make the proxy rewrite to `/api/service-jobs/[id]/status` and publish the
  mapping. Old external clients are 404ing today with no migration note.

### A.3.3 — Order review endpoint, including GET-reviews-for-order · P0
- **IDs:** SVC-092 · REV-006
- **Capability:** `GET` returned every review attached to an order; `POST` created one.
- **Old:** `hist/old-tag/app/api/services/orders/[id]/review/route.ts:15-71` (GET + POST).
- **Current:** `cur/app/api/services/orders/[id]/review/route.ts:18-26` proxies to the absent
  `/api/service-orders/{id}/review`. The replacement `/api/service-jobs/[id]/review`
  (`cur/app/api/service-jobs/[id]/review/route.ts:17`) is **POST-only** — the read half has no
  successor anywhere.
- **Restore:** add the GET half (reviews for a given order/job) and route the old URL onto it.

### A.3.4 — Service bookmarks / favourites · P0
- **IDs:** SVC-033 · FAV-004
- **Capability:** bookmark a service listing or provider and see them on a favourites page.
- **Old:** table only (`hist/old-tag/lib/services-schema.ts:111`) — the capability was declared but
  never given an API in the old tree either.
- **Current:** table still created (`cur/lib/services-schema.ts:111`); the page exists and calls a
  route that does not exist (`cur/app/dashboard/services/favorites/page.tsx:22,39` →
  `/api/service-bookmarks`); the sidebar links it.
- **Restore (build):** `/api/service-bookmarks` (GET / POST / DELETE) over the existing table, and
  wire a bookmark control onto provider cards and listing cards.

### A.3.5 — Service listings surface · P1
- **IDs:** SVC-030 · ADMIN-017
- **Capability:** providers publish standing service listings (title, price, category) that customers
  browse — as opposed to the request/offer flow.
- **Old:** `hist/old-tag/lib/services/core.ts:97-200`; browse tab rendered them at
  `hist/old-tag/app/services/page.tsx:74`.
- **Current:** the API is complete and live (`cur/app/api/services/listings/route.ts:20-99`,
  `listings/[id]/route.ts`) and **no page in `app/` or `src/` fetches it**; `/services` fetches only
  categories/providers/requests/settings (`cur/app/services/page.tsx:77-80`); deactivation is
  reachable only through `moderateTarget` (`cur/lib/services/marketplace.ts:1725`).
- **Restore:** the browse-listings tab on `/services`, a provider "my listings" editor, and an admin
  listing view. F.44 records the alternative (retire listings and bookmarks together).

### A.3.6 — Review aggregate envelope · P2
- **IDs:** SVC-095 · REV-007
- **Capability:** the reviews read returned `{reviews, aggregate:{count, avg}}`, so a profile header
  could show a rating without a second query.
- **Old:** `hist/old-tag/app/api/services/reviews/route.ts:22-28`.
- **Current:** `cur/app/api/service-reviews/route.ts:21` returns `{reviews}` only; every caller
  recomputes.
- **Restore:** re-add the aggregate block to the canonical reviews route and to the proxy response.

### A.3.7 — `PATCH /api/services/requests/[id]` action verbs · P1
- **IDs:** SVC-047 (adjacent) · SVC-149 (adjacent)
- **Capability:** the old PATCH accepted `{action:"cancel"}` and `{action:"acceptOffer", offerId}` on
  one endpoint.
- **Old:** `hist/old-tag/app/api/services/requests/[id]/route.ts:17-52`.
- **Current:** the proxy forwards to `cur/app/api/service-requests/[id]/route.ts:54-97`, which only
  patches fields; the two actions moved to `/cancel` and `/api/service-offers/[id]/accept` with no
  compatibility shim.
- **Restore:** accept the two action verbs on the proxied PATCH and dispatch them internally, so the
  old contract keeps working while the new paths remain canonical.

### A.3.8 — Request-thread entry point in the UI · P1
- **IDs:** SVC-121 · MSG-004 · MSG-005
- **Capability:** from a service request, open the conversation with the counterparty.
- **Old:** none found (the old generation had no messaging UI at all).
- **Current:** the thread API exists (`cur/app/api/service-messages/threads/[threadType]/[threadId]/route.ts`)
  and no request page renders an entry point; `StartThreadButton` passes no participants for
  non-services entities (`cur/src/components/services/StartThreadButton.tsx:35-37`).
- **Restore (build):** a per-bidder conversation entry point on the request detail page — after the
  per-pair thread key decision in F.50, so the entry point is not built on the leaking shared room.

### A.3.9 — Report-an-entity UI · P1
- **IDs:** SVC-100 · REV-010
- **Capability:** report an abusive listing, provider, request or review from the product.
- **Old:** none found.
- **Current:** `POST /api/service-reports` and `moderateTarget` exist
  (`cur/lib/services/marketplace.ts:1650,1725`) with **no button anywhere** and no admin queue.
- **Restore (build):** report controls on listing/provider/review cards and a moderation queue that
  consumes them.

### A.3.10 — Provider capability gaps carried from the old model · P1/P2
- **IDs:** SVC-017 (document verification) · SVC-050 (auto-expiry of stale requests) ·
  SVC-062 (response-rate / completion-rate signals) · SVC-152 (realtime) · SVC-162 (maintenance tickets)
- **Capability:** provider document verification; automatic expiry of stale requests; the response
  and completion rates the matcher already budgets 12 points for; realtime updates on the services
  surfaces; and property-maintenance ticketing with costing (a shipped desktop capability).
- **Old:** none found on the web side for the first four; desktop `MaintenanceTickets` +
  `TechnicianDirectory` (`cur/AkarApp_LIVE/AkarDB.sqlite`, `inv/dll_strings.txt:3829,3839`).
- **Current:** dead code / never computed — `cur/lib/services/match-score.ts:163-176` weights
  `response_rate`, `completion_rate` and `avg_response_time_min` that nothing ever writes.
- **Restore (build):** compute the three provider signals (or remove the weighting so scores are
  honest — F.118), add the expiry job, and decide maintenance ticketing in F.119.

---

## A.4 — Advertising (public surfaces and self-serve)

### A.4.1 — Self-serve ad request entry point (`AdRequestDialog`, `FloatingAdSlotActions`, requestable slots) · P0
- **IDs:** ADS-086 · ADS-087 · ADS-085
- **Capability:** an empty ad slot on a public page offered "request this slot"; clicking it opened a
  dialog that captured the advertiser's details and posted an ad request, which then appeared in the
  advertiser-requests admin queue. Floating per-slot actions also offered "details" and "contact".
- **Old:** `hist/old-tag/app/page.tsx:12,540` renders `AdRequestDialog`; `:453-454` passes
  `requestable` to the home side rails; `hist/old-tag/src/components/FloatingAdSlotActions.tsx`;
  API `hist/old-tag/app/api/ads/request/route.ts`.
- **Current:** all three pieces are preserved and unreachable —
  `cur/src/components/AdRequestDialog.tsx:134,195` has **no importer**;
  `cur/src/components/FloatingAdSlotActions.tsx:44-75` renders only from the `requestable` branch of
  `cur/src/components/AdSlot.tsx:315,338`, and `requestable` is never passed (default `false` at
  `AdSlot.tsx:128`, `ad-slot-frame.tsx:65`); the API is healthy
  (`cur/app/api/ads/request/route.ts:26-191`, duplicate guard `:56-68`) but its placement whitelist
  is `["side_left","side_right"]` (`:9`) — two placement keys the standard 8-slot layout no longer
  renders.
- **Restore:** pass `requestable` on the empty-slot path of the standard layout, mount
  `AdRequestDialog` in the public shell, and widen the whitelist to the standard-registry placement
  keys. The placement question is F.16.

### A.4.2 — Public country-based sponsor identity + logo fallback · P1
- **IDs:** ADS-009 · ADS-007 · ADS-010
- **Capability:** an anonymous visitor's country selected the sponsor shown in the page identity
  block; the component rendered the sponsor logo with an `onError` fallback to a text/tone treatment
  so a broken image never produced an empty brand slot. The read was public — no session required.
- **Old:** public unauthenticated branch `hist/old-main/app/api/sponsors/route.ts:112-135`; renderer
  `hist/old-main/app/page.tsx:717-730` (fallback), `:766-771`, `:1089`; commit `0247e22`
  ("add country-based sponsor system"), logo fallback commit `39836db`.
- **Current:** `cur/app/api/advertisers/route.ts:113-117` requires `ADVERTISERS_VIEW` on **every**
  GET — the anonymous `?country=` branch was deleted; there is no `SponsorIdentity` component, no
  tone/banner map and no fallback renderer anywhere in `cur`; `sponsors.tier` is still persisted and
  read by nothing (`cur/app/api/advertisers/route.ts:64`).
- **Restore:** the public country-scoped read (a separate unauthenticated endpoint or an explicitly
  public branch), the identity component with its `onError` fallback, and the tier→tone mapping.
  This is the only public-facing advertiser surface the platform ever had.

### A.4.3 — Batch ad matching · P0
- **IDs:** ADS-082
- **Capability:** one request resolves every slot on a page, instead of N parallel `/api/ads/match`
  calls.
- **Old:** `hist/old-tag/app/api/ads/match-batch/route.ts` — present and also uncalled.
- **Current:** `cur/app/api/ads/match-batch/route.ts:13-41` + engine `cur/lib/ads/engine.ts:707-719`
  — complete, **zero callers**; the standard 8-slot layout issues one match call per slot.
- **Restore (wire up):** have `standard-public-ad-layout.tsx` resolve its slots through
  `match-batch`. This is the single largest ad-latency win available and the code already exists.

### A.4.4 — Advertiser impression / click writer · P1
- **IDs:** ADS-051 · ANLY-008 · COMM-LEG-020
- **Capability:** see A.1.9. Restated here because it is also the only advertising-side exposure
  counter that ever existed on a public page.
- **Old:** `hist/old-tag/app/api/sponsor-events/route.ts:6-30`; `hist/old-main/app/api/sponsor-events/route.ts`.
- **Current:** no writer; six readers kept (`cur/app/api/advertisers/route.ts:44-45,47`,
  `cur/app/api/admin/stats/route.ts:49,76,80`, `cur/app/api/admin/analytics/route.ts:32,49`).
- **Restore:** the writer, or a documented redirect of the readers onto `ad_events` (E.4).

### A.4.5 — Office-channel creative shape: collapsible banner + news text · P3
- **IDs:** OFFICE-077
- **Capability:** the shipped desktop's local ad model carries `IsCollapsible` and `NewsText` fields
  that the web ad DTO has no place for.
- **Old:** desktop-side only — `cur/AkarApp_LIVE/AkarDB.sqlite` `AdCampaigns`;
  `inv/dll_strings.txt:3367` (`DesktopAdService.EnsureLocalImageAsync`).
- **Current:** `cur/lib/ads/types.ts` has no equivalent fields; `cur/lib/ads/engine.ts:672-673`
  forces office creatives into the mobile asset slot.
- **Restore:** add the two fields to the office ad DTO so a campaign authored on the web can express
  what the desktop already renders.

### A.4.6 — Ad creative storage under Node · P0
- **IDs:** ADS-030 · ADS-028 · ADS-026 · ADS-092
- **Capability:** resumable multipart creative upload with a real object store — preserved
  byte-identically from `hist/old-tag/app/api/ad-assets/route.ts:133-177`.
- **Old:** as above; commits `74eba26`, `5fd0426`, `292ef87`.
- **Current:** `cur/app/api/ad-assets/route.ts:133-177` is intact but every path calls
  `cur/lib/runtime-assets.ts:2`, which `await import("cloudflare:workers")` and throws under Node
  (Phase 0 verified). The admin asset library is therefore broken too.
- **Restore:** a Node-compatible storage adapter behind the same interface. This unblocks A.1.4
  (documents), A.1.8 (logos) and PROP-027 (property images) as well.

---

## A.5 — FindMyLand and the engineering tools

### A.5.1 — `tools.use` permission gate · P0
- **IDs:** TOOL-002
- **Capability:** the tools hub checked `tools.use` before any tool rendered, and showed a gated
  state to users without it.
- **Old:** `hist/old-tag/src/components/tools/ToolsGate.tsx:16-46,105`, used at
  `hist/old-tag/src/components/tools/ToolsPageClient.tsx:64,95`.
- **Current:** `cur/src/components/tools/ToolsGate.tsx` still exists and has **no importer**;
  `/tools` is fully public; the permission is still declared at
  `cur/src/constants/permissions.ts:79` and granted to `viewer`
  (`cur/src/constants/roles.ts:43` — it is that role's only permission).
- **Restore:** re-mount `ToolsGate` in `ToolsPageClient`, or ratify tools as public and record the
  change explicitly (F.69). Note the coupling: `viewer` holds `TOOLS_USE` and nothing else, so this
  permission is currently the only thing the default role can do.

### A.5.2 — Manual coordinate entry / paste · P1
- **IDs:** FML-005
- **Capability:** a textarea into which a user pasted coordinates (one point per line), plus
  add-a-point and clear-points controls — the only path for a user who has coordinates but no
  scannable document.
- **Old:** `SNAP-CGPT/app/tools/find-my-land/page.tsx` (paste textarea + add/clear point); the server
  half still accepts raw text (`cur/app/api/land/analyze/route.ts:190-196`).
- **Current:** removed — `cur/app/tools/find-my-land/page.tsx:1-5` is a five-line redirect stub to
  `/tools?tool=findmyland`; `cur/src/components/tools/FindMyLand.tsx` has no text input path.
- **Restore:** a paste/manual-entry panel in `FindMyLand.tsx` feeding the same evidence pipeline as an
  uploaded document, so manual points are validated by the resolver (zone inference, coordinate-order
  protection, geodesic area) rather than trusted blindly.

### A.5.3 — File export: KML / DXF / CSV / PDF · P1
- **IDs:** FML-036 · TOOL-023
- **Capability:** download the resolved parcel as a file. The old page produced a KML with the polygon
  plus a centre placemark.
- **Old:** `SNAP-CGPT/app/tools/find-my-land/page.tsx` (`downloadKml`).
- **Current:** no download of any kind in `cur/src/components/tools/FindMyLand.tsx` (no `Blob`, no
  `download`, no `kml`/`dxf` writer). A complete DXF/SVG/PNG/PDF generator exists and is unreachable
  (`cur/src/lib/cad/*`, `cur/src/components/cad/*`, zero importers in every tree).
- **Restore:** an export menu on the result panel (KML, DXF, CSV, PDF) implemented on top of
  `src/lib/cad/*` rather than a new generator — this closes FML-036 and TOOL-023 in one move.

### A.5.4 — Perimeter output · P2
- **IDs:** FML-031
- **Capability:** the total perimeter of the resolved parcel, shown next to the area.
- **Old:** result tile in `SNAP-CGPT/app/tools/find-my-land/page.tsx`; server computation
  `cur/app/api/land/analyze/route.ts:98-103` (still live).
- **Current:** not surfaced anywhere in `cur/src/components/tools/FindMyLand.tsx`.
- **Restore:** compute the perimeter geodesically (consistent with the current geodesic area, D.3)
  and render it beside the area and the declared-vs-measured mismatch warning.

### A.5.5 — DXF / KML / KMZ / CSV / TXT / DOCX input · P1
- **IDs:** FML-004
- **Capability:** the tool accepted survey exchange formats, not only scans.
- **Old:** accept list in `SNAP-CGPT/app/tools/find-my-land/page.tsx` (`.dxf,.kml,.kmz,.txt,.csv`).
- **Current:** the **server still supports every one of them**
  (`cur/app/api/land/analyze/route.ts:17-27,44-77,166-186`) while the UI restricts the picker to
  `pdf/png/jpg/jpeg/webp` (`cur/src/components/tools/FindMyLand.tsx:133,1264`) and never calls
  `/api/land/analyze`.
- **Restore:** widen the accept list and route non-raster inputs to the parser branch. See C.1 — the
  readers should be folded into the resolver rather than the UI being pointed at the legacy endpoint.

### A.5.6 — Add-point-on-map and the tabbed upload/map/table UI · P2
- **IDs:** FML-004 (UI half) · TOOL-006
- **Capability:** click the map to add a point, clear points, and switch between upload / map / table
  views.
- **Old:** `SNAP-CGPT/app/tools/find-my-land/page.tsx`.
- **Current:** the map is read-only and inline
  (`cur/src/components/tools/FindMyLand.tsx:968-1012`); two further map components exist unused
  (`cur/app/tools/find-my-land/land-map.tsx`, `cur/src/components/land/LandMap.tsx`).
- **Restore:** editable points on the canonical inline map, feeding the same validation path as
  A.5.2.

### A.5.7 — Share link + QR of a saved land · P1
- **IDs:** FML-038 · LAND-016
- **Capability:** produce a share URL and a QR payload for a saved parcel, with expiry.
- **Old:** `SNAP-CGPT/src/components/tools/FindMyLand.tsx:74-76,283-299,580-600`.
- **Current:** the API is alive and complete — `cur/app/api/land/[id]/share/route.ts:9-58`,
  `cur/lib/land/share.ts:11-31` — with **no caller** anywhere in `app/`, `src/` or `components/`.
- **Restore:** the share/QR control on the result panel. Blocked behind FAV-011 (F.73): today a
  "saved" parcel lives in an in-memory `Map` (`cur/lib/land/saved-land.ts:3`), so a share link
  outlives its target by minutes.

### A.5.8 — Arabic coordinate-table headings · P0
- **IDs:** FML-016
- **Capability:** recognise Arabic table headers (شمال / شرق, نقطة, إحداثيات) so an Arabic deed's
  coordinate table parses.
- **Old:** **none found — never existed in any tree.**
- **Current:** header matching is Latin-only (`cur/lib/geo/evidence-extraction.ts:28,299-344`).
- **Restore (build):** this is a net-new requirement, recorded here because it is the single largest
  functional gap for Arabic documents and is the reason FML-017/FML-018 (B.1) matter so much — with
  Arabic headers unsupported, the header-less and label-based fallbacks are the *only* Arabic paths.

### A.5.9 — CAD export subsystem exposure · P1
- **IDs:** TOOL-023
- **Capability:** DXF/SVG/PNG/PDF export, a layer panel, interactive preview and drawing validation.
- **Old:** `SNAP-CGPT/src/components/cad/*` + `SNAP-CGPT/src/lib/cad/*` — present, never routed.
- **Current:** the same files in `cur`, still with zero importers.
- **Restore:** expose it as a registered tool and as the export engine behind A.5.3 and Points→DXF.

### A.5.10 — Saved projects and share pages under `/tools/find-my-land` · P2
- **IDs:** FML-038 (adjacent) · LAND-012
- **Capability:** `app/tools/find-my-land/projects/` and `.../share/` routes.
- **Old:** listed in `SNAP-CGPT/TOOLS_INVENTORY.txt`; the directories are named there but their
  sources are not in any supplied tree.
- **Current:** neither directory exists in `cur`.
- **Restore:** OLD SOURCE REQUIRED (G.3) for the exact behaviour; the persisted-parcel substrate must
  come from F.73 first.

### A.5.11 — `distance-measure` tool · P3
- **IDs:** TOOL-024
- **Capability:** measure distances on a map.
- **Old:** advertised at `SNAP-CGPT/app/tools/page.tsx:10` and
  `ref/akarpromax-auth-current/app/tools/page.tsx:10`; **no component ever existed** — INTENDED ONLY.
- **Current:** nothing in `cur`.
- **Restore:** either build it or remove the promise from the hub; do not leave a tool advertised
  with no implementation. OLD SOURCE REQUIRED only in the sense that no prior implementation is
  recoverable (G.3).

### A.5.12 — Raw OCR text disclosure · P3
- **IDs:** FML-024 (adjacent)
- **Capability:** a `<details>` panel showing the raw OCR text, so a user could see why a bad scan
  produced bad points.
- **Old:** `hist/old-tag/src/components/tools/LandMapper.tsx:289-298`.
- **Current:** `FindMyLand.tsx` shows structured evidence and validations instead; the raw text is
  never exposed.
- **Restore:** a collapsed raw-text panel alongside the evidence view. The structured view is better
  and stays (D.2); this is additive, not a rollback.

### A.5.13 — Land / geo / tool test suites in CI · P1
- **IDs:** FML-048 · TOOL-026 · PROP-074
- **Capability:** the land, geo and tool suites executed on every run.
- **Old:** the suites exist in `cur/tests/land/*`, `cur/tests/geo/*`, `cur/tests/tools/*`.
- **Current:** `cur/package.json:13` enumerates 19 test files explicitly and none of those three
  directories is among them (Phase 0: 19 of 79 files run).
- **Restore:** add the three directories to the runner. This is the cheapest protection available for
  every FindMyLand item in B.1.

---

## A.6 — Messaging and notifications

### A.6.1 — Office and company conversation entry points · P1
- **IDs:** MSG-004 · MSG-005 · ORG-020
- **Capability:** message an office or a company from its public profile.
- **Old:** none found.
- **Current:** the buttons render with **no handler** (`cur/app/offices/[id]/page.tsx:47-48`,
  `cur/app/companies/[id]/page.tsx:47-48`); the only place `office`/`company` exist as message
  contexts is the unimported `cur/lib/services/messaging/deep-links.ts:15,17`.
- **Restore (build):** wire the buttons to `startMessageThread` with an org context, after F.52
  decides whether `office`/`company` are first-class contexts or fold into `organization`.

### A.6.2 — Notification dismiss / dismiss-all · P2
- **IDs:** NOTIF-006
- **Capability:** dismiss a single alert or all alerts. Shipped on the desktop.
- **Old:** desktop `IsDismissed` (`inv/dll_strings.txt:2456-2461,4393-4396`).
- **Current:** `service_notifications` has read state but no dismissal;
  `cur/app/dashboard/services/notifications` offers no dismiss action.
- **Restore:** a dismissed flag plus dismiss/dismiss-all actions, at parity with the desktop.

### A.6.3 — Severity-tiered alert engine with typed alerts · P1
- **IDs:** NOTIF-034
- **Capability:** typed, severity-ranked, entity-linked alerts with trigger dates — e.g. `poa_expiry`
  — written by a real emitter.
- **Old:** desktop `DashboardAlerts` (`cur/AkarApp_LIVE/AkarDB.sqlite`);
  `inv/dll_strings.txt:422,431,594`.
- **Current:** `notify()` (`cur/lib/services/marketplace.ts:2081`) targets exactly one `user_id`, has
  no severity, no entity link and no broadcast; no admin alert exists on the web at all.
- **Restore:** severity + entity link + a role/broadcast fan-out on the notification model.

### A.6.4 — Radar match notification · P2
- **IDs:** NOTIF-033 · RADAR-017 · RADAR-018
- **Capability:** notify when a radar match appears, with an idempotent notified flag.
- **Old:** desktop `RadarMatches.IsNotified` / `NotifiedAt` (`AkarDB.sqlite`).
- **Current:** `cur/lib/integration/radar.ts` has no notify path and persists nothing but
  `matched_count` (`:148-165`).
- **Restore:** persisted matches (A.12.9) first, then a notification on new matches for both web and
  desktop targets.

### A.6.5 — Web push / PWA service worker · P2
- **IDs:** NOTIF (channel) · MSG (channel) · SVC-110
- **Capability:** browser push delivery.
- **Old:** none found.
- **Current:** `cur/src/components/PwaManager.tsx:19` registers `/sw.js`, **which is not in the
  repository**; `email` and `office_desktop` channels are declared
  (`cur/lib/integration/constants.ts:29`) with no dispatcher; `processOutbox`
  (`cur/lib/services/marketplace.ts:2136`) has zero callers.
- **Restore:** ship the service worker (G.4 — the file may exist in a build artefact we were not
  given) or remove the registration, and give the outbox a dispatcher. F.54 / F.55.

---

## A.7 — Organizations, professionals and AMRS

### A.7.1 — `GET /api/professionals` list endpoint · P0
- **IDs:** PRO-001 · PRO-002
- **Capability:** the public professionals directory read — filter `serviceProviders` by
  `status='approved'`, `city`, `categoryId` and `like(businessName, q)`, order by `rating` desc,
  limit 50. A `rank` parameter was read but never applied.
- **Old:** `ref/akarpromax-source/app/api/professionals/route.ts:6-22`; also present in the staged
  index (`inv/stage_list.txt:208`, `inv/all_files_unix.txt:166`).
- **Current:** **the file is deleted from the working tree.** Only `app/api/professionals/[id]`
  remains, and `cur/app/api/docs/route.ts:7` still advertises the list route — so the published API
  documentation points at a 404.
- **Restore:** the route verbatim from the snapshot, plus either implement or remove the `rank`
  parameter so the documented contract is honest.

### A.7.2 — Professional workspace dashboard · P1
- **IDs:** PRO-011
- **Capability:** a professional's own workspace (profile, requests, offers, jobs).
- **Old:** none found.
- **Current:** none; professionals have a public detail page and no logged-in home.
- **Restore (build):** a professional workspace mirroring `app/dashboard/office/**`.

### A.7.3 — Office leads inbox and office-scoped property requests · P1
- **IDs:** OFFICE-ORG-008 · OFFICE-099
- **Capability:** an office sees leads and open property requests scoped to the organization.
- **Old:** `ref/akarpromax-source/app/api/offices/[id]/leads` and
  `ref/akarpromax-source/app/api/offices/[id]/property-requests` (directories present in the snapshot).
- **Current:** neither exists; `leads` has no `organizationId` at all
  (`cur/lib/db/schemas/leads-schema.ts:4-42`), so office scoping is not even representable.
- **Restore:** add organization ownership to `leads`, then the two office-scoped reads.

### A.7.4 — Organization member invitations · P0
- **IDs:** AMRS-018
- **Capability:** invite a member to an organization by email, with accept/decline.
- **Old:** `ref/akarpromax-source/app/api/invitations` (directory present in the snapshot).
- **Current:** a stub service with **no persistence**
  (`cur/lib/services/invitations/invitation.service.ts:62-79`); no route, no table, no UI.
- **Restore:** persisted invitations with a token, expiry and an accept flow — this is the missing
  half of A.7.10 and A.8.2.

### A.7.5 — Self-serve organization creation · P0
- **IDs:** ORG-005 · ORG-006
- **Capability:** a user creates an office or a company from onboarding.
- **Old:** admin-created only.
- **Current:** the API allows it (`cur/app/api/amrs/organizations/route.ts:85-152`, creates a `draft`)
  but **no UI exposes it**; onboarding discards the choice
  (`cur/app/onboarding/page.tsx:44-47`, `cur/app/api/auth/onboarding/complete/route.ts:28`) and the
  "add company/office" CTAs route back into that same onboarding
  (`cur/app/companies/page.tsx:81-83`, `cur/app/offices/page.tsx:81-83`). A wizard component that
  *does* send the choice exists unimported (`cur/components/onboarding/OnboardingWizard.tsx:12-22`).
- **Restore:** mount the wizard that already carries the role choice, and expose organization
  creation. Policy question in F.64.

### A.7.6 — Organization business-identity fields (CR / tax number / structured address) · P1
- **IDs:** ORG-014 · PROF-013 · PROF-014
- **Capability:** the organization record carried `sponsor_code`, `commercial_registration`,
  `tax_number` and a structured address (governorate / village / street / `address_ar` / `address_en`)
  on the profile itself.
- **Old:** `hist/old-tag/lib/runtime-db.ts:213-241`; DDL `hist/old-tag/db/schema.ts:279-280`.
- **Current:** absent from `organizations` (`cur/lib/db/pg-identity-schema.ts:158-187`,
  `cur/lib/db/schema.ts:93-129`); these fields survive only per-branch and on the D1 professional
  contract (`cur/lib/amrs/contracts/professional.ts:40-41`). The shipped desktop still stores
  `Settings.CRNumber` and `Settings.TaxNumber`, so the sync contract is now lossy in both directions.
- **Restore:** the columns on `organizations`, the editor fields in both workspace profile forms, and
  the mapping in the office sync payload.

### A.7.7 — Organization social links · P2
- **IDs:** ORG-015
- **Capability:** WhatsApp / Facebook / Instagram / X links on an organization profile.
- **Old:** partially present on the sponsor profile.
- **Current:** missing from the organization model and both profile editors.
- **Restore:** the fields plus rendering on the public profile.

### A.7.8 — Organization portfolio · P1
- **IDs:** ORG-016 · ORG-017
- **Capability:** an office/company portfolio of completed work.
- **Old:** partial.
- **Current:** **stubs** — GET returns `[]` and POST persists nothing
  (`cur/app/api/company/portfolio/route.ts:24,48-51`, `cur/app/api/office/portfolio/route.ts:24,48-51`),
  and both resolve the *first* membership of any organization (`:16-22`) rather than the addressed one.
- **Restore:** real persistence plus correct organization resolution.

### A.7.9 — Organization reviews and rating aggregate · P1
- **IDs:** ORG-018 · ORG-019
- **Capability:** reviews and a rating for an office or company; the rank/rating chip on cards.
- **Old:** none found.
- **Current:** `organizations` has no rating columns; the card components accept rating props
  (`cur/components/office/OfficeCard.tsx:19-25`) and the pages never pass them, so every card renders
  the "NEW" chip forever.
- **Restore (build):** organization reviews, or aggregation from member professionals' reviews
  (F.60), and then pass the props the cards already accept.

### A.7.10 — Member management write UI · P1
- **IDs:** PROF-017 · OFFICE-ORG-005 · COMP-005
- **Capability:** add / remove a member and change their role from the office or company workspace.
- **Old:** `hist/old-tag/app/api/sponsor-users/route.ts:9` with roles viewer/editor/manager/admin,
  driven from the sponsor admin screens.
- **Current:** API-only — `cur/app/api/amrs/organizations/[id]/members/route.ts:126-170` works and
  `cur/app/dashboard/office/members/page.tsx:16-22` (and the company twin) is a **read-only table**.
- **Restore:** the write UI in both workspaces, and a documented migration from `sponsor_users` roles
  to `organization_members` roles.

### A.7.11 — Per-organization analytics · P2
- **IDs:** ORG-022 · AMRS-039 (adjacent)
- **Capability:** impressions and clicks per organization — the profile-performance read that the
  sponsor generation had via `sponsor_events`.
- **Old:** `hist/old-tag/db/schema.ts:155-167` + `hist/old-tag/app/api/sponsor-events/route.ts`.
- **Current:** nothing for organizations; the equivalent counters survive only in the advertiser
  domain and are permanently zero there (A.1.9 / A.4.4).
- **Restore:** an organization-scoped exposure counter and a "your profile performance" panel in the
  office/company workspace. Depends on the A.1.9 writer decision.

### A.7.12 — Organization specialties, availability and surveyor RFQ persistence · P0/P2
- **IDs:** ORG-008 · AMRS-065 · SURV-011 · SURV-014 · SURV-015 · SURV-016 · SURV-018
- **Capability:** attach specialties to an organization; model availability; persist survey RFQs with
  a surveyor inbox, accept/decline, notification and a job lifecycle.
- **Old:** none found.
- **Current:** `organization_specialties` is created and never used
  (`cur/lib/company-schema.ts:13-22`); availability exists as a contract type only
  (`cur/lib/amrs/contracts/availability.ts:3-14`, zero callers); RFQs are an in-memory `Map`
  (`cur/lib/land/quote.ts:3`) behind an unauthenticated endpoint whose identity is client-supplied
  (`cur/app/api/land/[id]/surveyors/quote/route.ts:18-31`;
  `cur/src/components/tools/FindMyLand.tsx:1187` sends `localStorage` or `"guest"`).
- **Restore:** persist RFQs (F.61 decides whether they merge into the services order flow), add the
  surveyor inbox and notification, and use `organization_specialties` as the surveyor taxonomy
  instead of the literal name substring `"surveyor"` (`cur/lib/land/amrs-directory.ts:64`).

---

## A.8 — Identity, roles and ranks

### A.8.1 — Member profile edit and avatar · P0/P1
- **IDs:** PROF-002 · PROF-003
- **Capability:** an ordinary member edits their own profile and uploads a photo.
- **Old:** none found.
- **Current:** missing entirely — there is no self-service profile editor for a plain `user`.
- **Restore (build):** the editor and avatar upload; avatar storage depends on A.4.6 (F.109).

### A.8.2 — Per-advertiser member invite / role change surface · P1
- **IDs:** AUTH-050 · PROF-017
- **Capability:** invite a person into an advertiser account and change their role among
  viewer / editor / manager / admin.
- **Old:** `hist/old-tag/app/api/sponsor-users/route.ts:9` plus the sponsor admin screens.
- **Current:** the successor concept is `organization_members`
  (`cur/app/api/amrs/organizations/[id]/members/route.ts:140-160`), with **no write UI** and **no
  migration path** from `sponsor_users` — and `sponsor_users` is still the table the live
  `advertiser-users` API reads (`cur/app/api/advertiser-profiles/route.ts:63`).
- **Restore:** the invite/role-change surface for advertiser accounts, plus the `sponsor_users` →
  `organization_members` migration (F.65).

### A.8.3 — Account-state operator surface · P0
- **IDs:** AUTH-048 · ADMIN-003
- **Capability:** an operator sets a member's account state (active / inactive / suspended / deleted)
  with a typed block reason.
- **Old:** `hist/old-tag/app/admin/users-admin-client.tsx:70,91,113` at least drove the table that
  then decided permissions.
- **Current:** the five states and typed reasons exist
  (`cur/lib/auth/access-control.ts:4-37`, `cur/lib/db/schema.ts:14-15`) and **no admin API or UI can
  set any of them**; the screen was renamed to `/api/advertiser-access` and still edits
  `sponsor_access`, which no longer participates in permission resolution
  (`cur/lib/identity-auth.ts:98-102`).
- **Restore:** a real platform-user admin (A.2.12), and F.36 decides repoint versus second screen.

### A.8.4 — Advertiser account registration path · P1
- **IDs:** AUTH-009
- **Capability:** register as an advertiser and land in a plan/subscription.
- **Old:** the sponsor generation created the profile and could attach a plan.
- **Current:** advertiser profiles exist but the commercial half is gone (A.1.1–A.1.7), so an
  advertiser account has nothing to subscribe to.
- **Restore:** dependent on F.1–F.7.

### A.8.5 — Automatic reputation evaluation and real signals · P0
- **IDs:** RANK-007 · RANK-008
- **Capability:** ranks computed from real signals on a defined trigger.
- **Old:** none found.
- **Current:** an admin types the signal numbers by hand; `evaluateReputation` exists and is fed
  fabricated inputs (`cur/lib/amrs/reputation.ts:447-493`).
- **Restore (build):** the signal collectors and the evaluation trigger (F.111).

### A.8.6 — Rank admin override and distribution report UI · P1/P2
- **IDs:** RANK-009 · RANK-011 · AMRS-038 · AMRS-039
- **Capability:** manual rank override and the reputation distribution report.
- **Old:** none found.
- **Current:** both APIs are complete and correctly gated; **neither has a screen**.
- **Restore:** the two panels inside the A.2.4 organizations console.

### A.8.7 — Rank and plan effects (quotas, limits) · P1
- **IDs:** RANK-016 · COMM-LEG-002
- **Capability:** `max_branches`, `max_users`, `max_properties`, `max_ads` actually enforced at the
  write paths.
- **Old:** the columns existed and were authored (`hist/old-tag/app/api/sponsor-plans/route.ts:42-161`);
  enforcement is not evidenced in the old tree either.
- **Current:** the columns are created and seeded (`cur/lib/content-schema.ts:280-297,517-541`) and
  **nothing reads them**.
- **Restore (build):** quota checks in `advertiser-branches`, `advertiser-users`, property create and
  ad create. This has never existed and is the only thing that makes a paid plan mean anything.

### A.8.8 — Rank-change notification · P1
- **IDs:** RANK-025
- **Capability:** tell an entity when its rank changes.
- **Old:** none found.
- **Current:** `featured_rank` writes (`cur/lib/services/marketplace.ts:210-214`) and
  `recomputeProviderRating` (`:1579-1596`) notify nobody.
- **Restore (build):** a notification on rank transitions, once A.6.3 gives the model a severity and
  entity link.

### A.8.9 — Advertiser plan tiers and subscription state as a rank input · P1
- **IDs:** RANK-027 · RANK-016 · ADS-010
- **Capability:** an advertiser's plan tier and live subscription state fed the ranking/visibility
  model — the commercial half of the rank system.
- **Old:** `hist/old-tag/lib/runtime-db.ts:284-315`; `hist/old-tag/app/api/sponsor-plans/route.ts`,
  `hist/old-tag/app/api/sponsor-subscriptions/route.ts`.
- **Current:** the tables are still created (`cur/lib/content-schema.ts:280-315`) with **no API, no
  UI and no enforcement** — the only reader is a row count
  (`cur/app/api/admin/stats/route.ts:70`). `sponsors.tier` is persisted and applied to nothing
  (`cur/app/api/advertisers/route.ts:64`).
- **Restore:** re-attach plan tier + subscription state to the ranking inputs once A.1.1/A.1.2 are
  rebuilt — subject to the published no-pay-for-rank policy
  (`cur/src/content/legal-center.ts:96`), which F.110 must reconcile with the tier concept.

### A.8.10 — Verification self-service submission and badge vocabulary · P1
- **IDs:** PROF-021 · PROF-023 · AMRS-024
- **Capability:** a subject submits documents for verification and, once approved, carries a badge.
- **Old:** the nearest ancestor is the plain status flip at
  `hist/old-tag/app/api/sponsor-profiles/route.ts:158-201`; the badge vocabulary itself is not in any
  supplied tree.
- **Current:** the review backend is complete (A.2.8) and there is **no submission UI**; the badge
  vocabulary is OLD SOURCE REQUIRED (G.5).
- **Restore:** the submission form, and the badge set once G.5 is answered.

---

## A.9 — Properties and Land

### A.9.1 — Submit-for-review control and the owner notification · P0
- **IDs:** PROP-025 · PROP-066 · PROP-067 · ADMIN-011
- **Old:** none found on the web side.
- **Current:** `cur/app/api/properties/[id]/submit/route.ts:81` sets `pending_review` and **no
  component calls it**; the review API is complete and gated
  (`cur/app/api/admin/properties/[id]/review/route.ts:17-70`, body `:106-149`) with zero UI
  consumers, and approval/rejection returns silently with no owner notification.
- **Restore:** the owner-side submit control, the admin queue (A.2.9), and the notification.

### A.9.2 — Property image upload and media gallery · P0/P1
- **IDs:** PROP-027 · PROP-014
- **Old:** none found in the web trees; the desktop carries `PropertyAttachments` with
  `AttachmentType` / `IsPublic`.
- **Current:** no upload path; the detail page has no gallery or carousel.
- **Restore:** upload on top of the A.4.6 storage fix, plus the gallery. Without this, an
  office-synced listing loses `image_url` too (B.2.1).

### A.9.3 — Owner / office contact block on a listing · P0
- **IDs:** PROP-015 · PROP-058
- **Old:** none found.
- **Current:** "enquire now" creates a thread with no participants beyond the sender
  (`cur/src/components/services/StartThreadButton.tsx:35-37`,
  `cur/app/api/service-messages/threads/route.ts:32-43`) — nothing resolves the property's `user_id`
  or `office_id`, so buyer enquiries never reach the owner. `property_inquiries` has no API and no UI
  (`cur/lib/db/schemas/properties-schema.ts:154-169`).
- **Restore:** server-side resolution of owner/office into thread participants, a contact block on the
  detail page, and the inquiry capture form over the existing table.

### A.9.4 — Map on browse and detail, sharing, owner analytics · P1/P2
- **IDs:** PROP-010 · PROP-061 · PROP-064
- **Old:** none found.
- **Current:** no map on either surface; no share (link / WhatsApp / QR) control, although
  FindMyLand already has a share implementation to reuse (`cur/src/components/tools/FindMyLand.tsx:1084-1090`);
  no owner-facing performance dashboard.
- **Restore (build):** all three, reusing the existing FindMyLand share helpers and the ad-analytics
  counters rather than new stacks.

### A.9.5 — Lifecycle transitions: archive, sold, rented · P1
- **IDs:** PROP-023 · PROP-026
- **Old:** none found.
- **Current:** delete is a hard delete gated on the creator alone
  (`cur/app/api/properties/[id]/route.ts:246-251`); there is no archive and no sold/rented state
  transition.
- **Restore:** soft-delete/archive plus the two commercial end-states, so a closed listing is
  retained rather than destroyed.

### A.9.6 — Office discovery of open requests, and offer revision · P0/P2
- **IDs:** PROP-054 · PROP-057
- **Old:** none found.
- **Current:** offers against requests work (`cur/app/api/property-requests/[id]/offers/route.ts:71-97`
  has the correct membership check) but offices cannot discover open requests, and an offer cannot be
  revised or countered.
- **Restore:** an office-scoped open-requests feed and offer revision/counter-offer.

### A.9.7 — Saved-search matching and delivery · P0
- **IDs:** PROP-052 · SRCH-017
- **Old:** none found.
- **Current:** `saved_searches.notify` and `last_notification`
  (`cur/lib/db/schemas/properties-schema.ts:103-104`) are toggled by
  `cur/app/api/saved-searches/[id]/notify/route.ts:24` and by the UI
  (`cur/app/dashboard/saved-searches/page.tsx:128`), and **no code ever reads `notify` or writes
  `last_notification`** — the toggle and the "0 matching" counter are decorative.
- **Restore (build):** the matcher and a delivery channel, or hide the toggle (F.76).

### A.9.8 — Desktop property richness on sync · P0
- **IDs:** PROP-072
- **Old:** the desktop model — `AkarDB.sqlite` `Properties` (69 columns) plus `PropertyBounds`,
  `PropertyGisPolygons`, `Coordinates`, `Ownerships`, `PropertyAttachments`, `PropertyAmenities`,
  `PropertyBrokers`, `PropertyLegalStatus`, `Units`, `PropertyInstallments`.
- **Current:** `cur/lib/integration/sync.ts:60-104` carries ~20 scalar fields and no geometry, media,
  ownership or legal status.
- **Restore:** extend the sync contract toward the desktop model, prioritising geometry (needed by
  RADAR-008) and ownership (needed by any contract capability).

### A.9.9 — Missing drizzle-pg migrations `0004`–`0010` · P0
- **IDs:** PROP-073 · GEO-010 · COMM-020 · KNOW-018 · NEWS-033
- **Old:** `ref/akarpromax-properties-current/drizzle-pg/0004…0010*.sql` exist (properties, leads +
  land, auction fields, geo + currency, vehicles); `0004_add_new_tables.sql` is the **sole DDL** for
  `forum_categories` / `forum_topics` / `forum_posts` (`:289,:301,:312`), `knowledge_items` (`:327`)
  and `news_ticker_items` (`:412`).
- **Current:** absent from `cur/drizzle-pg`, while `cur/drizzle-pg/meta/_journal.json` still lists
  0004–0006 and `cur/scripts/apply-geo-currency-schema.ts:8` reads a missing `0009`.
- **Restore:** re-import the seven files from the snapshot tree, reconcile the journal, and verify a
  clean-database provision. Three whole domains (Community, Knowledge, news ticker) have **no schema
  at all** on a fresh database today, and the 12 currencies cannot be installed (F.25).

### A.9.10 — Land parcel lifecycle, documents, valuations, polygons, radius search · P1/P3
- **IDs:** LAND-003 · LAND-006 · LAND-009 · LAND-010 · LAND-011 · LAND-012 · FAV-011
- **Old:** none found.
- **Current:** `land_parcels` exists with an engine (`cur/lib/land/core/land-engine.ts`) while the
  tool saves to an **in-memory `Map`** (`cur/lib/land/saved-land.ts:3`) keyed by a `localStorage` id
  (`cur/src/components/tools/FindMyLand.tsx:1132`) — every saved parcel is lost on restart, and the
  two stores are served under the same `/api/land*` prefix with incompatible ids.
- **Restore:** persist to `land_parcels` with real authorization (F.73), then build parcel CRUD,
  document attachment, valuations, polygon rendering and radius search on that one store.

---

## A.10 — Auctions, Community, Knowledge, Vehicles, News

### A.10.1 — Auction management console · P1
- **IDs:** AUC-060 · AUC-059 · AUC-021 · AUC-022
- **Old:** `cur/docs/comparison/PAGES_COMPARISON.md:19` records an `Admin/Auctions` page in the
  pre-refactor Reference app (`:47` notes it lacked its `adminOnly` guard). Source not supplied — G.6.
- **Current:** nothing equivalent; only organizer grants are administrable
  (`cur/app/admin/auction-organizers/**`). Cancel/suspend is a stub, the approval step does not exist,
  and organizer grants are not audited.
- **Restore:** an auctions console covering list, approve, cancel/suspend, and an audit trail of
  organizer grants.

### A.10.2 — Bidder's own-bid dashboard · P1
- **IDs:** AUC-034
- **Old:** `/dashboard/bids` in `cur/docs/comparison/ROUTES_COMPARISON.md:11` (Reference app).
- **Current:** the data exists in `auction_bids`; no surface.
- **Restore:** the dashboard over the existing table.

### A.10.3 — Auction public pages: terms, FAQ, stats, history · P2
- **IDs:** AUC-061
- **Old:** `cur/docs/comparison/ROUTES_COMPARISON.md:9`, `PAGES_COMPARISON.md:15`.
- **Current:** none exist.
- **Restore:** OLD SOURCE REQUIRED for the exact content (G.6); the terms page can be built now on
  the versioned terms catalogue (`cur/lib/db/schemas/auction-hardening-schema.ts:5-17`).

### A.10.4 — Realtime auction price and countdown · P1
- **IDs:** AUC-057
- **Old:** `cur/docs/comparison/FEATURE_MATRIX.md:39` records a realtime socket for auctions and chat.
- **Current:** the rebuild decision was "REST, no socket" and **no polling replacement was built**, so
  a live auction price is stale until the viewer acts.
- **Restore:** at minimum a polling refresh on the auction detail page; a transport decision is F.85
  (shared with office notifications).

### A.10.5 — Auto-bid and the participants registry · P2
- **IDs:** AUC-037 · AUC-038
- **Old:** `ref/akarpromax-source/lib/auctions/auction.engine.ts:43-47` wrote an
  `auction_participants` row per bidder; `:23,:35` propagated an `isAutoBid` flag.
- **Current:** `auction_participants` has zero importers and `isAutoBid` is hard-coded `false`
  (`cur/app/api/auctions/[id]/bid/route.ts:110`).
- **Restore:** the participants writer (merge into the live property-backed model, C.12) and proxy
  bidding.

### A.10.6 — Turkish auction terms · P2
- **IDs:** AUC-053 · I18N-003
- **Old:** the superseded `cur/lib/db/schemas/auctions-schema.ts:64` carried `content_tr`.
- **Current:** the live `auction_terms` (`cur/lib/db/schemas/auction-hardening-schema.ts:5-17`) is
  AR/EN only, on a platform whose news and UI are AR/EN/TR.
- **Restore:** the `tr` content column and a Turkish seed, subject to F.27.

### A.10.7 — Community moderation console and report flow · P0/P1
- **IDs:** COMM-017 · ADMIN-044
- **Old:** none found (the vertical post-dates `old-tag`).
- **Current:** the moderation columns exist and nothing toggles them
  (`cur/lib/db/schemas/community-schema.ts:23-25` — `isPinned`, `isLocked`, `status`); any logged-in
  user can post (`cur/app/api/community/topics/route.ts:21-25`,
  `topics/[id]/posts/route.ts:9-14`); no `/admin/community`.
- **Restore (build):** pin / lock / hide / delete plus a report queue, before the forum opens
  publicly (F.29).

### A.10.8 — Knowledge admin console and editorial workflow · P0/P1
- **IDs:** KNOW-017 · KNOW-008 · KNOW-009 · ADMIN-045
- **Old:** none found.
- **Current:** any session can publish and content is force-published
  (`cur/app/api/knowledge/route.ts:22-24,45`); `[id]/route.ts` exports GET only, so nothing can be
  edited or withdrawn; `isFree` is unenforced; `fileUrl` is an unvalidated external link.
- **Restore (build):** the publish role, a draft→review→published workflow, edit/unpublish/delete, and
  the admin console (F.30).

### A.10.9 — Vehicle services module and the news-ticker admin · P1/P2
- **IDs:** VEH-017 · NEWS-032 · NEWS-033 · NEWS-040
- **Old:** `/vehicle-services` in `cur/docs/comparison/ROUTES_COMPARISON.md:9` (Reference app, source
  not supplied — G.6); the news-ticker admin is marked "KEEP target (superior)" at
  `cur/docs/comparison/FEATURE_MATRIX.md:10`.
- **Current:** the current `/vehicles` is a mock marketplace and does not supersede vehicle services;
  `/admin/advertising/news-ticker` targets `/api/advertising/news-ticker`, which was never built, and
  `news_ticker_items` has no migration and no admin writer; the news engine still declares
  `PUSH_NOTIFICATION` and `IN_APP_NOTIFICATION` channels the admin UI offers and nothing delivers.
- **Restore:** decide the ticker owner (F.32), build the surviving admin, and either implement the two
  notification channels or disable them in the placement editor so admins stop creating dead
  placements.

---

## A.11 — Search, Favorites and Reviews

### A.11.1 — Provider and listing bookmarks · P0
- **IDs:** FAV-004 · SVC-033
- **Old:** table only.
- **Current:** the favourites page calls a route that does not exist
  (`cur/app/dashboard/services/favorites/page.tsx:22,39`); the sidebar links it. Same item as A.3.4,
  restated because it is the favourites vertical's only surface.
- **Restore:** `/api/service-bookmarks` plus bookmark controls.

### A.11.2 — Saved-search alerts · P0
- **IDs:** SRCH-017 · PROP-052
- **Current:** see A.9.7 — the toggle controls nothing.
- **Restore:** the matcher and delivery, or removal of the toggle (F.76).

### A.11.3 — Favourites counter · P2
- **IDs:** FAV-003 · FAV-001
- **Current:** the counter column is always 0, and `useFavorites` starts every card in the
  not-favourited state before hydration.
- **Restore:** a real counter write on toggle and server-side hydration of the initial state.

### A.11.4 — Review moderation surface · P0
- **IDs:** REV-010 · REV-008
- **Current:** `setReviewHidden` is reachable only through an `action` value the UI never sends; there
  is no admin review list; `cur/app/api/service-reviews/route.ts:7-14` is unauthenticated and
  `?reviewerUserId=<email>` enumerates everything a person ever wrote, keyed by email address
  (`cur/lib/services/marketplace.ts:1542`).
- **Restore:** the moderation screen plus authorization on the read.

### A.11.5 — Reviews for organizations, offices and properties · P1
- **IDs:** ORG-018 · REV-014
- **Current:** only service providers can be reviewed; the rank and review systems are not wired
  together.
- **Restore (build):** subject to F.92, extend the review target set and connect it to the reputation
  engine.

---

## A.12 — Office (AkarProMax Office / AkarApp v2.0) and Radar

### A.12.1 — `GET/POST /api/program/subscription-status` · P0
- **IDs:** OFFICE-102 · COMM-LEG-040 · AUTH-058
- **Old:** the shipped desktop calls `https://akar-promax.com/api/program/subscription-status`
  (`inv/dll_urls.txt`; `SubscriptionService` at `inv/dll_strings.txt:1689,2136,3364`).
- **Current:** **no `program` directory in `cur/app/api`.** The endpoint the shipped product depends
  on does not exist on this platform.
- **Restore:** implement it as a compatibility shim, or ship a desktop update onto
  `/api/office/v1/*` (F.20 / F.21). Until then the licence model is unenforceable from the web.

### A.12.2 — `POST /api/program/sync` · P0
- **IDs:** COMM-LEG-041 · OFFICE-063 · OFFICE-067 · OFFICE-043
- **Old:** the desktop posts `{signature:"Akar_ProMax_2026_Secure_Key", userToken, action:"GET_UPDATES"}`
  every 10 minutes and expects `{success, news[], ads[]}`
  (`cur/AkarApp_LIVE/webui/assets/index-BaC7A85f.js:1`, `function Na(e=6e5)`;
  `inv/dll_strings.txt:8701`).
- **Current:** route missing. The web-side news and ads engines are complete
  (`cur/app/api/office/v1/news/route.ts:7-39`, `cur/app/api/office/v1/ads/route.ts:15-54`) and no
  shipped client can reach them; the device-side offline queue does not exist on the web at all.
- **Restore:** the shim that wraps the existing resolvers in the payload shape the binary already
  parses — this is the smallest change that makes news and ads actually reach a desktop user.

### A.12.3 — `/api/desktop` and the desktop ad placement vocabulary · P0
- **IDs:** OFFICE-068 · ADS-057
- **Old:** the desktop requests `<base>/api/desktop` and
  `/ads/placement/desktop_portal_bottom_banner` (`inv/dll_strings.txt:1492,1491,7440`); its WebUI
  recognises only `side` / `bottom` / `any`.
- **Current:** no `desktop` route; `desktop_portal_bottom_banner` is not in `OFFICE_AD_PLACEMENTS`
  (`cur/lib/integration/constants.ts:35-41`), so even the existing office ads route answers 400
  (`cur/app/api/office/v1/ads/route.ts:24-26`).
- **Restore:** register or translate the placement key (F.84) and provide the route.

### A.12.4 — Cloud backup intake · P0
- **IDs:** OFFICE-108 · OFFICE-109 · OFFICE-110
- **Old:** `CloudBackupSyncService.UploadPendingPackagesAsync` uploads to
  `Settings.CloudBackupUploadUrl` (`inv/dll_strings.txt:4814`; `AkarDB.sqlite` `Settings`).
- **Current:** no backup-intake endpoint exists; office data is therefore uploaded to whatever URL is
  configured, with no auth contract.
- **Restore:** a first-party intake with device-token auth, or an allow-list on the configured URL
  (F.86).

### A.12.5 — WebView2 portal token handoff · P0
- **IDs:** OFFICE-111 · OFFICE-112 · OFFICE-113
- **Old:** the desktop opens the website with `?signature=…&userToken=…&action=…`
  (`inv/dll_strings.txt:3368,1239,4781,4816`).
- **Current:** **no route reads that query pair**, and there is no shared-secret signature check
  anywhere in `cur`.
- **Restore:** a signed handoff endpoint that exchanges the desktop's token for a web session, with
  the shared secret rotated out of the binary.

### A.12.6 — Offline licence, trial and activation-code flow · P0/P1
- **IDs:** OFFICE-104 · OFFICE-107 · COMM-LEG-042 · COMM-LEG-043 · COMM-LEG-044 · COMM-LEG-045
- **Old:** desktop-only — `OfflineLicenseService` / `AKAR_OFFLINE_LICENSE_2026`
  (`inv/dll_strings.txt:5534-5536,3390`), `CreateTrial` / `TrialDays` / `daysRemaining`
  (`:4208,3124`), the activation UI and code generator (`:3406-3408,4698,1455`), and the subscription
  lock/warning UI.
- **Current:** none of it exists on the web; the offline licence in particular defeats the web-side
  revoke path at `cur/app/api/office-links/route.ts:51`.
- **Restore:** the web counterparts, or an explicit decision that licensing stays desktop-side
  (F.22 / F.23) — but the revoke gap must be closed either way.

### A.12.7 — Device deactivation from the desktop, and publish/approve on synced properties · P1
- **IDs:** OFFICE-106 · OFFICE-051
- **Old:** none found on the web side.
- **Current:** the office workspace is read-only over devices (no revoke, rotate or re-pair action),
  and a synced property has no publish/approve step.
- **Restore:** device write actions in the workspace, and a publish workflow for synced listings —
  which is also the gate that F.80 needs.

### A.12.8 — `office_devices.legacy_link_id` migration bridge · P2
- **IDs:** OFFICE-022 · OFFICE-021 · COMM-LEG-027
- **Capability:** carry an already-activated desktop, whose identity is an `office_links` licence-key
  record, into the new `office_devices` system of record without re-activation.
- **Old:** `hist/old-tag/app/api/office-links/route.ts` — a working, permission-gated licence-key link
  API that matches the shipped desktop's activation model.
- **Current:** `cur/app/api/office-links/route.ts` still exists and is still permission-gated, but
  `office_devices` is the system of record and `office_devices.legacy_link_id`
  (`cur/lib/integration/schema.ts:226`) is **never populated by any code path** — the migration was
  designed and never executed.
- **Restore:** a backfill that matches each live `office_links` row to a device record and writes
  `legacy_link_id`, plus a redemption path that accepts a legacy licence key once. Without it, every
  currently-activated desktop must be re-paired by hand, and the admin console in A.2.15 has nothing
  to reconcile against.

### A.12.9 — Radar persistence, deduplication, events and scheduling · P0
- **IDs:** RADAR-012 · RADAR-013 · RADAR-015 · RADAR-016 · RADAR-019 · RADAR-021 · RADAR-024
- **Old:** the desktop persists matches (`AkarDB.sqlite` `RadarMatches`, with `IsNotified`).
- **Current:** radar is pull-only and stateless — the only entry point is a client-initiated
  `POST /api/office/v1/radar` scan (`cur/app/api/office/v1/radar/route.ts:19`) and only
  `matched_count` is stored (`cur/lib/integration/radar.ts:148-165`), so "new since last time" cannot
  be computed and no deduplication is possible; there is no server-side periodic scan, no radar
  preferences, no match score, and no public-lead / co-broking radar.
- **Restore:** persist matches, dedupe against them, emit an event per new match, add a scheduled
  scan, and store radar criteria. RADAR-008 (coordinate projection) must be fixed first or the scan
  will never see office-sourced properties.

---

## A.13 — Currency and localization

### A.13.1 — Header currency chip · P1
- **IDs:** CUR-008 · CUR-003
- **Capability:** a currency chip in the site header, merged into the location cluster, that let a
  visitor pick the display currency; it was backed by the 23-entry country→currency map.
- **Old:** `hist/old-main/app/page.tsx:1089`; `hist/old-tag/app/page.tsx:424`; commits `b9fa259`
  ("merge currency chip into location cluster") and `11c1a47` ("close location menus and sync
  currency"); the currency list it read is `cur/src/data/locations.ts:29-53` (still present, zero
  importers).
- **Current:** **no component renders it.** The only survivor is the orphaned style rule
  `.currency-chip` at `cur/app/globals.css:99`. `/api/currencies` and `/api/currencies/convert` have
  zero callers repo-wide.
- **Restore:** the chip in the public shell header, reading the DB catalogue rather than the static
  list — subject to F.25 (12 vs 23, and whether a user-facing switcher is in scope at all).

### A.13.2 — Currency and FX-rate administration · P1
- **IDs:** ADMIN-051 · CUR-006 · CUR-002
- **Old:** none found.
- **Current:** `cur/app/api/currencies/route.ts` is GET-only and `convert/route.ts:6` computes from
  hardcoded literals; the 12-currency requirement is realised only by a manually run seed
  (`cur/scripts/seed-currency-data.ts:5-16`) whose migration file is missing (A.9.9).
- **Restore (build):** admin CRUD for the catalogue and the rates, plus a refresh path (F.26).

### A.13.3 — Geo hierarchy administration · P1
- **IDs:** ADMIN-050 · GEO-008 · GEO-013
- **Old:** none found.
- **Current:** `/api/geo` is GET-only (`cur/app/api/geo/route.ts:7`); cities are free-text strings
  throughout services and properties; three hard-coded geo lists bypass the DB hierarchy
  (`cur/src/data/locations.ts`, `cur/components/properties/PropertyWizard.tsx:76-81`,
  `cur/src/components/land/LandSearchPage.tsx:43-47`); only Saudi Arabia is seeded
  (`cur/scripts/seed-geo-data.ts`) while the UI offers 23 countries.
- **Restore (build):** admin CRUD for country / governorate / city / district / street, and migrate
  the free-text city fields onto ids (F.24).

### A.13.4 — Locale routing and Turkish coverage · P1
- **IDs:** I18N-007 · I18N-003 · I18N-026
- **Old:** none found.
- **Current:** there is no `/en/...` routing, so localized pages are neither linkable nor crawlable;
  the web has full Turkish while the shipped desktop ships ar+en only and the auction terms table has
  no `tr` column (A.10.6).
- **Restore:** locale-prefixed routing (F.28) and a decision on Turkish scope across web, desktop and
  legal text (F.27).

---

# B. FIX REGRESSION

Capabilities that exist in **both** the old and the current tree, where the current implementation is
materially worse, narrower, or broken. Nothing here needs to be rebuilt from nothing — the behaviour
to recover is stated exactly, and in most cases the old code that did it correctly is still readable
in `hist/old-tag` or `ref/`.

## B.1 — FindMyLand document parsing

### B.1.1 — Arabic labelled point rows (`نقطة`) no longer parse · P1
- **IDs:** FML-017
- **Old:** `hist/old-tag/src/lib/tools/land-analysis.ts:79-88` matched a labelled point row after
  `normalizeArabic()` had folded `ة→ه`, `أإآ→ا` etc. at `:44`, so both spellings matched.
- **Current:** `cur/src/lib/tools/land-analysis.ts:92` applies `normalizeDigits` **only** — the
  Arabic folding step was dropped — while the regex at `:134` spells the word `نقطه` (heh). A deed
  that writes `نقطة` (teh marbuta), which is the normal spelling, now matches nothing. The resolver
  path has no Arabic point-label pattern at all.
- **Behaviour to recover:** apply Arabic folding before matching (or accept both spellings in the
  pattern), and add the same labelled-point pattern to `cur/lib/geo/evidence-extraction.ts` so the
  resolver benefits too.

### B.1.2 — Header-less generic 3-column UTM rows no longer parse · P1
- **IDs:** FML-018
- **Old:** `hist/old-tag/src/lib/tools/land-analysis.ts:89-98` ran the `index easting northing`
  pattern **unconditionally**, so a bare numbered table parsed with no header at all.
- **Current:** the tool parser gates it behind `points.length === 0`
  (`cur/src/lib/tools/land-analysis.ts:133`), and the resolver only reads zone-less rows **after** an
  English `NORTHING EASTING` header (`cur/lib/geo/evidence-extraction.ts:28,299-344`). Arabic and
  header-less survey tables therefore yield zero points.
- **Behaviour to recover:** run the generic 3-column pattern unconditionally, with the resolver's
  plausibility checks (country bounds, coordinate-order protection) applied to its output rather
  than a header requirement acting as the gate.

### B.1.3 — First-match-wins replaced all-patterns accumulation · P1
- **IDs:** FML-018
- **Old:** `hist/old-tag/src/lib/tools/land-analysis.ts:101-113` ran **every** pattern and merged the
  de-duplicated union, so a mixed-format document (some rows labelled, some bare, some with a zone)
  yielded all of its points.
- **Current:** `cur/src/lib/tools/land-analysis.ts:121,133,144` stop at the first productive pattern.
  A document whose first pattern matches two points loses the other eighteen.
- **Behaviour to recover:** accumulate across all patterns and de-duplicate at the end. The natural
  home is the resolver's evidence layer, not the tool component — see C.1.

### B.1.4 — Saved-land persistence · P0
- **IDs:** FAV-011
- **Current:** "Save my land" writes to an in-memory `Map` (`cur/lib/land/saved-land.ts:3`) keyed by a
  `localStorage` id (`cur/src/components/tools/FindMyLand.tsx:1132`) — better in intent than the old
  build (which had no save at all) but a data-loss defect in practice, and it strands the live share
  API (A.5.7).
- **Behaviour to recover:** persist to `land_parcels` with session-derived ownership.

### B.1.5 — Surveyor discovery returns nothing · P0
- **IDs:** SURV-004 · SURV-003 · SURV-005 · SURV-009 · SURV-012
- **Current:** `/api/land/discover-surveyors` returns zero candidates for **every** request because
  `isVerified` is hard-coded `false` (`cur/lib/amrs/directory.ts:117`) while `onlyVerified` defaults
  on (`cur/lib/land/surveyor-discovery.ts:48-50`); distance/radius/sort never work because the
  directory→candidate mapper omits `location` (`cur/lib/land/amrs-directory.ts:17-31`); surveyors are
  matched by the literal substring `"surveyor"` in an organization name (`:64`), which no
  Arabic-named surveyor can satisfy; the candidate pool for `GET /api/land/[id]/surveyors` comes from
  a client query parameter (`cur/app/api/land/[id]/surveyors/route.ts:16-23`); and the quote endpoint
  is unauthenticated with client-supplied identity.
- **Behaviour to recover:** real verification state, a location on candidates, a profession taxonomy
  (F.59), a server-side candidate pool, and authentication on the quote.

## B.2 — Office integration and sync

### B.2.1 — Sync property column coverage · P0
- **IDs:** OFFICE-098 · PROP-072 · RADAR-009
- **Old:** `ref/akarpromax-source/lib/integration/sync.ts:60-99` mapped `slug`, `listing_type`,
  `property_type`, `country_code`, `city_id`, `district`, `parking_slots` and `image_url`.
- **Current:** `cur/lib/integration/sync.ts:60-105` — **all eight removed.** `country_code` and
  `city_id` are precisely the columns the radar filters on
  (`cur/lib/integration/radar.ts:74,92`), so office-pushed listings default to `'om'` with a NULL
  city forever and can never be matched.
- **Behaviour to recover:** restore the eight column mappings verbatim from the snapshot.

### B.2.2 — NOT NULL backfill removed · P0
- **IDs:** OFFICE-038 (adjacent)
- **Old:** `ref/akarpromax-source/lib/integration/sync.ts:50-66` defaulted `title_*`, `description_*`,
  `features_*`, `listing_type`, `property_type`, `country_code` and `parking_slots`.
- **Current:** `cur/lib/integration/sync.ts:50-58` defaults only seven columns; any push that omits
  `titleTr` or `descriptionTr` now violates `NOT NULL` (`cur/lib/properties-schema.ts:36-44`) and is
  recorded as `status='failed'` with the raw database error in `conflict_reason`.
- **Behaviour to recover:** the full backfill list, so a partial push degrades instead of failing.

### B.2.3 — `features_*` JSON corruption · P0
- **IDs:** OFFICE-098 (adjacent)
- **Old:** `ref/akarpromax-source/lib/integration/sync.ts:96-98` used `JSON.stringify(value)`.
- **Current:** `cur/lib/integration/sync.ts:93-96` uses `String(value)`, so an array of features is
  silently flattened to a comma-joined string and every downstream `JSON.parse` consumer breaks.
- **Behaviour to recover:** `JSON.stringify` for the three `features_*` columns, plus a repair pass
  over rows already written by the current code.

### B.2.4 — Default currency flipped OMR → SAR · P0
- **IDs:** OFFICE-098 (adjacent) · CUR-002
- **Old:** the sync default was `OMR`.
- **Current:** `cur/lib/integration/sync.ts:55` defaults to `SAR`, silently reinterpreting the price
  of every push that omits `currency` — an Omani office's listings become Saudi-priced with no
  warning and no audit entry.
- **Behaviour to recover:** either restore `OMR`, or derive the default from the office's
  `country_code` (which B.2.1 must restore first) and record the substitution in `conflict_reason`.

### B.2.5 — Realtime replay cross-tenant leak · P0
- **IDs:** OFFICE-088
- **Current:** `cur/lib/integration/realtime.ts:58-62` does not parenthesise the office clause, so
  every `office_id IS NULL` event is replayed to every sponsor. Present in **both** old and current —
  it is not a refactor regression, but it is a live defect on a shipped path.
- **Behaviour to recover:** correct grouping of the tenant predicate.

### B.2.6 — Office media API · P0
- **IDs:** OFFICE (media)
- **Current:** `cur/app/api/office/v1/media/route.ts` returns 400 on every request — wrong database,
  wrong table, wrong columns, a reserved word, missing DDL, uploaded bytes discarded, no ownership
  check (Phase 0 verified). The route did not exist in `ref/akarpromax-source`, so this is
  new-and-broken rather than regressed — but it currently advertises a capability that always fails.
- **Behaviour to recover:** either implement it against the real property media store (A.9.2) or
  return a documented `501` until it exists.

### B.2.7 — Office workspace permission enforcement · P1
- **IDs:** OFFICE (permissions)
- **Current:** `cur/src/constants/permissions.ts:53-55` declares the sync / radar / notifications
  permissions with **zero enforcement sites**; the workspace tabs are gated by nothing except the
  device-token check that the shipped desktop cannot satisfy.
- **Behaviour to recover:** check the three permissions on the workspace routes.

## B.3 — Messaging

### B.3.1 — `GET /api/services/messages` now answers 405 · P0
- **IDs:** MSG (family C) · SVC (proxy)
- **Old:** `hist/old-tag/app/api/services/messages/route.ts:49-77` implemented
  `GET ?threadType=&threadId=` and returned `{messages}` — the only public messaging contract the
  platform ever published.
- **Current:** `cur/app/api/services/messages/route.ts:19` forwards GET to `/api/service-messages`,
  which **exports only POST**, so every old client receives `405 Method Not Allowed`.
- **Behaviour to recover:** implement the GET half of the proxy against
  `/api/service-messages/threads/[threadType]/[threadId]`, preserving the query-parameter form and
  the `{messages}` envelope.

### B.3.2 — Error-code vocabulary collapsed · P2
- **IDs:** MSG (family D contract)
- **Old:** `ORDER_NOT_FOUND` (`hist/old-tag/…:66`), `REQUEST_NOT_FOUND` (`:72`) and
  `NOT_PARTICIPANT` (`:68`) were distinct, and the existence check ran before the authorization check.
- **Current:** all three collapse into a flat `FORBIDDEN`
  (`cur/app/api/service-messages/threads/[threadType]/[threadId]/route.ts:23`).
- **Behaviour to recover:** re-emit the three codes on the compatibility proxy. Arguably the flat 403
  is safer for the canonical route — keep it there, restore the vocabulary only on the old URL.

### B.3.3 — Request threads leak between competing bidders · P0
- **IDs:** MSG-009 · SVC-113 · SVC-116 · SVC-118
- **Old:** `hist/old-tag/…/messages/route.ts:70-73` also failed to restrict request-thread reads —
  but the old generation had **no provider-facing UI**, so the hole was latent.
- **Current:** the inbox actively surfaces the shared room to every bidder
  (`cur/lib/services/marketplace.ts:2019-2023`), `isThreadParticipant` passes any provider holding a
  non-withdrawn offer (`:1924-1932`), `threadMessages` is keyed only by `(thread_type, thread_id)`
  (`:1889-1896`), `markThreadRead` clears unread across rival providers (`:1901`), and
  `resolveRecipientUserId` always returns the customer (`:1967-1970`) so no provider is ever
  notified. Independently confirmed as P0-2 in `cur/docs/release/PHASE-0-BASELINE.md:479,546,575`.
- **Behaviour to recover:** a per-pair thread key (`request:<requestId>:<providerUserId>`) or the
  `offer` context, and recipient derivation from the thread pair. F.50.

### B.3.4 — `startMessageThread` has no authorization · P0
- **IDs:** MSG-049 · SVC-115
- **Current:** `cur/lib/services/marketplace.ts:1985-2007` lets any authenticated caller self-enrol
  into any thread id and add arbitrary `participantIds`, after which every participant-scoped context
  is passable. The privacy of `general`, `property`, `property_request`, `professional` and
  `organization` threads is therefore nominal, not enforced.
- **Behaviour to recover:** a relation check between the caller and the owning entity before
  enrolment (F.56).

## B.4 — Advertising

### B.4.1 — Ordered creative playlists no longer play · P0
- **IDs:** ADS-024 · ADS-071
- **Old:** commit `ee54559` (`app/page.tsx` +806-819) flat-mapped a campaign's creatives so the whole
  ordered list played in sequence inside one hero view — an advertiser's five-slide story ran as a
  story.
- **Current:** `cur/lib/ads/engine.ts:536-561` (`selectCreative`) deliberately returns **exactly one**
  creative per delivery, round-robin by impression count, to equalise exposure across campaigns.
  Playlist *authoring* is preserved; playlist *playback* is gone.
- **Behaviour to recover:** an explicit per-campaign playback mode (`sequence` vs `rotate`) so both
  contracts can be sold. Which is the default is F.15 — the current behaviour must not be removed,
  only made selectable.

### B.4.2 — Public country-based sponsor read now requires a permission · P1
- **IDs:** ADS-007 · ADS-009
- **Old:** `hist/old-main/app/api/sponsors/route.ts:112-135` had an anonymous `?country=` branch.
- **Current:** `cur/app/api/advertisers/route.ts:113-117` requires `ADVERTISERS_VIEW` on every GET, so
  the public surface cannot read its own sponsor. See A.4.2 for the renderer.
- **Behaviour to recover:** a public, country-scoped, field-limited read that exposes only what the
  identity block renders.

### B.4.3 — `sponsor_events` writer removed while six readers were kept · P0
- **IDs:** ADS-051 · ANLY-008 · COMM-LEG-020 · ORG-022
- **Old:** `hist/old-tag/app/api/sponsor-events/route.ts:6-43` (public, unauthenticated) was the only
  writer.
- **Current:** the route is deleted; the table is still created on every boot; and six read sites
  still JOIN it — `cur/app/api/advertisers/route.ts:44-45,47`,
  `cur/app/api/admin/stats/route.ts:49,76,80`, `cur/app/api/admin/analytics/route.ts:32,49` — feeding
  impression / click / CTR columns in the advertiser console
  (`cur/app/admin/advertisers/advertiser-admin-client.tsx:305,317-319`). **Every one of those numbers
  is a permanent zero presented as a measurement.** This is billing-relevant data.
- **Behaviour to recover:** restore the writer, or repoint the six readers at `ad_events` and remove
  the columns that cannot be populated. Leaving fabricated zeros in a commercial console is the one
  option that is not acceptable.

### B.4.4 — Ad tracking split across three stores, one unauthenticated · P0
- **IDs:** ADS-046…ADS-050 · ADS-083
- **Current:** `/api/ads/{impression,click,conversion}` write token-signed rows to
  `ad_impressions`/`ad_clicks`/`ad_conversions`; `/api/advertising/track` writes `ad_analytics` with
  **no auth, no rate limit and no campaign validation** (`cur/app/api/advertising/track/route.ts:5-22`);
  `/api/ad-events` writes `ad_events` and is called by nothing, with two tests asserting its absence
  from rendered HTML.
- **Behaviour to recover:** one authenticated, signed tracking path (E.4), with the unauthenticated
  writer closed immediately regardless of which store wins.

### B.4.5 — OS targeting and budget spend never take effect · P1
- **IDs:** ADS-068 · ADS-039 · ADS-040
- **Current:** `cur/lib/ads/engine.ts:362-367` implements OS targeting and `AdSlot` never sends
  `operatingSystem`; `:457-463` implements budget caps correctly and `spent_amount` /
  `ad_daily_statistics` are never written, so no campaign can ever exhaust a budget.
- **Behaviour to recover:** send the OS signal, and write spend on delivery (or drop the CPM/CPC
  model — F.17).

## B.5 — Admin

### B.5.1 — `/admin/settings` reduced to an empty state · P0
- **IDs:** ADMIN-053 · ADMIN-054
- **Old:** `hist/old-tag/app/admin/settings-admin-client.tsx:1-263` — a working subscription-plan CRUD
  (create / edit / toggle / delete; monthly and yearly price, currency, `max_branches`, `max_users`,
  `max_properties`, `max_ads`, feature list, sort order) at `:115-179,242-258`.
- **Current:** `cur/app/admin/settings-admin-client.tsx:13-16` — 19 lines rendering
  "لا توجد أقسام إعدادات بعد", still linked from the sidebar
  (`cur/app/admin/admin-sidebar.tsx:79`), while `cur/app/api/admin/stats/route.ts:70` still reports a
  plan count from a table that four priced tiers are seeded into on every non-production boot.
- **Behaviour to recover:** the plan CRUD screen and its API, restored from the old client and
  `hist/old-tag/app/api/sponsor-plans/route.ts:41-161`.

### B.5.2 — `/admin/roles` lost its authorization gate · P0
- **IDs:** ADMIN (roles) · AUTH-043
- **Old:** `hist/old-tag/app/admin/roles/page.tsx:9-13` — `requireChatGPTUser` **and**
  `PermissionGuard[ROLES_VIEW]`.
- **Current:** `cur/app/admin/roles/page.tsx:1-5` has **neither**; the page renders for any visitor
  who knows the URL. The same class of gap exists on the four
  `cur/app/admin/advertising/**/page.tsx` files, which are plain `'use client'` components with no
  server gate.
- **Behaviour to recover:** the session requirement and the permission guard, on all five pages.

### B.5.3 — Role assignment endpoints authorize on session alone · P0
- **IDs:** AUTH-043 · AUTH-044
- **Current:** `cur/app/api/admin/roles/route.ts:8-9,19-27` and
  `cur/app/api/admin/roles/assign/route.ts:9-17,26-27,41-42` gate on `getSession()` only — **any
  authenticated user can create a role with arbitrary permissions and assign it to anyone.**
  Mitigating but not fixing: the runtime path reads only `ROLE_CATALOG`
  (`cur/lib/auth/identity-map.ts:16-21`), and no migration creates `admin_roles` /
  `admin_role_assignments`, so the endpoints are simultaneously dangerous and inert.
- **Behaviour to recover:** the permission check the old sponsor-role path had
  (`hist/old-tag/lib/sponsor-auth.ts:35-110`), plus the migration, before the tables become live.

### B.5.4 — Role promotion from Admin is inert · P0
- **IDs:** AUTH-044 · ADMIN-003
- **Old:** `hist/old-tag/lib/sponsor-auth.ts:35-110` — the `sponsor_access.role` row decided the
  effective permission set.
- **Current:** permissions resolve exclusively from `users.role`
  (`cur/lib/identity-auth.ts:98-102`) while the admin screen still writes only `sponsor_access`
  (`cur/app/admin/users-admin-client.tsx:70-176` → `cur/app/api/advertiser-access/route.ts:101-113`).
  An administrator can appear to grant `country_manager` or `super_admin` and nothing changes.
- **Behaviour to recover:** either repoint the screen at `users.role`, or make `sponsor_access`
  authoritative again (F.40) — but the screen must stop reporting success for a change it does not
  make.

### B.5.5 — Super-admin bootstrap is broken · P0
- **IDs:** AUTH-045
- **Old:** `hist/old-tag/lib/sponsor-auth.ts:66-88` auto-promoted the first user — insecure, and
  correctly removed.
- **Current:** the replacement `cur/scripts/seed-auth-admin.ts:34-49` never sets
  `users.status='active'`, so the account it creates is blocked by `isAccountUsable`
  (`cur/lib/auth/access-control.ts:29-32`). There is currently **no working way to obtain an admin
  account on a fresh deployment**, which in turn blocks B.7.1.
- **Behaviour to recover:** set the status in the seed script.

### B.5.6 — Other admin gate mismatches · P1
- **IDs:** ADMIN (authz)
- **Current:** `/admin/auction-organizers` is advertised to `SETTINGS_MANAGE` holders
  (`cur/app/admin/admin-sidebar.tsx:47`) while the API requires `session.role === 'super_admin'`
  (`cur/app/api/admin/auction-organizers/route.ts:13,62`) — a guaranteed 403 for the advertised
  audience; `cur/app/api/admin/offer-types/route.ts:21,49` lets any logged-in user create or change
  an offer type; seven admin pages call `requireSessionUser` with no `PermissionGuard`;
  `hasScopedPermission` (`cur/src/constants/permissions.ts:105-114`) returns `true` for any scope and
  has zero callers, so `moderator_scopes` (`cur/app/api/admin/moderators/route.ts:98`) is decorative.
- **Behaviour to recover:** align each gate with its API, and either enforce or remove the scopes
  (F.90).

## B.6 — Services

### B.6.1 — Ordinary customers can no longer post a service request · P0
- **IDs:** SVC-149
- **Old:** `hist/old-tag/app/api/services/requests/route.ts:40` allowed the write unless the role was
  literally `viewer`.
- **Current:** `cur/app/api/service-requests/route.ts:68` hard-requires
  `SERVICE_REQUESTS_MANAGE_OWN`, which the default mapping never grants — session role `user` maps to
  `viewer` (`cur/lib/auth/identity-map.ts:5`) whose permission list is `[TOOLS_USE]` only
  (`cur/src/constants/roles.ts:43`). **The 8-step wizard, the flagship customer journey, ends in a
  403 for every ordinary member.**
- **Behaviour to recover:** grant the permission to the base role, or introduce a `customer` role
  (F.42). This is the highest-impact single regression in the audit.

### B.6.2 — Admin services console cannot load · P0
- **IDs:** SVC-131 · SVC-087
- **Current:** `getAdminMarketplaceSnapshot` selects `o.agreed_price` and `o.scheduled_at`
  (`cur/lib/services/marketplace.ts:1783`); neither column is created by
  `cur/lib/services-schema.ts:64-79` or by any ALTER in `cur/lib/services-marketplace-schema.ts`.
  `/api/service-admin` therefore 500s and `/admin/services` renders empty.
- **Behaviour to recover:** add the two columns (they are authored in the UI) or drop them from the
  projection.

### B.6.3 — Request status-history endpoint is unauthenticated · P0
- **IDs:** SVC-047
- **Current:** `cur/app/api/service-requests/[id]/history/route.ts:10-17` has no session check while
  every sibling route has one. No old equivalent existed — this is a new defect on a new endpoint.
- **Behaviour to recover:** the participant check its siblings use.

### B.6.4 — Provider-side authorization and status defects · P1
- **IDs:** SVC-013 · SVC-018 · SVC-021 · SVC-065 · SVC-086 · SVC-147
- **Current:** `setProviderStatus` performs no transition validation while `canTransitionProvider`
  exists; portfolio POST additionally requires `SERVICE_PROVIDERS_MANAGE`, which a provider does not
  hold; `is_accepting_requests` is never read by matching; the mark-contacted route requires the
  **customer** although `providerIgnoreMatch` is a provider action; `jobs_completed` increments only
  when the provider performs the transition; and the email-change re-key omits
  `service_listings.provider_user_id` and `service_message_participants.user_id`.
- **Behaviour to recover:** each of the six, individually small and individually load-bearing.

## B.7 — Auctions

### B.7.1 — The closed-auction organizer chicken-and-egg · P0
- **IDs:** AUC (organizer policy) · AMRS-024 · AUTH-045
- **Current:** creating a 72-hour closed (`fixed`) auction requires **all** of: an organization that
  is `active` and of type `real_estate`/`law_office`; the caller as an `active` member with role
  `owner`/`admin`/`manager`; a non-expired `verified` record of type `organization` or `license`; and
  a live row in `limited_auction_organizers` (`cur/lib/auctions/policy.ts:86-145`, enforced at
  `cur/app/api/auctions/route.ts:196-203`). But the grant is `super_admin`-only
  (`cur/app/api/admin/auction-organizers/route.ts:13,62`), the only super-admin bootstrap is broken
  (B.5.5), the verification record can only be approved through an API with **no screen** (A.2.8),
  and `verification.review` is not in the permission catalogue at all
  (`cur/src/constants/permissions.ts`) so it cannot be delegated. **On a clean deployment no closed
  auction can ever be created.**
- **Behaviour to recover:** fix the seed (B.5.5), add `verification.review` and
  `organizations.review` to the catalogue, and ship the verification review screen — in that order.

### B.7.2 — Auction contract mojibake and dual representation · P0
- **IDs:** AUC-046 · AUC-047
- **Current:** `auction_contracts.content` holds correct Arabic plain text and `.document_html` holds
  mojibake Arabic, each with its own SHA-256, and `sign` validates against
  `document_hash ?? content_hash` (`cur/app/api/auctions/[id]/contract/sign/route.ts:51`) — so the
  signed artefact may be the unreadable one.
- **Behaviour to recover:** correct encoding on the HTML path and a single canonical hashed artefact.
  Whether the document is a legal instrument is F.114.

### B.7.3 — Nothing closes an expired auction · P0
- **IDs:** AUC-040
- **Current:** the end time is server-authoritative against early closing and late bidding
  (`cur/app/api/auctions/[id]/bid/route.ts:60-62`, `end/route.ts:62-64`), but the result is produced
  only when a human presses a button — an auction with a winner can sit unsettled indefinitely, which
  silently voids the 72-hour guarantee stated in the UI
  (`cur/app/dashboard/auctions/new/page.tsx:131,179`).
- **Behaviour to recover:** a scheduled closer (F.35).

## B.8 — Community, Knowledge, News, Vehicles

### B.8.1 — Community posting is broken at the entry point · P0
- **IDs:** COMM-004 · COMM-005 · COMM-009 · COMM-013 · COMM-003
- **Current:** an empty `categoryId` breaks every submission; the reply counter is never updated;
  author identity does not resolve; draft/hidden filtering is a stub.
- **Behaviour to recover:** all five, before A.10.7 opens the vertical.

### B.8.2 — Knowledge catalogue and download defects · P1
- **IDs:** KNOW-002 · KNOW-007 · KNOW-012 · KNOW-013
- **Current:** catalogue cards are dead ends; `/knowledge/new` is unreachable; the download counter
  does not increment; `isFree` gating is a stub.
- **Behaviour to recover:** all four.

### B.8.3 — News ticker rotation cadence · P2
- **IDs:** NEWS-029
- **Old:** `hist/old-tag/src/components/NewsTicker.tsx` scrolled continuously.
- **Current:** the rewrite is a slide carousel whose interval is mis-derived from the old animation
  duration, holding each headline 18–35 s. Accessibility improved; reading cadence regressed.
- **Behaviour to recover:** derive the interval from a per-item dwell time, keeping the accessible
  slide model.

### B.8.4 — Vehicles route and ad family · P2
- **IDs:** VEH-004 · VEH-016
- **Current:** the index does not link to the detail page, and the route is an orphan with a
  mislabelled ad family.
- **Behaviour to recover:** both, or park the vertical behind a flag (F.31).

## B.9 — Identity, i18n and platform

### B.9.1 — Admin-managed translation reaches only part of the UI · P0
- **IDs:** I18N-013 · I18N-014
- **Current:** the pipeline is genuinely wired — the admin console
  (`cur/app/admin/i18n/i18n-admin-client.tsx:133`) POSTs to `/api/i18n/admin/values`
  (`route.ts:18`, gated by `I18N_EDIT`), which upserts and invalidates (`:39`), and
  `GET /api/i18n/{locale}` merges DB rows over the static fallback
  (`cur/lib/i18n/core.ts:53-57`). But the same hook also returns `copy = translations[locale]`
  (`cur/src/components/services/useServicesPage.tsx:138`) — a compile-time import — and that is what
  the flagship pages render: `cur/app/page.tsx:16` contains **zero** `t()` calls; only 21 of 53 hook
  consumers call `t(` at all; the static fallback is flattened only under the `home.` prefix
  (`cur/lib/i18n/core.ts:11-33`); the DB is populated only by a manually run seed
  (`cur/scripts/seed-i18n.ts`); the row cache is not invalidated on save (60 s staleness,
  `cur/lib/i18n/db.ts:19-30`); and invalidation is process-local.
- **Behaviour to recover:** migrate the `copy` consumers onto `t()`, widen the flattening, put the
  seed in a migration path, and make invalidation cross-instance (F.10 scope question).

### B.9.2 — Legacy MySQL signup-OTP path stranded · P2
- **IDs:** AUTH-012
- **Current:** `cur/app/api/auth/verify/route.ts` still targets MySQL with purpose `signup`, a purpose
  no current writer emits; the live flow is the PG token flow
  (`cur/app/api/auth/verify-email/route.ts`).
- **Behaviour to recover:** retarget or retire the route so no verification path silently dead-ends.

### B.9.3 — Onboarding discards the account-type choice · P0
- **IDs:** AUTH-017 · ORG-005
- **Current:** `cur/app/onboarding/page.tsx:44-47` and
  `cur/app/api/auth/onboarding/complete/route.ts:28` drop the office/company/professional selection,
  while an unimported wizard component does send it
  (`cur/components/onboarding/OnboardingWizard.tsx:12-22`).
- **Behaviour to recover:** persist the choice (see A.7.5).

### B.9.4 — Commercial audit trail is unsearchable · P1
- **IDs:** COMM-LEG-017
- **Current:** every commercial admin action is written to `audit_logs`
  (`cur/lib/services/audit.ts:13-31`) while the admin audit console reads `audit_events`
  (`cur/app/api/admin/audit/route.ts:86-87`) — writers and viewer are cross-wired, so the commercial
  trail exists and cannot be read.
- **Behaviour to recover:** point the console at both stores, pending the consolidation in E.6 /
  F.88.

### B.9.5 — Public organization directory returns nothing · P0
- **IDs:** AMRS-008 · ORG-001 · ORG-004 · AMRS-043
- **Current:** the UI sends `country=om` (lower case —
  `cur/src/components/services/useServicesPage.ts:41`, `cur/app/directory/page.tsx:59`) against
  uppercase stored codes (`cur/app/api/amrs/organizations/route.ts:98`), so the public directory is
  empty; six directory filters (`entityType`, `organizationType`, `classification`,
  `reputationLevel`, `isVerified`, `sortBy`) are accepted and silently ignored
  (`cur/lib/amrs/directory.ts:43-65,91-95`); AMRS rate limits are declared and applied to nothing
  (`cur/lib/amrs/security.ts:23-30`).
- **Behaviour to recover:** normalise the country code, implement or reject the six filters, and
  apply the declared rate limits.

### B.9.6 — Test execution · P1
- **IDs:** AMRS-068 · FML-048 · TOOL-026 · ADS-097 · SVC-163 · PROP-074
- **Current:** `cur/package.json:13` enumerates 19 of 79 test files; 13 AMRS files (3,472 lines),
  every land/geo/tool file, the ads suites and the property suites do not run, and three
  `tests/organizations-*-f{1,2,3}.test.mjs` files are regex-over-source assertions rather than
  behavioural tests (Phase 0: 22 failures across everything that does run).
- **Behaviour to recover:** run the whole suite and convert the source-grep assertions to behaviour.

---

# C. MERGE OLD CAPABILITY INTO THE NEW ARCHITECTURE

Old behaviour that must survive, but **not** by resurrecting the old component. Each row names the
target module in the *current* architecture that must absorb the capability.

**C.1 — Land row-accumulation and legacy patterns → the resolver's evidence layer.** FML-017/018.
Merge the old all-patterns accumulation, the Arabic point-label pattern and the header-less
3-column pattern (`hist/old-tag/src/lib/tools/land-analysis.ts:79-113`) into
`cur/lib/geo/evidence-extraction.ts` and `cur/lib/land/intelligence/strategy.ts` — **not** into a
resurrected `LandMapper.tsx` and not into the tool-side `src/lib/tools/land-analysis.ts` copy. The
resolver is the only path with zone inference, coordinate-order protection and geodesic area, so a
restored pattern must inherit those checks.

**C.2 — Legacy document readers → the resolver.** FML-004. Fold the DXF / KML / KMZ / CSV / TXT /
DOCX readers of `cur/app/api/land/analyze/route.ts:17-27,44-77,166-186` into
`cur/lib/land/intelligence/resolver.ts` as input adapters, then make `/api/land/analyze` and
`/api/geo/extract` thin wrappers over the resolver rather than three parallel parsers.

**C.3 — Old sponsor commercial model → the advertiser console.** ORG-024…ORG-030, ADMIN-055. Rebuild
the six APIs against the contracts in `cur/src/types/sponsor.ts:80-190` and mount them as **tabs on
the existing `cur/app/admin/advertisers/[id]` detail screen** — do not build a second console and do
not restore `app/admin/sponsors/**`.

**C.4 — `sponsor_users` roles → `organization_members`.** AUTH-050, PROF-017. Migrate the old
viewer/editor/manager/admin roles onto `cur/lib/db/schema.ts:138-140` and expose them through
`cur/app/api/amrs/organizations/[id]/members/route.ts:126-170`, retiring the parallel
`advertiser-users` write path once the data has moved.

**C.5 — Old sponsor business-identity fields → `organizations`.** ORG-014. Add
`commercial_registration`, `tax_number`, `sponsor_code` and the structured address to
`cur/lib/db/pg-identity-schema.ts:158-187`, then have `cur/lib/amrs/workspace-profile-api.ts:19-36`
own the editing — not `cur/app/api/companies/[id]/profile/route.ts`, whose authorization is weaker.

**C.6 — Two verification queues → one.** AMRS-024, ADMIN-010. Keep the transactional, audited,
`organizations.verified_at`-syncing implementation
(`cur/lib/amrs/organization-verification.ts:78-178,180-221`) and retire the event-log-only twin
(`cur/lib/amrs/verification.ts:360-480,163-177`); expose exactly one admin API and build the single
review screen on it.

**C.7 — Old `/api/services/*` contract → the `/api/service-*` generation.** SVC-082, SVC-092,
SVC-097…099, SVC-095. Implement the three missing targets (`/api/service-orders/[id]`,
`/api/service-orders/[id]/review`, `/api/service-disputes`) as adapters over
`cur/lib/services/marketplace.ts` and `cur/lib/services/core.ts`, keeping the old URLs alive as
proxies with their original envelopes and error codes.

**C.8 — `lib/services/core.ts` remnants → `lib/services/marketplace.ts`.** The orphaned duplicates
(create offer `:323-356`, accept offer `:366-406`, add review `:434-458`, update order status
`:408-430`) must be reduced to delegation shims like the messaging one at `:518-531`, so no second
implementation of a write path survives. The dispute functions (`:477-511`) are the exception — they
are the *only* implementation and must be exposed, not deleted.

**C.9 — Old messaging contract → family B.** MSG-056. Keep the `app/api/service-messages/**` routes
and the `service_message*` tables as canonical, and merge family A's superior schema —
attachments, per-participant `last_read_at`, `is_archived`, message `type`, `metadata`
(`cur/lib/db/schemas/messages-schema.ts:9-14,21,31-32,38-47`) — into
`cur/lib/services-marketplace-schema.ts:283-300` rather than migrating to family A.

**C.10 — The nine-context taxonomy → `message-contexts.ts`.** MSG (contexts). Merge the icons,
colours, labels and the `office`/`company` contexts of
`cur/lib/services/messaging/deep-links.ts:1-69` into
`cur/lib/services/message-contexts.ts:19-27,64-81`, preserving the legacy storage values `request`
and `order` verbatim (asserted at `cur/tests/messages-contract.test.mjs:46-47,209-210`).

**C.11 — Old country-based sponsor rendering → the standard ad layout.** ADS-007/009. Rebuild the
identity block as a placement inside
`cur/src/components/ads/standard-public-ad-layout.tsx` and the registry at
`cur/src/config/standard-public-ad-registry.ts`, so it inherits the current density and
safe-zone rules instead of being hand-placed in `app/page.tsx` as it was in `hist/old-main`.

**C.12 — Abandoned auction persistence → the property-backed model.** AUC-037/038. Merge
`auction_participants` and the `isAutoBid` flag from
`ref/akarpromax-source/lib/auctions/auction.engine.ts:23,35,43-47` into the live
`properties.auction_*` + `auction_bids(property_id)` + hardening-table model, and stop generating
against `cur/lib/db/schemas/auctions-schema.ts` (`cur/drizzle.config.ts:13`).

**C.13 — News ticker models → one engine.** NEWS-031/033. Migrate `news_ticker_items` and its
`page_targeting`/`geo_targeting`/`speed` semantics into `news` + `news_placements`
(`cur/lib/news/schema.ts:11,126`) and keep a single `NewsTicker` component, rather than two
components with the same export name reading two tables.

**C.14 — Old sponsor asset upload → one storage service.** ADS-008, COMM-LEG-035/036. Rebuild
`hist/old-tag/app/api/sponsor-assets/route.ts:1-171` (magic-byte sniffing, 4 MB cap, deterministic
keys, post-upload verification fetch) as a capability of the fixed storage layer behind
`cur/lib/runtime-assets.ts`, shared by advertiser logos, organization logos, advertiser documents,
property images and message attachments — not as a fourth uploader.

**C.15 — Old `office_links` licence identity → `office_devices`.** OFFICE-021/022. Merge licence-key
identity into `cur/lib/integration/device.ts` by populating `legacy_link_id`
(`cur/lib/integration/schema.ts:226`) during a one-time redemption, keeping
`cur/app/api/office-links/route.ts` alive read-only for reconciliation.

**C.16 — Desktop rich property model → the canonical property store.** PROP-072, RADAR-008. Merge
the desktop's geometry (`PropertyGisPolygons`, `Coordinates`, `PropertyBounds`) into whichever store
wins F.70, with a UTM→WGS84 projection at the sync boundary
(`cur/lib/integration/sync.ts`), so the radar's `latitude`/`longitude` filters can see office data.

**C.17 — Four Haversine copies and four coordinate/area utilities → one geo library.** GEO-014.
Merge `cur/lib/integration/radar.ts:6`, `cur/lib/land/surveyor-discovery.ts:6`,
`cur/lib/ads/geo.ts:7` and `cur/lib/land/geo/coordinate-utils.ts` — and `shoelaceArea`/`toUtm`/
`fromUtm` from `cur/src/lib/tools/land-analysis.ts`, `cur/lib/geo/geometry.ts`,
`cur/src/lib/cad/coordinates.ts` — into `cur/lib/geo/` as the single geodesic library.

**C.18 — Static geo and currency lists → the DB hierarchy.** GEO-013, CUR-003. Merge
`cur/src/data/locations.ts:29-53` and the inline arrays in
`cur/components/properties/PropertyWizard.tsx:76-81` and
`cur/src/components/land/LandSearchPage.tsx:43-47` into `cur/lib/db/schemas/geo-schema.ts` +
`currency-schema.ts`, keeping the 23-entry list as seed data rather than as a parallel runtime
source.

**C.19 — Legacy `copy` dictionary → `t()`.** I18N-013/014. Merge `cur/src/data/translations.ts` into
the i18n bundle path (`cur/lib/i18n/core.ts`) and migrate the six direct importers and every page
that destructures `copy`, so the admin console's edits actually reach rendered copy.

**C.20 — Desktop-only commercial concepts → the platform's existing primitives.** COMM-LEG-046…058.
Where a desktop capability is brought to the web, merge it into the existing web primitive rather
than porting the SQLite table: `ESignatures` → the auction signature ledger
(`cur/lib/db/schemas/auction-hardening-schema.ts`) generalised to any document; `LeadClaims` →
`cur/lib/db/schemas/leads-schema.ts`; `MaintenanceTickets` → the services job model; `TaxFeeTypes` →
the invoice tax split of A.1.5. Each is gated on its F-item.

---

# D. CURRENT IS BETTER — PRESERVE CURRENT

These are the improvements the current tree has over every older version. They are **forbidden
regressions**: restoring an old behaviour must never remove one of them. Each entry states the
guard.

**D.1 — Zone-less UTM zone inference.** FML-022. `cur/lib/land/intelligence/resolver.ts:98-113`
brute-forces zones 1–60 against country bounds, abstains on ties and warns the user (`:235`). The old
parser silently defaulted to zone 39 (`hist/old-tag/src/lib/tools/land-analysis.ts:28-41`).
*Guard:* no restored pattern (B.1.1–B.1.3) may reintroduce a silent zone default.

**D.2 — Constraint-verified OCR numeric repair.** FML-023. `cur/lib/geo/evidence-extraction.ts:90-274`
generates 1–2 edit variants and scores them against declared side lengths and area. The old build did
blind letter→digit substitution (`S→5`, `B→8`, `Z→2`, `G→6`, `l/I/!→1`,
`hist/old-tag/…/land-analysis.ts:16-22`). *Guard:* the blind substitution must not come back; if its
recall is wanted, add the candidates as *variants* into the constraint scorer.

**D.3 — Geodesic area with a registered-area cross-check.** FML-030. `cur/src/components/tools/FindMyLand.tsx:343-390`
plus `cur/lib/land/intelligence/strategy.ts:47-63,153-167`. The old shoelace ran on degrees and was
simply wrong (`LandMapper.tsx:160-162`). *Guard:* the restored perimeter (A.5.4) must be geodesic too.

**D.4 — Coordinate-order and plausibility protection.** FML-028.
`cur/lib/land/intelligence/coordinate-protection.ts:1-65` applied at `resolver.ts:260-277`, with
country bounds at `cur/lib/geo/geometry.ts:6-30`. *Guard:* every restored input path — paste (A.5.2),
map click (A.5.6), DXF/KML (A.5.5) — must pass through it.

**D.5 — CRS detection, decimal-separator recovery, polygon validation, upload security gate.**
FML-027 / FML-026 / FML-029 / FML-044. `crs-detector.ts:18-129`, `evidence-extraction.ts:52-74`,
`geometry-builder.ts:21-105`, `security-gate.ts:14-115`. All net-new; all must survive C.1/C.2.

**D.6 — The 8-step service request wizard.** SVC-038/039. `cur/app/service-requests/new/page.tsx:31-53`
with per-step validation, progress and Arabic step labels; the old build had a single flat five-field
form (`hist/old-tag/app/services/page.tsx:53-57,120`). *Guard:* fixing B.6.1 must not simplify the
wizard.

**D.7 — The 10 km matching policy.** SVC (matching). `cur/lib/services/match-score.ts:62,93,99-100,111,117-121`
is stricter than any earlier generation (the 2026-08-14 snapshot had no cap at all). It is a genuine
improvement in match quality **and** an open product question — see F.41. *Guard:* if the radius is
widened, the cross-city rejection and the "no coordinates ⇒ same city only" rule must stay explicit
rather than silently disappearing; and the provider-facing 50 km default
(`cur/lib/services/marketplace.ts:116,140`) must be reconciled either way.

**D.8 — Auction hardening: policy, terms catalogue, award snapshot, settlement.** AUC-041…AUC-050.
`cur/lib/auctions/policy.ts:86-145`, `cur/lib/db/schemas/auction-hardening-schema.ts:5-63`,
`cur/lib/auctions/settlement.ts:44-89,218-275`, `cur/drizzle-pg/0011_auction_hardening_f1.sql`.
Winner determination with an earliest-wins tiebreak, the no-bid outcome, the seller decision step and
server-authoritative end times are all new. *Guard:* B.7.1 must be fixed by making the grant path
reachable, never by relaxing `policy.ts`.

**D.9 — The contract signature ledger.** AUC-049. Hash-bound party acceptance plus
`auction_contract_signatures`. *Guard:* generalising it to other documents (C.20) must preserve the
hash binding.

**D.10 — The standard 8-slot public ad layout and the placement registry.** ADS-069/071/072/073/070.
`cur/src/config/standard-public-ad-registry.ts:26-59`, `cur/src/constants/advertising.ts:176-291`
(212 keys, roughly double the old surface), canonical-placement fallback at `:293-307`, rendering at
`cur/src/components/ads/standard-public-ad-layout.tsx:64-68`. *Guard:* restoring `requestable` slots
(A.4.1) must extend the registry, not reintroduce the six-key legacy list
(`cur/src/config/ad-placements.ts:36-43`).

**D.11 — The ads engine itself.** ADS (engine). 489 → 759 lines with channels, tablet targeting,
region/district, radius, day-parting, house ads, inventory health and signed tracking tokens.
*Guard:* the F.14 merge must land **on** this engine.

**D.12 — The AMRS contracts layer.** AMRS-001/002/030/032/023. A shared type vocabulary, an
organization DTO contract, per-type verification expiry defaults
(`cur/lib/amrs/contracts/common.ts:86-94`), weighted reputation scoring
(`cur/lib/amrs/reputation.ts:56-83,447-481`) and the one-pending-per-subject constraint. *Guard:* the
C.6 consolidation must keep the contracts layer as the shared vocabulary.

**D.13 — The device pairing scheme.** AUTH-057, OFFICE-001…OFFICE-007, OFFICE-026. Pairing codes with
single-use enforcement, expiry semantics across backends, rate-limited redemption, `apd_` bearer
credentials, scope gating and protocol versioning — none of which the old licence-key model had.
*Guard:* A.12.1/A.12.2 compatibility shims must be additive; the licence-key path must not become
the credential again (see `cur/docs/integrations/OFFICE_LINKS_DECISION.md`, HISTORICAL ONLY).

**D.14 — Security headers, origin guard and the auth rate limiter.** AUTH-033/034/035.
`cur/lib/security/rate-limit.ts:5-39` applied in every `app/api/auth/*` handler and
`cur/lib/security/origin.ts:45-92` called at the top of each. *Guard:* every route restored in A must
adopt them; the AMRS limiter that declares configs and applies them nowhere
(`cur/lib/amrs/security.ts:23-30`) should be merged into this one, not the reverse.

**D.15 — PG identity schema v5.** AUTH-055. `cur/lib/db/pg-identity-schema.ts:3-17,62-351,401-444` —
uuid primary keys, typed account states, verification challenges, session revocations. *Guard:* the
restored commercial tables (A.1) must key on `users.id`, not on the e-mail keyspace, or F.39 is
answered by accident.

**D.16 — Everything else the current tree does better, briefly.** Image preprocessing and survey-table
re-OCR in FindMyLand; per-cell OCR confidence; 16-field deed extraction (vs 4);
clipboard/native-share/WhatsApp export; surveyor discovery and quoting as a concept; the central
cross-context messaging inbox with unread counts; the seven-context taxonomy; server-side message
validation limits; the outbox hook; identity re-key on e-mail change; the news engine (a strict
superset of the old 318-line route); the admin ads wizard workspace; auction terms versioning; the
advertiser requests queue; email verification before login (replacing auto-login); and the removal of
first-user auto-super-admin. Each is a `KEEP` or `KEEP + IMPROVE` row in the matrix and none may be
traded away to satisfy an item in A or B.

---

# E. DUPLICATE IMPLEMENTATIONS TO CONSOLIDATE

One table. "Canonical today" is what actually serves users now — not what should win. The
consolidation note names the target; where the target is a product decision it points at F.

| # | Subsystem | Implementations (paths) | Data models | Canonical today | Consumers | Consolidation note |
|---|---|---|---|---|---|---|
| E.1 | Messaging (3 families + 1 dead taxonomy) | A: `cur/app/api/messages/route.ts` + `[id]/route.ts` · B: `cur/app/api/service-messages/route.ts` + `threads/**` · C: proxy `cur/app/api/services/messages/route.ts` · taxonomy `cur/lib/services/messaging/deep-links.ts:1-69` | A: `message_threads`/`message_participants`/`messages`/`message_attachments` (`cur/lib/db/schemas/messages-schema.ts:4,17,26,38`, **no migration**) · B: `service_messages`/`service_message_threads`/`service_message_participants`/`service_outbox_events` · C: none | **B** (email identity key) | A: `app/messages/**` (reads keys the API never returns) · B: `app/dashboard/services/inbox`, `ThreadMessages.tsx`, `StartThreadButton.tsx`, `service-jobs/[id]` · C: none in-repo | Keep B's routes; merge A's schema (attachments, per-participant `last_read_at`, archive, type, metadata) into B's tables; keep C as a URL shim and restore its GET (B.3.1); fold `deep-links.ts` into `message-contexts.ts` (C.10). Identity key is F.51; `/messages` as a public route is F.49 |
| E.2 | Services API (2 generations) | old `cur/app/api/services/*` over `cur/lib/services/core.ts` (531 lines) · new `cur/app/api/service-*` over `cur/lib/services/marketplace.ts` (2,157 lines) | `cur/lib/services-schema.ts:2-118` (raw SQL) + `cur/lib/services-marketplace-schema.ts:91-341` (ALTERs on it) + `cur/lib/db/schemas/services-schema.ts:4-125` (Drizzle-pg, **never migrated**) | **new generation** — no UI file calls any `/api/services/*` path | all services UI uses `/api/service-*`; `/api/services/*` serves external/legacy callers only | Keep the new generation; implement the three missing proxy targets (C.7); reduce `core.ts` to shims except disputes and listings, which are its only implementations; drop the third Drizzle-pg model or migrate it (it is why `/api/services` root and `/api/service-analytics` 500). Contract question is F.43 |
| E.3 | Advertising (2 engines, incompatible schemas) | D1 raw-SQL `cur/lib/ads/engine.ts` behind `/api/ads/match` · Drizzle-pg `cur/lib/advertising/core/matching.engine.ts:18-35` behind `/api/advertising/match` | `cur/lib/ad-schema.ts:1-134` (~100 columns) **vs** `cur/lib/db/schemas/advertising-schema.ts:5-33` (`name`/`type`/`targeting` jsonb) — **same table names, mutually unreadable** | **D1 engine** (approval, budgets, frequency, device, language, channel, day-parting, signed tokens) | D1: `AdSlot` on every standard page · pg: `components/advertising/placements/{AdHero,AdSidebar,AdBottom,NewsTicker,FeaturedProperties}.tsx` on `/community/[id]`, `/companies/[id]`, `/knowledge/[id]`, `/tools/[id]`, `/tools/pdf2word` | `CREATE TABLE IF NOT EXISTS` means whichever runs first wins and the other silently misreads. Merge onto the D1 engine (D.11) and port the two pg-only concepts (news ticker, featured properties) into it as placements. **F.14** |
| E.4 | Ad event tracking (3 paths) | `/api/ads/{impression,click,conversion}` · `/api/advertising/track` + `/api/advertising/match` POST · `/api/ad-events` | `ad_impressions`/`ad_clicks`/`ad_conversions` · `ad_analytics` · `ad_events` (+ orphaned `sponsor_events`) | **`ad_impressions`/`ad_clicks`/`ad_conversions`** (token-signed) | admin analytics reads `ad_events`; advertiser console reads `sponsor_events` (always zero) | One signed writer; migrate `ad_events` and `ad_analytics` readers onto it; decide `sponsor_events` in B.4.3 / F.8. Close the unauthenticated `/api/advertising/track` writer immediately |
| E.5 | Land parsing (3 live + 1 dead) | `cur/lib/land/intelligence/resolver.ts:115` (via `/api/land/resolve`) · `cur/lib/geo/pipeline.ts:145` + `/api/geo/extract` · `cur/lib/land/ocr/ocr-engine.ts:21` + `/api/land/analyze` · `cur/src/lib/tools/land-analysis.ts:91` + `cur/src/components/tools/LandMapper.tsx` (0 importers) | evidence/strategy model · pipeline model · OCR-engine model · tool-parser model | **resolver** | FindMyLand UI → resolver; the other two endpoints are publicly reachable HTTP; LandMapper is unreferenced | Keep the resolver; fold `/api/land/analyze`'s DXF/KML/KMZ/CSV/DOCX readers into it (C.2); make `/api/geo/extract` a wrapper; merge LandMapper's accumulation and Arabic patterns into the evidence layer (C.1) |
| E.6 | Audit logging (4 systems) | `cur/lib/content-schema.ts:53` `audit_logs` (raw SQL) · `cur/lib/security/audit.ts:98,107` `audit_events` (Drizzle) · `cur/lib/audit/audit.service.ts:19` (0 importers) · `cur/lib/amrs/security.ts:137-167` (in-memory array) | four | **`audit_logs` + `audit_events` both write** | viewer `cur/app/api/admin/audit/route.ts:86` reads `audit_events` **only** — commercial actions are invisible | One store. Until then, point the viewer at both (B.9.4). Persist the AMRS in-memory log into it; delete or adopt `audit.service.ts`. **F.88** |
| E.7 | Identity keyspaces (4) | `users.id` uuid (`cur/lib/db/schema.ts:3-25`) · `sponsor_access.email` (`cur/lib/content-schema.ts:13-21`) · services `*_user_id` = lower-cased e-mail (`cur/lib/services/identity.ts:28,52-73`) · `office_device_credentials.sponsor_id` (`cur/lib/integration/device.ts:14-22`) | four, uncorrelated, no join table | **all four, live** | sessions carry `users.id`; admin edits `sponsor_access`; services join on e-mail; devices on `sponsor_id` | `cur/lib/auth/verification-actions.ts:315-317` already hand-rolls a re-key on e-mail change across 22 tables — evidence the e-mail key is load-bearing and fragile, and it still misses two columns (B.6.4). **F.39** |
| E.8 | Storage mechanisms | R2 via `cur/lib/runtime-assets.ts:2` (`cloudflare:workers`, throws under Node) · free-text URL fields (`organizations.logo_url`/`cover_url`, advertiser logo input) · in-memory `Map`s (`cur/lib/land/saved-land.ts:3`, `cur/lib/land/quote.ts:3`) · discarded bytes (`cur/app/api/office/v1/media/route.ts`) | four | **URL fields** — the only one that survives a request | advertiser admin, organization profiles, FindMyLand save, office media | One storage service behind `runtime-assets` with a Node adapter (C.14); every uploader (logos, documents, property images, message attachments, office media) uses it |
| E.9 | Property tables | Postgres `properties` (`cur/lib/db/schemas/properties-schema.ts:5` + `cur/app/api/properties/route.ts`) · SQLite/D1 `property_listings` (`cur/lib/properties-schema.ts:27` + `cur/lib/integration/sync.ts:109` + `cur/lib/integration/radar.ts:72` + `cur/app/api/admin/properties/taxonomy/route.ts:39-47`) | two, in different databases | **both**, for different consumers | public site + office workspace read `properties`; sync, radar, taxonomy admin and ads read `property_listings` | Office-synced listings are invisible everywhere a human looks. Single canonical store required. **F.70 / F.80** |
| E.10 | Schema creation | Drizzle migrations `cur/drizzle-pg/*.sql` (0004–0010 **missing**, journal still lists 0004–0006) · 11 runtime `ensure*Schema` paths (`cur/lib/content-schema.ts:593-594`, `cur/lib/mysql-runtime.ts:630-649`, services ×2, i18n, ads, news, properties, company, integration) | two regimes; six tables defined **twice incompatibly** (`ad_campaigns`, `ad_creatives`, `service_requests`, `service_offers`, `service_categories`, `service_reviews`) | **the ensure-paths** — they run on boot | everything | Restore 0004–0010 (A.9.9), then converge on one regime and resolve the six collisions. Note the MySQL gap: `ensureMysqlSchema` omits `ensureCompanySchema` and `ensureIntegrationSchema`, so under `DB_PROVIDER=mysql` the company and all nine `office_*` tables are never created. **F.112** |
| E.11 | Tools | registry `cur/src/data/toolsData.ts` + `cur/src/components/tools/*` · `cur/app/tools/[id]/page.tsx:5-30` (a second tool set with placeholder maths) | two | **both routed** | the hub uses the registry; `/tools/[id]` is directly addressable and renders `AdSidebar` unconditionally (`:3`), bypassing `ToolAdPolicy.tsx` | Redirect the `/tools/[id]` ids onto the registry components, then retire the duplicate set; while doing so, re-mount `ToolsGate` (A.5.1) and `ToolAdPolicy` |
| E.12 | Organization profile pages / directory queries | `cur/app/organizations/[id]/page.tsx` **and** `cur/src/components/public/organization-profile-page.tsx:76` · discovery `cur/app/organizations/page.tsx` **and** `organization-discovery-page.tsx:72` · AMRS `listOrganizations` (`cur/lib/amrs/organization.ts:175-210`) **vs** bespoke `cur/app/api/offices/route.ts:9-41` and `cur/app/api/companies/route.ts:9-41` (the same 41-line file with one predicate changed) | one table, three response shapes (`{organizations,total}` vs `{success,data,total,page,limit}`) | **the `app/` routes** | public directory pages | The unimported `mode`-parameterised components are the richer implementation (offices/companies split). Adopt them, and serve all three directories from `listOrganizations` with one envelope |
| E.13 | Currency lists | DB seed of 12 (`cur/scripts/seed-currency-data.ts:5-16`) · static 23 (`cur/src/data/locations.ts:29-53`, 0 importers) · `geo-schema.ts:12` default `'OMR'` · desktop `CountryConfigs.DefaultCurrency` (8 rows) | four | **none at runtime** — `/api/currencies` and `/api/currencies/convert` have zero callers, and the migration that creates the table is missing | nothing reads any of them | Pick the list (**F.25**), make the seed a migration (A.9.9), and restore the header chip (A.13.1) so at least one consumer exists |
| E.14 | Saved searches | `cur/app/api/saved-searches/route.ts` + `[id]` + `[id]/notify` **vs** `cur/app/api/properties/saved-searches/route.ts`; pages `cur/app/dashboard/saved-searches/page.tsx` **vs** `cur/app/dashboard/properties/saved-searches/page.tsx` | one table, two APIs, two pages | **both** | both routed | One API, one page; then build the matcher (A.9.7) once |
| E.15 | Reputation / profile scoring | `cur/lib/amrs/reputation.ts:56-91` (`computeScore`, thresholds 0/200/450/700/900) vs `:447-493` (policy pair) vs `cur/lib/services/reputation/reputation-extended.ts:8-140` (0/100/300/600/1000, 0 importers); completeness `cur/lib/amrs/profiles.ts:28-144` vs `cur/lib/amrs/contracts/profile-strength.ts:13-34` | same three tables, different scales and field catalogues | **the policy pair**; neither completeness scorer is called from a route | `evaluateReputation` | One scale (**F.89**), one field catalogue, one entry point |
| E.16 | Property create/edit forms and cards | `cur/components/properties/PropertyForm.tsx`, `PropertyFormWithOffers.tsx`, `PropertyWizard.tsx`, plus the inline form in `cur/app/dashboard/properties/new/page.tsx`; cards `PropertyCard.tsx` (status chips + delete) vs `cur/src/components/ui/LuxuryPropertyCard.tsx` | one model | **`PropertyFormWithOffers`** (edit) + the inline `new` page; `LuxuryPropertyCard` | dashboard | One form (the wizard is the richest) and one card — `LuxuryPropertyCard` currently lacks the status and delete affordances that `PropertyCard` has |
| E.17 | Admin navigation and consoles | 3 navigations (`cur/app/admin/admin-sidebar.tsx:27-81`, `cur/src/config/sidebar.ts:105-138`, `cur/src/components/AdminPageShell.tsx:18-27`, the third nested **inside** the first on two pages) · 2 advertising consoles · 2 advertiser consoles (`_components/*` over `sponsor_profiles` vs `advertiser-admin-client.tsx` over `sponsors`+`sponsor_access`) · 2 layouts (`app/admin/layout.tsx` vs the empty `app/(admin)/layout.tsx`) | — | the rendered sidebar and `_components/*` | admins | One navigation, one advertising console (**F.14**), one advertiser console; remove the 25 sidebar entries that 404 only **after** the replacements exist (**F.38**) |

---

# F. PRODUCT-OWNER DECISION REQUIRED

Every abandoned commercial capability and every ambiguous product question, as a question with
options and the consequence of each. **No decision is proposed here.** Items marked P0 block Phase 1.

### F.1–F.7 — The advertiser commercial back office (one question each)
The seven tables are created on every boot (`cur/lib/content-schema.ts:280-404`), the TypeScript
model is intact (`cur/src/types/sponsor.ts:80-190`), the permissions are grantable, and every API and
screen is gone. For each: **restore the capability, supersede it with an external system, or retire
the table and stop creating it?** Consequence of restoring: a billing product with a plan catalogue
and enforceable quotas. Consequence of retiring: `/admin/settings` stays empty, the three permissions
stay inert, and `app/api/admin/stats:70` must stop counting plans.
- **F.1 Plans** (COMM-LEG-001/002/003/004, ADMIN-054) — priced tiers with monthly/yearly price,
  currency, four quota columns, Arabic feature bullets, sort order, and a **public** pricing read.
- **F.2 Subscriptions** (COMM-LEG-005/006/007, ORG-027) — trial/active/expired/cancelled/past_due,
  auto-renew, payment method.
- **F.3 Contracts** (COMM-LEG-013/014, ORG-024) — `CT-XXXXXXXX` numbering, six statuses, value +
  currency.
- **F.4 Documents** (COMM-LEG-015, ORG-025) — typed vault (CR certificate, tax certificate) with
  delete.
- **F.5 Invoices** (COMM-LEG-008/009/010, ORG-028) — `INV-XXXXXXXX`, the amount/tax/total split (the
  only tax-aware money model on the web side), due date, `paid_at`, links to subscription and
  contract.
- **F.6 Payments** (COMM-LEG-011/012, ORG-029) — method, reference number,
  pending/completed/failed/refunded.
- **F.7 Activity trail** (COMM-LEG-016, ORG-030) — per-advertiser old/new-value audit with IP and
  user agent; the writer still exists with zero callers (`cur/lib/services/audit.ts:33-59`).

**F.8 — Advertiser impression/click events (ADS-051, ANLY-008).** Restore the `sponsor_events`
writer, repoint the six readers onto `ad_events`, or remove the reporting? *Consequence:* today the
advertiser console presents permanent zeros as measurements on a billing-relevant surface.

**F.9 — The four seeded priced plans (COMM-LEG-031).** Four tiers (0 / 99 / 299 / 999 OMR per month)
are inserted into the live database on every non-production boot
(`cur/lib/content-schema.ts:517-541`, called at `:606`). Keep seeding, seed only in development, or
stop? *Consequence:* priced product data currently exists in production-shaped databases with no way
to sell, cancel or invoice it.

**F.10 — "Billing off" doctrine vs live prices (COMM-LEG-062).**
`cur/docs/marketplace/COMMERCIAL_READINESS.md:5-21` and the public copy at
`cur/src/content/public-destinations.ts:130` state there is no billing; F.9 contradicts them. Which
is the truth? *Consequence:* one of the two must change before launch copy is published.

**F.11 — Complete or reverse the `sponsor` → `advertiser` rename (COMM-LEG-030, F.65).**
`cur/lib/sponsor-auth.ts:1-11` declares the Sponsor concept removed, while 22 `sponsor_*` tables are
still created, `office_links.sponsor_id` is still the licence-ownership key, and
`cur/src/types/sponsor.ts` holds the whole commercial model. *Consequence:* every restored API in
F.1–F.7 must pick a name, and a rename is a data migration.

**F.12 — Advertiser branding: uploads or URLs (COMM-LEG-035/036, ADS-008).** Restore the 171-line R2
uploader with magic-byte validation and the post-upload verification fetch, or accept the current
free-text URL field (`cur/app/admin/advertisers/advertiser-admin-client.tsx:357`)? *Consequence:*
URL-only branding means a broken logo can be saved and served; uploads are blocked on E.8.

**F.13 — The three inert commercial permissions (COMM-LEG-026).** Re-attach
`advertisers.manage_contracts` / `manage_subscriptions` / `manage_payments` to restored APIs, or
remove them from the catalogue? *Consequence:* today the roles UI promises authority that does not
exist.

**F.14 — Which advertising stack survives (ADS-083/084, COMM-LEG-038). P0.** The D1 raw-SQL stack
(full targeting, approval, budgets, signed tracking) or the pg/Drizzle stack (news ticker, featured
properties)? *Consequence:* the two define `ad_campaigns`/`ad_creatives` incompatibly under the same
names, so whichever `CREATE TABLE IF NOT EXISTS` runs first silently corrupts the other's reads. A
merge target must be chosen before either can be trusted.

**F.15 — Ordered creative playlists (ADS-024). P0.** Does an advertiser buy "my five-slide story plays
in sequence" (old hero, commit `ee54559`) or "each campaign gets equal turns"
(`cur/lib/ads/engine.ts:536-561`)? Both are implementable; only one can be the default.
*Consequence:* this is a contract advertisers are sold, not an implementation detail.

**F.16 — Self-serve ad requests (ADS-085/086/087).** Restore the "request this slot" entry point, and
on which placements? The current whitelist is `["side_left","side_right"]` — two keys the standard
layout no longer renders. *Consequence:* without a decision the dialog, the floating actions and the
API stay preserved and unreachable.

**F.17 — Ad billing model (ADS-039/040).** `price`, `pricing_model`, `budget`, `daily_budget` and
`spent_amount` exist and are read; nothing ever spends. Bill on delivery (needs a spend writer and
`ad_daily_statistics`) or on flat contracts (then remove the CPM/CPC model)? *Consequence:* budgets
can never be exhausted today.

**F.18 — Ad density and safe zones (ADS-071/078).** Eight slots on every standard page and **no route
declared ad-free**. Confirm the density and name the routes that must stay clean (checkout, auth,
legal). *Consequence:* legal and auth pages currently carry ads.

**F.19 — The office ad channel (ADS-057, OFFICE-068).** Ship a desktop client update, or de-scope the
office channel until one exists? *Consequence:* admins can author office placements today that no
device will ever request.

**F.20 — Desktop licence and subscription ownership (OFFICE-102, COMM-LEG-040, AUTH-058). P0.** Build
`/api/program/subscription-status`, or declare the desktop licence system out of scope for the web?
*Consequence:* option A gives the web control of activation and revocation; option B leaves licensing
entirely in the binary, where the offline licence (F.22) already defeats web-side revocation.

**F.21 — Desktop sync contract (OFFICE-063/067, COMM-LEG-041, PO-3). P0.** (a) Restore
`/api/program/sync` + `/api/desktop` as compatibility shims; (b) ship a desktop release that calls
`/api/office/v1/**`; (c) both, with a migration window. *Consequence:* this decides whether five
OFFICE items are `RESTORE` or `SUPERSEDED WITH FULL PARITY`, and whether news and ads ever reach a
desktop user.

**F.22 — Offline licence (COMM-LEG-042, OFFICE-104).** Accept that `AKAR_OFFLINE_LICENSE_2026` lets a
desktop run indefinitely without network, or tighten it? *Consequence:* accepting it means
`cur/app/api/office-links/route.ts:51` revocation is advisory only.

**F.23 — Trial and activation-code flow (COMM-LEG-043/044/045).** Are `CreateTrial`/`TrialDays`, the
activation UI and the subscription lock/warning part of the web commercial model, or desktop-only?
*Consequence:* determines whether the web needs a trial state at all.

**F.24 — Geo hierarchy country coverage (ADMIN-050, GEO-008/013).** Which countries must the hierarchy
cover at launch? Only Saudi Arabia is seeded (`cur/scripts/seed-geo-data.ts`) while the UI offers 23.
*Consequence:* until this is answered, city fields stay free-text strings and no city-scoped feature
(matching, radar, directory) can be trusted.

**F.25 — The currency catalogue (CUR-002/003).** `cur/AGENTS.md:205` asserts 12; the orphaned static
map has 23 with a different membership; `geo-schema.ts:12` defaults to `OMR`; the desktop has 8. Which
list is the product truth, and is a **user-facing** currency switcher in scope (A.13.1) or is currency
purely a per-listing attribute? *Consequence:* nothing reads any list today.

**F.26 — FX rate ownership (CUR-006).** Choose a provider and refresh cadence, or drop conversion and
display listed currency only? *Consequence:* rates are hardcoded literals guaranteed to drift.

**F.27 — Turkish scope (I18N-003/026, AUC-053).** The web has full Turkish; the desktop ships ar+en;
the live auction terms table is AR/EN only although the superseded schema had `content_tr`. Is
Turkish a desktop requirement, and must legal text be trilingual? *Consequence:* a Turkish user can
read the site and not the terms they are asked to accept.

**F.28 — Locale routing (I18N-007).** Is multilingual SEO a launch requirement? *Consequence:*
without `/en/...` routing localized pages are neither linkable nor crawlable.

**F.29 — Community and Knowledge moderation (COMM-017, KNOW-008/009, ADMIN-044/045). P0.** Build
moderation before launch, or gate posting behind a role until it exists? *Consequence:* today any
authenticated session can publish forum topics and knowledge resources, force-published, with no
delete, edit, report target or admin page.

**F.30 — Knowledge publishing rights and paid resources (KNOW-013).** Who may publish, are files
hosted or externally linked, and do paid resources exist at all? *Consequence:* `isFree` is currently
unenforced and `fileUrl` is an unvalidated external link.

**F.31 — Vehicles: product or placeholder (VEH-001…VEH-007, VEH-017).** Make it a real listing
vertical (owner FK, media, moderation, messaging — roughly the Properties feature set), or park it
behind a flag? And what is its relationship to the old `/vehicle-services` module? *Consequence:* per
the product rule it may not be dropped for being outside real estate, but every part of it is mock.

**F.32 — Which news ticker survives (NEWS-031/032/033).** Retire
`components/advertising/placements/NewsTicker.tsx` + `news_ticker_items` and migrate rows into
`news`/`news_placements`, or keep it as an "advertising message strip" distinct from editorial news?
*Consequence:* two visually different tickers currently appear on the same site from different tables,
and one of the two admin screens is broken.

**F.33 — News to the desktop (NEWS-024, OFFICE-063).** (a) Build `/api/program/sync` shims that embed
news; (b) ship a desktop update calling `/api/office/v1/news`; (c) defer and mark the OFFICE_NEWS /
OFFICE_TICKER channels as not-yet-delivered in `/admin/news`. *Consequence:* the server half is
complete and no desktop user will ever see a placement created today; `AkarDB.sqlite` has no table to
cache news in either.

**F.34 — Auction bid deposits / bond / KYC (AUC-036).** Real-estate auctions normally require a
refundable bid bond. Needed for v1, or explicitly deferred with a written risk acceptance?
*Consequence:* there is no deposit, KYC or credit precondition anywhere today.

**F.35 — Who closes an expired auction (AUC-040). P0.** A scheduler, an admin action, or both? And
what happens to the 72-hour guarantee if nobody presses the button? *Consequence:* an auction with a
winner can sit unsettled indefinitely.

**F.36 — What is `/admin/users` for (ADMIN-003, AUTH-048). P0.** Does it manage platform members (the
`users` table) or advertiser-portal access (`sponsor_access`)? Options: (a) repoint the existing
screen at `users` and build a separate advertiser-access screen; (b) keep it as advertiser access and
add a second platform-members screen. *Consequence:* today the `users` table has **no** admin path
at all, and the five account states and typed block reasons cannot be set by anyone.

**F.37 — Dynamic role/permission editing (AUTH-043).** Is DB-defined role editing without redeploy a
product requirement, or is the compile-time `ROLE_CATALOG` acceptable? *Consequence:* option A
requires a migration for `admin_roles`/`admin_role_assignments`, a resolver, and real authorization
on `/api/admin/roles` (B.5.3); option B means deleting a dangerous, inert endpoint.

**F.38 — Where service supervision lives (ADMIN-017/019/020). P0.** Under `/admin/services/*` or
under `/dashboard/services/supervisor/*`? *Consequence:* `cur/src/config/sidebar.ts:83-98,118-125`
promises 25 routes and **all 25 are 404**; pick one home before building any of them, and remove the
dead entries only after the replacement exists.

**F.39 — The canonical identity key (E.7). P0.** Migrate services and `sponsor_access` onto
`users.id`, or formally declare the e-mail the canonical key? *Consequence:* today four keyspaces are
uncorrelated; the e-mail key breaks for phone-only accounts (`users.email` is nullable) and for OAuth
accounts with no provider e-mail (`cur/lib/auth/oauth.ts:229-242`). Blocks every cross-domain join.

**F.40 — Where the platform role lives (AUTH-044).** (a) `users.role` stays authoritative and the
admin screen is rewired to write it; (b) `admin_roles`/`admin_role_assignments` become authoritative.
*Consequence:* the current state is neither, so role changes made in Admin have no effect (B.5.4).

**F.41 — Provider radius: 10 km or 50 km (SVC matching). P0.** `cur/lib/services/match-score.ts:62`
caps every provider at 10 km and `:93` rejects any cross-city pair, while the provider profile writer
still defaults and promises 50 km (`cur/lib/services/marketplace.ts:116,140`) and the 2026-08-14
snapshot had no cap at all. Options: keep 10 km; make it admin-configurable per country; or restore
the per-provider radius. *Consequence:* providers are currently shown a 50 km promise the engine
silently truncates. (Also recorded in D.7 as a forbidden regression in the other direction.)

**F.42 — Who may post a service request (SVC-149). P0.** Grant `SERVICE_REQUESTS_MANAGE_OWN` to the
base `viewer`/`user` role, or introduce a `customer` role? *Consequence:* the flagship customer
journey currently ends in a 403.

**F.43 — Which services API generation is contractual (E.2). P0.** Complete the three broken proxies,
or delete `/api/services/*` and publish a migration note? *Consequence:* external callers of three
old URLs receive 404 today with no notice.

**F.44 — Are service listings a product (SVC-030).** `/api/services/listings` works end-to-end and
nothing links to it. Ship a listings UI, or retire listings and `service_bookmarks` with them?

**F.45 — Bookmarks / favourites (SVC-033, FAV-004).** Implement `/api/service-bookmarks` (the table
and the page exist), or remove `/dashboard/services/favorites`? *Consequence:* a linked page 404s
today.

**F.46 — The `instant` booking mode (SVC).** `booking_mode` is authored in admin
(`admin-client.tsx:187`) and stored (`marketplace.ts:432`) with **no instant-booking checkout** — only
quotes. Keep and build, or remove from the authoring UI?

**F.47 — Currency precision for services (SVC).** Prices are `INTEGER`
(`cur/lib/services-schema.ts:70`) and `computeTotal` rounds (`marketplace.ts:1085`). Decide minor
units or decimal storage **before** launch pricing.

**F.48 — Do disputes stay in the product (SVC-097/098/099). P0.** They exist in the database, the
service layer, a user page, a dashboard counter and the docs, and have no reachable API. Restore
`/api/service-disputes`, or retire disputes and remove the UI and the counters?

**F.49 — The canonical messaging surface (E.1).** Is `/messages` (family A) or
`/api/service-messages` + `/dashboard/services/inbox` (family B) the product's messaging surface?
*Consequence:* `/messages` has no navigation entry, is backed by tables with no migration, has no
authorization on `[id]`, and duplicates the working inbox. Retiring it or promoting it are both
one-way doors for existing rows.

**F.50 — One room per request, or one per bidder (MSG-009/010). P0.** Fix the confidentiality breach
with an `offer` context or with a composite `(request_id, provider_user_id)` thread key? *Consequence:*
both change the URL shape and existing rows; doing nothing leaves rival bidders reading each other's
prices.

**F.51 — Messaging identity key (MSG-056).** Family B stores the user's e-mail in
`sender_user_id`/`user_id`; family A stores `users.id`. A single system cannot do both. Blocks any
messaging migration. (Sub-case of F.39.)

**F.52 — `office` and `company` as first-class message contexts (MSG-004/005).** First-class (as in
`deep-links.ts:15,17`) or folded into `organization` (as in `message-contexts.ts:26`)? *Consequence:*
the divergence is why the office and company profile buttons have no handler.

**F.53 — Message attachments (MSG).** In scope before storage is fixed (E.8)? The only attachment
schema is family A's, which has no migration.

**F.54 — Which events warrant e-mail (NOTIF).** Today zero non-auth e-mails exist and
`cur/lib/email/templates.ts:15-21` has 7 auth-only templates. Which of the 16 notification event
types get e-mail, and at what digest cadence?

**F.55 — Web push and the PWA service worker (NOTIF).** `cur/src/components/PwaManager.tsx:19`
registers `/sw.js`, which is not in the repository. Ship the worker or remove the registration?

**F.56 — Who may start a conversation with whom (MSG-049). P0.** Only entity owners may be added; an
invite/accept handshake; or rate-limited cold outreach? *Consequence:* today anyone can enrol anyone
into any thread.

**F.57 — Message retention and admin visibility (MSG-032/041).** Messages are never deleted, never
searchable by admins and not reportable. Is admin read access acceptable under the intended privacy
posture, and what is the retention period?

**F.58 — Is AMRS a product or a library (AMRS).** Today organizations live in Postgres under AMRS
while professionals live in D1 `service_provider_profiles` and AMRS verification explicitly refuses
`entityType=professional` (`cur/app/api/amrs/verification/route.ts:12`). Do professionals migrate
into AMRS, or does AMRS formally scope to organizations only? *Consequence:* a professional's
reputation row keyed by `entity_id` cannot be joined to `service_provider_profiles.id` — a
`VARCHAR(36)` in a different database — so cross-entity ranking is impossible until this is settled.

**F.59 — Does the surveyor directory need a profession taxonomy (SURV-005).** (a) an organization
category/specialty taxonomy reusing `organization_specialties`; (b) the services category tree;
(c) source surveyors from `service_provider_profiles`. *Consequence:* discovery currently matches the
literal string `"surveyor"` in an organization name.

**F.60 — Where organization ratings come from (ORG-018/019).** Build organization reviews, or
aggregate from member professionals' `service_reviews`? *Consequence:* office and company cards
render "NEW" forever.

**F.61 — Must survey RFQs be persisted and become real jobs (SURV-011/014/015/016/018). P0.** Merge
into the services order/offer flow, or a separate persisted entity? *Consequence:* RFQs are in-memory
with no surveyor inbox, no notification and no accept/decline.

**F.62 — Which organization types get an admin console (AMRS-013, COMP-008, ADMIN-026).** Offices,
companies, law offices, generic organizations, professionals — which are in scope for
`app/admin/organizations`? *Consequence:* none is manageable today; only company **taxonomy** is.

**F.63 — Add `organizations.*` and `verification.*` to the permission catalogue (AMRS-013/024).**
*Consequence:* both review APIs check permission strings that are not in
`cur/src/constants/permissions.ts`, so review is `super_admin`-only in practice and cannot be
delegated — which is one leg of the auction chicken-and-egg (B.7.1).

**F.64 — Self-serve organization creation (ORG-005/006).** Allowed, invite-only, or admin-created?
*Consequence:* the API allows any authenticated user to create a `draft` organization and no UI
exposes it.

**F.65 — Rename `sponsor_*` to `advertiser_*` (ORG).** The advertiser APIs still query
`sponsor_profiles`/`sponsor_users`/`sponsor_branches`. Rename with a data migration, or keep the
names and document the mapping?

**F.66 — Desktop-only office capabilities: how much comes to the web (PO-9).** Co-broking
(`CoBrokingRequests`), lead claims (`LeadClaims`/`PublicLeads`), staff commissions
(`StaffCommissions`) and the technician directory exist on the desktop only. Full parity, selective
(contracts + ledger + requests first), or explicitly desktop-only forever? *Consequence:* determines
whether the product rule is satisfied by "preserved on desktop" or requires web parity — this is the
single largest scope question in the audit.

**F.67 — Public reviews, favourites and analytics for offices and companies (ORG-018/021/022).** All
three are absent while the card components already reserve space for ratings.

**F.68 — AMRS realtime/event policy (AMRS, PROF-028).** The event bus exists and nothing publishes
(`cur/lib/amrs/events.ts:30-108`). Do AMRS events feed a future notification bus, or is the bus
removed?

**F.69 — Are the engineering tools public or gated (TOOL-002). P0.** Restore the `tools.use` gate, or
ratify tools as public and record the change? *Consequence:* `viewer` currently holds `TOOLS_USE` as
its **only** permission, so ratifying "public" leaves the default role with no meaningful grant.

**F.70 — Which property store is canonical (E.9, PO-5). P0.** Postgres `properties`, SQLite/D1
`property_listings`, or a unified store? *Consequence:* everything about desktop parity, radar and
taxonomy administration depends on this answer.

**F.71 — Must FindMyLand accept DXF / KML / KMZ / CSV / TXT again (FML-004).** The server already
can; only the UI blocks it. Restoring is cheap — confirm it is wanted.

**F.72 — Should manual coordinate entry come back (FML-005).** It is the only path for a user who has
coordinates but no scannable document.

**F.73 — Is "Save my land" a real persisted feature (FAV-011).** Persist to `land_parcels` with real
authorization, or remove the button? *Consequence:* every saved parcel is currently lost on restart,
and the live share API (A.5.7) has nothing durable to point at.

**F.74 — Who may edit an office-owned property (PROP).** Only the creator (today,
`cur/app/api/properties/[id]/route.ts:110-115`), or an office role model (owner/admin/manager/agent)
like the one already used for request offers? *Consequence:* `user_id` is `onDelete: 'set null'`, so
deleting a user leaves a listing with no responsible party and `office_id` is never consulted as a
fallback. `officeId` is also accepted verbatim from the request body with no membership check, so the
office recorded on a property is not trustworthy.

**F.75 — Is admin moderation of listings in scope for Phase 1 (PROP-066).** *Consequence:* the review
API exists and is gated, no screen calls it, no owner notification is sent, and no component calls
the submit endpoint — so nothing can currently be published through review at all.

**F.76 — Do saved-search alerts ship (SRCH-017).** Build the matcher and a delivery channel, or hide
the toggle and the "0 matching" counter?

**F.77 — Should the CAD export subsystem be exposed (TOOL-023).** Ship it as a tool, wire it into
Points→DXF and FindMyLand export (A.5.3), or park it explicitly? *Consequence:* a complete
DXF/SVG/PNG/PDF toolchain has been unreachable in every version.

**F.78 — Are demo properties acceptable in production (PROP).**
`cur/app/properties/page.tsx:86-93` merges `DEMO_PROPERTIES` into live results and shows them
exclusively when the API shape mismatches.

**F.79 — Does Arabic coordinate-table support ship in Phase 1 (FML-016). P0.** It has never existed in
any version and is the single biggest functional gap for Arabic deeds.

**F.80 — Should office-synced `property_listings` surface publicly (OFFICE-098, RADAR-009). P0.**
Publish them into the public site and the office workspace, keep them private to the desktop
integration, or gate them behind a publish/approve step (A.12.7)? *Consequence:* today an office
pushes a listing and it is invisible everywhere a human would look for it — including to the office
that pushed it.

**F.81 — Which "radar" is the product (RADAR-001, PO-4).** Keep both (geo radar as a web feature,
requirement-matching radar as the office feature) and rename one, or converge on one engine?
*Consequence:* the same word names two unrelated features on two sides of one integration.

**F.82 — The coordinate-system contract (RADAR-008, PO-6).** Desktop converts UTM→WGS84 before
pushing; web accepts UTM + zone and projects server-side; or both are stored. *Consequence:* without
this, geo radar can never see an office-sourced property.

**F.83 — Which base URL is authoritative for the desktop (PO-2).** The shipped binary hard-codes
`https://akar-promax.com` for program sync and defaults the property API to a **Replit dev host**
(`AkarApp_LIVE/webui/assets/index-BaC7A85f.js:1`). May an office configure a base URL at all?
*Consequence:* until it is removed or allow-listed, property data can be pushed to any host.

**F.84 — Desktop ad placement vocabulary (OFFICE-068, PO-7).** Register
`desktop_portal_bottom_banner` as a real placement, ship a desktop that asks for
`office_dashboard_hero`, or add a translation layer?

**F.85 — Is the desktop a notification target (OFFICE-083, RADAR-017, PO-8).** Requires a transport
(long-poll, a stream that stays open, or push) plus a desktop consumer. *Consequence:* the
`office_desktop` channel is declared with no wire; `DbRealtimeTransport.publish` has zero production
callers; the SSE route replays and returns without a keep-alive.

**F.86 — Cloud backup destination and custody (OFFICE-108/109, PO-10).** First-party storage under
akar-promax.com with device-token auth, or office-configured? *Consequence:* office data is currently
uploaded to an unvalidated URL with no auth contract.

**F.87 — The multi-tenancy key for the office integration (OFFICE-019/020, PO-11).** `sponsor_id` is
an e-mail string and `office_id` is never populated by pairing. *Consequence:* every scoping
guarantee in the integration rests on these two fields.

**F.88 — One audit log or two (E.6).** Decide the single store before Phase 1. *Consequence:* auth
events and commercial admin actions land in different tables and only one is visible.

**F.89 — Reputation thresholds (E.15).** AMRS (200/450/700/900) or reputation-extended
(100/300/600/1000)?

**F.90 — Should moderator geo/module scopes be enforced (ADMIN).** They are collected and stored
(`cur/app/api/admin/moderators/route.ts:98`) and `hasScopedPermission` ignores them. Enforce, or
remove the UI?

**F.91 — Is global search in scope (SRCH).** `SEARCH_ROUTE` is explicitly `undefined`
(`cur/src/config/public-navigation.ts:180`) — a deliberate choice that needs re-confirming.

**F.92 — Do companies, offices and properties get reviews (REV).** Only service providers can be
reviewed today.

**F.93 — Commission engine (COMM-LEG-049).** `StaffCommissions` with listing/buyer agent split is
desktop-only and `cur/docs/marketplace/COMMERCIAL_READINESS_SUMMARY.md:11` states "no commissions
engine". Bring commissions to the web, or keep them desktop-only forever?

**F.94 — Co-broking revenue share (COMM-LEG-050).** `CoBrokingRequests.CommissionSplitPct` +
`SaleContracts.CoBrokingCommissionSplit` is the only partner/affiliate-style revenue programme found
in any tree, and it is desktop-only. Web counterpart?

**F.95 — Lead claiming (COMM-LEG-051).** `PublicLeads` + `LeadClaims` (claim, expire, withdraw,
reject, convert to contract, max-2-claims trigger) is desktop-only; the web `leads` tables have no
claiming and no agency ownership. Merge or keep separate?

**F.96 — Office accounting: ledgers, treasury, tax catalogue (COMM-LEG-046/047/048/052).**
`AgencyLedger`, `ClientLedger`, `Treasury` and `TaxFeeTypes` (seeded with 15 % and 5 % entries) are
desktop-only. Is office accounting ever coming to the web?

**F.97 — Instalments, post-dated cheques, earnest money, deposits (COMM-LEG-053/054).**
`RentInstallments`, `SaleInstallments`, `PropertyInstallments`, `PostDatedChecks` and the
deposit/earnest columns are desktop-only. In scope for the web?

**F.98 — The contract engine (COMM-LEG-055). P0.** The desktop has a 56-column `Contracts` table plus
`SaleContracts`, `ContractTemplates`, `ContractClauses`, `ContractMembers` and `HandoverSchedules`;
the web has a stub returning a plain-text contract with a fabricated id and a `fileUrl` that is never
written (`cur/lib/services/contracts/contract.service.ts:85,91`). Build real contracts, or remove the
stub endpoint?

**F.99 — Generalise e-signature evidence (COMM-LEG-056).** The desktop's `ESignatures` captures
signer role, IP, **geo lat/lng at signing**, document hash and verification state; the web has
signatures only for auctions. Generalise, or keep auction-only?

**F.100 — Powers of attorney with expiry alerting (COMM-LEG-057).** `PowersOfAttorney`,
`AlertSent15Days` and `Settings.PoaAlertDaysBefore` are desktop-only. Web counterpart?

**F.101 — Chargeable maintenance (COMM-LEG-058, SVC-162).** `MaintenanceTickets.EstimatedCost` /
`FinalCost` / `DeductFromOwnerLedger` are desktop-only; the web service-jobs surface has no costing.
Does property-maintenance ticketing fold into the services marketplace?

**F.102 — Agency tier vs advertiser tier (COMM-LEG-059).** `Settings.AgencyTier` (desktop) and the
exclusive/gold/standard advertiser tier (`cur/app/api/advertisers/route.ts:13`) are two unrelated
commercial axes. Unify or keep separate?

**F.103 — Points, tokens, credits, affiliate programme (COMM-LEG).** An exhaustive search of `cur`,
`hist/old-tag`, `hist/old-main` and the DLL strings found **none**. Confirm this capability was never
intended, so it is not silently recorded as lost.

**F.104 — Supplier / product marketplace and RFQ (COMM-LEG-061).** Documented only
(`cur/docs/marketplace/PRODUCT_SUPPLIER_MARKETPLACE_READINESS.md`,
`PRODUCT_RFQ_FUTURE_CONTRACT.md` — HISTORICAL / INTENDED ONLY), never implemented in any tree. Keep
as roadmap, or drop?

**F.105 — Commercial audit visibility (COMM-LEG-017).** Point the admin audit console at both stores,
or accept that the commercial trail is unsearchable? (See E.6, B.9.4.)

**F.106 — Preserve the two dead commercial source-of-truth files (COMM-LEG-032/034).**
`cur/src/types/sponsor.ts` and `cur/db/schema.ts` (byte-identical to the old commercial schema) are
the cleanest restore source for F.1–F.7. Preserve them untouched until F.1–F.7 are answered?

**F.107 — Badge vocabulary (PROF-023).** Does a badge set exist in an older product build we have not
been given? Currently OLD SOURCE REQUIRED (G.5).

**F.108 — Account types at signup (ORG-005).** Should `/register` offer craftsman / office / company
from the start, or a single account with an upgrade path? *Consequence:* today office and company
creation has no UI at all.

**F.109 — Member profile editability (PROF-002/003).** Confirm the intended editable field set, and
whether avatars are stored in the object store (broken under Node) or as external URLs.

**F.110 — What does a rank *do* (RANK-012…RANK-018, RANK-027).** Badge artwork, directory boost
weighting, quota deltas, privileges for GOLD/PROMAX — and how any of that is reconciled with the
published no-pay-for-rank policy (`cur/src/content/legal-center.ts:96`) if advertiser plan tiers
become a rank input (A.8.9). *Consequence:* every rank effect is "no effect" today.

**F.111 — Should reputation be automatic (RANK-007/008).** Nightly job or event-driven, and which are
the authoritative signal sources? *Consequence:* today an admin types the numbers.

**F.112 — `drizzle.config.ts` ownership (AUC-064/065, E.10).** Regenerating migrations today would
drop the live auction hardening tables. Does the project keep generated migrations at all, or move
fully to hand-written SQL — and who owns that file?

**F.113 — Auction terms authoring (AUC-051).** Terms are legal text editable today only by running a
script against production. Is an admin authoring + versioning screen in scope?

**F.114 — Is the generated auction contract a legal instrument (AUC-047).** If yes, the mojibake
defect is a release blocker and the document needs legal review; if it is an internal record, the
notice at `cur/lib/auctions/settlement.ts:165` must say so unambiguously in readable Arabic.

**F.115 — The contract signing surface (AUC-049).** Does signing ship in-platform (needs a UI and an
e-signature policy), or is the finished hash-bound API documented as internal-only?

**F.116 — Should `PENDING_REVIEW` moderation of service requests exist (SVC).** Documented at
`cur/docs/services/SERVICE_REQUEST_STATE_MACHINE.md:5-12`, never implemented.

**F.117 — Adjacent dead services modules (SVC).** Leads, invitations, extended reputation, the
canonical state machine, the professional matcher, deep-links and verification policies all have zero
importers. Adopt into the domain, or remove?

**F.118 — Provider response and completion rates (SVC-062).** The match score budgets 12 points for
signals nothing computes. Implement the computation, or remove the weighting so scores are honest?

**F.119 — Desktop maintenance ticketing into services (SVC-162).** `MaintenanceTickets` +
`TechnicianDirectory` + ledger deduction have no web equivalent. Fold into the services marketplace,
or keep desktop-only?

**F.120 — Sponsored-visibility labelling (COMM-LEG-063).** The stated rule is that sponsored
visibility must remain labelled and cannot silently outrank organic results. Confirm it as a binding
product constraint on F.14/F.15/F.110, or restate it.

---

# G. OLD SOURCE REQUIRED

Verification gaps that cannot be closed from the trees supplied for this audit. Each item names
exactly which folders or packages must be attached, and what it unblocks. Nothing here is a
conclusion — these are open evidence requests.

### G.1 — The AkarApp_LIVE C# source (highest priority)
- **Needed:** the solution and every `.csproj`; the WPF views and view-models (the XAML list is
  enumerated at `inv/dll_strings.txt:1455-1489`); `Services/*.cs` — above all `SubscriptionService`,
  `OfflineLicenseService`, `CloudBackupSyncService`, `DesktopAdService`, the radar/matching service
  and the sync service; the DTO classes; and the HTTP client classes that build the request bodies.
- **Why:** we have only the published build — `cur/AkarApp_LIVE` (binary), `AkarDB.sqlite`
  (55 tables), `webui/assets/*.js`, and strings extracted into `inv/dll_strings.txt` /
  `inv/dll_urls.txt`. Every desktop-side contract in this document is inferred from strings and a
  bundled JavaScript file.
- **Unblocks:** F.20–F.23 (licence, sync, trial, activation), F.83 (base URL), F.84 (ad placement
  vocabulary), F.85 (notification transport), F.86 (backup custody), F.87 (tenancy key), F.93–F.101
  (the whole desktop commercial and legal capability set), A.12.1–A.12.7 and the exact request
  bodies the shims in A.12.2 must accept. Roughly 135 OFFICE and 26 RADAR matrix rows carry desktop
  evidence that is currently REFERENCE ONLY.

### G.2 — The drizzle-pg migrations `0004`–`0010`
- **Needed:** the seven `.sql` files as they exist in `ref/akarpromax-properties-current/drizzle-pg/`
  (properties, leads + land, auction fields, geo + currency, vehicles), plus whatever produced them.
- **Why:** they are absent from `cur/drizzle-pg` while `cur/drizzle-pg/meta/_journal.json` still lists
  0004–0006 and `cur/scripts/apply-geo-currency-schema.ts:8` reads a missing `0009`.
  `0004_add_new_tables.sql` is the **sole DDL** for `forum_categories`/`forum_topics`/`forum_posts`
  (`:289,:301,:312`), `knowledge_items` (`:327`) and `news_ticker_items` (`:412`).
- **Unblocks:** A.9.9, COMM-020, KNOW-018, NEWS-033, GEO-010, PROP-073 — and the ability to provision
  a clean database at all. Three domains have no schema on a fresh install today.

### G.3 — The FindMyLand full page and its sub-routes
- **Needed:** `app/tools/find-my-land/page.tsx` (~700 lines) as it existed in the 2026-08-13 review
  snapshot, plus `app/tools/find-my-land/projects/` and `app/tools/find-my-land/share/` —
  the two directories named in `SNAP-CGPT/TOOLS_INVENTORY.txt` whose sources are not in any tree.
- **Why:** the accept list, the manual-entry panel, the add-point handler, the `downloadKml` writer
  and the perimeter tile are all reconstructible only in outline from the inventory file.
- **Unblocks:** A.5.2, A.5.3, A.5.4, A.5.5, A.5.6, A.5.10; and the exact old behaviour behind
  FML-004/005/031/036.

### G.4 — The PWA service worker `sw.js`
- **Needed:** the file (or the build step that emitted it) referenced by
  `cur/src/components/PwaManager.tsx:19`.
- **Why:** the registration is live and the file is not in the repository, so every visitor's browser
  requests a 404 on first load.
- **Unblocks:** F.55, and any web-push decision under F.54.

### G.5 — The pre-refactor Reference React application
- **Needed:** the source of the app described in `cur/docs/comparison/PAGES_COMPARISON.md`,
  `ROUTES_COMPARISON.md` and `FEATURE_MATRIX.md` — specifically `Admin/Auctions`, `/dashboard/bids`,
  `/auctions/{terms,faq,stats,history}`, `/vehicle-services`, the news-ticker admin, the realtime
  socket layer, and the badge/rank artwork vocabulary.
- **Why:** those documents are the only evidence these capabilities existed; they are **HISTORICAL
  ONLY** and describe a runtime that is dead.
- **Unblocks:** A.10.1, A.10.2, A.10.3, A.10.4, A.10.9; AUC-034/057/060/061, VEH-017, NEWS-032,
  PROF-023 (F.107).

### G.6 — Any server that once served `akar-promax.com/api/program/*`
- **Needed:** the deployment, repository or worker that answered
  `POST https://akar-promax.com/api/program/sync` and
  `https://akar-promax.com/api/program/subscription-status`, plus whatever served `/api/desktop` and
  the desktop ad-tracking calls (`RecordAdViewAsync`, `RecordAdClickAsync`, `PostTrackingAsync` —
  `inv/dll_strings.txt:1659,1685,1658`, whose URLs are not present as strings at all).
- **Why:** these endpoints exist in no supplied tree (`cur/app/api` has neither `program` nor
  `desktop`), yet a shipped product calls them every ten minutes. Their request and response shapes
  are known only from `AkarApp_LIVE/webui/assets/index-BaC7A85f.js:1`.
- **Unblocks:** A.12.1, A.12.2, A.12.3, F.20, F.21; and whether the desktop ad-tracking calls have a
  counterpart to preserve at all.

### G.7 — Pre-2026-07-29 git history
- **Needed:** the full history behind `hist/prerefactor.git`, which contains only **51 commits**
  across `main`, `fix/admin-sponsor-management`, `feature/services-marketplace-and-translations`,
  `refactor/architecture-foundation` and the tag `pre-architecture-refactor`. The earliest tree we can
  read is 2026-07-29.
- **Why:** several capabilities are attested only by commit messages inside that window
  (`0247e22`, `ee54559`, `62216a9`, `6735fec`, `2dfcc1c`, `600a891`, `74eba26`, `5fd0426`, `292ef87`,
  `383b3e8`, `4383e08`, `ae4443f`, `39836db`, `b9fa259`, `11c1a47`), and anything removed **before**
  2026-07-29 is invisible to this audit entirely. The product rule cannot be verified against a
  history we cannot see.
- **Unblocks:** the completeness claim of section A itself.

### G.8 — The 2026-08-08 snapshot directories that are present but empty
- **Needed:** the file contents of `ref/akarpromax-source/app/admin/organizations`,
  `app/admin/professionals`, `app/api/admin/professionals`, `app/api/invitations`,
  `app/api/offices/[id]/leads` and `app/api/offices/[id]/property-requests` — the directories exist in
  the snapshot index but carry no source we can read.
- **Why:** these are the only evidence that A.2.4, A.2.5, A.7.3 and A.7.4 ever shipped, and we are
  otherwise rebuilding them from their APIs rather than restoring them.
- **Unblocks:** A.2.4, A.2.5, A.7.3, A.7.4; AMRS-013/018, PRO-010, OFFICE-ORG-008.

### G.9 — Data hygiene: the ~31 unclassified / column-shifted CSV rows
- **Needed:** nothing external — this is an internal correction, recorded here so it is not mistaken
  for a coverage gap.
- **What:** 31 of the 1,335 rows in `out/docs/product-audit/FEATURE-PARITY-MATRIX.csv` do not parse
  cleanly into the decision taxonomy. The cause is embedded commas and un-escaped quotes inside
  free-text evidence and status cells, which shift later columns left — so a row's `decision` value
  lands in `regression_risk`, or a multi-clause `current_status` string ("PARTIAL — …, and …") is read
  as an unknown decision. Two smaller classes contribute: rows whose `decision` is a qualified variant
  not in the allowed list (`RESTORE (admin UI)`, `RESTORE/BUILD`, `KEEP (BETTER THAN OLD)`,
  `RESTORE — product-owner decision required`), which this document folds into the base decision; and
  rows whose `old_status`/`current_status` carry an explanatory clause rather than a bare vocabulary
  term.
- **Effect on this document:** the counts in the preamble table are computed after normalisation, so
  the 31 rows are counted once in the `Unclassified` line rather than silently dropped. **No capability
  is lost by this** — every one of the 31 rows was read individually and its capability appears in
  A–F under its feature ID.
- **Action:** re-emit the CSV with RFC-4180 quoting and a constrained `decision` / `old_status` /
  `current_status` vocabulary, then re-run the counts. Until then, the matrix should be read through
  a parser, never by column position.

---

## Closing note

Nothing in this document authorises a deletion. Where an item says "or retire", that is an option
presented to the product owner in section F, not a recommendation made here. Every capability found in
any older AkarProMax version — web, admin, or the shipped AkarProMax Office desktop — is accounted for
in exactly one of: **A** (restore), **B** (fix the regression), **C** (merge into the new
architecture), **D** (already better, protect it), **E** (consolidate the duplicates), **F** (escalate
the product question), or **G** (the evidence is missing and must be supplied). An item may appear in
more than one section when it has both a technical and a commercial dimension; it may appear in none
only if it does not exist.



---

# PART II — ROUND 2: V1 PRODUCT DNA AND THE DESKTOP ECOSYSTEM

Added 19 Aug 2026, after the actual V1 source and the actual AkarProMax Office C# source became available.
Part I above (sections A–G over the V2 lineage) is unchanged and still binding.

Reconciled decision counts over all **2,563** rows:
RESTORE 683 · KEEP 445 · FIX REGRESSION 359 · KEEP + IMPROVE 355 · MERGE INTO NEW SYSTEM 336 ·
NEW IMPROVEMENT 140 · SUPERSEDED WITH FULL PARITY 99 · PRODUCT OWNER DECISION 56 · BLOCKED 31 ·
OLD SOURCE REQUIRED 22.

**The governing rule for Part II:** V1 is *product DNA* — ideas, UX and workflows. V2 is the *technical core*
wherever it is stronger. AkarApp_LIVE is the *desktop operating ecosystem*. The target is not a copy of V1;
it is the strongest coherent AkarProMax system. Nothing in Part II proposes resurrecting V1 code.



## Round 2 — V1 Messaging & Notifications

## V1 vs V2 messaging capability matrix

Depth labels are V1's. V2 status and evidence are taken from the already-verified rows named in the
cell. **V2 has three parallel messaging implementations and no realtime for messages — it does not
"have no messaging".**

| Capability | V1 depth + evidence | V2 status + evidence | Verdict | Decision |
|---|---|---|---|---|
| **Conversation container** | L4 — `chat-server.ts:38-43` | FULL — `service_message_threads` PK `(thread_type,thread_id)` (MSG-043) | Different keys: V1 surrogate int, V2 composite. V2's model is richer (context-bound) | MERGE INTO NEW SYSTEM — keep V2's composite key, add V1's `updated_at` activity column |
| **Contextual conversations** | **L0 — none found.** `conversations` has no context column at all | PARTIAL — 7 contexts (`cur/lib/services/message-contexts.ts:19-27`), a rival 9-context taxonomy with zero consumers (MSG-036) | **V2 wins outright.** V1 contributes nothing here | KEEP + IMPROVE (V2 model), reconcile the two taxonomies |
| **Direct 1:1 chat** | L4 — `chat-server.ts:39,546` | PARTIAL — only `order` threads are genuinely 1:1 (MSG-011) | V1's private type is simpler and correct; V2's is entity-derived | MERGE INTO NEW SYSTEM |
| **Group chat** | L3 — `chat-server.ts:39-42`, sender labels `ChatWindow.tsx:318` | MISSING — flat participant list, `role` hardcoded (MSG-013, MSG-019) | **V1 wins.** Group is the only multi-party model either generation has | RESTORE |
| **Explicit participants** | L4 — `chat-server.ts:44-53` with a uniqueness constraint | PARTIAL — `service_message_participants` + unique index, but role unused (MSG-019) | Equivalent; V1 additionally models role and soft-leave | MERGE INTO NEW SYSTEM |
| **Implicit participant derivation** | **L0 — none.** V1 has no entity to derive from | PARTIAL — `order`, `request`, `professional` branches work; `property`, `property_request`, `organization`, `general` do not (MSG-020) | **V2 wins**; the gap is V2-internal | FIX REGRESSION (V2) |
| **Start a conversation** | **L0 — none found.** Conversations exist only via `seed-chat.ts:75-87` | BROKEN — `startMessageThread` works but has zero authorization (MSG-049) | **Neither generation has a safe creation path** | RESTORE with an authorization gate |
| **Send message** | L4 — `chat-server.ts:644-665` | FULL — participant check + 4000-char cap (MSG-021) | V2's *guard* is better; V1's *delivery* is better | MERGE INTO NEW SYSTEM: V2 validation + V1 transport |
| **Server-side validation** | **L1 — none.** Raw `text`/`type` from the client | FULL — context enum, 4000/200/500-char caps (MSG-040) | **V2 wins** | KEEP + IMPROVE |
| **Realtime delivery** | **L4 — `chat-server.ts:660`, `ChatContext.tsx:120-138`** | **MISSING — single fetch on mount, no interval, no SSE (MSG-023)** | **V1 wins; this is the single largest V1→V2 capability loss** | RESTORE |
| **Presence (online/offline)** | L4 — `chat-server.ts:568,754` | MISSING — no presence concept | **V1 wins**, but V1 broadcasts globally and must be scoped | RESTORE (scoped) |
| **Typing indicator** | L4 — `chat-server.ts:676-680`, `ChatWindow.tsx:334-340` | MISSING (MSG-027) | **V1 wins** | RESTORE |
| **Read receipts** | L4 — receipt rows, `chat-server.ts:65-71,617-619` | PARTIAL — boolean `is_read` auto-set on GET (MSG-026) | **V1's model is strictly richer** (per-user, per-message); V2's is destructive in multi-party threads | MERGE INTO NEW SYSTEM (V1 model + family A `last_read_at`) |
| **Per-thread unread count** | L4 — `chat-server.ts:179-182,577-581` | PARTIAL — O(messages) in JS per thread (MSG-024) | Both work; V1's is index-backed | MERGE INTO NEW SYSTEM |
| **Global unread badge** | L4 — `ChatWidget.tsx:149-163` | STUB — hardcoded `0` (MSG-025) | **V1 wins** | RESTORE |
| **Edit message** | L4 — ownership-guarded (`chat-server.ts:203,683-693`) | MISSING | **V1 wins** | RESTORE |
| **Delete message** | L4 — soft, ownership-guarded (`chat-server.ts:204,696-704`) | MISSING | **V1 wins** | RESTORE |
| **Trash / restore deleted** | L1 — localStorage (`ChatContext.tsx:261-308`) | MISSING | V1 idea only | PRODUCT OWNER DECISION |
| **Reply-to** | L2 — column + FK, never surfaced (`chat-server.ts:59,651`) | MISSING | Neither ships it; V1 has the schema | RESTORE |
| **Attachments (file)** | L3 — no upload endpoint; base64 in the row (`ChatInput.tsx:69-77`, `chat-server.ts:649`) | STUB — `message_attachments` declared, no API/UI/migration (MSG-028) | **V2 has the better schema, V1 the only working UI** | MERGE INTO NEW SYSTEM |
| **Images + lightbox** | L3 — `MessageBubble.tsx:53-59,102-119` | MISSING | **V1 wins** | RESTORE |
| **Voice notes** | L3 — recorder real, playback fake (`VoiceRecorder.tsx`, `MessageBubble.tsx:75-84`) | MISSING | **V1 wins the capture half only** | RESTORE |
| **Emoji picker** | L4 — `ChatInput.tsx:100-111` | MISSING | **V1 wins** | RESTORE |
| **Ringtone selection** | L4 but mis-wired — `useRingtone.ts:12-143` used only by `PartnerDashboard.tsx:88` | MISSING | **V1 wins**, needs re-wiring to chat | MERGE INTO NEW SYSTEM |
| **Mute conversation** | L1 — localStorage (`ChatContext.tsx:328-342`) | MISSING (MSG-030) | V1 idea, per-device only | RESTORE (server-side) |
| **Block user** | L3 store + notify (`chat-server.ts:707-713`); **L2 enforcement (dead statements at `:199-200`)** | MISSING (MSG-031) | **V1 wins the model, ships nothing enforceable** | FIX REGRESSION |
| **Unblock** | L3 — `chat-server.ts:716-721` | MISSING | **V1 wins** | RESTORE |
| **Report message / user** | **L0 — none found** | MISSING (MSG-032) | **Neither generation has it** | RESTORE |
| **Moderation request** | L3 — self-approving (`chat-server.ts:191-194`) | MISSING (MSG-041) | **V1 wins the concept** | RESTORE with a real review workflow |
| **Oversight session (live)** | L4 but **BROKEN · SECURITY** — no role check (`chat-server.ts:724-742`) | MISSING | V1 has the capability and the defect | FIX REGRESSION |
| **Moderation access log** | **L4 — `chat-server.ts:82-88,239,286,736`** | **MISSING — no equivalent anywhere in V2** | **V1 wins; this is the strongest privacy primitive in either generation** | RESTORE |
| **Admin audit-log browser** | L3 — correct route (`chat-server.ts:258-275`), client points at the wrong host | MISSING | **V1 wins** | FIX REGRESSION |
| **Admin chat console** | L1 — 5 of 6 calls hit routes that do not exist (`chatAdminService.ts`) | MISSING (MSG-041) | V1 idea only | RESTORE |
| **Message search** | L1 — client-side over ~30 loaded messages (`ChatWindow.tsx:55-59`) | MISSING (MSG-033) | Both effectively missing; V1 encryption makes server-side search structurally hard | RESTORE |
| **Pagination / load-older** | L4 — 30/page, id cursor, `hasMore` (`chat-server.ts:597-613,628-641`) | PARTIAL — hard `LIMIT 200`, no cursor; `listInbox` unbounded (MSG-039) | **V1 wins** | MERGE INTO NEW SYSTEM |
| **Infinite scroll-up** | L4 — `ChatWindow.tsx:80-92` | MISSING | **V1 wins** | RESTORE |
| **Encryption at rest** | **L4 — AES-256-GCM, server-held key (`encryption.ts:1-51`)** | **MISSING — plaintext bodies (`cur/lib/services-schema.ts:80-88`)** | **V1 wins**, with the caveats in V1-MSG-040/041 | KEEP + IMPROVE |
| **End-to-end encryption** | **L0 — not implemented; the UI claims it (`ChatApp.tsx:39`)** | MISSING | **Neither generation has E2EE** | PRODUCT OWNER DECISION |
| **Unified inbox (multi-type)** | L1 — localStorage-fed (`UnifiedInbox.tsx:66-146`) | PARTIAL — messaging-only inbox (MSG-016) | **V1 owns the idea, V2 owns the working data path** | RESTORE (idea) + MERGE INTO NEW SYSTEM |
| **Technician / dispatch inbox** | L4 — real API, 5 s polling (`TechnicianInbox.tsx:108-148`) | PARTIAL — jobs page, no dispatch loop | **V1 wins** | MERGE INTO NEW SYSTEM |
| **Progressive contact reveal** | L4 — phone hidden until accept (`TechnicianInbox.tsx:120-133`) | MISSING | **V1 wins** | RESTORE |
| **"Disable receiving messages"** | L1 — localStorage registry (`Profile.tsx:139-152`, `ChatWindow.tsx:42-53`) | MISSING | **V1 owns the idea, enforcement is client-side fiction** | RESTORE (server-enforced) |
| **Floating chat widget** | L4 — draggable/resizable/fullscreen (`ChatWidget.tsx:48-144,626-652`) | MISSING | **V1 wins** | RESTORE |
| **Chat appearance settings** | L1 — localStorage (`ChatSettingsContext.tsx:3-55`) | MISSING | **V1 wins** | RESTORE |
| **Deep link into a conversation** | L1 — `/?chat=<id>` with **no handler** (`ServiceHub.tsx:1497`) | BROKEN — `StartThreadButton` redirect builds `?open=undefined:undefined` (MSG-050) | **Both broken** | RESTORE |
| **In-app notification centre** | L4 API, **no V1 UI consumes it** (`auction-enhancements.ts:37-61`) | FULL (NOTIF-001) | **V2 wins the UI, V1 wins the bilingual model** | MERGE INTO NEW SYSTEM |
| **Bilingual notification content** | **L4 — `titleAr`/`bodyAr` columns (`schema.prisma:1105-1108`)** | MISSING — single-language | **V1 wins** | RESTORE |
| **New-message notification** | **L0 — chat server never writes a `Notification`** | PARTIAL — `SERVICE_MESSAGE` fires conditionally (NOTIF-020) | **V2 wins** | RESTORE (V1 side) |
| **Web push (VAPID)** | L3 — server complete, client posts to unmounted paths (`usePushNotifications.ts:64,86`) | MISSING — no PushManager, no VAPID, `/sw.js` absent (NOTIF-016) | **V1 wins the server half** | RESTORE + FIX REGRESSION |
| **Email notifications** | **L4 — nodemailer + `EmailLog` state machine (`notification-sender.ts:167-179`)** | MISSING for notifications — 7 auth-only templates (NOTIF-014) | **V1 wins** | RESTORE |
| **Interest-matched digest** | L4 — city match → in-app + email (`notification-sender.ts:101-165`) | STUB — no emitter (NOTIF-022) | **V1 wins** | RESTORE |
| **Notification preferences** | **L0 — none found** | MISSING for platform users (NOTIF-007) | **Neither generation has it** | RESTORE |
| **Admin notification broadcast** | L1 — localStorage composer (`AdminNotifications.tsx:24-60`) | MISSING (NOTIF-034) | V1 idea; the desktop app has the real engine | RESTORE |
| **Scheduled/cron notifications** | L3 — 5-min tender cron in the chat process (`chat-server.ts:760-782`) | MISSING | **V1 wins the concept**, wrong process and wrong database | FIX REGRESSION |
| **Outbox / durable fan-out** | **L0 — none** | STUB — `enqueueOutbox` writes, `processOutbox` has zero callers (MSG-045, NOTIF-019) | **V2 wins the model, neither ships delivery** | MERGE INTO NEW SYSTEM |
| **Message send audit** | **L0 — none.** V1 audits only *moderator reads* | FULL — `writeAudit("service_message.send")` + IP (MSG-046) | **V2 wins**; the two audits are complementary, not duplicates | MERGE INTO NEW SYSTEM (keep both) |
| **Identity key** | INTEGER user id from the JWT (`chat-server.ts:500,566`) | email string in family B, uuid in family A (MSG-056) | **Three incompatible keys across the two generations** | PRODUCT OWNER DECISION (blocks migration) |
| **Number of implementations** | 2 (`chat-server.ts` + `chat-server.cjs`) | 3 (MSG-052/053/056) | **Five implementations across two generations** | MERGE INTO NEW SYSTEM |

---

## What the ONE unified messaging core must preserve

This list is the union of (a) V1's capabilities above and (b) the 21 items in
`frag/05-messaging-notifications.md §"What a unified messaging system must preserve"`, which cover
V2 families A, B, C and the old generation D. Items marked **[V2]** are already recorded there and
are restated only where V1 changes the requirement.

**Conversation & participant model**
1. Entity-bound threads with the full context taxonomy (below) — **[V2]** items 1, 7, 8.
2. A conversation identity that survives context (`(thread_type, thread_id)` composite) **plus** V1's activity timestamp for inbox ordering (`chat-server.ts:176,558`).
3. Explicit participant rows with a uniqueness constraint — **[V2]** item 7 — **plus** V1's per-participant `role` (member/admin/owner, `chat-server.ts:46`) and soft-leave `is_deleted` (`:49`).
4. Group conversations with their own name and avatar (`chat-server.ts:39-42`) — the only multi-party model in either generation.
5. Implicit participant derivation for `order`, `request` (per-provider scoped) and `professional` — **[V2]** items 4, 5, 6.
6. An authorization gate on thread creation — absent in **both** generations (V1 has no creation path at all; V2's `startMessageThread` has none, MSG-049).

**Delivery**
7. **Realtime message delivery.** V1's Socket.IO room model (`conv_<id>`, `user_<id>`, `oversight_<id>`) with JWT-handshake authentication, scoped to participants (`chat-server.ts:494-505,567,572,660`). V2 has none.
8. Presence (online/offline + `last_seen`), **scoped to counterparties**, not globally broadcast (`chat-server.ts:568,754`).
9. Typing indicators with client-side debounce (`chat-server.ts:676-680`, `ChatInput.tsx:36-41`).
10. Offline send behaviour that **queues and retries** rather than V1's fire-and-forget local echo (`ChatContext.tsx:215-234`).

**Message model**
11. Message types `text | image | audio/voice | video | file | location` (`chat-server.cjs:65`) plus V2's `metadata` jsonb — **[V2]** item 13.
12. Attachment descriptor `url, type, size, name, mime_type` — **[V2]** item 12 — behind a **real upload endpoint**, replacing V1's base64-in-the-row (`chat-server.ts:649-651`).
13. Reply-to (`reply_to_id` with `ON DELETE SET NULL`, `chat-server.ts:63`) — schema exists in V1, must gain a renderer.
14. Edit with sender-only enforcement and a persisted, **emitted** `is_edited` flag (`chat-server.ts:203,683-693` — fix the emission gap at `:508-522`).
15. Soft delete with sender-only enforcement, rows retained (`chat-server.ts:204,696-704`).
16. `is_system` messages for in-thread status entries — **[V2]** item 11 — with a renderer, which neither generation has.
17. Server-side validation: context enum, 4000-char body, 200-char title, 500-char context link — **[V2]** item 14. V1 has none.
18. Chronological ordering with a **cursor**: V1's 30-per-page id cursor and `hasMore` (`chat-server.ts:597-613,628-641`) in place of V2's `LIMIT 200` — **[V2]** item 9 supersedes the cap.

**Read state & counts**
19. Per-participant, per-message read receipts (`chat-server.ts:65-71`) — strictly richer than V2's boolean `is_read`, and required so that one reader in a group does not clear everyone's state (V2's current `markThreadRead` does exactly that, per `frag/05` §(b)).
20. Per-participant `last_read_at` watermark — **[V2]** item 10 (family A `messages-schema.ts:21`; V1 has the column at `chat-server.ts:48` but never uses it).
21. Per-thread unread counts and a **real** global unread badge (`ChatWidget.tsx:149-163`; V2's is hardcoded `0`, MSG-025).

**Privacy, safety and moderation**
22. Encryption at rest for message bodies (`encryption.ts:1-51`), **extended to non-text bodies, attachment metadata and `file_url`**, which V1 leaves plaintext (`chat-server.ts:647`).
23. Block with **enforcement on the send path** — V1 stores and notifies but never checks (`chat-server.ts:199-200` unused).
24. Mute, server-side and per-account rather than V1's per-device localStorage (`ChatContext.tsx:328-342`).
25. Server-enforced "disable receiving messages" with the V1 door-opening rule: once a conversation exists, replies are allowed (`ChatWindow.tsx:42-53`). V1 enforces this only on the sender's own device.
26. End-user report of a message or a user — **missing in both generations**; V2's `REPORT_TARGETS` has no message target (MSG-032).
27. A moderation request with a **real** reviewer, replacing V1's self-approval (`chat-server.ts:191-194,285`).
28. A live oversight session **gated on an actual admin/moderator check** — V1's socket handler has none (`chat-server.ts:724-742`).
29. Visible-to-subject oversight signalling — V1 renders the banner (`ChatWindow.tsx:236-245`) but emits `oversight-activated` only to the requester (`chat-server.ts:737`), so it never reaches the participants.
30. **The moderation access log** (`chat-server.ts:82-88`): one immutable row per third-party decryption, with reason, moderator and timestamp, plus the paginated browser (`:258-275`). Nothing in V2 comes close.
31. `writeAudit("service_message.send")` with actor and IP — **[V2]** item 15. Complementary to item 30, not a replacement.

**Inbox and surfaces**
32. A central cross-context inbox with per-thread unread and last-message timestamp — **[V2]** item 9 — **plus** V1's decrypted last-message preview (`chat-server.ts:551-554`), which V2's `listInbox` never selects (MSG-017).
33. The **unified multi-type inbox idea**: chats + appointments + quotes + inquiries in one timestamp-sorted list with type filters, collapsible groups, per-group counts and in-place actions (`UnifiedInbox.tsx:90-196,379-508`). Preserve the idea; replace the localStorage implementation.
34. The dispatch/technician inbox with ringing offers, countdown, accept/reject/not-agreed/complete and **progressive contact reveal on accept** (`TechnicianInbox.tsx:108-148,120-133`).
35. Mobile master/detail with real back navigation (`ChatApp.tsx:20-27`) — V2 stacks with no back affordance (MSG-038).
36. A floating, draggable, resizable, minimisable, fullscreen-capable chat widget available on every page (`ChatWidget.tsx:48-144,626-652`).
37. Per-user chat appearance settings — font size, bubble colours, font styles, reset (`ChatSettingsContext.tsx:3-55`) — moved off localStorage.
38. In-conversation search with match highlighting and a match count (`ChatWindow.tsx:55-59,183-205`; `MessageBubble.tsx:16-25`), which requires an encryption strategy that permits it (see decisions).
39. Emoji composer (`ChatInput.tsx:100-111`), image lightbox (`MessageBubble.tsx:102-119`), voice capture (`VoiceRecorder.tsx:19-63`) with **real** playback and duration, replacing the hardcoded `0:12` at `MessageBubble.tsx:83`.
40. Working entry points: a `?chat=`/`?open=` deep link that is actually handled (broken in both — `ServiceHub.tsx:1497` and MSG-050) and a "Message" button on every profile, listing, provider, organization and job surface.
41. Arabic-first RTL layout throughout — **[V2]** item 20 — matched by V1 (`dir={isRTL?"rtl":"ltr"}` on every chat surface).
42. `lib/services/core.ts` delegation so no module holds a second send/read implementation — **[V2]** item 21. The unification must collapse **five** implementations: V1 `.ts`, V1 `.cjs`, V2 families A, B, C.

**Notifications**
43. Bilingual notification records (`title`/`titleAr`, `body`/`bodyAr`, `schema.prisma:1105-1108`) — V2 is single-language.
44. A new-message notification, which V1 never emits and V2 emits only conditionally (NOTIF-020).
45. Web Push end to end: subscription model with self-healing `410`/`404` cleanup (`notification-sender.ts:69-84`), real VAPID keys (not the placeholder at `index.ts:127`), and a client that posts to routes that exist (`usePushNotifications.ts:64,86` currently does not).
46. Email notifications with the durable `EmailLog` state machine `PENDING → SENT | FAILED` (`notification-sender.ts:167-179`).
47. Interest-matched delivery (`interestedCities` → in-app + bilingual RTL email, `notification-sender.ts:101-165`), rewritten as an indexed query rather than a full-table JS filter.
48. Admin broadcast fan-out (`notifyAdmins`, `notification-sender.ts:181-184`) and the severity-tiered alert model the desktop app already has (`inv/dll_strings.txt:422,431,594`).
49. Per-user notification preferences and quiet hours — missing in V1, STUB in V2 (NOTIF-007, NOTIF-008).
50. Notification deep links (`link` column, `schema.prisma:1109`) — **[V2]** item 19 via `contextLinkFor`.
51. Local alerting: chime, desktop Notification (with a permission request that V1 never issues), and the 5-pattern ringtone selector currently stranded on `PartnerDashboard.tsx:88`.
52. The `SERVICE_MESSAGE` outbox enqueue as the email/push hook — **[V2]** item 16 — plus a processor, which neither generation has.

**Contexts the unified core must support**

Required by the task, with the V2 evidence for each:

| Context | V2 evidence | V1 evidence | Status |
|---|---|---|---|
| `GENERAL` | `cur/lib/services/message-contexts.ts:20` `GENERAL:"general"` | none — V1 `private` conversations are context-free, which is the nearest analogue | Required |
| `PROPERTY` | `cur/lib/services/message-contexts.ts:21`; entry point `cur/app/properties/[id]/page.tsx:225-232` | none — V1 property contact is `POST /inquiries` (`PropertyDetail.tsx:213-221`) or `wa.me` (`:680`) | Required |
| `PROPERTY_REQUEST` | `cur/lib/services/message-contexts.ts:22`; link `:72` | none — V1 has `PropertyRequest`/`PropertyOffer` models (`schema.prisma:721-756`) with a `message` field but no thread | Required |
| `SERVICE_REQUEST` | legacy storage value `request` (`cur/lib/services/marketplace.ts:1924-1932`) | none | Required — **and this is the leaking context** |
| `SERVICE_JOB` | legacy storage value `order` (`cur/lib/services/marketplace.ts:1917-1922`) | none | Required — the only correctly-isolated V2 context |
| `PROFESSIONAL` | `cur/lib/services/message-contexts.ts:25`; implicit owner `:1938-1941` | none — V1 provider contact is `wa.me`/`mailto` (`ServiceDetail.tsx:148-156`) | Required |
| `ORGANIZATION` | `cur/lib/services/message-contexts.ts:26` (absorbs office + company) | none — V1 office contact is `wa.me` (`OfficeDetail.tsx:117-120`) | Required |

**Do AUCTION, TENDER and SUPPORT need their own contexts?**

- **AUCTION — YES, with evidence.** V1 has a full auction subsystem (`Auction`, `AuctionBid`, `AuctionParticipant`, `AuctionReport`, `SaleProof`, `SuspiciousRelist`, `schema.prisma:905-1083`), a dedicated realtime service (`v1/server/api/src/services/auction-socket.ts` — uncovered by Pass A per `BRIEF2.md:47`), and **six auction notification event types** already defined (`notification-sender.ts:36-38`: `auction_suspended`, `auction_unsuspended`, `auction_ending_soon`, `bid_received`, `auction_won`, `auction_lost`, `outbid`, `proof_deadline_approaching`). V2 has auction schemas but **no auction notification emitter at all** (NOTIF-029). Post-auction settlement (`SaleProof` review, `schema.prisma:1062-1083`) is inherently a two-party conversation with a deadline. **Neither generation's existing contexts can carry it**: an auction is not an `order` (no `service_orders` row) and not `general` (it must be entity-linked for the moderation log to mean anything). → **Its own context.**
- **TENDER — YES, with evidence.** V1 has `ServiceTender`, `TenderBid`, `TenderActivityLog`, `TenderSetting` (`schema.prisma:1208-1313`), a 5-minute expiry cron that notifies the owner **and every pending bidder** (`chat-server.ts:760-782`), and four tender event types (`notification-sender.ts:39`). A tender is structurally the **same shape as the leaking `request` context** — one buyer, N competing bidders, prices that must not be visible across bidders. Folding tender into `SERVICE_REQUEST` would inherit the exact leak documented in `frag/05` §(b). → **Its own context, with per-bidder thread isolation from day one.**
- **SUPPORT — YES, with evidence, and it is already half-modelled.** `v1/src/types/chat.ts:1-26` defines `ConversationStatus = "open" | "closed"`, `senderRole: "user" | "admin" | "system"` and `type: "text" | "system" | "warning"` — a *support ticket* vocabulary that the peer-to-peer chat model cannot express, since `conversations` has no status column and `messages` has no system/warning type. The admin console is built entirely against it (`AdminChat.tsx:26,396-417,450-492`) and every one of its calls 404s or no-ops (V1-MSG-052…V1-MSG-055). `BRIEF2.md:86` independently records that V1's `AdminTickets` is localStorage-only with no server ticket API. V2 has nothing. → **Its own context**, carrying `status`, `senderRole` and system/warning message types.

---

## Product-owner decisions required

These are additional to the 12 decisions already recorded in
`frag/05-messaging-notifications.md §"Product-owner decisions required"`, which stand unchanged.
Where a decision here supersedes or constrains one of those, it says so.

1. **Which generation's conversation model is canonical?** V1's is participant-first and context-free
   (`chat-server.ts:38-53`); V2's is context-first with implicit participant derivation
   (`cur/lib/services/message-contexts.ts:19-27`). The recommendation implied by this audit is
   V2's model plus V1's participant richness (role, soft-leave, receipts) — but it must be decided,
   because it determines whether a conversation can exist without an entity at all.
   *Constrains `frag/05` decision 1.*

2. **Identity key across three incompatible schemes.** V1 keys on an INTEGER user id taken from the
   JWT (`chat-server.ts:500,566`), V2 family B on the **email string**
   (`cur/app/api/service-messages/route.ts:37`), family A on a **uuid**. `frag/05` decision 2 poses
   this for the two V2 families; V1's integer id makes it a three-way choice and means any V1 data
   import needs a mapping table.

3. **Encryption posture — this is the decision that gates message search and admin oversight.**
   Options: (a) keep V1's server-held-key encryption at rest (`encryption.ts:19-21`), which preserves
   moderation and permits admin read but is not E2EE; (b) drop to plaintext, matching V2; (c) real
   E2EE with client-held keys, which would make the moderation access log, admin oversight, server-side
   search and server-rendered notification previews **impossible as currently designed**. The UI
   already claims (c) while the code implements (a) (`ChatApp.tsx:39` vs `encryption.ts:19-21`).
   A decision is required before any storage migration; it cannot be deferred.

4. **Do AUCTION, TENDER and SUPPORT become first-class contexts?** This fragment's evidence says yes
   for all three (see §"contexts the unified core must support"). SUPPORT in particular needs
   `status: open|closed`, `senderRole: user|admin|system` and `type: text|system|warning`
   (`v1/src/types/chat.ts:1-26`) — a shape the peer-to-peer model cannot carry. Confirm or reject each.

5. **Realtime: what is the minimum bar?** V1 shipped Socket.IO with presence and typing; V2 has
   nothing. Options: full socket parity, SSE for message arrival only, or polling. This decision
   determines whether presence and typing survive at all, and it interacts with the office SSE stream
   that currently never emits (`NOTIF-018`).

6. **Group conversations: in or out?** Only V1 has them (`chat-server.ts:39-42`), only as a data
   model plus a sender-label renderer, with no membership management (V1-MSG-004). Keep as a
   first-class capability, or retire explicitly?

7. **Is admin oversight of private conversations an accepted product behaviour?** V1 says yes and
   logs every access (`chat-server.ts:82-88`); V2 has no such capability. `frag/05` decision 11 asks
   the same question from the V2 side. If yes, the access log is mandatory infrastructure, not a
   feature. If no, the entire oversight surface (V1-MSG-047…V1-MSG-051) is retired by decision rather
   than by omission.

8. **Who may initiate a conversation, and how is refusal enforced?** V1's "disable receiving messages"
   with a door-opening rule (`Profile.tsx:683-691`, `ChatWindow.tsx:42-53`) is enforced only on the
   sender's own device. `frag/05` decision 10 asks the same for V2 (`startMessageThread` has no
   authorization). One rule must cover: cold outreach, the refusal toggle, blocking, and rate limits.

9. **Attachment storage.** V1 persists base64 `data:` URLs directly into the message row
   (`ChatWindow.tsx:113-115`, `chat-server.ts:649-651`) and voice notes as `blob:` URLs that die with
   the tab (`ChatWindow.tsx:120-121`). V2 has the only attachment *schema* and no storage.
   `frag/05` decision 7 notes R2 storage is broken under Node. Decide the storage backend before
   attachments are scoped, or attachments will be shipped as base64 again.

10. **Notification channels and preferences.** V1 has working email (`notification-sender.ts:167-179`),
    a working push server half (`:69-96`), a broken push client half (`usePushNotifications.ts:64,86`),
    and **no preferences at all**. V2 has in-app only. Decide the channel matrix (in-app / email /
    web push / desktop) and whether per-user preferences and quiet hours are Phase 2 or later.
    *Extends `frag/05` decisions 8 and 9.*

11. **Bilingual notification content.** V1 stores `titleAr`/`bodyAr` alongside the English
    (`schema.prisma:1105-1108`); V2 stores one string. Keep dual-column storage, or move to a
    translation layer? This affects every emitter signature.

12. **What happens to the two non-messaging concerns riding on the chat process?** The 11 product
    endpoints at `chat-server.ts:294-489` and the tender expiry cron at `:760-782` need named owners
    outside messaging before the process is retired (V1-RR-08, V1-RR-09).

13. **Message retention and deletion semantics.** V1 soft-deletes and never purges
    (`chat-server.ts:204`), so an oversight read still surfaces deleted rows; the client-side trash
    (`ChatContext.tsx:261-308`) is per-device and non-authoritative. V2 never deletes at all.
    Decide: hard delete, retention window, tombstones, and whether "delete for everyone" exists.

14. **Read semantics for the ✓✓ marker.** V1 shows read when **any** participant has a receipt
    (`chat-server.ts:518,533`). In groups and multi-bidder threads that is misleading. Decide
    all-read vs any-read vs per-recipient display before the read model is migrated (V1-RR-10).


## Round 2 — V1 Advertising

## V1 vs V2 capability matrix

| Capability | V1 depth + evidence | V2 status + evidence | Verdict | Decision |
|---|---|---|---|---|
| `rotation_seconds` (per-campaign dwell time, 5–60 s) | L4 — `schema.prisma:575`, honoured `PageHeroSlideshow.tsx:164-172`, authored `AdminAds.tsx:1414-1421` | PARTIAL — per-**creative** `duration_seconds` clamped 3–15 s (`cur/lib/ads/engine.ts:165`, `cur/lib/ads/admin.ts:183`) | V2 range is too narrow for V1's hero product and lives at the wrong level | MERGE INTO NEW SYSTEM (campaign-level default + creative override, 3–60 s) |
| `max_views` | L2 — authored `AdminAds.tsx:1440-1450`, never enforced (`ads.ts:7-42`) | FULL — `cur/lib/ads/engine.ts:464` | V2 strictly better | SUPERSEDED WITH FULL PARITY |
| `max_clicks` | L2 — `AdminAds.tsx:1452-1462`, never enforced | FULL — `engine.ts:465` | V2 strictly better | SUPERSEDED WITH FULL PARITY |
| Screen-time product (hours → impressions via `rotationSeconds`) | L3 — `AdminAds.tsx:839-848,1403-1438` | MISSING — no time-based ad product in `cur` | V1-only commercial model | RESTORE |
| `priority` / ranking | L4 but shallow — `display_order ASC` only (`ads.ts:15,38`) | FULL — priority ×10 + weighted lottery + band (`engine.ts:509,515-534`) | V2 strictly better | SUPERSEDED WITH FULL PARITY |
| `display_order` (explicit hero sequence) | L4 — `ads.ts:38`, authored `AdminAds.tsx:1240-1252` | MISSING as an author-controlled sequence; V2 orders creatives by `position` inside a campaign (`cur/app/api/admin/ads/route.ts:79`) but has no cross-campaign slot order | Hero sequencing is a real editorial need V2 cannot express | RESTORE |
| Sponsor tier (standard/silver/gold/platinum) as ranking + visual product | L4 — `GeoAdsContext.tsx:32,72-77`, `GeoAdBanner.tsx:17-46,101-106` | PARTIAL — `sponsors.tier` stored, no consumer (ADS-010); no tier chrome on creatives | Major V1 revenue lever missing in V2 | RESTORE |
| Sponsor name / company logo / phone on the creative | L4 / L3 — `GeoAdBanner.tsx:128-132`, `PageHeroSlideshow.tsx:285-300` | MISSING — `cur/lib/ads/types.ts` has no company fields; `AdSlot.tsx:370-376` renders copy only | V2 regression vs V1 and vs old-V2 (ADS-007/009) | RESTORE |
| Country targeting | L4 — `ads.ts:30` | FULL — `engine.ts:374-382` | Parity | SUPERSEDED WITH FULL PARITY |
| Macro-region targeting (10 Arab/world regions) | L4 — `adLocations.ts:7-18`, `ads.ts:31`, auto-derived `AdminAds.tsx:1596-1598` | PARTIAL — `region_ids` means administrative regions, not multi-country macro-regions (`engine.ts:390-394`) | Different concept; V1's "sell the GCC in one click" is lost | MERGE INTO NEW SYSTEM |
| Governorate targeting | L4 — `ads.ts:32`, cascade `AdminAds.tsx:1619-1633` | PARTIAL — `district_ids` in the D1 engine, explicit `governorate` only in the orphan Drizzle engine (`matching.engine.ts:29`) | Concept split across two engines | MERGE INTO NEW SYSTEM |
| City targeting | L4 — `ads.ts:33` | FULL — `engine.ts:396-400` | Parity | SUPERSEDED WITH FULL PARITY |
| Village / neighbourhood targeting | L2 — authored `AdminAds.tsx:1642-1645`, never queried | MISSING at any grain | Finest grain lost | RESTORE |
| Geo-OR ("more attributes ⇒ wider reach") vs geo-AND | L4 — `ads.ts:29-34` | Different — V2 gates each dimension (`engine.ts:374-400`) | Behavioural conflict: identical data yields different fill | PRODUCT OWNER DECISION |
| `page` targeting | L4 — `ads.ts:25` | FULL — `page_types` + `section_scopes` (ADS-063) | Parity+ | SUPERSEDED WITH FULL PARITY |
| Module / entity targeting (property type, service category, office type, tool category) | MISSING in V1 | FULL — `engine.ts:420-455` | V2-only | NEW IMPROVEMENT (keep) |
| Language targeting | L3 — client-side only (`GeoAdBanner.tsx:51-54`) | FULL — server-side ar/en/tr (`engine.ts:340-344`) | V2 strictly better | SUPERSEDED WITH FULL PARITY |
| Placement taxonomy (12 numbered slots + 30 heroes + 4 legacy + popup) | L2/L4 — `AdminAds.tsx:174-221`; slots 01–12 rendered but engine-disconnected (`AdSlot.tsx:26-46`, `main.tsx:9-13`) | FULL — 44 legacy + 160 family + 8 canonical placements (ADS-069) | V2 taxonomy is a superset **except** the popup/inline/property placements are unrendered (ADS-074) and there is no per-page hero *manager* | SUPERSEDED WITH FULL PARITY (+ RESTORE hero manager) |
| Placement aspect-ratio spec + upload gate | L4 spec / L3 gate (neutralised) — `AdminAds.tsx:16-80`, `.bak.0` enforcement | PARTIAL — `aspectRatio` metadata only (`cur/src/constants/advertising.ts:177-194`), no validation | Creative-quality control lost | RESTORE |
| Placement inventory board (fill counts per slot) | L4 — `AdminAds.tsx:321-362,1089-1123` | STUB — `engine.ts:721-757` has no route or caller (ADS-055) | V2 built it and never surfaced it | RESTORE |
| Impression recording | L4 but unauthenticated & ungated — `ads.ts:177-184` | FULL — viewability gate + HMAC token (ADS-046/049) | V2 strictly better | SUPERSEDED WITH FULL PARITY |
| Click recording | L4 — `ads.ts:186-193` | FULL — POST + signed GET redirect (ADS-047) | V2 strictly better | SUPERSEDED WITH FULL PARITY |
| Conversions | MISSING in V1 | PARTIAL — endpoint with no caller (ADS-048) | V2-only | KEEP + IMPROVE |
| CTR | MISSING in both | PARTIAL — derivable, not surfaced | Neither has it | NEW IMPROVEMENT |
| Analytics dashboard | L3 — 4 browser-computed tiles incl. **revenue** (`AdminAds.tsx:911-913`) | FULL for delivery metrics (ADS-053); **no revenue view** (`price` unused, ADS-039) | Revenue reporting is a V1-only capability | RESTORE (revenue) + SUPERSEDED (delivery metrics) |
| Hero ads (per-page hero placements) | L4 — 30 placements, dedicated manager (`AdminAds.tsx:646-747`), player (`PageHeroSlideshow.tsx`) | PARTIAL — hero slot exists; **playlist playback removed by design** (ADS-024/071) | The V1 hero product is a playlist; V2 delivers one creative | PRODUCT OWNER DECISION (then RESTORE or SUPERSEDE explicitly) |
| Geo ad banner (tier-styled, geo-matched slot component) | L4 — `GeoAdBanner.tsx:1-135` | PARTIAL — `AdSlot` is geo-capable but sends no coords (ADS-062) and renders no tier chrome | Visual/commercial layer missing | RESTORE (tier chrome), FIX REGRESSION (coords) |
| Rotating ads (timed rotation within a slot) | L4 client-side; `/ads/next` server route missing (`RotatingAd.tsx:45`) | FULL — up to 3 campaigns per slot with hover/hidden/reduced-motion pauses (ADS-044) | V2 strictly better | SUPERSEDED WITH FULL PARITY |
| Desktop (Office) ad zones | L2/L3 — 5 triggered zones + 3 capped `AKAR_V2` placements authored (`AdminAds.tsx:250-262`); delivery `desktop.ts:176-203` consumed by the shipped C# client | PARTIAL — `/api/office/v1/ads` complete server-side, 5 flat placements, **no shipping client** (ADS-057) | Both halves exist in different products; neither is end-to-end today | MERGE INTO NEW SYSTEM |
| Desktop zone trigger semantics (onStartup/always/onDashboard/onReports/oncePerDay) | L2 — `AdminAds.tsx:256-262` | MISSING — office placements carry no trigger/frequency semantics | Lost scheduling vocabulary for the Office channel | RESTORE |
| Office placement inventory caps (side ≤2, bottom ≤3) | L3 — `AdminAds.tsx:250-254,1284-1292` | MISSING | Lost inventory control | RESTORE |
| Office banner live preview | L4 — `AdminAds.tsx:1466-1573` | MISSING | Lost authoring aid | RESTORE |
| Desktop integration developer guide in-console | L4 — `AdminAds.tsx:401-442,556-607` | MISSING | Lost onboarding surface | KEEP |
| Approval workflow | L4 — approve-with-price+note / reject-with-reason (`ads.ts:122-140`) | PARTIAL — reject leaves `is_active=1`; no price capture; no notification (ADS-089) | V1 approval is commercially richer; V2 has country-scoped authority V1 lacks | RESTORE (price at approval) + FIX REGRESSION (V2 reject bug) |
| Country-scoped approval authority | MISSING in V1 (single admin role) | FULL — `canManageTargets` (ADS-090) | V2-only | NEW IMPROVEMENT (keep) |
| Advertiser request flow (`/advertise`) | L4 end-to-end: form → pending ad → admin queue (`Advertise.tsx:151-198`, `ads.ts:142-175`) | BROKEN — `/advertise` posts to a non-existent route (ADS-088); the healthy request API is unreachable and whitelists 2 dead placements (ADS-085/086/087) | V1 is the working reference implementation | RESTORE |
| Visual layout diagram for buyers | L4 — `Advertise.tsx:33-113` | MISSING | Lost conversion aid | RESTORE |
| Empty-slot → `/advertise?position=` deep link | L4 — `AdBanner.tsx:178`, `GeoAdBanner.tsx:79`, `PageHeroSlideshow.tsx:64` | REGRESSION — dialog + floating actions exist but unreachable (ADS-086/087) | V1 pattern is simpler and works | RESTORE |
| Pricing / plans link for ad inventory | MISSING in V1 (Pricing sells listing plans) | MISSING (advertiser plans/invoices/contracts all MISSING, ADS-015-019) | Neither product prices ad inventory | PRODUCT OWNER DECISION |
| News ticker (promotional channel) | L4 end-to-end incl. auto-generation and per-page settings | BROKEN admin (ADS-077), duplicated public component | V1 is the working reference | RESTORE |
| Ad `country`/`city` display badge (distinct from targeting) | L4 — `AdBanner.tsx:27-40,103-111`, authored `AdminAds.tsx:1346-1359` | MISSING | Small but distinct creative feature | KEEP + IMPROVE |
| Per-ad accent colour / gradient / emoji icon | L4 — `AdBanner.tsx:164-169`, `AdminAds.tsx:1479-1493` | MISSING (copy-only creatives) | Lost creative styling | RESTORE |
| Base64 image upload from the admin (5 MB) | L3 — `AdminAds.tsx:1171-1193` | BROKEN — R2 binding throws under Node (ADS-030) | V2's design is better; V2's runtime is worse | SUPERSEDED WITH FULL PARITY (after ADS-030 is fixed) |
| Video creative | L3 — renderer only, no column (`PageHeroSlideshow.tsx:246-254`) | FULL design, BROKEN storage (ADS-026/030) | V2 better once storage is fixed | SUPERSEDED WITH FULL PARITY |
| Fallback / house ads | L3 — `/ads/next` `source:"brand"` + hero fallback slides (`useHeroSliders.ts:88-130`) | FULL — `is_fallback` inventory (ADS-043) | V2 strictly better | SUPERSEDED WITH FULL PARITY |
| Frequency capping per user | MISSING in V1 | PARTIAL — period ignored (ADS-042) | V2-only | FIX REGRESSION (keep) |
| Budget / daily budget | MISSING in V1 (`price` only) | PARTIAL — enforcement correct, `spent_amount` never written (ADS-040) | V2-only | FIX REGRESSION (keep) |
| Day-parting, OS targeting, domain targeting, device targeting | MISSING in V1 | FULL / PARTIAL (ADS-038, 065, 067, 068) | V2-only | KEEP (do not regress) |
| One fetch per page view | L4 — one `/ads/public` call feeds every slot (`GeoAdsContext.tsx:69-84`) | REGRESSION — 8 match calls per standard page, batch route unused (ADS-081/082) | V1's pattern is the fix V2 needs | KEEP (adopt V1 pattern via `match-batch`) |
| Delivery-time enforcement of dates/caps/status | MISSING in V1 (`ads.ts:7-42`) | FULL (`engine.ts:195-199,457-465,474`) | V2 strictly better | SUPERSEDED WITH FULL PARITY |
| Single engine | V1 has exactly one (`ads.ts` + `desktop.ts` reading the same table) | BROKEN — two engines on the same table names with incompatible schemas (ADS-083/084) | V1's single-table discipline is the target shape | MERGE INTO NEW SYSTEM |

---

## Target unified advertising core

The target is **one engine, one campaign table, one placement registry, one event pipeline** — V2's technical core
(`cur/lib/ads/engine.ts` + `cur/lib/ad-schema.ts` + `cur/src/constants/advertising.ts`) extended with V1's product model.
`cur/lib/advertising/core/matching.engine.ts`, `app/api/advertising/*`, `app/admin/advertising/*` and
`lib/db/schemas/advertising-schema.ts` are folded in and retired (ADS-083/084/093); their two unique concepts —
**governorate targeting** and **promotional news-ticker items** — must be carried over as first-class fields of the single
model, not left behind with the engine.

What the unified core must support, beyond what V2 already has:

1. **Placement registry with creative specs.** Every placement carries `targetSize` + `[minRatio, maxRatio]` (V1
   `AdminAds.tsx:16-80`) and the asset pipeline **rejects** non-conforming uploads (V1-ADS-012). Placement carries a
   channel (`website` | `office`), a page-family, and an optional **inventory cap** (V1's side ≤2 / bottom ≤3).
2. **Geo hierarchy with five grains**: country → macro-region (GCC/Levant/…) → governorate → city → village. Macro-region
   must remain a *sellable* unit derived from country membership (`v1/src/lib/adLocations.ts:7-18`), not a synonym for
   administrative region. Geo semantics must be decided once (see product-owner decisions) and applied identically on
   both channels.
3. **Commercial layer**: sponsor tier (ranking multiplier + visual chrome), `price`/currency on the campaign, a
   **screen-time product** (hours × `rotationSeconds` → impression quota), impression/click caps, budget and daily
   budget, and revenue reporting (Σ price, plus `spent_amount` actually written — the ADS-039/040 fix).
4. **Creative model**: image, video, and *styled* creatives — accent colour, gradient pair, emoji/icon, sponsor name,
   company logo, phone — plus ordered creatives with per-creative duration in a **3–60 s** range.
5. **Playlist vs single delivery** must be an explicit per-placement policy (`playlist` for hero, `single` for rails), so
   ADS-024 stops being an implicit design decision.
6. **Delivery-time enforcement** of status, approval, flight window, caps, budget and frequency — V2 already has this and
   it must not regress when V1's fields are merged in.
7. **One request per page view.** Adopt V1's single-fetch shape by wiring the already-built `POST /api/ads/match-batch`
   (ADS-082) into the standard layout, giving cross-slot dedup for free.
8. **Self-serve funnel**: empty slot → `/advertise?placement=…` → request → pending campaign → admin approve **with price
   and note** → active, with a notification to the requester (missing in both products).
9. **News ticker as a targeted promotional channel** of the same core: bilingual/trilingual copy, icon + colour, channel
   target (web/office/both), page targeting, geo targeting, per-page `maxItems`/`enabled`/`refreshInterval`, and the
   auto-generation job from properties/services/offices/blog/auctions (V1-ADS-103).

### Can ONE campaign serve Web and Office consistently?

**Yes — and it already almost does on both sides, but not through the same path today.** V1 serves both from one `ads`
row: the web reads `position` (`ads.ts:20-42`) and the desktop reads `desktopZone` (`desktop.ts:176-185`) — two keys on
one row, and the admin never writes the second (V1-ADS-086), so in practice the Office channel is unfillable. V2 serves
both from one `ad_campaigns` row through one engine: `matchAds` is called by the web route and by
`app/api/office/v1/ads/route.ts:44` with `channel: "office"`, gated by `channels` (`cur/lib/ads/engine.ts:294-298`) — the
correct architecture — but no shipped desktop build calls it (`inv/dll_urls.txt` shows only `/api/desktop` and
`/api/program/*`; the C# source targets `/api/desktop/ads/placement/desktop_portal_bottom_banner`,
`desk/AkarApp_Next/AkarApp/Services/DesktopAdService.cs:16,265-273`).

To make "one campaign, both channels" true, five things are required:

1. **One placement registry spanning both channels.** Office placements become ordinary entries in
   `AD_PLACEMENTS` with `channel: "office"` — including the V1 zone vocabulary (`desktop_startup`, `desktop_sidebar`,
   `desktop_dashboard`, `desktop_reports`, `desktop_popup`, `side`, `bottom`, `any`) mapped onto or aliased to the five
   `OFFICE_AD_PLACEMENTS`, plus the desktop's actual live key `desktop_portal_bottom_banner`. One campaign then targets
   `["web_home_hero","office_dashboard_hero"]` in one field, and `channels` stops being a second, parallel switch.
2. **Trigger + frequency semantics on office placements** (`onStartup`, `always`, `onDashboard`, `onReports`,
   `oncePerDay`), since the Office shell shows ads on events rather than on scroll. Without these, V1's desktop product
   cannot be expressed at all.
3. **Creative variants per channel.** Office banners are 180 px rails / bottom bars and often text+gradient with no image
   (V1 `backgroundFrom/To`, `AdminAds.tsx:1479-1493`); web needs 2.5:1 heroes and IAB rectangles. One campaign, several
   creatives, each bound to a placement/aspect — the `ad_creatives` table already supports this once `position`/media
   variants are extended with a `placement` binding.
4. **One event pipeline with a `channel` dimension.** Today V1 increments the same two counters from web and desktop
   (`ads.ts:177-193` vs `desktop.ts:187-203`) with no way to tell them apart, and V2's office POST branch writes through
   `recordImpression`/`recordClick` with an HMAC token the desktop client does not yet mint. Requirement: every
   impression/click/conversion row carries `channel`, and the Office client authenticates with the device token +
   `office.ads.read` scope that `cur/lib/integration/office-auth.ts` already implements.
5. **Offline tolerance.** The desktop caches for 12 h (`DesktopAdService.cs:18`) and evaluates the flight window locally
   (`:154-158`), so the delivery payload must include `startDate`/`endDate`/`rotationSeconds` and the client must be
   allowed to buffer and replay tracking events — otherwise caps and pacing computed server-side will silently
   over-deliver on the Office channel.

With those five, a single campaign row with `channels: ["website","office"]`, per-channel creatives and per-channel
placements serves both surfaces consistently, and one analytics view reports them side by side.

---

## Product-owner decisions required

1. **Hero: playlist or single delivery?** V1 sells a hero as an ordered playlist per page; V2 sells one impression per
   slot ("a 5-creative campaign does NOT get 5× the exposure", `cur/lib/ads/engine.ts:536-541`). Pick one, or make it a
   per-placement policy. This determines hero pricing.
2. **Geo semantics: OR (broaden) or AND (narrow)?** `ads.ts:29-34` vs `cur/lib/ads/engine.ts:374-400`. This changes fill
   rate and CPM for every geo campaign.
3. **Is the macro-region (GCC / Levant / North Africa / …) a sellable targeting unit?** If yes it needs a first-class
   field distinct from `region_ids`; if no, V1's regional bookings must be rewritten as country lists.
4. **Is village/neighbourhood targeting a product?** It is authored in V1 (admin and public form) but never queried.
   Keep and implement, or retire explicitly.
5. **Does sponsor tier survive, and what does each tier buy?** Ranking boost, visual chrome, guaranteed share of voice,
   or all three. Required before pricing can be set.
6. **Is screen-time (hours) a sellable unit alongside impressions and clicks?** V1's `duration` end mode converts hours to
   impressions via `rotationSeconds` (`AdminAds.tsx:839-848`). Keeping it means keeping `rotationSeconds` as a commercial
   parameter, not just a UI timing.
7. **Office channel ownership.** Do Office ads share one campaign with Web (recommended), or remain a separate product
   with its own inventory and pricing? This decides whether `desktop_*` zones become placements of the unified registry
   or a separate table.
8. **Office placement caps and triggers.** Are side ≤2 / bottom ≤3 and `onStartup`/`oncePerDay` contractual guarantees?
   If yes they become engine features, not authoring hints.
9. **Advertiser as an entity.** V1 stores advertiser name/email/phone on the campaign; old-V2 had advertisers with plans,
   contracts, invoices, payments and documents (all MISSING in current V2, ADS-015-019). Decide the target advertiser
   model before building the request funnel.
10. **Ad inventory pricing surface.** Neither product publishes ad prices. Should `/advertise` show a rate card
    (placement × tier × duration), or stay enquiry-only?
11. **Ticker: editorial or advertising?** V2 has two tickers (`cur/src/components/NewsTicker.tsx` news vs
    `cur/components/advertising/placements/NewsTicker.tsx` promo). V1 has one that mixes auto-generated editorial items
    with manual promotional ones. Decide whether ticker slots are sellable inventory.
12. **Auto-generated ticker content.** Keep V1's job that mints items from new properties/services/offices/blog/auctions
    (`news-ticker.ts:35-87`)? It is a content-freshness feature with no V2 equivalent.
13. **`window.updateAd` console injection.** V1 exposes ad injection on `window` with no authorization
    (`v1/src/main.tsx:9-13`). Confirm it is retired, not ported, and that no operational runbook depends on it.
14. **Marketer↔advertiser proposals/contracts/commissions** (`schema.prisma:278-362`, UI at
    `v1/src/pages/marketer/Advertiser*.tsx`, no server routes): is this part of advertising, of the marketer domain, or
    out of scope? It is currently UI-only against a missing API.


## Round 2 — AkarProMax Office desktop capability registry

## Desktop capabilities with no web counterpart

Ordered by product weight. "No counterpart" means neither `/home/claude/work/v1` nor
`/home/claude/work/cur` contains a table, route or page implementing the concept.

### Tier 1 — core office operations, entirely absent from both webs

| Capability | Rows | Why it matters |
|---|---|---|
| **Rent and sale contract lifecycle** — creation, installments, renewal, cancellation, deposit, earnest, handover, witnesses, e-signature, clause assembly, printing | DESK-058…DESK-080 | The single largest gap. 23 capabilities and 12 tables (`Contracts`, `SaleContracts`, `RentInstallments`, `SaleInstallments`, `ContractClauses`, `ContractMembers`, `ContractTemplates`, `LegalClauses`, `ESignatures`, `HandoverSchedules`, `PostDatedChecks`, `StaffCommissions`) with **zero** web representation. This is what the office actually sells. |
| **Office authorisation contracts** | DESK-081, DESK-082 | Exclusive-listing authorisations with commission terms, two witnessed signatories and a scanned original. 1,703 lines of desktop code (`OfficeAuthContractViewModel` + `OfficeAuthorizationWindow`) and one table, with no analogue. |
| **Full accounting stack** — treasury, agency ledger, client ledger, tax/fee types, vouchers, receipts, staff commissions, collection commission, net profit | DESK-102…DESK-121 | 20 capabilities, 7 tables. Neither web has any ledger concept at all. |
| **Post-dated cheque register** and its overdue daemon | DESK-110…DESK-112 | A regulated, cash-flow-critical artefact with a dedicated screen and a background sweep. |
| **Ownership shares and party model** — `Ownerships`, `ClientGroupMembers`, agent/attorney block, brokers | DESK-021, DESK-022, DESK-040, DESK-044 | Both webs model exactly one owner (`properties.user_id`). Real listings have fractional owners, agents acting under POA, and co-brokers with commission shares. |
| **Powers of attorney** with expiry alerting | DESK-083…DESK-085 | Legal prerequisite for acting on an owner's behalf; no web table. |
| **Property legal dimension** — restrictions, clearance certificates, court/office POA paths, public disclosures | DESK-047…DESK-049 | Regulatory content that must accompany a listing; absent from both webs. |
| **Land/survey geometry** — bounds, survey points, GIS polygons, UTM, KMZ | DESK-034…DESK-037 | The webs store only WGS84 lat/lng. No projection code exists anywhere, so this data cannot even be converted. |
| **Maintenance tickets** with technician assignment and owner cost recovery | DESK-097…DESK-101 | V1 has an artisan marketplace, which is a different product; there is no property-maintenance ticket. |
| **Requirement-based radar** — weighted scoring, tolerance, match persistence, alerting, review buckets | DESK-092…DESK-096 | V2's "radar" is a geospatial proximity scan with no request dimension, no score, no persistence and no notification. V1 has no radar. |

### Tier 2 — significant, absent from both webs

| Capability | Rows |
|---|---|
| Granular per-user permission grants with an audit trail (`UserRolePermissions`) | DESK-008 |
| Field-level privacy flags (`HideTrueOwner`, `CanViewFinancials`, …) | DESK-009 |
| Four-role model (`SuperAdmin`/`BranchManager`/`Accountant`/`DataEntry`) | DESK-006 |
| Branch scoping on every financial record | DESK-012, DESK-013 |
| Country configuration — per-country currency, tax, field visibility, label overrides | DESK-127, DESK-128 |
| Shared lookup taxonomy (19 categories / 106 items, hierarchical, sortable) | DESK-126 |
| Client timeline with agent, rating and tags | DESK-025 |
| Multiple labelled phones and addresses with map links and address photos | DESK-016…DESK-018 |
| Genealogy / civil-registry fields | DESK-023 |
| Public lead pool, lead claiming, max-2-claims rule, lead→contract closure | DESK-088…DESK-091 |
| Inter-agency co-broking requests and commission splits | DESK-086, DESK-087 |
| Multi-currency per field | DESK-109 |
| Property units breakdown, installment plans, payment-type flags | DESK-039, DESK-045, DESK-046 |
| Five-axis property lifecycle | DESK-033 |
| Selective field disclosure on publish | DESK-056 |
| Local backup, scheduled backup, WebUI-driven backup/restore | DESK-133…DESK-136 |
| Offline licence with DPAPI + registry shadow and clock-rollback detection | DESK-144 |
| Signed activation coupons | DESK-142 |
| App integrity manifest | DESK-174 |
| WIA document scanning | DESK-159 |
| WhatsApp reminder composer, bulk send, reminder daemon | DESK-171…DESK-173 |
| Print pipeline with configurable margins and background | DESK-130, DESK-160 |
| Dual storage paths with drive fallback | DESK-131 |
| Ad-copy generator | DESK-169 |

### Tier 3 — desktop-only by nature (no web counterpart needed, but record the capability)

`Views/AkarV2PortalWindow.cs` shell (DESK-153), the localStorage↔file bridge (DESK-154, DESK-155),
data-root chooser (DESK-158), diagnostics forwarding (DESK-157), HWID generation (DESK-139), the
key-generator window (DESK-141), first-run language chooser (DESK-177), demo seeding (DESK-178).

---

## Web capabilities with no desktop counterpart

### From V1

| Capability | V1 evidence | Note |
|---|---|---|
| Auctions — bidding, participants, settings, logs, reports, price history, early warning, relist monitoring, sale proofs | `v1/src/pages/Auctions.tsx`, `AuctionDetail.tsx`, `AuctionHistory.tsx`, `AuctionStats.tsx`, `v1/server/api/src/routes/auctions.ts`, `auction-enhancements.ts`, `relist-monitoring.ts` | Entire domain absent from the desktop |
| Tenders — creation, bidding, activity log, settings | `v1/src/pages/Tenders.tsx`, `TenderCreate.tsx`, `TenderDetail.tsx`, `DashboardTenderBids.tsx`, `routes/tenders.ts` | Absent |
| Service marketplace / ServiceHub — profiles, requests, ratings, feedback | `v1/src/pages/ServiceHub.tsx`, `OtherServices.tsx`, `MyServiceDashboard.tsx`, `routes/service-hub.ts`, `routes/services.ts` | Absent |
| Artisan / technician operating model — upgrade, dashboard, inbox, settings | `v1/src/pages/UpgradeToArtisan.tsx`, `ArtisanDashboard.tsx`, `TechnicianInbox.tsx`, `TechnicianSettings.tsx` | The desktop has only a flat technician directory |
| Marketer / marketing contracts, proposals, commissions, ranks, code of conduct | `v1/server/api/prisma/schema.prisma:189,211,230,244,278,317,344,364` | Absent |
| Blog / content publishing | `v1/src/pages/Blog.tsx`, `WriteBlog.tsx`, `routes/blog.ts` | Absent |
| Suppliers catalogue | `v1/src/pages/Suppliers.tsx`, `routes/suppliers.ts` | Absent |
| Public inquiries | `v1/server/api/src/routes/inquiries.ts` | The desktop has no inbound-inquiry concept |
| Realtime chat | `v1/server/api/src/chat-server.ts` | Absent |
| Push notifications / VAPID | `v1/server/api/src/index.ts:127`, `schema.prisma:1085` | Absent |
| Email log | `schema.prisma:1119` | The desktop has SMTP settings but no send log |
| Payments — Thawani and Tap checkout/verify | `v1/server/api/src/routes/payments.ts:37,50,57,71` | The desktop has no payment path |
| Plans / coupons / subscriptions | `routes/plans.ts`, `routes/coupons.ts`, `schema.prisma:173,583,602` | The desktop consumes a status, never a catalogue |
| Bookings | `schema.prisma:1191` | Absent |
| Identity verification, blocked IPs, login attempts, blacklist, moderators | `schema.prisma:131,149,161,695,882` | Absent |
| Office rating snapshots | `schema.prisma:1135` | Absent |
| Market rates, market history, investment radar | `v1/src/pages/InvestmentRadar.tsx`, `MarketHistory.tsx`, `index.ts:128-130` | Absent |
| Admin surfaces — Emperor, Elite Leads, Matchmaking, Membership, SEO, Tickets, Analytics, Moderators, Verification, Discounts, Notifications, Activity Log | 12 `v1/src/pages/Admin*.tsx` | The desktop has no admin console; `Views/UserManagementView.cs` is its nearest analogue |
| Desktop version / update feed | `routes/desktop.ts:16` | Server-side only — **the desktop has no updater** |

### From V2

| Capability | Current evidence | Note |
|---|---|---|
| Sponsor-side device management — pairing codes, device list, revoke | `cur/app/api/office/v1/pairing/route.ts:10,20,37`, `devices/route.ts:9,20`, `cur/app/dashboard/office/devices` | No desktop-side view of its own pairing state (DESK-152 exists but is unreachable) |
| Scoped credentials (8 scopes) | `cur/lib/integration/constants.ts:44-54` | The desktop has no scope concept |
| Protocol/app-version negotiation | `cur/lib/integration/constants.ts:81-101` | The desktop sends a stale version (DESK-150) |
| Server-sent events channel | `cur/app/api/office/v1/stream/route.ts:7` | No desktop SSE client exists |
| Idempotent operation sync with conflict detection | `cur/app/api/office/v1/sync/route.ts:29` | `CloudSyncQueue` has no idempotency key and no code |
| Geospatial radar | `cur/app/api/office/v1/radar/route.ts:19` | The desktop has no lat/lng on any wire DTO |
| Office notification rules and delivery receipts | `cur/app/api/office/v1/notifications/route.ts:7` | The desktop's alerts are purely local |
| Multi-language ad and news content (ar/en/tr) | `cur/lib/integration/ads.ts`, `news/contracts.ts` | The desktop ad/news DTOs are single-language |
| Organisation membership model | `cur/app/dashboard/office/members` | The desktop's `Users`+`TenantId` is unrelated |
| Saved searches, favourites, offer types | `cur/app/api/properties/saved-searches`, `favorites`, `offer-types` | Absent from the desktop |

---

## Product-owner decisions required

1. **Which server does the desktop talk to?** V1's `/api/desktop/*` matches the desktop path-for-path
   and one route (`subscription-status`) is a field-perfect match; V2 has no `/api/desktop` at all but
   has a complete pairing/credential system the desktop already has a client for. Pick one, or run a
   compatibility shim. This decision blocks 18 of the 18 desktop→web rows.
2. **One device identity, or three?** The desktop HWID (`HwidGenerator.cs:10`), the desktop
   installation GUID (`DeviceIdentityService.cs:16`) and V1's `SoftwareLicense.hwid` are three
   different things. Deciding they are the same thing is a one-line change and unlocks
   `office_devices.installation_id` ↔ `software_licenses.hwid` joins.
3. **Is the licence self-verifying or server-verified?** The desktop's key is
   `SHA256(HWID + compiled salt)` — anyone with the binary can mint keys (DESK-140, DESK-141), and the
   product ships the generator UI behind Ctrl+Shift+6. V1 issues random keys validated against a DB.
   These are irreconcilable; choose one before shipping either.
4. **Does the office data model move to the web, or does the desktop stay the system of record?**
   Contracts, ledgers, cheques, POAs, authorisations, ownership shares and legal status exist only on
   the desktop. Either the web grows ~25 tables, or the desktop remains authoritative and the web
   becomes a publishing/marketing surface. Half-measures produce the current state: three property
   stores that cannot round-trip.
5. **What is `CloudSyncQueue` for?** It is created by the migration and referenced by no code
   (DESK-137). Either delete it or make it the outbound queue — and if the latter, add an idempotency
   key so it can feed V2's `POST /sync`.
6. **Which permission system wins?** The desktop has two (substring-matched `Users.Permissions`, and
   structured `UserRolePermissions`), the webs have a third. The substring matcher is a live security
   defect (`ViewModels/Perm.cs:22-33`) regardless of the decision.
7. **Do coordinates matter?** Bounds, survey points and UTM polygons are among the desktop's most
   distinctive data, and `OnlinePropertyService` hard-codes `lat:0, lng:0`. Without a projection
   decision, no office property can ever appear on a map or in V2's geo radar.
8. **Is cloud backup a product?** `Settings.CloudBackupUploadUrl` is free text with no server on
   either side (DESK-135). Either build an intake endpoint or make it explicitly office-provided
   (e.g. an S3-compatible URL) and document the contract.
9. **Single-language or multilingual?** Desktop contracts, ads, news, lookups and clause libraries are
   Arabic-only; both webs are ar/en (+tr on V2). Retrofitting translation onto 12 contract tables is a
   large project that must be scoped now, not discovered later.
10. **Does the desktop get an updater?** `GET /api/desktop/version` exists in V1 with
    `forceUpdate`/`minVersion` semantics and has **no client**. Combined with the version-reporting
    defect (`AssemblyInfo.cs:13-15` says 1.0.0 while `AkarApp.csproj:9` says 1.2.0), the fleet cannot
    be upgraded or even accurately counted.
11. **Where does office identity live?** Office name, phone, address, tax/CR numbers, logo, tier,
    branches, staff and permissions exist on the desktop with no sync path in either direction, while
    V2 has `organizations`/`organization_branches`/`organization_members`. One must become
    authoritative.
12. **What happens to the 55-table local DB on migration?** `Properties.DesktopDraftId`,
    `DesktopWebsiteUrl` and `IsPublishedToWebsite` are in the EF model and the seeder but not in the
    shipped DB nor in `V2SchemaMigration` — an existing installation would break. A migration owner is
    needed before any release.


## Round 2 — V1 Identity, Authorization, Moderators, Rank, Membership

## V1 vs V2 capability matrix

| Capability | V1 depth + evidence | V2 status + evidence | Verdict | Decision |
|---|---|---|---|---|
| One canonical identity row | **L2** — `users` + a second `Partner` credential store (`schema.prisma:870-880`) + a chat shadow table (`chat-server.ts:138-141`) + a DEV localStorage store (`api.ts:20-52`) = 4 key spaces | **PARTIAL** — 4 uncorrelated key spaces (`AUTH-052`) | **both fail identically, two generations apart** | MERGE INTO NEW SYSTEM |
| Self-service registration | **L4** — 3-step wizard, 3 account types (`Register.tsx:282-437`) | **PARTIAL** — single page, no office/company UI (`AUTH-007/008`) | **V1 better on account-type coverage** | RESTORE |
| Email verification | **L4** — 1 h JWT (`auth.ts:210-217,336-361`) | **FULL** — 32-byte hashed, single-use, 24 h (`AUTH-010`) | V2 better | SUPERSEDED WITH FULL PARITY |
| Verification enforced at login | **L1** — client-side only (`LoginForm.tsx:54-62`) | **FULL** — server-side, 5 statuses (`AUTH-019`) | V2 better | FIX REGRESSION (V1) |
| Session revocation / logout | **L1** — clears localStorage (`AuthContext.tsx:172-177`) | **FULL** — in-memory + PG `session_revocations` (`AUTH-021/023`) | V2 better | SUPERSEDED WITH FULL PARITY |
| Token storage | **L4 but unsafe** — `localStorage` (`AuthContext.tsx:166`) | **FULL** — HttpOnly cookie (`AUTH-022`) | V2 better | SUPERSEDED WITH FULL PARITY |
| Password reset | **L4** (`auth.ts:363-451`) | **PARTIAL** — also force-activates the account (`AUTH-025`) | **V1 better — no activation bypass** | FIX REGRESSION (V2) |
| Change password / change email | **L0** — no endpoint | **FULL/PARTIAL** (`AUTH-026/027`) | V2 better | KEEP (V2) |
| OAuth | **L0** — absent | **BROKEN** — callbacks 500 (`AUTH-028/029`, Phase 0) | neither works | FIX REGRESSION |
| 2FA | **L0** | **MISSING** — unused dep (`AUTH-014`) | neither | NEW IMPROVEMENT |
| Login modal + soft auth gate | **L4** (`LoginModalContext.tsx:34-61`; `AuthGate.tsx:16-101`) | **MISSING** | **V1 better — a real conversion pattern** | RESTORE |
| Username as an identifier | **L4** (`schema.prisma:22`; `profile.ts:29-33`) | **MISSING** | V1 better | RESTORE |
| Structured name + gender + birth date + age gate | **L4/L3** (`Register.tsx:57-78`) | **MISSING** | V1 better | RESTORE |
| Public profile by handle | **L4** (`profile.ts:29-68`) | **PARTIAL** — org-only (`PROF-018`) | V1 better | KEEP |
| Portfolio media | **L4** — upload, order, caption, ownership-checked delete (`profile.ts:86-118`) | **BROKEN** — R2 import fails under Node (Phase 0) | **V1 better** | RESTORE |
| Personal API key | **L4** (`auth.ts:469-486`) | **MISSING** | V1 better | RESTORE |
| Account-type upgrade | **L1** — a localStorage write (`UpgradeToArtisan.tsx:60-61`) | **PARTIAL** — real provider application (`AUTH-051`) | V2 better | SUPERSEDED WITH FULL PARITY |
| Organization creation | **L1** — localStorage (`CompanyContext.tsx:57-72`) | **PARTIAL** — real API, no UI (`AUTH-008`) | **both incomplete; combine V1's UI with V2's API** | MERGE INTO NEW SYSTEM |
| Organization membership | **L1** — `window.prompt` + integer id (`MyCompanies.tsx:28-32`) | **PARTIAL** — real table, no invite UI (`AUTH-050`) | **both incomplete** | MERGE INTO NEW SYSTEM |
| Organization role | **L1** — `["post"]`, never read (`CompanyContext.tsx:77`) | **PARTIAL** — 5 roles, thin enforcement (`AUTH-049`) | V2 better | MERGE INTO NEW SYSTEM |
| Personal ↔ org context switch | **L1** — UI complete, context never sent to the server (`AccountSwitcher.tsx:15-62`) | **MISSING** | **V1 better — the product idea is right** | RESTORE |
| Org-level capability flags | **L4** — `canCreateAuctions`, `isAuctionsBanned`, `isVerified` on `Office` (`schema.prisma:454-457`) | **MISSING** | **V1 better** | RESTORE |
| Platform role vocabulary | **L4** — 3 roles (`schema.prisma:37`) | **FULL** — 12 roles (`cur/src/constants/roles.ts:11-32`) | V2 better | KEEP (V2) |
| Role → permission mapping | **L2** — JSON stored, **never read** (`schema.prisma:686`) | **FULL** — `ROLE_CATALOG`, actually read (`AUTH-040`) | V2 better | KEEP (V2) |
| Permission vocabulary | **L1** — 15 UI keys (`AdminModerators.tsx:18-34`) | **PARTIAL** — 88 keys but **two incompatible models** (`AUTH-041`) | V2 richer, both messy | MERGE INTO NEW SYSTEM |
| Dynamic DB-defined roles | **L2** — table + CRUD, unenforced, client contract broken (`admin.ts:290-327`) | **BROKEN** — unmigrated tables, `if (!session)` authz (`AUTH-043`) | **V2 worse — it is an escalation hole** | MERGE INTO NEW SYSTEM |
| Role promotion actually takes effect | **L3** — `PUT /admin/users/:id/role` **does** write `users.role` (`admin.ts:104-113`) | **REGRESSION** — admin writes `sponsor_access`, resolution reads `users.role` (`AUTH-044`) | **V1 better** | FIX REGRESSION (V2) |
| Admin bootstrap | **L0** — no seed, no first-user promotion | **BROKEN** — seed never sets `status='active'` (`AUTH-045`) | **neither tree can create an admin** | FIX REGRESSION |
| Moderator entity scope | **L0** — no column (`schema.prisma:683-705`) | **PARTIAL** — `moderator_scopes.module`, write-only | V2 further along, still inert | NEW IMPROVEMENT |
| Moderator geo scope | **L0** | **BROKEN** — `country_code`/`city_id` stored, `hasScopedPermission` ignores scope (`cur/src/constants/permissions.ts:112-113`) | **V2 has the data and no check** | FIX REGRESSION |
| Moderator work queue | **L4 but unrouted** (`ModeratorPanel.tsx`, no `App.tsx` entry) | **MISSING** | **V1 better — restore and route it** | RESTORE |
| Enforced moderation domains | **L4** — 2 (property, auction), 8 routes (`properties.ts`, `auctions.ts`) | **PARTIAL** — permission constants exist for ~10 domains | V2 broader, V1 actually enforced | MERGE INTO NEW SYSTEM |
| Audit trail | **L3** — one `ActivityLog` table, **anonymous read and anonymous forgeable write** (`other.ts:7,65-77`) | **PARTIAL** — two audit tables, admin reads only one (`frag/01-identity.md` dup #8) | both weak | MERGE INTO NEW SYSTEM |
| Identity verification workflow | **L2** — model with one writer, zero readers (`auth.ts:199`) | **FULL** — generalised `verification_records` (`PROF-020`) | V2 better | SUPERSEDED WITH FULL PARITY |
| Trust badges | **L1** — `EliteBadge` phd/engineer, no data source (`EliteBadge.tsx:18-49`) | **MISSING** — no badge model (`PROF-023`) | **V1 better on vocabulary — this answers the open V2 question `PROF-023`** | RESTORE |
| Reputation scoring engine | **L0** — no computation anywhere | **FULL** — 9 weighted signals, per-type policies (`RANK-002/004`) | V2 far better | KEEP (V2) |
| Automatic reputation evaluation | **L4 for offices** — hourly `recalculateAllOfficeRatings` + snapshots (`index.ts:179-181`) | **MISSING** — the only caller is a manual admin POST (`RANK-007/008`) | **V1 better — V1 has the scheduler V2 lacks** | RESTORE |
| Rank effects (badge, ordering, quota, privilege) | **L0** — none | **MISSING** — all of `RANK-012…018` are "no effect" | neither | PRODUCT OWNER DECISION |
| Rank vocabulary | **L0** — no catalogue (`admin.ts:443` returns `[]`); only the literal `"explorer"` | **FULL** — new/rising/distinguished/gold/promax (`RANK-001`) | V2 better | KEEP (V2) |
| Subscription plans | **L4** — with `targetType` audience segmentation (`schema.prisma:583-600`) | **REGRESSION** — tables kept, APIs deleted (`AUTH-009`) | **V1 better** | RESTORE |
| Plan-limit enforcement | **L0** — nothing reads a subscription | **MISSING** — `max_*` columns unenforced (`RANK-016`) | **old V2 (`hist/old-tag`) was the best of the three** | RESTORE |
| Coupons | **L4 model, L3 flow** — `usedCount` never incremented (`coupons.ts:52-62`) | **MISSING** | V1 better, still broken | RESTORE |
| Payment gateways | **L1** — entirely fabricated (`payments.ts:37-76`) | **MISSING** | **neither tree can take money** | RESTORE |
| Desktop licence + HWID | **L4** (`admin.ts:357-406`; `desktop.ts:205-224`) | **MISSING** — `/api/program/*` does not exist (`AUTH-058`) | **V1 better** | RESTORE |
| Per-user permission grants with a grantor | **L0** | **MISSING** (`AUTH-059`) | **desktop is the only implementation** — `UserRolePermissions(UserId, PermissionKey, IsAllowed, GrantedByUserId, GrantedAt)` | RESTORE from desktop |
| Branch/entity scope actually applied | **L0** | **BROKEN** | **desktop only** — `AppSession.EffectiveBranchId` (`desk/…/ViewModels/AppSession.cs:49`) | RESTORE from desktop |

---

## Product-owner decisions required

1. **Which account types are first-class at signup?** V1 offers three (`individual`/`professional`/
   `company`, `Register.tsx:56`) and models five (`schema.prisma:12-18`), of which `REALTOR` and
   `OFFICE` have never been creatable. V2 offers one plus an upgrade path and has no office/company
   UI at all (`AUTH-008`). Decide the canonical list and whether "office" is a user type or purely
   an organization. Related open V2 question: `frag/01-identity.md` decision 6.
2. **Is an organization a first-class actor?** V1's `AccountSwitcher` (`AccountSwitcher.tsx:15-62`)
   presupposes "one human identity + N organization contexts" but never sends the context to the
   server. Decide whether listings, messages, auctions and contracts can be **owned by an
   organization** rather than by a person. This determines whether `ORGANIZATION MEMBERSHIP` and
   `ORGANIZATION ROLE` are core or cosmetic.
3. **Does a rank ever do anything?** All of V1's rank surface is a no-op (`admin.ts:115-119,443-445`)
   and all of V2's is "no effect" (`RANK-012…018`). Specify, per rank: badge artwork, directory
   weighting, quota delta — and confirm, in writing, that the privilege column is **empty by policy**
   (Article 7). This is `frag/01-identity.md` decision 5, unchanged.
4. **Is the academic badge (دكتوراه / مهندس) a product commitment?** V1 has the vocabulary and the
   renderer (`EliteBadge.tsx:18-49`) but no data source; V2 has neither and lists badge vocabulary as
   `OLD SOURCE REQUIRED` (`PROF-023`). **V1 is the missing source.** Decide whether to adopt it, and
   if so, what evidence a credential badge requires.
5. **What is `membershipLevel` — commerce or reputation?** V1 renders `basic`/`professional`/`promax`
   as a gold Crown on office and supplier cards (`OfficeCard.tsx:32,79-83`) from a column that does
   not exist. If it is commerce it belongs to `SUBSCRIPTION`; if reputation it belongs to
   `REPUTATION RANK`. It cannot be both.
6. **Is `MarketerRank.defaultCommission` acceptable?** It makes a reputation ladder set the money
   rate (`schema.prisma:195`). Either the marketer ladder is a *commercial tier* (fine) or it is
   reputation (in which case commission must be decoupled).
7. **What happens to the entire marketer subsystem?** 6 Prisma models, 8 pages, 20 endpoints — and
   **no server implementation anywhere** (`server/api/src/routes/` has no marketer file). It is
   either a genuine unbuilt product line or abandoned scaffolding. `MarketerRank`, `CodeOfConduct`
   and `CodeOfConductAcceptance` (`schema.prisma:189-242`) are well-designed and worth keeping
   regardless.
8. **Does `Partner` remain a separate credential store?** (`schema.prisma:870-880`.) Recommendation:
   no — fold into `identities` + org membership. Requires a product decision because the
   partner-portal UX assumes a separate login.
9. **Does the platform take money, and through which gateway?** V1's Thawani/Tap integration is
   entirely fabricated (`payments.ts:37-76`) and V2 has none. Until this is answered, `SUBSCRIPTION`
   cannot be more than an admin-granted flag.
10. **What does a subscription actually buy?** No V1 route and no V2 route reads a subscription to
    gate anything; only `hist/old-tag` enforced plan limits (`RANK-016`). Name the quotas
    (listings, media, contacts, branches, users, ads) before building the checkout.
11. **Should `tokenBalance` survive?** (`schema.prisma:44`; granted at `admin.ts:557-568`, never
    spent.) Either specify the spend surface or drop it.
12. **How is the first administrator created?** Neither tree has a working path — V1 has no seed
    script at all and V2's is broken (`AUTH-045`). This blocks every admin capability in both trees
    and needs an answer before Phase 1.
13. **Is dynamic, DB-defined role editing a product requirement?** V1 built the table and never read
    it (`schema.prisma:683-693`); V2 built the table, never migrated it, and left it unguarded
    (`AUTH-043`). Two independent attempts at the same feature both failed. Decide whether a
    compile-time catalogue is acceptable — this is `frag/01-identity.md` decision 3, and V1's
    evidence strengthens the case for "compile-time is enough".
14. **Should the integrity charter / code of conduct be enforced?** V1 records acceptance with IP and
    user-agent (`schema.prisma:230-242`) — a legally sound model with zero writers. Decide whether
    acceptance gates any action.
15. **Which of the 13 moderator domains ship in Phase 1?** V1 enforced two (property, auction). The
    other eleven are declared but empty. Prioritising all thirteen at once will reproduce V1's
    "declared but unenforced" failure.


## Round 2 — V1 Properties, Leads, Organizations, Marketers, Suppliers, Partners

## V1 vs V2 capability matrix

| Capability | V1 depth + evidence | V2 status + evidence | Verdict | Decision |
|---|---|---|---|---|
| Public property browse | L3 — rich filter UI (`v1/src/pages/Properties.tsx:154-1732`) but the query targets a non-existent `/estates` (`:415`) | PARTIAL/BROKEN — page reads `data.properties`, API returns `{success,data,pagination}` → demo fallback (PROP-001/002, `cur/app/properties/page.tsx:83`) | Both broken at the same seam; V1's *filter vocabulary* is far richer | RESTORE the filter vocabulary onto the V2 API |
| Filter breadth | L3 — 20+ filters incl. facade, area units, listing type, payment method, offer type, village (`Properties.tsx:181-208,873-1090`) | FULL but narrow — price/area/beds/baths/geo/offer-type only (PROP-004/005/006) | V1 richer | KEEP + IMPROVE |
| Property media gallery | L4 — carousel + fullscreen lightbox + video badge (`v1/src/pages/PropertyDetail.tsx:198-320`) | MISSING — single `<img>` although the API returns the array (PROP-014) | V1 better | RESTORE |
| Property image upload | L4 — multer, 4 files, 10 MB, MIME whitelist, disk write (`v1/server/api/src/routes/properties.ts:12-39,141-147`) | MISSING — no property upload API; the form takes a URL string (PROP-027) | V1 better | RESTORE |
| Map on a listing | L4 — Leaflet marker from `lat`/`lng` (`PropertyDetail.tsx:642-648`) | MISSING — no map component (PROP-010) | V1 better | RESTORE |
| Share a listing | L4 — WhatsApp/Facebook/X/Telegram + copy (`v1/src/components/ShareModal.tsx:26-50`) | MISSING for properties (PROP-061) | V1 better | RESTORE |
| Property finance tools | L4 — mortgage/flexible/fixed calculators + server amortisation engine (`v1/src/components/PropertyFinanceTools.tsx:14-53`, `v1/server/utils/installment-calculator.ts:36-112`) | none found in the V2 registry | V1-only capability | RESTORE |
| Investment gauge on a listing | L4 — client heuristic score (`v1/src/components/InvestmentGauge.tsx:10-31`) | none found | V1-only | RESTORE (label it a heuristic, not AI) |
| Expanded commercial terms (rent periods / sale plans / offer types) | L1 — full editor, DEV-mock persistence only (`v1/src/components/PropertyListingForm.tsx:16-64`, `v1/src/lib/api.ts:473-495`) | PARTIAL — offer types are modelled and policy-enforced (PROP-032..035, `cur/lib/properties/offer-policy.ts:14-61`) | V2 better on the DB, V1 better on the term matrix | MERGE INTO NEW SYSTEM |
| Submit-for-review lifecycle | L4 — new listings forced to `pending`, approve/reject/mark-sold endpoints exist (`v1/server/api/src/routes/properties.ts:108,161-174`) | PARTIAL/MISSING — submit API exists with **no UI caller** (PROP-024/025) | Comparable intent, both missing the UI | RESTORE |
| Admin moderation console | L1 — localStorage with **fabricated** statuses (`v1/src/pages/AdminProperties.tsx:38,71-77`) | MISSING — no review-queue UI; a correct review API exists (PROP-065/066) | V2's backend better, V1's UI shell more complete | FIX REGRESSION + RESTORE |
| My-listings scoping | L4 — `GET /properties/mine` is user-scoped (`properties.ts:51-55`) | BROKEN — "my properties" lists everyone's approved listings (PROP-044) | V1 better | RESTORE |
| Favourites | L1 — localStorage only (`v1/src/hooks/useFavorites.ts:3-25`) | FULL — real table + API + page (PROP-046) | V2 better | SUPERSEDED WITH FULL PARITY |
| Saved searches | L1 — localStorage + a server stub that persists nothing (`Properties.tsx:590-634`, `v1/server/api/src/routes/other.ts:114-117`) | FULL (with a duplicate implementation) (PROP-049/050) | V2 better | SUPERSEDED WITH FULL PARITY |
| Saved-search / interest alerts actually delivered | **L4 — the one place V1 wins outright**: city-interest match → in-app notification **and** email (`v1/server/api/src/services/notification-sender.ts:101-164`, triggered `properties.ts:151`, `property-requests.ts:46`) | MISSING — nothing evaluates saved searches; `match_count` never written (PROP-052) | V1 better | RESTORE |
| Compare listings | L1 — up to 3, localStorage (`Properties.tsx:196-199,1549-1600`) | none found | V1-only | RESTORE |
| Buyer property-request marketplace | L4 — create / my-inbox / office feed / offer / accept / close (`v1/server/api/src/routes/property-requests.ts:7-99`) | PARTIAL — create/list/close FULL, but offices **cannot browse open requests** (PROP-053/054) | V1 better on discovery | RESTORE |
| Offer authorization on requests | L4 but WEAK — any authenticated user may offer (`property-requests.ts:55-73`) | Strong — membership + org type + verified (PROP-055, `cur/app/api/property-requests/[id]/offers/route.ts:71-97`) | V2 better | KEEP the V2 gate |
| Offer accept/reject integrity | BROKEN — `data: req.body` mass-assignment, no requester check (`property-requests.ts:88-99`) | PARTIAL — requester-only, auto-rejects siblings (PROP-056) | V2 better | FIX REGRESSION |
| Property inquiries | L3 PARTIAL_FLOW, status BROKEN — field-name mismatch 400s every submission; list endpoint exposes all inquiries to any logged-in user (`PropertyDetail.tsx:221` vs `inquiries.ts:16-19`, `:7`) | MISSING — table exists, no API, no UI (PROP-058) | Both incomplete; V1 has the schema + form | RESTORE + FIX REGRESSION |
| Elite lead flagging | L2 — column exists, toggle route missing, `leadScore` non-existent (`AdminEliteLeads.tsx:29`, `schema.prisma:707-719`) | none found | V1-only idea | RESTORE (define scoring first) |
| Matchmaking (requests ↔ developer projects) | L1 — console only; no route, no model, no algorithm (`AdminMatchmaking.tsx:35-48`) | none found; nearest real matcher is the office radar (`cur/lib/integration/radar.ts:60-99`, RADAR-*) | V1-only idea, V2 has the better engine to build on | MERGE INTO NEW SYSTEM |
| Executive growth dashboard | L1 — complete UI, endpoint absent (`AdminEmperor.tsx:78`) | ANLY-* admin analytics exist platform-wide | V1-only idea | RESTORE |
| Viewing requests / bookings | L2 — `Booking` table with `preferredDate`, never referenced by any route; UI degrades to a prefilled message (`schema.prisma:1191-1206`, `MobileStickyContact.tsx:38-46`) | none found | V1-only (schema) | RESTORE |
| Office directory + profile | L4 — list + detail + per-office property endpoint (`v1/server/api/src/routes/offices.ts:6-23`) | ORG-001 BROKEN (country casing), ORG-002 PARTIAL | V1 simpler but working | KEEP + IMPROVE |
| Office membership tiers / ranks | L1 — UI ribbons with no backing column (`OfficeCard.tsx:30-33` vs `schema.prisma:434-465`) | AMRS reputation engine FULL in code, never fed (AMRS-032/041), rank chip always NEW (ORG-019) | V2 better architecture, both unfed | MERGE INTO NEW SYSTEM |
| Office reputation scoring from real signals | **L4 — V1 wins**: 7-signal snapshots computed from real auction outcomes (`v1/server/api/src/services/auction-intelligence.ts:41-66`) | PARTIAL — signals must be POSTed by hand (AMRS-041) | V1 better | MERGE INTO NEW SYSTEM (feed AMRS from V1-style signals) |
| Self-serve organization creation | L1 — localStorage companies with supervisors (`v1/src/contexts/CompanyContext.tsx:37-88`) | MISSING self-serve; a real transactional org API exists (ORG-005, AMRS-005) | V2 better backend, V1 better UX shell | SUPERSEDED WITH FULL PARITY |
| Post-as-company account switching | L1 — `ActiveAccount` in localStorage (`CompanyContext.tsx:17-23`) | not present as a shipped switcher | V1-only UX | MERGE INTO NEW SYSTEM |
| Anti-manipulation (suspicious relist) | **L5 — V1 wins outright**: detection + suspension + 7-day proof + admin verify/reject/clear + auto-block cron + monthly report (`v1/server/api/src/routes/relist-monitoring.ts:38-462`, cron `v1/server/api/src/index.ts:174-176`) | none found anywhere in V2 | V1-only, production-grade | RESTORE |
| Suppliers marketplace | L4 — list + categories + detail + products, all wired (`v1/server/api/src/routes/suppliers.ts:6-68`) | none found in V2 registry | V1-only | RESTORE |
| Market history / investment radar / construction-cost rates | L1 — three finished screens over `[]`-returning stubs (`v1/server/api/src/routes/other.ts:24-35`) | none found | V1-only ideas | RESTORE |
| Partner / developer portal | L1 — login, campaigns, projects, leads, tiers, ROI copy; only a bare `Partner` model exists, and `GET /api/partners` leaks `passwordHash` (`v1/server/api/src/routes/other.ts:48-52`) | none found | V1-only idea + a live credential leak | FIX REGRESSION + RESTORE |
| Marketer / brokerage subsystem | L2 — 6 Prisma models (ranks, profiles, contracts, proposals, commissions, settings) + code-of-conduct, 8 pages, **0 routes** (`schema.prisma:189-381`) | none found in V2 registry | V1-only, and the richest un-built domain in V1 | RESTORE |
| Project-document verification | L1 — public verify page with content hash, lock, consultant roster (`v1/src/pages/ProjectVerify.tsx:10-235`) | none found | V1-only idea | RESTORE |
| Property tests | none in either tree (`grep -rn "describe(" v1/server v1/src` → none; PROP-074) | MISSING | Equal | RESTORE |

---

## Product-owner decisions required

1. **Matchmaking: build it or retire the screen.** Deciding this requires answering what a "developer
   project" is in AkarProMax — there is no such model in V1 (`schema.prisma`, 62 models) and none in V2.
   If it is built, the V2 office radar (`cur/lib/integration/radar.ts:60-99`, RADAR-*) is the sane engine
   to extend; if not, `/admin/matchmaking` must be removed rather than shipped empty.
2. **Define `leadScore` — or drop the badge.** There is no formula anywhere. Decide the inputs (budget?
   verified phone? response history? property price band? repeat visits?), where it is computed, and
   whether "Elite" stays a manual admin flag on top of it or becomes a threshold on it.
3. **Elite Leads ownership.** Today only a platform admin can see or flag leads
   (`AdminEliteLeads.tsx:73`), while the lead concerns an office's property. Decide whether leads route to
   the owning office / assigned marketer, and whether the platform keeps a triage layer at all.
4. **AdminEmperor: rebuild, or fold into the existing analytics?** The activation thresholds (200/50/500,
   `AdminEmperor.tsx:329-355`) are hardcoded product policy. Decide whether they become configurable
   settings, and whether the dashboard is a distinct surface or a tab of the V2 admin analytics.
5. **The marketer/brokerage subsystem is a whole product line, not a feature.** Six Prisma models
   (`schema.prisma:189-381`), a versioned code of conduct, dual-signature contracts, auto-renewal, a
   commission ledger and a rank ladder — with zero backend. Decide whether AkarProMax operates a marketer
   marketplace at all. This is the largest single scope decision in this fragment.
6. **Partner / developer portal: keep, merge into advertising, or drop?** Its campaign half overlaps the
   ads domain (ADS-*), its project half is the missing matchmaking entity, and its lead half implies a
   paid-lead marketplace (`leadPrice` default 50, `PartnerDashboard.tsx:206`). These three should not be
   decided separately.
7. **Paid-lead pricing model.** If leads are sold (V1-PARTNER-006), that is a payments, tax, refund and
   dispute surface, not a field. Needs an explicit yes/no before Phase 3 planning.
8. **Relist monitoring thresholds are policy, not code.** 15% price drop, 30-day lookback, 7-day proof
   window (`relist-monitoring.ts:45,62,83`) and the blast radius of a reject (office permanently banned
   `:281-284`, previous winner banned `:287-292`, and **every** active/pending auction of that office
   cancelled `:301-304`) must be confirmed by the business before restoration.
9. **Company vs Office vs Organization.** Confirm that V1's user-created "companies"
   (`CompanyContext.tsx:4-16`) and V1's admin-seeded `Office` both become V2 `organizations` with a type
   split (ORG-010), and that the supervisor concept maps onto V2 membership roles (AMRS-014/015).
10. **Suppliers: in or out of scope?** A complete, wired V1 vertical (`suppliers.ts:6-68`, 2 models,
    2 pages) with no V2 counterpart and no admin CRUD. Restore, or formally retire.
11. **Market data products** (Investment Radar, Market History, construction-cost rates) all need a data
    source decision — computed from platform transactions, imported from an external feed, or manually
    maintained by an admin. All three are finished UIs over `[]` (`other.ts:24-35`).
12. **Viewing requests: real bookings or messages?** The `Booking` table exists with `preferredDate`
    (`schema.prisma:1191-1206`) but the UI degrades to a prefilled text message
    (`MobileStickyContact.tsx:38-46`). Decide whether AkarProMax schedules viewings or only introduces
    parties.
13. **`Property.marketing*` window** (`schema.prisma:414-418`) — is this a marketer-contract artefact
    (V1-MKTR-018), a paid-promotion artefact (ads), or both? It cannot be restored coherently until this is
    settled.
14. **The branded Quran/Hadith gallery slide** (`PropertyDetail.tsx:167-205`) is a brand/editorial choice
    injected into every qualifying listing's photo carousel. Explicit owner sign-off required.
15. **US-market mode** (sq ft / acres, `PropertyCard.tsx:22-25`, `Properties.tsx:1102`) — is the US a real
    target market, or leftover experiment? It affects the unit, currency and taxonomy models.


## Round 2 — V1 Services, Artisans, Urgent Dispatch, Tenders, Auctions

## V1 vs V2 capability matrix

Legend: **V1** / **V2** = FULL · PARTIAL · MISSING · BROKEN · INTENDED ONLY. "V2 row" names the existing
registry ID so nothing is duplicated.

### Services / artisans

| Capability | V1 | V2 | V2 row | Net |
|---|---|---|---|---|
| Category taxonomy, i18n, dynamic fields | PARTIAL | FULL | SVC-002/008 | **V2 wins** — keep V2 |
| 8-step request wizard + drafts + per-step validation | MISSING | FULL | SVC-038/039/040/041 | **V2 wins** |
| Explainable match score (distance/urgency/budget/rating/response) | MISSING | FULL | SVC-055…063 | **V2 wins** |
| Offers → orders → timeline → reviews → disputes | MISSING | FULL | SVC-068…099 | **V2 wins** |
| Canonical state machine, audit log, outbox events | MISSING | FULL | SVC-160/136/088 | **V2 wins** |
| Provider docs, verification policy, RBAC promotion | MISSING | FULL | SVC-016/017/024/025 | **V2 wins** |
| **Urgent Dispatch mode (ring nearest, accept, hand-off)** | PARTIAL | MISSING | — | **V1 only** |
| **Client curates who gets dispatched** | PARTIAL | MISSING | — | **V1 only** |
| **Ringtone / audible dispatch alert** | INTENDED ONLY | MISSING | — | **V1 only** |
| **`missedCount` → excuse → suspension ladder** | INTENDED ONLY | MISSING | — | **V1 only** |
| **Working-hours dispatch window** | INTENDED ONLY | MISSING | — | **V1 only** |
| **Provider live GPS + proximity-first dispatch** | INTENDED ONLY | PARTIAL | SVC-022/056 | **V1 idea, V2 mechanism** |
| **Provider → client private feedback (3 axes)** | BROKEN | MISSING | — | **V1 only** |
| **Client flags / warning counter visible pre-acceptance** | INTENDED ONLY | MISSING | — | **V1 only** |
| **Low rating ⇒ silent per-client provider exclusion** | INTENDED ONLY | MISSING | — | **V1 only** |
| **Client + provider blacklists with an admin console** | PARTIAL | PARTIAL | SVC-103 | **V1 adds the console** |
| **Provider tier ladder (basic/master/gold/promax)** | PARTIAL | MISSING | SVC-021 (featured only) | **V1 only** |
| **"Notify me when this artisan is free"** | PARTIAL | MISSING | — | **V1 only** |
| **Working-hours-aware appointment slots** | PARTIAL | MISSING | SVC-087 (raw datetime) | **V1 only** |
| **Saved service searches** | PARTIAL | MISSING | — | **V1 only** |
| **Google-Maps-URL coordinate parser** | FULL | MISSING | — | **V1 only** |
| **WhatsApp contact channel** | FULL | MISSING | — | **V1 only** |
| **Vehicle / at-home auto + transport service catalogue** | FULL | MISSING | VEH-017 | **V1 only** |
| **Tender / competitive-bid mode with sealed bids** | FULL | MISSING | — | **V1 only** |
| **5-pillar engineering consultancy approval** | INTENDED ONLY | MISSING | — | **V1 only (concept)** |
| Disputes | MISSING | PARTIAL (route 404) | SVC-097/098/099 | V2 regression, unrelated to V1 |

### Auctions — capabilities **V2 lacks entirely** (the answer to the brief's question)

1. Auto-bid / proxy-bidding engine — V1-AUC-022/023/024 vs AUC-037.
2. Anti-sniping auto-extension — V1-AUC-027 vs AUC-028.
3. Automatic closure of expired auctions (cron) — V1-AUC-032 vs AUC-040.
4. Participant registry actually written and enforced — V1-AUC-029/030 vs AUC-038.
5. Deposit / bid-bond data model — V1-AUC-031 vs AUC-036.
6. Suspicious-relisting detection (30 d / 15 % rule) — V1-AUC-041/042/043.
7. Sale-proof submission + admin verification — V1-AUC-044/045.
8. Office auction bans + ban cascade + winner ban — V1-AUC-046/048, V1-AUC-007.
9. Proof-deadline auto-block cron — V1-AUC-048.
10. Relist monitoring console + monthly manipulation report + CSV/PDF export — V1-AUC-049/050.
11. Office rating engine with badges and snapshot history — V1-AUC-052/053/054.
12. Auction classification tiers (hot / high-value / active / suspicious) — V1-AUC-055.
13. Bidder recommendations (similar / low-competition / within-budget) — V1-AUC-056.
14. Early-warning fraud scan (rapid listing, habitual no-win bidder, repeat bidder-office pair) — V1-AUC-057/058.
15. Public auction statistics API + page with charts and PDF export — V1-AUC-059/060 vs AUC-061.
16. Auction history archive page with price drill-down — V1-AUC-061 vs AUC-061.
17. Auction FAQ page — V1-AUC-064 vs AUC-061.
18. Auction terms page — V1-AUC-065 vs AUC-061 (V2 has terms *rows*, no page and no authoring, AUC-051).
19. Bidder "my bids" dashboard — V1-AUC-072 vs AUC-034.
20. Admin auction console (filters, KPIs, cancel, block bidder) — V1-AUC-073/074 vs AUC-060.
21. Auction cancel/suspend actually reachable — V1-AUC-036/037 vs AUC-059.
22. Auction reports + admin resolution — V1-AUC-038/039.
23. Realtime auction namespace with JWT auth and 8 event types — V1-AUC-066/067 vs AUC-057.
24. Auction notification vocabulary (outbid, ending soon, won/lost, proof deadline…) — V1-AUC-068 vs AUC-056.
25. Bid IP capture for forensics — V1-AUC-018.
26. Auction price-history series — V1-AUC-062.
27. Public auction search/filter/sort — V1-AUC-011 vs AUC-004.
28. Property media on auction cards — V1-AUC-012 vs AUC-005.
29. Multi-currency auctions — V1-AUC-004.
30. In-process scheduler for auction jobs — V1-AUC-075.

Capabilities where **V2 is ahead and must not be downgraded**: hash-bound contract + signature ledger
(AUC-045/046/049), versioned terms with acceptance hashes (AUC-050/052), immutable award snapshot
(AUC-044), bid idempotency keys (AUC-030), integer-cents money arithmetic (AUC-031),
`SELECT … FOR UPDATE` bid locking (AUC-029), bidder anonymity in the public feed (AUC-009/033),
organizer-grant model (AUC-015…018), the 72-hour limited-auction rule (AUC-026/027).

---

## Proposed unified Services model (documentation only)

One request object, three **delivery modes** chosen at step 1 of the existing V2 wizard. **Every structural
element comes from V2**; V1 contributes mode C, mode D and a set of cross-cutting capabilities.

```
ServiceRequest (V2: service_requests + state machine + status history + audit + outbox)
  └── deliveryMode: STANDARD | URGENT_DISPATCH | TENDER      ← new discriminator, V1 concept
```

### Mode 1 — Standard Request / RFQ (**100 % V2 architecture**)
8-step wizard (SVC-038), dynamic category questions (SVC-042), attachments (SVC-044),
publish → matching engine with explainable scores (SVC-045/055-063), offers with cost breakdown and
revisions (SVC-069/073), accept → order + timeline (SVC-076/083), reviews (SVC-091), disputes (SVC-097).
**Merge from V1:** working-hours-aware slot picking for the scheduling step (V1-SVC-036),
Google-Maps-URL coordinate paste in the location step (V1-SVC-046), saved searches (V1-SVC-043),
WhatsApp as a contact preference (V1-SVC-014), and the provider tier ladder as a merchandising layer on
top of `featured`/`rank` (V1-SVC-024).

### Mode 2 — Urgent Dispatch (**V1 capability on V2 architecture**)
Reuses V2's request row, state machine, notifications, messaging and audit trail; adds:
- **Same match engine, different consumption.** `runMatching` (SVC-055) already produces a ranked,
  reason-annotated candidate list. Instead of publishing to a feed, the top *N* become dispatch
  candidates — **no second matcher**.
- **Candidate curation** (V1-ART-003/004): show the ranked candidates to the customer with distance,
  rating and tier; the customer may deselect. Default: all selected.
- **Sequential ring with a timeout** (V1-ART-006): one candidate at a time (or a small wave), a bounded
  ring window, then escalate to the next. The 60-second `useRingtone` default is the documented V1 value.
- **New tables required** (V1 never built them): `dispatch_attempts` (request, provider, tier/wave,
  sent_at, expires_at, outcome ∈ ringing/accepted/rejected/timeout, note) — this is the missing
  **dispatch log** (V1-ART-023), modelled on `TenderActivityLog`; and provider-availability columns
  (`notifications_enabled`, `notifications_suspended`, `suspension_reason`, `working_hours_start/end`,
  `current_lat/lng`, `location_updated_at`, `missed_count`, `pending_excuse`, `active_request_id`).
- **Availability gate** = enabled ∧ ¬suspended ∧ inside working hours ∧ no active job ∧ within radius
  (V1-ART-013/017/018/020, radius policy from SVC-056).
- **Discipline ladder** (V1-ART-014/015/016): timeout ⇒ `missed_count++`; 5 ⇒ blocking excuse; 10 ⇒
  admin suspension. Excuses become an admin queue item.
- **Hand-off notes** (V1-ART-011/012): reject and "not agreed" notes are persisted on the attempt and
  shown to the next provider.
- **Contact privacy** (V1-ART-010): the customer's phone is released only to the accepting provider —
  and, unlike V1, the reveal endpoint must check that the caller *is* that provider.
- **Two-sided close-out** (V1-SVC-056/057): completion collects the provider's private 3-axis client
  rating in the same dialog; the customer's star rating rides V2's review model with a
  `visibility = private` flag.

### Mode 3 — Tender / Competitive Bid (**V1 capability on V2 architecture**)
V1's tender flow maps almost 1:1 onto V2's offers: a tender **is** a request with
`deliveryMode = TENDER`, a budget range, a bounded submission window (3–30 days, V1-TEND-002) and
**sealed offers**. Adopt from V1: sealed-bid visibility as a *server-enforced* rule (fixing V1-TEND-011),
one live bid per provider (V1-TEND-010 — V2 already has SVC-070), award-one-reject-rest
(V1-TEND-014 ≡ SVC-076), close-early (V1-TEND-016), extend (V1-TEND-017), auto-close cron
(V1-TEND-018), and the full activity log + 5 notification types (V1-TEND-019/020).
V2 contributes: offer cost breakdown, revisions, expiry, order creation, timeline and reviews.
Net new work is small: a `sealed` flag on offers, a submission deadline on the request, and the
close/extend/auto-close jobs.

### Cross-cutting, mode-independent (from V1)
Provider tiers and Top-rated badges; availability dot; "notify me when free"; the artisan business
dashboard; the reviews/honour-code admin console; client and provider blacklists with a proper role guard.

### Auctions
Keep V2's contract/terms/award/idempotency core untouched; graft on the V1 **operating system**:
auto-bid, anti-sniping, closure cron, participant + deposit model, the relist-fraud pipeline, office
rating, early warnings, recommendations, the four public pages, the two dashboards, the admin console,
the realtime namespace and the notification vocabulary (30 items listed above).

---

## Product-owner decisions required

1. **Does Urgent Dispatch ship?** It is V1's most distinctive idea, it is absent from V2, and it needs a
   real dispatch engine (attempts table, timers, escalation, worker). Decide: build it in Phase 2, or
   explicitly defer and record the capability as deferred rather than lost. Everything from V1-ART-001 to
   V1-ART-023 depends on this answer. **P0.**
2. **What are the dispatch timing constants?** V1 only ever committed to a 60-second ring default
   (`useRingtone.ts:112`) and a 5-second poll (`TechnicianInbox.tsx:22`). Ring window, wave size,
   number of waves, and total time-to-give-up all need product values. **P0.**
3. **Is the discipline ladder (5 → excuse, 10 → suspension) the intended policy?** It is enforced only as
   UI copy today (`TechnicianSettings.tsx:227-228`). Confirm the thresholds, whether the counter decays,
   and who reviews excuses. **P0.**
4. **Does "low rating ⇒ silent exclusion" survive?** V1 promises the customer that a ≤2-star provider is
   silently removed from *their* future dispatches (`VehicleServices.tsx:1138-1139`). This is a per-user
   suppression list with real fairness implications for providers. Keep, make it explicit and reversible,
   or drop. **P0.**
5. **Is provider→client private feedback acceptable?** Three scored axes about a named customer, visible
   to admins and (per the V1 copy) to other professionals (`TechnicianInbox.tsx:622-623`). This is a
   consumer-scoring system with privacy/regulatory weight. Decide scope, retention and disclosure. **P0.**
6. **Do tenders become a third V2 delivery mode, or a separate product?** The V1 model is complete and
   maps cleanly onto V2 offers (see the unified model). Decide before Phase 2 so `sealed` and
   `submission_deadline` land in the offers schema rather than beside it. **P0.**
7. **Does the relist-fraud pipeline ship, and with what thresholds?** 30 days / 15 % / 7-day proof
   deadline are V1's numbers (`relist-monitoring.ts:45,63,83`). They auto-suspend live auctions and can
   ban an office permanently. Confirm thresholds, add an appeal/unban path, and decide who signs off a ban. **P0.**
8. **Deposits / bid bonds.** V1 has the schema and nothing else; V2 has neither (AUC-036). Real-estate
   auctions normally require a refundable bond. In scope for v1 or explicitly risk-accepted? **P0.**
9. **Anti-sniping vs the 72-hour guarantee.** V1 extends unconditionally by 5 minutes; V2's limited
   auction promises a fixed 72-hour window (AUC-026/027). Decide the rule: extension cap, no extension on
   limited auctions, or a longer fixed window. **P0.**
10. **Who runs scheduled work?** Five V1 jobs live in `setInterval` inside the API process. Decide the
    scheduler (external cron, queue worker, leader election) before porting closure, ban and rating jobs. **P0.**
11. **Office rating: published or internal?** The engine writes a public GOLD/SILVER/BRONZE badge partly
    from a fabricated response-speed constant (`auction-intelligence.ts:26`). Either compute response
    speed for real or remove its 20 % weight before publishing badges. **P1.**
12. **Provider tier ladder vs featured/rank.** Two merchandising systems cannot both drive ordering.
    Choose one, or define tier as a *display* layer and rank as the *ordering* layer. **P1.**
13. **Which V1 pages are restored verbatim?** `/auctions/faq`, `/auctions/terms`, `/auctions/stats`,
    `/auctions/history`, `/dashboard/bids`, `/admin/auctions` are marked "OLD SOURCE REQUIRED" in
    `frag/06-auctions-content.md:202-221` — **the source exists in V1 and is cited row by row above**.
    Confirm they are restored rather than re-designed. **P1.**
14. **Auction terms: static page or versioned catalogue?** V1 has readable bilingual content with no
    versioning; V2 has hashed versioned rows with no page and no authoring UI (AUC-050/051). The merge is
    obvious (V1 content into V2 rows + an authoring screen) but needs an owner. **P1.**
15. **Vehicle / at-home auto + transport services**: V1 ships 23 concrete service definitions
    (`VehicleServices.tsx:44-283`) with no V2 successor (VEH-017). Restore as service categories, or park. **P1.**
16. **Engineering consultancy (5-pillar approval, version timeline, sign-off)** is a distinct
    professional-services product built only as a mock (`ConsultantDashboard.tsx:48`). Adopt, defer or drop. **P2.**
17. **Auction contract OTP + serial numbering** — V1's contract adds an OTP verification block and a
    serial scheme that V2's hash-bound contract lacks (V1-AUC-069/070). Fold into V2's contract, or drop. **P2.**
18. **Bidder recommendations and auction classification** are complete server-side in V1 with no UI
    (V1-AUC-055/056). Build the surfaces or retire the engines — do not ship dead endpoints. **P2.**


## Round 2 — V1 Acquisition, Smart Landing, Support, SEO, Lookups, Knowledge, Licensing, i18n

## V1 vs V2 capability matrix

| Capability | V1 | CURRENT V2 | Who wins | Decision |
|---|---|---|---|---|
| **Segmented acquisition funnels** (craftsman / office / corporate) | L4 pages, 3 distinct value propositions, integrity pledges, sector router (`About.tsx:212`) | **MISSING** — no segmented funnels, no sector router | **V1 decisively** | RESTORE |
| **Founder registration** | L3 — complete form, pledge gate, redirect contract; server handler is a `{success:true}` stub (`auth.ts:488-490`) | generic `/register` exists and creates users | **V2 on plumbing, V1 on product** | FIX REGRESSION + MERGE |
| **Professional Integrity Pledge / Office Charter** | L4 UI gate, never persisted; charter binds the desktop licence (`LandingOffices.tsx:175-176`) | MISSING | **V1** | RESTORE (and persist consent) |
| **Zero-commission provider promise** | stated publicly (`LandingProfessionals.tsx:134`) | contradicted by every V2 marketplace assumption | conflict | PRODUCT OWNER DECISION |
| **Public pricing** | `Pricing.tsx` is a complete 4-audience page — **orphaned**; `/pricing` shows a stub | V2 has pricing surfaces | **V2 reachable, V1 richer** | RESTORE |
| **Coupon / promo engine** | **L4 END_TO_END_WIRED** (`coupons.ts:7-58`, `AdminDiscounts`), with Arabic code transliteration | none found | **V1** | RESTORE |
| **Contact / lead intake** | `/contact` discards every submission (`Contact.tsx:21-29`) while a working `POST /api/inquiries` sits unused | V2 contact path exists | **V2** | FIX REGRESSION |
| **Campaign landing engine (Smart Landing)** | 30 category aliases, 33 city aliases, 8 banner configs, geo default, session pinning | **MISSING** — no campaign-landing engine at all | **V1 decisively** | RESTORE |
| **Landing-entry attribution** | client sends 12 fields; server stores 1 (`analytics.ts:6-19`); the report endpoint does not exist | maps to ANLY-014 — DAU/sessions/funnels also weak | **neither** | FIX REGRESSION then MERGE |
| **Geo detection** | L4 — GPS → Nominatim → IP → fallback, 6 h cache, 6-step governorate matcher, ~150 aliases | maps to GEO-007; `ADMIN-050` confirms no geo admin | **V1** | KEEP + IMPROVE |
| **Geo data governance** | 6 parallel city vocabularies, 2 drifted files, 3 unusable governorate keys | single hierarchy, no admin | **V2 on structure, V1 on coverage** | MERGE INTO NEW SYSTEM |
| **Support tickets (web)** | L1 — full triage UI, 4×4×6 model, threaded replies; **localStorage only**, no server, no intake | **MISSING** — the only "tickets" in V2 are desktop maintenance tickets (SVC-162, COMM-LEG-058) | **V1 on product intent only** | RESTORE (rebuild server-side) |
| **SLA / assignment** | absent in both the UI and the model | absent | **neither** | PRODUCT OWNER DECISION |
| **SEO management** | L1 — 4 tabs, 20 page-meta records, sitemap generator, robots editor, 3 JSON-LD seeds; **nothing consumes it** | **MISSING** — no SEO admin | **V1 on intent only** | RESTORE (rebuild server-side) |
| **Runtime SEO output** | per-page title/description/OG/Twitter on 100+ pages via `SeoHead`, English-only, no canonical/robots/JSON-LD/hreflang | I18N-008 hreflang MISSING | **V1 slightly** | KEEP + IMPROVE |
| **Lookup / taxonomy admin** | L1 — 7 taxonomies, 63 seeds, **zero consumers** | **MISSING** (PROP-038 is a legacy D1 surface) | **V1 on intent only** | RESTORE |
| **Server taxonomy** | `Category` L4 with `@@unique([key,type,section])` and role-guarded CRUD — but its admin page cannot call it | PROP-009 taxonomy chips 403 for guests | **V1 on the API, neither on the console** | KEEP + IMPROVE / FIX REGRESSION |
| **Blog / editorial** | server-backed list/detail/create; no update/delete; admin console is a disconnected localStorage store; rich text renders as escaped tags | KNOW-001…019: catalogue cards are dead ends (KNOW-002), no admin console (KNOW-017), force-published (KNOW-008) | **V1 on the read path, both broken on the write path** | MERGE INTO NEW SYSTEM |
| **Comments / discussion** | localStorage, unowned, invisible to others (`BlogPostDetail.tsx:33-63`) | COMM-* has real forum topics/posts (missing migration, `frag/06` item 1) | **V2** | SUPERSEDED WITH FULL PARITY |
| **Static legal content** | 4 bilingual pages authored in admin, **rendered from hardcoded copy instead** | none found | **V1 on intent only** | FIX REGRESSION |
| **Knowledge / free resources** | rich upload UI (bilingual, 11 categories, cover, counter) over a POST that discards everything and a download route that does not exist | KNOW-005/006: create form exists, URL-only, no file storage | **neither — both are link-or-lose** | RESTORE |
| **Software catalogue** | `/software` is served licence keys instead of products; no product model | none found | **neither** | RESTORE |
| **Desktop download & trial** | trial minting works (anonymous, 30 d); the installer endpoint is unmounted; 4 conflicting durations | none found | **V1 partially** | FIX REGRESSION |
| **Licence purchase** | rich commercial page; every purchase silently becomes a 30-day trial | none found | **V1 on UI, broken on contract** | FIX REGRESSION |
| **Licence admin (issue/revoke/HWID)** | **L4 END_TO_END_WIRED and role-guarded** (`admin.ts:9,357-405,448-474`) | none found | **V1 decisively** | KEEP |
| **Licence redemption** | works; 4 duplicate endpoints; `userId` taken from the request body | none found | **V1 with an authz defect** | MERGE INTO NEW SYSTEM |
| **PWA install** | broker complete, `InstallPWA` never mounted | NOTIF-016: `/sw.js` registered but absent | **neither** | RESTORE |
| **Push consent UX** | well-gated banner over an unmounted subscribe path (`V1-NOTIF-015`) | MISSING | **V1** | RESTORE |
| **i18n bundle** | 2 locales, 720 keys, perfect parity, no console | 3 locales incl. `tr`, DB store, admin console, versioning, rollback (I18N-003/010/017-022) | **V2 decisively** | SUPERSEDED WITH FULL PARITY |
| **i18n practice** | 5,192 inline ternaries in 167 files vs 137 `t()` calls | static + DB dictionary | **V2** | MERGE INTO NEW SYSTEM |
| **Locale routing / hreflang** | MISSING | I18N-007/008 MISSING | **neither** | RESTORE |
| **Country-aware formatting** (date, currency, area) | L4 across all three | partial | **V1** | RESTORE |
| **Exchange rates** | 4 unrelated hardcoded tables, none live | none found | **neither** | FIX REGRESSION |
| **Theme / data-entry ergonomics** | L4 tri-state theme; Enter-key field navigation with 3 escape hatches | none found | **V1** | KEEP / RESTORE |
| **Admin analytics** | L1 — a designed dashboard over 5 endpoints that do not exist | ANLY-013/015 command centre exists; ANLY-008 has permanently-zero tiles | **V2** | MERGE INTO NEW SYSTEM |
| **Activity log / audit** | writes rows nobody can read (`other.ts:61`) | 4 parallel audit implementations, cross-wired (`frag/09` duplicate 1) | **neither** | MERGE INTO NEW SYSTEM |
| **Content moderation / reports** | L1 localStorage, no submission path | PROP-066/COMM-017 columns exist, no console | **neither** | RESTORE |
| **System settings** | 30 fields in localStorage; maintenance mode, registration toggle and e-mail-verification switches enforce nothing | `/admin/settings` is a 19-line empty state (`frag/09` item 1) | **V1 on intent only** | RESTORE |

---

## Product-owner decisions required

1. **Do the three sector funnels return, and does each create a *typed* account?** V1 routes all three
   through one untyped `/join`; the redirect target is the only signal of intent. Decide whether
   `/for-professionals` creates a provider, `/for-offices` creates an office (with an `Office` row), and
   whether corporates stay lead-only. (`V1-ACQ-001/007/026`)
2. **Is the Professional Integrity Pledge a contract?** If yes it must be versioned, presented, accepted
   with a stored timestamp and hash, and be the documented basis for bans and licence suspension. If no,
   the ban-without-compensation wording must be removed from the signup path. (`V1-ACQ-004/005/020`)
3. **What is the trial duration — 14, 30, 90 days or 3 months?** One number, one place, enforced by the
   licence issuer and reflected in every funnel. (`V1-ACQ-023`, `V1-LIC-005`)
4. **Does "no commissions, no hidden fees" survive?** It is stated publicly to providers and contradicts
   the V2 services-marketplace monetisation model. (`V1-ACQ-016`)
5. **Does "Founder Membership — Free Forever" bind us?** If yes, it needs a grandfathered entitlement in
   the plan model before any paid tier launches. (`V1-ACQ-012`)
6. **Which platforms does the desktop app actually support?** The office funnel promises Windows, Mac and
   Linux; the shipped build is WPF. (`V1-ACQ-022`)
7. **Do the corporate service lines (logistics, custom software, GCC licensing support) stay in the
   product?** Three of six advertised corporate services are outside the real-estate boundary. If they
   stay, they need owners, SLAs and a fulfilment path; if not, the page must be rewritten. (`V1-ACQ-025`)
8. **Does the hardcoded maintenance-centre advertiser in `SmartLandingBanner` have a commercial
   relationship?** It is a named, starred, phone-bearing placement living in source code with a placeholder
   number. Either it moves into the `Ad` model with a contract, or it is removed. (`V1-LAND-017`)
9. **Should one ad click pin a visitor's location for the whole session?** V1 does, irreversibly except via
   an undiscoverable reset. Decide the intended behaviour and how the visitor escapes it. (`V1-LAND-013`)
10. **What is the campaign-attribution contract?** Which of city/region/country/source/UTM/session/device
    are stored, for how long, under what privacy notice, and which report consumes them. Nothing can be
    recovered from V1's history. (`V1-LAND-018/021`)
11. **Does support ship as a ticket system, as chat, or as both?** V1 contains two disconnected support
    models — `AdminTickets` (4×4×6, threaded, local) and the admin-chat types (`open/closed`,
    `system`/`warning` messages, audit entries). Pick one spine before either is rebuilt.
    (`V1-SUP-001/015`)
12. **Do tickets need assignment and SLA at v1?** Neither exists in V1's model. Both are structural and
    cheap now, expensive later. (`V1-SUP-010/011`)
13. **Is SEO admin-managed or code-managed?** V1 designed a full console and wired none of it. Decide
    whether per-page meta, robots, sitemap and JSON-LD become server-rendered and DB-backed, or are owned
    in code and the console is dropped. (`V1-SEO-001/002`)
14. **Is the product bilingual for search engines?** hreflang exists nowhere in V1 and is MISSING in V2
    (I18N-008); locale-prefixed URLs do not exist either, so no shared link carries a language.
    (`V1-SEO-009`, `V1-I18N-005`)
15. **Which taxonomy store wins?** `Category` (real, guarded, 5 sections) or the 7-taxonomy `AdminLookups`
    shape (broader, richer per-item, unused). And which of the six city vocabularies becomes canonical.
    (`V1-LKP-001/010/011`)
16. **Is `/blog` a blog or a forum?** V1 names it a forum and implements a blog with per-browser comments;
    V2 has a real forum model whose migration is missing (`frag/06` item 1). Pick one and retire the other.
    (`V1-KNOW-002/013`)
17. **Who may publish editorial and knowledge content, and is it reviewed?** Both V1 and V2 force-publish
    for any authenticated user, with no update or delete API. (`V1-KNOW-006/007/008`)
18. **Are free resources hosted files or external links?** V1's UI promises hosted files (upload, cover,
    filename, gated download, counter) and the model stores a bare `fileUrl`; V2 stores a URL only
    (KNOW-006). Decide storage, size limits, virus scanning and whether `isFree` is ever enforced.
    (`V1-KNOW-019/021/024`)
19. **Is the legal copy (refund window, governing law, privacy commitments) admin-editable?** If yes it
    needs a server store, versioning and an effective date. If no, `AdminContent` must be removed so nobody
    edits text that never ships. (`V1-KNOW-016/017`)
20. **Does the platform sell software products, and where do price, features and screenshots live?**
    There is no product model — only licences. (`V1-LIC-001/003`)
21. **Who may mint a trial licence?** Today: anyone, anonymously, unlimited. (`V1-LIC-004`)
22. **Is desktop version publishing an admin capability?** `DesktopVersion` supports `minVersion` and
    `forceUpdate` — a forced-upgrade lever with no console. (`V1-LIC-008`)
23. **Do `maintenanceMode`, `registrationEnabled` and `emailVerificationRequired` become real switches?**
    They are the three most consequential controls in `AdminSettings` and they enforce nothing.
    (`V1-ADMIN-009`)
24. **Are Google Analytics / Facebook Pixel IDs and custom header/footer scripts an admin capability?**
    Arbitrary script injection from an admin console needs an explicit decision, not a field.
    (`V1-ADMIN-010`)
25. **Where does the exchange rate come from?** V1 has four unrelated hardcoded tables and shows an
    approximate converted price next to every listing. (`V1-I18N-011`)
26. **Can users report content, and who reviews it?** `AdminReports` models 5 reportable types and 4
    statuses with no submission path anywhere in the product. (`V1-ADMIN-006/007`)
27. **Is Enter-key field navigation a platform standard?** It is a real productivity feature for the
    office/data-entry persona with no V2 equivalent, and it changes form semantics everywhere it is
    applied. (`V1-I18N-014`)
28. **Can `public/` be re-supplied?** Seven artefacts gate every hosting, crawling, offline and push parity
    claim in this fragment. (`V1-SEO-019`)


## Round 2 — V1 Engineering platform, CAD/BIM, Land/OCR, MapMyDeed

## MapMyDeed vs V2 FindMyLand

V2's FindMyLand is literally titled "Map My Deed / حدّد أرضك" (`cur/src/components/tools/FindMyLand.tsx:1224`)
— it is the acknowledged successor. Capability-by-capability:

| # | Capability | V1 MapMyDeed | V2 FindMyLand | Verdict |
|---|---|---|---|---|
| 1 | Input types | image + PDF (`MapMyDeed.tsx:133-141`) | same, `pdf/png/jpg/jpeg/webp` (`FindMyLand.tsx:133`) | Parity |
| 2 | Drag & drop | yes (`:157-162`) | yes (`FindMyLand.tsx:1249-1260`) | Parity |
| 3 | In-page preview | image `<img>` **and PDF `<iframe>` preview** (`:299-326`) | image only | **V1-only** |
| 4 | PDF text extraction | all pages (`pdfProcessor.ts:12-31`) | all pages | Parity |
| 5 | PDF→raster OCR fallback | whole-doc `<30` chars, **first 3 pages only**, scale 2 (`landAnalysisService.ts:550-559`) | per-page `<25` chars + whole-doc `<80`, **all pages** | **V2 better** |
| 6 | OCR engine | tesseract `ara+eng`, PSM 6, `textord_heavy_nr` (`ocrProcessor.ts:20-34`) | tesseract `ara+eng` | Parity (V1 tunes more tesseract params — check in later pass) |
| 7 | **Image preprocessing: deskew** | **yes** — `detectSkew` + `rotateCanvas` (`imagePreprocessor.ts:145,198`) | **absent** (grep for `deskew\|skew\|rotate` in `FindMyLand.tsx` + `lib/land/intelligence/*` returns nothing) | **V1-only → RESTORE** |
| 8 | **Adaptive thresholding** | Otsu **and** adaptive, adaptive is the default (`imagePreprocessor.ts:61-68,253`) | Otsu only (frag/02 line 216) | **V1-only → RESTORE** |
| 9 | **Min-resolution upscale before OCR** | `ensureMinResolution` (`imagePreprocessor.ts:223-232`) | absent | **V1-only → RESTORE** |
| 10 | Median denoise + contrast stretch | yes (`:101,128`) | yes | Parity |
| 11 | Survey-table crop + numeric re-OCR | no | yes (`FindMyLand.tsx:513-577`) | **V2 better** |
| 12 | Per-cell OCR confidence | no (document-level `confidence: high/med/low` from raw text length only, `MapMyDeed.tsx:221`) | yes | **V2 better** |
| 13 | **Multi-parcel / multi-table splitting** | **yes** — boundary detection on `القطعة الثانية` / `جدول 2` / rule lines / triple-newline, up to 2 tables, each rendered separately (`landAnalysisService.ts:485-521`, UI `MapMyDeed.tsx:384-430`) | **no** — one geometry per document | **V1-only → RESTORE (high value)** |
| 14 | **Arabic point-label rows (`نقطة 1: …`)** | yes — pattern p3 (`landAnalysisService.ts:449`) | **regressed out** (frag/02: "Arabic-labelled rows no longer match; resolver has no Arabic point-label pattern") | **V1-only → FIX REGRESSION** |
| 15 | **Balady `N lat E lng ID` + Saudi `ID E lng N lat` formats** | yes — p1/p1b (`:421,427`) and p2 (`:443`) | hemisphere-token patterns only | **V1-only (verify overlap in later pass)** |
| 16 | Generic 3-column UTM rows without header | yes — p5/p6 always run (`:465,470`) | gated behind an English `NORTHING EASTING` header | **V1-only → RESTORE** |
| 17 | All-patterns accumulation (mixed-format docs) | **yes** — every pattern runs, de-duplicated by `index:rawText` (`:407-412`) | first-match-wins | **V1-only → FIX REGRESSION** |
| 18 | Northing/Easting order auto-detection | `classifyUtm` — magnitude windows 1e6–4e6 / 1e5–1e6 (`:99-108`) | `coordinate-protection.ts` + country bounds | **V2 better** |
| 19 | UTM zone detection | AR+EN regex, **clamped 35–40, silent default 37** (`:110-124`) | zones 1–60, confidence-graded, brute-force inference, abstains on ties | **V2 better** |
| 20 | Hemisphere inference | `south = c.northing < 1000000` (`MapMyDeed.tsx:185`) — a heuristic that mislabels any genuine southern-hemisphere northing ≥ 1e6 | country-bounds based | **V2 better** |
| 21 | Blind OCR letter→digit repair | yes, aggressive (`ocrProcessor.ts:100-107`) | narrowed to `O/o/Q→0`, `\|→1`, digit-adjacent only | Deliberate V2 trade-off (V2 adds constraint-verified repair) |
| 22 | Constraint-verified numeric repair against declared sides/area | no | yes | **V2 better** |
| 23 | CRS / EPSG / datum detection | no | yes (`crs-detector.ts`) | **V2 better** |
| 24 | Deed field extraction | 12 fields: owner, doc no., plan no., parcel no., landId, area, dimensions, city, district, country, landType, legalStatus, zoning, 4 borders (`landAnalysisService.ts:37-61,126-322`) | 16 fields | **V2 better (marginally)** |
| 25 | **Point cap** | **hard caps: 20 points per table** (`landAnalysisService.ts:391`), 20 rows shown (`MapMyDeed.tsx:412`), 50 UTM rows shown (`:450`) | no cap | **V2 better — V1 silently truncates** |
| 26 | Raw source text per point | **yes** — a `rawText` column showing the document string each point came from (`MapMyDeed.tsx:406,415`) | not exposed (frag/02: raw-text disclosure regressed) | **V1-only → RESTORE (auditability)** |
| 27 | Original-format + UTM dual tables | yes (`:384-502`) | yes (WGS + UTM tables) | Parity |
| 28 | Clipboard export | UTM table with header row (`:452-457`) | WGS table + UTM table + full report | **V2 better** |
| 29 | Leaflet OSM map, polygon + circle markers + fitBounds + popups | yes (`:76-113`) | yes (`FindMyLand.tsx:970-1003`) | Parity |
| 30 | Google Maps / WhatsApp / Messenger share | yes (`:235-273`) | yes, plus `navigator.share` (`:1087-1126`) | **V2 better** |
| 31 | Share text embeds every point as `AkarPromax<n>: lat, lng` | yes (`:258-266`) | location + summary only | **V1-only (minor)** |
| 32 | ONNX diagram/element analysis | wired but **model asset absent** (`onnxProcessor.ts:37`) | none | Neither works → **PRODUCT OWNER DECISION** |
| 33 | Save / persist result | **none** | `POST /api/land` (`FindMyLand.tsx:1135`) — in-memory store, broken per frag/02 | V2 intent better, both non-durable |
| 34 | Surveyor discovery + quote | none | yes (`:1163-1202`) | **V2 better** |
| 35 | Confidence / evidence transparency panel | doc-level 3-state label only | full strategy + evidence UI | **V2 better** |
| 36 | Upload security gate | none | `security-gate.ts` | **V2 better** |
| 37 | Auth requirement | **`AuthGate`** around the tool (`Tools.tsx:1916`) | public | Product decision needed |
| 38 | File download (DXF/KML/CSV) | none | none (regressed vs SNAP-CGPT per frag/02) | Missing in both |

---

## V1 vs V2 capability matrix

| Capability cluster | V1 | Current V2 | Verdict |
|---|---|---|---|
| Architectural consultation wizard (5 steps, 8 sectors, sector questionnaires) | present, L3 | **absent** | MISSING in V2 |
| BOQ generation | present, L3 | **absent** | MISSING in V2 |
| MEP quantity engine | present, L3 | **absent** | MISSING in V2 |
| 20 specialist sector engines (fire, seismic, high-rise, banking, medical, academic, K-12, mosque, industrial, retail, landscape, climate, institutional, medical-MEP…) | present, L1–L3 | **absent** | MISSING in V2 |
| Cost estimation / price management / contract packaging | present, L1–L3 (market-rate path broken) | **absent** | MISSING in V2 |
| Contract generation (AR/EN, sector clauses, packages, title block, QR) | present, L3 | **absent** | MISSING in V2 |
| DXF **reading** + layer mapping + quantity take-off + CAD→BOQ | present, L3 | **absent** (`cur/src/lib/cad/*` writes only) | MISSING in V2 |
| DXF **writing** / drawing generation (plans, MEP, structural, sections) | present, L3–L4 | partial — `cur/src/lib/cad/dxf-generator.ts` exists but has no route or importer (TOOL-023) | PARTIAL in V2 |
| Full engineering-set ZIP + PDF contract download | present, **L4** | **absent** (no `jszip`, no `jspdf`, no `pdf-lib`) | MISSING in V2 |
| 3D / BIM viewing | present (`three` + `@react-three/*`), L3 | **absent** (no `three` dependency) | MISSING in V2 |
| Deed OCR + coordinate extraction + map | present, L3 | present and generally stronger (resolver stack) | V2 better overall, with 7 named V1-only gaps (V1-FML-003…008, 016–018) |
| Coordinate conversion | present, L3, clipboard-only | present + batch + CSV + DXF handoff | V2 better, except split two-column paste (V1-TOOL-006) |
| Area calculation | present + irregular-from-sides-and-angles + canvas sketch | present (4 shapes) | V2 better on breadth, V1-only on irregular polygon + sketch |
| Points→DXF | present, L4 | present, L4 | Parity |
| PDF/image → Word | present but BROKEN (no server route) | present, client-side, two fidelity modes | V2 better |
| Scientific calculator | present + keyboard | present | V1-only: keyboard support |
| 8 construction calculators | absent | present | V2-only |
| Consultant review / sign-off workflow ("Diwan") | designed, L1, no server | absent | MISSING in both — product decision |
| Engineering persistence (projects, BOQ, contracts, drawings) | **none** | **none** | MISSING in both — must be designed |
| Engineering admin surface | `AdminMarketRates.tsx` only, and its endpoints do not exist | none | MISSING in both |

---

## Product-owner decisions required

1. **Is the engineering platform in scope for AkarProMax v3 at all?** 18 800 lines, 40 modules, zero
   persistence, unverified formulas. The parity rule says capability may not disappear silently — so the
   decision must be *recorded*, whichever way it goes: full restore, staged restore (BOQ + CAD take-off +
   DXF export first), or explicit deferral with the capability logged as intentionally postponed.
2. **Engineering project persistence model.** Nothing in V1 or V2 persists a consultation, BOQ, price book,
   contract or drawing set. This has to be designed from scratch (project → versions → BOQ snapshot → price
   snapshot → contract → drawing artefacts) before any engine is ported. Blocks V1-ENG-007, -024, -027.
3. **"Diwan" consultant sign-off — build, drop, or redesign?** The full UI exists (886 lines) and is
   disabled by a literal `false` with the comment "no consultants yet". It implies a marketplace of licensed
   consultants, digital stamps, conflict resolution and public QR verification. That is a product line, not
   a component.
4. **Liability and disclaimer policy.** The only disclaimer is one line in the generated PDF
   (`DrawingEngine.tsx:600`). Decide the standing disclaimer, whether output is labelled "preliminary /
   non-issuable", and whether a licensed-engineer review step is mandatory before export.
5. **Jurisdiction model.** VAT, currency, UTM zone range, qibla, climate PET, building codes are all
   hard-coded to a Gulf-centric set. Decide whether jurisdiction becomes a first-class configuration
   (country → codes + tax + units + zone range) before porting any engine.
6. **ONNX diagram analysis — revive or retire?** No model asset, nothing consumes the output. Retiring it
   is cheap; reviving it needs a training set and a defined consumer.
7. **Should Map My Land stay behind auth?** V1 gates it, V2 does not. Related: whether `tools.use`
   permission gating returns at all (TOOL-002 / V1-TOOL-019).
8. **CAD take-off export format.** V1 can read a DXF and derive a BOQ but offers no way to get it out
   (V1-CAD-012). Decide the target export (CSV / XLSX / annotated DXF / all three) before the port.