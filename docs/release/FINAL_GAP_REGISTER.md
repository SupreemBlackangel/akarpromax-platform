# Final Gap Register

## Closed

### P1-01 — AMRS organization write schema absent

- Status: CLOSED
- Root cause:
  - `lib/db/schema.ts` declared all 7 AMRS tables.
  - `drizzle-pg/0003_legal_cerise.sql` contained the AMRS DDL but was never applied to the live PostgreSQL database.
  - The live DB journal (`drizzle.__drizzle_migrations`) only recorded two entries, while the repo journal had four.
  - There was no real PG identity/AMRS schema initialization path in runtime or readiness.
- Fix:
  - Added `lib/db/pg-identity-schema.ts` as the real PG auth/AMRS schema bootstrap and probe path.
  - Added `scripts/apply-pg-identity-schema.ts` and `scripts/check-pg-identity-schema.ts`.
  - Wired readiness and AMRS entry routes to `ensurePgIdentitySchema()`.
  - Fixed organization create to persist owner membership with the real session `userId` and wrapped org+owner creation in one transaction.
- Live evidence:
  - `POST /api/amrs/organizations` -> `201`
  - `GET /api/amrs/organizations` -> `200`
  - `GET /api/amrs/organizations/[id]` -> `200`
  - `GET /api/amrs/organizations/[id]/members` -> owner membership present
  - `GET /api/health/ready` -> `identitySchema.ready: true`
- Regression evidence:
  - `tests/amrs/pg-identity-schema.test.ts`
  - `tests/amrs/amrs7-directory.test.ts`
  - `tests/amrs/amrs8-admin.test.ts`

### P1-02 — Services listings route pointed to removed canonical endpoint

- Status: CLOSED
- Root cause:
  - `app/api/services/listings/*` proxied to `/api/service-listings*`.
  - That canonical endpoint no longer existed.
- Fix:
  - Replaced the dead proxy with real handlers in:
    - `app/api/services/listings/route.ts`
    - `app/api/services/listings/[id]/route.ts`
  - Added missing listing lookup in `lib/services/core.ts`.
- Live evidence:
  - `GET /api/services/listings` -> `200`
  - `GET /api/services/listings/[id]` -> `200`
  - filtered browse -> `200`
  - invalid query -> `400`
  - pagination (`limit`/`offset`) -> `200`
- Regression evidence:
  - `tests/services-listings-route.test.ts`

### P1-03 — Services request offers compatibility route pointed to a missing endpoint

- Status: CLOSED
- Root cause:
  - `app/api/services/requests/[id]/offers` proxied to `/api/service-requests/[id]/offers`, which did not exist.
- Fix:
  - Replaced the proxy with a direct route handler backed by `@services/marketplace`.
- Live evidence:
  - `GET /api/services/requests/[id]/offers` -> `200`

### P1-04 — Services identity keyed by email could orphan data on email change

- Status: CLOSED
- Root cause:
  - Services persistence stores participant/ownership references as legacy email-keyed strings while Auth/AMRS use stable UUID user ids.
  - Confirming an email change originally updated `users.email` only, leaving services-owned rows stale.
- Fix:
  - Added `lib/services/identity.ts`.
  - `confirmEmailChangeOtp()` now rekeys services-owned user references from old email to new email before committing the auth email change, with compensation if the auth write fails.
- Live evidence:
  - email change request -> `200`
  - OTP confirmation -> `200`
  - old login -> `401`
  - new login -> `200`
  - live services rows rekeyed (provider profile and historical offer/revision references)
- Regression evidence:
  - `tests/services-api.test.mjs`

### P2-01 — Welcome email locale fell back to Arabic on verification

- Status: CLOSED
- Root cause:
  - post-verification welcome delivery used the route fallback locale instead of the stored user `preferredLanguage`
- Fix:
  - `activateAccount()` now resolves the delivery locale from the stored user record
- Live evidence:
  - English verification registration still sent an English verification email
  - English verification success now emits an English welcome subject on the console transport
- Regression evidence:
  - `tests/auth-phase4.test.mjs`

### P2-02 — Suspected Arabic mojibake in Services runtime payloads

- Status: CLOSED
- Root cause:
  - display artifact in the PowerShell terminal / local output path, not database or API corruption
- Evidence:
  - direct D1 SQLite inspection: exact Arabic strings stored correctly
  - live Node UTF-8 API client: exact Arabic strings returned correctly
  - raw HTTP response headers/body decode as JSON and contain Arabic text correctly when checked with a UTF-8-aware client

### P1-05 — AMRS admin endpoints were accessible to non-admin authenticated users

- Status: CLOSED
- Root cause:
  - `app/api/amrs/admin/*` only checked for authentication and not for actual AMRS/admin authorization.
- Fix:
  - Added `lib/amrs/access.ts`.
  - Locked `dashboard`, `verification`, and `retention` AMRS admin routes behind `canAccessAmrsAdmin()`.
- Live evidence:
  - provider-capability user -> `403` on `/api/amrs/admin/verification`
  - admin -> `200` on the same route

### P2-03 — Public `/news` route missing

- Status: CLOSED
- Root cause:
  - News engine routes existed, but no public page route consumed them.
- Fix:
  - Added `app/news/page.tsx`
  - Added `src/components/news/NewsPageClient.tsx`
- Live evidence:
  - `GET /news` -> `200`

### P2-04 — Public `/providers` route missing even though services hub linked to it

- Status: CLOSED
- Root cause:
  - Services hub linked to `/providers`, but no page route existed.
- Fix:
  - Added `app/providers/page.tsx`
- Live evidence:
  - `GET /providers` -> `200`

### P2-05 — Public organization directory / business-presence pages missing

- Status: CLOSED
- Root cause:
  - Public AMRS organization data existed, but there was no public organization directory or business-presence page.
- Fix:
  - Added `app/organizations/page.tsx`
  - Added `app/organizations/[id]/page.tsx`
  - Added `app/directory/page.tsx`
  - Tightened public org data so non-admin requests only see `active` organizations.
- Live evidence:
  - `GET /organizations` -> `200`
  - `GET /organizations/:id` -> `200`
  - `GET /directory` -> `200`

### P2-06 — Professional onboarding capability stalled at viewer role despite provider approval

- Status: CLOSED
- Root cause:
  - A normal verified user could create and submit a provider profile, but the live identity model did not grant provider-action permissions after approval unless the base auth role itself changed.
- Fix:
  - Added provider-capability permission augmentation in `lib/services/identity.ts`
  - Wired it into auth login/session resolution and dashboard role presentation
  - Kept the base auth role intact (`viewer`) while enabling provider actions through capability-derived permissions
- Live evidence:
  - verified normal user -> create profile -> add category -> submit -> admin approve -> gains provider action permissions -> creates real service offer

### P1-06 — Public organization endpoints exposed draft organizations and raw member rows

- Status: CLOSED
- Root cause:
  - Public org list/detail reads were not constrained to active-only visibility.
  - Public member reads exposed raw member rows instead of a safe public summary.
- Fix:
  - Public org listing now defaults to `active` only for non-admin callers.
  - Public org detail now hides non-active organizations from non-admin callers.
  - Public org member reads now return `memberCount` and an empty `members` array unless the caller is an AMRS admin.
- Live evidence:
  - active org public detail -> `200`
  - draft org public detail -> `404`
  - public member read -> `memberCount` only, no member rows leaked

### P1-07 — AMRS admin endpoints were writable/readable by authenticated non-admin users

- Status: CLOSED
- Root cause:
  - `app/api/amrs/admin/*` originally only enforced authentication.
- Fix:
  - Added `lib/amrs/access.ts` and AMRS admin permission gate.
  - Applied it to `dashboard`, `verification`, and `retention` AMRS admin routes.
- Live evidence:
  - provider-capability user -> `403` on `/api/amrs/admin/verification`
  - admin -> `200` on the same route

### P2-07 — Public professional and directory entry routes were missing

- Status: CLOSED
- Root cause:
  - `/providers`, `/organizations`, and `/directory` had no public route surfaces even though the platform already had underlying data and live links/flows that expected them.
- Fix:
  - Added `app/providers/page.tsx`
  - Added `app/organizations/page.tsx`
  - Added `app/organizations/[id]/page.tsx`
  - Added `app/directory/page.tsx`
- Live evidence:
  - `GET /providers` -> `200`
  - `GET /organizations` -> `200`
  - `GET /organizations/:id` -> `200`
  - `GET /directory` -> `200`

### P2-08 — AMRS admin reputation evaluation path used email where UUID persistence was required

- Status: CLOSED
- Root cause:
  - admin evaluation/moderation routes passed admin email strings into UUID-backed `admin_id` / `verified_by` fields.
- Fix:
  - routes now resolve the real session `userId` and persist UUIDs.
- Live evidence:
  - professional reputation evaluation -> `200`
  - organization reputation evaluation -> `200`
  - professional verification approve -> `200`
  - self-approval guard for admin-owned org verification -> `403 CANNOT_APPROVE_OWN`

## Advertising network delta (D1–D32)

### AD-01 — Live D1 schema drift: `ad_creatives.tablet_media_url` missing

- Status: CLOSED
- Root cause: `loadCreatives` (`lib/ads/engine.ts`) SELECTs `tablet_media_url`,
  but the live D1 `ad_creatives` table lacked the column, so any match crashed.
- Fix:
  - Added `tablet_media_url TEXT` to the `ad_creatives` CREATE TABLE in
    `lib/content-schema.ts`.
  - Exported `AD_CREATIVE_NEW_COLUMNS` from `lib/ad-schema.ts` (ALTER migration
    hook, applied via `ensureAdSchema`), mirrored in `lib/mysql-runtime.ts`.
  - Applied the ALTER directly to the live D1 file (verified column present).
- Regression evidence: `tests/ads-schema-contract.test.mjs` — DDL + migrations
  cover every `loadActiveAds` / `loadCreatives` / tracking SELECT column;
  `AD_CAMPAIGN_NEW_COLUMNS`, `AD_TRACKING_NEW_COLUMNS`, `AD_CREATIVE_NEW_COLUMNS`
  exported from `lib/ad-schema.ts`.

### AD-02 — Office placements reported zero eligible commercial inventory

- Status: CLOSED
- Root cause: `/api/admin/ads/stats` built every inventory context with
  `channel: "website"` hard-coded, so office placements were scored against
  website-eligible campaigns → `eligibleCommercial: 0`, misleading health.
- Fix: inventory context channel is derived from the placement's section
  (`section === "office" ? "office" : "website"`) in
  `app/api/admin/ads/stats/route.ts`.
- Live evidence: `office_dashboard_hero` now reports `PARTIALLY_FILLED`,
  `eligibleCommercial: 2`, `fallbackTurns: 1`.

### AD-03 — Office channel E2E over the central engine

- Status: CLOSED (verified live)
- Evidence:
  - `GET /api/office/v1/ads?placement=office_dashboard_hero&country=om&locale=ar&limit=3`
    (Bearer device token, scope `office.ads.read`) → office campaigns + house
    fallback; website campaigns excluded; tracking token carries
    `ch:"office"`, `ic:"commercial"`, `cr`.
  - `POST /api/office/v1/ads` (impression + click with token) →
    `{"recorded":true}`; D1 rows carry `channel:"office"`,
    `inventory_class:"commercial"`, `creative_id`, `session_id` = device id.
  - Reverse isolation: `POST /api/ads/match` `home_top` → website campaigns
    only; office campaigns excluded.
- Regression evidence: `tests/ads-engine.test.mjs` (12 cases) covers the D31
  engine contract (3-commercial threshold → house fill, round-robin creatives,
  channel isolation, house ≠ commercial totals).

### AD-04 — Advertising documentation (D32)

- Status: CLOSED
- Evidence: `docs/ads/*` (9 files) — `ADVERTISING_NETWORK_ARCHITECTURE.md`,
  `AD_PLACEMENT_REGISTRY.md`, `AD_TARGETING_CAPABILITIES.md`,
  `MULTI_CREATIVE_ROTATION.md`, `DYNAMIC_FALLBACK_INVENTORY.md`,
  `VALID_IMPRESSION_POLICY.md`, `WEBSITE_OFFICE_CHANNELS.md`, `AD_SAFE_ZONES.md`,
  `AD_ANALYTICS_MODEL.md`. Each grounded in verified code paths; unsupported
  behaviors (e.g. per-creative completion-reason derivation) are explicitly
  documented as unsupported.

### AD-05 ? Admin multi-creative authoring (D6/D7) verified live end-to-end

- Status: CLOSED (verified live)
- Gap: `/api/admin/ads` POST/PATCH were single-creative; there was no way to
  author the multiple creatives that the engine rotates per campaign.
- Fix: `lib/ads/admin.ts` now exports `MAX_COMMERCIAL_CREATIVES`/`MAX_HOUSE_CREATIVES`
  and `normaliseCreatives()` (dedupe by URL, drop media-less rows, cap 5/10);
  `app/api/admin/ads/route.ts` persists `ad_creatives` on POST (batch insert) and
  replaces them on PATCH (delete + insert), and the GET response attaches ordered
  `creatives` per campaign; the Admin wizard (`app/admin/ads/ads-admin-client.tsx`)
  gained a "وسائط إضافية (دوران)" step-2 editor with live cap handling and
  `serialisedToForm`/`toApiBody` mapping.
- Bug fixed en route: the POST bind array bound `channels` twice (77 values for
  76 placeholders, and PATCH bound 0 values for its new `channels = ?` set) ->
  every create returned 500 `Wrong number of parameter bindings`. Both arrays
  are now balanced (76/76 and 73/73).
- Evidence (live `vinext dev`, port 3010):
  - POST campaign with 4 `creatives` -> HTTP 201; GET returns the campaign with
    4 ordered creatives.
  - `/api/ads/match` (placement `side_right`, `om`, `ar`, desktop) serves the
    campaign with `creativeCount: 4`, position 1/4 at 0 impressions.
  - Two POSTs to `/api/ads/impression` advance the round-robin index ->
    position 3/4 on the next match (index = impressions % creatives.length).
  - PATCH with 2 replacement creatives -> HTTP 200; GET returns exactly 2.
  - Regression: `tests/ads-engine.test.mjs` + `tests/ads-schema-contract.test.mjs`
    (16/16) and full suite 896/896 PASS; `tsc --noEmit` EXIT=0.

### EMAIL-01 — Email transport was console-only: no real SMTP path, no provider check, no failure sanitization

- Status: CLOSED (code) / BLOCKED ONLY BY REAL PROVIDER CONFIGURATION (delivery)
- Gap:
  - `lib/email.ts` only shipped a console transport for live use; SMTP was not a
    first-class, testable path.
  - No way to verify provider configuration without sending an email.
  - SMTP failures could leak connection secrets into errors/logs.
  - `APP_URL` (localhost) could leak into verification/reset links instead of the
    public origin.
- Fix:
  - `SmtpEmailTransport` (nodemailer `^9.0.5`): `fromName`/`replyTo`, connection/
    greeting/socket timeouts, per-send transporter, `testConnection()` via SMTP
    `verify`.
  - `EmailDeliveryError` + `sanitizeSmtpError()` — stable `category`
    (`config|auth|refused|timeout|connection|protocol`), secrets scrubbed from
    message and stack.
  - `EMAIL_TRANSPORT` env selection (`console|smtp`, legacy auto-detect) with
    inline production validation (invalid value -> `RuntimeEnvError`);
    `MAIL_FROM_ADDRESS`/`MAIL_FROM_NAME`/`MAIL_REPLY_TO`.
  - `APP_PUBLIC_URL` takes precedence over `APP_URL` for every email link.
  - `scripts/email-provider-check.ts` (`npm run email:check`) — config-only
    provider check, no send, no secret output; reports `productionCapable`.
- Regression evidence:
  - `tests/email-transport.test.mjs` (16 tests): real SMTP round-trip against a
    protocol-accurate local sink (auth + From name + subject/HTML/text), auth
    failure -> `category=auth`, refused -> `refused`, silent -> `timeout` (no
    secrets anywhere), console never `productionCapable`, smtp+host+sender+
    public URL -> `productionCapable`, template plain-text fallback + RTL/LTR
    for ar/en/tr, `APP_PUBLIC_URL` precedence.
  - Full suite 912/912; `tsc --noEmit` EXIT=0.
  - Live `/api/health` + `npm run email:check`:
    `transport: console, configured: false, productionCapable: false`.

## Open

Structured open items for the release candidate. Severity: P0 = release
impossible / critical; P1 = staging blocker; P2 = important (launch-critical
subset); P3 = technical debt / enhancement. Items marked EXTERNAL require
Product Owner + infrastructure actions, not application code.

### EXT-01 — Real SMTP provider not configured (EMAIL READY = NO)

- ID / severity: `EXT-01` / **P0 (external)**
- Description: `EMAIL_TRANSPORT` is `console`, `productionCapable=false`;
  `/api/health/ready` stays 503 in production until the SMTP transport is fully
  configured.
- Reason open: requires PO + infra to select a provider and supply
  `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` + `MAIL_FROM_ADDRESS`
  (+ `MAIL_FROM_NAME`/`MAIL_REPLY_TO`), confirm `APP_PUBLIC_URL`, then
  re-run `npm run email:check` and the email suite.
- Release impact: blocks real inbox delivery certification and UAT email
  journeys. Does not block the source freeze or staging deployment.
- Owner / action: PO + infra — configure provider, then certify a real
  inbox-delivery journey.

### EXT-02 — SPF / DKIM / DMARC not configured on the sending domain

- ID / severity: `EXT-02` / **P0 (external)**
- Description: no DNS authentication records for the sending domain; inbox
  deliverability is unverified. See `docs/release/EMAIL_DNS_READINESS.md`.
- Reason open: requires PO approval and DNS changes on the domain.
- Release impact: without it, transactional mail may land in spam or be
  rejected; `EMAIL READY` must remain NO.
- Owner / action: PO + DNS — publish SPF/DKIM/DMARC and verify with
  `nslookup`/raw headers.

### EXT-03 — Staging hosting not provisioned

- ID / severity: `EXT-03` / **P1 (external)**
- Description: Cloudflare Workers + branded staging subdomain + TLS + secrets +
  isolated Neon DB + R2 `SPONSOR_ASSETS` bucket are not provisioned. Ranked
  deployment options in `docs/release/STAGING_DEPLOYMENT_RUNBOOK.md`.
- Reason open: provisioning requires PO + infra (no provisioning performed in
  the infrastructure-preparation task by design).
- Release impact: actual staging deployment cannot begin until provisioned.
- Owner / action: PO + infra — provision per runbook, set the STAGING/PRODUCTION
  minimum env set (`.env.example`), override `AD_TRACKING_SECRET`.

### EXT-04 — Actual staging deployment + smoke + UAT not performed

- ID / severity: `EXT-04` / **P2 (external)**
- Description: no real staging runtime exists yet; `READY FOR STAGING USE / UAT`
  is granted only AFTER deployment + smoke + UAT execution
  (`docs/release/STAGING_UAT_PLAN.md`).
- Reason open: dependent on EXT-03.
- Release impact: final application certification stays NO.
- Owner / action: PO — schedule deployment + smoke + UAT once EXT-03 is done.

### SEO-01 — No robots.txt / sitemap.xml / noindex on private areas

- ID / severity: `SEO-01` / **P2 (code, production-targeted)**
- Description: no `robots.txt` or `sitemap.xml`; admin/account/workspace areas
  are not explicitly `noindex`ed; canonical link tags are not emitted (only
  environment-aware `metadataBase`).
- Reason open: staging noindex is an infrastructure (deployment) concern; the
  SEO artifact set is a production go-live requirement, not a staging blocker.
- Release impact: crawler guidance and canonical dedup only; private content is
  behind auth. No functional impact on staging.
- Owner / action: tech lead — add robots/sitemap + `noindex` for private areas
  before production go-live.

### AUTHZ-01 — Apply route gate vs RBAC docs wording

- ID / severity: `AUTHZ-01` / **P3 (documentation)**
- Description: `SERVICE_PROVIDERS_APPLY` is documented as required for provider
  application, but the apply route now enforces authentication + ownership of
  the target profile only (gate removed). Profile creation is self-serve and
  owner-bound; no authorization regression exists.
- Reason open: the removal is deliberate (the gate was redundant and would break
  the self-serve flow); docs were not updated.
- Release impact: none functionally; doc/code wording mismatch.
- Owner / action: tech lead — update `docs/services/SERVICES_RBAC_POLICY.md` and
  `docs/services/PROVIDER_VERIFICATION_POLICY.md`.

### EMAIL-02 — SMTP runtime path not yet exercised under `vinext start` in staging

- ID / severity: `EMAIL-02` / **P3 (external/verification)**
- Description: real SMTP delivery under the Workers production runtime has not
  been exercised end-to-end (PG auth loading is limited under `vinext start`;
  see AGENTS.md).
- Reason open: no real provider (EXT-01) and no staging runtime (EXT-03).
- Release impact: UAT email journeys must be verified after deployment.
- Owner / action: PO + infra — run the email journey checklist post-deployment.
