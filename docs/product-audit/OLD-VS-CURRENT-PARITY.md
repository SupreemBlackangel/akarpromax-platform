# AKARPROMAX — V1 / OLD-V2 / CURRENT-V2 / DESKTOP PARITY MATRIX
**Phase 0.5 (reconciled)** · 2,565 capabilities · Read-only.

Round 1 compared **old V2 lineage → current V2**. Round 2 added **V1 (2026-05 → 2026-08) → current V2**
and the **desktop C# source**. Round-1 rows carry `NOT ASSESSED IN ROUND 1` in the V1 columns; that is a
coverage statement, not a finding.

Status vocabulary: `FULL` · `PARTIAL` · `REGRESSION` · `MISSING` · `BROKEN` · `BETTER THAN OLD` · `STUB` ·
`INTENDED ONLY` · `NOT APPLICABLE` · `OLD SOURCE REQUIRED`.
V1 depth vocabulary: `L0 IDEA_ONLY` · `L1 UI_ONLY` · `L2 DATA_MODEL_ONLY` · `L3 PARTIAL_FLOW` ·
`L4 END_TO_END_WIRED` · `L5 PRODUCTION_LIKE`.
Decision vocabulary: `KEEP` · `KEEP + IMPROVE` · `RESTORE` · `FIX REGRESSION` · `MERGE INTO NEW SYSTEM` ·
`SUPERSEDED WITH FULL PARITY` · `NEW IMPROVEMENT` · `BLOCKED` · `OLD SOURCE REQUIRED` ·
`PRODUCT OWNER DECISION`.


## Identity, Profiles & Ranks (Domains A, B, C)
*ROUND-1 (V2 lineage)*

| ID | Feature | V1 depth | V1 | Old V2 | Current V2 | Desktop | Tests | Decision | Risk |
|---|---|---|---|---|---|---|---|---|---|
| AUTH-001 | Registration → Normal user, email + password | — | — | FULL | FULL | NOT APPLICABLE | `tests/auth-phase4.test.mjs` (… | KEEP | Low |
| AUTH-002 | Registration → Phone-only signup | — | — | PARTIAL | PARTIAL | NOT APPLICABLE | NONE | KEEP + IMPROVE | Med |
| AUTH-003 | Registration → Client-supplied role rejected | — | — | FULL | BETTER THAN OLD | NOT APPLICABLE | `tests/auth-core.test.ts` (NOT… | KEEP | Low |
| AUTH-004 | Registration → Auto-login after signup | — | — | FULL | SUPERSEDED (intentional) | NOT APPLICABLE | NONE | SUPERSEDED WITH FULL PARITY | Low |
| AUTH-005 | Registration → Invite token | — | — | OLD SOURCE REQUIRED | BROKEN (dead input) | NOT APPLICABLE | NONE | OLD SOURCE REQUIRED | Med |
| AUTH-006 | Registration → Craftsman / service-provider account | — | — | OLD SOURCE REQUIRED | FULL | NOT APPLICABLE | `tests/services-authz.test.mjs` | KEEP | Med |
| AUTH-007 | Registration → Office account (real_estate / law_office org) | — | — | PARTIAL (sponsor profile ≈ office) | PARTIAL | REFERENCE ONLY | `tests/organizations-hardening… | FIX REGRESSION | High |
| AUTH-008 | Registration → Company account (business / other org) | — | — | PARTIAL | PARTIAL | NOT APPLICABLE | `tests/organizations-workspace… | FIX REGRESSION | High |
| AUTH-009 | Registration → Advertiser / sponsor account | — | — | FULL | PARTIAL — plans / subscriptions / invoices / payments / documents / activity APIs deleted, tables retained | NOT APPLICABLE | NONE | RESTORE | High |
| AUTH-010 | Email activation → Token link | — | — | MISSING | FULL | NOT APPLICABLE | `tests/auth-phase4.test.mjs` | KEEP | Low |
| AUTH-011 | Email activation → Resend | — | — | MISSING | FULL | NOT APPLICABLE | `tests/auth-phase4.test.mjs` | KEEP | Low |
| AUTH-012 | Email activation → Legacy MySQL signup-OTP endpoint | — | — | FULL (old MySQL path) | BROKEN / DEAD DUPLICATE | NOT APPLICABLE | NONE | MERGE INTO NEW SYSTEM | Med |
| AUTH-013 | OTP → Email-change OTP | — | — | MISSING | FULL | NOT APPLICABLE | `tests/auth-phase4.test.mjs` | KEEP | Low |
| AUTH-014 | 2FA → TOTP / otplib login second factor | — | — | none | none | MISSING | none | none | P2 |
| AUTH-015 | Welcome → Welcome email + `welcome_sent_at` | — | — | MISSING | PARTIAL | NOT APPLICABLE | NONE | FIX REGRESSION | Low |
| AUTH-016 | First-login onboarding → Wizard flow | — | — | MISSING | PARTIAL | NOT APPLICABLE | `tests/auth-phase4.test.mjs` | KEEP + IMPROVE | Med |
| AUTH-017 | First-login onboarding → Onboarding data persistence | — | — | MISSING | BROKEN (data silently discarded) | NOT APPLICABLE | NONE | FIX REGRESSION | High |
| AUTH-018 | Login → Email or phone + password | — | — | FULL | FULL | REFERENCE ONLY (local-only login) | `tests/auth-phase4.test.mjs` | KEEP | Low |
| AUTH-019 | Login → Account-state gating | — | — | PARTIAL | BETTER THAN OLD | REFERENCE ONLY | `tests/auth-core.test.ts` (NOT… | KEEP | Low |
| AUTH-020 | Login → `last_login_at` | — | — | MISSING | FULL | NOT APPLICABLE | NONE | KEEP | Low |
| AUTH-021 | Logout → Session teardown | — | — | PARTIAL | BETTER THAN OLD | NOT APPLICABLE | `tests/session.test.mjs` (NOT … | KEEP | Low |
| AUTH-022 | Sessions → Cookie policy | — | — | FULL | FULL | NOT APPLICABLE | `tests/session.test.mjs` (NOT … | KEEP | Low |
| AUTH-023 | Sessions → Server-side revocation durability | — | — | MISSING | FULL | NOT APPLICABLE | `tests/session.test.mjs` (NOT … | KEEP | Low |
| AUTH-024 | Password reset → Request | — | — | MISSING | FULL | NOT APPLICABLE | `tests/auth-phase4.test.mjs` | KEEP | Low |
| AUTH-025 | Password reset → Apply | — | — | MISSING | PARTIAL (side effect) | NOT APPLICABLE | `tests/auth-phase4.test.mjs` | KEEP + IMPROVE | Med |
| AUTH-026 | Change password → Authenticated | — | — | MISSING | PARTIAL (old sessions stay valid) | NOT APPLICABLE | `tests/auth-phase4.test.mjs` | KEEP + IMPROVE | Med |
| AUTH-027 | Change email → OTP-confirmed | — | — | MISSING | FULL | NOT APPLICABLE | `tests/auth-phase4.test.mjs` | KEEP | Med |
| AUTH-028 | Google OAuth → Sign-in | — | — | MISSING | BROKEN — `NextResponse.redirect(new URL("/", "/"))` at `callback/route.ts:17,29,32` throws (invalid base) ⇒ 500 (Phase 0 verified) | NOT APPLICABLE | NONE | FIX REGRESSION | High |
| AUTH-029 | Facebook OAuth → Sign-in | — | — | MISSING | BROKEN (same defect) | NOT APPLICABLE | NONE | FIX REGRESSION | High |
| AUTH-030 | OAuth → `state` / CSRF + redirect base | — | — | MISSING | MISSING (security gap) | NOT APPLICABLE | NONE | FIX REGRESSION | High |
| AUTH-031 | OAuth → Provider token storage | — | — | MISSING | PARTIAL (plaintext) | NOT APPLICABLE | NONE | KEEP + IMPROVE | High |
| AUTH-032 | Dev-login → Backdoor guard | — | — | MISSING | FULL (guard only) | NOT APPLICABLE | `tests/dev-login.test.mjs` (NO… | KEEP | Low |
| AUTH-033 | Rate limiting → Auth operations | — | — | MISSING | FULL | NOT APPLICABLE | `tests/rate-limit.test.mjs` (N… | KEEP | Low |
| AUTH-034 | Rate limiting → Shared store for horizontal scale | — | — | MISSING | PARTIAL | NOT APPLICABLE | `tests/rate-limit.test.mjs` (N… | KEEP + IMPROVE | Med |
| AUTH-035 | CSRF → Origin guard | — | — | MISSING | FULL | NOT APPLICABLE | `tests/origin-guard.test.mjs` … | KEEP | Low |
| AUTH-036 | CSRF → Double-submit token helper | — | — | MISSING | MISSING (dead code) | NOT APPLICABLE | NONE | MERGE INTO NEW SYSTEM | Low |
| AUTH-037 | Audit → Auth event persistence | — | — | PARTIAL | FULL | NOT APPLICABLE | `tests/audit-log.test.mjs` (NO… | KEEP | Low |
| AUTH-038 | Audit → Two parallel audit stores | — | — | PARTIAL | REGRESSION (audit split, half invisible) | NOT APPLICABLE | NONE | MERGE INTO NEW SYSTEM | High |
| AUTH-039 | Permissions model → Role→permission catalog | — | — | FULL | BETTER THAN OLD (adds `service_provider`, `service_supervisor`, `ads_reviewer`) | REFERENCE ONLY | NONE | KEEP | Low |
| AUTH-040 | Permissions model → Permission check primitive | — | — | none | none | FULL | none | none | P0 |
| AUTH-041 | Permissions model → Duplicate permission module | — | — | PARTIAL | REGRESSION (2 coexisting models) | NOT APPLICABLE | NONE | MERGE INTO NEW SYSTEM | Med |
| AUTH-042 | Permissions model → Scoped permissions (geo/entity) | — | — | PARTIAL | STUB | NOT APPLICABLE | NONE | FIX REGRESSION | High |
| AUTH-043 | Role management → Dynamic roles from Admin (`admin_roles`) | — | — | MISSING | BROKEN — (a) **authz is `if (!session)` only, i.e. any logged-in user can create roles and assign them**; (b) no migration creates `admin_roles`/`admin_role_assignments` (absent from `drizzle-pg/*.sql` and `lib/db/pg-identity-schema.ts:5-17`); (c) nothing reads them during permission resolution | REFERENCE ONLY | NONE | FIX REGRESSION | High |
| AUTH-044 | Role management → Role promotion from Admin | — | — | FULL | **REGRESSION — promotion has no effect on the promoted user's permissions** | NOT APPLICABLE | NONE | FIX REGRESSION | High |
| AUTH-045 | Role management → Super-admin bootstrap | — | — | PARTIAL (insecure auto-admin) | BROKEN — the script never sets `status`, so the created admin keeps `pending_verification` and **cannot pass `isAccountUsable`** (`lib/auth/access-control.ts:29-32`, `app/api/auth/login/route.ts:122`) | NOT APPLICABLE | NONE | FIX REGRESSION | High |
| AUTH-046 | Role management → Moderator scopes (module × country × city) | — | — | FULL | PARTIAL — scopes stored + audited but never consulted by any authorization check | NOT APPLICABLE | NONE | FIX REGRESSION | High |
| AUTH-047 | Permissions → Capability augmentation | — | — | MISSING | FULL (good pattern) | NOT APPLICABLE | `tests/services-authz.test.mjs` | KEEP | Low |
| AUTH-048 | Account state → active / inactive / suspended / deleted | — | — | PARTIAL | PARTIAL — model exists, no operator surface | REFERENCE ONLY | `tests/auth-core.test.ts` (NOT… | RESTORE | High |
| AUTH-049 | Multi-role → Organization membership roles | — | — | FULL | FULL | REFERENCE ONLY | `tests/organizations-workspace… | KEEP + IMPROVE | Med |
| AUTH-050 | Multi-role → Member invite / role change UI | — | — | FULL | MISSING (UI) | NOT APPLICABLE | NONE | RESTORE | Med |
| AUTH-051 | Account upgrade → Normal user → provider / office / company | — | — | OLD SOURCE REQUIRED | PARTIAL | NOT APPLICABLE | NONE | KEEP + IMPROVE | Med |
| AUTH-052 | Identity resolution → Canonical identity row | — | — | PARTIAL | **REGRESSION — 4 uncorrelated identity keyspaces** | REFERENCE ONLY | NONE | MERGE INTO NEW SYSTEM | High |
| AUTH-053 | Identity resolution → Session identity resolver | — | — | FULL (insecure) | BETTER THAN OLD | NOT APPLICABLE | NONE | KEEP | Low |
| AUTH-054 | Password policy → Min/max length | — | — | FULL | FULL | REFERENCE ONLY | `tests/auth-core.test.ts` (NOT… | KEEP | Low |
| AUTH-055 | Identity schema → PG identity bootstrap | — | — | MISSING | FULL — but `user_oauth_accounts`, `admin_roles`, `admin_role_assignments`, `user_business_cards` are **not** in the required set | NOT APPLICABLE | `tests/amrs/pg-identity-schema… | FIX REGRESSION | High |
| AUTH-056 | Test coverage → Identity tests excluded from CI | — | — | n/a | REGRESSION | n/a | present-but-unrun | FIX REGRESSION | High |
| AUTH-057 | Desktop identity → Device pairing + credentials | — | — | MISSING | FULL (web side) | REFERENCE ONLY | `tests/integrations-pairing.te… | KEEP | Med |
| AUTH-058 | Desktop identity → License / subscription status endpoint | — | — | OLD SOURCE REQUIRED | MISSING (contract mismatch) | REFERENCE ONLY | NONE | RESTORE | High |
| AUTH-059 | Desktop identity → Per-user permission grants | — | — | contracts\ | treasury\ | print\ | MISSING on web | REFERENCE ONLY | n/a |
| PROF-001 | Normal member profile → View own profile | — | — | MISSING | PARTIAL | NOT APPLICABLE | NONE | KEEP + IMPROVE | Med |
| PROF-002 | Normal member profile → Edit own profile | — | — | MISSING | MISSING | NOT APPLICABLE | NONE | RESTORE | High |
| PROF-003 | Normal member profile → Avatar / photo | — | — | MISSING | MISSING | REFERENCE ONLY | NONE | RESTORE | Med |
| PROF-004 | Normal member profile → Public vs private fields | — | — | OLD SOURCE REQUIRED | NOT APPLICABLE (by design) | NOT APPLICABLE | NONE | KEEP | Low |
| PROF-005 | Craftsman / provider profile → Core record | — | — | OLD SOURCE REQUIRED | FULL | REFERENCE ONLY | `tests/services-marketplace.te… | KEEP | Low |
| PROF-006 | Craftsman / provider profile → Portfolio | — | — | OLD SOURCE REQUIRED | FULL | NOT APPLICABLE | `tests/services-marketplace.te… | KEEP | Low |
| PROF-007 | Craftsman / provider profile → Services offered | — | — | OLD SOURCE REQUIRED | FULL | NOT APPLICABLE | `tests/services-marketplace.te… | KEEP | Low |
| PROF-008 | Craftsman / provider profile → Documents / licences | — | — | OLD SOURCE REQUIRED | FULL | NOT APPLICABLE | NONE | KEEP | Med |
| PROF-009 | Craftsman / provider profile → Reviews & ratings | — | — | OLD SOURCE REQUIRED | FULL | NOT APPLICABLE | `tests/services-marketplace.te… | KEEP | Low |
| PROF-010 | Craftsman / provider profile → Statistics | — | — | OLD SOURCE REQUIRED | FULL | NOT APPLICABLE | NONE | KEEP | Low |
| PROF-011 | Craftsman / provider profile → Availability / activity state | — | — | OLD SOURCE REQUIRED | PARTIAL (two unrelated models, AMRS one is dead) | NOT APPLICABLE | `tests/amrs/amrs4-lifecycle.te… | MERGE INTO NEW SYSTEM | Med |
| PROF-012 | Craftsman / provider profile → Public profile leaks non-approved p… | — | — | OLD SOURCE REQUIRED | BROKEN (data exposure) | NOT APPLICABLE | NONE | FIX REGRESSION | High |
| PROF-013 | Office profile → Organization record | — | — | FULL | PARTIAL — **`commercial_registration`, `tax_number`, `sponsor_code`, structured street address (governorate/village/street) dropped from the org record** (they survive only on `organization_branches`, `lib/db/schema.ts:166-170`) | REFERENCE ONLY | `tests/organizations-workspace… | RESTORE | High |
| PROF-014 | Company profile → Same record, type `business`/`other` | — | — | FULL | PARTIAL (same gaps as PROF-013) | NOT APPLICABLE | `tests/organizations-workspace… | RESTORE | High |
| PROF-015 | Office/Company profile → Logo & cover | — | — | FULL | PARTIAL (URL only, no upload) | REFERENCE ONLY | NONE | RESTORE | Med |
| PROF-016 | Office/Company profile → Branches | — | — | FULL | BETTER THAN OLD (adds working hours + service areas) | REFERENCE ONLY | `tests/organizations-workspace… | KEEP | Low |
| PROF-017 | Office/Company profile → Members list | — | — | FULL | PARTIAL (no write UI — see AUTH-050) | REFERENCE ONLY | `tests/organizations-workspace… | RESTORE | Med |
| PROF-018 | Office/Company profile → Public organization page | — | — | MISSING | PARTIAL — shows raw `level`/`score` strings, no badge, no verification indicator | NOT APPLICABLE | NONE | KEEP + IMPROVE | Med |
| PROF-019 | Office/Company profile → Properties owned / listed on the profile | — | — | OLD SOURCE REQUIRED | MISSING | REFERENCE ONLY | NONE | RESTORE | Med |
| PROF-020 | Verification → Verification records | — | — | MISSING | FULL (model + API) | REFERENCE ONLY | `tests/organizations-verificat… | FIX REGRESSION | High |
| PROF-021 | Verification → Subject self-service submission | — | — | MISSING | PARTIAL (no UI to submit) | NOT APPLICABLE | `tests/organizations-verificat… | RESTORE | Med |
| PROF-022 | Verification → Document evidence storage | — | — | MISSING | PARTIAL (comment ≠ behaviour) | NOT APPLICABLE | NONE | FIX REGRESSION | High |
| PROF-023 | Badges → Trust / achievement badges on profiles | — | — | OLD SOURCE REQUIRED | MISSING | NOT APPLICABLE | NONE | OLD SOURCE REQUIRED | Med |
| PROF-024 | Profile strength → Weighted completeness | — | — | MISSING | REGRESSION (duplicate, inconsistent) | NOT APPLICABLE | `tests/amrs/amrs6-profiles.tes… | MERGE INTO NEW SYSTEM | Med |
| PROF-025 | Profile → Business card | — | — | OLD SOURCE REQUIRED | MISSING (orphan schema) | NOT APPLICABLE | NONE | OLD SOURCE REQUIRED | Med |
| PROF-026 | Advertiser profile → Sponsor profile record | — | — | FULL | PARTIAL | NOT APPLICABLE | NONE | KEEP | Low |
| PROF-027 | Contact data → Phone / WhatsApp verification | — | — | OLD SOURCE REQUIRED | PARTIAL | REFERENCE ONLY | NONE | KEEP + IMPROVE | Med |
| PROF-028 | Profiles → AMRS domain event bus | — | — | MISSING | STUB | NOT APPLICABLE | `tests/amrs/amrs10-integration… | KEEP + IMPROVE | Med |
| RANK-001 | Reputation levels → new / rising / distinguished / gold / promax | — | — | MISSING | FULL (model) | REFERENCE ONLY | `tests/amrs/amrs5-policy.test.… | KEEP | Low |
| RANK-002 | Reputation levels → Scoring engine | — | — | MISSING | FULL (pure function) | NOT APPLICABLE | `tests/amrs/amrs5-policy.test.… | KEEP | Low |
| RANK-003 | Reputation levels → Duplicate scoring path | — | — | MISSING | REGRESSION (duplicate) | NOT APPLICABLE | `tests/amrs/amrs5-policy.test.… | MERGE INTO NEW SYSTEM | Low |
| RANK-004 | Reputation levels → Per-entity-type policies | — | — | MISSING | FULL | NOT APPLICABLE | `tests/amrs/amrs5-policy.test.… | KEEP | Low |
| RANK-005 | Reputation levels → ProMax eligibility gate | — | — | MISSING | FULL | NOT APPLICABLE | `tests/amrs/amrs5-policy.test.… | KEEP | Low |
| RANK-006 | Reputation levels → Demotion grace period | — | — | MISSING | PARTIAL — `grace_period_ends_at` is written but no read path treats the entity as still holding the old level | NOT APPLICABLE | `tests/amrs/amrs5-policy.test.… | FIX REGRESSION | Med |
| RANK-007 | Reputation levels → Automatic evaluation | — | — | MISSING | MISSING | NOT APPLICABLE | NONE | RESTORE | High |
| RANK-008 | Reputation levels → Real signal collection | — | — | MISSING | MISSING (fabricated inputs) | NOT APPLICABLE | NONE | RESTORE | High |
| RANK-009 | Reputation levels → Manual admin override | — | — | MISSING | FULL (API) / MISSING (UI) | NOT APPLICABLE | `tests/amrs/amrs5-policy.test.… | RESTORE (UI) | Med |
| RANK-010 | Reputation levels → History & audit of level changes | — | — | MISSING | FULL | NOT APPLICABLE | `tests/amrs/amrs5-policy.test.… | KEEP | Low |
| RANK-011 | Reputation levels → Distribution report | — | — | MISSING | FULL (API) / MISSING (UI) | NOT APPLICABLE | `tests/amrs/amrs8-admin.test.t… | RESTORE (UI) | Low |
| RANK-012 | Rank effect → Visual profile | — | — | MISSING | PARTIAL (raw text only) | NOT APPLICABLE | NONE | KEEP + IMPROVE | Med |
| RANK-013 | Rank effect → Badges | — | — | MISSING | MISSING | NOT APPLICABLE | NONE | OLD SOURCE REQUIRED | Med |
| RANK-014 | Rank effect → Search prominence (directory) | — | — | none | MISSING | **STUB (filters accepted, never applied)** | none | `tests/amrs/amrs7-directory.test.ts` (NOT in `npm test`) | Phase 1 |
| RANK-015 | Rank effect → Trust indicators | — | — | MISSING | **STUB (always null/false)** | NOT APPLICABLE | `tests/amrs/amrs7-directory.te… | FIX REGRESSION | High |
| RANK-016 | Rank effect → Limits / quotas | — | — | PARTIAL (plan-based) | MISSING | NOT APPLICABLE | NONE | RESTORE | High |
| RANK-017 | Rank effect → Privileges | — | — | MISSING | MISSING | NOT APPLICABLE | NONE | OLD SOURCE REQUIRED | Med |
| RANK-018 | Rank effect → Ad benefits | — | — | FULL (advertiser tier) | PARTIAL — advertiser tier preserved; reputation rank has zero ad effect. Policy text explicitly forbids buying rank: `src/content/legal-center.ts:96` | NOT APPLICABLE | NONE | KEEP | Low |
| RANK-019 | Provider ranking → Featured provider rank | — | — | OLD SOURCE REQUIRED | FULL — **and this, not reputation, is the only ranking that actually affects search** | NOT APPLICABLE | `tests/services-marketplace.te… | KEEP | Med |
| RANK-020 | Provider ranking → Rating-based ordering | — | — | OLD SOURCE REQUIRED | FULL | NOT APPLICABLE | `tests/services-matching.test.… | KEEP | Low |
| RANK-021 | Provider ranking → Surveyor discovery sort | — | — | MISSING | PARTIAL (depends on RANK-014/015 which are stubs) | NOT APPLICABLE | `tests/land/amrs-directory.tes… | KEEP + IMPROVE | Med |
| RANK-022 | Company ranking → Organization classification | — | — | MISSING | PARTIAL — stored and validated but **never displayed, filtered on, or used for ordering** (`lib/amrs/directory.ts:43-65` ignores it) | NOT APPLICABLE | `tests/organizations-hardening… | FIX REGRESSION | Med |
| RANK-023 | Company ranking → Organization reputation subject | — | — | MISSING | PARTIAL (read/write asymmetry) | NOT APPLICABLE | `tests/amrs/amrs3-security.tes… | KEEP + IMPROVE | Med |
| RANK-024 | Rank governance → Trust/paid separation policy | — | — | MISSING | FULL (policy text) — no code enforces it because rank has no effects yet | NOT APPLICABLE | NONE | KEEP | Low |
| RANK-025 | Rank governance → Rank-change notification / realtime | — | — | MISSING | MISSING | NOT APPLICABLE | NONE | RESTORE | Med |
| RANK-026 | Desktop rank → Agency tier | — | — | OLD SOURCE REQUIRED | MISSING (no web counterpart) | REFERENCE ONLY | NONE | OLD SOURCE REQUIRED | Med |
| RANK-027 | Advertiser rank → Plan tiers & subscription state | — | — | FULL | MISSING | REFERENCE ONLY | NONE | RESTORE | High |

## Properties, Land, FindMyLand, Engineering Tools, Geo (D, E, F, U, V)
*ROUND-1 (V2 lineage)*

| ID | Feature | V1 depth | V1 | Old V2 | Current V2 | Desktop | Tests | Decision | Risk |
|---|---|---|---|---|---|---|---|---|---|
| PROP-001 | Public property browse → `/properties` listing page | — | — | PARTIAL | PARTIAL | NOT APPLICABLE | MISSING | KEEP + IMPROVE | High |
| PROP-002 | Public property browse → Live DB results never rendered | — | — | NOT APPLICABLE | BROKEN | NOT APPLICABLE | MISSING | FIX REGRESSION | High |
| PROP-003 | Property search → `/properties/search` advanced search | — | — | MISSING | FULL | PARTIAL | MISSING | KEEP | Low |
| PROP-004 | Property filters → Price / area / beds / baths filters | — | — | MISSING | FULL | FULL | MISSING | KEEP + IMPROVE | Med |
| PROP-005 | Property filters → Geo filters (country/governorate/city/district) | — | — | MISSING | FULL | FULL | MISSING | KEEP | Low |
| PROP-006 | Property filters → Offer-type / marketing-method / auction-type fi… | — | — | MISSING | FULL | PARTIAL | MISSING | KEEP | Low |
| PROP-007 | Property filters → Free-text search | — | — | MISSING | PARTIAL (no index, no FTS) | NOT APPLICABLE | MISSING | KEEP + IMPROVE | Med |
| PROP-008 | Property filters → Sorting + pagination | — | — | MISSING | FULL | NOT APPLICABLE | MISSING | KEEP | Low |
| PROP-009 | Property filters → Public taxonomy filter chips | — | — | NOT APPLICABLE | BROKEN | NOT APPLICABLE | MISSING | FIX REGRESSION | Med |
| PROP-010 | Property map → Map on browse / detail | — | — | MISSING | MISSING | FULL | MISSING | RESTORE | High |
| PROP-011 | Nearby properties → Radius / nearby property search | — | — | MISSING | PARTIAL | FULL | `cur/tests/integrations-radar.… | MERGE INTO NEW SYSTEM | High |
| PROP-012 | Similar properties → "Similar properties" strip on detail | — | — | MISSING | PARTIAL | FULL | MISSING | KEEP + IMPROVE | Low |
| PROP-013 | Property details → Detail page | — | — | PARTIAL | PARTIAL | FULL | MISSING | KEEP + IMPROVE | Med |
| PROP-014 | Property details → Media gallery / carousel | — | — | MISSING | MISSING | FULL | MISSING | RESTORE | Med |
| PROP-015 | Property details → Owner / office contact block | — | — | MISSING | MISSING | FULL | MISSING | RESTORE | High |
| PROP-016 | Create property → Create API | — | — | MISSING | FULL | FULL | MISSING | KEEP | Low |
| PROP-017 | Create property → Multi-step wizard | — | — | MISSING | PARTIAL (not routed) | NOT APPLICABLE | MISSING | KEEP + IMPROVE | Med |
| PROP-018 | Create property → Duplicate create forms | — | — | PARTIAL | PARTIAL | NOT APPLICABLE | MISSING | MERGE INTO NEW SYSTEM | Med |
| PROP-019 | Edit property → Edit API + page | — | — | MISSING | PARTIAL | FULL | MISSING | KEEP + IMPROVE | Med |
| PROP-020 | Edit property → Edit blocked after submission | — | — | NOT APPLICABLE | PARTIAL | FULL | MISSING | KEEP + IMPROVE | Med |
| PROP-021 | Edit property → Office member cannot edit office property | — | — | NOT APPLICABLE | REGRESSION | FULL | MISSING | FIX REGRESSION | High |
| PROP-022 | Delete property → Hard delete | — | — | MISSING | PARTIAL | FULL | MISSING | KEEP + IMPROVE | Med |
| PROP-023 | Delete property → Archive / soft-delete | — | — | MISSING | MISSING | FULL | MISSING | RESTORE | Med |
| PROP-024 | Status lifecycle → draft → pending_review | — | — | MISSING | PARTIAL | FULL | MISSING | FIX REGRESSION | High |
| PROP-025 | Status lifecycle → Submit-for-review UI | — | — | NOT APPLICABLE | MISSING | NOT APPLICABLE | MISSING | RESTORE | High |
| PROP-026 | Status lifecycle → sold / rented transitions | — | — | MISSING | MISSING | FULL | MISSING | RESTORE | Med |
| PROP-027 | Images → Image upload | — | — | MISSING | MISSING | FULL | MISSING | RESTORE | High |
| PROP-028 | Images → Featured / ordered media | — | — | MISSING | PARTIAL (no reorder UI) | FULL | MISSING | KEEP + IMPROVE | Low |
| PROP-029 | Videos → Video media type | — | — | MISSING | PARTIAL (stored, never played) | PARTIAL | MISSING | KEEP + IMPROVE | Low |
| PROP-030 | Featured listings → `is_featured` flag | — | — | MISSING | PARTIAL (no API sets it) | NOT APPLICABLE | MISSING | KEEP + IMPROVE | Low |
| PROP-031 | Featured listings → FeaturedProperties ad placement | — | — | PARTIAL | BROKEN | NOT APPLICABLE | MISSING | FIX REGRESSION | Med |
| PROP-032 | Offer types → Sale offer type | — | — | MISSING | FULL | FULL | MISSING | KEEP | Low |
| PROP-033 | Offer types → Rent offer type | — | — | MISSING | FULL | FULL | MISSING | KEEP | Low |
| PROP-034 | Offer types → Other offer types (Taqbeel / Faragh / Investment / A… | — | — | MISSING | FULL | PARTIAL | MISSING | KEEP | Low |
| PROP-035 | Offer types → Offer policy enforcement | — | — | MISSING | FULL | PARTIAL | MISSING | KEEP | Low |
| PROP-036 | Offer types admin → Duplicate offer-type admin APIs | — | — | PARTIAL | PARTIAL | NOT APPLICABLE | MISSING | MERGE INTO NEW SYSTEM | Med |
| PROP-037 | Offer types admin → Missing admin permission check | — | — | NOT APPLICABLE | BROKEN | NOT APPLICABLE | MISSING | FIX REGRESSION | High |
| PROP-038 | Taxonomy admin → Property categories/types admin | — | — | PARTIAL | PARTIAL (writes a different DB than listings) | FULL | MISSING | MERGE INTO NEW SYSTEM | High |
| PROP-039 | Ownership → Created-by user | — | — | MISSING | PARTIAL (nullable → orphan listings) | FULL | MISSING | KEEP + IMPROVE | High |
| PROP-040 | Ownership → Office owner (`office_id`) | — | — | MISSING | PARTIAL | FULL | MISSING | KEEP + IMPROVE | High |
| PROP-041 | Ownership → Office membership not verified on write | — | — | NOT APPLICABLE | BROKEN | FULL | MISSING | FIX REGRESSION | High |
| PROP-042 | Ownership → Individual owner listings | — | — | MISSING | FULL | FULL | MISSING | KEEP | Low |
| PROP-043 | Ownership → Company owner | — | — | MISSING | MISSING | PARTIAL | MISSING | OLD SOURCE REQUIRED | Med |
| PROP-044 | My properties → `/dashboard/properties` shows other users' listings | — | — | NOT APPLICABLE | BROKEN | FULL | MISSING | FIX REGRESSION | High |
| PROP-045 | My properties → `/api/properties/my` alternative endpoint | — | — | PARTIAL | PARTIAL (dead) | NOT APPLICABLE | MISSING | MERGE INTO NEW SYSTEM | Med |
| PROP-046 | Favorites → Add / remove / list favorites | — | — | PARTIAL | FULL | NOT APPLICABLE | MISSING | KEEP | Low |
| PROP-047 | Favorites → `favorites_count` denormalised counter | — | — | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | MISSING | FIX REGRESSION | Low |
| PROP-048 | Bookmarks → Bookmarks separate from favorites | — | — | MISSING | NOT APPLICABLE | NOT APPLICABLE | MISSING | KEEP (superseded by favorites) | Low |
| PROP-049 | Saved searches → Save / list / delete a search | — | — | PARTIAL | FULL | PARTIAL | MISSING | KEEP | Low |
| PROP-050 | Saved searches → Duplicate implementation | — | — | PARTIAL | PARTIAL | NOT APPLICABLE | MISSING | MERGE INTO NEW SYSTEM | Med |
| PROP-051 | Saved searches → Notification toggle | — | — | PARTIAL | FULL | NOT APPLICABLE | MISSING | KEEP | Low |
| PROP-052 | Saved-search notifications → Match evaluation + delivery | — | — | MISSING | MISSING | FULL | MISSING | RESTORE | High |
| PROP-053 | Property requests → Create / list / close a buyer request | — | — | PARTIAL | FULL | FULL | MISSING | KEEP + IMPROVE | Low |
| PROP-054 | Property requests → Office discovery of open requests | — | — | MISSING | MISSING | FULL | MISSING | RESTORE | High |
| PROP-055 | Offers against requests → Office submits an offer | — | — | MISSING | PARTIAL (no UI) | FULL | MISSING | KEEP + IMPROVE | Med |
| PROP-056 | Offers against requests → Accept / reject an offer | — | — | MISSING | PARTIAL (no UI, no notification) | FULL | MISSING | KEEP + IMPROVE | Med |
| PROP-057 | Offers against requests → Offer revision / counter-offer | — | — | MISSING | MISSING | PARTIAL | MISSING | RESTORE | Med |
| PROP-058 | Property inquiry → Inquiry capture (name/email/phone/message) | — | — | MISSING | MISSING | FULL | MISSING | RESTORE | High |
| PROP-059 | Messaging from a property → "Enquire now" starts a thread | — | — | MISSING | PARTIAL | PARTIAL | `cur/tests/messages-contract.t… | KEEP + IMPROVE | High |
| PROP-060 | Messaging from a property → Owner is never added as a participant | — | — | NOT APPLICABLE | BROKEN | NOT APPLICABLE | MISSING | FIX REGRESSION | High |
| PROP-061 | Sharing → Share a listing (link / WhatsApp / QR) | — | — | MISSING | MISSING | FULL | MISSING | RESTORE | Med |
| PROP-062 | Geo targeting → Country / governorate / city context applied to br… | — | — | MISSING | PARTIAL (blocked by PROP-002) | FULL | MISSING | KEEP + IMPROVE | Med |
| PROP-063 | Analytics → View tracking | — | — | MISSING | PARTIAL | NOT APPLICABLE | MISSING | KEEP + IMPROVE | Med |
| PROP-064 | Analytics → Owner-facing performance dashboard | — | — | MISSING | MISSING | PARTIAL | MISSING | RESTORE | Low |
| PROP-065 | Moderation → Approve / reject review API | — | — | MISSING | PARTIAL | PARTIAL | MISSING | KEEP + IMPROVE | High |
| PROP-066 | Moderation → Admin review queue UI | — | — | MISSING | MISSING | NOT APPLICABLE | MISSING | RESTORE | High |
| PROP-067 | Moderation → Approval / rejection notification to owner | — | — | MISSING | MISSING | PARTIAL | MISSING | RESTORE | High |
| PROP-068 | Moderation → Audit trail of review decisions | — | — | MISSING | PARTIAL | FULL | MISSING | KEEP + IMPROVE | Med |
| PROP-069 | Office-created properties → Office workspace property list | — | — | MISSING | PARTIAL (read-only, no create/edit/delete) | FULL | `cur/tests/organizations-works… | KEEP + IMPROVE | Med |
| PROP-070 | Desktop sync → `property.upsert` / `property.delete` operations | — | — | MISSING | PARTIAL | FULL | `cur/tests/integrations-sync.t… | KEEP + IMPROVE | High |
| PROP-071 | Desktop sync → Sync writes to the wrong table | — | — | NOT APPLICABLE | BROKEN | FULL | PARTIAL | FIX REGRESSION | High |
| PROP-072 | Desktop sync → Rich desktop fields dropped on sync | — | — | NOT APPLICABLE | REGRESSION | FULL | PARTIAL | RESTORE | High |
| PROP-073 | Schema → Property table DDL missing from the repo | — | — | FULL (in snapshot) | REGRESSION | n/a | `cur/tests/schema-latch.test.m… | RESTORE | High |
| PROP-074 | Tests → Property domain test coverage | — | — | MISSING | MISSING | n/a | MISSING | RESTORE | High |
| LAND-001 | Land listings → `/land` marketplace search page | — | — | MISSING | PARTIAL | PARTIAL | MISSING | KEEP + IMPROVE | Med |
| LAND-002 | Land search → Land search API | — | — | MISSING | FULL | NOT APPLICABLE | MISSING | KEEP | Low |
| LAND-003 | Land search → Radius / nearby land search | — | — | MISSING | MISSING (stub) | PARTIAL | MISSING | RESTORE | Med |
| LAND-004 | Land details → Land detail page | — | — | MISSING | PARTIAL | FULL | MISSING | KEEP + IMPROVE | Low |
| LAND-005 | Land maps → Parcel markers on a Leaflet map | — | — | MISSING | FULL | FULL | MISSING | KEEP | Low |
| LAND-006 | Land maps → Polygon boundary rendering | — | — | MISSING | MISSING | FULL | MISSING | RESTORE | High |
| LAND-007 | Land data → Coordinates (lat/lon) | — | — | MISSING | FULL | FULL | MISSING | KEEP | Low |
| LAND-008 | Land data → Area + area unit + frontage + road access + utilities | — | — | MISSING | PARTIAL (stored, partially rendered) | FULL | MISSING | KEEP + IMPROVE | Low |
| LAND-009 | Land lifecycle → Create / update / delete a parcel | — | — | MISSING | MISSING | FULL | MISSING | RESTORE | Med |
| LAND-010 | Land documents → Attach survey documents to a parcel | — | — | MISSING | MISSING | FULL | MISSING | RESTORE | Med |
| LAND-011 | Land valuations → Record and read parcel valuations | — | — | MISSING | MISSING | NOT APPLICABLE | MISSING | RESTORE | Low |
| LAND-012 | Saved land → Land favorites | — | — | MISSING | MISSING | NOT APPLICABLE | MISSING | RESTORE | Med |
| LAND-013 | Saved land → "Save my land" from FindMyLand | — | — | PARTIAL | BROKEN | NOT APPLICABLE | `cur/tests/land/land-flow.test… | FIX REGRESSION | High |
| LAND-014 | Saved land → Saved land is an in-process `Map`, unauthenticated | — | — | none | none | PARTIAL | none | none | P0 |
| LAND-015 | Saved land → `/api/land/[id]` route conflict | — | — | NOT APPLICABLE | BROKEN | NOT APPLICABLE | MISSING | FIX REGRESSION | High |
| LAND-016 | Land sharing → Share link + QR payload + expiry | — | — | FULL (in SNAP-CGPT) | REGRESSION | PARTIAL | PARTIAL | RESTORE | High |
| LAND-017 | Land sharing → Map view + directions URLs | — | — | PARTIAL | PARTIAL | NOT APPLICABLE | PARTIAL | KEEP + IMPROVE | Low |
| LAND-018 | Survey services → Surveyor discovery near a parcel | — | — | FULL | FULL | PARTIAL | `cur/tests/land/amrs-directory… | KEEP | Low |
| LAND-019 | Survey services → Request a surveyor quote | — | — | FULL | PARTIAL (in-memory store, no notification) | PARTIAL | PARTIAL | FIX REGRESSION | Med |
| LAND-020 | Land ↔ AMRS handoff → Professional integration bridge | — | — | PARTIAL | PARTIAL | PARTIAL | `cur/tests/land/land-flow.test… | KEEP + IMPROVE | Med |
| FML-001 | Input → PDF upload | — | — | PARTIAL | FULL | PARTIAL | `cur/tests/land/find-my-land.t… | KEEP | Low |
| FML-002 | Input → Image upload (PNG/JPG/WEBP) | — | — | FULL | FULL | PARTIAL | PARTIAL | KEEP | Low |
| FML-003 | Input → Drag & drop | — | — | MISSING | FULL | NOT APPLICABLE | MISSING | KEEP (BETTER THAN OLD) | Low |
| FML-004 | Input → Non-image / non-PDF inputs (DXF, KML/KMZ, TXT, CSV, DOCX) | — | — | FULL (in SNAP-CGPT) | REGRESSION | FULL | MISSING | RESTORE | High |
| FML-005 | Input → Manual coordinate entry / paste | — | — | FULL | MISSING | FULL | MISSING | RESTORE | High |
| FML-006 | Input → Original-file preview | — | — | PARTIAL | FULL | NOT APPLICABLE | MISSING | KEEP (BETTER THAN OLD) | Low |
| FML-007 | Extraction → Native PDF text layer extraction | — | — | PARTIAL | FULL | NOT APPLICABLE | `cur/tests/geo/geo-pipeline.te… | KEEP | Low |
| FML-008 | Extraction → Structured text reconstruction | — | — | PARTIAL | PARTIAL | FULL | PARTIAL | FIX REGRESSION | High |
| FML-009 | OCR → OCR engine (tesseract.js) | — | — | FULL | FULL | NOT APPLICABLE | PARTIAL | KEEP + IMPROVE | Med |
| FML-010 | OCR → Arabic OCR | — | — | FULL | FULL | NOT APPLICABLE | PARTIAL | KEEP | Low |
| FML-011 | OCR → English numeric second pass | — | — | MISSING | FULL | NOT APPLICABLE | PARTIAL | KEEP (BETTER THAN OLD) | Low |
| FML-012 | OCR → Image preprocessing (grayscale, median filter, contrast stre… | — | — | MISSING | FULL | NOT APPLICABLE | MISSING | KEEP (BETTER THAN OLD) | Low |
| FML-013 | OCR → Survey-table crop + upscale | — | — | MISSING | FULL | NOT APPLICABLE | PARTIAL | KEEP (BETTER THAN OLD) | Med |
| FML-014 | OCR → Per-digit confidence annotation (`OCRCONF`) | — | — | MISSING | FULL | NOT APPLICABLE | `cur/tests/land/find-my-land.t… | KEEP (BETTER THAN OLD) | Low |
| FML-015 | Table parsing → English coordinate headings | — | — | MISSING | FULL | FULL | `cur/tests/land/find-my-land.t… | KEEP | Low |
| FML-016 | Table parsing → Arabic coordinate headings | — | — | MISSING | MISSING | FULL | MISSING | RESTORE | High |
| FML-017 | Table parsing → Arabic point-label rows lost | — | — | FULL | REGRESSION | FULL | MISSING | FIX REGRESSION | Med |
| FML-018 | Table parsing → Legacy generic UTM rows (`idx easting northing`) | — | — | FULL | REGRESSION | FULL | PARTIAL | RESTORE | High |
| FML-019 | Coordinates → UTM parsing (zone + hemisphere in text) | — | — | FULL | FULL | FULL | `cur/tests/land/find-my-land.t… | KEEP | Low |
| FML-020 | Coordinates → WGS84 decimal / DMS / hemisphere-token parsing | — | — | PARTIAL | FULL | FULL | `cur/tests/geo/geo-pipeline.te… | KEEP + IMPROVE | Low |
| FML-021 | Coordinates → Explicit zone detection from text | — | — | PARTIAL | FULL | FULL | `cur/tests/land/find-my-land.t… | KEEP + IMPROVE | Low |
| FML-022 | Coordinates → Zone-less UTM inference | — | — | MISSING | FULL | FULL | `cur/tests/land/find-my-land.t… | KEEP (BETTER THAN OLD) | Med |
| FML-023 | Coordinates → Numeric repair of ambiguous OCR digits | — | — | PARTIAL (blind) | FULL | NOT APPLICABLE | `cur/tests/land/find-my-land.t… | KEEP (BETTER THAN OLD) | Med |
| FML-024 | Coordinates → Blind OCR letter→digit repair dropped | — | — | none | FULL | PARTIAL | none | MISSING | Phase 2 |
| FML-025 | Coordinates → Arabic-Indic / Persian digit normalisation | — | — | MISSING | PARTIAL (tool parser only; resolver-side `lib/geo` does not fold Arabic-Indic digits) | NOT APPLICABLE | MISSING | KEEP + IMPROVE | Med |
| FML-026 | Coordinates → Decimal-separator recovery | — | — | MISSING | FULL | NOT APPLICABLE | `cur/tests/land/find-my-land.t… | KEEP (BETTER THAN OLD) | Low |
| FML-027 | CRS → CRS detection (EPSG, datum, zone hints, WGS84 markers) | — | — | MISSING | FULL | NOT APPLICABLE | `cur/tests/land/find-my-land.t… | KEEP | Low |
| FML-028 | Validation → Coordinate order protection | — | — | PARTIAL | FULL | NOT APPLICABLE | `cur/tests/land/find-my-land.t… | KEEP (BETTER THAN OLD) | Low |
| FML-029 | Geometry → Polygon generation + self-intersection reporting | — | — | PARTIAL | FULL | FULL | `cur/tests/land/find-my-land.t… | KEEP (BETTER THAN OLD) | Low |
| FML-030 | Geometry → Area computation + registered-area cross-check | — | — | PARTIAL | FULL | FULL | `cur/tests/land/find-my-land.t… | KEEP (BETTER THAN OLD) | Low |
| FML-031 | Geometry → Perimeter output | — | — | FULL | MISSING | FULL | MISSING | RESTORE | Low |
| FML-032 | Result → Map rendering of the result | — | — | FULL | FULL | FULL | MISSING | KEEP | Low |
| FML-033 | Result → Deed-detail extraction (owner, doc no., plan, parcel, are… | — | — | PARTIAL | FULL | FULL | `cur/tests/land/find-my-land.t… | KEEP (BETTER THAN OLD) | Low |
| FML-034 | Result → Confidence scoring + evidence panel | — | — | MISSING | FULL | NOT APPLICABLE | PARTIAL | KEEP (BETTER THAN OLD) | Low |
| FML-035 | Result → Export — clipboard (WGS84 / UTM / full summary) | — | — | PARTIAL | FULL | NOT APPLICABLE | MISSING | KEEP (BETTER THAN OLD) | Low |
| FML-036 | Result → Export — file download (KML / DXF / CSV / PDF) | — | — | FULL | MISSING | FULL | `cur/tests/tools/points-to-dxf… | RESTORE | High |
| FML-037 | Result → Share (native share / WhatsApp / Messenger) | — | — | MISSING | FULL | FULL | MISSING | KEEP (BETTER THAN OLD) | Low |
| FML-038 | Result → Share link + QR of a saved land | — | — | FULL | REGRESSION | PARTIAL | PARTIAL | RESTORE | High |
| FML-039 | Result → Saved projects / history | — | — | PARTIAL | MISSING | NOT APPLICABLE | MISSING | OLD SOURCE REQUIRED | Med |
| FML-040 | Errors → Error reporting to the user | — | — | PARTIAL | FULL | NOT APPLICABLE | MISSING | KEEP (BETTER THAN OLD) | Low |
| FML-041 | Errors → Retry / fallback path | — | — | MISSING | PARTIAL | NOT APPLICABLE | MISSING | KEEP + IMPROVE | Med |
| FML-042 | Mobile → Responsive layout and touch targets | — | — | PARTIAL | FULL | NOT APPLICABLE | MISSING | KEEP | Low |
| FML-043 | Mobile → Client-side OCR cost on mobile | — | — | PARTIAL | PARTIAL | NOT APPLICABLE | MISSING | KEEP + IMPROVE | Med |
| FML-044 | Security → Upload security gate | — | — | MISSING | FULL | NOT APPLICABLE | `cur/tests/geo/geo-pipeline.te… | KEEP | Low |
| FML-045 | Security → Relevance gate ("is this a land document?") | — | — | MISSING | FULL | NOT APPLICABLE | `cur/tests/geo/geo-pipeline.te… | KEEP | Low |
| FML-046 | Security → Rate limiting on resolve/extract | — | — | MISSING | PARTIAL | NOT APPLICABLE | `cur/tests/rate-limit.test.mjs` | KEEP + IMPROVE | Med |
| FML-047 | Architecture → Four parallel land-parsing stacks | — | — | FULL (single) | PARTIAL | NOT APPLICABLE | PARTIAL | MERGE INTO NEW SYSTEM | High |
| FML-048 | Tests → FindMyLand / geo test suites never run in CI | — | — | MISSING | REGRESSION | n/a | REGRESSION | FIX REGRESSION | High |
| TOOL-001 | Tools hub → `/tools` registry page with search, category filter, s… | — | — | PARTIAL | FULL | NOT APPLICABLE | MISSING | KEEP (BETTER THAN OLD) | Low |
| TOOL-002 | Tools hub → `tools.use` permission gate | — | — | FULL | REGRESSION | NOT APPLICABLE | MISSING | RESTORE (or ratify tools as public) | High |
| TOOL-003 | Tools hub → Ad-placement policy for tools (mobile no-ads-before-re… | — | — | MISSING | MISSING (dead policy) | NOT APPLICABLE | `cur/tests/standard-public-ad-… | RESTORE | Med |
| TOOL-004 | Tools hub → Duplicate legacy `/tools/[id]` calculators | — | — | PARTIAL | BROKEN | NOT APPLICABLE | MISSING | MERGE INTO NEW SYSTEM | High |
| TOOL-005 | FindMyLand → Flagship deed-analysis tool | — | — | MISSING | PARTIAL | FULL | not in CI | KEEP + IMPROVE | High |
| TOOL-006 | LandMapper → Standalone "Land Mapper" tool de-registered | — | — | FULL (in SNAP-CGPT) | REGRESSION (superseded, but its parser capabilities are not fully carried over — see FML-017/FML-018) | NOT APPLICABLE | MISSING | SUPERSEDED WITH FULL PARITY (blocked until FML-016/017/018 are closed) | High |
| TOOL-007 | Coordinate converter → Single-point DD ⇄ DMS ⇄ DDM ⇄ UTM | — | — | FULL | FULL | FULL | MISSING | KEEP | Low |
| TOOL-008 | Coordinate converter → Batch mode + CSV download + DXF handoff | — | — | MISSING | FULL | NOT APPLICABLE | MISSING | KEEP (BETTER THAN OLD) | Low |
| TOOL-009 | Points→DXF → Survey point file → DXF | — | — | FULL | FULL | PARTIAL | `cur/tests/tools/points-to-dxf… | KEEP | Low |
| TOOL-010 | PDF→Word → PDF / image → .docx | — | — | FULL | FULL | NOT APPLICABLE | `cur/tests/tools/pdf-to-word-l… | KEEP | Low |
| TOOL-011 | PDF→Word → Fidelity vs editable output modes | — | — | MISSING | FULL | NOT APPLICABLE | PARTIAL | KEEP (BETTER THAN OLD) | Low |
| TOOL-012 | PDF→Word → Standalone `/tools/pdf2word` route | — | — | FULL | FULL | NOT APPLICABLE | MISSING | KEEP | Low |
| TOOL-013 | Area calculator → Polygon / triangle (SSS+SAS) / regular polygon /… | — | — | FULL | FULL | PARTIAL | MISSING | KEEP | Low |
| TOOL-014 | Scientific calculator → Calculator with memory + history | — | — | FULL | FULL | NOT APPLICABLE | MISSING | KEEP | Low |
| TOOL-015 | Concrete calculator → Volume + cement bags + sand/gravel/water | — | — | PARTIAL (incorrect maths) | FULL | NOT APPLICABLE | MISSING | KEEP (BETTER THAN OLD) | Low |
| TOOL-016 | Beam calculator → Volume + main bars + stirrups + rebar weight | — | — | PARTIAL (incorrect maths) | FULL | NOT APPLICABLE | MISSING | KEEP (BETTER THAN OLD) | Low |
| TOOL-017 | Rebar calculator → Bar weights by diameter and spacing | — | — | FULL | FULL | NOT APPLICABLE | MISSING | KEEP | Low |
| TOOL-018 | Tile calculator → Tile count, waste and adhesive | — | — | FULL | FULL | NOT APPLICABLE | MISSING | KEEP | Low |
| TOOL-019 | Brick calculator → Brick count + mortar | — | — | FULL | FULL | NOT APPLICABLE | MISSING | KEEP | Low |
| TOOL-020 | Paint calculator → Paint litres by coats and coverage | — | — | FULL | FULL | NOT APPLICABLE | MISSING | KEEP | Low |
| TOOL-021 | Slope calculator → Slope ratio, percentage and angle | — | — | FULL | FULL | NOT APPLICABLE | MISSING | KEEP | Low |
| TOOL-022 | Mix-ratio calculator → Cement/sand/gravel proportions | — | — | FULL | FULL | NOT APPLICABLE | MISSING | KEEP | Low |
| TOOL-023 | CAD subsystem → DXF / SVG / PNG / PDF export, layer panel, interac… | — | — | MISSING | MISSING (unreachable) | PARTIAL | MISSING | RESTORE | Med |
| TOOL-024 | Distance measurement → "قياس المسافات" map distance tool | — | — | INTENDED ONLY | MISSING | NOT APPLICABLE | MISSING | OLD SOURCE REQUIRED | Low |
| TOOL-025 | Shared tool shell → `ToolCalculatorShell`, `ToolResultCard`, `Tool… | — | — | PARTIAL | FULL | NOT APPLICABLE | `cur/tests/ui-components.test.… | KEEP | Low |
| TOOL-026 | Tests → Tool test suites excluded from CI | — | — | MISSING | REGRESSION | n/a | REGRESSION | FIX REGRESSION | Med |
| GEO-001 | Countries → `countries` table + `GET /api/geo?type=countries` | — | — | MISSING | FULL | FULL | MISSING | KEEP | Low |
| GEO-002 | Countries → Country map config (centre, zoom, publications, measur… | — | — | MISSING | PARTIAL (stored, no consumer applies map centre/zoom) | FULL | MISSING | KEEP + IMPROVE | Med |
| GEO-003 | Saudi hierarchy → Governorates / provinces / regions | — | — | MISSING | FULL | NOT APPLICABLE | MISSING | KEEP | Low |
| GEO-004 | Saudi hierarchy → Cities | — | — | MISSING | FULL | PARTIAL | MISSING | KEEP | Low |
| GEO-005 | Saudi hierarchy → Districts | — | — | MISSING | FULL | FULL | MISSING | KEEP | Low |
| GEO-006 | Saudi hierarchy → Streets | — | — | MISSING | PARTIAL (no consumer) | FULL | MISSING | KEEP + IMPROVE | Low |
| GEO-007 | Geo data → Combined hierarchy lookup | — | — | MISSING | PARTIAL | NOT APPLICABLE | MISSING | KEEP + IMPROVE | Low |
| GEO-008 | Geo admin → Admin CRUD for countries / governorates / cities / dis… | — | — | MISSING | MISSING | PARTIAL | MISSING | RESTORE | High |
| GEO-009 | Geo data → Seed coverage | — | — | MISSING | PARTIAL | PARTIAL | MISSING | KEEP + IMPROVE | High |
| GEO-010 | Geo data → Geo/currency migration file missing | — | — | FULL (in snapshot) | BROKEN | n/a | MISSING | RESTORE | High |
| GEO-011 | Geo runtime → `GeoContext` — country/governorate/city selection wi… | — | — | MISSING | FULL | FULL | MISSING | KEEP | Low |
| GEO-012 | Geo runtime → Reverse geocoding / current-location detection | — | — | MISSING | FULL | NOT APPLICABLE | MISSING | KEEP + IMPROVE | Med |
| GEO-013 | Geo data → Hard-coded geo lists bypassing the DB hierarchy | — | — | MISSING | PARTIAL | FULL | MISSING | MERGE INTO NEW SYSTEM | Med |
| GEO-014 | Shared geo infra → Haversine distance + radius search | — | — | MISSING | PARTIAL | FULL | `cur/tests/integrations-radar.… | MERGE INTO NEW SYSTEM | Med |
| GEO-015 | Shared geo infra → Country boundary validation | — | — | MISSING | FULL | NOT APPLICABLE | `cur/tests/land/find-my-land.t… | KEEP | Low |

## AMRS, Surveyors, Organizations / Offices / Companies / Professionals (G, H, M)
*ROUND-1 (V2 lineage)*

| ID | Feature | V1 depth | V1 | Old V2 | Current V2 | Desktop | Tests | Decision | Risk |
|---|---|---|---|---|---|---|---|---|---|
| AMRS-001 | Domain contracts → Shared type vocabulary | — | — | MISSING | FULL | NOT APPLICABLE | `tests/amrs/domain-contracts.t… | NEW IMPROVEMENT | Low |
| AMRS-002 | Domain contracts → Organization DTO/entity contract | — | — | MISSING | FULL | NOT APPLICABLE | `tests/amrs/db-schema.test.ts:… | KEEP | Low |
| AMRS-003 | Domain contracts → Professional profile contract | — | — | PARTIAL | FULL (types only, no table) | PARTIAL | `tests/amrs/domain-contracts.t… | MERGE INTO NEW SYSTEM | Med |
| AMRS-004 | Adapters → Legacy provider → professional bridge | — | — | MISSING | PARTIAL (dead code — only importer is `tests/amrs/amrs3-security.test.ts:15`) | NOT APPLICABLE | test-only | KEEP + IMPROVE (wire into `/api/professionals/[id]`) | Med |
| AMRS-005 | Organizations core → Create organization | — | — | SUPERSEDED | PARTIAL (API only, no UI) | PARTIAL | `tests/organizations-hardening… | KEEP + IMPROVE | High |
| AMRS-006 | Organizations core → Slug collision handling | — | — | MISSING | FULL | NOT APPLICABLE | none behavioural | KEEP | Low |
| AMRS-007 | Organizations core → List / filter organizations | — | — | FULL | PARTIAL | NOT APPLICABLE | none | FIX REGRESSION (see AMRS-008) | High |
| AMRS-008 | Organizations core → Country filter casing | — | — | FULL | BROKEN (public org directory always empty) | NOT APPLICABLE | none | FIX REGRESSION | High |
| AMRS-009 | Organizations core → Get organization by id | — | — | FULL | FULL | NOT APPLICABLE | none | KEEP | Low |
| AMRS-010 | Organizations core → Get organization by slug | — | — | PARTIAL | PARTIAL (function exists, no route uses it) | NOT APPLICABLE | none | KEEP + IMPROVE (add `/organizations/[slug]`) | Low |
| AMRS-011 | Organizations core → Update organization status | — | — | FULL | PARTIAL (helper unused by routes) | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| AMRS-012 | Organization lifecycle → Submit for review | — | — | PARTIAL | PARTIAL (API only, no UI) | NOT APPLICABLE | `tests/organizations-verificat… | KEEP + IMPROVE | High |
| AMRS-013 | Organization lifecycle → Admin review (approve/reject/suspend/reac… | — | — | FULL | PARTIAL (API only, unreachable from Admin) | NOT APPLICABLE | regex only | RESTORE (admin UI) | High |
| AMRS-014 | Organization members → Add member | — | — | FULL | PARTIAL (API only) | FULL | `tests/organizations-hardening… | KEEP + IMPROVE | High |
| AMRS-015 | Organization members → Change member role/status | — | — | FULL | PARTIAL (API only) | FULL | regex only | KEEP + IMPROVE | High |
| AMRS-016 | Organization members → Remove member (soft) | — | — | FULL | PARTIAL (API only) | NOT APPLICABLE | regex only | KEEP + IMPROVE | Med |
| AMRS-017 | Organization members → Public member count vs private roster | — | — | MISSING | FULL | NOT APPLICABLE | none | KEEP | Low |
| AMRS-018 | Organization members → Email invitation flow | — | — | OLD SOURCE REQUIRED | MISSING | NOT APPLICABLE | none | RESTORE | High |
| AMRS-019 | Organization branches → Create/list/update/delete branch | — | — | FULL | FULL | PARTIAL | `tests/organizations-workspace… | KEEP | Low |
| AMRS-020 | Organization branches → Branch geo + working hours + service areas | — | — | PARTIAL | PARTIAL (stored, never read/rendered) | MISSING | none | KEEP + IMPROVE | Med |
| AMRS-021 | Organization branches → Duplicate branch add path | — | — | n/a | PARTIAL (dead duplicate, no caller) | n/a | none | MERGE INTO NEW SYSTEM | Low |
| AMRS-022 | Verification → Submit verification request | — | — | PARTIAL | FULL (API), MISSING (UI) | PARTIAL | `tests/organizations-verificat… | KEEP + IMPROVE | High |
| AMRS-023 | Verification → One-pending-per-subject/type constraint | — | — | MISSING | FULL | NOT APPLICABLE | `tests/organizations-hardening… | KEEP | Low |
| AMRS-024 | Verification → Review (approve/reject/revoke) transactional | — | — | PARTIAL | PARTIAL (API only) | NOT APPLICABLE | `tests/organizations-verificat… | RESTORE (admin UI) + FIX REGRESSION (permission) | High |
| AMRS-025 | Verification → Self-review prevention | — | — | MISSING | FULL (two parallel impls) | NOT APPLICABLE | `tests/organizations-verificat… | MERGE INTO NEW SYSTEM (dedupe) | Med |
| AMRS-026 | Verification → Org `verified_at` sync from records | — | — | PARTIAL | FULL | PARTIAL | `tests/organizations-verificat… | KEEP | Med |
| AMRS-027 | Verification → Expiry batch job | — | — | MISSING | PARTIAL (manual POST only) | NOT APPLICABLE | `tests/organizations-workspace… | KEEP + IMPROVE (schedule it) | Med |
| AMRS-028 | Verification → Renew verification | — | — | MISSING | PARTIAL (API only) | NOT APPLICABLE | `tests/amrs/amrs4-lifecycle.te… | KEEP + IMPROVE | Med |
| AMRS-029 | Verification → Trust panel | — | — | MISSING | PARTIAL (API only, admin-gated) | NOT APPLICABLE | none | KEEP + IMPROVE (surface on profiles) | Med |
| AMRS-030 | Verification → Verification expiry defaults per type | — | — | MISSING | FULL | NOT APPLICABLE | `tests/amrs/amrs4-lifecycle.te… | KEEP | Low |
| AMRS-031 | Verification → In-memory verification event log | — | — | MISSING | PARTIAL (process-local, lost on restart; no consumer) | NOT APPLICABLE | `tests/amrs/amrs4-lifecycle.te… | KEEP + IMPROVE (persist to `audit_events`) | Med |
| AMRS-032 | Reputation → Score computation (weighted signals) | — | — | MISSING | FULL | PARTIAL | `tests/amrs/amrs5-policy.test.… | KEEP | Med |
| AMRS-033 | Reputation → Level thresholds & mapping | — | — | MISSING | FULL | PARTIAL | `tests/amrs/domain-contracts.t… | KEEP + IMPROVE | Med |
| AMRS-034 | Reputation → Per-entity-type policy engine | — | — | MISSING | FULL | NOT APPLICABLE | `tests/amrs/amrs5-policy.test.… | KEEP | Low |
| AMRS-035 | Reputation → PROMAX eligibility gate | — | — | MISSING | FULL | NOT APPLICABLE | `tests/amrs/amrs5-policy.test.… | KEEP | Low |
| AMRS-036 | Reputation → Demotion grace period | — | — | MISSING | PARTIAL (stored, never enforced on read) | NOT APPLICABLE | `tests/amrs/amrs5-policy.test.… | KEEP + IMPROVE | Med |
| AMRS-037 | Reputation → Evaluation history & audit trail | — | — | MISSING | FULL | NOT APPLICABLE | none behavioural | KEEP | Low |
| AMRS-038 | Reputation → Admin manual override | — | — | MISSING | PARTIAL (API only) | NOT APPLICABLE | none | RESTORE (admin UI) | Med |
| AMRS-039 | Reputation → Distribution stats | — | — | MISSING | PARTIAL (API only) | NOT APPLICABLE | none | RESTORE (admin UI) | Low |
| AMRS-040 | Reputation → Explainability (`explainLevel`) | — | — | MISSING | PARTIAL (dead code — no route/UI caller) | NOT APPLICABLE | `tests/amrs/amrs12-integration… | KEEP + IMPROVE | Low |
| AMRS-041 | Reputation → Auto-evaluation from real signals | — | — | MISSING | PARTIAL (manual only) | NOT APPLICABLE | none | KEEP + IMPROVE | High |
| AMRS-042 | Directory → AMRS unified directory search | — | — | MISSING | PARTIAL | PARTIAL | `tests/amrs/amrs7-directory.te… | KEEP + IMPROVE | High |
| AMRS-043 | Directory → Declared filters silently ignored | — | — | n/a | BROKEN | n/a | fixture test re-implements fil… | FIX REGRESSION | High |
| AMRS-044 | Directory → Rating / reputation / verified fields | — | — | MISSING | BROKEN (always null/false) | PARTIAL | masked by fixtures | FIX REGRESSION | High |
| AMRS-045 | Directory → Directory stats (`?stats`) | — | — | MISSING | FULL | NOT APPLICABLE | `tests/amrs/amrs7-directory.te… | KEEP | Low |
| AMRS-046 | Directory → Missing-table graceful fallback | — | — | MISSING | PARTIAL (only Land path uses it; `/api/amrs/directory` will 500) | NOT APPLICABLE | `tests/amrs/amrs7-directory.te… | KEEP + IMPROVE | Med |
| AMRS-047 | Admin → AMRS admin dashboard stats | — | — | FULL | PARTIAL (API only) | NOT APPLICABLE | `tests/auth-phase4.test.mjs:25… | RESTORE (admin UI) | High |
| AMRS-048 | Admin → Bulk organization actions | — | — | PARTIAL | PARTIAL (API only) | NOT APPLICABLE | `tests/amrs/amrs8-admin.test.t… | RESTORE (admin UI) | Med |
| AMRS-049 | Admin → Organizations-by-status queue | — | — | FULL | PARTIAL (API only) | NOT APPLICABLE | none | RESTORE | High |
| AMRS-050 | Admin → Pending verification queue | — | — | MISSING | PARTIAL (two parallel APIs, no UI) | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | High |
| AMRS-051 | Admin → AMRS admin access gate | — | — | FULL | PARTIAL (borrowed advertiser permissions; no AMRS-specific permission exists) | NOT APPLICABLE | `tests/auth-phase4.test.mjs:25` | KEEP + IMPROVE (add `organizations.*` permissions) | Med |
| AMRS-052 | Retention → Retention policy catalogue | — | — | MISSING | FULL (declarative) | NOT APPLICABLE | `tests/amrs/amrs9-retention.te… | KEEP | Low |
| AMRS-053 | Retention → Soft delete / restore organization | — | — | FULL (hard) | PARTIAL (functions exist, no route/UI caller) | NOT APPLICABLE | `tests/amrs/amrs9-retention.te… | KEEP + IMPROVE | Med |
| AMRS-054 | Retention → Hard-delete jobs | — | — | MISSING | PARTIAL (dead code) | NOT APPLICABLE | `tests/amrs/amrs9-retention.te… | KEEP + IMPROVE | Low |
| AMRS-055 | Retention → Retention status report | — | — | MISSING | PARTIAL | NOT APPLICABLE | none | KEEP + IMPROVE | Low |
| AMRS-056 | Security → AMRS rate-limit policy table | — | — | MISSING | BROKEN (policy declared, never enforced) | NOT APPLICABLE | `tests/amrs/amrs11-security.te… | FIX REGRESSION | High |
| AMRS-057 | Security → Rate limiter storage | — | — | MISSING | PARTIAL | NOT APPLICABLE | `tests/amrs/amrs11-security.te… | KEEP + IMPROVE (shared store) | High |
| AMRS-058 | Security → Input sanitisation / threat detection | — | — | MISSING | PARTIAL (no caller anywhere in `app/**`) | NOT APPLICABLE | `tests/amrs/amrs11-security.te… | KEEP + IMPROVE | Med |
| AMRS-059 | Security → AMRS audit log | — | — | FULL (persisted + queryable) | REGRESSION | NOT APPLICABLE | `tests/amrs/amrs11-security.te… | MERGE INTO NEW SYSTEM (drop in-memory, use `audit_events`) | Med |
| AMRS-060 | Events → Domain event bus | — | — | MISSING | PARTIAL (dead code) | NOT APPLICABLE | test-only | KEEP + IMPROVE (wire to routes) or BLOCKED pending realtime decision | Med |
| AMRS-061 | Events → Event contracts | — | — | MISSING | FULL (types) | NOT APPLICABLE | `tests/amrs/amrs10-integration… | KEEP | Low |
| AMRS-062 | Profile strength → Weighted profile completeness | — | — | MISSING | PARTIAL (dead code) | NOT APPLICABLE | `tests/amrs/amrs6-profiles.tes… | KEEP + IMPROVE | Med |
| AMRS-063 | Profile strength → Second parallel implementation | — | — | n/a | PARTIAL (duplicate, contradictory) | n/a | `tests/amrs/domain-contracts.t… | MERGE INTO NEW SYSTEM | Med |
| AMRS-064 | Activity → Activity level evaluation | — | — | MISSING | PARTIAL (dead code) | PARTIAL | `tests/amrs/domain-contracts.t… | KEEP + IMPROVE | Med |
| AMRS-065 | Availability → Availability state model | — | — | MISSING | MISSING (contract only) | PARTIAL | none | RESTORE/BUILD | Med |
| AMRS-066 | DB → AMRS PG schema bootstrap | — | — | SUPERSEDED | FULL | PARTIAL | `tests/amrs/db-schema.test.ts:… | KEEP | Med |
| AMRS-067 | DB → Hardening indexes F1 | — | — | MISSING | FULL | NOT APPLICABLE | `tests/organizations-hardening… | KEEP | Low |
| AMRS-068 | Test → AMRS test suite execution | — | — | n/a | BROKEN (none listed in `package.json:13` `npm test`) | n/a | not executed | FIX REGRESSION | High |
| SURV-001 | Surveyor discovery → Geo distance (haversine) | — | — | MISSING | FULL | PARTIAL | `tests/land/land-flow.test.ts` | KEEP | Low |
| SURV-002 | Surveyor discovery → Radius filter | — | — | MISSING | PARTIAL (no-location candidates bypass the radius) | NOT APPLICABLE | `tests/land/amrs-directory.tes… | KEEP + IMPROVE | Med |
| SURV-003 | Surveyor discovery → Candidate location never populated | — | — | MISSING | BROKEN (distance never computed, `sortBy=distance` is a no-op) | PARTIAL | fixtures supply locations | FIX REGRESSION | High |
| SURV-004 | Surveyor discovery → Verified-only default filter | — | — | MISSING | BROKEN — combined with AMRS-044 (`isVerified` hard-coded `false`) `/api/land/discover-surveyors` returns **zero candidates for every request** | PARTIAL | `tests/land/amrs-directory.tes… | FIX REGRESSION | High |
| SURV-005 | Surveyor discovery → Role / profession filter | — | — | MISSING | BROKEN (only orgs whose *name* contains "surveyor" — no category/profession model; Arabic names never match) | FULL | fixture-based | FIX REGRESSION | High |
| SURV-006 | Surveyor discovery → Reputation ranking & sorting | — | — | MISSING | PARTIAL (inputs always null — see AMRS-044) | PARTIAL | `tests/land/amrs-directory.tes… | FIX REGRESSION | High |
| SURV-007 | Surveyor discovery → Availability filter | — | — | MISSING | PARTIAL (filter is a no-op) | PARTIAL | fixture | KEEP + IMPROVE | Med |
| SURV-008 | Surveyor discovery → Nearby-surveyors public endpoint | — | — | MISSING | PARTIAL (returns empty — SURV-004) | NOT APPLICABLE | none | FIX REGRESSION | High |
| SURV-009 | Surveyor discovery → Per-land surveyor endpoint | — | — | MISSING | BROKEN (caller-supplied pool; no server data source; no auth; unbounded JSON in query string) | NOT APPLICABLE | `tests/land/land-flow.test.ts` | FIX REGRESSION | High |
| SURV-010 | Survey request / RFQ → Create quote request | — | — | MISSING | BROKEN (see SURV-011/012) | FULL | `tests/land/land-flow.test.ts` | FIX REGRESSION | High |
| SURV-011 | Survey request / RFQ → Quote persistence | — | — | MISSING | BROKEN (lost on restart, not shared across instances, invisible to the surveyor) | FULL | `tests/land/land-flow.test.ts` | RESTORE/BUILD (persist to PG) | High |
| SURV-012 | Survey request / RFQ → Requester identity / authorization | — | — | MISSING | BROKEN (unauthenticated, spoofable, no rate limit) | n/a | none | FIX REGRESSION | High |
| SURV-013 | Survey request / RFQ → Service catalogue | — | — | MISSING | FULL | PARTIAL | `tests/land/land-flow.test.ts` | KEEP + IMPROVE (expose picker) | Low |
| SURV-014 | Survey request / RFQ → Provider response (accept/decline) | — | — | MISSING | MISSING | FULL | `tests/land/land-flow.test.ts` | RESTORE/BUILD | High |
| SURV-015 | Survey request / RFQ → Surveyor inbox / my-quotes | — | — | MISSING | MISSING | FULL | `tests/land/land-flow.test.ts` | RESTORE/BUILD | High |
| SURV-016 | Survey request / RFQ → Notification to surveyor on new RFQ | — | — | MISSING | MISSING | FULL | none | RESTORE/BUILD | High |
| SURV-017 | Survey request / RFQ → Messaging thread between requester and surv… | — | — | PARTIAL | MISSING | PARTIAL | none | MERGE INTO NEW SYSTEM (unified messaging) | High |
| SURV-018 | Survey request / RFQ → Acceptance → job → completion lifecycle | — | — | MISSING | MISSING | FULL | none | RESTORE/BUILD | High |
| SURV-019 | Land↔AMRS integration → Land flow orchestration | — | — | MISSING | PARTIAL (surveyor pool must be passed in by the caller) | n/a | `tests/land/land-flow.test.ts` | KEEP + IMPROVE | Med |
| SURV-020 | Land↔AMRS integration → AMRS directory as surveyor source | — | — | MISSING | PARTIAL (wired but yields nothing — SURV-004/005) | NOT APPLICABLE | `tests/land/amrs-directory.tes… | FIX REGRESSION | High |
| ORG-001 | Public org directory → `/organizations` listing page | — | — | MISSING | BROKEN (country casing — AMRS-008) | NOT APPLICABLE | none | FIX REGRESSION | High |
| ORG-002 | Public org directory → `/organizations/[id]` profile page | — | — | MISSING | PARTIAL (no logo/cover, no branches, no verification badges, no services) | NOT APPLICABLE | none | KEEP + IMPROVE | Med |
| ORG-003 | Public org directory → Orphaned duplicate org pages | — | — | n/a | PARTIAL (dead duplicate) | n/a | none | MERGE INTO NEW SYSTEM | Med |
| ORG-004 | Combined directory → `/directory` providers+organizations tabs | — | — | MISSING | PARTIAL (organizations tab always empty — AMRS-008) | PARTIAL | none | FIX REGRESSION | High |
| ORG-005 | Org creation UX → Create an office/company from onboarding | — | — | PARTIAL (admin-only creation) | MISSING (no self-serve org creation anywhere) | n/a | none | RESTORE | High |
| ORG-006 | Org creation UX → "Add company/office" CTA | — | — | n/a | BROKEN (dead-end CTA) | n/a | none | FIX REGRESSION | High |
| ORG-007 | Org taxonomy → Company specialty taxonomy CRUD | — | — | FULL | FULL | FULL | none | KEEP | Low |
| ORG-008 | Org taxonomy → Assign specialties to an organization | — | — | MISSING | MISSING (table only) | PARTIAL | none | RESTORE/BUILD | Med |
| ORG-009 | Org workspace → Workspace resolution by membership | — | — | MISSING | FULL | PARTIAL | `tests/organizations-workspace… | KEEP | Low |
| ORG-010 | Org workspace → Office↔company type split | — | — | `Settings.OfficeName` | none | MISSING | n/a | n/a | P2 |
| ORG-011 | Org workspace → "My organizations" (`?mine=1`) | — | — | PARTIAL | FULL | NOT APPLICABLE | `scripts/organizations-f3-prod… | KEEP | Low |
| ORG-012 | Org profile edit → Workspace profile GET/PATCH | — | — | FULL | PARTIAL | FULL | `tests/organizations-workspace… | KEEP + IMPROVE | Med |
| ORG-013 | Org profile edit → Second, weaker profile-edit path | — | — | FULL | REGRESSION (authz weaker than the sibling path) | n/a | none | MERGE INTO NEW SYSTEM + FIX REGRESSION | High |
| ORG-014 | Org profile edit → Business identity fields | — | — | FULL | MISSING | FULL | none | RESTORE | Med |
| ORG-015 | Org profile edit → Social links (WhatsApp/Facebook/Instagram/X) | — | — | PARTIAL | MISSING | FULL | none | RESTORE | Low |
| ORG-016 | Org portfolio → Office/company portfolio | — | — | PARTIAL | BROKEN (STUB) | PARTIAL | none | RESTORE/BUILD | High |
| ORG-017 | Org portfolio → Portfolio membership scoping bug | — | — | n/a | BROKEN | n/a | none | FIX REGRESSION | Med |
| ORG-018 | Org reviews/ratings → Organization reviews & rating aggregate | — | — | MISSING | MISSING | MISSING | none | RESTORE/BUILD | High |
| ORG-019 | Org rank badge → Rank chip on cards | — | — | MISSING | BROKEN (always NEW) | PARTIAL | none | FIX REGRESSION | Med |
| ORG-020 | Org contact/messaging → "Message" / "Request service" buttons | — | — | PARTIAL | BROKEN (decorative) | FULL | none | RESTORE/BUILD | High |
| ORG-021 | Org favorites → Save/favourite an office or company | — | — | MISSING | MISSING | MISSING | none | RESTORE/BUILD | Low |
| ORG-022 | Org analytics → Per-organization analytics | — | — | FULL | MISSING | FULL | none | RESTORE | Med |
| ORG-023 | Sponsor→advertiser parity → Profile / users / branches / access | — | — | FULL | SUPERSEDED WITH FULL PARITY | n/a | none | SUPERSEDED WITH FULL PARITY | Low |
| ORG-024 | Sponsor→advertiser parity → Contracts | — | — | FULL | MISSING | FULL | none | RESTORE | High |
| ORG-025 | Sponsor→advertiser parity → Documents | — | — | FULL | MISSING | FULL | none | RESTORE | High |
| ORG-026 | Sponsor→advertiser parity → Plans | — | — | FULL | MISSING | PARTIAL | none | RESTORE | High |
| ORG-027 | Sponsor→advertiser parity → Subscriptions | — | — | FULL | MISSING | MISSING | none | RESTORE | High |
| ORG-028 | Sponsor→advertiser parity → Invoices | — | — | FULL | MISSING | FULL | none | RESTORE | High |
| ORG-029 | Sponsor→advertiser parity → Payments | — | — | FULL | MISSING | FULL | none | RESTORE | High |
| ORG-030 | Sponsor→advertiser parity → Activity log | — | — | FULL | REGRESSION | FULL | none | RESTORE | Med |
| OFFICE-ORG-001 | Offices → Public office directory API | — | — | PARTIAL (broken `[id]`) | BETTER THAN OLD (adds city filter, ilike bilingual search, true count) | PARTIAL | none | KEEP | Low |
| OFFICE-ORG-002 | Offices → Office detail API | — | — | BROKEN | BETTER THAN OLD | PARTIAL | none | KEEP | Low |
| OFFICE-ORG-003 | Offices → Office detail page content | — | — | MISSING | PARTIAL (branches + member count returned by the API are never rendered; hard-coded "السعودية/الرياض" ad targeting `:28`) | FULL | none | KEEP + IMPROVE | Med |
| OFFICE-ORG-004 | Offices → Office workspace dashboard | — | — | MISSING | FULL | FULL | `tests/organizations-workspace… | KEEP | Low |
| OFFICE-ORG-005 | Offices → Office members tab | — | — | PARTIAL | PARTIAL (read-only — no add/remove/role-change UI although the API supports it, AMRS-014/015/016) | FULL | none | KEEP + IMPROVE | High |
| OFFICE-ORG-006 | Offices → Office properties tab | — | — | MISSING | FULL | FULL | none | KEEP | Low |
| OFFICE-ORG-007 | Offices → Office property-request offers tab | — | — | OLD SOURCE REQUIRED | FULL | FULL | none | KEEP | Low |
| OFFICE-ORG-008 | Offices → Office leads inbox | — | — | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| OFFICE-ORG-009 | Offices → Co-broking between offices | — | — | MISSING | MISSING | FULL | none | NEW IMPROVEMENT (desktop parity) | Med |
| OFFICE-ORG-010 | Offices → Agent commission split | — | — | MISSING | MISSING | FULL | none | NEW IMPROVEMENT (desktop parity) | Low |
| COMP-001 | Companies → Public company directory API | — | — | none | PARTIAL | BETTER THAN OLD | none | none | Phase 1 |
| COMP-002 | Companies → Company detail API | — | — | PARTIAL | BETTER THAN OLD | NOT APPLICABLE | none | KEEP | Low |
| COMP-003 | Companies → Company detail page content | — | — | MISSING | PARTIAL (branches/member count ignored; hard-coded ad geo `:28`) | NOT APPLICABLE | none | KEEP + IMPROVE | Med |
| COMP-004 | Companies → Company workspace dashboard | — | — | MISSING | FULL | NOT APPLICABLE | `tests/organizations-workspace… | KEEP | Low |
| COMP-005 | Companies → Company members tab | — | — | PARTIAL | PARTIAL (read-only) | NOT APPLICABLE | none | KEEP + IMPROVE | High |
| COMP-006 | Companies → Company services tab | — | — | MISSING | PARTIAL (joins members' *personal* provider profiles; no org-owned service listing) | NOT APPLICABLE | none | KEEP + IMPROVE | Med |
| COMP-007 | Companies → Company branches tab | — | — | FULL | FULL | PARTIAL | `tests/organizations-workspace… | KEEP | Low |
| COMP-008 | Companies → Company admin management | — | — | FULL | MISSING | NOT APPLICABLE | none | RESTORE | High |
| PRO-001 | Professionals → Professionals list API | — | — | FULL | MISSING (404) | FULL | none | RESTORE | High |
| PRO-002 | Professionals → Documented-but-missing endpoint | — | — | FULL | BROKEN | n/a | none | FIX REGRESSION | Med |
| PRO-003 | Professionals → Professional profile API | — | — | PARTIAL | BETTER THAN OLD | PARTIAL | none | KEEP | Med |
| PRO-004 | Professionals → Professional portfolio | — | — | MISSING | FULL (read); no write path in this domain | PARTIAL | none | KEEP | Low |
| PRO-005 | Professionals → Professional reviews & sub-ratings | — | — | MISSING | FULL (read) | MISSING | none | KEEP | Low |
| PRO-006 | Professionals → Professional verification badge | — | — | MISSING | PARTIAL (derived, not tied to AMRS `verification_records` — `app/api/amrs/verification/route.ts:12` excludes `professional` entity type entirely) | FULL | none | MERGE INTO NEW SYSTEM | High |
| PRO-007 | Professionals → Professional directory page | — | — | MISSING | PARTIAL (country-locked, client-side filtering, no paging) | FULL | none | KEEP + IMPROVE | Med |
| PRO-008 | Professionals → Professional card component | — | — | FULL | PARTIAL (orphaned) | n/a | none | MERGE INTO NEW SYSTEM | Low |
| PRO-009 | Professionals → Professional application/registration | — | — | MISSING | PARTIAL | n/a | none | KEEP + IMPROVE | Med |
| PRO-010 | Professionals → Professional admin screen | — | — | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE (OLD SOURCE REQUIRED for exact old UI) | High |
| PRO-011 | Professionals → Professional workspace dashboard | — | — | MISSING | MISSING | PARTIAL | none | RESTORE/BUILD | Med |
| PRO-012 | Professionals → Professional in AMRS verification scope | — | — | MISSING | PARTIAL (backend supports it, API blocks it) | FULL | `tests/amrs/amrs4-lifecycle.te… | KEEP + IMPROVE | Med |

## Services Marketplace (I)
*ROUND-1 (V2 lineage)*

| ID | Feature | V1 depth | V1 | Old V2 | Current V2 | Desktop | Tests | Decision | Risk |
|---|---|---|---|---|---|---|---|---|---|
| SVC-001 | Categories → Create (minimal) | — | — | FULL | FULL (duplicate of SVC-002) | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| SVC-002 | Categories → Create (full/i18n) | — | — | MISSING | FULL | NOT APPLICABLE | `tests/services-api.test.mjs:1… | NEW IMPROVEMENT | Med |
| SVC-003 | Categories → Update | — | — | MISSING | FULL | NOT APPLICABLE | `tests/services-api.test.mjs:1… | NEW IMPROVEMENT | Low |
| SVC-004 | Categories → Delete with guards | — | — | MISSING | FULL | NOT APPLICABLE | `tests/services-api.test.mjs:1… | NEW IMPROVEMENT | Low |
| SVC-005 | Categories → Subcategories / parent tree | — | — | PARTIAL | FULL | NOT APPLICABLE | `tests/services-marketplace.te… | KEEP + IMPROVE | Low |
| SVC-006 | Categories → Category counters | — | — | MISSING | FULL | NOT APPLICABLE | none | NEW IMPROVEMENT | Low |
| SVC-007 | Categories → Booking mode (instant/quotes/both) | — | — | MISSING | PARTIAL — stored & used only to set `pricing_type`; no instant-booking flow exists | NOT APPLICABLE | none | KEEP + IMPROVE | Med |
| SVC-008 | Categories → Dynamic question definitions | — | — | MISSING | PARTIAL — API/DB support full, admin authoring UI missing | NOT APPLICABLE | none | KEEP + IMPROVE | Med |
| SVC-010 | Provider → Profile create/upsert | — | — | MISSING | FULL | PARTIAL (flat technician directory only) | `tests/services-marketplace.te… | NEW IMPROVEMENT | Med |
| SVC-011 | Provider → Application submit | — | — | MISSING | FULL | NOT APPLICABLE | `tests/services-marketplace.te… | NEW IMPROVEMENT | Med |
| SVC-012 | Provider → Approval / rejection | — | — | MISSING | FULL | NOT APPLICABLE | `tests/services-api.test.mjs:8… | NEW IMPROVEMENT | Low |
| SVC-013 | Provider → Status lifecycle | — | — | MISSING | PARTIAL — `setProviderStatus` performs **no transition validation**; `canTransitionProvider` (`state-machine.ts:200-204`) has zero importers | NOT APPLICABLE | `tests/services-marketplace.te… | FIX REGRESSION | Med |
| SVC-014 | Provider → Under-review state | — | — | MISSING | PARTIAL | NOT APPLICABLE | none | KEEP | Low |
| SVC-015 | Provider → Provider categories + pricing | — | — | MISSING | FULL | PARTIAL | `tests/services-marketplace.te… | NEW IMPROVEMENT | Med |
| SVC-016 | Provider → Documents upload | — | — | MISSING | PARTIAL — upload+list only, no delete/replace | NOT APPLICABLE | none | KEEP + IMPROVE | Med |
| SVC-017 | Provider → Document verification | — | — | MISSING | MISSING (dead code) | NOT APPLICABLE | none | RESTORE | High |
| SVC-018 | Provider → Portfolio items | — | — | MISSING | PARTIAL — POST additionally requires `SERVICE_PROVIDERS_MANAGE` (`portfolio/route.ts:27`) which an un-approved applicant never holds, so a pending provider cannot add portfolio items | NOT APPLICABLE | none | FIX REGRESSION | Med |
| SVC-019 | Provider → Public provider directory | — | — | MISSING | FULL | NOT APPLICABLE | `tests/services-marketplace.te… | NEW IMPROVEMENT | Low |
| SVC-020 | Provider → Public provider profile page | — | — | MISSING | PARTIAL — page fetches `/api/professionals/{id}` (a different domain) not `/api/service-providers/{id}` | NOT APPLICABLE | `tests/services-marketplace.te… | KEEP + IMPROVE | Med |
| SVC-021 | Provider → Featured / rank / accepting-requests flags | — | — | MISSING | PARTIAL — `is_accepting_requests` is **never read by matching**; `findCandidateProviders` (`cur/lib/services/matching.ts:8-11`) filters only on status+country | NOT APPLICABLE | none | FIX REGRESSION | Med |
| SVC-022 | Provider → Service radius | — | — | MISSING | PARTIAL — stored default (50) contradicts enforced cap (10) | NOT APPLICABLE | `tests/services-matching.test.… | OLD SOURCE REQUIRED (product decision) | High |
| SVC-023 | Provider → Provider "me" endpoint | — | — | MISSING | FULL | NOT APPLICABLE | `tests/services-marketplace.te… | NEW IMPROVEMENT | Low |
| SVC-024 | Provider → Provider capability → RBAC | — | — | MISSING | FULL | NOT APPLICABLE | `tests/services-api.test.mjs:2… | NEW IMPROVEMENT | Med |
| SVC-025 | Provider → Verification policy catalogue | — | — | MISSING | STUB (dead) | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| SVC-030 | Listings → Provider service listings CRUD | — | — | FULL | PARTIAL — API live but **no UI anywhere** consumes `/api/services/listings` (grep over `app/`+`src/` finds no caller) | NOT APPLICABLE | `tests/services-listings-route… | RESTORE (needs UI) | High |
| SVC-031 | Listings → Listing status transitions | — | — | FULL | FULL | NOT APPLICABLE | `tests/services-listings-route… | KEEP | Med |
| SVC-032 | Listings → Listing search + geo radius filter | — | — | FULL | FULL | NOT APPLICABLE | `tests/services-listings-route… | KEEP | Med |
| SVC-033 | Listings → Listing bookmarks / favourites | — | — | PARTIAL (table only) | BROKEN — UI wired to a 404 endpoint | NOT APPLICABLE | none | RESTORE | High |
| SVC-035 | Requests → Request create (minimal legacy) | — | — | FULL | SUPERSEDED WITH FULL PARITY (by SVC-036) | PARTIAL | none | MERGE INTO NEW SYSTEM | Med |
| SVC-036 | Requests → Request create (full) | — | — | MISSING | FULL | PARTIAL | `tests/services-marketplace.te… | NEW IMPROVEMENT | High |
| SVC-037 | Requests → Human reference number | — | — | MISSING | PARTIAL — sequence derived from `COUNT(*)`, races/collides after deletions | NOT APPLICABLE | none | KEEP + IMPROVE | Med |
| SVC-038 | Requests → 8-step request wizard | — | — | PARTIAL (1 step) | FULL (8 steps) | NOT APPLICABLE | `docs/services/SERVICES_ROUTES… | NEW IMPROVEMENT | Med |
| SVC-039 | Requests → Wizard per-step validation | — | — | MISSING | FULL | NOT APPLICABLE | none | NEW IMPROVEMENT | Low |
| SVC-040 | Requests → Draft save | — | — | MISSING | PARTIAL — client-only draft, lost on device change; no cross-device resume | NOT APPLICABLE | none | KEEP + IMPROVE | Med |
| SVC-041 | Requests → Draft resume | — | — | MISSING | PARTIAL (client-only, see SVC-040) | NOT APPLICABLE | none | KEEP + IMPROVE | Med |
| SVC-042 | Requests → Dynamic questions rendering | — | — | MISSING | FULL | NOT APPLICABLE | none | NEW IMPROVEMENT | Med |
| SVC-043 | Requests → Answers persistence | — | — | MISSING | PARTIAL — a normalised `service_request_answers` table exists (`lib/services-marketplace-schema.ts:180`) but is **never written**; answers live only in the JSON column | NOT APPLICABLE | `tests/services-marketplace.te… | KEEP + IMPROVE | Med |
| SVC-044 | Requests → Attachments | — | — | MISSING | PARTIAL — accepts a URL string only; no upload pipeline in the wizard (`new/page.tsx:176-182` adds a pasted URL) | NOT APPLICABLE | none | KEEP + IMPROVE | Med |
| SVC-045 | Requests → Publish | — | — | MISSING | FULL | NOT APPLICABLE | `tests/services-marketplace.te… | NEW IMPROVEMENT | Med |
| SVC-046 | Requests → Cancel | — | — | FULL | BETTER THAN OLD | NOT APPLICABLE | none | KEEP + IMPROVE | Low |
| SVC-047 | Requests → Status history | — | — | MISSING | PARTIAL — **the history route has NO authentication or authorization at all** (`history/route.ts:10-17`), so anyone can read any request's history incl. `changed_by` user ids | PARTIAL | none | FIX REGRESSION | High |
| SVC-048 | Requests → Request state machine | — | — | PARTIAL | PARTIAL — two competing definitions; `canTransitionRequest` is exported twice (`constants.ts:81`, `state-machine.ts:182`) and neither is called by `publishRequest`/`cancelRequestFull` | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | High |
| SVC-049 | Requests → PENDING_REVIEW / admin moderation of requests | — | — | MISSING | MISSING (INTENDED ONLY) | NOT APPLICABLE | none | OLD SOURCE REQUIRED (product decision) | Med |
| SVC-050 | Requests → Auto-expiry of stale requests | — | — | MISSING | MISSING (dead code) | NOT APPLICABLE | none | RESTORE | Med |
| SVC-051 | Requests → Public request feed + filters | — | — | FULL | BETTER THAN OLD — adds urgency filter and PII stripping (`route.ts:53-59`) | NOT APPLICABLE | none | KEEP + IMPROVE | Low |
| SVC-052 | Requests → Request detail authorization | — | — | BROKEN (old leaked everything) | FULL | NOT APPLICABLE | `tests/services-marketplace.te… | KEEP + IMPROVE | Low |
| SVC-053 | Requests → Request edit | — | — | MISSING | PARTIAL — no UI surfaces PATCH; editing a published request does **not** re-run matching | NOT APPLICABLE | none | KEEP + IMPROVE | Med |
| SVC-055 | Matching → Matching engine run | — | — | MISSING | FULL | PARTIAL (analogous concept) | `tests/services-matching.test.… | NEW IMPROVEMENT | Med |
| SVC-056 | Matching → 10 km hard radius cap | — | — | MISSING | FULL — **but it is a new hard narrowing vs the backup snapshot** | NOT APPLICABLE | `tests/services-matching.test.… | OLD SOURCE REQUIRED (product decision) | High |
| SVC-057 | Matching → Same-city hard gate | — | — | MISSING | FULL (new restriction) | NOT APPLICABLE | `tests/services-matching.test.… | OLD SOURCE REQUIRED (product decision) | High |
| SVC-058 | Matching → Distance score | — | — | MISSING | BETTER THAN OLD | PARTIAL | `tests/services-matching.test.… | KEEP | Low |
| SVC-059 | Matching → Urgency weighting | — | — | MISSING | FULL | NOT APPLICABLE | `tests/services-matching.test.… | NEW IMPROVEMENT | Low |
| SVC-060 | Matching → Budget-fit weighting | — | — | MISSING | PARTIAL — when the provider has no price range but the request has a budget, `budgetFit` is set true unconditionally (`:145-147`) | NOT APPLICABLE | `tests/services-matching.test.… | KEEP + IMPROVE | Low |
| SVC-061 | Matching → Rating weighting | — | — | MISSING | FULL | NOT APPLICABLE | `tests/services-matching.test.… | NEW IMPROVEMENT | Low |
| SVC-062 | Matching → Response-rate + completion weighting | — | — | MISSING | PARTIAL — `response_rate`/`completion_rate`/`avg_response_time_min` are **never computed**; no code updates them, so the bonus is always 0 in practice | NOT APPLICABLE | `tests/services-matching.test.… | RESTORE | Med |
| SVC-063 | Matching → Match score composition + reasons | — | — | MISSING | PARTIAL — `reasons[]` is computed but **never persisted** (`matching.ts:83-87` stores only score/distance/bonuses) and never shown | PARTIAL | `tests/services-matching.test.… | KEEP + IMPROVE | Low |
| SVC-064 | Matching → Matched-requests for provider | — | — | MISSING | FULL | NOT APPLICABLE | `tests/services-marketplace.te… | NEW IMPROVEMENT | Med |
| SVC-065 | Matching → Mark contacted / provider ignore | — | — | MISSING | PARTIAL — route requires the **customer** (`:21-22`) yet `providerIgnoreMatch` is a provider action; a provider can never call it | NOT APPLICABLE | none | FIX REGRESSION | Med |
| SVC-066 | Matching → Alternate Drizzle matcher | — | — | MISSING | STUB (dead + unrunnable) | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| SVC-068 | Offers → Offer create (minimal legacy) | — | — | FULL | SUPERSEDED WITH FULL PARITY | PARTIAL | none | MERGE INTO NEW SYSTEM | Low |
| SVC-069 | Offers → Offer create (full) | — | — | MISSING | FULL | PARTIAL | `tests/services-marketplace.te… | NEW IMPROVEMENT | Med |
| SVC-070 | Offers → Duplicate-offer guard | — | — | FULL | BETTER THAN OLD | NOT APPLICABLE | none | KEEP | Low |
| SVC-071 | Offers → Self-offer prevention | — | — | MISSING | FULL | NOT APPLICABLE | none | NEW IMPROVEMENT | Low |
| SVC-072 | Offers → Offer eligibility re-check | — | — | MISSING | FULL — but inherits the 10 km cap, so an out-of-radius provider cannot bid even if invited | NOT APPLICABLE | none | KEEP + IMPROVE | Med |
| SVC-073 | Offers → Offer revision history | — | — | MISSING | PARTIAL — status is never set to `revised` (`OFFER_STATUS` has no such value, `constants.ts:86-91`) although `state-machine.ts:71` maps one | NOT APPLICABLE | none | KEEP + IMPROVE | Med |
| SVC-074 | Offers → Offer withdraw | — | — | MISSING | PARTIAL — no notification to customer; withdrawal silently removes the offer from `listOffersForRequest` (`:1214`) | NOT APPLICABLE | none | KEEP + IMPROVE | Low |
| SVC-075 | Offers → Offer decline | — | — | MISSING | PARTIAL — **no notification to the provider** | NOT APPLICABLE | none | KEEP + IMPROVE | Med |
| SVC-076 | Offers → Offer accept → order | — | — | PARTIAL | FULL | PARTIAL | `tests/services-marketplace.te… | KEEP + IMPROVE | Med |
| SVC-077 | Offers → Offer expiry | — | — | MISSING | PARTIAL — checked only at accept time; expired offers are never swept to an `expired` status and still appear in lists | NOT APPLICABLE | none | KEEP + IMPROVE | Low |
| SVC-078 | Offers → Offer visibility | — | — | BROKEN | FULL | NOT APPLICABLE | `tests/services-marketplace.te… | KEEP + IMPROVE | Low |
| SVC-080 | Orders → Order/job creation | — | — | FULL | FULL | PARTIAL | `tests/services-marketplace.te… | KEEP + IMPROVE | Med |
| SVC-081 | Orders → Order status transitions | — | — | FULL | BETTER THAN OLD | PARTIAL | `tests/services-marketplace.te… | KEEP + IMPROVE | Med |
| SVC-082 | Orders → Legacy order status endpoint | — | — | FULL | **REGRESSION — 404 on every call** | NOT APPLICABLE | none | FIX REGRESSION | High |
| SVC-083 | Orders → Job timeline | — | — | MISSING | FULL | PARTIAL | none | NEW IMPROVEMENT | Low |
| SVC-084 | Orders → Job detail with participant scoping | — | — | MISSING | FULL | NOT APPLICABLE | `tests/services-marketplace.te… | NEW IMPROVEMENT | Low |
| SVC-085 | Orders → Jobs list by role | — | — | MISSING | FULL | NOT APPLICABLE | none | NEW IMPROVEMENT | Low |
| SVC-086 | Orders → Order completion side-effects | — | — | MISSING | PARTIAL — `jobs_completed` is only incremented when the **provider** performs the transition (`:1442`); a customer-confirmed completion silently skips it | NOT APPLICABLE | none | FIX REGRESSION | Med |
| SVC-087 | Orders → Order scheduling fields | — | — | MISSING | BROKEN — `getAdminMarketplaceSnapshot` will raise "no such column"; `/api/service-admin` returns 500 and the whole admin console fails to load | PARTIAL | none | FIX REGRESSION | High |
| SVC-088 | Orders → Outbox / integration events | — | — | MISSING | PARTIAL — `processOutbox` only flips rows to `processed`; it dispatches nothing, and nothing calls it (no cron/route) | PARTIAL | none | KEEP + IMPROVE | Med |
| SVC-090 | Reviews → Review create (minimal) | — | — | FULL | SUPERSEDED WITH FULL PARITY | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| SVC-091 | Reviews → Review create (full) | — | — | MISSING | FULL — adds order-completed gate `:1534`, reviewee validation `:1540-1543`, one-per-reviewer `:1545-1549` | NOT APPLICABLE | `tests/services-marketplace.te… | NEW IMPROVEMENT | Med |
| SVC-092 | Reviews → Legacy review endpoint | — | — | FULL | **REGRESSION — 404** | NOT APPLICABLE | none | FIX REGRESSION | High |
| SVC-093 | Reviews → Rating aggregation | — | — | PARTIAL | FULL | MISSING | `tests/services-api.test.mjs` | KEEP + IMPROVE | Low |
| SVC-094 | Reviews → Review moderation (hide/show) | — | — | MISSING | PARTIAL — no standalone endpoint or admin UI | NOT APPLICABLE | none | KEEP + IMPROVE | Low |
| SVC-095 | Reviews → Review listing endpoint | — | — | FULL | PARTIAL — **unauthenticated**, and `reviewerUserId` allows enumerating an arbitrary user's authored reviews; the old aggregate `{count,avg}` envelope was dropped | NOT APPLICABLE | none | FIX REGRESSION | Med |
| SVC-097 | Disputes → Open dispute | — | — | FULL | **REGRESSION — end-to-end broken (404)** | NOT APPLICABLE | none | FIX REGRESSION | High |
| SVC-098 | Disputes → Resolve dispute | — | — | FULL | **REGRESSION** | NOT APPLICABLE | none | FIX REGRESSION | High |
| SVC-099 | Disputes → Dispute list | — | — | FULL | REGRESSION | NOT APPLICABLE | none | FIX REGRESSION | High |
| SVC-100 | Reports → Report an entity | — | — | MISSING | PARTIAL — API exists, but **no UI anywhere calls POST /api/service-reports** (no report button on any page) | NOT APPLICABLE | `tests/services-api.test.mjs:1… | RESTORE (needs UI) | Med |
| SVC-101 | Reports → Duplicate-report guard | — | — | MISSING | FULL | NOT APPLICABLE | `tests/services-api.test.mjs:1… | NEW IMPROVEMENT | Low |
| SVC-102 | Reports → Report resolution + action | — | — | MISSING | FULL | NOT APPLICABLE | `tests/services-api.test.mjs:1… | KEEP + IMPROVE | Low |
| SVC-103 | Reports → Moderation actions | — | — | MISSING | PARTIAL — no action for `offer` or `order` targets although both are valid report targets (`:1650`) | NOT APPLICABLE | none | KEEP + IMPROVE | Low |
| SVC-104 | Reports → Report status states | — | — | MISSING | PARTIAL — `in_review` can never be set (no transition endpoint) | NOT APPLICABLE | none | KEEP + IMPROVE | Low |
| SVC-106 | Notifications → In-app notification write | — | — | MISSING | FULL | PARTIAL | `tests/services-api.test.mjs:2… | NEW IMPROVEMENT | Low |
| SVC-107 | Notifications → List + unread count | — | — | MISSING | FULL | NOT APPLICABLE | `tests/services-api.test.mjs:2… | KEEP + IMPROVE | Low |
| SVC-108 | Notifications → Mark read / read-all | — | — | MISSING | FULL | NOT APPLICABLE | `tests/services-api.test.mjs:2… | NEW IMPROVEMENT | Low |
| SVC-109 | Notifications → Deep-link targets | — | — | MISSING | PARTIAL — two divergent link maps; `matching.ts:102` links providers to `/dashboard/services/requests/{id}` which is **not a route** | NOT APPLICABLE | none | FIX REGRESSION | Med |
| SVC-110 | Notifications → Email / push channel | — | — | MISSING | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| SVC-112 | Messaging → Shared 7-context messaging core | — | — | PARTIAL | FULL (breadth) | NOT APPLICABLE | `tests/messages-contract.test.… | KEEP + IMPROVE | High |
| SVC-113 | Messaging → Request-thread participant check | — | — | BROKEN | **REGRESSION/SECURITY — cross-provider leak** (independently confirmed at `docs/release/PHASE-0-BASELINE.md:479` B5, N8, P0-2) | NOT APPLICABLE | none | FIX REGRESSION | High |
| SVC-114 | Messaging → Order-thread participant check | — | — | FULL | FULL | NOT APPLICABLE | `tests/services-marketplace.te… | KEEP | Low |
| SVC-115 | Messaging → Start / attach thread | — | — | MISSING | BROKEN/SECURITY — **no ownership check on `threadId`, and arbitrary `participantIds` accepted**, so any authenticated user self-enrols into any property/general/organization/professional thread (`PHASE-0-BASELINE.md:480` N9) | NOT APPLICABLE | none | FIX REGRESSION | High |
| SVC-116 | Messaging → Notification recipient resolution | — | — | MISSING | PARTIAL — for `request` threads it **always returns the customer** (`:1967-1970`), so a customer messaging providers notifies themselves and no provider is ever told | NOT APPLICABLE | none | FIX REGRESSION | High |
| SVC-117 | Messaging → Central inbox | — | — | MISSING | PARTIAL — O(threads×messages) full scan per request; hides threads with zero messages (`:2051`) | NOT APPLICABLE | none | KEEP + IMPROVE | Med |
| SVC-118 | Messaging → Mark thread read | — | — | MISSING | PARTIAL — on a `request` thread it clears unread across **all** other senders including rival providers (`PHASE-0-BASELINE.md:479`) | NOT APPLICABLE | none | FIX REGRESSION | Med |
| SVC-119 | Messaging → Legacy messages proxy | — | — | FULL | PARTIAL — proxy works but re-issues the request over `fetch` forwarding raw headers (`PHASE-0-BASELINE.md:475` Family C) | NOT APPLICABLE | `tests/messages-contract.test.… | MERGE INTO NEW SYSTEM | Med |
| SVC-120 | Messaging → StartThreadButton redirect | — | — | MISSING | BROKEN | NOT APPLICABLE | none | FIX REGRESSION | Med |
| SVC-121 | Messaging → Request-thread entry point in UI | — | — | MISSING | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| SVC-123 | Dashboards → Customer dashboard | — | — | MISSING | FULL | PARTIAL | `tests/services-marketplace.te… | NEW IMPROVEMENT | Med |
| SVC-124 | Dashboards → Provider workspace | — | — | MISSING | FULL | NOT APPLICABLE | `tests/services-marketplace.te… | NEW IMPROVEMENT | Med |
| SVC-125 | Dashboards → Dashboard counters | — | — | MISSING | PARTIAL — `unreadMessages` hard-coded to 0 (`:44`); `openDisputes` counts a table with no write path (SVC-097) | NOT APPLICABLE | none | KEEP + IMPROVE | Low |
| SVC-126 | Dashboards → Supervisor console | — | — | MISSING | PARTIAL — documented tabs include disputes (`docs/services/SERVICES_ROUTES_INVENTORY.md:49`) but only providers/reports/categories are wired | NOT APPLICABLE | none | KEEP + IMPROVE | Med |
| SVC-127 | Analytics → Service analytics endpoint | — | — | MISSING | BROKEN — queries pg tables `service_requests`/`service_offers`/`service_jobs`/`service_reviews` from `lib/db/schemas/services-schema.ts` that **no migration creates** (grep `CREATE TABLE …service` over `drizzle-pg/*.sql` returns nothing); also keys on `session.userId` (uuid) while the rest of the domain keys on email | NOT APPLICABLE | none | FIX REGRESSION | High |
| SVC-128 | Analytics → Legacy `/api/services` root | — | — | MISSING | BROKEN — same missing pg tables; writes a parallel `service_requests` shape (`userId`, `governorate`) incompatible with the live table | NOT APPLICABLE | none | FIX REGRESSION | High |
| SVC-130 | Admin → Admin overview KPIs | — | — | MISSING | FULL (the counters themselves) | NOT APPLICABLE | `tests/services-api.test.mjs:4… | NEW IMPROVEMENT | Med |
| SVC-131 | Admin → Admin snapshot lists | — | — | MISSING | BROKEN — see SVC-087 (`agreed_price`, `scheduled_at` do not exist) | NOT APPLICABLE | none | FIX REGRESSION | High |
| SVC-132 | Admin → Admin console tabs | — | — | MISSING | PARTIAL — no disputes tab, no offers tab, operations is read-only; `docs/services/SERVICES_ROUTES_INVENTORY.md:56-63` lists 8 further admin routes as "(planned)" = INTENDED ONLY | NOT APPLICABLE | `tests/services-marketplace.te… | KEEP + IMPROVE | Med |
| SVC-133 | Admin → Marketplace page settings | — | — | MISSING | FULL | NOT APPLICABLE | `tests/services-marketplace.te… | NEW IMPROVEMENT | Low |
| SVC-134 | Admin → Registration kill-switch | — | — | MISSING | PARTIAL — client-side only; `POST /api/service-providers` does not honour the flag | NOT APPLICABLE | none | KEEP + IMPROVE | Med |
| SVC-135 | Admin → Public-requests kill-switch | — | — | MISSING | PARTIAL (inert) | NOT APPLICABLE | none | KEEP + IMPROVE | Med |
| SVC-136 | Admin → Audit trail | — | — | FULL | FULL | MISSING | `tests/services-api.test.mjs:8… | KEEP | Low |
| SVC-138 | Platform → Two API generations coexisting | — | — | FULL | PARTIAL — see the overlap table below | NOT APPLICABLE | `tests/services-listings-route… | MERGE INTO NEW SYSTEM | High |
| SVC-139 | Platform → Three DB schema definitions | — | — | FULL | PARTIAL/BROKEN | PARTIAL | `tests/messages-contract.test.… | MERGE INTO NEW SYSTEM | High |
| SVC-140 | Platform → Seed taxonomy | — | — | PARTIAL | BETTER THAN OLD | PARTIAL | `tests/services-marketplace.te… | KEEP + IMPROVE | Low |
| SVC-141 | Platform → Seed demo providers/requests | — | — | PARTIAL | BETTER THAN OLD | NOT APPLICABLE | `tests/services-marketplace.te… | KEEP | Low |
| SVC-142 | Platform → Seed completed demo job | — | — | MISSING | FULL | NOT APPLICABLE | none | NEW IMPROVEMENT | Low |
| SVC-143 | Platform → Legacy seed script | — | — | FULL | PARTIAL (duplicate seeding path producing legacy statuses) | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| SVC-144 | Platform → Currency handling | — | — | PARTIAL | PARTIAL — no FX, prices stored as `INTEGER` (`lib/services-schema.ts:70`) so sub-unit precision is lost (`computeTotal` rounds, `marketplace.ts:1085`) | PARTIAL | none | KEEP + IMPROVE | Med |
| SVC-145 | Platform → Geo handling | — | — | PARTIAL | PARTIAL — `city_id` is a free-text string compared case-insensitively (`match-score.ts:88-93`), not an FK to `lib/db/schemas/geo-schema.ts` | PARTIAL | `tests/services-matching.test.… | MERGE INTO NEW SYSTEM | High |
| SVC-146 | Platform → Identity mapping | — | — | FULL | PARTIAL — two incompatible identity keys inside one domain (also `PHASE-0-BASELINE.md:476` B2) | PARTIAL | `tests/services-api.test.mjs:2… | MERGE INTO NEW SYSTEM | High |
| SVC-147 | Platform → Identity re-key on email change | — | — | MISSING | PARTIAL — covers 22 tables but **omits `service_listings.provider_user_id`, `service_message_threads`, `service_marketplace_settings.updated_by`, `service_outbox_events`** | NOT APPLICABLE | `tests/services-api.test.mjs:2… | FIX REGRESSION | Med |
| SVC-148 | Platform → RBAC — service roles | — | — | PARTIAL | FULL (catalogue) | PARTIAL | `tests/services-authz.test.mjs… | NEW IMPROVEMENT | Med |
| SVC-149 | Platform → RBAC — customer can create a request | — | — | PARTIAL | **REGRESSION — primary customer journey blocked** | NOT APPLICABLE | not covered | FIX REGRESSION | High |
| SVC-150 | Platform → RBAC — customer can report / bookmark | — | — | MISSING | PARTIAL | NOT APPLICABLE | none | KEEP + IMPROVE | Med |
| SVC-151 | Platform → Error-code contract | — | — | FULL | PARTIAL — routes emit ad-hoc strings outside the catalogue (`provider_profile_required`, `request_not_editable`, `offer_expired`, `report_already_exists`); docs list `OFFER_EXPIRED`/`CONFLICT` codes that do not exist in `constants.ts` (INTENDED ONLY) | NOT APPLICABLE | none | KEEP + IMPROVE | Low |
| SVC-152 | Platform → Realtime for services | — | — | MISSING | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| SVC-154 | Adjacent → Leads service | — | — | MISSING | STUB (dead) | PARTIAL | none | MERGE INTO NEW SYSTEM | Med |
| SVC-155 | Adjacent → Contracts service | — | — | MISSING | PARTIAL — property-domain only; **no link from a completed service order to a contract** | FULL (desktop is richer) | none | KEEP + IMPROVE | Med |
| SVC-156 | Adjacent → Invitations service | — | — | MISSING | STUB | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| SVC-157 | Adjacent → Extended reputation | — | — | MISSING | STUB (dead, and a second reputation model) | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| SVC-158 | Adjacent → Currency service | — | — | MISSING | FULL (as a standalone service) but **not integrated with service pricing** (SVC-144) | PARTIAL | none | MERGE INTO NEW SYSTEM | Med |
| SVC-159 | Adjacent → Geo service | — | — | MISSING | FULL (standalone) but services store free-text `city_id` instead (SVC-145) | PARTIAL | none | MERGE INTO NEW SYSTEM | High |
| SVC-160 | Adjacent → Canonical state-machine module | — | — | MISSING | STUB (dead, duplicates `constants.ts`) | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| SVC-161 | Adjacent → Messaging deep-link helper | — | — | MISSING | STUB (dead duplicate) | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| SVC-162 | Adjacent → Desktop maintenance tickets | — | — | MISSING | MISSING | FULL | none | RESTORE | Med |
| SVC-163 | Platform → Test coverage of the domain | — | — | MISSING | PARTIAL — mostly source-text assertions, not behaviour; `tests/services-api.test.mjs:125` currently **fails** (`docs/release/PHASE-0-BASELINE.md:203`); `services-listings-route.test.ts` is in the non-running set (`:215`) | NOT APPLICABLE | itself | FIX REGRESSION | Med |
| SVC-164 | Platform → Services docs vs implementation | — | — | HISTORICAL ONLY | PARTIAL — routes inventory documents `/api/service-orders/*`, `/api/service-disputes`, `/api/service-listings`, `/api/service-requests/[id]/offers` and 8 `/admin/services/*` pages that **do not exist** (`docs/services/SERVICES_ROUTES_INVENTORY.md:56-63,150-160`) = INTENDED ONLY | NOT APPLICABLE | none | KEEP (as intent record) | Low |

## Messaging & Notifications (J, K)
*ROUND-1 (V2 lineage)*

| ID | Feature | V1 depth | V1 | Old V2 | Current V2 | Desktop | Tests | Decision | Risk |
|---|---|---|---|---|---|---|---|---|---|
| MSG-001 | Context: member↔member → `general` context | — | — | MISSING | PARTIAL — core works, **no UI entry point anywhere** (`StartThreadButton` has only 2 call sites, neither `general`: `app/properties/[id]/page.tsx:225`, `src/components/public/organization-profile-page.tsx:186`) | NOT APPLICABLE | `tests/messages-contract.test.… | KEEP + IMPROVE | Med |
| MSG-002 | Context: buyer↔property owner → `property` context | — | — | MISSING | **BROKEN** — `participantIds` omitted → `startMessageThread` seeds only the caller (`lib/services/marketplace.ts:1995`); `isThreadParticipant` has no implicit-owner branch for `property` (`:1938-1940` covers only `professional`); `resolveRecipientUserId` returns `null` (`:1971-1983`) so `sendMessageFull` skips notify+outbox (`:1872-1884`). Buyer's message is written and **nobody is ever told or can read it** | NOT APPLICABLE | `tests/messages-contract.test.… | FIX REGRESSION | High |
| MSG-003 | Context: buyer↔property-request poster → `property_request` context | — | — | MISSING | PARTIAL — context accepted and linkable, **zero UI entry point** (no `StartThreadButton` on any property-request page) | NOT APPLICABLE | `tests/messages-contract.test.… | KEEP + IMPROVE | Med |
| MSG-004 | Context: buyer↔office → office conversation | — | — | MISSING | **MISSING** — `app/offices/[id]/page.tsx:47` renders a `مراسلة` button with **no `onClick`** (dead button) | NOT APPLICABLE | none | RESTORE | High |
| MSG-005 | Context: buyer↔company → company conversation | — | — | MISSING | **MISSING** — `app/companies/[id]/page.tsx:47` renders `مراسلة` with **no `onClick`** | NOT APPLICABLE | none | RESTORE | High |
| MSG-006 | Context: customer↔craftsman → craftsman conversation | — | — | MISSING | PARTIAL — mapped onto `professional`, no craftsman-specific entry point | NOT APPLICABLE | `tests/messages-contract.test.… | KEEP + IMPROVE | Med |
| MSG-007 | Context: customer↔professional → `professional` context | — | — | MISSING | PARTIAL — **best-implemented context** (implicit owner resolution works) but `app/providers/[id]/page.tsx:409` renders `<Button><MessageCircle/>{t.message}</Button>` with **no `onClick`** — dead button | NOT APPLICABLE | `tests/messages-contract.test.… | FIX REGRESSION | High |
| MSG-008 | Context: customer↔provider → via `request`/`order` | — | — | PARTIAL (send/read only, no inbox) | PARTIAL — works, but `request` leg is not private (see MSG-009) | NOT APPLICABLE | `tests/messages-contract.test.… | FIX REGRESSION | High |
| MSG-009 | Context: request conversation → `request` (legacy value for SERVIC… | — | — | **BROKEN** (worse than current — zero authz) | **BROKEN · SECURITY** — one shared thread per request; every non-withdrawn offerer reads every other provider's messages. See "three-provider privacy verdict" below | NOT APPLICABLE | `tests/messages-contract.test.… | FIX REGRESSION | High |
| MSG-010 | Context: offer conversation → per-offer thread | — | — | MISSING | **MISSING** — this is the missing primitive that makes MSG-009 leak | NOT APPLICABLE | none | NEW IMPROVEMENT | High |
| MSG-011 | Context: service-order conversation → `order` (legacy value for SE… | — | — | PARTIAL | **FULL** — correctly isolated 1:1, both sides derived, notify fires | NOT APPLICABLE | `tests/messages-contract.test.… | KEEP | Low |
| MSG-012 | Context: office conversations → office staff / device threads | — | — | MISSING | **MISSING** | NOT APPLICABLE | none | NEW IMPROVEMENT | Med |
| MSG-013 | Context: company conversations → internal company threads | — | — | MISSING | MISSING | NOT APPLICABLE | none | NEW IMPROVEMENT | Med |
| MSG-014 | Context: organization conversations → `organization` context | — | — | MISSING | **PARTIAL — the only correct entry point is DEAD CODE**: `organization-profile-page.tsx` has **zero importers** (grep across app/src); the live route `app/organizations/[id]/page.tsx` contains no messaging at all | NOT APPLICABLE | `tests/messages-contract.test.… | FIX REGRESSION | High |
| MSG-015 | Context: land/surveyor conversations → FindMyLand threads | — | — | MISSING | MISSING | NOT APPLICABLE | none | NEW IMPROVEMENT | Low |
| MSG-016 | Inbox → central inbox page | — | — | MISSING | **BETTER THAN OLD** — works, but N+2 queries per thread inside a loop (`:2046,2058`) and no pagination | NOT APPLICABLE | `tests/messages-contract.test.… | KEEP + IMPROVE | Med |
| MSG-017 | Thread list → list + unread pill + timestamp | — | — | MISSING | PARTIAL — label is only the context name or a title; **no counterparty name, no last-message preview** (`listInbox` never selects a message body) | NOT APPLICABLE | contract test asserts labels o… | KEEP + IMPROVE | Med |
| MSG-018 | Thread detail → message pane + composer | — | — | MISSING | BETTER THAN OLD | NOT APPLICABLE | `tests/messages-contract.test.… | KEEP + IMPROVE | Low |
| MSG-019 | Participants → participants model | — | — | MISSING | PARTIAL — `role` column exists but is always written `"participant"` (`lib/services/marketplace.ts:1820`); no owner/admin/observer roles, no leave/remove, no `is_active` | NOT APPLICABLE | `tests/messages-contract.test.… | KEEP + IMPROVE | Med |
| MSG-020 | Participant resolution → implicit owner derivation | — | — | PARTIAL | **PARTIAL** — `property`, `property_request`, `organization`, `general` have **no** implicit branch, which is the root cause of MSG-002 | NOT APPLICABLE | `tests/messages-contract.test.… | FIX REGRESSION | High |
| MSG-021 | Send message → POST message | — | — | PARTIAL (unauthorized) | **BETTER THAN OLD** — participant check at `:26-29`, 4000-char cap `:21`, context enum `:22` | NOT APPLICABLE | `tests/messages-contract.test.… | KEEP | Low |
| MSG-022 | Receive messages → GET thread | — | — | PARTIAL | FULL for `order`/participant contexts; **LEAKY for `request`** | NOT APPLICABLE | `tests/messages-contract.test.… | FIX REGRESSION | High |
| MSG-023 | Realtime → live delivery of new messages | — | — | MISSING | **MISSING (STUB)** — new messages appended optimistically client-side only (`ThreadMessages.tsx:54-60`) | NOT APPLICABLE | none | NEW IMPROVEMENT | High |
| MSG-024 | Unread counts → per-thread unread | — | — | MISSING | PARTIAL — correct but O(messages) per thread per inbox load; no index-backed counter | NOT APPLICABLE | `tests/messages-contract.test.… | KEEP + IMPROVE | Med |
| MSG-025 | Unread counts → global inbox badge | — | — | MISSING | **STUB** — badge is permanently 0 | NOT APPLICABLE | none | FIX REGRESSION | Med |
| MSG-026 | Read state → mark-thread-read | — | — | MISSING | **PARTIAL** — read state is **global per message, not per reader**. `markThreadRead` sets `is_read=1` for all messages not sent by the reader (`:1901`), so in a leaky `request` thread provider B's read clears provider A's unread. No per-participant `last_read_at` | NOT APPLICABLE | `tests/messages-contract.test.… | FIX REGRESSION | High |
| MSG-027 | Typing indicator → "X is typing…" | — | — | MISSING | MISSING | NOT APPLICABLE | none | NEW IMPROVEMENT | Low |
| MSG-028 | Attachments → file/image in a message | — | — | MISSING | **MISSING** | NOT APPLICABLE | none | NEW IMPROVEMENT | Med |
| MSG-029 | Archive thread → hide a conversation | — | — | MISSING | **MISSING (STUB)** | NOT APPLICABLE | none | NEW IMPROVEMENT | Low |
| MSG-030 | Mute thread → silence notifications for a thread | — | — | MISSING | MISSING | NOT APPLICABLE | none | NEW IMPROVEMENT | Low |
| MSG-031 | Block user → stop a user contacting you | — | — | MISSING | MISSING | NOT APPLICABLE | none | NEW IMPROVEMENT | Med |
| MSG-032 | Report a message → flag abusive content | — | — | MISSING | **MISSING** | NOT APPLICABLE | none | NEW IMPROVEMENT | High |
| MSG-033 | Message search → search inside conversations | — | — | MISSING | MISSING | NOT APPLICABLE | none | NEW IMPROVEMENT | Low |
| MSG-034 | Context card → context label + title in the thread header | — | — | MISSING | PARTIAL — label + truncated id only; **no entity thumbnail, price, status, or counterparty identity**; no `tr` locale (labels are ar/en only, platform is ar/en/tr) | NOT APPLICABLE | `tests/messages-contract.test.… | KEEP + IMPROVE | Low |
| MSG-035 | Deep links → canonical `contextLinkFor` | — | — | MISSING | PARTIAL — `professional` should link to `/providers/{id}` but falls through to the inbox (`:77-79`) | NOT APPLICABLE | `tests/messages-contract.test.… | KEEP + IMPROVE | Low |
| MSG-036 | Deep links → second, divergent taxonomy | — | — | MISSING | **DEAD CODE with a richer model than the live one** — it is the only place `office` and `company` are first-class, and the only place icons/colors per context exist | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| MSG-037 | Notification integration → new-message notification | — | — | MISSING | **PARTIAL** — fires only when `resolveRecipientUserId` returns non-null; silently skipped for `property`/`property_request`/`general` with an empty participant list (`:1872`); only ONE recipient is ever notified even in a multi-party thread (`:1976`) | NOT APPLICABLE | none for the notify path | FIX REGRESSION | High |
| MSG-038 | Mobile behaviour → responsive inbox | — | — | MISSING | PARTIAL — stacks but there is no master/detail switch, so on mobile you scroll past the whole thread list to reach every message | NOT APPLICABLE | none | KEEP + IMPROVE | Med |
| MSG-039 | Pagination → thread + inbox paging | — | — | PARTIAL (same 200 cap) | **PARTIAL — unchanged since old**; a 201-message thread silently loses its oldest messages, and a heavy user's inbox is an unbounded N+2 query fan-out | NOT APPLICABLE | none | KEEP + IMPROVE | Med |
| MSG-040 | Message validation / limits → body limits + context enum | — | — | PARTIAL | **BETTER THAN OLD** — but the Drizzle family validates **nothing** (`app/api/messages/[id]/route.ts:26` inserts `body.content` unchecked; `app/api/messages/route.ts:37-39` inserts `body.recipientId` as a participant unchecked). Silent truncation at 4000 rather than a 400. `thread_type VARCHAR(16)` (`lib/services-schema.ts:82`) is exactly the length of `property_request` — no headroom | NOT APPLICABLE | `tests/messages-contract.test.… | KEEP + IMPROVE | Med |
| MSG-041 | Moderation / admin → message reports queue | — | — | MISSING | **MISSING** — admins cannot see, search, or act on any conversation | NOT APPLICABLE | none | NEW IMPROVEMENT | High |
| MSG-042 | System messages → `is_system` flag | — | — | STUB | **STUB** — column preserved, no writer, no renderer (`ThreadMessages.tsx:80-96` ignores it) | NOT APPLICABLE | none | NEW IMPROVEMENT | Low |
| MSG-043 | Thread metadata → title + context link | — | — | MISSING | **BETTER THAN OLD** — but no `last_message_at`, no `is_archived`, no `created_by` (all three exist on the unused Drizzle table `lib/db/schemas/messages-schema.ts:9-12`) | NOT APPLICABLE | `tests/messages-contract.test.… | KEEP + IMPROVE | Low |
| MSG-044 | Identity rekey → email→uuid migration path | — | — | MISSING | FULL — **but only for the raw-SQL family**; the Drizzle family keys on `users.id` uuid and is not covered | NOT APPLICABLE | `tests/messages-contract.test.… | KEEP | Low |
| MSG-045 | Outbox events → durable message fan-out | — | — | MISSING | **STUB** — `processOutbox` has **zero callers** (no cron, no route, no script) and even when called it only flips `status='processed'` without dispatching anything (`:2145-2148`). Events accumulate forever | NOT APPLICABLE | none | FIX REGRESSION | Med |
| MSG-046 | Audit trail → message send auditing | — | — | PARTIAL | FULL — carried forward with IP added | NOT APPLICABLE | none | KEEP | Low |
| MSG-047 | Message ordering → chronological order | — | — | FULL | PARTIAL — one family correct, one inverted | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| MSG-048 | Sender identity rendering → "mine" vs "theirs" bubbles | — | — | MISSING | PARTIAL — correct in one family, hardcoded-broken in the other. Neither shows a display name or avatar; identity is a raw email address | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| MSG-049 | Thread creation authorization → who may start/join a thread | — | — | NOT APPLICABLE | **BROKEN · SECURITY** (Phase 0 P0-3, `docs/release/PHASE-0-BASELINE.md:480,576`) | NOT APPLICABLE | not covered — `tests/messages-… | FIX REGRESSION | High |
| MSG-050 | Entry points → `StartThreadButton` wiring | — | — | MISSING | **BROKEN** — effectively zero working entry points | NOT APPLICABLE | `tests/messages-contract.test.… | FIX REGRESSION | High |
| MSG-051 | Contract test → `messages-contract` suite | — | — | MISSING | PARTIAL — 7 tests, but they are largely **grep-of-source assertions** (`:43-73`) rather than behaviour; and `:81-83` **encodes the cross-provider leak as expected behaviour**. Not runnable here (`tsx` absent) | NOT APPLICABLE | SOURCE VERIFIED | KEEP + IMPROVE | High |
| MSG-052 | Family C: HTTP proxy → `/api/services/messages` | — | — | FULL (was the only API) | PARTIAL — preserves the URL but loses the old GET query contract: old accepted `?threadType&threadId` (`hist/old-tag/…:54-61`); the proxy forwards GET to `/api/service-messages`, which **has no GET handler** (`app/api/service-messages/route.ts` exports POST only) → 405 | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| MSG-053 | Family A: Drizzle API → `/api/messages`, `/api/messages/[id]` | — | — | MISSING | **BROKEN · SECURITY** — `[id]` GET and POST have **no participant check at all** (`[id]/route.ts:11-12,25-27`), `messageParticipants` is not even imported (`:3`). Phase 0 P0-1 (`docs/release/PHASE-0-BASELINE.md:480,574`) | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | High |
| MSG-054 | Family A: Drizzle UI → `/messages`, `/messages/[id]` | — | — | MISSING | **BROKEN** — `:26` reads `t.threads.id`; the API returns Drizzle join rows keyed `message_threads`/`message_participants` (`app/api/messages/route.ts:12-16`), so the key does not exist. No nav link anywhere points to `/messages`. Phase 0 records `/messages` returning 200 (`docs/release/PHASE-0-BASELINE.md:303`) — it renders the empty state | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| MSG-055 | Family A: schema → `message_threads` / `message_participants` / `m… | — | — | MISSING | **DECLARED ONLY — no migration creates these tables.** grep for `message` across `drizzle/*.sql` and `drizzle-pg/*.sql` returns zero hits. Every `/api/messages*` call therefore hits a missing relation at runtime | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | High |
| MSG-056 | Cross-family data isolation → A and B never share data | — | — | n/a | **CONFIRMED SPLIT** — a message sent through one family is invisible to the other; a user's "inbox" depends on which page they opened | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | High |
| NOTIF-001 | In-app notification centre → services notifications page | — | — | MISSING | **BETTER THAN OLD** — but with a live field-name bug: the page reads `n.read` (`:16,98,99,107`) while the API returns raw rows with **`is_read`** (`lib/services/marketplace.ts:2094` `SELECT *`, column `lib/services-marketplace-schema.ts:279`). Every notification therefore renders permanently unread | FULL (desktop) | none | FIX REGRESSION | Med |
| NOTIF-002 | In-app → list API | — | — | MISSING | FULL | NOT APPLICABLE | none | KEEP | Low |
| NOTIF-003 | In-app → unread count | — | — | MISSING | FULL | FULL | none | KEEP | Low |
| NOTIF-004 | In-app → mark one read | — | — | MISSING | FULL | FULL | none | KEEP | Low |
| NOTIF-005 | In-app → mark all read | — | — | MISSING | FULL | FULL | none | KEEP | Low |
| NOTIF-006 | In-app → dismiss / delete | — | — | MISSING | **MISSING — desktop has it, web does not** | FULL | none | RESTORE (parity with desktop) | Low |
| NOTIF-007 | Preferences → per-user notification settings | — | — | MISSING | **MISSING** | MISSING | none | NEW IMPROVEMENT | Med |
| NOTIF-008 | Preferences → quiet hours | — | — | MISSING | **STUB** — logic is correct and unit-tested (`tests/integrations-notifications.test.mjs`, `package.json:13`) but sits inside `dispatchOfficeNotification`, which has **zero callers** | MISSING | SOURCE VERIFIED | KEEP + IMPROVE | Low |
| NOTIF-009 | Office → notification rules table + upsert | — | — | MISSING | **STUB** — `upsertNotificationRule` has **zero callers** anywhere (grep across `app`,`lib`,`src`); the rules list is always empty and there is no UI to create a rule | MISSING | SOURCE VERIFIED | FIX REGRESSION | Med |
| NOTIF-010 | Office → delivery log | — | — | MISSING | **STUB** — table and reader are complete; the only writer is `dispatchOfficeNotification` (`lib/integration/notifications.ts:126-149`), which has **zero callers**. The log is permanently empty | MISSING | SOURCE VERIFIED | FIX REGRESSION | Med |
| NOTIF-011 | Office → admin/office delivery UI | — | — | MISSING | PARTIAL — renders correctly against permanently empty data | MISSING | none | KEEP | Low |
| NOTIF-012 | Delivery → deduplication | — | — | none | none | MISSING | NONE | n/a | P2 |
| NOTIF-013 | Channel → in-app | — | — | MISSING | **FULL** (platform path) / STUB (office path) | FULL | none | KEEP | Low |
| NOTIF-014 | Channel → email | — | — | MISSING | **MISSING** — `email` is declared as an office channel (`lib/integration/constants.ts:29`) but there is no email transport call on any notification path | MISSING | none | NEW IMPROVEMENT | High |
| NOTIF-015 | Channel → office desktop | — | — | MISSING | **STUB** — declared channel, no dispatcher, no desktop consumer | PARTIAL (local alerts only) | SOURCE VERIFIED | NEW IMPROVEMENT | Med |
| NOTIF-016 | Channel → browser / web push | — | — | MISSING | **MISSING/BROKEN** | MISSING | none | NEW IMPROVEMENT | Med |
| NOTIF-017 | Deep links → notification → target | — | — | MISSING | FULL | PARTIAL (entity ref stored, no navigation string) | none | KEEP | Low |
| NOTIF-018 | Realtime → SSE push of notifications | — | — | MISSING | **STUB** (Phase 0 N16, `docs/release/PHASE-0-BASELINE.md:489,554`) | MISSING | `tests/integrations-realtime.t… | FIX REGRESSION | High |
| NOTIF-019 | Outbox → durable event processor | — | — | MISSING | **STUB** | MISSING | none | FIX REGRESSION | Med |
| NOTIF-020 | Event → new message | — | — | MISSING | **FIRES** — conditional on `recipientUserId != null` (`:1872`), so never for `property`/`property_request`/`general` threads with an empty participant list; only 1 recipient per send | NOT APPLICABLE | `tests/messages-contract.test.… | FIX REGRESSION | High |
| NOTIF-021 | Event → property inquiry | — | — | MISSING | **STUB / never emitted** | NOT APPLICABLE | none | FIX REGRESSION | High |
| NOTIF-022 | Event → nearby property | — | — | MISSING | **STUB — declared nowhere, never emitted** | NOT APPLICABLE | none | NEW IMPROVEMENT | Med |
| NOTIF-023 | Event → service match | — | — | MISSING | **STUB — matches are computed and never announced** | NOT APPLICABLE | none | NEW IMPROVEMENT | High |
| NOTIF-024 | Event → offer received | — | — | MISSING | **FIRES** | NOT APPLICABLE | `tests/services-marketplace.te… | KEEP | Low |
| NOTIF-025 | Event → accepted offer | — | — | MISSING | **FIRES** (in-app); outbox leg is a STUB (NOTIF-019) | NOT APPLICABLE | same suite | KEEP | Low |
| NOTIF-026 | Event → order update | — | — | MISSING | **PARTIAL** — `accepted`, `scheduled`, `in_progress`, `delivered`, `cancelled` fire nothing | NOT APPLICABLE | same suite | KEEP + IMPROVE | Med |
| NOTIF-027 | Event → review received | — | — | MISSING | **FIRES** | NOT APPLICABLE | same suite | KEEP | Low |
| NOTIF-028 | Event → verification / provider status | — | — | MISSING | **FIRES** | NOT APPLICABLE | same suite | KEEP | Low |
| NOTIF-029 | Event → auction event | — | — | MISSING | **STUB — never emitted** | NOT APPLICABLE | none | NEW IMPROVEMENT | High |
| NOTIF-030 | Event → rank change | — | — | MISSING | **STUB — never emitted** | NOT APPLICABLE | none | NEW IMPROVEMENT | Low |
| NOTIF-031 | Event → news | — | — | MISSING | **STUB — pull only, no push notification** | NOT APPLICABLE | `tests/integrations-news-ads.t… | NEW IMPROVEMENT | Low |
| NOTIF-032 | Event → office event | — | — | MISSING | **STUB** | MISSING | `tests/integrations-realtime.t… | FIX REGRESSION | Med |
| NOTIF-033 | Event → radar | — | — | MISSING | **MISSING on web — the desktop app has a radar-notification concept the web platform does not** | PARTIAL (flags exist) | `tests/integrations-radar.test… | RESTORE (parity with desktop) | Med |
| NOTIF-034 | Event → admin alert | — | — | MISSING | **MISSING on web — desktop has a working severity-tiered alert engine, web has none** | **FULL** | none | RESTORE (parity with desktop) | High |
| NOTIF-035 | Event → saved-search hit | — | — | MISSING | **STUB — the user can switch on a notification that can never be sent** | NOT APPLICABLE | none | FIX REGRESSION | High |

## Auctions, Community, Knowledge, Vehicles, News (L, N, O, P, Q)
*ROUND-1 (V2 lineage)*

| ID | Feature | V1 depth | V1 | Old V2 | Current V2 | Desktop | Tests | Decision | Risk |
|---|---|---|---|---|---|---|---|---|---|
| AUC-001 | Public auction listing → Grid page | — | — | MISSING | FULL | N/A | ❌ | KEEP | Low |
| AUC-002 | Auction listing API → Public query | — | — | MISSING | FULL | N/A | ❌ | KEEP | Low |
| AUC-003 | Auction listing API → Bid-count + offers hydration | — | — | MISSING | FULL | N/A | ❌ | KEEP | Low |
| AUC-004 | Auction listing → Search / filters / sort | — | — | absent — `app/auctions/page.tsx:32` fetches `/api/auctions` with no params | none | none | n/a | ❌ | RESTORE |
| AUC-005 | Auction listing → Media / photos on cards | — | — | MISSING | MISSING | N/A | ❌ | KEEP + IMPROVE | Med |
| AUC-006 | My auctions dashboard → List + stats | — | — | MISSING | FULL | N/A | ❌ | KEEP | Low |
| AUC-007 | Auction details page → Public detail | — | — | MISSING | FULL | N/A | ✅ grep | KEEP | Low |
| AUC-008 | Auction details API → Privileged gating | — | — | MISSING | FULL | N/A | ✅ `tests/auctions-hardening-f1… | KEEP | Low |
| AUC-009 | Auction details API → Bidder anonymity | — | — | MISSING | FULL | N/A | ✅ TEST VERIFIED | KEEP | Low |
| AUC-010 | Create auction → UI wizard | — | — | MISSING | FULL | N/A | ❌ | KEEP | Low |
| AUC-011 | Create auction → Custom end date (open) | — | — | MISSING | PARTIAL | N/A | ❌ | FIX REGRESSION | Low |
| AUC-012 | Create auction API → Validation + money parsing | — | — | MISSING | FULL | N/A | ✅ TEST VERIFIED | KEEP | Low |
| AUC-013 | Create auction API → Property-approval precondition | — | — | MISSING | FULL | N/A | ❌ | KEEP | Low |
| AUC-014 | Create auction API → Offer-type gate | — | — | MISSING | FULL | N/A | ✅ `tests/auctions-hardening-f1… | KEEP | Low |
| AUC-015 | Organizer account → Eligibility resolver | — | — | MISSING | FULL | N/A | ✅ TEST VERIFIED | KEEP | Low |
| AUC-016 | Organizer account → "My eligible organizers" API | — | — | MISSING | FULL | N/A | ❌ | KEEP | Low |
| AUC-017 | Admin grants organizer permission → Grant API | — | — | MISSING | FULL | N/A | ❌ | KEEP | Low |
| AUC-018 | Admin grants organizer permission → Revoke API | — | — | MISSING | FULL | N/A | ❌ | KEEP | Low |
| AUC-019 | Admin grants organizer permission → Org picker is unusable | — | — | MISSING | BROKEN | N/A | ❌ | FIX REGRESSION | High |
| AUC-020 | Admin grants organizer permission → User picker | — | — | MISSING | PARTIAL | N/A | ❌ | KEEP + IMPROVE | Med |
| AUC-021 | Admin grants organizer permission → Audit log | — | — | MISSING | MISSING | N/A | ❌ | RESTORE | Med |
| AUC-022 | Auction approval → Platform approval step | — | — | OLD SOURCE REQUIRED | MISSING | N/A | ❌ | RESTORE | High |
| AUC-023 | Auction activation → Seller terms acceptance activates | — | — | MISSING | FULL | N/A | ✅ grep | KEEP | Low |
| AUC-024 | Open auction → Seller-only creation, 3–60 day window | — | — | MISSING | FULL | N/A | ✅ TEST VERIFIED | KEEP | Low |
| AUC-025 | Limited/restricted (closed) auction → Organizer-only creation | — | — | MISSING | FULL | N/A | ✅ TEST VERIFIED | KEEP | Low |
| AUC-026 | 72-hour behaviour → Fixed end date at creation | — | — | MISSING | FULL | N/A | ❌ | KEEP | Low |
| AUC-027 | 72-hour behaviour → Clock restart on seller activation | — | — | MISSING | FULL | N/A | ❌ | KEEP | Low |
| AUC-028 | 72-hour behaviour → Anti-sniping extension | — | — | MISSING | MISSING | N/A | ❌ | NEW IMPROVEMENT | Med |
| AUC-029 | Bids → Place bid | — | — | MISSING | BETTER THAN OLD | N/A | ✅ TEST VERIFIED | KEEP | Low |
| AUC-030 | Bids → Idempotency | — | — | MISSING | BETTER THAN OLD | N/A | ✅ TEST VERIFIED | KEEP | Low |
| AUC-031 | Bids → Increment / min / max enforcement | — | — | MISSING | BETTER THAN OLD | N/A | ✅ TEST VERIFIED | KEEP | Low |
| AUC-032 | Bids → Self-bid block + window checks | — | — | MISSING | FULL | N/A | ✅ TEST VERIFIED | KEEP | Low |
| AUC-033 | Bid history → Anonymised feed | — | — | MISSING | FULL | N/A | ✅ TEST VERIFIED | KEEP | Low |
| AUC-034 | Bid history → Own-bid view / "my bids" dashboard | — | — | OLD SOURCE REQUIRED | MISSING | N/A | ❌ | RESTORE | Med |
| AUC-035 | Bid eligibility → Bidder terms acceptance | — | — | MISSING | FULL | N/A | ✅ TEST VERIFIED | KEEP | Low |
| AUC-036 | Bid eligibility → Deposit / bid bond / KYC gate | — | — | MISSING | MISSING | N/A | ❌ | NEW IMPROVEMENT | High |
| AUC-037 | Bids → Auto-bid / proxy bidding | — | — | PARTIAL | STUB | N/A | ❌ | RESTORE | Med |
| AUC-038 | Bids → Participant registry | — | — | PARTIAL | STUB | N/A | ❌ | MERGE INTO NEW SYSTEM | Med |
| AUC-039 | Close / end auction → Manual finalisation | — | — | MISSING | BETTER THAN OLD | N/A | ✅ TEST VERIFIED | KEEP | Low |
| AUC-040 | Close / end auction → Automatic closure job | — | — | MISSING | MISSING | N/A | ❌ | NEW IMPROVEMENT | High |
| AUC-041 | Winner determination → Highest valid bid, earliest-wins tiebreak | — | — | MISSING | BETTER THAN OLD | N/A | ✅ TEST VERIFIED | KEEP | Low |
| AUC-042 | Winner determination → No-bid outcome | — | — | MISSING | FULL | N/A | ✅ grep | KEEP | Low |
| AUC-043 | Decision → Open-auction seller accept/reject | — | — | MISSING | FULL | N/A | ✅ `tests/auctions-hardening-f1… | KEEP | Low |
| AUC-044 | Award → Immutable award snapshot | — | — | MISSING | FULL | N/A | ✅ TEST VERIFIED | KEEP | Low |
| AUC-045 | Contract generation → Text record + SHA-256 | — | — | STUB | FULL | N/A | ✅ TEST VERIFIED | KEEP | Low |
| AUC-046 | Contract generation → Printable HTML document | — | — | MISSING | BROKEN | N/A | ✅ `tests/auctions-contract-f3.… | FIX REGRESSION | High |
| AUC-047 | Contract generation → **Arabic mojibake in the HTML contract** | — | — | MISSING | BROKEN | N/A | ❌ (grep tests can't see encodi… | FIX REGRESSION | High |
| AUC-048 | Contract access → Retrieval + download | — | — | MISSING | FULL | N/A | ✅ TEST VERIFIED | KEEP | Low |
| AUC-049 | Contract signing → Hash-bound party acceptance | — | — | MISSING | STUB | N/A | ✅ `tests/auctions-contract-f3.… | KEEP + IMPROVE | High |
| AUC-050 | Terms → Versioned terms catalogue | — | — | MISSING | FULL | N/A | ✅ `tests/auctions-hardening-f1… | KEEP | Low |
| AUC-051 | Terms → Admin authoring of terms | — | — | MISSING | MISSING | N/A | ❌ | NEW IMPROVEMENT | Med |
| AUC-052 | Terms → Acceptance persistence + hash | — | — | MISSING | FULL | N/A | ✅ TEST VERIFIED | KEEP | Low |
| AUC-053 | Terms → Turkish terms content | — | — | PARTIAL | REGRESSION | N/A | ❌ | RESTORE | Low |
| AUC-054 | Settlement → Escrow / payment / handover | — | — | MISSING | MISSING | offline-only | ❌ | NEW IMPROVEMENT | High |
| AUC-055 | Audit trail → Auction event log | — | — | MISSING | PARTIAL | N/A | ❌ | KEEP + IMPROVE | Med |
| AUC-056 | Notifications → Bid outcrun / auction ending / won / contract ready | — | — | MISSING | MISSING | N/A | ❌ | NEW IMPROVEMENT | High |
| AUC-057 | Realtime → Live price / countdown push | — | — | OLD SOURCE REQUIRED | MISSING | N/A | ❌ | RESTORE | High |
| AUC-058 | Moderation → Bid invalidation | — | — | MISSING | STUB | N/A | ❌ | KEEP + IMPROVE | High |
| AUC-059 | Moderation → Cancel / suspend an auction | — | — | MISSING | STUB | N/A | ❌ | RESTORE | Med |
| AUC-060 | Admin → Auction management console | — | — | OLD SOURCE REQUIRED | MISSING | N/A | ❌ | RESTORE | High |
| AUC-061 | Analytics → Auction stats / history public pages | — | — | OLD SOURCE REQUIRED | MISSING | N/A | ❌ | OLD SOURCE REQUIRED | Med |
| AUC-062 | Cross-surface → Auctions teaser on `/services` | — | — | MISSING | FULL | N/A | ❌ | KEEP | Low |
| AUC-063 | Navigation → `/auctions` is an orphan public route | — | — | MISSING | REGRESSION | N/A | `tests/public-navigation-const… | FIX REGRESSION | Med |
| AUC-064 | Schema hygiene → Abandoned `auctions`/`auction_bids`/`auction_part… | — | — | PARTIAL | STUB | N/A | ❌ | MERGE INTO NEW SYSTEM | High |
| AUC-065 | Schema hygiene → `drizzle-kit generate` would destroy the live auc… | — | — | N/A | BROKEN | N/A | ❌ | FIX REGRESSION | High |
| AUC-066 | Tests → Auction suites are not in CI | — | — | N/A | PARTIAL | N/A | ⚠️ | FIX REGRESSION | Med |
| COMM-001 | Feed → Topic list page | — | — | MISSING | PARTIAL | N/A | ❌ | KEEP + IMPROVE | Med |
| COMM-002 | Feed → Topics API | — | — | MISSING | PARTIAL | N/A | ❌ | KEEP + IMPROVE | Med |
| COMM-003 | Feed → Draft/hidden filtering | — | — | MISSING | STUB | N/A | ❌ | FIX REGRESSION | Med |
| COMM-004 | Create post → New-topic form | — | — | MISSING | BROKEN | N/A | ❌ | FIX REGRESSION | High |
| COMM-005 | Create post → **Empty `categoryId` breaks every submission** | — | — | MISSING | BROKEN | N/A | ❌ | FIX REGRESSION | High |
| COMM-006 | Create post → Create API | — | — | MISSING | PARTIAL | N/A | ❌ | KEEP + IMPROVE | Med |
| COMM-007 | Post detail → Topic + replies page | — | — | MISSING | PARTIAL | N/A | ❌ | KEEP + IMPROVE | Med |
| COMM-008 | Comments → Post a reply | — | — | MISSING | PARTIAL | N/A | ❌ | KEEP + IMPROVE | Med |
| COMM-009 | Comments → Reply counter never updated | — | — | MISSING | BROKEN | N/A | ❌ | FIX REGRESSION | Med |
| COMM-010 | Views → View counter | — | — | MISSING | STUB | N/A | ❌ | KEEP + IMPROVE | Low |
| COMM-011 | Edit / delete → Author edit or delete of topic/reply | — | — | MISSING | MISSING | N/A | ❌ | NEW IMPROVEMENT | Med |
| COMM-012 | Reactions → Likes / helpful / mark-as-solution | — | — | MISSING | INTENDED ONLY | N/A | ❌ | NEW IMPROVEMENT | Med |
| COMM-013 | Profile association → Author identity | — | — | MISSING | BROKEN | N/A | ❌ | FIX REGRESSION | Med |
| COMM-014 | Categories → Category browse / filter | — | — | MISSING | STUB | N/A | ❌ | KEEP + IMPROVE | Med |
| COMM-015 | Media → Image/file attachment on posts | — | — | MISSING | MISSING | N/A | ❌ | NEW IMPROVEMENT | Low |
| COMM-016 | Report abuse → User report flow | — | — | MISSING | MISSING | N/A | ❌ | NEW IMPROVEMENT | Med |
| COMM-017 | Moderation → Pin / lock / hide, admin console | — | — | MISSING | STUB | N/A | ❌ | RESTORE | High |
| COMM-018 | Notifications → Reply/mention notification | — | — | MISSING | MISSING | N/A | ❌ | NEW IMPROVEMENT | Med |
| COMM-019 | Search & ranking → Keyword search, sort, trending | — | — | MISSING | MISSING | N/A | ❌ | NEW IMPROVEMENT | Low |
| COMM-020 | Persistence → No migration for `forum_*` tables | — | — | FULL | BROKEN | N/A | ❌ | RESTORE | High |
| COMM-021 | DB access → Inconsistent connection handling | — | — | MISSING | PARTIAL | N/A | ❌ | KEEP + IMPROVE | Med |
| COMM-022 | Tests → No test file for the community domain | — | — | MISSING | MISSING | N/A | ❌ | NEW IMPROVEMENT | Med |
| KNOW-001 | Articles / resources → Public catalogue page | — | — | MISSING | PARTIAL | N/A | ❌ | KEEP + IMPROVE | Med |
| KNOW-002 | Articles → Catalogue cards are dead ends | — | — | MISSING | BROKEN | N/A | ❌ | FIX REGRESSION | Med |
| KNOW-003 | Articles → List API | — | — | PARTIAL | PARTIAL | N/A | ❌ | KEEP + IMPROVE | Med |
| KNOW-004 | Detail page → Item detail | — | — | PARTIAL | PARTIAL | N/A | ❌ | KEEP + IMPROVE | Med |
| KNOW-005 | Content creation → Upload form | — | — | MISSING | PARTIAL | N/A | ❌ | KEEP + IMPROVE | Med |
| KNOW-006 | Content creation → No file upload — URL only | — | — | MISSING | PARTIAL | N/A | ❌ | KEEP + IMPROVE | High |
| KNOW-007 | Content creation → `/knowledge/new` is unreachable | — | — | MISSING | REGRESSION | N/A | ❌ | FIX REGRESSION | Med |
| KNOW-008 | Publishing → Editorial workflow | — | — | MISSING | REGRESSION | N/A | ❌ | FIX REGRESSION | High |
| KNOW-009 | Authorization → Anyone logged in can publish | — | — | MISSING | BROKEN | N/A | ❌ | FIX REGRESSION | High |
| KNOW-010 | Author → Author attribution | — | — | MISSING | PARTIAL | N/A | ❌ | KEEP + IMPROVE | Low |
| KNOW-011 | Categories → Category browse / filter | — | — | MISSING | MISSING | N/A | ❌ | NEW IMPROVEMENT | Med |
| KNOW-012 | Downloads → Download counter | — | — | PARTIAL | PARTIAL | N/A | ❌ | FIX REGRESSION | Med |
| KNOW-013 | Downloads → Paid / gated resources | — | — | MISSING | STUB | N/A | ❌ | FIX REGRESSION | High |
| KNOW-014 | Multilingual → AR/EN fields, TR missing | — | — | MISSING | PARTIAL | N/A | ❌ | KEEP + IMPROVE | Med |
| KNOW-015 | Search → Keyword / type search | — | — | MISSING | MISSING | N/A | ❌ | NEW IMPROVEMENT | Low |
| KNOW-016 | Related content → "See also" / related items | — | — | MISSING | MISSING | N/A | ❌ | NEW IMPROVEMENT | Low |
| KNOW-017 | Admin management → Admin console for resources | — | — | MISSING | MISSING | N/A | ❌ | RESTORE | High |
| KNOW-018 | Persistence → No migration for `knowledge_items` | — | — | FULL | BROKEN | N/A | ❌ | RESTORE | High |
| KNOW-019 | Tests → No test file for the knowledge domain | — | — | MISSING | MISSING | N/A | ❌ | NEW IMPROVEMENT | Med |
| VEH-001 | Listings → Vehicles index page | — | — | MISSING | STUB | N/A | ❌ | KEEP + IMPROVE | Med |
| VEH-002 | Listings → Listings API | — | — | MISSING | STUB | N/A | ❌ | KEEP + IMPROVE | Med |
| VEH-003 | Details → Vehicle detail page | — | — | MISSING | STUB | N/A | ❌ | KEEP + IMPROVE | Med |
| VEH-004 | Details → Index does not link to detail | — | — | MISSING | BROKEN | N/A | ❌ | FIX REGRESSION | Low |
| VEH-005 | Data model → `vehicles` + `locations` schema | — | — | MISSING | STUB | N/A | ❌ | KEEP | Med |
| VEH-006 | Data model → Schema has **zero importers** and is not in `drizzle.… | — | — | MISSING | STUB | N/A | ❌ | KEEP + IMPROVE | Med |
| VEH-007 | Data model → `0010_add_vehicles_tables.sql` does not exist | — | — | N/A | MISSING | N/A | ❌ | KEEP + IMPROVE | Med |
| VEH-008 | Create → Submit a vehicle listing | — | — | MISSING | MISSING | N/A | ❌ | NEW IMPROVEMENT | Med |
| VEH-009 | Edit → Owner edit / delist | — | — | MISSING | MISSING | N/A | ❌ | NEW IMPROVEMENT | Low |
| VEH-010 | Search & filters → Brand/type/year/price/location filters | — | — | MISSING | MISSING | N/A | ❌ | NEW IMPROVEMENT | Low |
| VEH-011 | Media → Vehicle photos | — | — | MISSING | MISSING | N/A | ❌ | NEW IMPROVEMENT | Med |
| VEH-012 | Favorites → Save a vehicle | — | — | MISSING | MISSING | N/A | ❌ | NEW IMPROVEMENT | Low |
| VEH-013 | Owner / contact → Seller identity + contact CTA | — | — | MISSING | MISSING | N/A | ❌ | NEW IMPROVEMENT | Med |
| VEH-014 | Messaging → Buyer↔seller thread | — | — | MISSING | MISSING | N/A | ❌ | NEW IMPROVEMENT | Med |
| VEH-015 | Moderation & admin → Approve / suspend a vehicle, admin console | — | — | MISSING | MISSING | N/A | ❌ | NEW IMPROVEMENT | Med |
| VEH-016 | Navigation & ads → Route is an orphan with a mislabelled ad family | — | — | MISSING | REGRESSION | N/A | ❌ | FIX REGRESSION | Low |
| VEH-017 | Related old capability → "Vehicle services" module | — | — | OLD SOURCE REQUIRED | MISSING | N/A | ❌ | OLD SOURCE REQUIRED | Med |
| NEWS-001 | Domain contracts → Channels / categories / statuses / page modes | — | — | MISSING | BETTER THAN OLD | see NEWS-024 | ⚠️ `tests/news/*` not runnable… | KEEP | Low |
| NEWS-002 | Schema → Additive news tables | — | — | PARTIAL | BETTER THAN OLD | n/a | ⚠️ | KEEP | Med |
| NEWS-003 | Manual news → Create | — | — | PARTIAL | BETTER THAN OLD | n/a | ⚠️ | KEEP | Low |
| NEWS-004 | Manual news → Update | — | — | PARTIAL | BETTER THAN OLD | n/a | ⚠️ | KEEP | Low |
| NEWS-005 | Manual news → Archive (soft delete) | — | — | FULL | FULL | n/a | ⚠️ | KEEP | Low |
| NEWS-006 | Manual news → Rich editorial fields | — | — | MISSING | BETTER THAN OLD | n/a | ⚠️ | KEEP | Low |
| NEWS-007 | Audit → News mutations are audit-logged | — | — | MISSING | BETTER THAN OLD | n/a | ⚠️ | KEEP | Low |
| NEWS-008 | Categories → Category taxonomy + admin labels + public filter | — | — | MISSING | FULL | n/a | ⚠️ | KEEP | Low |
| NEWS-009 | Multilingual → AR/EN/TR with fallback chain | — | — | PARTIAL | BETTER THAN OLD | n/a | ⚠️ | KEEP | Low |
| NEWS-010 | RSS → Feed parser | — | — | MISSING | FULL | n/a | ⚠️ `tests/news/rss.test.ts` | KEEP | Low |
| NEWS-011 | Ingestion → Fetch + dedupe + relevance | — | — | MISSING | FULL | n/a | ⚠️ `tests/news/ingestion.test.… | KEEP | Low |
| NEWS-012 | Ingestion → Scheduled polling | — | — | MISSING | INTENDED ONLY | n/a | ⚠️ | NEW IMPROVEMENT | High |
| NEWS-013 | Ingestion → Trust level → review queue | — | — | MISSING | FULL | n/a | ⚠️ | KEEP | Low |
| NEWS-014 | Sources admin → CRUD + fetch endpoints | — | — | MISSING | FULL | n/a | ⚠️ `tests/news/sources.test.ts` | KEEP | Low |
| NEWS-015 | Security → SSRF guard on fetched URLs | — | — | MISSING | BETTER THAN OLD | n/a | ⚠️ `tests/news/security.test.t… | KEEP | Low |
| NEWS-016 | Security → Link sanitisation + HTML sanitiser | — | — | MISSING | BETTER THAN OLD | n/a | ⚠️ | KEEP | Low |
| NEWS-017 | Eligibility → Page targeting | — | — | MISSING | FULL | n/a | ⚠️ `tests/news/eligibility.tes… | KEEP | Low |
| NEWS-018 | Eligibility → Geo / language / audience / schedule | — | — | PARTIAL | BETTER THAN OLD | n/a | ⚠️ | KEEP | Low |
| NEWS-019 | Eligibility → Display limits | — | — | MISSING | PARTIAL (never exercised — see NEWS-026) | n/a | ⚠️ | KEEP + IMPROVE | Med |
| NEWS-020 | Ranking → Deterministic ordering | — | — | PARTIAL | BETTER THAN OLD | n/a | ⚠️ | KEEP | Low |
| NEWS-021 | Placements → Placement CRUD API | — | — | MISSING | FULL | n/a | ⚠️ `tests/news/placements.test… | KEEP | Low |
| NEWS-022 | Delivery → Central resolution service | — | — | MISSING | FULL | see NEWS-024 | ⚠️ `tests/news/delivery.test.t… | KEEP | Low |
| NEWS-023 | Public display → `/news` feed page | — | — | MISSING | PARTIAL | n/a | ⚠️ | KEEP + IMPROVE | Med |
| NEWS-024 | Desktop delivery → Office news/ticker endpoint exists but the ship… | — | — | MISSING | PARTIAL (server-only) | MISSING | ⚠️ `tests/integrations-news-ad… | KEEP + IMPROVE | High |
| NEWS-025 | Analytics → Event recording + counter roll-up | — | — | MISSING | STUB | n/a | ⚠️ `tests/news/analytics.test.… | FIX REGRESSION | High |
| NEWS-026 | Telemetry → **No client ever posts telemetry** | — | — | MISSING | STUB | n/a | ⚠️ | FIX REGRESSION | High |
| NEWS-027 | Analytics → Analytics read API | — | — | MISSING | FULL (but always zero, see NEWS-026) | n/a | ⚠️ | KEEP | Med |
| NEWS-028 | Ticker → Website ticker component | — | — | PARTIAL | BETTER THAN OLD | n/a | ⚠️ | KEEP | Low |
| NEWS-029 | Ticker → Rotation interval bug | — | — | FULL | REGRESSION | n/a | ❌ | FIX REGRESSION | Med |
| NEWS-030 | Ticker → Ticker uses the engine channel | — | — | PARTIAL | BETTER THAN OLD | n/a | ⚠️ | KEEP | Low |
| NEWS-031 | Ticker → **Second, incompatible ticker component** | — | — | MISSING | REGRESSION | n/a | ❌ | MERGE INTO NEW SYSTEM | High |
| NEWS-032 | Ticker admin → `/admin/advertising/news-ticker` is broken | — | — | OLD SOURCE REQUIRED | BROKEN | n/a | ❌ | FIX REGRESSION | High |
| NEWS-033 | Ticker data → `news_ticker_items` table has no migration and no ad… | — | — | FULL | BROKEN | n/a | ❌ | MERGE INTO NEW SYSTEM | High |
| NEWS-034 | Admin management → News admin workspace | — | — | PARTIAL | BETTER THAN OLD | n/a | ⚠️ | KEEP | Low |
| NEWS-035 | Authorization → Granular news permissions | — | — | PARTIAL | BETTER THAN OLD | n/a | ⚠️ | KEEP | Low |
| NEWS-036 | Public display → News item detail page | — | — | MISSING | MISSING | n/a | ❌ | NEW IMPROVEMENT | Med |
| NEWS-037 | Public display → `/news` is an orphan route | — | — | MISSING | REGRESSION | n/a | ❌ | FIX REGRESSION | Med |
| NEWS-038 | Public display → Default country is hard-coded `om` | — | — | PARTIAL | PARTIAL | n/a | ⚠️ | KEEP + IMPROVE | Low |
| NEWS-039 | Public display → Public GET silently swallows DB errors | — | — | PARTIAL | PARTIAL | n/a | ⚠️ | KEEP + IMPROVE | Low |
| NEWS-040 | Notifications → `PUSH_NOTIFICATION` / `IN_APP_NOTIFICATION` channe… | — | — | OLD SOURCE REQUIRED | INTENDED ONLY | n/a | ❌ | NEW IMPROVEMENT | High |
| NEWS-041 | Data layer → News runs on a second, parallel DB stack | — | — | PARTIAL | PARTIAL | n/a | ⚠️ | MERGE INTO NEW SYSTEM | Med |
| NEWS-042 | Tests → 9 news suites exist but are not in CI and did not run here | — | — | MISSING | UNKNOWN | n/a | ⚠️ | FIX REGRESSION | Med |

## Advertising, Currency, Localization (R, W, X)
*ROUND-1 (V2 lineage)*

| ID | Feature | V1 depth | V1 | Old V2 | Current V2 | Desktop | Tests | Decision | Risk |
|---|---|---|---|---|---|---|---|---|---|
| ADS-001 | Campaign → Campaign entity (wide model) | — | — | FULL | FULL (superset of old: +tablet media, +channels, +region/district, +radius, +daily budget, +OS/day-parting) | PARTIAL (flat local model, no targeting) | `tests/ads-schema-contract.tes… | KEEP + IMPROVE | Med |
| ADS-002 | Campaign → Campaign CRUD (admin) | — | — | FULL | FULL | NOT APPLICABLE | none in `npm test` | KEEP | Low |
| ADS-003 | Campaign → **Duplicate campaign CRUD API** | — | — | FULL (live in old) | PARTIAL — dead duplicate, drifted from `/api/admin/ads` (no tablet_media_url, no channels) | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| ADS-004 | Campaign → Status lifecycle | — | — | FULL | FULL | NOT APPLICABLE | none | KEEP | Low |
| ADS-005 | Campaign → Soft delete / archive | — | — | FULL | FULL | NOT APPLICABLE | none | KEEP | Low |
| ADS-006 | Advertiser → Advertiser (ex-sponsor) master record | — | — | FULL | FULL (renamed API, same table) | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Low |
| ADS-007 | Advertiser → **Public country-based sponsor identity** | — | — | none found | n/a | FULL | none | none | P1 |
| ADS-008 | Advertiser → Sponsor logo upload + persistence | — | — | FULL | **MISSING** (upload pipeline lost; column preserved) | NOT APPLICABLE | none | RESTORE | High |
| ADS-009 | Advertiser → Sponsor logo fallback rendering | — | — | FULL | **MISSING** | NOT APPLICABLE | none | RESTORE | Med |
| ADS-010 | Advertiser → Sponsor level / tier | — | — | FULL | PARTIAL — stored, never used | NOT APPLICABLE | none | KEEP + IMPROVE | Med |
| ADS-011 | Advertiser → Advertiser profiles (KYC) | — | — | FULL | FULL | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Low |
| ADS-012 | Advertiser → Advertiser users | — | — | FULL | PARTIAL — API live, **no admin UI** | NOT APPLICABLE | none | RESTORE (needs UI) | Med |
| ADS-013 | Advertiser → Advertiser branches | — | — | FULL | PARTIAL — API live, **no admin UI** | NOT APPLICABLE | none | RESTORE (needs UI) | Med |
| ADS-014 | Advertiser → Advertiser access grants | — | — | FULL | FULL | NOT APPLICABLE | none | KEEP | Low |
| ADS-015 | Advertiser → Advertiser plans / subscriptions | — | — | FULL | **MISSING** | NOT APPLICABLE | none | RESTORE | High |
| ADS-016 | Advertiser → Advertiser contracts | — | — | FULL | **MISSING** | NOT APPLICABLE | none | RESTORE | High |
| ADS-017 | Advertiser → Advertiser invoices | — | — | FULL | **MISSING** | NOT APPLICABLE | none | RESTORE | High |
| ADS-018 | Advertiser → Advertiser payments | — | — | FULL | **MISSING** | NOT APPLICABLE | none | RESTORE | High |
| ADS-019 | Advertiser → Advertiser documents | — | — | FULL | **MISSING** | NOT APPLICABLE | none | RESTORE | Med |
| ADS-020 | Advertiser → Advertiser activity feed | — | — | FULL | **MISSING** (data still produced) | NOT APPLICABLE | none | RESTORE | Med |
| ADS-021 | Advertiser → Advertiser requests queue | — | — | FULL | FULL | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Low |
| ADS-022 | Advertiser → Sponsor banner admin page | — | — | FULL | **MISSING** | NOT APPLICABLE | none | RESTORE | Med |
| ADS-023 | Creative → Creative entity (ordered) | — | — | FULL | FULL (+`tablet_media_url`) | MISSING | `tests/ads-schema-contract.tes… | KEEP + IMPROVE | Low |
| ADS-024 | Creative → **Ordered creative playlist in one slot view** | — | — | FULL | **REGRESSION** — playlist authoring preserved, playlist *playback* removed by design ("a 5-creative campaign does NOT get 5× the exposure", `engine.ts:536-541`) | NOT APPLICABLE | `tests/ads-engine.test.mjs:147… | OLD SOURCE REQUIRED (product decision) | High |
| ADS-025 | Creative → Image creative | — | — | FULL | BROKEN at runtime — see ADS-030 | PARTIAL | none | FIX REGRESSION | High |
| ADS-026 | Creative → Video creative | — | — | FULL | BROKEN at runtime — see ADS-030 | MISSING | none | FIX REGRESSION | High |
| ADS-027 | Creative → Simple (single-request) upload | — | — | FULL | BROKEN at runtime — see ADS-030 | MISSING | none | FIX REGRESSION | High |
| ADS-028 | Creative → Resumable multipart upload | — | — | FULL | BROKEN at runtime — see ADS-030 (capability preserved in source) | MISSING | none | FIX REGRESSION | High |
| ADS-029 | Creative → Asset library + delete-guard | — | — | FULL | PARTIAL — guard incomplete (tablet + creative references can be orphaned) | MISSING | none | FIX REGRESSION | Med |
| ADS-030 | Creative → **Ad asset storage backend** | — | — | FULL (on Workers) | **BROKEN** (Phase 0 verified: "Ad-creative storage broken under Node") | NOT APPLICABLE | none | FIX REGRESSION | High |
| ADS-031 | Creative → Per-device creative variants | — | — | PARTIAL | FULL | MISSING | `tests/ads-engine.test.mjs` | BETTER THAN OLD / KEEP | Low |
| ADS-032 | Copy → CTA text (ar/en/tr) | — | — | FULL | FULL | MISSING | none | KEEP | Low |
| ADS-033 | Copy → Eyebrow / title / accent / description (ar/en/tr) | — | — | FULL | FULL | MISSING | none | KEEP | Low |
| ADS-034 | Link → Target URL | — | — | FULL | FULL | PARTIAL | none | KEEP | Low |
| ADS-035 | Ranking → Priority | — | — | FULL | FULL | PARTIAL | `tests/ads-engine.test.mjs` | KEEP | Low |
| ADS-036 | Ranking → Weight + weighted random pick | — | — | FULL | FULL | MISSING | `tests/ads-engine.test.mjs:112… | KEEP | Low |
| ADS-037 | Scheduling → Start / end dates | — | — | FULL | FULL | PARTIAL | none | KEEP | Low |
| ADS-038 | Scheduling → Day-parting + day-of-week | — | — | MISSING | FULL | MISSING | none | NEW IMPROVEMENT | Low |
| ADS-039 | Commercials → Paid amount / price | — | — | MISSING | PARTIAL — `pricing_model` and `price` are stored but **never used**: `spent_amount` is only read (`engine.ts:458-463`), never incremented anywhere | MISSING | none | KEEP + IMPROVE | High |
| ADS-040 | Commercials → Budget / daily budget caps | — | — | MISSING | PARTIAL — enforcement logic correct but `spent_amount` / `ad_daily_statistics.spent_amount` are never written, so caps never trigger | MISSING | none | FIX REGRESSION | High |
| ADS-041 | Delivery caps → Max impressions / max clicks | — | — | MISSING | FULL | MISSING | none | NEW IMPROVEMENT | Low |
| ADS-042 | Delivery caps → Frequency capping per user | — | — | MISSING | PARTIAL — `loadEngineStats` **hardcodes `frequencyWindowSince("day", now)`** (`engine.ts:257`) and ignores the campaign's `frequency_cap_period`, so session/week/month/all caps are all evaluated against a 1-day window | MISSING | none | FIX REGRESSION | Med |
| ADS-043 | Delivery → Fallback / house ads | — | — | MISSING | FULL | MISSING | none | NEW IMPROVEMENT | Low |
| ADS-044 | Delivery → Rotation between campaigns in a slot | — | — | MISSING | FULL | MISSING | none | NEW IMPROVEMENT | Low |
| ADS-045 | Delivery → Rotation group | — | — | MISSING | STUB | MISSING | none | KEEP + IMPROVE | Low |
| ADS-046 | Tracking → Impression recording | — | — | FULL | FULL | STUB | `tests/integrations-news-ads.t… | KEEP | Low |
| ADS-047 | Tracking → Click recording + redirect | — | — | FULL | FULL | STUB | none | KEEP | Low |
| ADS-048 | Tracking → Conversion recording | — | — | MISSING | PARTIAL — endpoint live, **no caller anywhere** in `app/`+`src/` | MISSING | none | KEEP + IMPROVE | Med |
| ADS-049 | Tracking → Signed tracking token | — | — | MISSING | FULL | MISSING | none | NEW IMPROVEMENT | Low |
| ADS-050 | Tracking → **Third, orphaned event endpoint** | — | — | FULL | PARTIAL — dead endpoint, stale table | NOT APPLICABLE | negative assertions only | MERGE INTO NEW SYSTEM | Med |
| ADS-051 | Tracking → **Sponsor/advertiser event tracking** | — | — | FULL | **MISSING** — every advertiser impression/click figure in the admin console is permanently 0 | NOT APPLICABLE | none | RESTORE | High |
| ADS-052 | Analytics → Daily statistics rollup | — | — | FULL | PARTIAL — impressions/clicks/conversions rolled up, `spent_amount` never written | MISSING | none | KEEP + IMPROVE | Med |
| ADS-053 | Analytics → Admin analytics dashboard | — | — | FULL | FULL | NOT APPLICABLE | none | KEEP | Low |
| ADS-054 | Analytics → Unique impression / unique click | — | — | MISSING | FULL | MISSING | `tests/integrations-news-ads.t… | NEW IMPROVEMENT | Low |
| ADS-055 | Analytics → Placement inventory health | — | — | MISSING | STUB (dead code) | NOT APPLICABLE | `tests/ads-engine.test.mjs:212… | RESTORE | Med |
| ADS-056 | Targeting → Website channel | — | — | MISSING | FULL | NOT APPLICABLE | `tests/ads-engine.test.mjs:181… | NEW IMPROVEMENT | Low |
| ADS-057 | Targeting → Office (desktop) channel | — | — | MISSING | PARTIAL — server side complete, no shipping client consumes it | MISSING | `tests/ads-engine.test.mjs:181… | KEEP + IMPROVE | High |
| ADS-058 | Targeting → Country targeting | — | — | FULL | FULL | MISSING | `tests/ads-engine.test.mjs:137` | KEEP | Low |
| ADS-059 | Targeting → Province / region targeting | — | — | MISSING | FULL | MISSING | none | NEW IMPROVEMENT | Low |
| ADS-060 | Targeting → City targeting | — | — | MISSING | FULL | MISSING | none | NEW IMPROVEMENT | Low |
| ADS-061 | Targeting → District targeting | — | — | MISSING | FULL | MISSING | none | NEW IMPROVEMENT | Low |
| ADS-062 | Targeting → Lat/lng + radius targeting | — | — | MISSING | PARTIAL — engine complete, but `AdSlot` **never sends `latitude`/`longitude`** (`src/components/AdSlot.tsx:179-193`), so radius targeting can only fire from the Office API path or a hand-built request | MISSING | none | FIX REGRESSION | Med |
| ADS-063 | Targeting → Page / section targeting | — | — | MISSING | FULL | MISSING | `tests/standard-public-ad-layo… | NEW IMPROVEMENT | Low |
| ADS-064 | Targeting → Module / entity targeting | — | — | MISSING | FULL | MISSING | none | NEW IMPROVEMENT | Low |
| ADS-065 | Targeting → Domain targeting | — | — | MISSING | FULL | MISSING | none | NEW IMPROVEMENT | Low |
| ADS-066 | Targeting → Language targeting | — | — | FULL | FULL | MISSING | none | KEEP | Low |
| ADS-067 | Targeting → Device targeting | — | — | PARTIAL | FULL | MISSING | none | BETTER THAN OLD / KEEP | Low |
| ADS-068 | Targeting → Operating-system targeting | — | — | MISSING | PARTIAL — `AdSlot` never sends `operatingSystem`, and `isOsMatch` returns **false** when the context lacks it (`engine.ts:364`), so any OS-targeted campaign is silently undeliverable on the web channel | MISSING | none | FIX REGRESSION | Med |
| ADS-069 | Placement → Central placement registry | — | — | PARTIAL | FULL (roughly 2× the old surface) | MISSING | `tests/standard-public-ad-layo… | BETTER THAN OLD / KEEP | Low |
| ADS-070 | Placement → Canonical placement fallback | — | — | MISSING | FULL | MISSING | `tests/standard-public-ad-layo… | NEW IMPROVEMENT | Low |
| ADS-071 | Placement → Hero placement | — | — | FULL | PARTIAL — hero slot preserved, hero *playlist* behaviour lost (see ADS-024) | MISSING | `tests/standard-public-ad-layo… | KEEP + IMPROVE | High |
| ADS-072 | Placement → Sidebar rails (LEFT_01/02, RIGHT_01/02) | — | — | PARTIAL (home only, 2 slots) | FULL (4 slots × 20 families) | MISSING | `tests/standard-public-ad-layo… | BETTER THAN OLD / KEEP | Low |
| ADS-073 | Placement → Bottom strip (BOTTOM_01/02/03) | — | — | MISSING | FULL | MISSING | `tests/standard-public-ad-layo… | NEW IMPROVEMENT | Low |
| ADS-074 | Placement → Inline / between-sections | — | — | FULL | PARTIAL — placements reserved but not rendered | MISSING | none | KEEP | Low |
| ADS-075 | Placement → Global header / footer strips | — | — | FULL | PARTIAL — mutually exclusive with the standard layout, so 28 standard pages never show them | MISSING | `tests/standard-public-ad-layo… | KEEP | Med |
| ADS-076 | Placement → Featured-properties placement | — | — | MISSING | BROKEN — admin page 404s; the public component reads `/api/advertising/match` which returns `featured` (`app/api/advertising/match/route.ts:22`) but with no way to author records | NOT APPLICABLE | none | FIX REGRESSION | High |
| ADS-077 | Placement → News-ticker placement | — | — | MISSING | BROKEN — admin page 404s | NOT APPLICABLE | none | FIX REGRESSION | High |
| ADS-078 | Placement → Safe zones (no-ads routes) | — | — | MISSING | PARTIAL — the union type exists but **no route in `PUBLIC_ROUTE_AD_POLICIES` (`public-ad-policy.ts:24-35`) is declared `safe-no-ads`**; the safety net is unexercised | NOT APPLICABLE | `tests/standard-public-ad-layo… | KEEP + IMPROVE | Med |
| ADS-079 | Placement → Review mode | — | — | MISSING | FULL | NOT APPLICABLE | `tests/standard-public-ad-layo… | NEW IMPROVEMENT | Low |
| ADS-080 | Placement → Empty-slot placeholder | — | — | MISSING | FULL | NOT APPLICABLE | none | NEW IMPROVEMENT | Low |
| ADS-081 | Delivery API → `POST /api/ads/match` | — | — | FULL | FULL — but see the N+1 note above | NOT APPLICABLE | `tests/ads-engine.test.mjs` (n… | KEEP + IMPROVE | High |
| ADS-082 | Delivery API → `POST /api/ads/match-batch` | — | — | PARTIAL (built, unused) | PARTIAL (built, unused) | NOT APPLICABLE | none | RESTORE (wire it up) | High |
| ADS-083 | Delivery API → **Duplicate matching engine** | — | — | MISSING | PARTIAL — live on 5+ page families in parallel with the D1 engine | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | High |
| ADS-084 | Schema → **Conflicting `ad_campaigns` / `ad_creatives` schemas** | — | — | FULL | **BROKEN by construction** — whichever store wins, one of the two engines cannot read it | NOT APPLICABLE | `tests/ads-schema-contract.tes… | MERGE INTO NEW SYSTEM | High |
| ADS-085 | Request flow → `POST /api/ads/request` (self-serve ad request) | — | — | FULL | PARTIAL — API healthy, **placements whitelist is only `["side_left","side_right"]`** (`route.ts:9`), i.e. two legacy home-only placements that the standard layout no longer renders | NOT APPLICABLE | none | FIX REGRESSION | High |
| ADS-086 | Request flow → `AdRequestDialog` UI | — | — | FULL | **REGRESSION** — component and API preserved, entry point removed | NOT APPLICABLE | none | RESTORE | High |
| ADS-087 | Request flow → `FloatingAdSlotActions` (request / details / contac… | — | — | FULL | **REGRESSION** — unreachable; `onViewDetails`/`onContact` also default to no-op closures (`AdSlot.tsx:334-335`) | NOT APPLICABLE | none | RESTORE | High |
| ADS-088 | Request flow → `/advertise` public request page | — | — | MISSING | **BROKEN** | NOT APPLICABLE | none | FIX REGRESSION | High |
| ADS-089 | Approval → Approval workflow | — | — | FULL | PARTIAL — **`is_active` is bound as `shouldActivate ? 1 : 1` (`approve/route.ts:51`), so rejecting a campaign still sets `is_active = 1`**; only `approval_status` keeps it out of delivery | NOT APPLICABLE | none | FIX REGRESSION | Med |
| ADS-090 | Approval → Country-scoped approval authority | — | — | FULL | FULL | NOT APPLICABLE | none | KEEP | Low |
| ADS-091 | Admin console → Ads workspace (wizard) | — | — | FULL | FULL | NOT APPLICABLE | `tests/ads-engine.test.mjs:221… | KEEP | Low |
| ADS-092 | Admin console → Asset library panel | — | — | FULL | BROKEN via ADS-030 | NOT APPLICABLE | none | FIX REGRESSION | High |
| ADS-093 | Admin console → **Second advertising admin console** | — | — | MISSING | **BROKEN** — 4 admin routes that cannot load data | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | High |
| ADS-094 | Admin console → **Two advertiser admin consoles** | — | — | PARTIAL | PARTIAL — same duplication carried forward | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| ADS-095 | Ops → Active-ads query ceiling | — | — | FULL | PARTIAL — with >500 active campaigns the pool is chosen by unspecified row order | NOT APPLICABLE | none | KEEP + IMPROVE | Med |
| ADS-096 | Ops → Delivery caches | — | — | FULL | FULL | NOT APPLICABLE | none | KEEP | Low |
| ADS-097 | Test → Ads test suites not executed | — | — | UNKNOWN | PARTIAL | NOT APPLICABLE | **regression risk unguarded** | FIX REGRESSION | High |
| CUR-001 | Catalogue → Supported currency list (DB) | — | — | PARTIAL | PARTIAL — schema + seed exist, no admin CRUD | PARTIAL | none | KEEP + IMPROVE | Med |
| CUR-002 | Catalogue → **12-currency requirement** | — | — | MISSING | PARTIAL — requirement documented + seed exists; no runtime code enforces or surfaces the 12 | PARTIAL | **none** | KEEP + IMPROVE | Med |
| CUR-003 | Catalogue → **Second, divergent currency list** | — | — | FULL | PARTIAL — orphaned duplicate that disagrees with the DB catalogue | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| CUR-004 | Catalogue → Per-country default currency | — | — | FULL | PARTIAL — value reaches the browser but **no component reads `countryConfig.currencyCode`** | PARTIAL | none | KEEP + IMPROVE | Med |
| CUR-005 | Conversion → Cross-currency conversion | — | — | MISSING | PARTIAL — implemented, **no caller** (grep `api/currencies` in `app/`+`src/` → none) | MISSING | none | KEEP + IMPROVE | Med |
| CUR-006 | Conversion → Rates source | — | — | MISSING | PARTIAL — static seed only, guaranteed to drift | MISSING | none | KEEP + IMPROVE | High |
| CUR-007 | Conversion → Rate staleness / audit | — | — | MISSING | MISSING | MISSING | none | KEEP + IMPROVE | Med |
| CUR-008 | UI → **Header currency chip** | — | — | FULL | **MISSING** | NOT APPLICABLE | none | RESTORE | High |
| CUR-009 | UI → Currency selector | — | — | MISSING | MISSING | MISSING | none | KEEP + IMPROVE | Med |
| CUR-010 | Formatting → Price formatting (services) | — | — | FULL | PARTIAL | MISSING | none | KEEP + IMPROVE | Med |
| CUR-011 | Formatting → **Second price formatter (properties)** | — | — | MISSING | PARTIAL — third independent formatting rule | MISSING | none | MERGE INTO NEW SYSTEM | Med |
| CUR-012 | Formatting → **Third price formatter (service class)** | — | — | MISSING | STUB | MISSING | none | MERGE INTO NEW SYSTEM | Med |
| CUR-013 | Integration → Property price currency | — | — | MISSING | PARTIAL — stored, never converted, never validated against the `currencies` catalogue | MISSING | none | KEEP + IMPROVE | Med |
| CUR-014 | Integration → Services pricing currency | — | — | FULL | PARTIAL — currency string is displayed verbatim; no conversion, no catalogue validation | MISSING | none | KEEP + IMPROVE | Med |
| CUR-015 | Schema → Missing currency migration | — | — | n/a | **BROKEN** | NOT APPLICABLE | none | FIX REGRESSION | High |
| CUR-016 | Test → Currency test coverage | — | — | MISSING | MISSING | NOT APPLICABLE | none | KEEP + IMPROVE | Med |
| I18N-001 | Locales → Arabic (ar) | — | — | FULL | FULL | FULL | `tests/news/i18n.test.ts:7-18`… | KEEP | Low |
| I18N-002 | Locales → English (en) | — | — | FULL | FULL | FULL | `tests/news/i18n.test.ts:20-25` | KEEP | Low |
| I18N-003 | Locales → Turkish (tr) | — | — | FULL | FULL (web) | **MISSING** (desktop) | `tests/news/i18n.test.ts:20-25` | KEEP + IMPROVE | Med |
| I18N-004 | Locales → Locale key parity guard | — | — | MISSING | PARTIAL | NOT APPLICABLE | unexecuted | FIX REGRESSION | Med |
| I18N-005 | Direction → RTL for Arabic | — | — | FULL | FULL | FULL | none | KEEP | Low |
| I18N-006 | Direction → LTR for English/Turkish | — | — | FULL | PARTIAL — first paint and all crawler/SSR output are Arabic-RTL regardless of the user's locale | FULL | none | FIX REGRESSION | Med |
| I18N-007 | Routing → Locale routing (`/en/...`) | — | — | MISSING | MISSING | NOT APPLICABLE | none | KEEP + IMPROVE | High |
| I18N-008 | Routing → hreflang / localized SEO | — | — | MISSING | MISSING | NOT APPLICABLE | none | KEEP + IMPROVE | Med |
| I18N-009 | Store → Static TS dictionary | — | — | FULL | FULL — **still the primary source for most rendered copy** (see I18N-014) | FULL | `tests/news/i18n.test.ts` | KEEP | Low |
| I18N-010 | Store → DB translation store | — | — | FULL | FULL | MISSING | none | KEEP | Low |
| I18N-011 | Store → Translation-key model | — | — | FULL | FULL | PARTIAL | none | KEEP | Low |
| I18N-012 | Store → Merge / fallback strategy | — | — | FULL | FULL | NOT APPLICABLE | none | KEEP | Low |
| I18N-013 | Store → Fallback flattening scope | — | — | FULL | PARTIAL — a component that reads `copy.foo` cannot be overridden by editing `home.foo`, because it never consults the bundle | NOT APPLICABLE | none | FIX REGRESSION | High |
| I18N-014 | Runtime → **Does the running app read the DB store?** | — | — | PARTIAL (identical split) | **PARTIAL — see Special answer (b)** | MISSING | none | FIX REGRESSION | High |
| I18N-015 | Runtime → Public bundle endpoint | — | — | FULL | FULL | MISSING | none | KEEP | Low |
| I18N-016 | Runtime → Cache invalidation after an admin edit | — | — | PARTIAL | PARTIAL — up to 60 s stale on the editing instance, no cross-instance invalidation | NOT APPLICABLE | none | FIX REGRESSION | Med |
| I18N-017 | Admin → Translation console | — | — | FULL | FULL | MISSING | none | KEEP | Low |
| I18N-018 | Admin → Publish snapshot (versioning) | — | — | FULL | FULL | MISSING | none | KEEP | Low |
| I18N-019 | Admin → Rollback to a version | — | — | FULL | FULL | MISSING | none | KEEP | Low |
| I18N-020 | Admin → Draft vs published status | — | — | FULL | PARTIAL — the DB and reader honour `status`, but the admin UI has **no draft/publish toggle** (`i18n-admin-client.tsx:133` saves values with no status field), so everything is published on save | MISSING | none | KEEP + IMPROVE | Med |
| I18N-021 | Admin → Change log / audit | — | — | FULL | PARTIAL — recorded, not surfaced | MISSING | none | KEEP + IMPROVE | Low |
| I18N-022 | Admin → Namespace management | — | — | PARTIAL | STUB | MISSING | none | KEEP + IMPROVE | Low |
| I18N-023 | Seed → Seed script | — | — | FULL | PARTIAL — **manual, not in any migration or bootstrap path**; a fresh deployment serves an empty DB bundle and silently falls through to the static dictionary | NOT APPLICABLE | none | KEEP + IMPROVE | Med |
| I18N-024 | Content → Translated DB content columns | — | — | FULL | PARTIAL — column-per-locale everywhere, **no shared helper**: each consumer re-implements `locale === "ar" ? x_ar : locale === "tr" ? x_tr : x_en` (e.g. `cur/lib/ads/engine.ts:684-688`) | PARTIAL | none | KEEP + IMPROVE | Med |
| I18N-025 | Content → Translated content fallback | — | — | MISSING | **MISSING** | PARTIAL | none | FIX REGRESSION | Med |
| I18N-026 | Desktop → Desktop localization store | — | — | NOT APPLICABLE | NOT APPLICABLE | PARTIAL — bundled only; no Turkish, no remote fetch, **no path to the web i18n store**, so an admin translation edit can never reach the desktop app | none | none | Phase 3 |
| I18N-027 | Locale detect → Locale persistence & detection | — | — | PARTIAL | PARTIAL | PARTIAL | none | KEEP + IMPROVE | Med |

## AkarProMax Office & Radar (S, T)
*ROUND-1 (V2 lineage)*

| ID | Feature | V1 depth | V1 | Old V2 | Current V2 | Desktop | Tests | Decision | Risk |
|---|---|---|---|---|---|---|---|---|---|
| OFFICE-001 | Pairing → Generate pairing code (web) | — | — | FULL | FULL | MISSING | FULL `tests/integrations-pairi… | KEEP | Med |
| OFFICE-002 | Pairing → List pairing codes | — | — | FULL | FULL | MISSING | MISSING | KEEP | Low |
| OFFICE-003 | Pairing → Revoke pairing code | — | — | FULL | PARTIAL | MISSING | MISSING | KEEP + IMPROVE | Low |
| OFFICE-004 | Pairing → Redeem code / complete pairing | — | — | FULL | FULL (web side) | MISSING | FULL `tests/integrations-pairi… | KEEP + IMPROVE (needs desktop client) | High |
| OFFICE-005 | Pairing → Single-use enforcement | — | — | FULL | FULL | N/A | FULL `tests/integrations-pairi… | KEEP | Low |
| OFFICE-006 | Pairing → Expiry semantics across storage backends | — | — | REGRESSION (absent) | BETTER THAN OLD | N/A | FULL `tests/integrations-pairi… | KEEP | Low |
| OFFICE-007 | Pairing → Rate limiting on redemption | — | — | FULL | FULL | N/A | MISSING | KEEP | Low |
| OFFICE-008 | Device authentication → Bearer device token | — | — | FULL | FULL (web side) | MISSING | FULL `tests/integrations-pairi… | KEEP + IMPROVE | High |
| OFFICE-009 | Device authentication → Typed failure reason | — | — | PARTIAL | BETTER THAN OLD | N/A | MISSING | KEEP | Low |
| OFFICE-010 | Device authentication → Credential rotation | — | — | FULL | FULL | MISSING | FULL `tests/integrations-pairi… | KEEP | Med |
| OFFICE-011 | Device authentication → Credential TTL | — | — | FULL | FULL | N/A | PARTIAL | KEEP | Low |
| OFFICE-012 | Device authentication → Scope enforcement | — | — | FULL | FULL | N/A | FULL `tests/integrations-const… | KEEP | Low |
| OFFICE-013 | Device authentication → Scope granting is all-or-nothing | — | — | PARTIAL | PARTIAL | N/A | MISSING | KEEP + IMPROVE | Med |
| OFFICE-014 | Device identity → HWID / installation id | — | — | PARTIAL | PARTIAL | FULL | MISSING | MERGE INTO NEW SYSTEM (map HWID → installation_id) | High |
| OFFICE-015 | Device identity → Device metadata capture | — | — | FULL | FULL | OSR | MISSING | KEEP | Low |
| OFFICE-016 | Device management → List devices (sponsor) | — | — | FULL | FULL | N/A | MISSING | KEEP | Low |
| OFFICE-017 | Device management → Revoke device (kill-switch) | — | — | FULL | FULL | PARTIAL/OSR | FULL `tests/integrations-pairi… | KEEP + IMPROVE | Med |
| OFFICE-018 | Device management → Cross-sponsor guard on revoke | — | — | FULL | FULL | N/A | MISSING | KEEP | Low |
| OFFICE-019 | Office identity → Sponsor id is an email string | — | — | PARTIAL | PARTIAL | N/A | MISSING | KEEP + IMPROVE | High |
| OFFICE-020 | Office identity → `office_id` never populated by pairing | — | — | PARTIAL | PARTIAL | N/A | MISSING | FIX REGRESSION | High |
| OFFICE-021 | Office identity → Legacy `office_links` link record | — | — | FULL | FULL | PARTIAL | MISSING | KEEP (legacy) + MERGE INTO NEW SYSTEM | High |
| OFFICE-022 | Office identity → `legacy_link_id` migration bridge | — | — | MISSING | PARTIAL (dead column) | N/A | MISSING | RESTORE (wire the migration) | Med |
| OFFICE-023 | Heartbeat → Device heartbeat | — | — | PARTIAL | BETTER THAN OLD (web side) | MISSING | PARTIAL `tests/integrations-pa… | KEEP + IMPROVE | Med |
| OFFICE-024 | Heartbeat → Heartbeat response payload | — | — | MISSING | BETTER THAN OLD | N/A | MISSING | KEEP | Low |
| OFFICE-025 | Heartbeat → Server time for clock-skew detection | — | — | MISSING | PARTIAL | FULL | MISSING | KEEP + IMPROVE | Med |
| OFFICE-026 | Protocol versioning → Version gate | — | — | FULL | FULL | PARTIAL | FULL `tests/integrations-const… | KEEP + IMPROVE | Med |
| OFFICE-027 | Protocol versioning → Update mechanism / self-update | — | — | MISSING | MISSING | MISSING | MISSING | NEW IMPROVEMENT | Med |
| OFFICE-028 | Sync — push → Push property upsert/delete | — | — | FULL | PARTIAL | MISSING | FULL `tests/integrations-sync.… | FIX REGRESSION | High |
| OFFICE-029 | Sync — push → Property column mapping | — | — | FULL | REGRESSION | N/A | MISSING (no test covers the co… | FIX REGRESSION | High |
| OFFICE-030 | Sync — push → NOT NULL default backfill | — | — | FULL | REGRESSION (a push omitting `titleTr`/`descriptionTr` hits a NOT NULL violation, caught at `sync.ts:206-209` and recorded as `status='failed'`) | N/A | MISSING | FIX REGRESSION | High |
| OFFICE-031 | Sync — push → Features array encoding | — | — | FULL | REGRESSION (data corruption) | N/A | MISSING | FIX REGRESSION | High |
| OFFICE-032 | Sync — push → `property.delete` operation | — | — | REGRESSION | BETTER THAN OLD | MISSING | PARTIAL `tests/integrations-sy… | KEEP | Low |
| OFFICE-033 | Sync — push → Idempotency | — | — | FULL | FULL | MISSING | FULL `tests/integrations-sync.… | KEEP + IMPROVE | Med |
| OFFICE-034 | Sync — conflict → Server-newer detection | — | — | FULL | PARTIAL (lexicographic string compare; safe only while both sides use the same `YYYY-MM-DD HH:MM:SS` shape — the desktop's `clientUpdatedAt` format is `UNKNOWN`) | N/A | FULL `tests/integrations-sync.… | KEEP + IMPROVE | Med |
| OFFICE-035 | Sync — conflict → Conflict resolution policy | — | — | PARTIAL | PARTIAL | N/A | PARTIAL | KEEP + IMPROVE | Med |
| OFFICE-036 | Sync — conflict → Server copy returned to client | — | — | FULL | FULL (web side) | MISSING | PARTIAL | KEEP | Low |
| OFFICE-037 | Sync — pull → Pull changes | — | — | PARTIAL | PARTIAL | MISSING | PARTIAL `tests/integrations-sy… | KEEP + IMPROVE | High |
| OFFICE-038 | Sync — pull → Pull is an echo, not a change feed | — | — | REGRESSION | REGRESSION (web→desktop data flow does not exist) | MISSING | PARTIAL (the test only asserts… | FIX REGRESSION | High |
| OFFICE-039 | Sync — pull → Cursor semantics | — | — | REGRESSION | REGRESSION (cursor can skip or repeat rows) | N/A | MISSING | FIX REGRESSION | High |
| OFFICE-040 | Sync — retry → Retry failed operations | — | — | FULL | PARTIAL (nothing ever re-executes a `retrying` op — the status is set but no worker replays the payload) | MISSING | PARTIAL `tests/integrations-sy… | FIX REGRESSION | High |
| OFFICE-041 | Sync — retry → Dead-letter | — | — | FULL | FULL | N/A | FULL `tests/integrations-sync.… | KEEP | Low |
| OFFICE-042 | Sync — retry → Retry/dead-letter are globally scoped | — | — | REGRESSION | REGRESSION (cross-tenant authorisation defect) | N/A | MISSING | FIX REGRESSION | High |
| OFFICE-043 | Sync — queue → Offline queue (device side) | — | — | N/A | MISSING | FULL | MISSING | RESTORE (extend web operation vocabulary) | High |
| OFFICE-044 | Sync — ops view → Operation history | — | — | FULL | FULL | N/A | MISSING | FIX REGRESSION | Med |
| OFFICE-045 | Sync — rate limit → Push rate limiting | — | — | PARTIAL | PARTIAL | N/A | MISSING | KEEP + IMPROVE | Med |
| OFFICE-046 | Property upload → Desktop → web property create | — | — | MISSING | CONTRACT MISMATCH | FULL | MISSING | FIX REGRESSION | High |
| OFFICE-047 | Property upload → Desktop → web property update | — | — | MISSING | CONTRACT MISMATCH | FULL | MISSING | FIX REGRESSION | High |
| OFFICE-048 | Property upload → Connection test | — | — | MISSING | CONTRACT MISMATCH (test always reports `?` properties) | FULL | MISSING | FIX REGRESSION | Low |
| OFFICE-049 | Property upload → Remote base URL is user-configurable | — | — | MISSING | MISSING | PARTIAL | MISSING | FIX REGRESSION | High |
| OFFICE-050 | Property status → Status round-trip | — | — | MISSING | CONTRACT MISMATCH | PARTIAL | MISSING | FIX REGRESSION | High |
| OFFICE-051 | Property status → Publish/approve workflow | — | — | MISSING | MISSING | FULL | MISSING | RESTORE | High |
| OFFICE-052 | Media → Upload initiate | — | — | MISSING | BROKEN | MISSING | MISSING | FIX REGRESSION | High |
| OFFICE-053 | Media → Route is unreachable (400 on every request) | — | — | N/A | BROKEN | N/A | MISSING (no media test file) | FIX REGRESSION | High |
| OFFICE-054 | Media → Wrong database + wrong table | — | — | N/A | BROKEN | N/A | MISSING | FIX REGRESSION | High |
| OFFICE-055 | Media → Wrong column names | — | — | N/A | BROKEN | N/A | MISSING | FIX REGRESSION | High |
| OFFICE-056 | Media → Reserved word `order` unquoted | — | — | N/A | BROKEN | N/A | MISSING | FIX REGRESSION | High |
| OFFICE-057 | Media → Upload session table has no DDL | — | — | N/A | BROKEN | N/A | MISSING | FIX REGRESSION | High |
| OFFICE-058 | Media → Bytes are discarded | — | — | N/A | BROKEN | N/A | MISSING | FIX REGRESSION | High |
| OFFICE-059 | Media → Ownership check is a no-op | — | — | N/A | BROKEN | N/A | MISSING | FIX REGRESSION | High |
| OFFICE-060 | Media → Scope choice | — | — | N/A | REGRESSION | N/A | MISSING | FIX REGRESSION | Med |
| OFFICE-061 | Media → Side-effect on wrong counter | — | — | N/A | BROKEN | N/A | MISSING | FIX REGRESSION | Med |
| OFFICE-062 | Media → Media list / delete | — | — | MISSING | BROKEN | FULL | MISSING | FIX REGRESSION | High |
| OFFICE-063 | News delivery → Office news list | — | — | FULL | FULL (web side) | CONTRACT MISMATCH | FULL `tests/integrations-news-… | MERGE INTO NEW SYSTEM | High |
| OFFICE-064 | News delivery → Ticker view | — | — | FULL | FULL | PARTIAL | PARTIAL | KEEP | Low |
| OFFICE-065 | News delivery → Delivery receipt / dedup | — | — | FULL | FULL | MISSING | FULL `tests/integrations-news-… | KEEP | Low |
| OFFICE-066 | News delivery → Receipt scope check uses read scope | — | — | PARTIAL | PARTIAL | N/A | MISSING | KEEP + IMPROVE | Low |
| OFFICE-067 | Advertisement delivery → Office ad fetch | — | — | FULL | FULL (web side) | CONTRACT MISMATCH | PARTIAL `tests/integrations-ne… | MERGE INTO NEW SYSTEM | High |
| OFFICE-068 | Advertisement delivery → Placement vocabulary mismatch | — | — | s==="bottom" |  | s==="any"?s:"any"`) | N/A | N/A | MISSING |
| OFFICE-069 | Advertisement delivery → Impression recording | — | — | FULL | FULL (web side) | OSR | FULL `tests/integrations-news-… | MERGE INTO NEW SYSTEM | High |
| OFFICE-070 | Advertisement delivery → Click recording | — | — | FULL | FULL | OSR | PARTIAL | MERGE INTO NEW SYSTEM | High |
| OFFICE-071 | Advertisement delivery → Impression dedup abuses `city_id` | — | — | REGRESSION | REGRESSION | N/A | PARTIAL (the test asserts the … | FIX REGRESSION | Med |
| OFFICE-072 | Advertisement delivery → Two parallel ad implementations | — | — | REGRESSION | REGRESSION (dead parallel implementation) | N/A | PARTIAL (source-text test only) | MERGE INTO NEW SYSTEM | Med |
| OFFICE-073 | Advertisement delivery → Channel eligibility gate | — | — | FULL | PARTIAL | N/A | MISSING | KEEP | Low |
| OFFICE-074 | Advertisement delivery → Signed tracking token | — | — | FULL | FULL | MISSING | MISSING | KEEP | Low |
| OFFICE-075 | Advertisement delivery → Local ad image caching | — | — | N/A | BROKEN (creative storage) | FULL | MISSING | FIX REGRESSION | High |
| OFFICE-076 | Advertisement delivery → Ad poll interval | — | — | N/A | MISSING | FULL | MISSING | KEEP + IMPROVE | Low |
| OFFICE-077 | Advertisement delivery → Collapsible / news-text banner | — | — | N/A | MISSING | FULL | MISSING | RESTORE | Low |
| OFFICE-078 | Web notifications → Notification rules | — | — | FULL | PARTIAL | N/A | FIX REGRESSION | P1 |  |
| OFFICE-079 | Web notifications → Dispatch with dedup | — | — | n/a | n/a | FULL | N/A | FULL `tests/integrations-notifications.test.mjs:22` | Phase 2 |
| OFFICE-080 | Web notifications → Nothing ever dispatches | — | — | REGRESSION | REGRESSION | N/A | PARTIAL (unit-tested but unwir… | FIX REGRESSION | High |
| OFFICE-081 | Web notifications → Quiet hours | — | — | FULL | PARTIAL | N/A | KEEP + IMPROVE (per-office TZ) | P2 |  |
| OFFICE-082 | Web notifications → Delivery statuses | — | — | PARTIAL | PARTIAL | N/A | FIX REGRESSION | P1 |  |
| OFFICE-083 | Desktop notification channel → `office_desktop` channel | — | — | PARTIAL | PARTIAL | FULL (local only) | FIX REGRESSION | P0 |  |
| OFFICE-084 | Web notifications → Office workspace notification UI is unauthenti… | — | — | REGRESSION | BROKEN | N/A | MISSING | FIX REGRESSION | High |
| OFFICE-085 | Realtime → SSE stream endpoint | — | — | PARTIAL | PARTIAL | MISSING | FULL `tests/integrations-realt… | FIX REGRESSION | High |
| OFFICE-086 | Realtime → Stream closes immediately | — | — | REGRESSION | REGRESSION | N/A | PARTIAL | FIX REGRESSION | High |
| OFFICE-087 | Realtime → Nothing publishes events | — | — | REGRESSION | REGRESSION | N/A | PARTIAL | FIX REGRESSION | High |
| OFFICE-088 | Realtime → Replay scoping bug | — | — | REGRESSION | REGRESSION (cross-tenant leak) | N/A | PARTIAL (`tests/integrations-r… | FIX REGRESSION | High |
| OFFICE-089 | Realtime → Stream skips protocol/scope gate | — | — | REGRESSION | REGRESSION | N/A | MISSING | FIX REGRESSION | Med |
| OFFICE-090 | Realtime → `formatSse` ignores its cursor arg | — | — | REGRESSION | REGRESSION (cosmetic + misleading API) | N/A | PARTIAL `tests/integrations-re… | KEEP + IMPROVE | Low |
| OFFICE-091 | Health → Office integration health endpoint | — | — | MISSING | MISSING | MISSING | MISSING | NEW IMPROVEMENT | Med |
| OFFICE-092 | Logs → Security audit events | — | — | PARTIAL | PARTIAL | PARTIAL | MISSING | KEEP + IMPROVE | Med |
| OFFICE-093 | Logs → Media audit call not awaited | — | — | N/A | REGRESSION | N/A | MISSING | FIX REGRESSION | Low |
| OFFICE-094 | Admin → Admin integration overview | — | — | FULL | FULL | N/A | MISSING | KEEP | Low |
| OFFICE-095 | Admin → Declared-but-unused permissions | — | — | REGRESSION | REGRESSION | N/A | MISSING | FIX REGRESSION | Med |
| OFFICE-096 | Office workspace → Office overview dashboard | — | — | FULL | FULL | FULL | MISSING | KEEP | Low |
| OFFICE-097 | Office workspace → Office properties tab | — | — | FULL | PARTIAL | N/A | MISSING | KEEP + IMPROVE | High |
| OFFICE-098 | Office workspace → Office-synced properties are invisible in the o… | — | — | REGRESSION | REGRESSION | N/A | MISSING | FIX REGRESSION | High |
| OFFICE-099 | Office workspace → Office property-requests tab | — | — | FULL | PARTIAL | FULL | MISSING | RESTORE | High |
| OFFICE-100 | Office workspace → Office members / branches / profile | — | — | FULL | FULL | FULL | MISSING | KEEP | Med |
| OFFICE-101 | Office workspace → Office portfolio endpoint is a stub | — | — | STUB | STUB | N/A | MISSING | FIX REGRESSION | Med |
| OFFICE-102 | Licence / subscription → Subscription status fetch | — | — | MISSING | WEB ROUTE MISSING | FULL | MISSING | RESTORE | High |
| OFFICE-103 | Licence / subscription → Bridge exposure to WebUI | — | — | N/A | N/A | FULL | N/A | KEEP | Med |
| OFFICE-104 | Licence / subscription → Offline licence | — | — | MISSING | MISSING | FULL | MISSING | RESTORE | High |
| OFFICE-105 | Licence / subscription → Licence key + HWID activation | — | — | PARTIAL | PARTIAL | FULL | MISSING | MERGE INTO NEW SYSTEM | High |
| OFFICE-106 | Licence / subscription → Device deactivation from desktop | — | — | MISSING | MISSING | FULL | MISSING | RESTORE | Med |
| OFFICE-107 | Licence / subscription → Trial / days-remaining / renewal URL | — | — | MISSING | MISSING | FULL | MISSING | RESTORE | High |
| OFFICE-108 | Cloud backup → Backup upload cycle | — | — | MISSING | WEB ROUTE MISSING | FULL | MISSING | RESTORE | High |
| OFFICE-109 | Cloud backup → Backup URL is free-text and unauthenticated | — | — | MISSING | MISSING | FULL | MISSING | FIX REGRESSION | High |
| OFFICE-110 | Local backup → Local backup create / restore | — | — | n/a | N/A | N/A | N/A | N/A | Phase 4 |
| OFFICE-111 | WebView2 portal → `AkarV2PortalWindow` | — | — | MISSING | MISSING | FULL | MISSING | RESTORE | High |
| OFFICE-112 | WebView2 portal → Website auth token handoff | — | — | MISSING | WEB ROUTE MISSING | FULL | MISSING | RESTORE | High |
| OFFICE-113 | WebView2 portal → Shared-secret signature | — | — | MISSING | MISSING | FULL | MISSING | FIX REGRESSION | High |
| OFFICE-114 | WebView2 portal → `user_token` from localStorage | — | — | MISSING | MISSING | PARTIAL | MISSING | MERGE INTO NEW SYSTEM | High |
| OFFICE-115 | WebView2 portal → Ad banner inside the portal | — | — | N/A | CONTRACT MISMATCH | FULL | MISSING | MERGE INTO NEW SYSTEM | High |
| OFFICE-116 | WebView2 portal → DOM/resource error telemetry | — | — | N/A | MISSING | FULL | MISSING | KEEP | Low |
| OFFICE-117 | WebView2 portal → localStorage → host migration | — | — | N/A | N/A | FULL | N/A | KEEP | Med |
| OFFICE-118 | WebView2 portal → Portal data import/export | — | — | N/A | MISSING | FULL | MISSING | KEEP | Low |
| OFFICE-119 | Host bridge → `get_path` / `browse_folder` | — | — | N/A | N/A | FULL | N/A | KEEP | Low |
| OFFICE-120 | Host bridge → Request/response correlation | — | — | N/A | N/A | FULL | N/A | KEEP | Low |
| OFFICE-121 | Document scanning → Scan from attached scanner | — | — | MISSING | MISSING | FULL | MISSING | KEEP (desktop-only) | Low |
| OFFICE-122 | WhatsApp actions → Templated WhatsApp send | — | — | MISSING | MISSING | FULL | MISSING | KEEP (desktop-only) + consider web parity | Low |
| OFFICE-123 | Social sharing → Share to WhatsApp / X / Facebook / Instagram | — | — | MISSING | MISSING | FULL | MISSING | KEEP | Low |
| OFFICE-124 | App integrity → Signed protected-file manifest | — | — | MISSING | MISSING | FULL | MISSING | KEEP + IMPROVE (report attestation to web) | Med |
| OFFICE-125 | Email → SMTP outbound from the desktop | — | — | N/A | MISSING | FULL | MISSING | KEEP | Low |
| RADAR-001 | Radar semantics → **The two radars are different products** | — | — | PARTIAL | CONTRACT MISMATCH | FULL | PARTIAL | MERGE INTO NEW SYSTEM (must keep both) | High |
| RADAR-002 | Office coordinates → Origin point of a scan | — | — | PARTIAL | PARTIAL | MISSING | PARTIAL | KEEP + IMPROVE | Med |
| RADAR-003 | Radius → Radius parameter and cap | — | — | FULL | FULL | MISSING | FULL `tests/integrations-radar… | KEEP | Low |
| RADAR-004 | Nearby matching → Haversine distance | — | — | FULL | FULL | N/A | FULL `tests/integrations-radar… | KEEP | Low |
| RADAR-005 | Nearby matching → Full-table scan, filtered in JS | — | — | REGRESSION | REGRESSION (O(n) per scan; unbounded memory) | N/A | PARTIAL | FIX REGRESSION | High |
| RADAR-006 | Nearby matching → Country filter is inconsistent | — | — | REGRESSION | REGRESSION | N/A | MISSING | FIX REGRESSION | Med |
| RADAR-007 | Nearby matching → Geo columns are bolted on | — | — | PARTIAL | PARTIAL | PARTIAL | MISSING | KEEP + IMPROVE | High |
| RADAR-008 | Nearby matching → **Coordinate-system mismatch** | — | — | MISSING | CONTRACT MISMATCH | FULL | MISSING | RESTORE (add a projection/normalisation layer) | High |
| RADAR-009 | Nearby matching → Office-pushed properties can never be geo-matched | — | — | REGRESSION | REGRESSION | N/A | MISSING | FIX REGRESSION | High |
| RADAR-010 | Nearby matching → Scan targets | — | — | FULL | FULL | PARTIAL | FULL `tests/integrations-radar… | KEEP | Low |
| RADAR-011 | Scan history → Query log | — | — | FULL | FULL | N/A | FULL `tests/integrations-radar… | KEEP | Low |
| RADAR-012 | Scan history → Results are not persisted | — | — | REGRESSION | REGRESSION | FULL | MISSING | RESTORE | High |
| RADAR-013 | Deduplication → Web-side dedup of repeat matches | — | — | MISSING | MISSING | FULL | MISSING | RESTORE | High |
| RADAR-014 | Deduplication → Generic notification dedup could be reused | — | — | PARTIAL | PARTIAL | N/A | MISSING | RESTORE | High |
| RADAR-015 | New-property event → Event on new nearby property | — | — | MISSING | MISSING | PARTIAL (local, on-demand) | PARTIAL (event name exists onl… | RESTORE | High |
| RADAR-016 | Background processing → Server-side periodic scan | — | — | MISSING | MISSING | PARTIAL | MISSING | RESTORE | High |
| RADAR-017 | Desktop notification → Radar match → desktop toast | — | — | N/A | MISSING | FULL | MISSING | RESTORE (web-originated variant) | High |
| RADAR-018 | Web notification → Radar match → web/in-app notification | — | — | MISSING | MISSING | N/A | MISSING | RESTORE | High |
| RADAR-019 | Preferences → Radar preferences / saved criteria | — | — | MISSING | MISSING | PARTIAL | MISSING | RESTORE | Med |
| RADAR-020 | Tolerance percentage → Price tolerance matching | — | — | c.price>p |  | o.push(…)`; UI label `radar.smart.tolerance` with `(h*100).toFixed(0)`, algorithm blurb rendered with `percent:20`); persisted as `AkarDB.sqlite Settings.RadarTolerancePct`; `inv/dll_strings.txt:2908,5845,8306,9488` | FULL (desktop) | N/A | MISSING |
| RADAR-021 | Match scoring → Match score | — | — | MISSING | MISSING | FULL | MISSING | RESTORE | Med |
| RADAR-022 | Match filters → Type / city / lifecycle gate | — | — | MISSING | REGRESSION (filters accepted but ignored) | FULL | MISSING | FIX REGRESSION | Med |
| RADAR-023 | Match action → Act on a match | — | — | MISSING | MISSING | FULL | MISSING | KEEP (desktop) + RESTORE (web) | Med |
| RADAR-024 | Lead radar → Public-lead radar / co-broking claims | — | — | MISSING | MISSING | FULL | MISSING | RESTORE | High |
| RADAR-025 | Radar UI (web) → Office radar page is unauthenticated against a de… | — | — | REGRESSION | BROKEN | N/A | MISSING | FIX REGRESSION | High |
| RADAR-026 | Radar UI (web) → Hard-coded default origin | — | — | PARTIAL | PARTIAL | N/A | MISSING | KEEP + IMPROVE | Low |

## Admin, Analytics, Search, Favorites, Reviews (AB, AC, AA, Y, Z)
*ROUND-1 (V2 lineage)*

| ID | Feature | V1 depth | V1 | Old V2 | Current V2 | Desktop | Tests | Decision | Risk |
|---|---|---|---|---|---|---|---|---|---|
| ADMIN-001 | Overview / statistics dashboard → `/admin` landing | — | — | FULL | **PARTIAL · AUTHZ DEFECT** — `app/admin/page.tsx:7` calls only `requireSessionUser("/admin")`; there is **no `ADMIN_DASHBOARD_VIEW` check on the page**, so any logged-in user renders the admin shell (data 403s, but the layout, sidebar and identity card render) | FULL | `tests/command-center.test.mjs… | FIX REGRESSION | High |
| ADMIN-002 | Command Center → 10-section metric console | — | — | MISSING | **BETTER THAN OLD** for 8 sections; see ANLY-013 for the hardcoded `health` block and ANLY-005 for `totalConversions: 0` | NOT APPLICABLE | `tests/command-center.test.mjs… | KEEP + IMPROVE | Med |
| ADMIN-003 | Users → platform user CRUD | — | — | PARTIAL | **PARTIAL — mislabelled.** The "Users" screen manages `sponsor_access` (advertiser-portal access rows), **not** the platform `users` table. `app/api/advertiser-access/route.ts:34-40` reads `sponsor_access`. There is **no admin CRUD for platform members at all** — no suspend, no ban, no email/password reset, no delete | FULL (desktop has real user mgmt) | none | RESTORE | High |
| ADMIN-004 | Roles → permission matrix | — | — | FULL | **REGRESSION · AUTHZ** — `app/admin/roles/page.tsx:1-5` is **3 lines with no `requireSessionUser` and no `PermissionGuard`**; the old page had both (`hist/old-tag/app/admin/roles/page.tsx:9-13`). Anyone, including anonymous, can load `/admin/roles` and read the whole permission matrix | PARTIAL | none | FIX REGRESSION | High |
| ADMIN-005 | Roles → assign a role to a user | — | — | MISSING | **BROKEN** — also `loadUsers` (`roles-admin-client.tsx:164-169`) expects `{users, assignableRoles}` but the route returns `{success, data: adminRoles[]}` (`app/api/admin/roles/route.ts:10-11`) → the Users tab is always empty and `canManage` is always false | FULL | none | FIX REGRESSION | High |
| ADMIN-006 | Roles → second RBAC store | — | — | MISSING | **DUPLICATE + SECURITY** — runtime permissions come **only** from `ROLE_CATALOG` via `permissionsForSessionRole` (`lib/auth/identity-map.ts:16-21`); the `admin_roles` tables are never read by the authz path. Meanwhile both write routes gate on `getSession()` alone (`roles/route.ts:19`, `assign/route.ts:9,26`) — **any authenticated user can create an admin role with arbitrary `permissions` and assign it to anyone** | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | High |
| ADMIN-007 | Permissions → permission catalogue | — | — | FULL | **PARTIAL** — catalogue is a compile-time constant; there is no way to create a permission, edit a role's permission set, or grant a one-off permission to a user. All 8 `OFFICE_*` permissions are granted to **no role at all** (only `super_admin`'s `"*"`), so `/admin/integration` is super-admin-only in practice | FULL | none | KEEP + IMPROVE | Med |
| ADMIN-008 | Permissions → geo/module scoping | — | — | MISSING | **STUB — stored but never enforced.** `hasScopedPermission` (`src/constants/permissions.ts:105-114`) `return true` at `:112-113` regardless of scope, and it has **zero callers** anywhere in `app/`, `lib/`, `src/`. `moderator_scopes` is read by nothing except the admin CRUD itself | NOT APPLICABLE | none | FIX REGRESSION | High |
| ADMIN-009 | Ranks → reputation levels (new→promax) | — | — | MISSING | **PARTIAL — API only.** A super-admin can `manualOverride` a rank via raw HTTP; there is no admin screen, no rank list, no distribution view in the admin shell. See REV-013 for the duplicate threshold table | NOT APPLICABLE | `tests/amrs/amrs5-policy.test.… | KEEP + IMPROVE | Med |
| ADMIN-010 | Verifications → verification review queue | — | — | MISSING | **MISSING (UI)** — the queue is fully implemented server-side with `canReview` + `CANNOT_REVIEW_OWN_SUBJECT` self-review guard (`[id]/route.ts:24,51`) and is **unreachable from any screen** | NOT APPLICABLE | `tests/organizations-verificat… | RESTORE | High |
| ADMIN-011 | Properties → listing moderation (approve/reject) | — | — | MISSING | **MISSING (UI)** — properties are created with `status:'pending_review'` (`app/api/properties/[id]/submit/route.ts:81`) and **nothing in the admin shell lists them**. The moderation API exists and is unreachable | FULL | none | RESTORE | High |
| ADMIN-012 | Property taxonomy → categories / types / attributes | — | — | MISSING | **FULL** — writes `audit_logs` on every mutation (`taxonomy/create/route.ts:11`) | FULL | none | KEEP | Low |
| ADMIN-013 | Offer types → sale/lease/auction offer types | — | — | MISSING | **PARTIAL · AUTHZ DEFECT + UNREACHABLE** — `app/api/admin/offer-types/route.ts:21,49` check only `getSession(...)`; **any logged-in user can create or PATCH an offer type**, which drives contract templates and the property search filter. The page is reachable only by typing the URL | PARTIAL | none | FIX REGRESSION | High |
| ADMIN-014 | Land → parcels / FindMyLand admin | — | — | MISSING | **MISSING** — the whole Land/FindMyLand vertical has zero admin surface | FULL | none | NEW IMPROVEMENT | Med |
| ADMIN-015 | AMRS → organizations admin console | — | — | MISSING | **MISSING (UI)** — a complete AMRS admin backend with bulk actions is unreachable from the admin shell | NOT APPLICABLE | `tests/organizations-hardening… | RESTORE | High |
| ADMIN-016 | Service providers → approve / suspend / review providers | — | — | MISSING | **FULL** | PARTIAL | `tests/services-authz.test.mjs` | KEEP | Low |
| ADMIN-017 | Services → service listings admin | — | — | MISSING | **MISSING** — listings can only be removed indirectly and, in practice, not at all | NOT APPLICABLE | none | RESTORE | Med |
| ADMIN-018 | Service categories → category tree CRUD | — | — | MISSING | **FULL** | PARTIAL | `tests/services-api.test.mjs` | KEEP | Low |
| ADMIN-019 | Service requests → admin view of all requests | — | — | MISSING | **MISSING** — 3 sidebar entries pointing at 404s | FULL | none | RESTORE | Med |
| ADMIN-020 | Service offers / orders → admin view of offers and jobs | — | — | MISSING | **MISSING** | FULL | none | RESTORE | Med |
| ADMIN-021 | Disputes → dispute resolution console | — | — | MISSING | **BROKEN** — the command centre counts disputes (`lib/command-center/service.ts:224,328-330`) but no screen can open one, and even the user-facing dispute list fetches a 404 | NOT APPLICABLE | none | FIX REGRESSION | High |
| ADMIN-022 | Reports (abuse) → report queue + resolution | — | — | MISSING | **PARTIAL — enforcement is dead.** `moderateTarget` implements hide_review / show_review / suspend_provider / deactivate_listing / deactivate_request (`lib/services/marketplace.ts:1713-1730`), but **both** admin UIs post `{ resolution }` only and never `action` (`admin-client.tsx:147`, `supervisor/page.tsx:99`). A report can be closed with a note, never enforced | NOT APPLICABLE | NONE | none | Phase 1 |
| ADMIN-023 | Reports (analytics) → `/admin/reports` page | — | — | FULL | **PARTIAL** — half the numbers are structurally zero: the advertiser timeline and "top advertisers" read `sponsor_events` (`analytics/route.ts:32,49`) and **nothing anywhere writes `sponsor_events`** (grep for `INSERT INTO sponsor_events` → 0 hits). See ANLY-002 | FULL | none | FIX REGRESSION | High |
| ADMIN-024 | Companies → company records admin | — | — | MISSING | **PARTIAL** — the public `/companies` directory (`app/api/companies/route.ts:18-23`) has no admin management path at all | NOT APPLICABLE | none | KEEP + IMPROVE | Med |
| ADMIN-025 | Company taxonomy → company classification CRUD | — | — | MISSING | **FULL** (functionally) but gated on the *properties* permission | NOT APPLICABLE | none | KEEP + IMPROVE | Low |
| ADMIN-026 | Offices → real-estate office admin | — | — | MISSING | **MISSING** — offices are visible publicly and manageable nowhere | FULL | none | RESTORE | Med |
| ADMIN-027 | Professionals → professional-profile admin | — | — | MISSING | **MISSING** | FULL | none | NEW IMPROVEMENT | Med |
| ADMIN-028 | Organizations → org approve/reject | — | — | MISSING | **MISSING (UI)** | NOT APPLICABLE | `tests/organizations-verificat… | RESTORE | High |
| ADMIN-029 | Auctions → auction admin | — | — | MISSING | **MISSING** | NOT APPLICABLE | `tests/auctions-hardening-f1.t… | NEW IMPROVEMENT | Med |
| ADMIN-030 | Auction organizers → grant / revoke organizer capability | — | — | MISSING | **PARTIAL — gate mismatch.** The sidebar shows the link to anyone with `SETTINGS_MANAGE`, but the API hard-requires `super_admin` (`route.ts:13,62`), so non-super-admin settings managers see a link that always 403s | NOT APPLICABLE | `tests/auctions-contract-f3.te… | KEEP + IMPROVE | Low |
| ADMIN-031 | Ads → ad campaign CRUD | — | — | FULL | **BETTER THAN OLD** — but the page itself has **no `PermissionGuard`**: `app/admin/ads/page.tsx:7` is `requireSessionUser` only | FULL | `tests/ads-engine.test.mjs`, `… | KEEP + IMPROVE | Med |
| ADMIN-032 | Ads → approve / reject a creative | — | — | FULL | **FULL** — writes `audit_logs` (`approve/route.ts:55`) | NOT APPLICABLE | none | KEEP | Low |
| ADMIN-033 | Ads → creative media upload | — | — | PARTIAL | **BROKEN** — Phase-0 verified: ad-creative storage fails under Node because of the `cloudflare:workers` R2 import (see PHASE-0-BASELINE) | NOT APPLICABLE | none | FIX REGRESSION | High |
| ADMIN-034 | Advertisers → advertiser (sponsor) CRUD | — | — | FULL | **FULL** — but the list page `app/admin/advertisers/page.tsx:7-8` has **no `PermissionGuard`** while `[id]`, `new`, `requests`, `edit` all do (`:11` in each) | NOT APPLICABLE | none | KEEP + IMPROVE | Low |
| ADMIN-035 | Advertisers → advertiser access requests | — | — | FULL (also unlinked) | **PARTIAL — unreachable from navigation** | NOT APPLICABLE | none | KEEP + IMPROVE | Med |
| ADMIN-036 | Advertisers → banner management | — | — | FULL | **MISSING** | NOT APPLICABLE | none | RESTORE | Med |
| ADMIN-037 | Advertising → campaigns console (2nd ad system) | — | — | MISSING | **BROKEN + UNGATED + UNREACHABLE** | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | High |
| ADMIN-038 | Advertising → featured properties | — | — | MISSING | **BROKEN + UNGATED + UNREACHABLE** | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | High |
| ADMIN-039 | Advertising → news-ticker items | — | — | MISSING | **BROKEN + UNGATED + UNREACHABLE** | PARTIAL | none | MERGE INTO NEW SYSTEM | High |
| ADMIN-040 | Advertising → advertising overview stats | — | — | MISSING | **STUB (permanently zero) + UNGATED + UNREACHABLE** | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | High |
| ADMIN-041 | News → news article CRUD + publish | — | — | FULL | **BETTER THAN OLD** — the strongest admin module. Page-level gate is still only `requireSessionUser` (`app/admin/news/page.tsx:7`) | NOT APPLICABLE | `tests/news/*`, `tests/integra… | KEEP + IMPROVE | Low |
| ADMIN-042 | News sources → RSS/source registry + manual fetch | — | — | MISSING | **BETTER THAN OLD** | NOT APPLICABLE | `tests/news/*` | KEEP | Low |
| ADMIN-043 | News placements → where a news item appears | — | — | MISSING | **BETTER THAN OLD** | NOT APPLICABLE | `tests/news/*` | KEEP | Low |
| ADMIN-044 | Community → forum topics/posts moderation | — | — | MISSING | **MISSING** — user-generated content with zero moderation path | NOT APPLICABLE | none | RESTORE | High |
| ADMIN-045 | Knowledge → knowledge-base moderation | — | — | MISSING | **MISSING** | NOT APPLICABLE | none | RESTORE | High |
| ADMIN-046 | Vehicles → vehicle listing admin | — | — | MISSING | **STUB** — the whole vertical is a placeholder, no admin possible | NOT APPLICABLE | none | NEW IMPROVEMENT | Low |
| ADMIN-047 | Message reports → flag/moderate a private message | — | — | MISSING | **MISSING** | NOT APPLICABLE | none | NEW IMPROVEMENT | High |
| ADMIN-048 | Notifications → admin broadcast / rule editor | — | — | MISSING | **MISSING (write)** | FULL | `tests/integrations-notificati… | NEW IMPROVEMENT | Med |
| ADMIN-049 | Translations / i18n → key + value editing, version publish | — | — | `Settings.AppLanguage`, `IsEnglish` | UI yes · API yes · sidebar YES (`admin-sidebar.tsx:54`) · gate `I18N_VIEW`/`I18N_EDIT`/`I18N_PUBLISH` on the APIs (`values/route.ts:18`, `versions/route.ts:12,27`) | FULL | NONE | NONE | P2 |
| ADMIN-050 | Geo → countries / governorates / cities admin | — | — | MISSING | **MISSING** — cities are free-text strings on `properties.city` (`app/api/properties/search/route.ts:86` uses `eq`), with no admin-managed canonical list | FULL | none | RESTORE | High |
| ADMIN-051 | Currencies → currency + FX rate admin | — | — | MISSING | **MISSING (write)** — FX rates can never be updated through the product | FULL | none | RESTORE | Med |
| ADMIN-052 | Office devices / integration → device, sync, radar, delivery conso… | — | — | MISSING | **PARTIAL — read-only.** Five count tiles and five tables; **no revoke device, no rotate credential, no re-pair, no retry a dead-letter sync**. Page gate is only `requireSessionUser` (`app/admin/integration/page.tsx:7`) | FULL | `tests/integrations-*.test.mjs` | KEEP + IMPROVE | Med |
| ADMIN-053 | System settings → platform configuration | — | — | FULL | **REGRESSION — gutted from 263 lines to a placeholder** | FULL | none | RESTORE | High |
| ADMIN-054 | Subscription plans → advertiser plan catalogue | — | — | FULL | **MISSING** | PARTIAL | none | RESTORE | High |
| ADMIN-055 | Advertiser billing → contracts / invoices / payments / subscriptio… | — | — | FULL | **MISSING — six capabilities lost in one refactor** | FULL | none | RESTORE | High |
| ADMIN-056 | Audit log → admin audit viewer | — | — | MISSING | **BROKEN — wrong table.** The viewer queries **`audit_events`** (`route.ts:86-87`), which only `recordAuditEvent` (auth flows) writes (`lib/security/audit.ts:107`). **Every admin action writes `audit_logs` instead** — 15 call sites incl. `app/api/admin/ads/approve/route.ts:55`, `moderators/route.ts:103,138`, `properties/taxonomy/create/route.ts:11`, `lib/services/audit.ts:17`. The admin audit page can never show a single admin action | NOT APPLICABLE | `tests/audit-log.test.mjs` cov… | FIX REGRESSION | High |
| ADMIN-057 | Audit log → number of parallel audit systems | — | — | FULL | **DUPLICATE ×4** | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | High |
| ADMIN-058 | Health / monitoring → system status console | — | — | MISSING | **STUB — displayed from hardcoded values.** `status:"healthy"`, `database:"healthy"`, `email:"degraded"`, `schemaMode:"unknown"`, `uptime:"unknown"` are literals; `realtime` is derived from `COUNT(*) FROM office_radar_queries > 0` (`:391`) and `officeIntegration` from a device count (`:392`) — neither measures availability | NOT APPLICABLE | `tests/command-center.test.mjs… | FIX REGRESSION | High |
| ADMIN-059 | Moderators → moderator roster | — | — | MISSING | **PARTIAL** — roster + scope CRUD work; the scopes they create are never enforced (ADMIN-008) | NOT APPLICABLE | none | KEEP + IMPROVE | Med |
| ADMIN-060 | Admin navigation → the sidebar itself | — | — | PARTIAL | **DUPLICATE ×3** — two admin pages render a *second* sidebar nested inside the first, with a different (English, 8-item) menu | NOT APPLICABLE | `tests/public-navigation-const… | MERGE INTO NEW SYSTEM | Med |
| ADMIN-061 | Admin routing → empty `(admin)` route group | — | — | MISSING | **DEAD SCAFFOLDING** — a second admin layout with zero routes | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| ANLY-001 | Property views → collection + storage + display | — | — | MISSING | **STUB — collected, stored, never displayed.** No owner dashboard, no admin panel, no command-centre metric reads `properties.views`; only `sortBy=views` in `app/api/properties/search/route.ts:95` consumes it | NOT APPLICABLE | none | KEEP + IMPROVE | Med |
| ANLY-002 | Property inquiries → lead capture metric | — | — | MISSING | **INTENDED ONLY — declared, never written, never read** | FULL | none | RESTORE | Med |
| ANLY-003 | Services metrics → marketplace KPIs | — | — | MISSING | **BETTER THAN OLD** — the most complete analytics section | NOT APPLICABLE | `tests/command-center.test.mjs… | KEEP | Low |
| ANLY-004 | Provider metrics → per-provider performance | — | — | MISSING | **STUB — orphan API, never rendered** | NOT APPLICABLE | none | KEEP + IMPROVE | Low |
| ANLY-005 | Ad impressions → collection → display | — | — | FULL | **FULL** | FULL | `tests/ads-engine.test.mjs` | KEEP | Low |
| ANLY-006 | Ad clicks → collection → display | — | — | FULL | **FULL** | FULL | `tests/ads-engine.test.mjs` | KEEP | Low |
| ANLY-007 | Ad conversions → conversion tracking | — | — | MISSING | **PARTIAL — two defects.** (a) **nothing in the frontend calls `/api/ads/conversion`** (grep across `app/**/*.tsx`, `src/**` → 0 hits), so the counter never moves; (b) the command centre **hardcodes** `totalConversions: 0` (`lib/command-center/service.ts:302`) instead of reading the column it already has | NOT APPLICABLE | none | FIX REGRESSION | Med |
| ANLY-008 | Advertiser (sponsor) impressions/clicks → legacy advertiser event … | — | — | FULL | **REGRESSION — the writer was deleted, the readers were kept.** "انطباعات المعلنين" / "نقرات المعلنين" tiles (`reports-admin-client.tsx:33-34`) and the top-advertisers panel (`:118-122`) are permanently zero | NOT APPLICABLE | none | FIX REGRESSION | High |
| ANLY-009 | Ad analytics → third parallel stack | — | — | MISSING | **DEAD DUPLICATE** — a third ad-analytics stack alongside `ad_events` and `sponsor_events` | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| ANLY-010 | News analytics → impressions / visible-impressions / clicks | — | — | MISSING | **BETTER THAN OLD — the only end-to-end analytics loop in the product** (collect → validate → aggregate → display, with valid/invalid event split) | NOT APPLICABLE | `tests/news/*` | KEEP | Low |
| ANLY-011 | Auction metrics → bids, participants, hammer price | — | — | MISSING | **MISSING** | NOT APPLICABLE | none | NEW IMPROVEMENT | Med |
| ANLY-012 | Office integration metrics → devices, syncs, radars, deliveries | — | — | MISSING | **FULL (read)** — counts are real; there is no time series and no failure drill-down | FULL | `tests/command-center.test.mjs… | KEEP + IMPROVE | Low |
| ANLY-013 | Admin dashboards → how many admin dashboards exist | — | — | FULL | **DUPLICATE ×3 + 1 orphan pair** | FULL | none | MERGE INTO NEW SYSTEM | Med |
| ANLY-014 | Activity metrics → DAU / sessions / funnels | — | — | MISSING | **MISSING** | NOT APPLICABLE | none | NEW IMPROVEMENT | Med |
| ANLY-015 | Command-centre metric catalogue → the metric contract | — | — | MISSING | **PARTIAL** — two hand-maintained copies of the same 100-line contract; a drift here fails silently at runtime | NOT APPLICABLE | `tests/command-center.test.mjs… | KEEP + IMPROVE | Med |
| ANLY-016 | Geo intelligence → coverage gaps by city | — | — | MISSING | **NEW IMPROVEMENT (works)** — but it groups by `city_id`, a raw id, and renders it unlabelled; there is no geo admin (ADMIN-050) to give those ids names | NOT APPLICABLE | `tests/command-center.test.mjs… | KEEP + IMPROVE | Low |
| ANLY-017 | Data freshness → when metrics were computed | — | — | MISSING | **FULL** | NOT APPLICABLE | `tests/command-center.test.mjs… | KEEP | Low |
| ANLY-018 | Export → CSV/XLSX export of any report | — | — | MISSING | **MISSING** | FULL | none | NEW IMPROVEMENT | Med |
| SRCH-001 | Property search → keyword + filter search | — | — | MISSING | **PARTIAL** — 17 filter params, pagination, 4 sort keys. Weaknesses: `like()` not `ilike()` on all six text columns (`route.ts:39-44`) so keyword search is **case-sensitive**; no Arabic normalisation (أ/ا, ة/ه, ى/ي); `%q%` with no relevance ranking or index; `city`/`district` matched with `eq()` against free-text columns (`:86-87`) | FULL | none | KEEP + IMPROVE | High |
| SRCH-002 | Property search → geo / radius / map search | — | — | MISSING | **MISSING** | FULL | none | NEW IMPROVEMENT | Med |
| SRCH-003 | Land search → parcel search | — | — | MISSING | **PARTIAL** — 11 filters but **no keyword/`q` parameter at all** (`route.ts:7-21`), so a parcel cannot be found by name or plan number | PARTIAL | `tests/land/*` | KEEP + IMPROVE | Med |
| SRCH-004 | Service search → find a service / request | — | — | PARTIAL | **PARTIAL — browse only, no text search** | PARTIAL | `tests/services-api.test.mjs` | KEEP + IMPROVE | Med |
| SRCH-005 | Provider search → find a provider by skill/area | — | — | MISSING | **MISSING (text search)** — the product substitutes algorithmic matching for search | PARTIAL | `tests/services-matching.test.… | KEEP + IMPROVE | Med |
| SRCH-006 | Companies search → keyword search over companies | — | — | MISSING | **PARTIAL** — correct `ilike`, but name-only: no sector, no service, no description, no city text | NOT APPLICABLE | none | KEEP + IMPROVE | Low |
| SRCH-007 | Offices search → keyword search over offices | — | — | MISSING | **PARTIAL + DUPLICATE** — `companies/route.ts` and `offices/route.ts` are the same 41-line file with one predicate changed | FULL | none | MERGE INTO NEW SYSTEM | Low |
| SRCH-008 | Professionals search → find a professional | — | — | MISSING | **MISSING** | FULL | none | NEW IMPROVEMENT | Med |
| SRCH-009 | Community search → search forum topics/posts | — | — | MISSING | **MISSING** — and unbounded: every topic is returned on every request | NOT APPLICABLE | none | NEW IMPROVEMENT | Med |
| SRCH-010 | Knowledge search → search the knowledge base | — | — | MISSING | **MISSING** | NOT APPLICABLE | none | NEW IMPROVEMENT | Med |
| SRCH-011 | Vehicles search → search vehicle listings | — | — | MISSING | **STUB** | NOT APPLICABLE | none | NEW IMPROVEMENT | Low |
| SRCH-012 | Global search → one search box across all verticals | — | — | none | MISSING | **MISSING (deliberately disabled)** — the component's own docstring says "Only rendered when a real search route exists … No new backend" (`search-trigger.tsx:5-7`) | n/a | `tests/public-navigation-constitution.test.mjs` | Phase 1 |
| SRCH-013 | Autocomplete → type-ahead on the search box | — | — | MISSING | **MISSING** | PARTIAL | none | NEW IMPROVEMENT | Med |
| SRCH-014 | Suggestions → "did you mean" / related results | — | — | MISSING | **MISSING** | NOT APPLICABLE | none | NEW IMPROVEMENT | Low |
| SRCH-015 | Recent searches → remember what I searched | — | — | MISSING | **MISSING** | NOT APPLICABLE | none | NEW IMPROVEMENT | Low |
| SRCH-016 | Saved searches → save a filter set | — | — | MISSING | **PARTIAL + DUPLICATE ×2** — both stacks read and write the same `saved_searches` table with the same user scoping | FULL | none | MERGE INTO NEW SYSTEM | Med |
| SRCH-017 | Saved searches → alerts when new matches appear | — | — | MISSING | **STUB — the toggle controls nothing** | **FULL** | none | RESTORE | High |
| SRCH-018 | Search filters → shared filter component library | — | — | MISSING | **PARTIAL — no shared filter layer**, each vertical re-implements filters | FULL | none | KEEP + IMPROVE | Med |
| FAV-001 | Favorites — properties → save a listing | — | — | MISSING | **PARTIAL** — toggle works; `useFavorites` starts every card at `isFavorite:false` and only calls `checkFavorite` lazily on first click (`:8-9,21`), so a saved property never shows as saved until you click it | NOT APPLICABLE | none | KEEP + IMPROVE | Med |
| FAV-002 | Favorites — properties → favourites list page | — | — | MISSING | **PARTIAL — always shows raw UUIDs.** The page renders `fav.property?.titleAr \ | \ | n/a | n/a | P1 |
| FAV-003 | Favorites — properties → favourites counter | — | — | MISSING | **STUB — column always 0** | NOT APPLICABLE | none | FIX REGRESSION | Low |
| FAV-004 | Favorites — services/providers → bookmark a provider or listing | — | — | MISSING | **BROKEN** — the sidebar links it (`src/config/sidebar.ts:42`), the DB is ready, the API was never written | NOT APPLICABLE | none | RESTORE | High |
| FAV-005 | Favorites — companies → save a company | — | — | MISSING | **MISSING** | NOT APPLICABLE | none | NEW IMPROVEMENT | Low |
| FAV-006 | Favorites — offices → save an office | — | — | MISSING | **MISSING** | PARTIAL | none | NEW IMPROVEMENT | Low |
| FAV-007 | Favorites — professionals → save a professional | — | — | MISSING | **MISSING** | NOT APPLICABLE | none | NEW IMPROVEMENT | Low |
| FAV-008 | Favorites — content → save a news/knowledge item | — | — | MISSING | **MISSING** | NOT APPLICABLE | none | NEW IMPROVEMENT | Low |
| FAV-009 | Favorites — vehicles → save a vehicle | — | — | MISSING | **MISSING** | NOT APPLICABLE | none | NEW IMPROVEMENT | Low |
| FAV-010 | Favorites — land → save a parcel | — | — | MISSING | **PARTIAL — the best-implemented favourites backend, with no UI page**; no `/dashboard/land/favorites` exists | NOT APPLICABLE | `tests/land/*` | KEEP + IMPROVE | Med |
| FAV-011 | Saved items — my land → "my saved parcels" store | — | — | MISSING | **STUB · DATA LOSS** — every saved parcel is lost on process restart and invisible to any other server instance | NOT APPLICABLE | `tests/land/land-flow.test.ts`… | FIX REGRESSION | High |
| FAV-012 | Favorites → unified favourites page | — | — | MISSING | **MISSING** | NOT APPLICABLE | none | NEW IMPROVEMENT | Low |
| FAV-013 | Favorites → guest → account merge | — | — | MISSING | **PARTIAL** | NOT APPLICABLE | none | KEEP + IMPROVE | Med |
| REV-001 | Reviews → leave a review on a completed job | — | — | MISSING | **FULL** | PARTIAL | `tests/services-marketplace.te… | KEEP | Low |
| REV-002 | Reviews → multi-dimension ratings | — | — | MISSING | **BETTER THAN OLD** — but the aggregate (`recomputeProviderRating`, `:1579-1595`) averages **only the overall `rating`**; the four sub-scores are stored and never aggregated or displayed | NOT APPLICABLE | none | KEEP + IMPROVE | Low |
| REV-003 | Reviews → eligibility gate | — | — | MISSING | **FULL — the strongest integrity control in the domain** | NOT APPLICABLE | `tests/services-marketplace.te… | KEEP | Low |
| REV-004 | Reviews → verified-transaction relationship | — | — | MISSING | **FULL** | PARTIAL | `tests/services-marketplace.te… | KEEP | Low |
| REV-005 | Reviews → duplicate prevention | — | — | MISSING | **FULL** | NOT APPLICABLE | none | KEEP + IMPROVE | Low |
| REV-006 | Reviews → second review endpoint | — | — | MISSING | **BROKEN DUPLICATE** — a compatibility proxy pointing at a route that was never created | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| REV-007 | Reviews → third review endpoint | — | — | MISSING | **DUPLICATE (functional)** | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| REV-008 | Reviews → read reviews | — | — | MISSING | **PARTIAL · AUTHZ** — the route has **no authentication at all** (`route.ts:7-14`); `?reviewerUserId=<email>` lets anyone enumerate everything a given person ever wrote, and user ids here are **email addresses** (`marketplace.ts:1542`), so this is an email-keyed lookup | NOT APPLICABLE | none | FIX REGRESSION | High |
| REV-009 | Reviews → abuse controls | — | — | MISSING | **FULL (reporting)** | NOT APPLICABLE | none | KEEP | Low |
| REV-010 | Reviews → moderation | — | — | MISSING | **BROKEN in practice** — no admin screen lists reviews, and the only caller path requires an `action` that neither admin UI ever sends (`app/admin/services/admin-client.tsx:147`, `app/dashboard/services/supervisor/page.tsx:99`). `src/config/sidebar.ts:92,123` link review-moderation pages that do not exist | NOT APPLICABLE | none | FIX REGRESSION | High |
| REV-011 | Reviews → reply to a review | — | — | MISSING | **MISSING** | NOT APPLICABLE | none | NEW IMPROVEMENT | Med |
| REV-012 | Aggregate reputation → provider rating average | — | — | MISSING | **FULL** | PARTIAL | none | KEEP | Low |
| REV-013 | Reputation engine → AMRS scoring + levels | — | — | MISSING | **PARTIAL — and duplicated.** `lib/services/reputation/reputation-extended.ts:8-14` declares a **second, conflicting** threshold table (`new/100/300/600/1000`) over the **same three tables** (`reputationProfiles/Evaluations/History`, `:2`); that file has **zero importers** anywhere | NOT APPLICABLE | `tests/amrs/amrs5-policy.test.… | MERGE INTO NEW SYSTEM | High |
| REV-014 | Reputation → rank ↔ review interaction | — | — | MISSING | **PARTIAL — the two systems are not wired together.** A new review changes the star average and never changes the rank | NOT APPLICABLE | none | FIX REGRESSION | Med |
| REV-015 | Provider reputation → public display | — | — | MISSING | **FULL** | PARTIAL | none | KEEP | Low |
| REV-016 | Company reputation → reviews on a company | — | — | MISSING | **MISSING** — only the AMRS *level* is shown for organizations (`app/organizations/[id]/page.tsx:54`) | NOT APPLICABLE | none | NEW IMPROVEMENT | Med |
| REV-017 | Property reviews → rate a property or its agent | — | — | MISSING | **MISSING** | NOT APPLICABLE | none | NEW IMPROVEMENT | Med |
| REV-018 | Reviews → my-reviews dashboard | — | — | MISSING | **FULL** | NOT APPLICABLE | none | KEEP | Low |

## Commercial / Legacy features recoverable from history (AD)
*ROUND-1 (V2 lineage)*

| ID | Feature | V1 depth | V1 | Old V2 | Current V2 | Desktop | Tests | Decision | Risk |
|---|---|---|---|---|---|---|---|---|---|
| COMM-LEG-001 | Subscription plan catalogue → Plan CRUD (create/list/update) | — | — | FULL | MISSING | PARTIAL | N | BLOCKED — product-owner decision required | High |
| COMM-LEG-002 | Plan quota enforcement → max_branches / max_users / max_properties… | — | — | PARTIAL (schema only, never enforced in old code either) | MISSING | NOT APPLICABLE | N | BLOCKED — product-owner decision required | Med |
| COMM-LEG-003 | Plan feature list → `features` JSON array per plan | — | — | FULL | MISSING (data seeded, unreadable) | NOT APPLICABLE | N | BLOCKED — product-owner decision required | Low |
| COMM-LEG-004 | Public plan pricing endpoint → Unauthenticated `GET /api/sponsor-p… | — | — | FULL | MISSING | NOT APPLICABLE | N | BLOCKED — product-owner decision required | Low |
| COMM-LEG-005 | Subscription lifecycle → trial/active/expired/cancelled/past_due | — | — | FULL | MISSING | PARTIAL | N | RESTORE — product-owner decision required (or explicitly supersede) | High |
| COMM-LEG-006 | Auto-renew flag → `auto_renew` boolean default true | — | — | PARTIAL (stored, no renewal job existed) | MISSING | NOT APPLICABLE | N | BLOCKED — product-owner decision required | Med |
| COMM-LEG-007 | Payment method on subscription → `payment_method` free text | — | — | PARTIAL | MISSING | FULL (desktop-only) | N | BLOCKED — product-owner decision required | Low |
| COMM-LEG-008 | Invoice register → Invoice CRUD + auto invoice number `INV-XXXXXXX… | — | — | FULL | MISSING | PARTIAL | N | RESTORE — product-owner decision required | High |
| COMM-LEG-009 | Tax on invoices → `tax_amount` + `total_amount` split | — | — | FULL | MISSING | FULL | N | BLOCKED — product-owner decision required | High |
| COMM-LEG-010 | Invoice ↔ subscription / contract links → `subscription_id`, `cont… | — | — | FULL | MISSING | FULL | N | BLOCKED — product-owner decision required | Med |
| COMM-LEG-011 | Payment register → Payment CRUD, method, reference_number | — | — | FULL | MISSING | FULL (desktop-only, richer) | N | RESTORE / MERGE INTO NEW SYSTEM — product-owner decision required | High |
| COMM-LEG-012 | Refund handling → status `refunded` | — | — | PARTIAL (status only) | MISSING | MISSING | N | BLOCKED — product-owner decision required | Med |
| COMM-LEG-013 | Advertiser contract register → Contract CRUD + auto number `CT-XXX… | — | — | FULL | MISSING | FULL (desktop-only, far richer) | N | RESTORE / MERGE INTO NEW SYSTEM — product-owner decision required | High |
| COMM-LEG-014 | Contract value + currency → `value` int, `currency` default OMR | — | — | FULL | MISSING | FULL | N | BLOCKED — product-owner decision required | High |
| COMM-LEG-015 | Advertiser document vault → Upload metadata + typed documents (CR,… | — | — | FULL (metadata only — bytes were never stored, `file_url` is caller-supplied) | MISSING | FULL (local filesystem) | N | RESTORE — product-owner decision required | Med |
| COMM-LEG-016 | Advertiser activity trail (read) → `GET /api/sponsor-activity?spon… | — | — | FULL (read-only; no write endpoint existed) | MISSING | PARTIAL | N | RESTORE — product-owner decision required | Med |
| COMM-LEG-017 | Admin/commercial action audit log → `audit_logs` written by ads, n… | — | — | FULL | REGRESSION — commercial audit trail is write-only/unsearchable | NOT APPLICABLE | P (`tests/audit-log.test.mjs`) | FIX REGRESSION — product-owner decision required on retention/visibility | High |
| COMM-LEG-018 | Sponsorship tiers → exclusive / gold / standard | — | — | FULL | FULL | PARTIAL | P | KEEP | Low |
| COMM-LEG-019 | Country-exclusive sponsorship → `country_code` + priority + placem… | — | — | FULL | FULL | NOT APPLICABLE | P | KEEP | Low |
| COMM-LEG-020 | Sponsor impression/click billing events → `POST /api/sponsor-event… | — | — | FULL | REGRESSION — reporting UI kept, the only writer removed | FULL (desktop-local only) | N | FIX REGRESSION — product-owner decision required | High |
| COMM-LEG-021 | Sponsor profile approval workflow → draft→pending→under_review→app… | — | — | FULL | FULL | NOT APPLICABLE | N | KEEP | Low |
| COMM-LEG-022 | Commercial registration + tax number capture → `commercial_registr… | — | — | FULL | FULL | FULL | N | KEEP | Low |
| COMM-LEG-023 | Advertiser sub-users (partner seats) → role viewer/editor/manager/… | — | — | FULL | PARTIAL — API kept, no admin UI | FULL | N | KEEP + IMPROVE — product-owner decision required on admin UI | Med |
| COMM-LEG-024 | Advertiser branches → Per-branch geo (country/city/district/govern… | — | — | FULL | PARTIAL — API kept, no admin UI | FULL | N | KEEP + IMPROVE — product-owner decision required | Med |
| COMM-LEG-025 | Commercial staff roles → viewer, analyst, content_editor, country_… | — | — | FULL | BETTER THAN OLD | PARTIAL | N | KEEP + IMPROVE | Low |
| COMM-LEG-026 | Orphaned commercial permissions → `advertisers.manage_contracts`, … | — | — | FULL | REGRESSION — permission is grantable but inert (false capability signal to operators) | NOT APPLICABLE | N | BLOCKED — product-owner decision required (restore the APIs, or remove the permissions) | High |
| COMM-LEG-027 | Desktop↔web office licence link → `office_links` (license_key uniq… | — | — | FULL | PARTIAL — API live, no UI, no test, no desktop caller found | FULL | N | KEEP + IMPROVE — product-owner decision required on the licensing model | High |
| COMM-LEG-028 | Licence revocation → `status` active/inactive/revoked + `revoked_a… | — | — | FULL | PARTIAL — revoke exists, no UI, **and the desktop can ignore it via offline licence** | PARTIAL | N | KEEP + IMPROVE — product-owner decision required (revocation is currently defeatable) | High |
| COMM-LEG-029 | Licence↔advertiser ownership key → `office_links.sponsor_id` | — | — | FULL | PARTIAL — naming drift between API contract and product vocabulary | n/a | N | KEEP — product-owner decision required on vocabulary | Low |
| COMM-LEG-030 | Live commercial tables with no API → 7 tables created on every boot | — | — | FULL | REGRESSION — schema retained, behaviour removed (silent capability loss, and dead DDL on every cold start) | n/a | N | BLOCKED — product-owner decision required (restore APIs or formally retire the tables) | High |
| COMM-LEG-031 | Paid-plan seed data still shipped → `seedSponsorPlans()` | — | — | FULL | REGRESSION — priced product data is created with no surface that can show or sell it | n/a | N | BLOCKED — product-owner decision required (are these the real prices?) | High |
| COMM-LEG-032 | Commercial domain model (dead-but-present) → `SponsorPlanType`, `S… | — | — | FULL | MISSING (dead-but-present) — this file is the only surviving contract-level record of the lost commercial model | n/a | N | RESTORE — product-owner decision required; preserve this file until the decision is made | High |
| COMM-LEG-033 | `lib/sponsor-auth.ts` deprecation shim → Re-exports `identity-auth… | — | — | FULL | PARTIAL — works, but the deprecation note asserts a product removal that the DB and permissions contradict | n/a | P | KEEP — product-owner decision required (the shim's premise must be confirmed) | Med |
| COMM-LEG-034 | Dead D1 commercial schema duplicate → `cur/db/schema.ts` + `cur/db… | — | — | FULL | MISSING (dead-but-present) — a complete, accurate second copy of the commercial schema | n/a | N | BLOCKED — product-owner decision required; this is the cleanest restore source | Med |
| COMM-LEG-035 | Sponsor logo upload (R2) → `POST/GET /api/sponsor-assets` with mag… | — | — | FULL | REGRESSION — upload replaced by a raw-URL field (see fragment 11, storage) | FULL | N | RESTORE / MERGE INTO NEW SYSTEM — product-owner decision required | High |
| COMM-LEG-036 | Logo upload verification round-trip → Client re-fetched the upload… | — | — | FULL | MISSING | n/a | N | RESTORE — product-owner decision required | Med |
| COMM-LEG-037 | Ad campaign monetization stack → `ad_campaigns`, `ad_creatives`, `… | — | — | FULL | BETTER THAN OLD | PARTIAL | Y (`tests/ads-engine.test.mjs`… | KEEP + IMPROVE | Low |
| COMM-LEG-038 | Second, incompatible ad system → `app/api/advertising/{match,track… | — | — | NOT APPLICABLE | BROKEN — `CREATE TABLE IF NOT EXISTS` means the ensure-path wins and the Drizzle path queries columns that do not exist | n/a | N | BLOCKED — product-owner decision required (which ad system is the product?) | High |
| COMM-LEG-039 | Ad conversion tracking → `ad_conversions`, `/api/ads/conversion` | — | — | FULL | FULL | PARTIAL | Y | KEEP | Low |
| COMM-LEG-040 | Desktop subscription service → `SubscriptionService.FetchStatusAsy… | — | — | NOT APPLICABLE | **MISSING — commercial capability with NO web counterpart** | FULL | N | RESTORE / MERGE INTO NEW SYSTEM — product-owner decision required | High |
| COMM-LEG-041 | Desktop sync endpoint → `https://akar-promax.com/api/program/sync` | — | — | NOT APPLICABLE | MISSING | FULL | N | RESTORE / MERGE INTO NEW SYSTEM — product-owner decision required (reconcile with `/api/office/v1/*`) | High |
| COMM-LEG-042 | Offline licence → `OfflineLicenseService`, `OfflineLicenseRecord`,… | — | — | NOT APPLICABLE | MISSING | FULL | N | BLOCKED — product-owner decision required (offline licence defeats web revocation, COMM-LEG-028) | High |
| COMM-LEG-043 | Trial period → `CreateTrial`, `TrialDays`, `isTrial`, `daysRemaini… | — | — | NOT APPLICABLE | MISSING | FULL | N | BLOCKED — product-owner decision required | High |
| COMM-LEG-044 | Activation code flow → `ActivationView`, `ActivationViewModel`, `A… | — | — | NOT APPLICABLE | MISSING | FULL | N | BLOCKED — product-owner decision required | High |
| COMM-LEG-045 | Subscription lock / warning UI → `GetSubscriptionLockMessage`, `Li… | — | — | NOT APPLICABLE | MISSING | FULL | N | BLOCKED — product-owner decision required | Med |
| COMM-LEG-046 | Office treasury → `Treasury` (Type, Amount, TransactionDate, Descr… | — | — | NOT APPLICABLE | MISSING | FULL | N | BLOCKED — product-owner decision required | Med |
| COMM-LEG-047 | Agency ledger → `AgencyLedger` (EntryType, Amount, BaseAmount, Tax… | — | — | NOT APPLICABLE | MISSING | FULL | N | BLOCKED — product-owner decision required | Med |
| COMM-LEG-048 | Client ledger + running balance → `ClientLedger` (…, BalanceAfter,… | — | — | NOT APPLICABLE | MISSING | FULL | N | BLOCKED — product-owner decision required | Med |
| COMM-LEG-049 | Staff commission engine → `StaffCommissions` (TotalCommission, Lis… | — | — | NOT APPLICABLE | MISSING | FULL | N | BLOCKED — product-owner decision required | High |
| COMM-LEG-050 | Co-broking commission split → `CoBrokingRequests` (CommissionSplit… | — | — | NOT APPLICABLE | MISSING | FULL | N | BLOCKED — product-owner decision required (closest thing to an affiliate/marketer programme found anywhere) | High |
| COMM-LEG-051 | Lead claiming (paid lead distribution) → `PublicLeads` + `LeadClai… | — | — | NOT APPLICABLE | PARTIAL | FULL | N | MERGE INTO NEW SYSTEM — product-owner decision required | Med |
| COMM-LEG-052 | Tax & fee type catalogue → `TaxFeeTypes` (Name, Code, ApplyMethod,… | — | — | NOT APPLICABLE | MISSING | FULL | N | BLOCKED — product-owner decision required | Med |
| COMM-LEG-053 | Instalment plans → `RentInstallments`, `SaleInstallments`, `Proper… | — | — | NOT APPLICABLE | MISSING | FULL | N | BLOCKED — product-owner decision required | Med |
| COMM-LEG-054 | Post-dated cheques → `PostDatedChecks` (CheckNumber, BankName, Due… | — | — | NOT APPLICABLE | MISSING | FULL | N | BLOCKED — product-owner decision required | Low |
| COMM-LEG-055 | Full contract engine → `Contracts` (56 cols), `SaleContracts` (41 … | — | — | NOT APPLICABLE | **STUB / MISSING** — generates a contract that is returned once and then lost | FULL | N | BLOCKED — product-owner decision required | High |
| COMM-LEG-056 | E-signature with evidence → `ESignatures` (SignerRole, IPAddress, … | — | — | NOT APPLICABLE | PARTIAL (auctions only) | FULL | Y (`tests/auctions-contract-f3… | MERGE INTO NEW SYSTEM — product-owner decision required | High |
| COMM-LEG-057 | Powers of attorney → `PowersOfAttorney` (PoAType, PoANumber, Expir… | — | — | NOT APPLICABLE | MISSING | FULL | N | BLOCKED — product-owner decision required | Med |
| COMM-LEG-058 | Maintenance ticket costing → `MaintenanceTickets` (EstimatedCost, … | — | — | NOT APPLICABLE | MISSING | FULL | N | BLOCKED — product-owner decision required | Low |
| COMM-LEG-059 | Agency tier setting → `Settings.AgencyTier` | — | — | NOT APPLICABLE | MISSING | FULL | N | BLOCKED — product-owner decision required (reconcile with COMM-LEG-001/018) | Med |
| COMM-LEG-060 | Points / tokens / credits → — | — | — | coupon | paywall | affiliate"` over `cur/{app,lib,src,components}`, `hist/old-tag`, `hist/old-main` returns only: `lib/services/leads/lead.service.ts:170` (`lead.source === 'referral'` — a lead-source label, not a programme) and desktop `Payment Voucher` (`inv/dll_strings.txt:5659`, a printed payment slip) | PARTIAL (print voucher only) | N | n/a |
| COMM-LEG-061 | Supplier / product marketplace → RFQ, quotes, price modes | — | — | MISSING | MISSING (documented intent only) | MISSING | N | BLOCKED — product-owner decision required | Low |
| COMM-LEG-062 | Declared "billing-off" pricing model → platform fee 0 on every sur… | — | — | NOT APPLICABLE | INTENDED ONLY — and **contradicted by COMM-LEG-030/031**: priced plan rows are actively seeded into the live DB | n/a | N | BLOCKED — product-owner decision required (resolve doc-vs-DB contradiction) | High |
| COMM-LEG-063 | Sponsored-visibility labelling rule → "Sponsored visibility must r… | — | — | NOT APPLICABLE | INTENDED ONLY | n/a | N | BLOCKED — product-owner decision required | Med |
| COMM-LEG-064 | Public "no checkout" statement → Public copy states there is no ch… | — | — | NOT APPLICABLE | FULL (copy is live) | n/a | N | KEEP — product-owner decision required if COMM-LEG-001/005/008 are restored | Med |
| COMM-LEG-065 | Service marketplace money fields → `service_offers.price`, `servic… | — | — | FULL | FULL | NOT APPLICABLE | Y (`tests/services-api.test.mj… | KEEP | Low |
| COMM-LEG-066 | Zero test coverage for the commercial layer → — | — | — | n/a | n/a | n/a | n/a | n/a | P1 |

## V1 Messaging & Notifications — platform core
*ROUND-2 (V1 + desktop C# source)*

| ID | Feature | V1 depth | V1 | Old V2 | Current V2 | Desktop | Tests | Decision | Risk |
|---|---|---|---|---|---|---|---|---|---|
| V1-MSG-001 | Conversation entity → `conversations` table | L4 | FULL | MISSING | FULL | NOT APPLICABLE | NONE | MERGE INTO NEW SYSTEM | High |
| V1-MSG-002 | Conversation type → private 1:1 | L4 | FULL | MISSING | PARTIAL | NOT APPLICABLE | NONE | MERGE INTO NEW SYSTEM | High |
| V1-MSG-003 | Conversation type → group chat | L3 | PARTIAL | MISSING | MISSING | NOT APPLICABLE | NONE | RESTORE | High |
| V1-MSG-004 | Group management → create / rename / add / remove | L2 | MISSING | MISSING | MISSING | NOT APPLICABLE | NONE | PRODUCT OWNER DECISION | Med |
| V1-MSG-005 | Participants → membership table | L4 | FULL | MISSING | PARTIAL | NOT APPLICABLE | NONE | MERGE INTO NEW SYSTEM | High |
| V1-MSG-006 | Participants → per-participant role | L2 | STUB | MISSING | STUB | NOT APPLICABLE | NONE | RESTORE | Med |
| V1-MSG-007 | Participants → leave / hide conversation | L2 | STUB | MISSING | STUB | NOT APPLICABLE | NONE | RESTORE | Low |
| V1-MSG-008 | Participants → per-participant read watermark | L2 | STUB | MISSING | PARTIAL | NOT APPLICABLE | NONE | MERGE INTO NEW SYSTEM | High |
| V1-MSG-009 | Contextual conversations → entity-bound threads | L0 | MISSING | MISSING | PARTIAL | NOT APPLICABLE | PARTIAL | KEEP + IMPROVE (V2 wins) | High |
| V1-MSG-010 | Conversation creation → start a new conversation | L0 | MISSING | MISSING | BROKEN | NOT APPLICABLE | PARTIAL | RESTORE | High |
| V1-MSG-011 | Conversation list → inbox payload on connect | L4 | FULL | MISSING | PARTIAL | NOT APPLICABLE | NONE | MERGE INTO NEW SYSTEM | High |
| V1-MSG-012 | Conversation list → last-message preview | L4 | FULL | MISSING | MISSING | NOT APPLICABLE | NONE | RESTORE | Med |
| V1-MSG-013 | Conversation list → activity ordering | L4 | FULL | MISSING | PARTIAL | NOT APPLICABLE | NONE | MERGE INTO NEW SYSTEM | Med |
| V1-MSG-014 | Conversation list → filter conversations by name | L1 | PARTIAL | MISSING | MISSING | NOT APPLICABLE | NONE | RESTORE | Low |
| V1-MSG-015 | Send → `send-message` over WebSocket | L4 | FULL | PARTIAL | FULL | NOT APPLICABLE | NONE | MERGE INTO NEW SYSTEM | High |
| V1-MSG-016 | Send → server-side validation | L1 | MISSING | PARTIAL | FULL | NOT APPLICABLE | PARTIAL | KEEP + IMPROVE (V2 wins) | High |
| V1-MSG-017 | Receive → realtime delivery | L4 | FULL | MISSING | MISSING | NOT APPLICABLE | NONE | RESTORE | High |
| V1-MSG-018 | Realtime → transport + room model | L4 | FULL | MISSING | MISSING | NOT APPLICABLE | NONE | RESTORE | High |
| V1-MSG-019 | Message types → text / image / audio / video / file / location | L3 | PARTIAL | MISSING | STUB | NOT APPLICABLE | NONE | MERGE INTO NEW SYSTEM | Med |
| V1-MSG-020 | Attachments → file / document send | L3 | PARTIAL — no upload endpoint; the whole base64 payload is persisted into `content`/`file_url` | MISSING | STUB | NOT APPLICABLE | NONE | MERGE INTO NEW SYSTEM | High |
| V1-MSG-021 | Attachments → image send + lightbox | L3 | PARTIAL | MISSING | MISSING | NOT APPLICABLE | NONE | RESTORE | Med |
| V1-MSG-022 | Attachments → voice notes | L3 | PARTIAL — recorded blob is sent as a `blob:` URL that dies with the tab; playback UI is a **static** bar with a hardcoded `0:12` (`MessageBubble.tsx:83`) | MISSING | MISSING | NOT APPLICABLE | NONE | RESTORE | Med |
| V1-MSG-023 | Compose → emoji picker | L4 | FULL | MISSING | MISSING | NOT APPLICABLE | NONE | RESTORE | Low |
| V1-MSG-024 | Reply-to → quoted reply | L2 | STUB | MISSING | MISSING | NOT APPLICABLE | NONE | RESTORE | Med |
| V1-MSG-025 | Edit message → in-place edit with ownership guard | L4 | FULL | MISSING | MISSING | NOT APPLICABLE | NONE | RESTORE | Med |
| V1-MSG-026 | Edit message → edited marker | L3 | PARTIAL — the flag is stored but `fmtMsg` (`chat-server.ts:508-522`) never emits it, so it survives only in the editor's own optimistic state | MISSING | MISSING | NOT APPLICABLE | NONE | FIX REGRESSION | Low |
| V1-MSG-027 | Delete message → soft delete with ownership guard | L4 | FULL | MISSING | MISSING | NOT APPLICABLE | NONE | RESTORE | Med |
| V1-MSG-028 | Delete message → trash / restore / purge | L1 | PARTIAL — **localStorage only** (`chat_trash_all`); restore re-renders the bubble locally and never un-deletes the server row | MISSING | MISSING | NOT APPLICABLE | NONE | PRODUCT OWNER DECISION | Med |
| V1-MSG-029 | Read receipts → per-message receipt rows | L4 | FULL | MISSING | PARTIAL | NOT APPLICABLE | NONE | MERGE INTO NEW SYSTEM | High |
| V1-MSG-030 | Read receipts → ✓ / ✓✓ rendering | L4 | FULL — but "read" means **≥1 receipt** (`chat-server.ts:518,533`), so in a group one reader satisfies it | MISSING | MISSING | NOT APPLICABLE | NONE | RESTORE | Med |
| V1-MSG-031 | Unread counts → per-conversation badge | L4 | FULL | MISSING | PARTIAL | NOT APPLICABLE | NONE | MERGE INTO NEW SYSTEM | Med |
| V1-MSG-032 | Unread counts → global unread badge | L4 | FULL | MISSING | STUB | NOT APPLICABLE | NONE | RESTORE | Med |
| V1-MSG-033 | Presence → online / offline | L4 | FULL — but broadcast to **every** socket regardless of relationship, which leaks activity metadata | MISSING | MISSING | NOT APPLICABLE | NONE | RESTORE (with scoping) | High |
| V1-MSG-034 | Presence → last seen | L2 | PARTIAL — persisted, never rendered anywhere in V1 | MISSING | MISSING | NOT APPLICABLE | NONE | RESTORE | Low |
| V1-MSG-035 | Typing → typing indicator | L4 | FULL | MISSING | MISSING | NOT APPLICABLE | NONE | RESTORE | Med |
| V1-MSG-036 | Pagination → 30-per-page + `hasMore` | L4 | FULL | PARTIAL | PARTIAL | NOT APPLICABLE | NONE | MERGE INTO NEW SYSTEM (V1 wins) | Med |
| V1-MSG-037 | Pagination → scroll-up infinite load | L4 | FULL | MISSING | MISSING | NOT APPLICABLE | NONE | RESTORE | Low |
| V1-MSG-038 | Message search → in-conversation search + highlight | L1 | PARTIAL — client-side over the ~30 loaded messages only; **encrypted history is unsearchable server-side by construction** | MISSING | MISSING | NOT APPLICABLE | NONE | RESTORE | High |
| V1-MSG-039 | Encryption at rest → AES-256-GCM on text bodies | L4 | FULL (at rest, server-held key) | MISSING | MISSING | NOT APPLICABLE | NONE | KEEP + IMPROVE | High |
| V1-MSG-040 | Encryption at rest → scope of coverage | L3 | PARTIAL | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | NONE | FIX REGRESSION | High |
| V1-MSG-041 | Encryption → end-to-end encryption | L0 | MISSING (marketing claim only) | MISSING | MISSING | NOT APPLICABLE | NONE | PRODUCT OWNER DECISION | High |
| V1-MSG-042 | Block user → block a member | L3 | PARTIAL | MISSING | MISSING | NOT APPLICABLE | NONE | RESTORE | High |
| V1-MSG-043 | Block user → block **enforcement** | L2 | BROKEN — blocking has no effect | MISSING | MISSING | NOT APPLICABLE | NONE | FIX REGRESSION | High |
| V1-MSG-044 | Block user → unblock | L3 | PARTIAL — the client's block list is `localStorage.akar_blocked`, so it does not survive a device change and never reconciles with the server table | MISSING | MISSING | NOT APPLICABLE | NONE | RESTORE | Med |
| V1-MSG-045 | Mute conversation → silence a thread's alerts | L1 | PARTIAL — **localStorage only** (`akar_muted`), per-device, never sent to the server, so server-side push is unaffected | MISSING | MISSING | NOT APPLICABLE | NONE | RESTORE | Med |
| V1-MSG-046 | Report → report a message or user | L0 | MISSING | MISSING | MISSING | NOT APPLICABLE | NONE | RESTORE | High |
| V1-MSG-047 | Moderation → moderation request record | L3 | PARTIAL — status is hard-coded `'approved'` and `reviewed_by` is the requester: **self-approval, no review workflow** | MISSING | MISSING | NOT APPLICABLE | NONE | RESTORE | High |
| V1-MSG-048 | Moderation → live oversight session | L4 | BROKEN · SECURITY | MISSING | MISSING | NOT APPLICABLE | NONE | FIX REGRESSION | High |
| V1-MSG-049 | Moderation → subject visibility of oversight | L3 | PARTIAL — `oversight-activated` is emitted **only back to the requesting socket** (`chat-server.ts:737`), never into `conv_<id>`, so the participants never actually see the banner | MISSING | MISSING | NOT APPLICABLE | NONE | FIX REGRESSION | High |
| V1-MSG-050 | Moderation → access log | L4 | FULL | MISSING | MISSING | NOT APPLICABLE | NONE | RESTORE | High |
| V1-MSG-051 | Moderation → audit-log browser | L3 | PARTIAL — the server route is correct and admin-guarded, but the page calls it on the **main API** where it does not exist (`v1/src/services/chatAdminService.ts:24-26`) → always empty | MISSING | MISSING | NOT APPLICABLE | NONE | FIX REGRESSION | Med |
| V1-MSG-052 | Admin console → conversation list + search | L1 | BROKEN — `GET /admin/conversations` does not exist on the main API (`v1/server/api/src/routes/admin.ts`) | MISSING | MISSING | NOT APPLICABLE | NONE | RESTORE | High |
| V1-MSG-053 | Admin console → read a conversation | L3 | PARTIAL | MISSING | MISSING | NOT APPLICABLE | NONE | FIX REGRESSION | High |
| V1-MSG-054 | Admin console → system / warning message into a thread | L1 | BROKEN — `POST /admin/oversight` reads `{action,targetId,details}` and **discards `message`** (`v1/server/api/src/routes/admin.ts:571-582`) | MISSING | STUB | NOT APPLICABLE | NONE | RESTORE | Med |
| V1-MSG-055 | Admin console → close / reopen a conversation | L1 | BROKEN — the route body is `res.json({success:true})` with **no persistence**; there is no `status` column on `conversations` | MISSING | MISSING | NOT APPLICABLE | NONE | PRODUCT OWNER DECISION | Med |
| V1-MSG-056 | Admin console → flag / warn a user | L1 | PARTIAL — writes an `ActivityLog` row, but the client sends `userId` while the route reads `targetId`, so the target is lost | MISSING | MISSING | NOT APPLICABLE | NONE | FIX REGRESSION | Med |
| V1-MSG-057 | Unified inbox → one merged inbox | L1 | PARTIAL — **the product idea is right and the implementation is localStorage-heavy**: chats from `localStorage.chat_conversations` (`:66-71`, a key the live `ChatContext` never writes), inquiries from `localStorage.akar_property_inquiries` (`:83-88`), appointments/quotes from `lib/artisanData` | MISSING | PARTIAL | NOT APPLICABLE | NONE | RESTORE (idea) + MERGE INTO NEW SYSTEM | High |
| V1-MSG-058 | Unified inbox → type filters + grouping + counts | L1 | PARTIAL | MISSING | MISSING | NOT APPLICABLE | NONE | RESTORE | Med |
| V1-MSG-059 | Unified inbox → cross-type unread state | L1 | PARTIAL — localStorage only | MISSING | STUB | NOT APPLICABLE | NONE | RESTORE | Med |
| V1-MSG-060 | Unified inbox → act on the item in place | L3 | PARTIAL — appointment/quote mutations go through `lib/artisanData` (local), and "Open Chat" navigates to `/?chat=<id>` which nothing handles (see V1-MSG-063) | MISSING | MISSING | NOT APPLICABLE | NONE | RESTORE | Med |
| V1-MSG-061 | Technician inbox → dispatch inbox (ringing job offers) | L4 | FULL — real API-backed (`/api/service-hub/requests/{ringing,active,:id/accept,:id/reject,:id/not-agreed,:id/complete}`) | MISSING | PARTIAL | NOT APPLICABLE | NONE | MERGE INTO NEW SYSTEM | High |
| V1-MSG-062 | Technician inbox → contact reveal on accept | L4 | FULL | MISSING | MISSING | NOT APPLICABLE | NONE | RESTORE | High |
| V1-MSG-063 | Entry points → "message this user" deep link | L1 | BROKEN — **no code anywhere reads the `chat` query parameter** (`grep "get(\"chat\")" src` → no hits) and `/messages` opens the list with no conversation preselected | MISSING | BROKEN | NOT APPLICABLE | NONE | RESTORE | High |
| V1-MSG-064 | Privacy → "disable receiving messages" | L1 | PARTIAL — **the whole check is `localStorage.akar_messaging_registry` on the *sender's own device***; the `PUT /api/auth/me` call sends `messagesDisabled` but no server code enforces it | MISSING | MISSING | NOT APPLICABLE | NONE | RESTORE (server-enforced) | High |
| V1-MSG-065 | Chat surfaces → floating widget | L4 | FULL | MISSING | MISSING | NOT APPLICABLE | NONE | RESTORE | Med |
| V1-MSG-066 | Chat surfaces → fullscreen mode | L4 | FULL | MISSING | MISSING | NOT APPLICABLE | NONE | RESTORE | Low |
| V1-MSG-067 | Chat surfaces → `/messages` page + mobile master-detail | L4 | FULL | MISSING | PARTIAL | NOT APPLICABLE | NONE | RESTORE | Med |
| V1-MSG-068 | Chat settings → per-user chat appearance | L1 | PARTIAL — localStorage only, per-device | MISSING | MISSING | NOT APPLICABLE | NONE | RESTORE | Low |
| V1-MSG-069 | Resilience → offline send fallback | L1 | PARTIAL — the message is **never queued and never retried**; it is lost on reload | MISSING | MISSING | NOT APPLICABLE | NONE | KEEP + IMPROVE | Med |
| V1-MSG-070 | Architecture → two divergent chat servers | L4 | PARTIAL | n/a | BROKEN | NOT APPLICABLE | NONE | MERGE INTO NEW SYSTEM | High |
| V1-MSG-071 | Architecture → messaging outside the ORM | L4 | PARTIAL | n/a | BROKEN | NOT APPLICABLE | NONE | MERGE INTO NEW SYSTEM | High |
| V1-MSG-072 | Architecture → chat port also serves product APIs | L4 | FULL | n/a | NOT APPLICABLE | NOT APPLICABLE | NONE | MERGE INTO NEW SYSTEM | High |
| V1-NOTIF-001 | In-app notifications → notification record | L4 | FULL | MISSING | FULL | FULL | NONE | MERGE INTO NEW SYSTEM | Med |
| V1-NOTIF-002 | In-app notifications → bilingual content | L4 | FULL | MISSING | MISSING | NOT APPLICABLE | NONE | RESTORE | High |
| V1-NOTIF-003 | In-app notifications → list API | L4 | FULL — but **no V1 frontend consumes it** (grep across `v1/src` finds no caller) | MISSING | FULL | NOT APPLICABLE | NONE | MERGE INTO NEW SYSTEM | Med |
| V1-NOTIF-004 | In-app notifications → mark one read | L4 | FULL | MISSING | FULL | FULL | NONE | KEEP | Low |
| V1-NOTIF-005 | In-app notifications → mark all read | L4 | FULL | MISSING | FULL | FULL | NONE | KEEP | Low |
| V1-NOTIF-006 | In-app notifications → unread count | L4 | FULL — no V1 UI renders it | MISSING | FULL | FULL | NONE | MERGE INTO NEW SYSTEM | Med |
| V1-NOTIF-007 | In-app notifications → deep link to the entity | L4 | FULL | MISSING | FULL | NOT APPLICABLE | NONE | KEEP | Low |
| V1-NOTIF-008 | In-app notifications → dismiss / delete | L0 | MISSING | MISSING | MISSING | FULL | NONE | RESTORE (from desktop) | Low |
| V1-NOTIF-009 | Notification events → event taxonomy | L4 | FULL | MISSING | PARTIAL | NOT APPLICABLE | NONE | MERGE INTO NEW SYSTEM | High |
| V1-NOTIF-010 | Notification events → **new-message notification** | L0 | MISSING | MISSING | PARTIAL | NOT APPLICABLE | NONE | RESTORE | High |
| V1-NOTIF-011 | Notification events → broadcast to admins | L4 | FULL | MISSING | MISSING | FULL | NONE | RESTORE | Med |
| V1-NOTIF-012 | Notification events → scheduled/cron notifications | L3 | PARTIAL — the cron runs **inside the chat process against the chat SQLite file**, so it targets `service_tenders`/`tender_bids`/`notifications` tables that live in the *API* database; the whole body is wrapped in try/catch and logs on failure | MISSING | MISSING | NOT APPLICABLE | NONE | FIX REGRESSION | High |
| V1-NOTIF-013 | Web push → subscription model | L4 | FULL | MISSING | MISSING | NOT APPLICABLE | NONE | RESTORE | High |
| V1-NOTIF-014 | Web push → subscribe / unsubscribe API | L4 | FULL | MISSING | MISSING | NOT APPLICABLE | NONE | RESTORE | High |
| V1-NOTIF-015 | Web push → browser subscribe flow | L3 | BROKEN — posts to `/api/push/subscribe` and `/api/push/unsubscribe`, which are **not mounted**; the real routes are `/api/auction-enhancements/push/*` and expect flat `{endpoint,p256dh,auth}` rather than `{endpoint,keys}` | MISSING | MISSING | NOT APPLICABLE | NONE | FIX REGRESSION | High |
| V1-NOTIF-016 | Web push → VAPID key distribution | L3 | PARTIAL — falls back to a **hard-coded placeholder key** when `VAPID_PUBLIC_KEY` is unset, so subscriptions succeed client-side and can never be delivered | MISSING | MISSING | NOT APPLICABLE | NONE | FIX REGRESSION | Med |
| V1-NOTIF-017 | Web push → delivery + self-healing | L4 | PARTIAL — `web-push` is imported with `try/catch` and silently disabled when absent (`:8,70`) | MISSING | MISSING | NOT APPLICABLE | NONE | RESTORE | Med |
| V1-NOTIF-018 | Email → transactional email + durable log | L4 | FULL — degrades to log-only when SMTP is unconfigured (`transporter` stays null, `:22-31`) | MISSING | MISSING | NOT APPLICABLE | NONE | RESTORE | High |
| V1-NOTIF-019 | Email → interest-matched digest | L4 | FULL — but the matcher loads **every active verified user** and filters in JS (`:102-113`) | MISSING | STUB | NOT APPLICABLE | NONE | RESTORE | High |
| V1-NOTIF-020 | Local alerts → new-message sound | L4 | FULL | MISSING | MISSING | NOT APPLICABLE | NONE | RESTORE | Low |
| V1-NOTIF-021 | Local alerts → desktop Notification | L3 | PARTIAL — **no code ever calls `Notification.requestPermission()` for chat**, so the guard at `:27` almost always short-circuits; the title also reads a stale `conversations` closure (`ChatContext.tsx:135`) | MISSING | MISSING | NOT APPLICABLE | NONE | FIX REGRESSION | Med |
| V1-NOTIF-022 | Local alerts → selectable ringtone | L4 | FULL — but **wired only to `PartnerDashboard`** (`v1/src/pages/PartnerDashboard.tsx:88-115`), never to chat or to the technician inbox | MISSING | MISSING | NOT APPLICABLE | NONE | MERGE INTO NEW SYSTEM | Low |
| V1-NOTIF-023 | Preferences → per-user notification preferences | L0 | MISSING | MISSING | MISSING | NOT APPLICABLE | NONE | RESTORE | High |
| V1-NOTIF-024 | Preferences → provider notification on/off + suspension | L4 | FULL | MISSING | MISSING | NOT APPLICABLE | NONE | RESTORE | High |
| V1-NOTIF-025 | Admin → broadcast composer | L1 | PARTIAL — **localStorage only** (`akar_admin_notifications`, `akar_pending_notifications`); nothing reaches the server | MISSING | MISSING | FULL | NONE | RESTORE | Med |

## V1 Advertising business engine
*ROUND-2 (V1 + desktop C# source)*

| ID | Feature | V1 depth | V1 | Old V2 | Current V2 | Desktop | Tests | Decision | Risk |
|---|---|---|---|---|---|---|---|---|---|
| V1-ADS-001 | Data model → Single flat `Ad` entity | L4 | FULL | FULL | BETTER THAN OLD | PARTIAL | none | SUPERSEDED WITH FULL PARITY | Med |
| V1-ADS-002 | Campaign CRUD → Admin create ad | L4 | FULL | FULL | FULL | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-ADS-003 | Campaign CRUD → Admin edit ad (dialog) | L4 | FULL | FULL | FULL | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-ADS-004 | Campaign CRUD → Hard delete ad | L4 | FULL | FULL | BETTER THAN OLD | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-ADS-005 | Campaign CRUD → Activate / pause toggle | L4 | FULL | FULL | FULL | NOT APPLICABLE | none | KEEP | Low |
| V1-ADS-006 | Campaign CRUD → Status lifecycle pending/active/rejected | L4 | FULL | FULL | BETTER THAN OLD | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-ADS-007 | Creative → Image creative by URL | L4 | FULL | FULL | BROKEN | PARTIAL | none | KEEP | Med |
| V1-ADS-008 | Creative → Image upload from the admin (5 MB → data URL) | L3 | PARTIAL (works, but inlines base64 into the DB row) | FULL | BROKEN | MISSING | none | SUPERSEDED WITH FULL PARITY | High |
| V1-ADS-009 | Creative → Server-side file upload path | L3 | PARTIAL (no multer middleware mounted on the ads router) | FULL | BROKEN | MISSING | none | SUPERSEDED WITH FULL PARITY | Med |
| V1-ADS-010 | Creative → Video creative | L3 | PARTIAL — renderer exists, no column on `Ad`, no admin field | FULL | BROKEN (storage) | MISSING | none | SUPERSEDED WITH FULL PARITY | Med |
| V1-ADS-011 | Creative → Creative aspect-ratio spec per placement | L4 | FULL | MISSING | PARTIAL | MISSING | none | RESTORE | Med |
| V1-ADS-012 | Creative → Aspect-ratio **enforcement** at save | L3 | **REGRESSION inside V1** — gate neutralised, specs and call sites intact | MISSING | MISSING | MISSING | none | RESTORE | Med |
| V1-ADS-013 | Creative → Measured-dimension feedback | L4 | FULL | MISSING | MISSING | MISSING | none | RESTORE | Low |
| V1-ADS-014 | Creative → Bilingual title (ar/en) | L3 | PARTIAL — English title stored in the Arabic column; reader expects `titleEn` (`GeoAdBanner.tsx:95-97`) so it never renders | FULL | FULL | MISSING | none | SUPERSEDED WITH FULL PARITY | Med |
| V1-ADS-015 | Creative → CTA text + CTA icon (emoji) | L4 | FULL | FULL | PARTIAL (no icon) | MISSING | none | KEEP + IMPROVE | Low |
| V1-ADS-016 | Creative → Per-ad accent colour | L4 | FULL | n/a | MISSING | MISSING | none | RESTORE | Med |
| V1-ADS-017 | Creative → Gradient background pair (office creatives) | L4 | FULL | MISSING | MISSING | MISSING | none | RESTORE | Med |
| V1-ADS-018 | Creative → Sponsor name on creative | L4 | FULL | FULL | MISSING | MISSING | none | RESTORE | High |
| V1-ADS-019 | Creative → Company logo / name / phone on hero slides | L3 | PARTIAL — renderer + columns exist, no admin authoring surface | MISSING | MISSING | MISSING | none | RESTORE | Med |
| V1-ADS-020 | Placement → 12 fixed layout slots `ad-slot-01…12` | L2 | PARTIAL — rendered on 34 pages but fed only by `window.updateAd` (see V1-ADS-023) | PARTIAL | FULL | MISSING | none | SUPERSEDED WITH FULL PARITY | Med |
| V1-ADS-021 | Placement → Standard page ad furniture (`PageWithAds`) | L1 | PARTIAL — furniture only, no ad source | PARTIAL | FULL (with N+1, ADS-081) | MISSING | `cur/tests/standard-public-ad-… | SUPERSEDED WITH FULL PARITY | Med |
| V1-ADS-022 | Placement → Empty-slot "Advertise here" placeholder | L4 | FULL | MISSING | FULL | MISSING | none | KEEP | Low |
| V1-ADS-023 | Placement → Imperative slot fill via `window.updateAd` | L1 | PARTIAL — the only writer for slots 01–12; not campaign-driven | MISSING | NOT APPLICABLE | MISSING | none | SUPERSEDED WITH FULL PARITY | High |
| V1-ADS-024 | Placement → 30 per-page hero placements | L4 | FULL | FULL | PARTIAL (playlist lost, ADS-024) | MISSING | none | KEEP | High |
| V1-ADS-025 | Placement → Page→placement legality map | L4 | FULL | MISSING | FULL | MISSING | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-ADS-026 | Placement → Placement inventory board | L4 | FULL | MISSING | STUB | MISSING | none | RESTORE | Med |
| V1-ADS-027 | Placement → `top` / `popup` / `between_listings` / `property_detai… | L2 | PARTIAL — authorable, undeliverable | n/a | PARTIAL | MISSING | none | MERGE INTO NEW SYSTEM | Med |
| V1-ADS-028 | Placement → `gallery_side` sponsored rail | L3 | PARTIAL — delivery + graceful fallback, placement absent from the admin taxonomy | MISSING | MISSING | MISSING | none | MERGE INTO NEW SYSTEM | Low |
| V1-ADS-029 | Delivery → Public match endpoint | L4 | FULL | FULL | FULL | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Med |
| V1-ADS-030 | Delivery → Hero match endpoint | L4 | FULL | n/a | FULL | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-ADS-031 | Delivery → Single "next ad" rotation endpoint | L3 | **BROKEN in production** — client calls a route the server does not expose | MISSING | FULL | MISSING | none | SUPERSEDED WITH FULL PARITY | Med |
| V1-ADS-032 | Delivery → Sponsor-tier ranking | L4 | FULL | FULL | PARTIAL | MISSING | none | RESTORE | High |
| V1-ADS-033 | Delivery → Tier visual treatment on the creative | L4 | FULL | FULL | MISSING | MISSING | none | RESTORE | Med |
| V1-ADS-034 | Delivery → `displayOrder` ranking | L4 | FULL | FULL | BETTER THAN OLD | PARTIAL | `cur/tests/ads-engine.test.mjs` | SUPERSEDED WITH FULL PARITY | Low |
| V1-ADS-035 | Delivery → Per-ad rotation seconds | L4 | FULL | MISSING | PARTIAL — narrower range, per-creative not per-campaign | MISSING | none | MERGE INTO NEW SYSTEM | Med |
| V1-ADS-036 | Delivery → Multi-ad rotation in one slot | L4 | FULL | MISSING | FULL | MISSING | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-ADS-037 | Delivery → Client ad cache | L4 | FULL | FULL | FULL | NOT APPLICABLE | none | KEEP | Low |
| V1-ADS-038 | Delivery → One fetch, all slots | L4 | FULL | n/a | REGRESSION vs V1 pattern | NOT APPLICABLE | none | KEEP (adopt for V2) | High |
| V1-ADS-039 | Targeting → Global vs targeted flag | L4 | FULL | MISSING | FULL | MISSING | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-ADS-040 | Targeting → Country targeting | L4 | FULL | FULL | FULL | MISSING | `cur/tests/ads-engine.test.mjs… | SUPERSEDED WITH FULL PARITY | Low |
| V1-ADS-041 | Targeting → Macro-region targeting | L4 | FULL | MISSING | PARTIAL | MISSING | none | MERGE INTO NEW SYSTEM | Med |
| V1-ADS-042 | Targeting → Governorate targeting | L4 | FULL | MISSING | PARTIAL — split across two engines under two names | MISSING | none | MERGE INTO NEW SYSTEM | Med |
| V1-ADS-043 | Targeting → City targeting | L4 | FULL | MISSING | FULL | MISSING | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-ADS-044 | Targeting → Village / neighbourhood targeting | L2 | PARTIAL — stored and authored, **never queried** (`ads.ts:29-34`) | MISSING | MISSING | MISSING | none | RESTORE | Med |
| V1-ADS-045 | Targeting → Geo-OR semantics (broaden, never exclude) | L4 | FULL | n/a | FULL (different semantics) | NOT APPLICABLE | none | PRODUCT OWNER DECISION | High |
| V1-ADS-046 | Targeting → Page targeting | L4 | FULL | MISSING | FULL | MISSING | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-ADS-047 | Targeting → Language targeting | L3 | PARTIAL — client-side only, and only `GeoAdBanner` applies it | FULL | FULL | MISSING | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-ADS-048 | Targeting → Sponsor tier as a sold product | L4 | FULL | FULL | PARTIAL | MISSING | none | RESTORE | High |
| V1-ADS-049 | Targeting → Device targeting | L0 | INTENDED ONLY | PARTIAL | FULL | MISSING | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-ADS-050 | Targeting → Radius / lat-lng targeting | L0 | INTENDED ONLY | MISSING | PARTIAL | MISSING | none | SUPERSEDED WITH FULL PARITY | Med |
| V1-ADS-051 | Targeting → Legacy `targetScope` (global/country/city) | L0 | INTENDED ONLY / dead | n/a | NOT APPLICABLE | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-ADS-052 | Scheduling → Start / end datetime flight | L3 | PARTIAL — authored and displayed, **never enforced at delivery** (`ads.ts:7-42`) | FULL | FULL | PARTIAL | none | SUPERSEDED WITH FULL PARITY | High |
| V1-ADS-053 | Scheduling → Screen-time purchase ("duration" end mode) | L3 | PARTIAL — conversion implemented, quota never enforced | MISSING | MISSING | MISSING | none | RESTORE | High |
| V1-ADS-054 | Caps → `maxViews` impression cap | L2 | PARTIAL — authored, not enforced | MISSING | FULL | MISSING | none | SUPERSEDED WITH FULL PARITY | Med |
| V1-ADS-055 | Caps → `maxClicks` click cap | L2 | PARTIAL — authored, not enforced | MISSING | FULL | MISSING | none | SUPERSEDED WITH FULL PARITY | Med |
| V1-ADS-056 | Caps → Single-condition end model ("whichever comes first") | L4 | FULL (as a UX contract) | MISSING | MISSING | MISSING | none | KEEP + IMPROVE | Med |
| V1-ADS-057 | Tracking → Impression recording | L4 | FULL | FULL | BETTER THAN OLD | FULL | none | SUPERSEDED WITH FULL PARITY | Med |
| V1-ADS-058 | Tracking → Click recording | L4 | FULL | FULL | BETTER THAN OLD | FULL | none | SUPERSEDED WITH FULL PARITY | Med |
| V1-ADS-059 | Tracking → Per-session view dedup | L4 | FULL | n/a | BETTER THAN OLD | MISSING | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-ADS-060 | Tracking → Conversion tracking | L0 | MISSING | MISSING | PARTIAL | MISSING | none | KEEP + IMPROVE (V2 capability, do not drop) | Med |
| V1-ADS-061 | Analytics → Per-ad view/click display | L4 | FULL | FULL | FULL | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-ADS-062 | Analytics → Portfolio KPI tiles | L3 | PARTIAL — computed in the browser; views/clicks read `viewCount/clickCount` while `AdItem` declares `views/clicks` (`AdminAds.tsx:142-143`), so the tiles depend on the raw API shape | MISSING | PARTIAL | NOT APPLICABLE | none | RESTORE (revenue view) | Med |
| V1-ADS-063 | Analytics → CTR | L0 | MISSING | MISSING | PARTIAL | MISSING | none | NEW IMPROVEMENT | Low |
| V1-ADS-064 | Analytics → Daily rollups / time series | L0 | MISSING | MISSING | PARTIAL | MISSING | none | KEEP + IMPROVE (V2 capability) | Low |
| V1-ADS-065 | Analytics → Generic event log | L4 | FULL (generic, not ad-specific) | FULL | PARTIAL | PARTIAL | none | MERGE INTO NEW SYSTEM | Low |
| V1-ADS-066 | Approval → Pending queue with badge count | L4 | FULL | FULL | PARTIAL | NOT APPLICABLE | none | KEEP | Low |
| V1-ADS-067 | Approval → Approve with price + note | L4 | FULL | FULL | PARTIAL | NOT APPLICABLE | none | RESTORE (price-at-approval) | High |
| V1-ADS-068 | Approval → Reject with reason | L4 | FULL | FULL | PARTIAL | NOT APPLICABLE | none | KEEP | Med |
| V1-ADS-069 | Approval → Approval notification to the advertiser | L0 | MISSING | MISSING | MISSING | MISSING | none | KEEP + IMPROVE | Med |
| V1-ADS-070 | Request flow → Public `/advertise` request page | L4 | FULL | FULL | BROKEN | NOT APPLICABLE | none | RESTORE | High |
| V1-ADS-071 | Request flow → Visual layout diagram slot picker | L4 | FULL | MISSING | MISSING | MISSING | none | RESTORE | Med |
| V1-ADS-072 | Request flow → Slot deep-link prefill | L4 | FULL | FULL | REGRESSION | MISSING | none | RESTORE | High |
| V1-ADS-073 | Request flow → Advertiser identity capture | L4 | FULL | FULL | PARTIAL (unreachable) | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Med |
| V1-ADS-074 | Request flow → Multi-image + video-URL submission | L3 | PARTIAL — files are appended to the FormData; the request handler reads only `imageUrl` (`ads.ts:151`) | MISSING | PARTIAL | MISSING | none | RESTORE | Med |
| V1-ADS-075 | Request flow → Request confirmation + reference number | L4 | FULL | MISSING | BROKEN | NOT APPLICABLE | none | RESTORE | Med |
| V1-ADS-076 | Request flow → Request → self-serve placement whitelist | L4 | FULL | FULL | REGRESSION | NOT APPLICABLE | none | RESTORE | High |
| V1-ADS-077 | Commercials → Price paid per ad | L4 | FULL | MISSING | PARTIAL | MISSING | none | KEEP + IMPROVE | High |
| V1-ADS-078 | Commercials → Advertiser CRM fields on the ad | L4 | FULL | FULL | BETTER THAN OLD | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-ADS-079 | Commercials → Advertiser account / plans / invoices / contracts | L0 | MISSING | FULL | MISSING | MISSING | none | RESTORE | High |
| V1-ADS-080 | Commercials → Ad pricing / packages page | L0 | MISSING | MISSING | MISSING | MISSING | none | PRODUCT OWNER DECISION | Med |
| V1-ADS-081 | Admin console → Tab: pending approval | L4 | FULL | FULL | FULL | NOT APPLICABLE | none | KEEP | Low |
| V1-ADS-082 | Admin console → Tab: active ads | L4 | FULL | FULL | FULL | NOT APPLICABLE | none | KEEP | Low |
| V1-ADS-083 | Admin console → Tab: other (rejected/paused/expired) | L4 | FULL | FULL | FULL | NOT APPLICABLE | none | KEEP | Low |
| V1-ADS-084 | Admin console → Tab: positions (inventory map) | L4 | FULL | MISSING | STUB | MISSING | none | RESTORE | Med |
| V1-ADS-085 | Admin console → Tab: hero slider manager | L4 | FULL | MISSING | MISSING | MISSING | none | RESTORE | Med |
| V1-ADS-086 | Admin console → Tab: desktop program ads | L3 | PARTIAL — full console, but it never writes `desktopZone`, the column the desktop endpoint filters on | MISSING | PARTIAL | PARTIAL | none | RESTORE | High |
| V1-ADS-087 | Admin console → Tab: news ticker (embedded) | L4 | FULL | MISSING | BROKEN | FULL | none | RESTORE | High |
| V1-ADS-088 | Admin console → Tab: add ad (creation wizard-in-one-page) | L4 | FULL | FULL | FULL | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-ADS-089 | Admin console → KPI header + manual refresh | L4 | FULL | FULL | FULL | NOT APPLICABLE | none | KEEP | Low |
| V1-ADS-090 | Admin console → Admin route guard | L4 | FULL | FULL | BETTER THAN OLD | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-ADS-091 | Office channel → Desktop ad zones with triggers | L2 | PARTIAL — taxonomy + admin board, no renderer, no `desktopZone` write | MISSING | PARTIAL | PARTIAL | none | MERGE INTO NEW SYSTEM | High |
| V1-ADS-092 | Office channel → `AKAR_V2` placements with inventory caps | L3 | PARTIAL — cap enforced at authoring only | MISSING | MISSING | PARTIAL | none | RESTORE | Med |
| V1-ADS-093 | Office channel → Office banner live preview | L4 | FULL | MISSING | MISSING | MISSING | none | RESTORE | Med |
| V1-ADS-094 | Office channel → Desktop ad delivery endpoint | L4 | FULL | MISSING | PARTIAL (no shipping client) | FULL | none | MERGE INTO NEW SYSTEM | High |
| V1-ADS-095 | Office channel → Desktop bulk ad sync | L4 | FULL | MISSING | PARTIAL | FULL | none | MERGE INTO NEW SYSTEM | Med |
| V1-ADS-096 | Office channel → Desktop impression/click tracking | L4 | FULL | MISSING | PARTIAL | FULL | none | MERGE INTO NEW SYSTEM | Med |
| V1-ADS-097 | Office channel → Desktop integration developer guide | L4 | FULL | MISSING | MISSING | NOT APPLICABLE | none | KEEP | Low |
| V1-ADS-098 | News ticker → Ticker item CRUD | L4 | FULL | MISSING | BROKEN | FULL | none | RESTORE | High |
| V1-ADS-099 | News ticker → Bilingual ticker copy | L4 | FULL | MISSING | PARTIAL (no admin) | FULL | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-ADS-100 | News ticker → Channel target (website / desktop / both) | L3 | PARTIAL — stored and authored; the desktop feed reads a different model (`prisma.newsTicker`, `desktop.ts:167`) and ignores `target` | MISSING | MISSING | PARTIAL | none | RESTORE | Med |
| V1-ADS-101 | News ticker → Per-page ticker targeting | L4 | FULL | MISSING | PARTIAL (no admin) | MISSING | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-ADS-102 | News ticker → Icon + colour per item | L4 | FULL | MISSING | MISSING | MISSING | none | RESTORE | Low |
| V1-ADS-103 | News ticker → Auto-generated ticker content | L4 | FULL | MISSING | MISSING | FULL | none | RESTORE | Med |
| V1-ADS-104 | News ticker → Per-page ticker settings | L3 | PARTIAL — `maxItems`/`enabled` enforced (`news-ticker.ts:10-16,27`), `refreshInterval` never used by the client | MISSING | MISSING | MISSING | none | RESTORE | Med |
| V1-ADS-105 | News ticker → Public marquee with hover pause | L4 | FULL | MISSING | PARTIAL (duplicated) | FULL | none | MERGE INTO NEW SYSTEM | Med |
| V1-ADS-106 | Hero system → Hero slideshow with per-slide duration and pause | L4 | FULL | FULL | PARTIAL | MISSING | none | KEEP + IMPROVE | Med |
| V1-ADS-107 | Hero system → Hero ad playlist (all slides of a page) | L4 | FULL | FULL | REGRESSION | MISSING | `cur/tests/ads-engine.test.mjs… | PRODUCT OWNER DECISION | High |
| V1-ADS-108 | Hero system → Hero ad placeholder with sales CTA | L4 | FULL | MISSING | PARTIAL | MISSING | none | RESTORE | Med |
| V1-ADS-109 | Hero system → Home hero: house content + paid ads merged | L4 | FULL | FULL | PARTIAL | MISSING | none | KEEP + IMPROVE | Med |
| V1-ADS-110 | Hero system → Page→hero-position resolver | L3 | PARTIAL — two divergent maps (`useHeroSliders` names `request-property_hero`, `join-founders_hero`, `partner-portal_hero` that the admin taxonomy does not offer) | MISSING | FULL | MISSING | none | MERGE INTO NEW SYSTEM | Med |
| V1-ADS-111 | Hero system → Hero fallback slides | L3 | PARTIAL — defined in the hook; `PageHeroSlideshow` renders the sales placeholder instead | MISSING | FULL | MISSING | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-ADS-112 | Hero system → "All hero imagery is ad-managed" policy | L4 | FULL | n/a | NOT APPLICABLE | NOT APPLICABLE | none | KEEP | Low |
| V1-ADS-113 | Native ads → Featured-property ad banner | L4 | FULL | MISSING | BROKEN | MISSING | none | MERGE INTO NEW SYSTEM | Med |
| V1-ADS-114 | Native ads → Featured-property page hero | L4 | FULL | MISSING | MISSING | MISSING | none | KEEP | Low |
| V1-ADS-115 | Native ads → Generic hero ad section | L4 | FULL | FULL | FULL | MISSING | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-ADS-116 | Adjacent → Marketer↔advertiser proposals and contracts | L2 | PARTIAL — UI + Prisma models; **no `/api/marketer/*` router is mounted** (`v1/server/api/src/index.ts` has no marketer route) | MISSING | MISSING | MISSING | none | PRODUCT OWNER DECISION (marketer domain, not banner ads) | Med |
| V1-ADS-117 | Ops → Dev mock ad stack | L4 | FULL (dev-only; production bypasses all mocks, `api.ts:74-76`) | n/a | NOT APPLICABLE | NOT APPLICABLE | none | KEEP | Low |
| V1-ADS-118 | Ops → API allow-list drift | L4 | **BROKEN** — any create/patch carrying `titleEn`/`targetScope`/`currency`/`lat`/`lng`/`radiusKm`/`createdBy`/`displayDurationHours` 500s | n/a | BROKEN | NOT APPLICABLE | none | FIX REGRESSION | High |
| V1-ADS-119 | Ops → No delivery-time enforcement of commercial terms | L2 | **BROKEN** — an expired, capped or rejected-but-active ad keeps serving | n/a | FULL | PARTIAL | none | SUPERSEDED WITH FULL PARITY | High |
| V1-ADS-120 | Ops → Ad test coverage | L0 | MISSING | UNKNOWN | PARTIAL | NOT APPLICABLE | **unguarded** | FIX REGRESSION | High |

## AkarProMax Office (AkarApp) — desktop capability registry, C# source verified
*ROUND-2 (V1 + desktop C# source)*

| ID | Feature | V1 depth | V1 | Old V2 | Current V2 | Desktop | Tests | Decision | Risk |
|---|---|---|---|---|---|---|---|---|---|
| DESK-001 | Local login → Username/password sign-in | L4 | FULL | OLD SOURCE REQUIRED | FULL | FULL | none | MERGE INTO NEW SYSTEM | High |
| DESK-002 | Password hashing → Salted hash at rest | L4 | FULL | OLD SOURCE REQUIRED | FULL | FULL | none | KEEP | Med |
| DESK-003 | Post-login licence gate → Subscription re-evaluated after sign-in | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | KEEP + IMPROVE | High |
| DESK-004 | User CRUD → Add / delete users | L4 | FULL | OLD SOURCE REQUIRED | PARTIAL | FULL | none | MERGE INTO NEW SYSTEM | Med |
| DESK-005 | Password reset → Admin resets a staff password | L4 | FULL | OLD SOURCE REQUIRED | FULL | FULL | none | KEEP | Low |
| DESK-006 | Role assignment → 4 fixed roles | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-007 | Coarse permissions → Substring-matched permission string | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | BROKEN | none | FIX REGRESSION | High |
| DESK-008 | Granular permissions → 9 keyed grants with audit trail | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | PARTIAL | none | RESTORE | High |
| DESK-009 | Field-level privacy flags → `HideTrueOwner`, `CanViewFinancials`, … | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | PARTIAL | none | RESTORE | Med |
| DESK-010 | Multi-tenant column → `Users.TenantId` | L0 | MISSING | OLD SOURCE REQUIRED | PARTIAL | STUB | none | PRODUCT OWNER DECISION | Med |
| DESK-011 | Branch CRUD → Add / delete branches | L3 | PARTIAL | OLD SOURCE REQUIRED | PARTIAL | FULL | none | MERGE INTO NEW SYSTEM | Med |
| DESK-012 | Branch scoping on transactions → `BranchId` on ledger/treasury/con… | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | Med |
| DESK-013 | Branch profitability report → Per-branch P&L | L1 | PARTIAL | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | Med |
| DESK-014 | Client CRUD → Create / edit / soft-delete | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-015 | Soft delete → `IsDeleted`,`DeletedAt` | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | Low |
| DESK-016 | Multiple phones → Labelled phones with WhatsApp + primary flags | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | Med |
| DESK-017 | Multiple addresses → Labelled addresses with map links | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | Med |
| DESK-018 | Address photos → Photos attached to an address | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | PARTIAL | none | RESTORE | Low |
| DESK-019 | Identity documents → ID scan, ID photo, client photo | L0 | MISSING | OLD SOURCE REQUIRED | BROKEN | FULL | none | RESTORE | High |
| DESK-020 | Company clients → CR number, tax number, company logo, manager | L0 | MISSING | OLD SOURCE REQUIRED | PARTIAL | FULL | none | MERGE INTO NEW SYSTEM | Med |
| DESK-021 | Group / family clients → Multi-member ownership groups with share … | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-022 | Client agent / attorney block → Agent identity, POA number/type/da… | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-023 | Genealogy fields → Father/mother/family name, birth date, place of… | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | Med |
| DESK-024 | Client profile screen → Consolidated 360° view | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-025 | Client timeline → Dated agent notes with rating and tags | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | Med |
| DESK-026 | Client requirements (requests) → Buy/rent requirement with budget,… | L4 | PARTIAL | OLD SOURCE REQUIRED | PARTIAL | FULL | none | MERGE INTO NEW SYSTEM | High |
| DESK-027 | Multi-district requirement → `DistrictsJson` array | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | Med |
| DESK-028 | Client offers → Client ↔ property interest with asking price | L3 | PARTIAL | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | Med |
| DESK-029 | Client ↔ property links → Related-property list on a client | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | Low |
| DESK-030 | Client document folder → Open the client's folder on disk | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | PRODUCT OWNER DECISION | Low |
| DESK-031 | Property CRUD → Create / edit / archive / delete | L4 | FULL | OLD SOURCE REQUIRED | FULL | FULL | none | MERGE INTO NEW SYSTEM | High |
| DESK-032 | Archive vs delete → Soft archive flag | L0 | MISSING | OLD SOURCE REQUIRED | PARTIAL | FULL | none | KEEP | Low |
| DESK-033 | Lifecycle state machine → 5 independent state axes | L1 | PARTIAL | OLD SOURCE REQUIRED | PARTIAL | FULL | none | PRODUCT OWNER DECISION | High |
| DESK-034 | Property bounds → Per-direction boundary with street name and width | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-035 | Survey coordinates → Point-numbered N/E survey points | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-036 | GIS polygons → Drawn/imported polygon with UTM and computed area | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-037 | KMZ import → Upload and open a Google-Earth KMZ | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | Med |
| DESK-038 | Facade directions → 4 boolean facades + street count | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | Med |
| DESK-039 | Units breakdown → Named sub-units with dimensions | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-040 | Ownership shares → Percentage ownership with POA link | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-041 | Amenities → Lookup-driven amenity list with notes | L1 | PARTIAL | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | Med |
| DESK-042 | Attachments → Typed, publicly-flaggable file attachments | L0 | MISSING | OLD SOURCE REQUIRED | BROKEN | FULL | none | RESTORE | High |
| DESK-043 | Media gallery → Images and video URLs | L4 | PARTIAL | OLD SOURCE REQUIRED | BROKEN | FULL | none | FIX REGRESSION | High |
| DESK-044 | Broker registry → Co-brokers on a listing with commission share | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-045 | Installment plan → Named installments on the property itself | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-046 | Payment-type flags → Cash / deferred / installment | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | Med |
| DESK-047 | Legal status → Restrictions, clearance certificate, issuing author… | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-048 | Court / office POA on a listing → Two authorisation document paths… | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-049 | Public disclosures → Mandatory disclosure text carried into contra… | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-050 | Commissioner block → Third-party commissioner identity and locatio… | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | Med |
| DESK-051 | Owner search & link → Search the client base and attach an owner | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-052 | Agent assignment → Listing agent and buyer agent | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-053 | Furnishing → Status + free-text description | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | Med |
| DESK-054 | Property document folder → Open the property's folder / choose a f… | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | PRODUCT OWNER DECISION | Low |
| DESK-055 | Publish to website → Field-picker upload dialog | L3 | PARTIAL | OLD SOURCE REQUIRED | MISSING | BROKEN | none | FIX REGRESSION | High |
| DESK-056 | Selective field disclosure → Per-field publish consent | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | PARTIAL | none | RESTORE | High |
| DESK-057 | Website link back → Copy / open the published property URL | L4 | BROKEN | OLD SOURCE REQUIRED | BROKEN | BROKEN | none | FIX REGRESSION | Med |
| DESK-058 | Rent contract → Full lease with period, deposit, renewal and cance… | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-059 | Rent installments → Generated schedule with payment tracking | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-060 | Contract renewal → Chain a renewal to its predecessor | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-061 | Contract cancellation → Cancel with a recorded reason | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | Med |
| DESK-062 | Deposit lifecycle → Amount, status, return date, notes, currency | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-063 | Earnest money → Amount, paid date, status, notes, currency | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-064 | Sale contract → Separate 41-column sale document | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-065 | Sale installments → Schedule on a sale contract | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-066 | Sale dialog → Guided "mark as sold" flow | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | Med |
| DESK-067 | Contract members → Additional signatories on a contract | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | Med |
| DESK-068 | Witnesses → Two witnesses with identity and ID photo | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-069 | Scanned signed contract → Attach a photo of the signed original | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-070 | E-signature → Signature image + IP + geolocation + document hash | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-071 | Contract templates → Named, typed, default-flagged bodies | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-072 | Template variables → Insert merge fields into a template | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | Med |
| DESK-073 | Template preview → Render a template before use | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | Low |
| DESK-074 | Legal clause library → Reusable typed clauses, sortable, activatab… | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | Med |
| DESK-075 | Per-contract clause set → Ordered clauses with per-contract overri… | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-076 | Smart contract builder → Guided clause-assembly screen | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-077 | Contract printing → Print contract and delegation | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-078 | Acknowledgment printing → Printable receipt-of-contract acknowledg… | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | Med |
| DESK-079 | Handover schedule → Dated handover checklist per contract | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | Med |
| DESK-080 | Contract file linking → Auto-create a document folder per contract | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | PRODUCT OWNER DECISION | Low |
| DESK-081 | Office authorisation contract → Exclusive-listing authorisation wi… | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-082 | Auth-contract link on a contract → `Contracts.AuthContractId` | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | Med |
| DESK-083 | Powers of attorney → Registry with expiry and PDF | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-084 | POA expiry sweep → Daemon marks expired POAs and raises alerts | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-085 | POA ↔ ownership link → `Ownerships.PoAId` | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | Med |
| DESK-086 | Co-broking requests → Inter-agency request with commission split | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | PARTIAL | none | RESTORE | High |
| DESK-087 | Co-broking flags on records → Property and sale-contract co-brokin… | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | Med |
| DESK-088 | Public lead pool → Externally-sourced leads with expiry | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | PARTIAL | none | RESTORE | High |
| DESK-089 | Lead claiming → Agency claims a lead, with expiry and withdrawal | L1 | MISSING | OLD SOURCE REQUIRED | MISSING | PARTIAL | none | RESTORE | High |
| DESK-090 | Max-2-claims rule → At most two live claims per lead | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | PARTIAL | none | RESTORE | Med |
| DESK-091 | Lead → contract closure → `LeadClaims.ContractId` | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | PARTIAL | none | RESTORE | Med |
| DESK-092 | Local requirement matching → Weighted score of property vs client … | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-093 | Tolerance setting → `Settings.RadarTolerancePct`, default 20 | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | Med |
| DESK-094 | Website-request matching → Match local stock against website prope… | L3 | PARTIAL | OLD SOURCE REQUIRED | MISSING | BROKEN | none | FIX REGRESSION | High |
| DESK-095 | Match persistence → `RadarMatches` with score and follow-up flags | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | PARTIAL | none | RESTORE | High |
| DESK-096 | Match review window → Within-budget vs negotiable buckets | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-097 | Maintenance tickets → Full ticket lifecycle | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-098 | Ticket state transitions → Start / resolve | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | Med |
| DESK-099 | Technician assignment → Assign from the technician directory | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | Med |
| DESK-100 | Technician directory → Verified technicians by specialty and city | L3 | PARTIAL | OLD SOURCE REQUIRED | PARTIAL | FULL | none | MERGE INTO NEW SYSTEM | Med |
| DESK-101 | Cost recovery to owner → `DeductFromOwnerLedger` + `AgencyLedgerEn… | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-102 | Treasury → Cash in/out per branch | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-103 | Agency ledger → Double-sided agency book with tax split | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-104 | Client ledger → Per-client running balance | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-105 | Rent-payment posting → One call posts ledger + treasury + commissi… | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-106 | Sale-payment posting → Same for sale contracts | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-107 | Ledger idempotency → `LedgerProcessed` guard | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | KEEP | High |
| DESK-108 | Tax & fee types → Configurable taxes with apply method | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-109 | Multi-currency → Per-field currency selection | L1 | PARTIAL | OLD SOURCE REQUIRED | PARTIAL | FULL | none | RESTORE | High |
| DESK-110 | Post-dated checks → Cheque register with clear/bounce/return | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-111 | Overdue-cheque daemon → Daily sweep raising `check_overdue` alerts | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-112 | Cheque image → Photo of the cheque | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | Med |
| DESK-113 | Vouchers → Printable receipt/payment vouchers | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-114 | Financial receipts → Client receipt with print/preview | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-115 | Staff commissions → Split between listing and buyer agents | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-116 | Collection commission → Office fee for collecting rent | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | Med |
| DESK-117 | Net-profit calculation → Monthly net profit | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | Med |
| DESK-118 | Tax report → `tax` report code | L1 | PARTIAL | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | Med |
| DESK-119 | General-ledger report → `ledger` report code | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | Med |
| DESK-120 | Report export → Excel and PDF | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | Med |
| DESK-121 | Branch filter on reports → Run any report for one branch | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | Low |
| DESK-122 | Office dashboard → KPI home screen | L4 | FULL | OLD SOURCE REQUIRED | FULL | FULL | none | KEEP + IMPROVE | Low |
| DESK-123 | Alert centre → Typed, severity-graded, dismissible alerts | L0 | MISSING | OLD SOURCE REQUIRED | PARTIAL | FULL | none | RESTORE | High |
| DESK-124 | Alert navigation → Jump from an alert to its record | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | Low |
| DESK-125 | In-app notification list → `NotificationItem` + refresh command | L0 | MISSING | OLD SOURCE REQUIRED | PARTIAL | FULL | none | MERGE INTO NEW SYSTEM | Med |
| DESK-126 | Lookup taxonomy → 19 categories, 106 items, hierarchical and sorta… | L1 | PARTIAL | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-127 | Country configuration → Per-country currency, tax, field visibilit… | L2 | PARTIAL | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-128 | Region-specific field toggle → `Settings.ShowKhanaField` | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | Low |
| DESK-129 | Office identity → Name, phone, address, tax no., CR no., logo, tier | L4 | PARTIAL | OLD SOURCE REQUIRED | PARTIAL | FULL | none | MERGE INTO NEW SYSTEM | Med |
| DESK-130 | Print layout → Margins and background image | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | Med |
| DESK-131 | Dual storage paths → Two data roots with drive-availability fallba… | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | KEEP | Med |
| DESK-132 | Documents base path → Root for client/property/contract folders | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | PRODUCT OWNER DECISION | Low |
| DESK-133 | Manual backup → Zip the DB + data root to a chosen folder | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | KEEP | High |
| DESK-134 | Scheduled local backup → Package every N minutes, copy to the auto… | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | KEEP | High |
| DESK-135 | Cloud backup upload → Multipart POST of pending ZIPs to a configur… | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | PARTIAL | none | PRODUCT OWNER DECISION | High |
| DESK-136 | Bridge backup/restore → WebUI-driven backup and restore of the dat… | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | KEEP | Med |
| DESK-137 | Cloud sync queue → Table-agnostic outbound operation queue | L1 | STUB | OLD SOURCE REQUIRED | PARTIAL | STUB | none | PRODUCT OWNER DECISION | High |
| DESK-138 | Schema self-migration → Additive DDL applied at startup | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | KEEP | Med |
| DESK-139 | HWID generation → Machine fingerprint from CPU + board + disk | L0 | MISSING | OLD SOURCE REQUIRED | PARTIAL | PARTIAL | none | KEEP + IMPROVE | High |
| DESK-140 | Licence-key activation → Offline key derived from HWID + a compile… | L4 | PARTIAL | OLD SOURCE REQUIRED | MISSING | BROKEN | none | FIX REGRESSION | High |
| DESK-141 | Key generator → Built-in key minting UI (Ctrl+Shift+6) | L4 | PARTIAL | OLD SOURCE REQUIRED | MISSING | BROKEN | none | FIX REGRESSION | High |
| DESK-142 | Signed activation coupon → HMAC-signed, HWID-bound, expiring code | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | PARTIAL | none | KEEP + IMPROVE | High |
| DESK-143 | Activation throttle → 5 attempts / 15 min, then a 30-min block | L0 | MISSING | OLD SOURCE REQUIRED | PARTIAL | PARTIAL | none | KEEP + IMPROVE | Med |
| DESK-144 | Offline licence + anti-tamper → DPAPI file + registry shadow, cloc… | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | KEEP | High |
| DESK-145 | Subscription status check → Online status with GET→POST fallback a… | L4 | PARTIAL | OLD SOURCE REQUIRED | MISSING | PARTIAL | none | FIX REGRESSION | High |
| DESK-146 | Device deactivation → Unbind this machine | L4 | PARTIAL | OLD SOURCE REQUIRED | PARTIAL | FULL | none | MERGE INTO NEW SYSTEM | High |
| DESK-147 | Device pairing client → 6-char code → `apd_` credential | L0 | MISSING | OLD SOURCE REQUIRED | FULL | BROKEN | none | FIX REGRESSION | High |
| DESK-148 | Installation identity → Persisted random GUID | L0 | MISSING | OLD SOURCE REQUIRED | FULL | PARTIAL | none | FIX REGRESSION | High |
| DESK-149 | Credential storage → 4 secrets: token, deviceId, prefix, expiry | L0 | MISSING | OLD SOURCE REQUIRED | FULL | FULL | none | KEEP | Med |
| DESK-150 | Heartbeat → Liveness ping with version headers | L0 | MISSING | OLD SOURCE REQUIRED | FULL | STUB | none | FIX REGRESSION | High |
| DESK-151 | Credential rotation → 90-day token renewal | L0 | MISSING | OLD SOURCE REQUIRED | FULL | STUB | none | FIX REGRESSION | High |
| DESK-152 | Connection-state display → `UNPAIRED` / `CREDENTIAL_EXPIRED` / `CO… | L0 | MISSING | OLD SOURCE REQUIRED | PARTIAL | STUB | none | FIX REGRESSION | Med |
| DESK-153 | AkarV2 portal window → Full-screen embedded WebView2 shell | L0 | MISSING | OLD SOURCE REQUIRED | NOT APPLICABLE | FULL | none | KEEP | Med |
| DESK-154 | localStorage ↔ file bridge → `setItem` interception + rehydration | L0 | MISSING | OLD SOURCE REQUIRED | NOT APPLICABLE | FULL | none | KEEP + IMPROVE | High |
| DESK-155 | One-shot storage migration → `__akar_bridge_migrated_v1` | L0 | MISSING | OLD SOURCE REQUIRED | NOT APPLICABLE | FULL | none | KEEP | Low |
| DESK-156 | Secret mirroring → `user_token` / `apiKey` auto-captured into DPAPI | L0 | MISSING | OLD SOURCE REQUIRED | NOT APPLICABLE | FULL | none | KEEP + IMPROVE | High |
| DESK-157 | Web diagnostics forwarding → JS errors, resource errors, rejection… | L0 | MISSING | OLD SOURCE REQUIRED | NOT APPLICABLE | FULL | none | KEEP | Low |
| DESK-158 | Data-root chooser → Native folder picker from the WebUI | L0 | MISSING | OLD SOURCE REQUIRED | NOT APPLICABLE | FULL | none | KEEP | Low |
| DESK-159 | WIA document scanning → Scan directly into the WebUI | L0 | MISSING | OLD SOURCE REQUIRED | BROKEN | FULL | none | RESTORE | Med |
| DESK-160 | Print helper → Shared print pipeline with background image | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-161 | Desktop ad banner → Bottom banner in the portal | L4 | PARTIAL | OLD SOURCE REQUIRED | PARTIAL | BROKEN | none | FIX REGRESSION | Med |
| DESK-162 | Creative disk cache → SHA-256-named cache with 12 h freshness | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | KEEP | Low |
| DESK-163 | Impression & click tracking → POST `/ads/{id}/{view\ | UNKNOWN | L4 | PARTIAL | OLD SOURCE REQUIRED | PARTIAL | no | none | Phase 2 |
| DESK-164 | Ad scheduling window → Start/end date honoured client-side | L2 | PARTIAL | OLD SOURCE REQUIRED | PARTIAL | FULL | none | KEEP | Low |
| DESK-165 | Ad campaign table → Local campaign + impression mirror | L4 | PARTIAL | OLD SOURCE REQUIRED | PARTIAL | STUB | none | PRODUCT OWNER DECISION | Low |
| DESK-166 | Desktop news ticker → Scrolling headline strip on the dashboard | L4 | BROKEN | OLD SOURCE REQUIRED | PARTIAL | FULL | none | FIX REGRESSION | Med |
| DESK-167 | Offline ticker default → Built-in Arabic welcome text | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | KEEP | Low |
| DESK-168 | Social links management → Store and edit the office's social URLs | L3 | PARTIAL | OLD SOURCE REQUIRED | PARTIAL | FULL | none | MERGE INTO NEW SYSTEM | Low |
| DESK-169 | Ad-copy generator → Compose a listing advert from a template | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | Med |
| DESK-170 | Share to WhatsApp / Facebook / Twitter / Instagram → Deep links to… | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | Low |
| DESK-171 | WhatsApp payment reminders → Per-installment reminder composer | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | High |
| DESK-172 | Bulk WhatsApp reminders → Send to every overdue tenant | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | RESTORE | Med |
| DESK-173 | Reminder daemon → Background sweep that opens reminder links | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | PARTIAL | none | KEEP + IMPROVE | Med |
| DESK-174 | App integrity check → SHA-256 manifest over shipped files | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | KEEP | Med |
| DESK-175 | Security audit log → `security.log` | L0 | MISSING | OLD SOURCE REQUIRED | PARTIAL | FULL | none | KEEP + IMPROVE | Low |
| DESK-176 | Arabic/English localisation → 197 keys per language, RTL layout | L3 | PARTIAL | OLD SOURCE REQUIRED | PARTIAL | FULL | none | KEEP | Med |
| DESK-177 | Language chooser at first run → Dedicated selection window | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | KEEP | Low |
| DESK-178 | Demo/starter data → Users, branch, lookups, contract templates, ta… | L0 | MISSING | OLD SOURCE REQUIRED | MISSING | FULL | none | KEEP | Low |

## V1 Identity, Authorization, Moderators, Rank, Membership
*ROUND-2 (V1 + desktop C# source)*

| ID | Feature | V1 depth | V1 | Old V2 | Current V2 | Desktop | Tests | Decision | Risk |
|---|---|---|---|---|---|---|---|---|---|
| V1-AUTH-001 | Registration → 3-step wizard | L4 | FULL | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | KEEP + IMPROVE | Low |
| V1-AUTH-002 | Registration → Account-type selector | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | High |
| V1-AUTH-003 | Registration → Username uniqueness | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-AUTH-004 | Registration → Structured name | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Low |
| V1-AUTH-005 | Registration → Age gate | L3 | PARTIAL (client-only) | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-AUTH-006 | Registration → Email confirmation field | L1 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | KEEP | Low |
| V1-AUTH-007 | Registration → Password strength meter | L1 | FULL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | KEEP | Low |
| V1-AUTH-008 | Registration → Server password policy | L3 | PARTIAL | NOT APPLICABLE | FULL | REFERENCE ONLY | none | FIX REGRESSION | Med |
| V1-AUTH-009 | Registration → Identity document upload | L4 | FULL | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-AUTH-010 | Registration → Portfolio images at signup | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Low |
| V1-AUTH-011 | Registration → Integrity charter acceptance | L2 | PARTIAL (written, never read) | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-AUTH-012 | Registration → Interested-cities preference | L2 | PARTIAL (never read) | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Low |
| V1-AUTH-013 | Registration → Pending-review signal | L3 | PARTIAL (nothing consumes it server-side) | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-AUTH-014 | Registration → Quick register | L0 | STUB | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | PRODUCT OWNER DECISION | Low |
| V1-AUTH-015 | Registration → Legacy path alias | L4 | FULL | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | none | KEEP | Low |
| V1-AUTH-016 | Email verification → 1-hour JWT link | L4 | FULL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-AUTH-017 | Email verification → Resend | L4 | FULL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | KEEP | Low |
| V1-AUTH-018 | Email verification → Login gate | L1 | BROKEN | NOT APPLICABLE | FULL | NOT APPLICABLE | none | FIX REGRESSION | High |
| V1-AUTH-019 | Login → Email + password | L4 | FULL | NOT APPLICABLE | FULL | REFERENCE ONLY | none | KEEP | Low |
| V1-AUTH-020 | Login → Account-status gate | L2 | BROKEN | NOT APPLICABLE | BETTER THAN OLD | REFERENCE ONLY | none | FIX REGRESSION | High |
| V1-AUTH-021 | Login → Ban reason surfaced to the user | L2 | BROKEN | NOT APPLICABLE | FULL | NOT APPLICABLE | none | RESTORE | Med |
| V1-AUTH-022 | Login → Login modal (non-navigating) | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Low |
| V1-AUTH-023 | Login → Soft auth gate component | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Low |
| V1-AUTH-024 | Login → Email prefill after signup | L1 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | KEEP | Low |
| V1-AUTH-025 | Session → JWT issuance | L4 | FULL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-AUTH-026 | Session → Token storage | L4 | REGRESSION (vs V2) | NOT APPLICABLE | BETTER THAN OLD | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | High |
| V1-AUTH-027 | Session → Role read from the token | L4 | BROKEN (stale authority) | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | FIX REGRESSION | High |
| V1-AUTH-028 | Session → Revocation / logout | L1 | MISSING | NOT APPLICABLE | FULL | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | High |
| V1-AUTH-029 | Session → Silent refresh | L3 | BROKEN | NOT APPLICABLE | FULL | NOT APPLICABLE | none | FIX REGRESSION | Med |
| V1-AUTH-030 | Session → Personal API key | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-AUTH-031 | Password → Forgot password | L4 | FULL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | KEEP | Low |
| V1-AUTH-032 | Password → Reset apply | L4 | FULL | NOT APPLICABLE | PARTIAL (side effect) | NOT APPLICABLE | none | KEEP | Low |
| V1-AUTH-033 | Password → Change password (authenticated) | L0 | MISSING | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | KEEP (V2) | Low |
| V1-AUTH-034 | Security → JWT fallback secret | NOT APPLICABLE | none | L4 END_TO_END_WIRED | BROKEN (latent) | NOT APPLICABLE | none | none | P0 |
| V1-AUTH-035 | Security → Committed signing secrets | L4 | BROKEN | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | none | FIX REGRESSION | High |
| V1-AUTH-036 | Security → Checked-in never-expiring admin JWT | L4 | BROKEN | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | none | FIX REGRESSION | High |
| V1-AUTH-037 | Security → Hardcoded mock admin credentials | L1 | BROKEN | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | none | FIX REGRESSION | High |
| V1-AUTH-038 | Security → Plaintext passwords in localStorage | L1 | BROKEN | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | none | FIX REGRESSION | High |
| V1-AUTH-039 | Security → Auth rate limiting | L4 | FULL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | KEEP | Low |
| V1-AUTH-040 | Security → Login-attempt recording | L2 | MISSING | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-AUTH-041 | Security → IP blocking | L2 | MISSING | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-AUTH-042 | Security → `lastIp` / `lastSeen` | L2 | MISSING | NOT APPLICABLE | FULL | NOT APPLICABLE | none | RESTORE | Low |
| V1-AUTH-043 | Security → CORS + CSP | L4 | FULL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | KEEP | Low |
| V1-AUTH-044 | OAuth → Google / Facebook sign-in | L0 | MISSING | NOT APPLICABLE | BROKEN | NOT APPLICABLE | none | FIX REGRESSION | High |
| V1-AUTH-045 | 2FA → TOTP second factor | L0 | MISSING | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | NEW IMPROVEMENT | Med |
| V1-AUTH-046 | Dev tooling → One-click dev login | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE (without embedded tokens) | Med |
| V1-AUTH-047 | Client architecture → Whole-API mock interception | L1 | BROKEN (masks every integration defect) | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | none | FIX REGRESSION | High |
| V1-AUTH-048 | Client architecture → Dead MSW mock layer | L0 | STUB | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | none | OLD SOURCE REQUIRED | Low |
| V1-PROF-001 | Public profile → By username | L4 | FULL | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | KEEP | Low |
| V1-PROF-002 | Public profile → Rich profile by user id | L1 | BROKEN | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | High |
| V1-PROF-003 | Own profile → Field-allowlisted update | L4 | FULL | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | KEEP | Low |
| V1-PROF-004 | Own profile → Second update endpoint | L4 | PARTIAL (duplicate) | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-PROF-005 | Portfolio → Upload item | L4 | FULL | NOT APPLICABLE | BROKEN | NOT APPLICABLE | none | RESTORE | Med |
| V1-PROF-006 | Portfolio → Delete item | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | KEEP | Low |
| V1-PROF-007 | Portfolio → Captions and ordering | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Low |
| V1-PROF-008 | Professional fields → Craft taxonomy | L4 | FULL | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-PROF-009 | Professional fields → Experience / work description / bio | L4 | FULL | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | KEEP | Low |
| V1-PROF-010 | Professional fields → Address + geo link | L4 | FULL | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | KEEP | Low |
| V1-PROF-011 | Privacy → Show phone / WhatsApp publicly, disable messages | L1 | BROKEN (no server field) | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-PROF-012 | Org → Create a company | L1 | BROKEN (localStorage only) | NOT APPLICABLE | PARTIAL | REFERENCE ONLY | none | RESTORE | High |
| V1-PROF-013 | Org → Commercial-register field | L1 | PARTIAL | FULL | REGRESSION | REFERENCE ONLY | none | RESTORE | High |
| V1-PROF-014 | Org membership → Manager role | L1 | BROKEN | PARTIAL | PARTIAL | REFERENCE ONLY | none | MERGE INTO NEW SYSTEM | High |
| V1-PROF-015 | Org membership → Add supervisor | L1 | BROKEN | PARTIAL | PARTIAL | REFERENCE ONLY | none | MERGE INTO NEW SYSTEM | High |
| V1-PROF-016 | Org membership → Supervisor permissions | L1 | BROKEN | PARTIAL | PARTIAL | **the only working implementation** | none | MERGE INTO NEW SYSTEM | High |
| V1-PROF-017 | Org membership → Remove supervisor | L1 | BROKEN | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-PROF-018 | Org context → Account switcher | L1 | PARTIAL (UI works, context is never sent to the server) | NOT APPLICABLE | MISSING | REFERENCE ONLY | none | RESTORE | High |
| V1-PROF-019 | Org context → Acting-as propagation | L1 | BROKEN | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | High |
| V1-PROF-020 | Org entity → Office record | L4 | FULL | FULL | FULL | REFERENCE ONLY | none | MERGE INTO NEW SYSTEM | Med |
| V1-PROF-021 | Org capability → `canCreateAuctions` | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-PROF-022 | Org capability → `isAuctionsBanned` | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Low |
| V1-PROF-023 | Org verification → `Office.isVerified` / `verifiedAt` | L3 | PARTIAL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-PROF-024 | Partner → Separate partner credential store | L2 | BROKEN | NOT APPLICABLE | REGRESSION | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | High |
| V1-PROF-025 | Supplier → Supplier catalogue entity | L2 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | PRODUCT OWNER DECISION | Med |
| V1-PROF-026 | Service provider → Service-hub profile | L4 | FULL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-PROF-027 | Chat identity → Shadow user table | L4 | REGRESSION (identity fork) | NOT APPLICABLE | FULL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | High |
| V1-PROF-028 | Desktop identity → Shared static signature | L4 | PARTIAL | NOT APPLICABLE | BETTER THAN OLD | REFERENCE ONLY | none | SUPERSEDED WITH FULL PARITY | Med |
| V1-PROF-029 | Desktop identity → HWID licence binding | L4 | PARTIAL | NOT APPLICABLE | MISSING | REFERENCE ONLY | none | KEEP + IMPROVE | Med |
| V1-MOD-001 | Permission catalogue → 15 permissions in 4 groups | L1 | BROKEN (never enforced) | NOT APPLICABLE | PARTIAL | REFERENCE ONLY | none | MERGE INTO NEW SYSTEM | High |
| V1-MOD-002 | Permission catalogue → Group select-all | L1 | FULL (as UI) | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | KEEP | Low |
| V1-MOD-003 | Permission catalogue → Full-admin master toggle | L1 | BROKEN (no column) | NOT APPLICABLE | FULL | REFERENCE ONLY | none | MERGE INTO NEW SYSTEM | Med |
| V1-MOD-004 | Role storage → `Role(name UNIQUE, permissions JSON)` | L2 | PARTIAL (stored, never read) | NOT APPLICABLE | BROKEN | REFERENCE ONLY | none | MERGE INTO NEW SYSTEM | High |
| V1-MOD-005 | Role storage → Role create is broken | L2 | BROKEN | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | none | FIX REGRESSION | Med |
| V1-MOD-006 | Role storage → Role list never renders | L1 | BROKEN | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | none | FIX REGRESSION | Med |
| V1-MOD-007 | Moderator assignment → `Moderator(userId UNIQUE, roleId)` | L2 | PARTIAL (stored, never read) | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | High |
| V1-MOD-008 | Moderator assignment → Create is broken | L2 | BROKEN | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | none | FIX REGRESSION | Med |
| V1-MOD-009 | Moderator assignment → Delete uses the wrong key | L2 | BROKEN | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | none | FIX REGRESSION | Med |
| V1-MOD-010 | Moderator assignment → Two unlinked promotion paths | L3 | BROKEN | PARTIAL | REGRESSION | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | High |
| V1-MOD-011 | Enforcement → Property moderation domain | L4 | FULL | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | KEEP + IMPROVE | Low |
| V1-MOD-012 | Enforcement → Auction moderation domain | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | KEEP + IMPROVE | Low |
| V1-MOD-013 | Enforcement → Everything else | L1 | BROKEN | NOT APPLICABLE | PARTIAL | REFERENCE ONLY | none | MERGE INTO NEW SYSTEM | High |
| V1-MOD-014 | Work queue → Moderator panel | L4 | BROKEN (**no route registered in `App.tsx`**) | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | High |
| V1-MOD-015 | Scope → Entity scope | L0 | MISSING | NOT APPLICABLE | PARTIAL (write-only) | **the only working implementation** | none | NEW IMPROVEMENT | High |
| V1-MOD-016 | Scope → Geo scope | L0 | MISSING | NOT APPLICABLE | BROKEN | NOT APPLICABLE | none | FIX REGRESSION | High |
| V1-MOD-017 | Oversight → Chat oversight audit | L3 | BROKEN | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | FIX REGRESSION | High |
| V1-MOD-018 | Oversight → Close conversation | L0 | STUB | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Low |
| V1-MOD-019 | Audit → `ActivityLog` | L3 | PARTIAL | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | High |
| V1-MOD-020 | Audit → Forgeable audit writes | L4 | BROKEN | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | none | FIX REGRESSION | High |
| V1-MOD-021 | Blacklist → Provider / client blacklist | L3 | BROKEN (`requireAuth` only; **never read**) | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | FIX REGRESSION | High |
| V1-MOD-022 | Review moderation → Delete any service review | L4 | BROKEN | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | FIX REGRESSION | High |
| V1-RANK-001 | Verification flag → `isVerified` | L3 | PARTIAL (overloaded) | NOT APPLICABLE | BETTER THAN OLD | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Med |
| V1-RANK-002 | Verification flag → `verifiedAt` | L2 | PARTIAL (no writer) | NOT APPLICABLE | FULL | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-RANK-003 | Verification workflow → `IdentityVerification` record | L2 | BROKEN (**one writer, zero readers**) | NOT APPLICABLE | FULL | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | High |
| V1-RANK-004 | Verification workflow → Review queue UI | L1 | BROKEN | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | RESTORE | High |
| V1-RANK-005 | Verification workflow → Reject with reason | L2 | MISSING | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-RANK-006 | Official mark → `isOfficial` | L2 | BROKEN (**no writer**) | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Low |
| V1-RANK-007 | Distinguished status → `isDistinguished` | L1 | BROKEN (phantom field) | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | RESTORE | Med |
| V1-RANK-008 | Earned-trust counter → `approvedPostsCount` | L1 | BROKEN (phantom field) | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | RESTORE | Med |
| V1-RANK-009 | User rank → Rank object on the public profile | L0 | BROKEN (**no endpoint, no registry, no column**) | NOT APPLICABLE | FULL (model) / MISSING (effect) | NOT APPLICABLE | none | RESTORE | Med |
| V1-RANK-010 | User rank → Admin sets a rank | L1 | BROKEN | NOT APPLICABLE | FULL | NOT APPLICABLE | none | RESTORE | Med |
| V1-RANK-011 | User rank → Rank catalogue | L1 | BROKEN | NOT APPLICABLE | FULL | NOT APPLICABLE | none | RESTORE | Med |
| V1-RANK-012 | Academic badge → PhD / Engineer credential chip | L1 | PARTIAL (renders, nothing supplies it) | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-RANK-013 | Academic badge → Badge on office/supplier cards | L1 | BROKEN | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Low |
| V1-RANK-014 | Academic badge → Admin sets a badge | L1 | BROKEN | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-RANK-015 | Membership tier → `membershipLevel` on office/supplier cards | UNKNOWN | none | L1 UI_ONLY | BROKEN | NOT APPLICABLE | none | none | P1 |
| V1-RANK-016 | Office rating → Hourly recomputation | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | **RESTORE** | Med |
| V1-RANK-017 | Office rating → Early-warning scan | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-RANK-018 | Marketer rank → `MarketerRank` ladder | L2 | BROKEN (no API) | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-RANK-019 | Marketer rank → **RANK ≠ PERMISSION violation** | L2 | BROKEN (concept conflation) | NOT APPLICABLE | REGRESSION | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | High |
| V1-RANK-020 | Marketer profile → Reputation statistics | L2 | BROKEN (no writer) | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-RANK-021 | Marketer approval → Approval lifecycle | L2 | BROKEN (no API) | NOT APPLICABLE | FULL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-RANK-022 | Code of conduct → Versioned conduct document | L2 | BROKEN (zero writers/readers) | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | RESTORE | Med |
| V1-RANK-023 | Code of conduct → Acceptance record | L2 | BROKEN (zero writers) | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | **RESTORE** | Med |
| V1-RANK-024 | Integrity pledge → `agreedToCharter` | L2 | PARTIAL (write-only) | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-RANK-025 | Token economy → `tokenBalance` | L3 | PARTIAL (**granted, never spent or checked**) | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | PRODUCT OWNER DECISION | Med |
| V1-RANK-026 | Elite leads → Lead scoring | L1 | STUB | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | PRODUCT OWNER DECISION | Med |
| V1-RANK-027 | Auction trust → `isBannedFromAuctions` | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-RANK-028 | Ad tier → Geo-ad tier order | L3 | PARTIAL | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-SUB-001 | Plans → Plan catalogue | L4 | FULL | FULL | REGRESSION | NOT APPLICABLE | none | RESTORE | Med |
| V1-SUB-002 | Plans → Audience targeting | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Low |
| V1-SUB-003 | Plans → **Public-writable plans** | L4 | BROKEN | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | none | FIX REGRESSION | High |
| V1-SUB-004 | Plans → Bulk price adjust | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | KEEP | Low |
| V1-SUB-005 | Plans → Plan overrides | L4 | PARTIAL (duplicate of V1-SUB-001) | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-SUB-006 | Subscriptions → `UserSubscription` record | L3 | PARTIAL | FULL | REGRESSION | NOT APPLICABLE | none | RESTORE | Med |
| V1-SUB-007 | Subscriptions → **Anonymous self-grant** | L4 | BROKEN | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | none | FIX REGRESSION | High |
| V1-SUB-008 | Subscriptions → Admin manual activation | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-SUB-009 | Subscriptions → Admin edit is silently dropped | L3 | BROKEN | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | none | FIX REGRESSION | Med |
| V1-SUB-010 | Subscriptions → Confirm / reject a subscription | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Low |
| V1-SUB-011 | Subscriptions → Expiry enforcement | L0 | MISSING | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | High |
| V1-SUB-012 | Subscriptions → Entitlement gating | L0 | MISSING | FULL | REGRESSION | NOT APPLICABLE | none | **RESTORE** | High |
| V1-SUB-013 | Trial → Global free-trial days | L4 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | KEEP + IMPROVE | Low |
| V1-SUB-014 | Coupons → Coupon model | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-SUB-015 | Coupons → Validation never consumes | L3 | BROKEN | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | FIX REGRESSION | High |
| V1-SUB-016 | Coupons → **Public-writable coupons** | L4 | BROKEN | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | none | FIX REGRESSION | High |
| V1-SUB-017 | Coupons → Public coupon leak | L4 | BROKEN | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | none | FIX REGRESSION | High |
| V1-SUB-018 | Coupons → Second coupon surface | L4 | PARTIAL (duplicate) | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-SUB-019 | Payments → Gateway catalogue | L1 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-SUB-020 | Payments → Method toggles | L3 | BROKEN (not persisted) | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | FIX REGRESSION | Med |
| V1-SUB-021 | Payments → Thawani checkout | L1 | BROKEN | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | High |
| V1-SUB-022 | Payments → Tap charge | L1 | BROKEN | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | High |
| V1-SUB-023 | Payments → **Fake verification** | L1 | BROKEN | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | FIX REGRESSION | High |
| V1-SUB-024 | Payments → Payment → entitlement link | L0 | MISSING | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | High |
| V1-SUB-025 | Licences → Desktop software licence | L4 | FULL | NOT APPLICABLE | MISSING | REFERENCE ONLY | none | RESTORE | Med |
| V1-SUB-026 | Licences → Generate / convert / reset-HWID / revoke | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-SUB-027 | Licences → Redeemable licence codes | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-SUB-028 | Licences → **Anonymous redemption ×4** | L4 | BROKEN | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | none | FIX REGRESSION | High |
| V1-SUB-029 | Licences → Licence validation | L4 | FULL | NOT APPLICABLE | MISSING | REFERENCE ONLY | none | KEEP | Low |
| V1-SUB-030 | Licences → Self-issued licence | L4 | BROKEN | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | none | FIX REGRESSION | High |
| V1-SUB-031 | Pricing → Pricing page + coming-soon variant | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | KEEP | Low |
| V1-SUB-032 | Checkout → Subscribe flow | L3 | PARTIAL (**terminates in a fake gateway**) | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | High |
| V1-SUB-033 | Checkout → Payment return handler | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | High |

## V1 Properties, Leads, Organizations, Marketers, Suppliers, Partners
*ROUND-2 (V1 + desktop C# source)*

| ID | Feature | V1 depth | V1 | Old V2 | Current V2 | Desktop | Tests | Decision | Risk |
|---|---|---|---|---|---|---|---|---|---|
| V1-PROP-001 | Public browse → `/properties` listing page | L3 | PARTIAL | MISSING | PARTIAL | FULL | MISSING | KEEP + IMPROVE | High |
| V1-PROP-002 | Public browse → Listing query targets a non-existent endpoint | L1 | BROKEN | n/a | BROKEN | FULL | MISSING | FIX REGRESSION | High |
| V1-PROP-003 | Public browse → Working list API exists but is unused by the brows… | L4 | PARTIAL | n/a | FULL | FULL | MISSING | MERGE INTO NEW SYSTEM | High |
| V1-PROP-004 | Filters → Broad category → sub-type cascade | L3 | PARTIAL (client-side taxonomy) | n/a | BROKEN | FULL | MISSING | RESTORE | Med |
| V1-PROP-005 | Filters → Price min/max | L3 | PARTIAL (sent to dead `/estates`) | n/a | FULL | FULL | MISSING | KEEP | Low |
| V1-PROP-006 | Filters → Area min/max with unit switching | L2 | PARTIAL (client-side only) | n/a | PARTIAL | FULL | MISSING | RESTORE | Med |
| V1-PROP-007 | Filters → Bedrooms 1+…6+ / bathrooms | L3 | PARTIAL | n/a | FULL | FULL | MISSING | KEEP | Low |
| V1-PROP-008 | Filters → Facade / orientation (8 compass points) | L2 | PARTIAL (column exists, never filtered server-side) | n/a | MISSING | PARTIAL | MISSING | RESTORE | Med |
| V1-PROP-009 | Filters → Listing type / payment method / offer type | L1 | INTENDED ONLY (`/filter-options` exists only inside the DEV mock block, `api.ts:76`) | n/a | FULL | PARTIAL | MISSING | RESTORE | High |
| V1-PROP-010 | Filters → Village / district free-text | L1 | PARTIAL | n/a | FULL | FULL | MISSING | KEEP + IMPROVE | Low |
| V1-PROP-011 | Filters → Draft-vs-applied filter model | L4 | FULL (client UX) | n/a | MISSING | NOT APPLICABLE | MISSING | KEEP | Low |
| V1-PROP-012 | Sorting → Newest / price asc / price desc | L3 | PARTIAL | n/a | FULL | NOT APPLICABLE | MISSING | KEEP | Low |
| V1-PROP-013 | Sorting → "Nearest to me" with geolocation consent | L3 | PARTIAL (client-side haversine on a list that never loads) | n/a | PARTIAL | FULL | MISSING | RESTORE | High |
| V1-PROP-014 | Compare → Compare up to 3 listings | L1 | PARTIAL (localStorage `akar_compare_properties`) | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | Med |
| V1-PROP-015 | Favourites → Heart a listing | L1 | PARTIAL | n/a | FULL | NOT APPLICABLE | MISSING | SUPERSEDED WITH FULL PARITY | Low |
| V1-PROP-016 | Favourites → "Favourites only" browse toggle | L1 | PARTIAL | n/a | FULL | NOT APPLICABLE | MISSING | KEEP | Low |
| V1-PROP-017 | Favourites → Favourites survive device change | L0 | MISSING | n/a | FULL | NOT APPLICABLE | MISSING | SUPERSEDED WITH FULL PARITY | Low |
| V1-PROP-018 | Saved searches → Save the current filter set (local) | L1 | PARTIAL | n/a | FULL | PARTIAL | MISSING | SUPERSEDED WITH FULL PARITY | Med |
| V1-PROP-019 | Saved searches → Server-side save button | L1 | BROKEN — handler returns `{success:true}` and persists nothing (`v1/server/api/src/routes/other.ts:114-117`); `GET` returns `[]` (`other.ts:40-43`) | n/a | FULL | PARTIAL | MISSING | FIX REGRESSION | High |
| V1-PROP-020 | Saved searches → Two parallel saved-search implementations | L1 | PARTIAL | n/a | PARTIAL | NOT APPLICABLE | MISSING | MERGE INTO NEW SYSTEM | Med |
| V1-PROP-021 | Alerts → Property alert builder | L1 | PARTIAL (nothing ever evaluates it) | n/a | MISSING | FULL | MISSING | RESTORE | High |
| V1-PROP-022 | Alerts → City-interest match notification (server) | L4 | FULL (coarse: city equality only) | n/a | MISSING | FULL | MISSING | RESTORE | High |
| V1-PROP-023 | Alerts → Notification type mislabelled | L4 | BROKEN (mis-typed rows corrupt notification filtering) | n/a | NOT APPLICABLE | n/a | MISSING | FIX REGRESSION | Med |
| V1-PROP-024 | Detail → Property detail page | L3 | PARTIAL | n/a | PARTIAL | FULL | MISSING | KEEP + IMPROVE | Med |
| V1-PROP-025 | Detail → Media gallery + fullscreen lightbox | L4 | FULL | n/a | MISSING | FULL | MISSING | RESTORE | Med |
| V1-PROP-026 | Detail → Branded Quran/Hadith banner injected into the gallery | L1 | PARTIAL (`brandedBanner` is not a `Property` column) | n/a | NOT APPLICABLE | NOT APPLICABLE | MISSING | PRODUCT OWNER DECISION | Low |
| V1-PROP-027 | Detail → Leaflet map with marker | L4 | FULL | n/a | MISSING | FULL | MISSING | RESTORE | High |
| V1-PROP-028 | Detail → Investment Gauge | L4 | FULL (deterministic client heuristic — **not** a market model) | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | Low |
| V1-PROP-029 | Detail → Owner/office contact block behind an auth gate | L3 | PARTIAL (`officePhone`/`whatsapp` are not `Property` columns) | n/a | MISSING | FULL | MISSING | RESTORE | High |
| V1-PROP-030 | Detail → Mobile sticky contact bar (Call / WhatsApp / Viewing) | L3 | PARTIAL (phone source missing) | n/a | MISSING | PARTIAL | MISSING | RESTORE | Med |
| V1-PROP-031 | Detail → Share to WhatsApp / Facebook / X / Telegram + copy link | L4 | FULL | n/a | MISSING | FULL | MISSING | RESTORE | Med |
| V1-PROP-032 | Detail → Open-Graph / Twitter-card meta per listing | L4 | FULL | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | Med |
| V1-PROP-033 | Detail → View counter | L4 | FULL (no dedup/bot guard) | n/a | PARTIAL | NOT APPLICABLE | MISSING | KEEP + IMPROVE | Med |
| V1-PROP-034 | Detail → Legal disclaimer block | L4 | FULL | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | High |
| V1-PROP-035 | Commercial terms → Expanded listing terms (rent periods, sale plan… | L1 | INTENDED ONLY — persisted only to `globalThis.MOCK_PROPERTY_EXPANDED` inside the DEV block (`v1/src/lib/api.ts:473-495`); no table, no route | n/a | MISSING | FULL | MISSING | RESTORE | High |
| V1-PROP-036 | Commercial terms → Per-listing payment options | L1 | INTENDED ONLY (404 in production) | n/a | MISSING | FULL | MISSING | RESTORE | High |
| V1-PROP-037 | Finance → Mortgage calculator (PMT) | L4 | FULL | n/a | MISSING | PARTIAL | MISSING | RESTORE | Med |
| V1-PROP-038 | Finance → Flexible & fixed instalment calculators | L4 | FULL | n/a | MISSING | FULL | MISSING | RESTORE | Med |
| V1-PROP-039 | Finance → Server-side amortisation engine | L4 | FULL (reachable only through chat, not the REST API) | n/a | MISSING | FULL | MISSING | RESTORE | Med |
| V1-PROP-040 | Currency → Multi-currency display + approximate conversion | L4 | FULL (hardcoded rates, no FX feed) | n/a | PARTIAL | FULL | MISSING | KEEP + IMPROVE | Med |
| V1-PROP-041 | Units → US-market mode (sq ft / acres) | L3 | PARTIAL | n/a | MISSING | NOT APPLICABLE | MISSING | PRODUCT OWNER DECISION | Low |
| V1-PROP-042 | Create → Submit-property form | L4 | FULL | n/a | PARTIAL | FULL | MISSING | KEEP + IMPROVE | Med |
| V1-PROP-043 | Create → Image upload (multer, 4 files, 10 MB, JPG/PNG/WEBP) | L4 | FULL | n/a | MISSING | FULL | MISSING | RESTORE | High |
| V1-PROP-044 | Create → Ad-licence number & reference number silently dropped | L1 | BROKEN (regulatory field lost) | n/a | MISSING | FULL | MISSING | RESTORE | High |
| V1-PROP-045 | Create → English title/description dropped on submit | L3 | BROKEN | n/a | NOT APPLICABLE | FULL | MISSING | FIX REGRESSION | Med |
| V1-PROP-046 | Create → `propertyAge` accepted then discarded | L2 | BROKEN | n/a | MISSING | FULL | MISSING | FIX REGRESSION | Low |
| V1-PROP-047 | Create → Hierarchical location picker | L4 | FULL | n/a | PARTIAL | FULL | MISSING | KEEP | Low |
| V1-PROP-048 | Create → 20-country Arab market catalogue | L4 | FULL | n/a | PARTIAL | PARTIAL | MISSING | KEEP | Low |
| V1-PROP-049 | Create → Inline "add property" and "request property" panels on br… | L3 | PARTIAL | n/a | MISSING | NOT APPLICABLE | MISSING | KEEP + IMPROVE | Low |
| V1-PROP-050 | Lifecycle → New listings default to `pending` | L4 | FULL | n/a | PARTIAL | FULL | MISSING | KEEP | Med |
| V1-PROP-051 | Moderation → Pending queue API | L4 | PARTIAL (dead endpoint) | n/a | MISSING | FULL | MISSING | RESTORE | High |
| V1-PROP-052 | Moderation → Approve / reject / mark-sold APIs | L4 | PARTIAL (dead endpoints, no reason field, no audit, no notification) | n/a | MISSING | FULL | MISSING | RESTORE | High |
| V1-PROP-053 | Moderation → Admin properties console is localStorage-only | L1 | BROKEN — approve/reject/feature/delete never reach the server although the endpoints exist | n/a | MISSING | FULL | MISSING | FIX REGRESSION | High |
| V1-PROP-054 | Moderation → Featured-listing toggle | L3 | PARTIAL (read path real, write path localStorage-only) | n/a | PARTIAL | NOT APPLICABLE | MISSING | FIX REGRESSION | Med |
| V1-PROP-055 | Owner tools → "My listings" API | L4 | FULL | n/a | BROKEN | FULL | MISSING | RESTORE | High |
| V1-PROP-056 | Owner tools → Delete own listing from the grid | L1 | BROKEN — no `DELETE /api/properties/:id` route exists (`v1/server/api/src/routes/properties.ts` has none); handled only by the DEV mock `v1/src/lib/api.ts:330-343` | n/a | PARTIAL | FULL | MISSING | FIX REGRESSION | High |
| V1-PROP-057 | Owner tools → Edit an existing listing | L1 | MISSING (no route, no page) | n/a | PARTIAL | FULL | MISSING | SUPERSEDED WITH FULL PARITY | Med |
| V1-PROP-058 | Marketing → Marketing window on a listing | L2 | INTENDED ONLY (no route reads or writes these columns) | n/a | MISSING | PARTIAL | MISSING | RESTORE | Med |
| V1-PROP-059 | Auctions crossover → Auctions tab inside the property browse | L4 | FULL | n/a | PARTIAL | PARTIAL | MISSING | KEEP | Low |
| V1-PROP-060 | Dead page → `Estates.tsx` orphan browse page | L0 | BROKEN (would throw on render) | n/a | NOT APPLICABLE | NOT APPLICABLE | MISSING | PRODUCT OWNER DECISION | Low |
| V1-PROP-061 | Tests → Property-domain test coverage in V1 | L0 | MISSING | n/a | MISSING | n/a | MISSING | RESTORE | High |
| V1-LEAD-001 | Inquiry → Public inquiry form on a listing | L3 | BROKEN (field-name contract break — see V1-LEAD-002) | n/a | MISSING | FULL | MISSING | RESTORE | High |
| V1-LEAD-002 | Inquiry → Client/server field-name mismatch | L3 | BROKEN | n/a | NOT APPLICABLE | n/a | MISSING | FIX REGRESSION | High |
| V1-LEAD-003 | Inquiry → Inquiry persistence | L4 | FULL | n/a | MISSING | FULL | MISSING | KEEP + IMPROVE | Med |
| V1-LEAD-004 | Inquiry → Inquiry list authorization | L4 | BROKEN (data exposure) | n/a | NOT APPLICABLE | n/a | MISSING | FIX REGRESSION | High |
| V1-LEAD-005 | Inquiry → Inquiry → property/office join | L2 | MISSING | n/a | MISSING | FULL | MISSING | RESTORE | High |
| V1-LEAD-006 | Inquiry → Reply / status / assignment on an inquiry | L0 | MISSING | n/a | MISSING | FULL | MISSING | RESTORE | High |
| V1-LEAD-007 | Elite Leads → Elite inbox screen | L2 | BROKEN (crashes on real rows — `:81` dereferences `senderName`) | n/a | MISSING | FULL | MISSING | RESTORE | High |
| V1-LEAD-008 | Elite Leads → Manual Elite flag | L2 | BROKEN — `PATCH /elite-leads/:id/mark` has no handler (`v1/server/api/src/routes/other.ts` defines no PATCH; mount `v1/server/api/src/index.ts:135`) | n/a | MISSING | FULL | MISSING | RESTORE | High |
| V1-LEAD-009 | Elite Leads → `leadScore` badge | L1 | INTENDED ONLY — **no `leadScore` column, no scoring code anywhere in `v1/server/`**; badge can never render | n/a | MISSING | FULL | MISSING | PRODUCT OWNER DECISION (define the scoring model before rebuilding) | High |
| V1-LEAD-010 | Elite Leads → Unread tracking / budget capture | L1 | INTENDED ONLY | n/a | MISSING | FULL | MISSING | RESTORE | Med |
| V1-LEAD-011 | Elite Leads → Notification when a lead is flagged Elite | L0 | MISSING | n/a | MISSING | FULL | MISSING | RESTORE | Med |
| V1-LEAD-012 | Property requests → Buyer posts a wanted-property brief | L4 | FULL | n/a | FULL | FULL | MISSING | KEEP + IMPROVE | Low |
| V1-LEAD-013 | Property requests → Map pin on a request | L1 | BROKEN — `PropertyRequest` has no `lat`/`lng` columns (`schema.prisma:721-739`), coordinates are discarded | n/a | MISSING | FULL | MISSING | RESTORE | Med |
| V1-LEAD-014 | Property requests → Buyer inbox of own requests + offers | L4 | FULL | n/a | FULL | FULL | MISSING | KEEP | Low |
| V1-LEAD-015 | Property requests → Office discovery of open requests | L4 | FULL | n/a | MISSING | FULL | MISSING | RESTORE | High |
| V1-LEAD-016 | Property requests → City filter on the office feed is client-illus… | L3 | BROKEN | n/a | NOT APPLICABLE | FULL | MISSING | FIX REGRESSION | Low |
| V1-LEAD-017 | Offers → Office submits an offer against a request | L4 | PARTIAL — **any authenticated user** may offer; no office/verification/membership check, unlike V2 | n/a | PARTIAL | FULL | MISSING | KEEP + IMPROVE (adopt the V2 gate) | Med |
| V1-LEAD-018 | Offers → Offer cannot reference a property | L2 | MISSING | n/a | FULL | FULL | MISSING | SUPERSEDED WITH FULL PARITY | Med |
| V1-LEAD-019 | Offers → Buyer accepts / rejects an offer | L4 | PARTIAL — no auto-reject of siblings, request status unchanged, no notification | n/a | PARTIAL | FULL | MISSING | KEEP + IMPROVE | Med |
| V1-LEAD-020 | Offers → Offer PATCH is a mass-assignment hole | L4 | BROKEN | n/a | FULL | n/a | MISSING | FIX REGRESSION | High |
| V1-LEAD-021 | Offers → Close a request | L4 | FULL | n/a | FULL | FULL | MISSING | KEEP | Low |
| V1-LEAD-022 | Offers → Counter-offer / revision | L0 | MISSING | n/a | MISSING | PARTIAL | MISSING | RESTORE | Med |
| V1-LEAD-023 | Viewing requests → "Request viewing" action | L1 | PARTIAL (degrades to a text message on a broken inquiry POST) | n/a | MISSING | PARTIAL | MISSING | RESTORE | Med |
| V1-LEAD-024 | Viewing requests → `Booking` table (viewing appointments) | L2 | INTENDED ONLY | n/a | MISSING | FULL | MISSING | RESTORE | High |
| V1-LEAD-025 | Matchmaking → Admin matchmaking console | L1 | INTENDED ONLY — no route, no model, no algorithm (`grep -rn "matchmaking" v1/server/` → none) | n/a | MISSING | FULL | MISSING | RESTORE | High |
| V1-LEAD-026 | Matchmaking → Matching algorithm | L0 | MISSING | n/a | PARTIAL | FULL | MISSING | MERGE INTO NEW SYSTEM (build on the V2/desktop radar) | High |
| V1-LEAD-027 | Matchmaking → Developer-project entity | L1 | MISSING | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | High |
| V1-LEAD-028 | Growth analytics → AdminEmperor executive dashboard | L1 | INTENDED ONLY — `GET /api/admin/emperor` exists nowhere in `v1/server/` | n/a | PARTIAL | PARTIAL | MISSING | RESTORE | Med |
| V1-LEAD-029 | Growth analytics → Monetisation activation targets | L1 | INTENDED ONLY (thresholds hardcoded, not configurable) | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | Low |
| V1-LEAD-030 | Growth analytics → Visitor→registrant conversion & weekly retention | L1 | INTENDED ONLY (no session table in `schema.prisma`) | n/a | PARTIAL | NOT APPLICABLE | MISSING | RESTORE | Med |
| V1-ORG-001 | Office directory → `/offices` public list | L4 | FULL | n/a | BROKEN | PARTIAL | MISSING | KEEP + IMPROVE | Med |
| V1-ORG-002 | Office directory → Office list API | L4 | FULL (no filter, no paging, no search server-side) | n/a | PARTIAL | PARTIAL | MISSING | KEEP + IMPROVE | Low |
| V1-ORG-003 | Office directory → Client-side office search (name / city / specia… | L3 | PARTIAL — `specialization` is not an `Office` column (`schema.prisma:434-465`), so that filter always empties the list | n/a | PARTIAL | PARTIAL | MISSING | FIX REGRESSION | Med |
| V1-ORG-004 | Office directory → Favourite an office | L1 | PARTIAL | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | Med |
| V1-ORG-005 | Office directory → Compare up to 3 offices | L1 | PARTIAL | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | Low |
| V1-ORG-006 | Office profile → `/offices/:id` detail page | L4 | FULL | n/a | PARTIAL | PARTIAL | MISSING | KEEP + IMPROVE | Low |
| V1-ORG-007 | Office profile → Office's property list | L4 | PARTIAL — endpoint is real but **no page calls it** (`grep -rn "offices/.*properties" v1/src/` → none) | n/a | PARTIAL | FULL | MISSING | RESTORE | Med |
| V1-ORG-008 | Office profile → Membership tiers (basic / professional / promax) | L1 | BROKEN — `membershipLevel` is not an `Office` column (`schema.prisma:434-465`), so every office renders "basic" | n/a | BROKEN | PARTIAL | MISSING | FIX REGRESSION | Med |
| V1-ORG-009 | Office profile → Office verification badge | L2 | PARTIAL (no route sets it in `v1/server/api/src/routes/offices.ts` or `admin.ts`) | n/a | PARTIAL | PARTIAL | MISSING | MERGE INTO NEW SYSTEM (into AMRS verification) | Med |
| V1-ORG-010 | Office profile → Office WhatsApp CTA with a prefilled provenance m… | L4 | FULL | n/a | BROKEN | FULL | MISSING | RESTORE | Med |
| V1-ORG-011 | Office profile → Denormalised `propertyCount` and `rating` | L2 | PARTIAL (no writer keeps them current) | n/a | MISSING | PARTIAL | MISSING | KEEP + IMPROVE | Med |
| V1-ORG-012 | Office admin → Office moderation console | L1 | BROKEN — statuses fabricated by index (`:60-62`) and all writes go to `akar_admin_offices` | n/a | MISSING | PARTIAL | MISSING | FIX REGRESSION | High |
| V1-ORG-013 | Office sanctions → Auction permissions per office | L5 | FULL | n/a | MISSING | PARTIAL | MISSING | RESTORE | High |
| V1-ORG-014 | Office reputation → Office rating snapshots | L4 | FULL (computed from real auction signals) | n/a | PARTIAL | PARTIAL | MISSING | MERGE INTO NEW SYSTEM (feed AMRS reputation) | High |
| V1-ORG-015 | Anti-manipulation → Suspicious-relist detection | L5 | FULL | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | High |
| V1-ORG-016 | Anti-manipulation → 7-day proof-of-sale window | L5 | FULL | n/a | MISSING | FULL | MISSING | RESTORE | High |
| V1-ORG-017 | Anti-manipulation → Admin verify / reject / clear | L5 | FULL | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | High |
| V1-ORG-018 | Anti-manipulation → Deadline-expiry auto-block cron | L5 | FULL | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | High |
| V1-ORG-019 | Anti-manipulation → Monthly relist report + CSV/PDF export | L4 | FULL | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | Med |
| V1-ORG-020 | Anti-manipulation → Office's own case inbox | L4 | PARTIAL (no page calls it) | n/a | MISSING | PARTIAL | MISSING | RESTORE | Med |
| V1-ORG-021 | Companies → User-created company/office entity | L1 | PARTIAL — persisted only to `localStorage["akar_companies"]` (`CompanyContext.tsx:37,52`); no API, no table | n/a | MISSING | PARTIAL | MISSING | SUPERSEDED WITH FULL PARITY (V2 AMRS organizations) | High |
| V1-ORG-022 | Companies → My-companies management screen | L1 | PARTIAL (localStorage) | n/a | PARTIAL | FULL | MISSING | MERGE INTO NEW SYSTEM | High |
| V1-ORG-023 | Companies → Post-as-company account switching | L1 | PARTIAL | n/a | PARTIAL | PARTIAL | MISSING | MERGE INTO NEW SYSTEM | High |
| V1-ORG-024 | Companies → Supervisor roles with permissions | L1 | PARTIAL (single hardcoded permission, no invitation, no acceptance) | n/a | PARTIAL | FULL | MISSING | SUPERSEDED WITH FULL PARITY | Med |
| V1-ORG-025 | Companies → Two parallel office concepts | L1 | BROKEN (a user-created company can never own a listing) | n/a | FULL | PARTIAL | MISSING | SUPERSEDED WITH FULL PARITY | High |
| V1-ORG-026 | Project verification → Public document-verification page | L1 | INTENDED ONLY — `GET /api/diwan/verify/:code` (`ProjectVerify.tsx:59`) hits `otherRouter`, which has no `/verify/:code` handler (`v1/server/api/src/routes/other.ts`); mount `v1/server/api/src/index.ts:130` | n/a | MISSING | PARTIAL | MISSING | RESTORE | Med |
| V1-ORG-027 | Market data → Investment Radar (city attractiveness) | L1 | INTENDED ONLY — `/api/market/investment-radar` returns a hardcoded `[]` (`v1/server/api/src/routes/other.ts:32-35`, mount `v1/server/api/src/index.ts:128`) while the page expects `{cities:[…]}` | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | Med |
| V1-ORG-028 | Market data → Market History (price trend report) | L1 | INTENDED ONLY — `/api/market/history` returns `[]` (`other.ts:32-35`) | n/a | MISSING | PARTIAL | MISSING | RESTORE | Med |
| V1-ORG-029 | Market data → Construction-cost rate admin | L1 | BROKEN — `GET /api/market-rates` returns FX pairs `{type,rate,change}` (`v1/server/api/src/routes/other.ts:24-31`), not `{code,category,descAr,…}`; `AdminMarketRates.tsx:117` then dereferences `r.descAr` and throws. `PUT /api/market-rates/:code` (`:96`) has no handler at all | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | Med |
| V1-ORG-030 | Market data → FX rate feed | L1 | STUB | n/a | PARTIAL | PARTIAL | MISSING | KEEP + IMPROVE | Low |
| V1-ORG-031 | Platform stats → Public site summary | L4 | FULL | n/a | PARTIAL | NOT APPLICABLE | MISSING | KEEP | Low |
| V1-ORG-032 | Platform stats → Generic activity tracking | L4 | FULL (unauthenticated, `userId` taken from the body) | n/a | PARTIAL | FULL | MISSING | KEEP + IMPROVE | Med |
| V1-SUPP-001 | Directory → `/suppliers` public list | L4 | FULL | n/a | MISSING | PARTIAL | MISSING | RESTORE | Med |
| V1-SUPP-002 | Directory → Supplier list API | L4 | FULL | n/a | MISSING | PARTIAL | MISSING | RESTORE | Med |
| V1-SUPP-003 | Taxonomy → 8 supplier categories | L4 | FULL (hardcoded, not admin-editable) | n/a | MISSING | FULL | MISSING | RESTORE | Low |
| V1-SUPP-004 | Profile → `/suppliers/:id` detail | L4 | FULL | n/a | MISSING | PARTIAL | MISSING | RESTORE | Med |
| V1-SUPP-005 | Products → Supplier product catalogue | L4 | FULL | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | Med |
| V1-SUPP-006 | Membership → Supplier membership tiers + Elite badge | L1 | BROKEN — `membershipLevel`, `isVerified`, `isFeatured`, `logo`, `whatsapp`, `ownerTitle`, `productCount` are not `Supplier` columns (`schema.prisma:491-510`) | n/a | MISSING | PARTIAL | MISSING | FIX REGRESSION | Med |
| V1-SUPP-007 | Admin → Supplier CRUD for admins | L0 | MISSING | n/a | MISSING | PARTIAL | MISSING | RESTORE | Med |
| V1-SUPP-008 | Leads → Supplier inquiry / RFQ | L0 | MISSING | n/a | MISSING | FULL | MISSING | RESTORE | Med |
| V1-PARTNER-001 | Portal → Partner login screen | L1 | BROKEN — posts to `/api/partners/login` through `apiRequest`, producing `/api/api/partners/login`; no login route exists (`v1/server/api/src/routes/other.ts`), and `.then(r => r.json())` double-parses | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | Med |
| V1-PARTNER-002 | Portal → API-key session | L1 | INTENDED ONLY — `Partner` has no `apiKey` column | n/a | MISSING | NOT APPLICABLE | MISSING | PRODUCT OWNER DECISION | Med |
| V1-PARTNER-003 | Dashboard → Partner KPI dashboard | L1 | BROKEN — `/api/partners/dashboard` via a `/api`-prefixed helper → `/api/api/...`; no route | n/a | MISSING | PARTIAL | MISSING | RESTORE | Med |
| V1-PARTNER-004 | Campaigns → Create an ad campaign | L1 | INTENDED ONLY (no model, no route) | n/a | PARTIAL | PARTIAL | MISSING | MERGE INTO NEW SYSTEM (into the ads domain) | Med |
| V1-PARTNER-005 | Projects → Create a developer project | L1 | INTENDED ONLY — this is the missing entity that `AdminMatchmaking` matches against (V1-LEAD-027) | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | High |
| V1-PARTNER-006 | Leads → Lead marketplace pricing | L1 | INTENDED ONLY | n/a | MISSING | FULL | MISSING | PRODUCT OWNER DECISION | High |
| V1-PARTNER-007 | Leads → Recent-leads feed | L1 | INTENDED ONLY | n/a | MISSING | FULL | MISSING | RESTORE | Med |
| V1-PARTNER-008 | Tiers → Partner tier badge | L1 | INTENDED ONLY (`Partner` has no `tier`) | n/a | MISSING | PARTIAL | MISSING | MERGE INTO NEW SYSTEM | Low |
| V1-PARTNER-009 | Directory → Public partner list | L4 | BROKEN — returns `Partner` rows **including `passwordHash`** to unauthenticated callers | n/a | MISSING | NOT APPLICABLE | MISSING | FIX REGRESSION | High |
| V1-PARTNER-010 | Notifications → Partner ringtone preference | L1 | PARTIAL (localStorage; no lead events to ring for) | n/a | MISSING | PARTIAL | MISSING | PRODUCT OWNER DECISION | Low |
| V1-MKTR-001 | Registration → Marketer self-registration | L2 | INTENDED ONLY — `POST /api/marketer/register` has no route (`grep -rin "marketer" v1/server/api/src/` → none) | n/a | PARTIAL | PARTIAL | MISSING | RESTORE | High |
| V1-MKTR-002 | Registration → Code of Conduct with versioned acceptance | L2 | INTENDED ONLY (no route reads or writes it) | n/a | MISSING | PARTIAL | MISSING | RESTORE | High |
| V1-MKTR-003 | Profile → Marketer profile + performance stats | L2 | INTENDED ONLY | n/a | MISSING | PARTIAL | MISSING | RESTORE | High |
| V1-MKTR-004 | Ranks → Marketer rank ladder | L2 | INTENDED ONLY | n/a | MISSING | PARTIAL | MISSING | RESTORE | Med |
| V1-MKTR-005 | Admin → Marketer approval queue | L1 | INTENDED ONLY (`PUT /api/admin/marketers/:id/approve` has no route) | n/a | MISSING | MISSING | MISSING | RESTORE | High |
| V1-MKTR-006 | Admin → Marketer platform settings | L2 | INTENDED ONLY | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | Med |
| V1-MKTR-007 | Inventory → Available-properties browser for marketers | L1 | INTENDED ONLY | n/a | MISSING | PARTIAL | MISSING | RESTORE | High |
| V1-MKTR-008 | Proposals → Marketer → advertiser marketing proposal | L2 | INTENDED ONLY (`/api/marketer/proposals/*` has no route) | n/a | MISSING | PARTIAL | MISSING | RESTORE | High |
| V1-MKTR-009 | Proposals → Advertiser responds to a proposal | L1 | INTENDED ONLY | n/a | MISSING | PARTIAL | MISSING | RESTORE | High |
| V1-MKTR-010 | Contracts → Marketing contract entity | L2 | INTENDED ONLY | n/a | MISSING | FULL | MISSING | RESTORE | High |
| V1-MKTR-011 | Contracts → Dual counter-signature | L2 | INTENDED ONLY | n/a | MISSING | FULL | MISSING | RESTORE | High |
| V1-MKTR-012 | Contracts → Auto-renewal | L2 | INTENDED ONLY (no scheduler) | n/a | MISSING | FULL | MISSING | RESTORE | Med |
| V1-MKTR-013 | Contracts → Termination with reason and actor | L2 | INTENDED ONLY | n/a | MISSING | FULL | MISSING | RESTORE | Med |
| V1-MKTR-014 | Commissions → Commission ledger | L2 | INTENDED ONLY | n/a | MISSING | FULL | MISSING | RESTORE | High |
| V1-MKTR-015 | Commissions → Commission withdrawal / payout | L0 | MISSING | n/a | MISSING | FULL | MISSING | RESTORE | Med |
| V1-MKTR-016 | Backend → Entire marketer API surface absent | L2 | INTENDED ONLY | n/a | MISSING | FULL | MISSING | RESTORE | High |
| V1-MKTR-017 | Backend → Marketer pages double-parse and double-prefix | L1 | BROKEN | n/a | NOT APPLICABLE | n/a | MISSING | FIX REGRESSION | High |
| V1-MKTR-018 | Property link → `Property.marketing*` fields feed the marketer sys… | L2 | INTENDED ONLY | n/a | MISSING | PARTIAL | MISSING | RESTORE | Med |
| V1-MKTR-019 | Notifications → Proposal / contract / commission notifications | L2 | INTENDED ONLY (no sender path) | n/a | MISSING | PARTIAL | MISSING | RESTORE | Med |
| V1-MKTR-020 | Admin → Marketer directory (approved marketers list) | L1 | INTENDED ONLY | n/a | MISSING | MISSING | MISSING | RESTORE | Med |

## V1 Services, Artisans, Urgent Dispatch, Tenders, Auctions
*ROUND-2 (V1 + desktop C# source)*

| ID | Feature | V1 depth | V1 | Old V2 | Current V2 | Desktop | Tests | Decision | Risk |
|---|---|---|---|---|---|---|---|---|---|
| V1-SVC-001 | Service Hub shell → 4-sector tab model | L4 | FULL | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-SVC-002 | Service Hub shell → Dispute-resolution sector | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-SVC-003 | Service Hub shell → Real-estate photography sector | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-SVC-004 | Taxonomy → Category record shape | L4 | FULL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-SVC-005 | Taxonomy → Icon-name → component registry | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-SVC-006 | Taxonomy → Per-category brand colour | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-SVC-007 | Taxonomy → Admin category CRUD by section | L4 | FULL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-SVC-008 | Taxonomy → Legacy two-level "service tabs" admin | L1 | BROKEN | NOT APPLICABLE | FULL | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-SVC-010 | Directory (OtherService) → Company/service listing CRUD | L4 | FULL | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-SVC-011 | Directory → Priced sub-items per listing | L4 | FULL | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | FIX REGRESSION | High |
| V1-SVC-012 | Directory → Public browse + filters | L4 | FULL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | KEEP | Low |
| V1-SVC-013 | Directory → Listing detail page | L4 | FULL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | KEEP | Low |
| V1-SVC-014 | Directory → WhatsApp as a first-class contact channel | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-SVC-020 | Provider profile → Sector + multi-specialty selection | L3 | PARTIAL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-SVC-021 | Provider profile → CV / résumé upload | L2 | STUB | NOT APPLICABLE | FULL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-SVC-022 | Provider profile → Portfolio gallery | L2 | PARTIAL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-SVC-023 | Provider profile → Portfolio strip on the provider card | L2 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-SVC-024 | Provider profile → Provider tier ladder | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-SVC-025 | Provider profile → "Top rated" merchandising badge | L3 | PARTIAL | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-SVC-026 | Provider profile → Bio / about text | L3 | PARTIAL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-SVC-027 | Provider profile → Work-location pin for proximity ranking | L2 | PARTIAL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-SVC-028 | Provider profile → Registration CTA + "registered" state | L4 | FULL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | KEEP + IMPROVE | Low |
| V1-SVC-029 | Provider profile → Upgrade-to-artisan account conversion | L1 | STUB | NOT APPLICABLE | FULL | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-SVC-030 | Provider directory → Specialty-scoped provider list | L3 | BROKEN | NOT APPLICABLE | FULL | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-SVC-031 | Provider directory → Distance-first ordering with m/km formatting | L2 | PARTIAL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-SVC-032 | Provider directory → Live availability dot on every provider | L2 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-SVC-033 | Provider directory → Working-hours disclosure on the card | L2 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-SVC-034 | Provider directory → Direct chat hand-off | L3 | PARTIAL | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-SVC-035 | Provider directory → One-tap call (`tel:`) | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-SVC-036 | Appointments → Working-hours-aware booking | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-SVC-037 | Appointments → Appointment lifecycle | L2 | PARTIAL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-SVC-038 | Appointments → "My appointments" combined in/out view | L2 | PARTIAL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-SVC-039 | Quotes → Direct quote request to one provider | L3 | BROKEN | NOT APPLICABLE | FULL | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-SVC-040 | Quotes → Quote lifecycle + priced reply | L2 | PARTIAL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-SVC-041 | Requests inbox → Dual inbox: incoming + sent | L3 | BROKEN | NOT APPLICABLE | FULL | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-SVC-042 | Requests inbox → Nine-state status vocabulary with bilingual chips | L4 | FULL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-SVC-043 | Search UX → Saved service searches | L2 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-SVC-044 | Search UX → Client location capture (GPS) | L4 | FULL | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-SVC-045 | Search UX → OSM map picker with Nominatim search | L4 | FULL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | KEEP + IMPROVE | Low |
| V1-SVC-046 | Search UX → Google-Maps-URL coordinate parser | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-SVC-047 | Search UX → City fallback when no coordinates | L2 | PARTIAL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | KEEP | Low |
| V1-SVC-050 | Ratings → Client → professional star rating | L3 | BROKEN | NOT APPLICABLE | FULL | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-SVC-051 | Ratings → Quick-tag review chips | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-SVC-052 | Ratings → Pending-rating recall banner | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-SVC-053 | Ratings → Low rating ⇒ silent personal exclusion | L1 | INTENDED ONLY | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | High |
| V1-SVC-054 | Ratings → Provider average recomputed on write | L4 | FULL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-SVC-055 | Ratings → Professional's private ratings panel | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-SVC-056 | Feedback → Professional → client private feedback | L3 | BROKEN | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | High |
| V1-SVC-057 | Feedback → Rating collected at completion time | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-SVC-058 | Client flags → Client warning counter surfaced pre-acceptance | L1 | INTENDED ONLY | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | High |
| V1-SVC-059 | Client flags → Client blacklist (admin) | L3 | PARTIAL | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | FIX REGRESSION | High |
| V1-SVC-060 | Client flags → Provider blacklist ("honour code") | L3 | PARTIAL | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | FIX REGRESSION | High |
| V1-SVC-061 | Admin → Reviews centre with 3 tabs + KPIs | L3 | BROKEN | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-SVC-062 | Admin → Rating deletion (moderation) | L4 | FULL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | FIX REGRESSION | High |
| V1-SVC-063 | Admin → Artisan roster console | L2 | PARTIAL | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-SVC-064 | Consultancy → 5-pillar engineering approval matrix | L1 | INTENDED ONLY | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | PRODUCT OWNER DECISION | Low |
| V1-SVC-065 | Consultancy → Drawing version timeline | L1 | INTENDED ONLY | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | PRODUCT OWNER DECISION | Low |
| V1-SVC-066 | Consultancy → Digital sign-off stamp | L1 | INTENDED ONLY | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | PRODUCT OWNER DECISION | Low |
| V1-SVC-067 | Consultancy → Project code + completion % | L1 | INTENDED ONLY | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-ART-001 | Urgent Dispatch → Mode concept | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | High |
| V1-ART-002 | Urgent Dispatch → Mandatory precise location | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | High |
| V1-ART-003 | Urgent Dispatch → Provider preview before dispatch | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | High |
| V1-ART-004 | Urgent Dispatch → Client curates the candidate list | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | High |
| V1-ART-005 | Urgent Dispatch → Empty-market message | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-ART-006 | Urgent Dispatch → Ringing card with live countdown | L1 | INTENDED ONLY | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | High |
| V1-ART-007 | Urgent Dispatch → 5-second inbox polling | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-ART-008 | Urgent Dispatch → Ringtone engine | L2 | STUB | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-ART-009 | Urgent Dispatch → Accept ⇒ contact reveal | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | High |
| V1-ART-010 | Urgent Dispatch → Contact privacy until acceptance | L2 | BROKEN | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | FIX REGRESSION | High |
| V1-ART-011 | Urgent Dispatch → Reject with a note handed to the next provider | L1 | INTENDED ONLY | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | High |
| V1-ART-012 | Urgent Dispatch → "Not agreed" hand-off after acceptance | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-ART-013 | Urgent Dispatch → Single-active-job invariant | L1 | INTENDED ONLY | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-ART-014 | Discipline → `missedCount` unanswered-dispatch counter | L1 | INTENDED ONLY | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | High |
| V1-ART-015 | Discipline → 5 missed ⇒ forced excuse + pledge | L2 | STUB | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | High |
| V1-ART-016 | Discipline → 10 missed ⇒ admin suspension | L1 | INTENDED ONLY | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-ART-017 | Availability → Provider notification kill-switch | L2 | STUB | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-ART-018 | Availability → Working-hours dispatch window | L1 | INTENDED ONLY | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | High |
| V1-ART-019 | Availability → Per-day working-hours rows (directory model) | L2 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-ART-020 | Availability → Provider live GPS position | L1 | INTENDED ONLY | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | High |
| V1-ART-021 | Availability → "Notify me when this artisan is free" | L2 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-ART-022 | Availability → Admin availability override | L2 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-ART-023 | Dispatch log → Per-request dispatch/hop history | L0 | INTENDED ONLY | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | High |
| V1-ART-024 | Catalogue → At-home vehicle services | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-ART-025 | Catalogue → Transport & heavy-equipment services | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-ART-026 | Catalogue → `popular` merchandising flag on services | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-ART-027 | Artisan dashboard → Business KPI tiles | L2 | PARTIAL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-ART-028 | Artisan dashboard → Quote acceptance rate | L2 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-ART-029 | Artisan dashboard → Tier + availability chips in the header | L2 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-ART-030 | Artisan dashboard → Non-artisan guard page | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | KEEP | Low |
| V1-ART-031 | Cross-sell → Marketer recruitment card in the Service Hub | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-ART-032 | Cross-sell → Tender entry point from the Service Hub | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-ART-033 | Client reviews → Public per-artisan review thread | L2 | PARTIAL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-ART-034 | Data model → Three parallel provider/rating stores | L2 | BROKEN | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | High |
| V1-TEND-001 | Tender → Create RFQ | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-TEND-002 | Tender → Duration bounds 3–30 days | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-TEND-003 | Tender → Per-user tender settings | L2 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-TEND-004 | Tender → Browse with filters and sorts | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-TEND-005 | Tender → Live time-remaining + expiry flag | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-TEND-006 | Tender → Edit while open | L4 | FULL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-TEND-007 | Bidding → Place a bid | L4 | FULL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-TEND-008 | Bidding → Verified-artisan-only eligibility | L4 | FULL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-TEND-009 | Bidding → Self-bid prevention | L4 | FULL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | KEEP | Low |
| V1-TEND-010 | Bidding → One live bid per artisan per tender | L4 | FULL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | KEEP | Low |
| V1-TEND-011 | Bidding → **Sealed bids** (`isHidden`) | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | High |
| V1-TEND-012 | Bidding → Update a bid before expiry | L4 | FULL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | FIX REGRESSION | Med |
| V1-TEND-013 | Bidding → Withdraw a bid | L4 | FULL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-TEND-014 | Award → Award a specific bid | L4 | FULL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-TEND-015 | Award → Award after close | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-TEND-016 | Lifecycle → Close early | L4 | FULL | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-TEND-017 | Lifecycle → Extend duration | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-TEND-018 | Lifecycle → Auto-close expired tenders (cron) | L4 | FULL | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-TEND-019 | Audit → Tender activity log | L4 | FULL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-TEND-020 | Notifications → 5 tender notification types | L4 | FULL | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-TEND-021 | Dashboards → Owner tender dashboard | L4 | FULL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-TEND-022 | Dashboards → Bidder bids dashboard | L4 | FULL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-TEND-023 | Admin → Tender admin console | L4 | FULL | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-TEND-024 | Defect → Owner cancel calls the admin route | L3 | BROKEN | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | none | FIX REGRESSION | Med |
| V1-AUC-001 | Model → Standalone `Auction` entity | L4 | FULL | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | PRODUCT OWNER DECISION | High |
| V1-AUC-002 | Model → AUCTION vs TENDER auction type | L4 | FULL | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-AUC-003 | Model → `isBinding` legal flag | L2 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-AUC-004 | Model → Multi-currency auctions | L4 | FULL | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | KEEP | Low |
| V1-AUC-005 | Model → Optimistic concurrency `version` | L4 | FULL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | KEEP | Low |
| V1-AUC-006 | Creation → Office permission gate | L4 | FULL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-AUC-007 | Creation → Auction-ban gate | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | High |
| V1-AUC-008 | Creation → Per-office auction settings | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-AUC-009 | Creation → Max-duration cap at creation | L4 | FULL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | KEEP | Low |
| V1-AUC-010 | Creation → Create-auction form with eligibility pre-check | L4 | FULL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | KEEP | Low |
| V1-AUC-011 | Discovery → Public auction grid with filters | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-AUC-012 | Discovery → Auction cards with property media | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-AUC-013 | Discovery → Bid + participant counts on every read | L4 | FULL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | KEEP | Low |
| V1-AUC-014 | Detail → Detail page with gallery + lightbox | L3 | BROKEN | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | FIX REGRESSION | High |
| V1-AUC-015 | Bidding → Transactional bid placement | L4 | FULL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | KEEP | Med |
| V1-AUC-016 | Bidding → Minimum-increment enforcement | L4 | FULL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | KEEP | Low |
| V1-AUC-017 | Bidding → Typed bid error codes | L4 | FULL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | KEEP | Low |
| V1-AUC-018 | Bidding → Bid IP-address capture | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-AUC-019 | Bidding → Duplicate-amount guard | L4 | FULL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | KEEP | Low |
| V1-AUC-020 | Bidding → Self-bid block | L3 | PARTIAL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | FIX REGRESSION | Med |
| V1-AUC-021 | Bidding → Blocked-bidder enforcement at bid time | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-AUC-022 | Auto-bid → Proxy bidding engine | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-AUC-023 | Auto-bid → Auto-bid toggle UI | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Low |
| V1-AUC-024 | Auto-bid → Max-auto-bid validation | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Low |
| V1-AUC-025 | Countdown → Live countdown component | L4 | FULL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | KEEP | Low |
| V1-AUC-026 | Countdown → Sub-5-minute urgency animation | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-AUC-027 | Anti-sniping → 5-minute auto-extension on late bids | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | High |
| V1-AUC-028 | Anti-sniping → Configurable extension window (unused) | L2 | STUB | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-AUC-029 | Participants → Participant registry auto-populated on first bid | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-AUC-030 | Participants → Block a bidder from one auction | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-AUC-031 | Deposits → Deposit / bid-bond data model | L2 | INTENDED ONLY | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | PRODUCT OWNER DECISION | High |
| V1-AUC-032 | Closing → Cron auto-close of expired auctions | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | High |
| V1-AUC-033 | Closing → Winner determination by highest bid | L4 | FULL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | KEEP | Low |
| V1-AUC-034 | Closing → No-bid outcome | L4 | FULL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | KEEP | Low |
| V1-AUC-035 | Closing → Seller accept / reject of the top bid (TENDER) | L4 | FULL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-AUC-036 | Cancellation → Cancel an auction | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-AUC-037 | Cancellation → Admin cancel endpoint | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-AUC-038 | Reports → Report an auction | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-AUC-039 | Reports → Resolve reports (admin/moderator) | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-AUC-040 | Audit → Auction event log | L4 | FULL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | KEEP + IMPROVE | Low |
| V1-AUC-041 | Fraud → Suspicious-relist detection | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | High |
| V1-AUC-042 | Fraud → Auto-suspend the relisted auction | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | High |
| V1-AUC-043 | Fraud → 7-day proof deadline | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | High |
| V1-AUC-044 | Fraud → Sale-proof submission | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | High |
| V1-AUC-045 | Fraud → Admin proof verification | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | High |
| V1-AUC-046 | Fraud → Reject proof ⇒ full ban cascade | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | High |
| V1-AUC-047 | Fraud → False-positive clear | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-AUC-048 | Fraud → Auto-block on deadline lapse (cron) | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | High |
| V1-AUC-049 | Fraud → Relist monitoring console | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-AUC-050 | Fraud → Monthly manipulation report | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-AUC-051 | Fraud → Office's own relist-case view | L3 | BROKEN | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | FIX REGRESSION | High |
| V1-AUC-052 | Intelligence → Office rating engine | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-AUC-053 | Intelligence → Rating snapshot history | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-AUC-054 | Intelligence → Hourly rating recalculation (cron) | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-AUC-055 | Intelligence → Auction classification tiers | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-AUC-056 | Intelligence → Bidder recommendations | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-AUC-057 | Intelligence → Early-warning scan | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-AUC-058 | Intelligence → Early-warning triage | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-AUC-059 | Analytics → Public auction stats API | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-AUC-060 | Analytics → Auction statistics page | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-AUC-061 | Analytics → Auction history archive page | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-AUC-062 | Analytics → Price-history model + read API | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-AUC-063 | Analytics → Price-history write path | L2 | BROKEN | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | FIX REGRESSION | Med |
| V1-AUC-064 | Content → Auction FAQ page | L1 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Low |
| V1-AUC-065 | Content → Auction terms & conditions page | L1 | FULL | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | RESTORE | Med |
| V1-AUC-066 | Realtime → Dedicated `/auctions` Socket.IO namespace | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-AUC-067 | Realtime → 8 auction event types | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-AUC-068 | Notifications → Auction notification vocabulary | L2 | INTENDED ONLY | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | High |
| V1-AUC-069 | Contract → Auction contract PDF generator | L1 | BROKEN | NOT APPLICABLE | FULL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Low |
| V1-AUC-070 | Contract → OTP verification block on the contract | L0 | INTENDED ONLY | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | PRODUCT OWNER DECISION | Low |
| V1-AUC-071 | Dashboards → Office auction dashboard | L3 | BROKEN | NOT APPLICABLE | FULL | NOT APPLICABLE | none | FIX REGRESSION | High |
| V1-AUC-072 | Dashboards → Bidder "my bids" dashboard | L3 | BROKEN | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-AUC-073 | Admin → Auction management console | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | High |
| V1-AUC-074 | Admin → Auction moderation KPIs | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Low |
| V1-AUC-075 | Platform → In-process cron scheduler | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | High |

## V1 Acquisition funnels, Smart Landing, Support, SEO, Lookups, Knowledge, Licensing, i18n, Admin ops
*ROUND-2 (V1 + desktop C# source)*

| ID | Feature | V1 depth | V1 | Old V2 | Current V2 | Desktop | Tests | Decision | Risk |
|---|---|---|---|---|---|---|---|---|---|
| V1-ACQ-001 | Funnel architecture → Four-funnel sector router | L4 | FULL | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | High |
| V1-ACQ-002 | `/join` → Founder registration page | L3 | BROKEN (see V1-ACQ-003) | n/a | PARTIAL | NOT APPLICABLE | MISSING | FIX REGRESSION | High |
| V1-ACQ-003 | `/join` → **`POST /auth/quick-register` is a stub** | L1 | BROKEN | n/a | NOT APPLICABLE | NOT APPLICABLE | MISSING | FIX REGRESSION | High |
| V1-ACQ-004 | `/join` → Professional Integrity Pledge gate | L4 | FULL (as a UI gate) | n/a | MISSING | MISSING | MISSING | RESTORE | High |
| V1-ACQ-005 | `/join` → Pledge acceptance is never persisted | L1 | BROKEN | n/a | MISSING | NOT APPLICABLE | MISSING | FIX REGRESSION | High |
| V1-ACQ-006 | `/join` → 8 self-declared user types | L2 | PARTIAL — captured, sent, discarded by the stub | n/a | MISSING | PARTIAL | MISSING | RESTORE | Med |
| V1-ACQ-007 | `/join` → `userType` is a string, not a role | L1 | BROKEN | n/a | NOT APPLICABLE | NOT APPLICABLE | MISSING | PRODUCT OWNER DECISION | High |
| V1-ACQ-008 | `/join` → 5th independent city vocabulary | L1 | PARTIAL | n/a | NOT APPLICABLE | NOT APPLICABLE | MISSING | MERGE INTO NEW SYSTEM | Med |
| V1-ACQ-009 | `/join` → Bilingual Zod validation | L4 | FULL | n/a | PARTIAL | NOT APPLICABLE | MISSING | KEEP | Low |
| V1-ACQ-010 | `/join` → Redirect-target contract | L4 | FULL | n/a | MISSING | NOT APPLICABLE | MISSING | KEEP | Med |
| V1-ACQ-011 | `/join` → Six founder benefit promises | L1 | FULL (as a claim) | n/a | MISSING | PARTIAL | MISSING | PRODUCT OWNER DECISION | High |
| V1-ACQ-012 | `/join` → "Free Forever" founder membership badge | L1 | FULL (as a claim) | n/a | MISSING | NOT APPLICABLE | MISSING | PRODUCT OWNER DECISION | High |
| V1-ACQ-013 | `/for-professionals` → Craftsman supply landing | L4 | FULL (page) | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | High |
| V1-ACQ-014 | `/for-professionals` → 8-trade illustrated grid | L1 | FULL | n/a | PARTIAL | PARTIAL | MISSING | MERGE INTO NEW SYSTEM | Med |
| V1-ACQ-015 | `/for-professionals` → Six provider benefit promises | L1 | INTENDED ONLY | n/a | PARTIAL | PARTIAL | MISSING | PRODUCT OWNER DECISION | Med |
| V1-ACQ-016 | `/for-professionals` → **Zero-commission promise** | L1 | FULL (as a claim) | n/a | MISSING | NOT APPLICABLE | MISSING | PRODUCT OWNER DECISION | High |
| V1-ACQ-017 | `/for-professionals` → Integrity pledge restated on the landing | L4 | FULL | n/a | MISSING | MISSING | MISSING | RESTORE | Med |
| V1-ACQ-018 | `/for-offices` → Office / SaaS landing | L4 | FULL (page) | n/a | MISSING | FULL | MISSING | RESTORE | High |
| V1-ACQ-019 | `/for-offices` → Three-tier plan preview | L1 | PARTIAL — hardcoded, not read from `Plan` | n/a | MISSING | NOT APPLICABLE | MISSING | MERGE INTO NEW SYSTEM | Med |
| V1-ACQ-020 | `/for-offices` → Verified Office badge + Integrity Charter | L1 | INTENDED ONLY — no code links a web ban to a licence revoke | n/a | MISSING | PARTIAL | MISSING | RESTORE | High |
| V1-ACQ-021 | `/for-offices` → Desktop cross-sell panel | L1 | FULL (as a claim) | n/a | MISSING | FULL | MISSING | KEEP + IMPROVE | Med |
| V1-ACQ-022 | `/for-offices` → **Unsupportable platform claim** | L0 | BROKEN (claim) | n/a | NOT APPLICABLE | NOT APPLICABLE | MISSING | PRODUCT OWNER DECISION | Med |
| V1-ACQ-023 | `/for-offices` → **Free-trial duration is claimed 4 different ways… | L3 | BROKEN | n/a | NOT APPLICABLE | PARTIAL | MISSING | FIX REGRESSION | High |
| V1-ACQ-024 | `/for-corporates` → Enterprise / B2B landing | L4 | FULL | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | Med |
| V1-ACQ-025 | `/for-corporates` → Non-real-estate service lines | L0 | INTENDED ONLY | n/a | MISSING | NOT APPLICABLE | MISSING | PRODUCT OWNER DECISION | Med |
| V1-ACQ-026 | `/for-corporates` → Lead-only funnel (no account) | L4 | FULL | n/a | MISSING | NOT APPLICABLE | MISSING | KEEP | Low |
| V1-ACQ-027 | `/for-corporates` → Corporate credentials & parent-company disclos… | L1 | FULL | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | Med |
| V1-ACQ-028 | `/contact` → **Contact form discards every submission** | L1 | BROKEN | n/a | UNKNOWN | NOT APPLICABLE | MISSING | FIX REGRESSION | High |
| V1-ACQ-029 | `/pricing` → Route resolves to a "coming soon" stub | L1 | BROKEN (as a funnel step) | n/a | PARTIAL | NOT APPLICABLE | MISSING | FIX REGRESSION | High |
| V1-ACQ-030 | `/pricing` → **`Pricing.tsx` is orphaned** | L3 | MISSING (unreachable) | n/a | PARTIAL | NOT APPLICABLE | MISSING | RESTORE | High |
| V1-ACQ-031 | `/pricing` → Four audience plan tabs | L3 | PARTIAL (page unreachable) | n/a | MISSING | PARTIAL | MISSING | RESTORE | Med |
| V1-ACQ-032 | `/pricing` → Payment-gateway trust strip | L1 | PARTIAL (unreachable) | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | Low |
| V1-ACQ-033 | `/about` → Brand, values and legal disclaimer hub | L1 | FULL | n/a | MISSING | NOT APPLICABLE | MISSING | KEEP + IMPROVE | Med |
| V1-ACQ-034 | `/` Home → Location-aware featured grid + empty state | L3 | PARTIAL | n/a | PARTIAL | NOT APPLICABLE | MISSING | KEEP + IMPROVE | Med |
| V1-ACQ-035 | `/` Home → Currency-based listing filter | L3 | PARTIAL — LB and PS both default to USD, so they cross-contaminate | n/a | MISSING | NOT APPLICABLE | MISSING | FIX REGRESSION | Med |
| V1-LAND-001 | Rulebook → URL-parameter personalisation engine | L3 | PARTIAL | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | High |
| V1-LAND-002 | Inputs → Arabic parameter synonyms | L4 | FULL | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | Med |
| V1-LAND-003 | Inputs → UTM capture | L3 | PARTIAL — captured, then discarded by the receiver (V1-LAND-018) | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | High |
| V1-LAND-004 | Inputs → `hasParams` gate omits `utm_medium` | L3 | PARTIAL | n/a | NOT APPLICABLE | NOT APPLICABLE | MISSING | FIX REGRESSION | Low |
| V1-LAND-005 | Category → 30 aliases → 10 canonical keys | L4 | FULL (corrects the "28 aliases" figure) | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | Med |
| V1-LAND-006 | Category → Unknown category passes through unchanged | L3 | PARTIAL | n/a | NOT APPLICABLE | NOT APPLICABLE | MISSING | KEEP + IMPROVE | Low |
| V1-LAND-007 | Category → **`chalet` and `warehouse` have no banner config** | L2 | BROKEN | n/a | NOT APPLICABLE | NOT APPLICABLE | MISSING | FIX REGRESSION | Med |
| V1-LAND-008 | City → 33 city aliases → 18 cities → 9 countries | L4 | FULL (corrects the "26 entries / 8 countries" figure) | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | Med |
| V1-LAND-009 | City → **3 of 5 Saudi cities emit an invalid governorate** | L3 | BROKEN | n/a | NOT APPLICABLE | NOT APPLICABLE | MISSING | FIX REGRESSION | High |
| V1-LAND-010 | City → US cities are Latin-key only | L2 | PARTIAL | n/a | MISSING | NOT APPLICABLE | MISSING | KEEP + IMPROVE | Low |
| V1-LAND-011 | Country → Validation against 24 supported codes | L4 | FULL | n/a | PARTIAL | NOT APPLICABLE | MISSING | KEEP | Low |
| V1-LAND-012 | Precedence → URL > geo > Jeddah default | L3 | PARTIAL — a race, not a rule | n/a | MISSING | NOT APPLICABLE | MISSING | KEEP + IMPROVE | Med |
| V1-LAND-013 | Precedence → One ad click pins location for the whole tab | L4 | PARTIAL — intended, but undiscoverable and only reversible via `resetToGeo` | n/a | MISSING | NOT APPLICABLE | MISSING | PRODUCT OWNER DECISION | Med |
| V1-LAND-014 | Precedence → Rules never re-evaluate in-session | L3 | PARTIAL | n/a | NOT APPLICABLE | NOT APPLICABLE | MISSING | KEEP + IMPROVE | Med |
| V1-LAND-015 | Banner → 8 category banner configurations | L4 | FULL | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | Med |
| V1-LAND-016 | Banner → City interpolation into the headline | L4 | FULL | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | Low |
| V1-LAND-017 | Banner → **A named advertiser hardcoded in source** | L1 | BROKEN — an unbilled, undated ad placement in code with a non-dialable number | n/a | MISSING | NOT APPLICABLE | MISSING | MERGE INTO NEW SYSTEM | High |
| V1-LAND-018 | Analytics → **The tracking POST is destroyed by its receiver** | L2 | BROKEN | n/a | PARTIAL | NOT APPLICABLE | MISSING | FIX REGRESSION | High |
| V1-LAND-019 | Analytics → Session id + device classification | NOT APPLICABLE | L2 DATA_MODEL_ONLY | PARTIAL — computed, discarded | n/a | PARTIAL | none | MISSING | Phase 2 |
| V1-LAND-020 | Analytics → `landing_entry` vs `organic_visit` split | L3 | PARTIAL | n/a | MISSING | NOT APPLICABLE | MISSING | KEEP + IMPROVE | Med |
| V1-LAND-021 | Analytics → **`GET /api/analytics/landing-entries` does not exist** | L1 | BROKEN | n/a | PARTIAL | NOT APPLICABLE | MISSING | RESTORE | High |
| V1-LAND-022 | Geo → GPS → Nominatim → IP → Jeddah fallback | L4 | FULL | n/a | PARTIAL | NOT APPLICABLE | MISSING | KEEP + IMPROVE | Med |
| V1-LAND-023 | Geo → 6-step governorate matcher + ~150 aliases | L4 | FULL | n/a | PARTIAL | NOT APPLICABLE | MISSING | KEEP + IMPROVE | Med |
| V1-LAND-024 | Geo → **Eastern Province and Abu Dhabi aliases can never match** | L3 | BROKEN | n/a | NOT APPLICABLE | NOT APPLICABLE | MISSING | FIX REGRESSION | High |
| V1-LAND-025 | Geo → **Manual location never persists across sessions** | L2 | BROKEN | n/a | NOT APPLICABLE | NOT APPLICABLE | MISSING | FIX REGRESSION | Med |
| V1-LAND-026 | Geo → Dual-key legacy write for Navbar/Properties | L3 | PARTIAL — two stores, one reader each | n/a | NOT APPLICABLE | NOT APPLICABLE | MISSING | MERGE INTO NEW SYSTEM | Med |
| V1-LAND-027 | Welcome banner → Geo greeting strip | L1 | MISSING — **imported by nothing** | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | Low |
| V1-LAND-028 | Welcome banner → Arabic-only, RTL-locked | L1 | BROKEN | n/a | NOT APPLICABLE | NOT APPLICABLE | MISSING | FIX REGRESSION | Low |
| V1-LAND-029 | Page hero → Listing-driven rotating hero | L1 | MISSING — **imported by nothing**; `PageHeroSlideshow` shipped instead | n/a | MISSING | NOT APPLICABLE | MISSING | PRODUCT OWNER DECISION | Low |
| V1-LAND-030 | Route prefetch → Hover/touch/focus chunk prefetching | L4 | FULL | n/a | SUPERSEDED WITH FULL PARITY | NOT APPLICABLE | MISSING | SUPERSEDED WITH FULL PARITY | Low |
| V1-SUP-001 | Ticket console → Admin triage screen | L1 | PARTIAL — complete UI, **localStorage only** (`akar_support_tickets`, `:38,104-116`) | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | High |
| V1-SUP-002 | Ticket console → **No server ticket API exists** | L0 | MISSING | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | High |
| V1-SUP-003 | Ticket model → 4-state status lifecycle | L1 | INTENDED ONLY | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | Med |
| V1-SUP-004 | Ticket model → 4-level priority | L1 | INTENDED ONLY | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | Med |
| V1-SUP-005 | Ticket model → 6 categories | L1 | INTENDED ONLY | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | Med |
| V1-SUP-006 | Conversation → Threaded replies with role attribution | L1 | PARTIAL | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | Med |
| V1-SUP-007 | Workflow → Auto-transition open → in_progress on first reply | L1 | INTENDED ONLY | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | Med |
| V1-SUP-008 | Workflow → Closed tickets are reply-locked | L1 | INTENDED ONLY | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | Low |
| V1-SUP-009 | Triage → 3-axis filter + subject/requester search | L1 | FULL (client-side) | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | Low |
| V1-SUP-010 | Assignment → **No agent assignment exists** | L0 | MISSING | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | High |
| V1-SUP-011 | SLA → **No SLA modelling of any kind** | L0 | MISSING | n/a | MISSING | NOT APPLICABLE | MISSING | PRODUCT OWNER DECISION | High |
| V1-SUP-012 | Intake → **No user-facing ticket creation** | L0 | MISSING | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | High |
| V1-SUP-013 | Seed data → 6 fake tickets written into the operator's browser | L1 | BROKEN (as an operational surface) | n/a | NOT APPLICABLE | NOT APPLICABLE | MISSING | FIX REGRESSION | Med |
| V1-SUP-014 | Adjacent channel → Support e-mail addresses are the only working e… | L1 | FULL | n/a | UNKNOWN | NOT APPLICABLE | MISSING | KEEP | Low |
| V1-SUP-015 | Adjacent channel → Admin-chat support types (`system`, `warning`) … | NOT APPLICABLE | maps to MSG-* | none | `AdminChat` | L2 DATA_MODEL_ONLY | PARTIAL | admin | MISSING |
| V1-SEO-001 | Admin console → 4-tab SEO manager | L1 | PARTIAL — **localStorage only** (`akar_seo_settings`, `:46,157-159`) | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | High |
| V1-SEO-002 | Consumption → **Nothing in V1 reads the SEO store** | NOT APPLICABLE | none | L1 UI_ONLY | BROKEN | n/a | none | none | P1 |
| V1-SEO-003 | Global meta → Title suffix, default OG image, Twitter card type, F… | L1 | INTENDED ONLY | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | Med |
| V1-SEO-004 | Global meta → **Three different title suffixes coexist** | NOT APPLICABLE | none | none | L1 UI_ONLY | BROKEN | n/a | none | FIX REGRESSION |
| V1-SEO-005 | Page meta → 20 seeded routes × 7 bilingual fields | L1 | INTENDED ONLY | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | High |
| V1-SEO-006 | Page meta → **Bilingual meta is authored but never emitted** | L1 | BROKEN | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | High |
| V1-SEO-007 | Indexing → `noIndex` toggle emits no robots meta | L1 | BROKEN | n/a | UNKNOWN | NOT APPLICABLE | MISSING | FIX REGRESSION | High |
| V1-SEO-008 | Canonical → `canonicalUrl` field emits no `<link rel="canonical">` | L1 | BROKEN | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | Med |
| V1-SEO-009 | hreflang → **Not modelled anywhere** | L0 | MISSING | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | High |
| V1-SEO-010 | Sitemap → XML generator with exclusions | L1 | PARTIAL — generates correctly, publishes nowhere | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | Med |
| V1-SEO-011 | Sitemap → Browser download instead of publication | L1 | PARTIAL | n/a | NOT APPLICABLE | NOT APPLICABLE | MISSING | FIX REGRESSION | Med |
| V1-SEO-012 | Sitemap → `autoUpdate` toggle controls nothing | L0 | INTENDED ONLY | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | Low |
| V1-SEO-013 | robots.txt → Editable robots blob, never served | L1 | PARTIAL | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | Med |
| V1-SEO-014 | Structured data → 3 JSON-LD seeds with a JSON validator | L1 | PARTIAL — validated and stored, **never injected**; V1 ships zero structured data | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | High |
| V1-SEO-015 | OG / Twitter → Runtime card tags | L4 | PARTIAL — no `og:url`, no `og:locale`, no per-page image unless a prop is passed | n/a | UNKNOWN | NOT APPLICABLE | MISSING | KEEP + IMPROVE | Med |
| V1-SEO-016 | OG / Twitter → **`twitter:card` conflicts between the two emitters… | L3 | BROKEN | n/a | NOT APPLICABLE | NOT APPLICABLE | MISSING | FIX REGRESSION | Low |
| V1-SEO-017 | Document shell → `index.html` head block | L4 | PARTIAL — no canonical, no hreflang, no JSON-LD, no `og:image` | n/a | PARTIAL | NOT APPLICABLE | MISSING | KEEP + IMPROVE | Med |
| V1-SEO-018 | Document shell → `<html lang="ar" dir="rtl">` hardcoded | L3 | PARTIAL | n/a | PARTIAL | NOT APPLICABLE | MISSING | KEEP + IMPROVE | Med |
| V1-SEO-019 | Public artefacts → `public/` is not staged — 7 artefacts unverifia… | UNKNOWN | OLD SOURCE REQUIRED | n/a | UNKNOWN | NOT APPLICABLE | MISSING | OLD SOURCE REQUIRED | High |
| V1-LKP-001 | Taxonomy admin → 7-taxonomy lookup console | L1 | PARTIAL — **localStorage only** (`akar_lookups`, `:36,137-150,176-179`) | n/a | MISSING | PARTIAL | MISSING | RESTORE | High |
| V1-LKP-002 | Taxonomy admin → **Zero consumers** | NOT APPLICABLE | L1 UI_ONLY | BROKEN | n/a | NOT APPLICABLE | none | MISSING | Phase 2 |
| V1-LKP-003 | Item shape → Bilingual name + auto-slug + sortOrder + isActive | L2 | PARTIAL | n/a | PARTIAL | PARTIAL | MISSING | MERGE INTO NEW SYSTEM | Med |
| V1-LKP-004 | Taxonomy → `cities` — 10 Omani seeds | L1 | PARTIAL — Oman-only, while the product claims 22 countries | n/a | PARTIAL | NOT APPLICABLE | MISSING | MERGE INTO NEW SYSTEM | Med |
| V1-LKP-005 | Taxonomy → `propertyTypes` — 6 seeds | L1 | PARTIAL — a 3rd divergent copy (see V1-LKP-010) | n/a | PARTIAL | FULL | MISSING | MERGE INTO NEW SYSTEM | Med |
| V1-LKP-006 | Taxonomy → `specializations` — 15 trade seeds | L1 | PARTIAL | n/a | PARTIAL | PARTIAL | MISSING | MERGE INTO NEW SYSTEM | Med |
| V1-LKP-007 | Taxonomy → `serviceCategories` — 10 seeds | L1 | PARTIAL — overlaps `specializations` (سباكة/كهرباء in both) with no relation between the two | n/a | PARTIAL | NOT APPLICABLE | MISSING | MERGE INTO NEW SYSTEM | Med |
| V1-LKP-008 | Taxonomy → `amenities` — 10 seeds | L1 | PARTIAL | n/a | PARTIAL | PARTIAL | MISSING | MERGE INTO NEW SYSTEM | Med |
| V1-LKP-009 | Taxonomy → `tags` (10) and `listingPurposes` (2) | L1 | PARTIAL — `listingPurposes` (2) is far narrower than PROP-034's 5 regional offer types | n/a | PARTIAL | PARTIAL | MISSING | MERGE INTO NEW SYSTEM | Med |
| V1-LKP-010 | Fragmentation → **Five parallel city vocabularies** | L2 | BROKEN — six sources, no single truth; the drift causes V1-LAND-009 and V1-LAND-024 | n/a | PARTIAL | PARTIAL | MISSING | MERGE INTO NEW SYSTEM | High |
| V1-LKP-011 | Server taxonomy → `Category` model + guarded CRUD | L4 | FULL (server side) | n/a | PARTIAL | NOT APPLICABLE | MISSING | KEEP + IMPROVE | Med |
| V1-LKP-012 | Server taxonomy → 5 category sections | L4 | FULL | n/a | PARTIAL | NOT APPLICABLE | MISSING | KEEP | Med |
| V1-LKP-013 | Server taxonomy → **`AdminCategories` cannot call its own API** | L1 | BROKEN — list, create, update, toggle and delete all fail | n/a | NOT APPLICABLE | NOT APPLICABLE | MISSING | FIX REGRESSION | High |
| V1-LKP-014 | Geo API → `/api/countries`, `/governorates/:code`, `/cities/:gov` | L4 | FULL (server) / MISSING (client) — **zero frontend callers** | n/a | PARTIAL | NOT APPLICABLE | MISSING | KEEP + IMPROVE | Med |
| V1-LKP-015 | Geo data → Client and server city files have drifted | L2 | BROKEN | n/a | NOT APPLICABLE | PARTIAL | MISSING | MERGE INTO NEW SYSTEM | High |
| V1-LKP-016 | Geo data → `citiesData.json` is keyed by bare governorate name | L2 | BROKEN | n/a | PARTIAL | NOT APPLICABLE | MISSING | FIX REGRESSION | Med |
| V1-LKP-017 | Settings store → `Setting` key/value table used for exactly one key | L4 | PARTIAL — a real config store with one consumer, while `AdminSettings` (30 fields) uses localStorage | n/a | PARTIAL | PARTIAL | MISSING | KEEP + IMPROVE | Med |
| V1-KNOW-001 | Blog/forum → Public listing with search + category + paging | L4 | FULL | n/a | PARTIAL | NOT APPLICABLE | MISSING | KEEP + IMPROVE | Med |
| V1-KNOW-002 | Blog/forum → Branded as a forum, implemented as a blog | L3 | PARTIAL — no threads, no replies, no pinning | n/a | PARTIAL | NOT APPLICABLE | MISSING | PRODUCT OWNER DECISION | Med |
| V1-KNOW-003 | Blog → 5 server-side categories | L3 | PARTIAL — hardcoded, no admin | n/a | PARTIAL | NOT APPLICABLE | MISSING | MERGE INTO NEW SYSTEM | Med |
| V1-KNOW-004 | Blog → Fully bilingual post model | L4 | FULL | n/a | PARTIAL | NOT APPLICABLE | MISSING | KEEP + IMPROVE | Med |
| V1-KNOW-005 | Blog → Geo-scoped posts (`country`, `city`) | L2 | PARTIAL — stored, never filtered on (`blog.ts:22-27` has no country/city predicate) | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | Med |
| V1-KNOW-006 | Blog → Authenticated authoring | L4 | FULL | n/a | PARTIAL | NOT APPLICABLE | MISSING | KEEP + IMPROVE | Med |
| V1-KNOW-007 | Blog → **No update, delete or unpublish API** | L3 | MISSING | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | High |
| V1-KNOW-008 | Blog → Everything is force-published | L3 | PARTIAL | n/a | PARTIAL | NOT APPLICABLE | MISSING | RESTORE | Med |
| V1-KNOW-009 | Blog admin → **`AdminBlog` is a disconnected localStorage store** | L1 | BROKEN | n/a | MISSING | NOT APPLICABLE | MISSING | FIX REGRESSION | High |
| V1-KNOW-010 | Blog → Server posts are copied into the fake admin store during re… | L1 | BROKEN | n/a | NOT APPLICABLE | NOT APPLICABLE | MISSING | FIX REGRESSION | Med |
| V1-KNOW-011 | Blog → **Rich text is authored, then rendered as escaped plain tex… | L3 | BROKEN | n/a | UNKNOWN | NOT APPLICABLE | MISSING | FIX REGRESSION | High |
| V1-KNOW-012 | Blog → Rich-text editor: `execCommand` + base64 image inlining | L3 | PARTIAL — deprecated API; data-URLs bloat rows and bypass media storage | n/a | MISSING | NOT APPLICABLE | MISSING | SUPERSEDED WITH FULL PARITY | Med |
| V1-KNOW-013 | Blog → **Comments are per-browser and unowned** | L1 | BROKEN | n/a | PARTIAL | NOT APPLICABLE | MISSING | RESTORE | High |
| V1-KNOW-014 | Blog → Card component with i18n category chips and AR/EN fallback | L4 | FULL | n/a | REGRESSION (V2 is worse) | NOT APPLICABLE | MISSING | KEEP | Low |
| V1-KNOW-015 | Static pages → `AdminContent` — 4 bilingual static pages | L1 | PARTIAL — **localStorage only** (`akar_static_content`, `:27,82,105`) | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | High |
| V1-KNOW-016 | Static pages → **Legal copy edited in admin is never shown to user… | NOT APPLICABLE | L1 UI_ONLY | BROKEN — compliance risk, not cosmetic | n/a | NOT APPLICABLE | none | MISSING | Phase 1 |
| V1-KNOW-017 | Static pages → Substantive seeded legal terms | L1 | INTENDED ONLY | n/a | UNKNOWN | NOT APPLICABLE | MISSING | PRODUCT OWNER DECISION | High |
| V1-KNOW-018 | Free resources → Two-tab library (books / software) | L1 | BROKEN — see V1-KNOW-019/020 | n/a | PARTIAL | NOT APPLICABLE | MISSING | RESTORE | High |
| V1-KNOW-019 | Free resources → **Upload posts into the catch-all and is discarde… | L1 | BROKEN | n/a | PARTIAL | NOT APPLICABLE | MISSING | FIX REGRESSION | High |
| V1-KNOW-020 | Free resources → **Download endpoint does not exist; delete is a n… | L1 | BROKEN | n/a | PARTIAL | NOT APPLICABLE | MISSING | FIX REGRESSION | High |
| V1-KNOW-021 | Free resources → **The model cannot store the product** | L2 | BROKEN | n/a | PARTIAL | NOT APPLICABLE | MISSING | RESTORE | High |
| V1-KNOW-022 | Free resources → Bilingual publishing with a language selector | L1 | INTENDED ONLY (unstorable) | n/a | PARTIAL | NOT APPLICABLE | MISSING | RESTORE | Med |
| V1-KNOW-023 | Free resources → 11 seeded resource categories | L1 | PARTIAL — hardcoded bilingual strings, not a taxonomy | n/a | MISSING | NOT APPLICABLE | MISSING | MERGE INTO NEW SYSTEM | Med |
| V1-KNOW-024 | Free resources → Auth-gated download + counter | L2 | PARTIAL — gate is client-side only and the endpoint is absent | n/a | PARTIAL | NOT APPLICABLE | MISSING | RESTORE | Med |
| V1-KNOW-025 | Free resources → **Ban enforcement reads a user-writable store** | L1 | BROKEN — trivially bypassed | n/a | NOT APPLICABLE | NOT APPLICABLE | MISSING | FIX REGRESSION | High |
| V1-LIC-001 | Software catalogue → `/software` product page | L1 | BROKEN — see V1-LIC-002 | n/a | MISSING | FULL | MISSING | RESTORE | High |
| V1-LIC-002 | Software catalogue → **The product endpoint returns licence keys** | L1 | BROKEN — every price tier is filtered out (`Software.tsx:46`); **and active licence keys are exposed on an unauthenticated endpoint** | n/a | NOT APPLICABLE | NOT APPLICABLE | MISSING | FIX REGRESSION | High |
| V1-LIC-003 | Software catalogue → No product model exists | L0 | MISSING | n/a | MISSING | PARTIAL | MISSING | RESTORE | High |
| V1-LIC-004 | Free trial → Anonymous 30-day trial key minting | L4 | BROKEN — unlimited unattributable key farming | n/a | MISSING | FULL | MISSING | FIX REGRESSION | High |
| V1-LIC-005 | Free trial → **Four contradictory trial durations** | L3 | BROKEN | n/a | NOT APPLICABLE | PARTIAL | MISSING | FIX REGRESSION | High |
| V1-LIC-006 | Download → **The installer download endpoint is not mounted** | L3 | BROKEN | n/a | MISSING | FULL | MISSING | FIX REGRESSION | High |
| V1-LIC-007 | Download → Version JSON field-name mismatch | L3 | BROKEN | n/a | NOT APPLICABLE | FULL | MISSING | FIX REGRESSION | High |
| V1-LIC-008 | Versioning → `DesktopVersion` with `minVersion` + `forceUpdate` + … | L4 | PARTIAL | n/a | MISSING | FULL | MISSING | RESTORE | Med |
| V1-LIC-009 | Purchase → `/buy-license` commercial page | L3 | BROKEN — see V1-LIC-010 | n/a | MISSING | FULL | MISSING | RESTORE | High |
| V1-LIC-010 | Purchase → **Every purchase becomes a 30-day trial** | L3 | BROKEN — buyer identity and amount paid are discarded | n/a | NOT APPLICABLE | BROKEN | MISSING | FIX REGRESSION | High |
| V1-LIC-011 | Purchase → Success handler reads a field the server never returns | L3 | BROKEN | n/a | NOT APPLICABLE | NOT APPLICABLE | MISSING | FIX REGRESSION | Med |
| V1-LIC-012 | Verification → `/verify-license` 4-state checker | L3 | BROKEN — reads `validation.status`, which the API never returns; not-found is a 404 that `apiRequest` throws, so 3 of the 4 states are unreachable | n/a | MISSING | FULL | MISSING | FIX REGRESSION | Med |
| V1-LIC-013 | Verification → Public validate endpoint | L4 | PARTIAL — returns the **whole licence row** to an unauthenticated caller | n/a | MISSING | FULL | MISSING | FIX REGRESSION | Med |
| V1-LIC-014 | Redemption → `LicenseCode` → `SoftwareLicense` redemption | L4 | FULL | n/a | MISSING | FULL | MISSING | KEEP + IMPROVE | High |
| V1-LIC-015 | Redemption → **Four duplicate redemption endpoints** | L4 | PARTIAL — 4 copies to keep in sync, all unauthenticated | n/a | NOT APPLICABLE | NOT APPLICABLE | MISSING | MERGE INTO NEW SYSTEM | High |
| V1-LIC-016 | Admin → Licence issue / revoke console | L4 | FULL | n/a | MISSING | FULL | MISSING | KEEP | Med |
| V1-LIC-017 | Admin → Desktop key lifecycle console | L4 | FULL (mutations) | n/a | MISSING | FULL | MISSING | KEEP | Med |
| V1-LIC-018 | Admin → KPI tiles read `licenseType`; the API returns `type` | L3 | BROKEN | n/a | NOT APPLICABLE | NOT APPLICABLE | MISSING | FIX REGRESSION | Low |
| V1-NOTIF2-001 | Service worker → `/sw.js` registration on load | L3 | PARTIAL — the worker file is in the unstaged `public/` (V1-SEO-019) | n/a | BROKEN | NOT APPLICABLE | MISSING | OLD SOURCE REQUIRED | High |
| V1-NOTIF2-002 | Install → Install-prompt broker | L3 | MISSING — **`InstallPWA` is never mounted**, so the PWA can never be installed from inside the app | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | Med |
| V1-NOTIF2-003 | Manifest → Web-app manifest + Apple meta | L3 | PARTIAL — the manifest itself is unstaged | n/a | UNKNOWN | NOT APPLICABLE | MISSING | OLD SOURCE REQUIRED | Med |
| V1-NOTIF2-004 | Push consent → Permission banner with 5 suppression rules | L3 | PARTIAL — well-gated UI over the broken subscribe path (`V1-NOTIF-015`) | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | Med |
| V1-NOTIF2-005 | Push delivery → Web push, e-mail, in-app notification engine | L3 | see `frag2/12` | n/a | see `frag2/12` | NOT APPLICABLE | n/a | MERGE INTO NEW SYSTEM | High |
| V1-I18N-001 | Bundle → i18next + react-i18next, AR/EN | L4 | FULL | n/a | BETTER THAN OLD (V2 has 3 locales) | FULL | MISSING | SUPERSEDED WITH FULL PARITY | Med |
| V1-I18N-002 | Bundle → 720 keys × 22 namespaces, perfect AR/EN parity | L4 | FULL | n/a | PARTIAL | FULL | **MISSING — no parity test** | KEEP + IMPROVE | Med |
| V1-I18N-003 | Architecture → **Copy lives in JSX ternaries, not in the bundle** | L3 | PARTIAL — a third language cannot be added without editing 167 files; no copy change without a redeploy | n/a | BETTER THAN OLD | FULL | MISSING | MERGE INTO NEW SYSTEM | High |
| V1-I18N-004 | Detection → localStorage-only language detection | L4 | PARTIAL — a first-time English speaker always lands in Arabic | n/a | UNKNOWN | FULL | MISSING | KEEP + IMPROVE | Med |
| V1-I18N-005 | Routing → No locale-prefixed URLs | L0 | MISSING | n/a | UNKNOWN | NOT APPLICABLE | MISSING | RESTORE | High |
| V1-I18N-006 | Direction → Direction, lang and font switching | L4 | FULL | n/a | FULL | FULL | MISSING | KEEP | Low |
| V1-I18N-007 | Hook → `useLanguage()` contract | L4 | FULL | n/a | PARTIAL | FULL | MISSING | KEEP | Low |
| V1-I18N-008 | Admin → **No translation console** | L0 | MISSING | n/a | BETTER THAN OLD | NOT APPLICABLE | MISSING | SUPERSEDED WITH FULL PARITY | Med |
| V1-I18N-009 | Formatting → Country-aware date format | L4 | FULL | n/a | MISSING | FULL | MISSING | RESTORE | Med |
| V1-I18N-010 | Formatting → Currency naming and locale-aware price formatting | NOT APPLICABLE | L4 END_TO_END_WIRED | FULL | n/a | PARTIAL | none | MISSING | Phase 2 |
| V1-I18N-011 | Formatting → **A fourth, hardcoded FX table** | L2 | BROKEN — stale rates presented as guidance, no source of truth | n/a | UNKNOWN | PARTIAL | MISSING | FIX REGRESSION | High |
| V1-I18N-012 | Formatting → Country-aware area units | L4 | FULL | n/a | MISSING | PARTIAL | MISSING | RESTORE | Med |
| V1-I18N-013 | Theming → Light / dark / system tri-state | L4 | FULL | n/a | UNKNOWN | NOT APPLICABLE | MISSING | KEEP | Low |
| V1-I18N-014 | Data entry → Enter-key field navigation | L4 | FULL | n/a | MISSING | PARTIAL | MISSING | RESTORE | Med |
| V1-I18N-015 | Responsive → 768 px mobile breakpoint hook | L4 | FULL | n/a | UNKNOWN | NOT APPLICABLE | MISSING | KEEP | Low |
| V1-ADMIN-001 | Analytics → Market-analytics dashboard | L1 | BROKEN — `GET /api/analytics/market-trends` does not exist | n/a | PARTIAL | PARTIAL | MISSING | RESTORE | High |
| V1-ADMIN-002 | Analytics → Paid market-report generator | L1 | BROKEN — `/api/analytics/reports` and `/reports/:id/download` do not exist | n/a | PARTIAL | NOT APPLICABLE | MISSING | RESTORE | Med |
| V1-ADMIN-003 | Analytics → All 5 analytics calls carry both transport defects | L1 | BROKEN | n/a | NOT APPLICABLE | NOT APPLICABLE | MISSING | FIX REGRESSION | High |
| V1-ADMIN-004 | Activity log → Audit-trail viewer | L1 | BROKEN — `GET /activity-log` hits the catch-all, matches no branch, and always returns `[]` (`other.ts:61`) | n/a | PARTIAL | PARTIAL | MISSING | FIX REGRESSION | High |
| V1-ADMIN-005 | Activity log → V1 writes an audit trail it can never read | L2 | BROKEN | n/a | PARTIAL | NOT APPLICABLE | MISSING | FIX REGRESSION | High |
| V1-ADMIN-006 | Moderation → Content-report console | L1 | PARTIAL — **localStorage only** (`akar_reported_content`) | n/a | PARTIAL | NOT APPLICABLE | MISSING | RESTORE | High |
| V1-ADMIN-007 | Moderation → No report-submission path anywhere in V1 | L0 | MISSING | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | High |
| V1-ADMIN-008 | System settings → 30-field system-settings console | L1 | PARTIAL — **localStorage only** (`akar_system_settings`) | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | High |
| V1-ADMIN-009 | System settings → **Three governance switches that control nothing… | L1 | BROKEN | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | High |
| V1-ADMIN-010 | System settings → Analytics + tag-injection fields | L1 | INTENDED ONLY — nothing injects them; also an unguarded script-injection surface if ever wired | n/a | MISSING | NOT APPLICABLE | MISSING | PRODUCT OWNER DECISION | High |
| V1-ADMIN-011 | Discounts → Coupon CRUD console | L4 | FULL — the only fully working admin page in this fragment | n/a | MISSING | NOT APPLICABLE | MISSING | KEEP + IMPROVE | Med |
| V1-ADMIN-012 | Discounts → Public promo banner + code validation | L4 | PARTIAL — the only consumer is the orphaned `Pricing.tsx` (V1-ACQ-030) | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | Med |
| V1-ADMIN-013 | Discounts → Arabic promo-code transliteration | L4 | FULL — a distinctive localisation touch | n/a | MISSING | NOT APPLICABLE | MISSING | RESTORE | Low |
| V1-ADMIN-014 | Authorization → Admin surfaces are guarded client-side only | L3 | PARTIAL | n/a | PARTIAL | NOT APPLICABLE | MISSING | FIX REGRESSION | High |
| V1-ADMIN-015 | Notifications → Admin broadcast composer | L1 | see `frag2/12` | n/a | MISSING | FULL | MISSING | RESTORE | Med |
| V1-ADMIN-016 | News ticker → Ticker administration | UNKNOWN | see `frag2/13` | n/a | see `frag2/13` | FULL | n/a | MERGE INTO NEW SYSTEM | Med |
| V1-ADMIN-017 | Market data → Market rates / history / investment radar | L1 | see `frag2/17` | n/a | MISSING | PARTIAL | MISSING | RESTORE | Med |
| V1-ADMIN-018 | Server design → **A single catch-all router serves 12 mount points… | L2 | BROKEN — the root cause of V1-ADMIN-004/005, V1-KNOW-019/020 and V1-LIC-002 | n/a | NOT APPLICABLE | NOT APPLICABLE | MISSING | MERGE INTO NEW SYSTEM | High |

## V1 Engineering platform, CAD/BIM, Land/OCR, MapMyDeed
*ROUND-2 (V1 + desktop C# source)*

| ID | Feature | V1 depth | V1 | Old V2 | Current V2 | Desktop | Tests | Decision | Risk |
|---|---|---|---|---|---|---|---|---|---|
| V1-ENG-001 | Architectural Consultant → 5-step wizard shell | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | High |
| V1-ENG-002 | Architectural Consultant → 8 sector project types | L1 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-ENG-003 | Architectural Consultant → Sector questionnaire engine | L3 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-ENG-004 | Architectural Consultant → Complexity levels (Quick / Pro / Expert) | L3 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Low |
| V1-ENG-005 | Architectural Consultant → Question auto-advance + focus | L3 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | KEEP + IMPROVE | Low |
| V1-ENG-006 | Architectural Consultant → Setback / BCR derivation | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | High |
| V1-ENG-007 | Architectural Consultant → Project persistence | L0 | MISSING | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | NEW IMPROVEMENT | High |
| V1-ENG-008 | Land geometry → Boundary table (N/S/E/W length + neighbour) | L3 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-ENG-009 | Land geometry → Corner-coordinate mode + shoelace area | L3 | FULL | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-ENG-010 | Land geometry → Street context (front/back/side type + width) | L1 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Low |
| V1-ENG-011 | Structural → Floor system / soil / foundation configurator | L1 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-ENG-012 | BOQ → Bill of Quantities engine | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | High |
| V1-ENG-013 | BOQ → Rebar ratio by floor system | L3 | PARTIAL | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-ENG-014 | MEP → MEP quantity engine | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | High |
| V1-ENG-015 | Cost → Cost estimator UI | L1 | BROKEN | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | High |
| V1-ENG-016 | Cost → Market-rate contract mismatch (defect) | L1 | BROKEN | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | FIX REGRESSION | High |
| V1-ENG-017 | Pricing → Price Manager (BOQ → priced lines) | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | High |
| V1-ENG-018 | Pricing → Hard-coded KSA 15 % VAT | L1 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | PRODUCT OWNER DECISION | High |
| V1-ENG-019 | Pricing → User price overrides persisted | L2 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-ENG-020 | Pricing → Material brand preferences | L2 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | KEEP + IMPROVE | Low |
| V1-ENG-021 | Contracts → Contract Packager (discipline packages) | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-ENG-022 | Contracts → Bilingual AR/EN print contract | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-ENG-023 | Contracts → Legal contract generator with sector clauses | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-ENG-024 | Contracts → Contract "Save" reports success without saving (defect) | L1 | BROKEN | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | FIX REGRESSION | High |
| V1-ENG-025 | Sign-off → Consultant title block + QR verification | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-ENG-026 | Sign-off → QR always encodes `AKAR-PENDING` (defect) | L1 | BROKEN | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | FIX REGRESSION | Med |
| V1-ENG-027 | Diwan → Consultant validation protocol (5 pillars) | L1 | INTENDED ONLY | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | PRODUCT OWNER DECISION | High |
| V1-ENG-028 | Diwan → Engine disabled in production | L0 | INTENDED ONLY | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | PRODUCT OWNER DECISION | Med |
| V1-ENG-029 | Diwan → Consultant dashboard (5-pillar approval matrix) | L1 | STUB | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | PRODUCT OWNER DECISION | Med |
| V1-ENG-030 | Diwan → Public project verification page | L1 | BROKEN | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-ENG-031 | Fire & life safety → Fire safety engine | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | High |
| V1-ENG-032 | Security → Banking & financial security engine | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-ENG-033 | Healthcare → Medical & hospitality specialty engine | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-ENG-034 | Healthcare → Medical-grade MEP protocol | L1 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-ENG-035 | Climate/codes → Climate & global code engine | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-ENG-036 | Seismic → Seismic protection engine | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-ENG-037 | High-rise → High-rise structural engine | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-ENG-038 | Industrial → Industrial / warehouse engine | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-ENG-039 | Religious → Mosque engine | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-ENG-040 | Education → K-12 school engine | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-ENG-041 | Education → Academic & research facility engine | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-ENG-042 | Landscape → Landscape & smart irrigation engine | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-ENG-043 | Retail → Retail mall engine | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-ENG-044 | Institutional → Sovereign & institutional protocol | L1 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Low |
| V1-ENG-045 | Governance → Sovereign ethics shield | L1 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | PRODUCT OWNER DECISION | Low |
| V1-ENG-046 | Governance → Project engine passport | L1 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | KEEP + IMPROVE | Low |
| V1-ENG-047 | Spec governance → Global Configurator Protocol (GCP) | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-ENG-048 | Spec governance → GCP output is dead-ended | L1 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | FIX REGRESSION | Low |
| V1-ENG-049 | 3D → Live 3D building visualiser | L3 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-ENG-050 | Report → Print/PDF of the whole report | L3 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Low |
| V1-ENG-051 | Report → Required drawing-set checklist | L1 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | KEEP | Low |
| V1-ENG-052 | Report → Conversion CTA to offices / services | L1 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | KEEP + IMPROVE | Low |
| V1-CAD-001 | DXF ingestion → ASCII DXF parser | L3 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | High |
| V1-CAD-002 | DXF ingestion → DWG rejected with guidance | L1 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | KEEP | Low |
| V1-CAD-003 | Layer intelligence → Master layer matrix (A-/S-/E-/M-/H-/F- discip… | L3 | FULL | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | High |
| V1-CAD-004 | Layer intelligence → Visual layer mapper UI | L2 | PARTIAL | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | RESTORE | High |
| V1-CAD-005 | Layer intelligence → Named layer-mapping profiles | L2 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-CAD-006 | Layer intelligence → EN→AR layer-name auto-translation | L3 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-CAD-007 | Take-off → CAD quantity take-off | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | High |
| V1-CAD-008 | Take-off → CAD → BOQ derivation | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | High |
| V1-CAD-009 | Take-off → Wastage factors per material | L3 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-CAD-010 | Take-off → Spec inference from layer name | L3 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | KEEP + IMPROVE | Low |
| V1-CAD-011 | 3D → DXF → 3D BIM viewer | L3 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-CAD-012 | Take-off → CAD take-off has no export | L3 | MISSING | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | NEW IMPROVEMENT | Med |
| V1-CAD-013 | Drawing generation → Residential floor-plan generator | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | High |
| V1-CAD-014 | Drawing generation → Generic (non-residential) plan generator | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-CAD-015 | Drawing generation → MEP layout generator | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-CAD-016 | Drawing generation → Sections A-A / B-B + structural plan | L3 | PARTIAL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-CAD-017 | Drawing generation → DXF emitter + ACI layer palette | L3 | FULL | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-CAD-018 | Drawing output → **Full engineering set ZIP download** | L4 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | High |
| V1-CAD-019 | Drawing output → jsPDF contract inside the ZIP | L3 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | High |
| V1-CAD-020 | Drawing output → Layer-rename confirmation modal before export | L3 | FULL | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-CAD-021 | Drawing output → 4-tab SVG drawing preview | L3 | FULL | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-CAD-022 | Orphan → `dxfExportService` room-polygon DXF exporter | L2 | STUB | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | PRODUCT OWNER DECISION | Low |
| V1-CAD-023 | Orphan → Audit trail service | L2 | STUB | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-TOOL-001 | Tools hub → 6-tab engineering tools page | L3 | FULL | PARTIAL | FULL | NOT APPLICABLE | none | KEEP | Low |
| V1-TOOL-002 | Tools hub → No search / category / favourites | L1 | MISSING | NOT APPLICABLE | FULL | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-TOOL-003 | Tools hub → Dead Leaflet import on the tools page | L0 | STUB | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | none | KEEP | Low |
| V1-TOOL-004 | Coordinate converter → DD ⇄ DMS ⇄ DDM ⇄ UTM multi-row | L3 | FULL | FULL | FULL | NOT APPLICABLE | none | KEEP | Low |
| V1-TOOL-005 | Coordinate converter → **Croquis bulk paste with label detection** | L3 | FULL | MISSING | PARTIAL | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-TOOL-006 | Coordinate converter → **Split two-column paste (Northings / Easti… | L3 | FULL | MISSING | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-TOOL-007 | Coordinate converter → Copy input table / output table / per-row | L3 | FULL | PARTIAL | FULL | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-TOOL-008 | Coordinate converter → No CSV/file export | L1 | MISSING | NOT APPLICABLE | FULL | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-TOOL-009 | Area calculator → Triangle (Heron) + polygon (shoelace) | L3 | FULL | FULL | FULL | NOT APPLICABLE | none | KEEP | Low |
| V1-TOOL-010 | Area calculator → **Irregular polygon from sides + interior angles… | L3 | FULL | MISSING | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-TOOL-011 | Area calculator → **Canvas polygon sketch with side labels** | L3 | FULL | MISSING | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-TOOL-012 | Area calculator → Regular polygon by n sides | L3 | FULL | FULL | FULL | NOT APPLICABLE | none | KEEP | Low |
| V1-TOOL-013 | Points→DXF → Survey point file → DXF download | L4 | FULL | FULL | FULL | NOT APPLICABLE | none | KEEP | Low |
| V1-TOOL-014 | Points→DXF → Parse-error counting | L3 | FULL | NOT APPLICABLE | FULL | NOT APPLICABLE | none | KEEP | Low |
| V1-TOOL-015 | File→Word → PDF / image → .docx | L1 | BROKEN | FULL | FULL | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Med |
| V1-TOOL-016 | Calculator → Scientific calculator (deg/rad + keyboard) | L3 | FULL | FULL | FULL | NOT APPLICABLE | none | KEEP | Low |
| V1-TOOL-017 | Calculator → **Keyboard input support** | L3 | FULL | MISSING | MISSING | NOT APPLICABLE | none | RESTORE | Low |
| V1-TOOL-018 | Construction calculators → 8 construction calculators absent in V1 | L0 | NOT APPLICABLE | FULL | FULL | NOT APPLICABLE | none | KEEP | Low |
| V1-TOOL-019 | Tools gate → No `tools.use` permission gate in V1 | L1 | NOT APPLICABLE | FULL | REGRESSION | NOT APPLICABLE | none | PRODUCT OWNER DECISION | Med |
| V1-FML-001 | MapMyDeed → Deed/croquis analysis tool | L3 | PARTIAL | PARTIAL | FULL | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Med |
| V1-FML-002 | MapMyDeed → **In-page PDF preview (iframe)** | L3 | FULL | MISSING | MISSING | NOT APPLICABLE | none | RESTORE | Low |
| V1-FML-003 | MapMyDeed → **Multi-parcel table splitting** | L3 | FULL | MISSING | MISSING | NOT APPLICABLE | none | RESTORE | High |
| V1-FML-004 | MapMyDeed → **Raw source text column per point** | L3 | FULL | PARTIAL | REGRESSION | NOT APPLICABLE | none | RESTORE | Med |
| V1-FML-005 | MapMyDeed → **Arabic point-label rows (`نقطة N: x y`)** | L3 | FULL | FULL | REGRESSION | NOT APPLICABLE | none | FIX REGRESSION | High |
| V1-FML-006 | MapMyDeed → **All-patterns accumulation with de-dup** | L3 | FULL | FULL | REGRESSION | NOT APPLICABLE | none | FIX REGRESSION | High |
| V1-FML-007 | MapMyDeed → Balady / Saudi labelled coordinate formats | L3 | FULL | MISSING | UNKNOWN | NOT APPLICABLE | none | RESTORE | Med |
| V1-FML-008 | MapMyDeed → Header-less 3-column UTM rows | L3 | FULL | FULL | REGRESSION | NOT APPLICABLE | none | RESTORE | Med |
| V1-FML-009 | MapMyDeed → Northing/Easting order auto-classification | L3 | PARTIAL | NOT APPLICABLE | BETTER THAN OLD | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-FML-010 | MapMyDeed → UTM zone detection clamped 35–40, defaults 37 | L3 | PARTIAL | PARTIAL | BETTER THAN OLD | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-FML-011 | MapMyDeed → Hemisphere guessed from `northing < 1e6` (defect) | L1 | BROKEN | NOT APPLICABLE | BETTER THAN OLD | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-FML-012 | MapMyDeed → **Silent 20-point-per-table cap** | L1 | BROKEN | NOT APPLICABLE | BETTER THAN OLD | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Med |
| V1-FML-013 | MapMyDeed → Deed field extraction (12 fields) | L3 | FULL | PARTIAL | BETTER THAN OLD | NOT APPLICABLE | none | MERGE INTO NEW SYSTEM | Med |
| V1-FML-014 | OCR → Tesseract `ara+eng` with tuned PSM/params | L3 | FULL | FULL | FULL | NOT APPLICABLE | none | KEEP + IMPROVE | Med |
| V1-FML-015 | OCR → Arabic letter normalisation + blind digit repair | UNKNOWN | L3 | FULL | FULL | PARTIAL | none | none | Phase 2 |
| V1-FML-016 | OCR → **Image deskew before OCR** | L3 | FULL | MISSING | MISSING | NOT APPLICABLE | none | RESTORE | High |
| V1-FML-017 | OCR → **Adaptive thresholding (default) + Otsu** | L3 | FULL | MISSING | PARTIAL | NOT APPLICABLE | none | RESTORE | Med |
| V1-FML-018 | OCR → **Min-resolution upscale before OCR** | L3 | FULL | MISSING | MISSING | NOT APPLICABLE | none | RESTORE | Med |
| V1-FML-019 | OCR → 3×3 median denoise + contrast stretch | L3 | FULL | MISSING | FULL | NOT APPLICABLE | none | KEEP | Low |
| V1-FML-020 | PDF → Native PDF text extraction (all pages) | L3 | FULL | PARTIAL | FULL | NOT APPLICABLE | none | KEEP | Low |
| V1-FML-021 | PDF → Scanned-PDF OCR fallback (first 3 pages) | L3 | PARTIAL | PARTIAL | BETTER THAN OLD | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Med |
| V1-FML-022 | ONNX → Diagram/element analysis model | L1 | UNKNOWN | NOT APPLICABLE | MISSING | NOT APPLICABLE | none | PRODUCT OWNER DECISION | Med |
| V1-FML-023 | ONNX → Model asset not present in the tree | L0 | UNKNOWN | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | none | OLD SOURCE REQUIRED | Med |
| V1-FML-024 | Map → Leaflet OSM polygon map | L3 | FULL | PARTIAL | FULL | NOT APPLICABLE | none | KEEP | Low |
| V1-FML-025 | Export → UTM clipboard export with header row | L3 | PARTIAL | MISSING | BETTER THAN OLD | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-FML-026 | Share → Google Maps + WhatsApp + Messenger share | L3 | FULL | MISSING | BETTER THAN OLD | NOT APPLICABLE | none | KEEP + IMPROVE | Low |
| V1-FML-027 | Confidence → Document-level confidence from text length | L1 | PARTIAL | NOT APPLICABLE | BETTER THAN OLD | NOT APPLICABLE | none | SUPERSEDED WITH FULL PARITY | Low |
| V1-FML-028 | Persistence → No save / no share link / no file export | L0 | MISSING | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | none | NEW IMPROVEMENT | High |
| V1-FML-029 | Authz → Deed tool requires login in V1 | L3 | FULL | NOT APPLICABLE | REGRESSION | NOT APPLICABLE | none | PRODUCT OWNER DECISION | Med |
| V1-FML-030 | Progress → Stage-labelled progress callback | L3 | PARTIAL | FULL | FULL | NOT APPLICABLE | none | FIX REGRESSION | Med |
