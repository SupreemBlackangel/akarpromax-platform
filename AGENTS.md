# OAuth social login + advertising banners (DONE)

# Phase 1C — AkarProMax Office release unblock (DONE 2026-08-18)

Canonical desktop root: `F:\akarpromax-office\AkarApp_Next`. Canonical WPF
project: `AkarApp\AkarApp.csproj` (net8.0-windows, WPF, `OutputPath=..\`, no
.sln). .NET SDK 8.0.424; repo-level `NuGet.Config` (`<clear/>` + nuget.org)
required (machine has stale DevExpress source). GResourceBuilder pre-build
regenerates `AkarApp.g.resources` from `decompiled/*.baml` (self-locating
Program.cs). NOTE: the "mojibake Arabic" finding in earlier notes is FALSE —
all C#/frontend sources are clean UTF-8; PS 5.1 console renders them garbled.

**WebUI canonicalized (was D:\new program\akarpromax-web\akar-frontend-src, NOT
a git repo):**
- Canonical source now lives INSIDE the desktop repo: `F:\akarpromax-office\AkarApp_Next\AkarWebUI` (Vite 5.4.21, `base:"./"`, `mock-data.ts` required by vite.config top-level import; mock creds `admin123`/`Akar_ProMax_2026_Secure_Key` exist ONLY in vite.config.ts dev mock server — never bundled; verified absent in dist).
- Parity audit (shipped 6/18 webui vs fresh build): SUFFICIENT. `/request-property` merged into `/properties?action=request`; fresh adds arch-ai/canvas/onboarding/questionnaire/settings + `/api/upload/ads`; bridge tokens identical 33/33; real bridge surface = `BridgeHostObject.GetAllData()` (ComVisible).
- `AkarWebUI\.version.json` (webui_version 1.0.0) → plugin emits `compatibility-manifest.json` into dist with build_date. FIXED the plugin's path bug (was resolving `.version.json` in the PARENT dir: `import.meta.dirname` + `".."`).
- Runtime `F:\akarpromax-office\AkarApp_Next\webui\` = synced canonical dist (173 files, /MIR). Drifted 6/18 webui replaced.

**MSBuild publish integration (AkarApp.csproj):** Release-only targets —
`BuildCanonicalWebUi` (BeforeTargets=Publish: `npm ci` if node_modules missing
+ `npm run build` with `NODE_OPTIONS=--max-old-space-size=4096`) and
`CopyCanonicalWebUi` (AfterTargets=Publish: RemoveDir + Copy `AkarWebUI\dist\**`
→ `$(PublishDir)\webui\`). `dotnet publish -c Release -r win-x64 -o X` now
yields a complete deployable (exe + webui + compatibility-manifest.json).

**Default credentials removed (E):**
- `DatabaseSeeder.cs`: `SeedUsers` deleted (manager123/accountant123 gone),
  Sha256 helper removed, credentials MessageBox replaced with demo-data summary
  only. Demo business data kept (Clients/Properties/Units/Contracts/Checks/Maintenance).
- `LoginViewModel.EnsureDefaultAdminExists()`: creates ONLY the initial `admin`
  with a `RandomNumberGenerator`-generated 24-char temp password via
  PasswordHasher (PBKDF2, never Sha256), shown ONCE in a MessageBox, never
  recreated (gate = `!Users.Any()`).
- Fresh-install verification: Users=0; Clients=3, Branches=1, Properties=2,
  Units=7, Contracts=3, PostDatedChecks=5, MaintenanceTickets=3. Second launch
  stable (no reseed, no integrity block). Publish tree scans CLEAN of
  admin123/manager123/accountant123/Akar_ProMax_2026_Secure_Key.

**Seeder fresh-install bug (FOUND + FIXED in 1C):** current EF model generates
NOT NULL columns WITHOUT defaults (e.g. `Branches.CreatedAt`, `Clients.AgentSharePercentage`,
`Properties.RoomsCount`/facade flags/installment fields, `Units.Length/Width`,
`Contracts.TotalAmount`/`LedgerProcessed`/`SeasonDays`/etc., `MaintenanceTickets.IssueTitle`
+ `DeductFromOwnerLedger`), so every seeder INSERT failed silently (MessageBox
still claimed success) → fresh installs got an EMPTY database. Seeder inserts
now supply all required columns. `Contracts` has NO `CreatedAt` column (removed).

**Deployment caveats (documented):**
- `AppIntegrityService` binds a user-level `%LOCALAPPDATA%\AkarApp\Security\integrity.manifest`
  to the FIRST install's file hashes → replacing the exe/webui on an existing
  install triggers "حماية البرنامج" and shutdown until the manifest is deleted
  once (or `Settings.EnableIntegrityChecks=0`). Any upgrade path must reset it.
- First-run still requires HWID activation key (ActivationView) — login/admin
  creation not reachable in smoke without it; verified everything pre-login.
- `webui` loads via akarapp.local virtual host (`AkarV2PortalWindow.cs:79`),
  relative `./` asset paths confirmed in dist.
- Dotnet build needs `$env:PATH += ";C:\Program Files\dotnet"` per shell.
  npm ci/build needs ≥5GB free RAM (close Chrome) + NODE_OPTIONS=4096.

**OAuth (applied to Neon):**
- `drizzle-pg/0015_add_user_oauth_accounts.sql` — new `user_oauth_accounts` table
  (id, user_id FK→users cascade, provider, provider_user_id, email, name,
  avatar_url, access_token, refresh_token, token_expires_at, created_at,
  updated_at + composite index on provider+provider_user_id). Applied via
  `scripts/apply-oauth-schema.ts`.
- `lib/db/schema.ts` — Drizzle schema for `userOauthAccounts`.
- `lib/auth/oauth.ts` — OAuth library: Google + Facebook token exchange, user
  info fetch, account linking/creation (`findOrCreateOAuthUser`). Flow:
  1) existing provider link → return user; 2) existing email match → link;
  3) create new user + link. Auto-verifies email on link.
- `app/api/auth/google/route.ts` — redirects to Google OAuth consent screen.
- `app/api/auth/google/callback/route.ts` — exchanges code, fetches user info,
  creates session cookie, redirects to `/`.
- `app/api/auth/facebook/route.ts` — redirects to Facebook OAuth dialog.
- `app/api/auth/facebook/callback/route.ts` — same flow as Google.
- `app/auth/callback/page.tsx` — client-side spinner that redirects to `/`.
- `app/login/page.tsx` — social login buttons (Google + Facebook) with divider.
- `app/register/page.tsx` — social login buttons (Google + Facebook) with divider.
- `.env.example` — `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
  `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` placeholders.

**Advertising banners (applied to Neon):**
- `scripts/seed-ads-heroes.ts` — 16 house campaigns + 16 creatives seeded:
  4 hero banners (1200×400) for home/services/properties/tools,
  6 side-rail banners (180×225), 6 bottom banners (600×200).
  SVG data URIs with Arabic text, brand gradients (#08265b→#1672e8).
  All target canonical placement keys (HERO/LEFT_01/LEFT_02/RIGHT_01/RIGHT_02/
  BOTTOM_01/BOTTOM_02/BOTTOM_03) with section-scoped matching.
- `public/images/ads/` — 8 standalone SVG files for reference/preview.
- Verified: `/api/ads/match` returns hero-services-001 for services,
  hero-home-001 for home, side/bottom variants per section.

# Limited Auction hardening — 72h from activation + admin grant table (DONE)

**Backend (applied to Neon):**
- `drizzle-pg/0014_limited_auction_organizers.sql` — new `limited_auction_organizers` table
  (org_id, user_id, granted_by, reason, revoked_at, revoked_by, revoke_reason + unique
  org+user index + active grant index). Applied via
  `scripts/apply-limited-auction-schema.ts` (`node --env-file=.env --import tsx`).
- `lib/db/schemas/limited-auction-schema.ts` — Drizzle schema for the new table.
- `lib/auctions/policy.ts` — `getClosedAuctionOrganizer` now requires an active grant
  row (revoked_at IS NULL) in addition to existing org verification + membership.
  `AUCTION_TERMS_VERSION` bumped to `2026-08-f2`. Seller terms now include pledge to
  sell at highest price.
- `app/api/auctions/route.ts` (POST) — fixed auctions: `endDate` is always
  `now + 72h`, ignores client endDate; `maxDays` reduced from 30 to 3 for fixed.
- `app/api/auctions/[id]/terms/route.ts` (POST activation) — on seller acceptance,
  fixed auctions recompute `auctionStartDate = activationNow` and
  `auctionEndDate = activationNow + 72h` (countdown starts at activation, not creation).
- Auction terms f2 seeded: seller terms with pledge clause ("يلتزم البائع بأمانة ببيع
  العقار لأعلى مزايد بالسعر الفائز") and bidder terms. f1 deactivated.
  `scripts/seed-auction-terms-f2.ts`.

**Admin UI (new):**
- `app/api/admin/auction-organizers/route.ts` — GET (list grants with org+user
  join) / POST (grant/revoke with reason). super_admin only.
- `app/admin/auction-organizers/page.tsx` + `auction-organizers-client.tsx` —
  admin page with grant table, grant form (org search + userId + reason), revoke
  confirmation. Permission: SETTINGS_MANAGE in `admin-sidebar.tsx` nav.
- `app/admin/admin-sidebar.tsx` — new nav item "منظمات المزادات" under
  "الخدمات والمنظمات" group.

**Dashboard UI redesign (AkarProMax identity):**
All 4 dashboard pages rebuilt with gradient header (`#08265b→#1672e8`), rounded
cards, stat badges, empty states:
- `app/dashboard/properties/new/page.tsx` — full wizard UI: gradient header,
  sticky interactive stepper, 5-step wizard view (only the active section is
  shown), prev/next navigation bar, progress bar, per-step tips sidebar, and
  validation-error navigation to the offending step. Wraps
  `PropertyFormWithOffers` with `data-step` attributes and plain `<style>`
  visibility rules.
- `app/dashboard/properties/page.tsx` — gradient header + luxury card grid + empty
  state with CTA.
- `app/dashboard/auctions/new/page.tsx` — gradient header + type selector (fixed/open
  radio cards) + 72h lock notice for fixed + organizer grant check + disabled
  endDate for fixed.
- `app/dashboard/auctions/page.tsx` — gradient header + 3 stat cards (total/active/pending)
  + badge-based list with type icons + empty state CTA.

**Services page featured auctions:**
- `app/services/page.tsx` — new section "مزادات عقارية" (fetched from
  `/api/auctions?status=active&limit=3`) rendered after "how it works" section,
  showing 3 cards linking to `/auctions/:id` with type icon + current price.

All pages verified compiling on `vinext dev --port 3010`. Key API responses
tested: `/api/auctions?limit=1` → 200 (0 rows); `/api/auctions?status=active`
→ 200 (0 rows); all dashboard pages return HTML 200.

# Approved public design propagated to all 10 public pages (DONE)

Every top-level public page now renders through `PublicPageShell` with a
`mode:"standard"` ad layout (3-column `[180px | 1fr | 180px]` on xl). Migrated
the last three legacy pages (`app/advertise`, `app/about`, `app/contact` — they
were raw `min-h-screen bg-gray-50` divs with no shell) to
`useServicesPage()` + `PublicPageShell` + `pageHeader` + the matching family
(`advertise`/`about`/`contact`) + `AccountDialog`. The other seven
(services/providers/offices/companies/tools/community/knowledge) already had
the shell with the correct families. All 10 now share the same header, footer,
sidebar, news ticker, hero/side/bottom ad slots, and design tokens.

Headless check (`C:\Users\zak\AppData\Local\Temp\opencode\verify-public.mjs` +
`scrollcheck.mjs`): all 10 pages at 1366x768 + 430x932 have
`public-page-shell`, matching `data-standard-public-ad-layout` family, hero
slot, 4 side-rail slots, bottom_01/02/03 after scroll, desktop sidebar
(mobile hides it → drawer), real Arabic titles, 0 broken images, 0 console
errors, 0 4xx/5xx. Reports: `.visual-checkpoint/public-pages-report.json`,
`public-scroll-check.json`. NOTE: `next build` OOM-crashes when free RAM drops
below ~2GB (12GB machine); close other apps before rebuilding.

# Property cards now link to detail (FIXED) + visual checkpoint

`LuxuryPropertyCard` (`src/components/ui/LuxuryPropertyCard.tsx`) had NO
navigation — the root was a plain `div` with a decorative `عرض التفاصيل`
button, so featured cards on the home page, `/dashboard/properties`, and
`/properties/search` were unclickable. Now the card root IS a
`Link href={/properties/${property.id}}` with an optional `className` prop;
the "عرض التفاصيل" element is a `<span>` (no nested button-in-anchor). In
`app/properties/page.tsx` the old outer `<Link>` wrappers were removed and the
featured cards pass `className="md:col-span-2"` (verified: computed
`grid-column: span 2`, card spans the full content column of the 3-column
`standard-public-ad-grid` layout `[180px | 1fr | 180px]`).

Headless verify harness: `C:\Users\zak\AppData\Local\Temp\opencode\verify.mjs`
(drives the CDP tab `http://127.0.0.1:9222` against `next start --port 3011`,
waiting for async data before measuring). Current pass at 1366x768 + 430x932:
home shows REAL Arabic featured titles (no `عقار للبيع` placeholders), all 11
offer-type chips from `/api/offer-types` (بيع/إيجار/تقبيل/فروغ/استثمار/تنازل/
حق انتفاع/إيجار منتهي بالتملك/مقايضة/شراكة/بيع حصة — NOTE seeds use فروغ and
بيع حصة, not فراغ/بيع أسهم), 3 card links on home, hero ad removed on
`/properties` (`heroAd:false`), side rails + bottom_01/02/03 slots present, 0
broken images, 0 console errors, 0 4xx/5xx. `report.txt` under
`.visual-checkpoint/` records the older pre-fix state (hero ad + 138 network
errors). Screenshots in `.visual-checkpoint/*.png`. Note: `vinext start` here
is actually `next start --port 3011` (production build, `next build` required
after component changes).

# Geo + Currency (Phase 7) — PG tables, applied to Neon

`lib/db/schemas/geo-schema.ts` (countries, governorates, cities, districts,
streets — uuid pk, name_ar/name_en/name_tr, is_active, display_order) and
`lib/db/schemas/currency-schema.ts` (currencies, text pk = code) are PG tables
queried via `getDb()`. DDL lives in `drizzle-pg/0009_add_geo_currency.sql`
(applied to Neon via `scripts/apply-geo-currency-schema.ts`, run like
`node --env-file=.env --import tsx scripts/apply-geo-currency-schema.ts`).
Seed data: `scripts/seed-currency-data.ts` (12 currencies, SAR default) and
`scripts/seed-geo-data.ts` (Saudi Arabia hierarchy). Both use `getDb()` so
they must run with the env file: `node --env-file=.env --import tsx scripts/seed-*.ts`
(plain `npx tsx` fails silently against localhost because `DATABASE_URL` is not
loaded). API: `app/api/geo/route.ts` (`?type=countries|governorates|cities|districts|streets&parentId=`),
`app/api/currencies/route.ts` (+ `?code=`), `app/api/currencies/convert/route.ts`
(POST — **public FX execution DISABLED**: returns a structured `501
CURRENCY_CONVERSION_DISABLED` with `conversionSupported: false`, performs no
conversion, reads no exchange rate and opens no DB connection; the canonical
pricing path does not use FX — see
`docs/refactor/L1A_OWNER_DEFERRED_INVENTORY.md`). Note `app/api/geo/extract/route.ts` is the
Nominatim geocoder and coexists with `app/api/geo/route.ts`.

# Properties API 500 (FIXED) — Drizzle `properties` tables created in Neon

`/api/properties` returned 500 (`relation "properties" does not exist`) because
the Drizzle schema (`lib/db/schemas/properties-schema.ts`) targets PG tables
(`properties`, `property_media`, `property_favorites`, `saved_searches`,
`property_requests`, `property_request_offers`, `property_inquiries`,
`property_views`) that were never created in Neon.

**Do NOT "fix" by renaming `property_listings`** — `property_listings` is the
D1/content-runtime table with a different column layout (`country_code`,
`city_id`, `listing_type`, ...) consumed by `lib/integration/sync.ts`,
`lib/integration/radar.ts`, `lib/command-center/service.ts`,
`lib/properties-format.ts`. Renaming breaks those. Both tables coexist.

The fix was applied directly to Neon (drizzle-kit migrate does not track this
DB, only 2 migrations recorded): `drizzle-pg/0007_add_properties_tables.sql`
(37 statements, generated from the schema with `drizzle-kit generate` against
`lib/db/schemas/properties-schema.ts`). On a fresh DB, apply it the same way
(split on `--> statement-breakpoint`, run each via the postgres client). Now
`GET /api/properties` returns 200 (`{success:true,data:[],pagination:{...}}`).

# Vinext on Windows — static assets 404 (PATCHED)

The app needs `vinext@1.0.0-beta.5` (locally installed, `--no-save`; NOT in
package.json, so a fresh `npm install` drops it — re-run
`npm i vinext@1.0.0-beta.5 --no-save`). Earlier versions (e.g. 0.0.50) break
`vinext dev` with `Cannot find module 'vinext/server/app-rsc-handler'` because
that subpath is only exported from 1.0.0-beta.x. The import comes from the
`virtual:vinext-rsc-entry` module inside the vinext vite plugin.

`vinext` has a Windows bug: `walkFilesWithStats` in
`node_modules/vinext/dist/server/static-file-cache.js` builds cache keys with
`path.relative()` which yields backslashes (`assets\index-abc.js`), so
`/assets/*` requests (forward slashes) always miss the cache → **404 for all
CSS/JS** under `vinext start` (root-level files like `/favicon.svg` still work).

Fix applied to `node_modules/vinext/dist/server/static-file-cache.js` line 244:

```js
relativePath: path.relative(base, batch[j]).split(path.sep).join("/"),
```

**IMPORTANT**: This patch lives in `node_modules` and is lost on `npm install`.
If assets start 404ing again after reinstalling, re-apply this one-line fix.

## Content runtime DB — deterministic `DB_PROVIDER` selection (Phase 5)
The content backend (sponsors, ads, news, services, i18n, integration tables) is
picked **explicitly** via `DB_PROVIDER` in `lib/config/runtime-env.ts`, then
`lib/runtime-db.ts` dispatches `getRuntimeDb()`:

- `postgres` → `lib/pg-runtime.ts` (`PgRuntimeDb`, a `D1Database` adapter over
  the `postgres` package: per-statement client, `ssl: "require"`,
  `prepare: false`, plus `translateSql` for backticks / `INSERT OR IGNORE` /
  `DATETIME` / `datetime('now')` and `$N` placeholder expansion). **Production
  requires `DB_PROVIDER=postgres`** and nothing else is accepted.
- `mysql` → `lib/mysql-runtime.ts` (legacy/compat shim, opt-in under
  `vinext start`).
- `d1` → D1 binding `env.DB` via `cloudflare:workers`; **fails fast with
  `SchemaModeError` when the binding is absent** — there is NO silent fallback.
- Dev/test default to `d1` when unset; explicit `postgres`/`mysql` are allowed.

`ALLOW_MYSQL_FALLBACK` is gone. Shared schema+seeds live in
`lib/content-schema.ts` (`ensureContentSchema`), consumed by both the D1 and PG
adapters. E2E `DB_PROVIDER=postgres` under `vinext dev --port 3010`: `GET
/api/news` and `GET /api/services/categories?country=om` return seeded Neon rows
(200). Note `sponsors`/`ads` tables have no seeder, so those list routes return
empty arrays (expected).

## Dev-mode limitation
`vinext dev` breaks on MySQL/drizzle queries with
`EvalError: Code generation from strings disallowed for this context`.
Use `vinext start` (production build) for MySQL-backed E2E testing.

## D1-backed routes only work under `vinext dev`
`cloudflare:workers` / `env.DB` (used by `lib/runtime-db.ts` for the D1 content
tables: sponsors, ads, news, ...) is shimmed only by `@cloudflare/vite-plugin`
in the Vite dev server. Under `vinext start` the import fails with
`ERR_UNSUPPORTED_ESM_URL_SCHEME` — with `DB_PROVIDER=d1` (dev default) that now
surfaces as `SchemaModeError` rather than an empty-result fallback. For PG or
MySQL content under `vinext start`, set `DB_PROVIDER` explicitly.

E2E-test content routes (news/sponsors/ads CRUD, seeded rows) on `vinext dev`
(e.g. `npx vinext dev --port 3010`); keep MySQL auth flows on `vinext start`.
The dev-server D1 state persists in the local Miniflare storage dir.

## Production session-cookie limitation
Under `vinext start`, `cookies()` from `next/headers` does not read the incoming
`Cookie` header, so `GET /api/auth/me` always returns `authenticated: false`
over HTTP. The account wizard works around this by building the viewer from
local state; session persistence across a full page reload is still blocked.

## Auth chain (PG `lib/db`) — fixed for `vinext dev`
Login/register/me now return `name`, `role` (mapped via `lib/auth/identity-map.ts`
`mapSessionRole`) and `permissions` (from the frontend `ROLE_CATALOG`), and the
cookie session is the **only** identity source for `/api/user-context` and every
`getSponsorIdentity()`/`requireSessionUser()` gate. ChatGPT header identity,
`localStorage` bearer tokens, and the `admin@localhost.*` fallback are removed
(`app/chatgpt-auth.ts` deleted). `lib/auth/session.ts::readSessionCookieValue` reads the raw
`Cookie` header via `headers()` first, then `cookies()` — so it also works under
`vinext start` *if* PG itself loads there (it does not, see below).

**PG under dev — per-request connections required.** postgres-js's module-level
pool cannot be reused across requests inside vinext dev's Workers runtime
(throws `Cannot perform I/O on behalf of a different request` intermittently,
and Drizzle's prepared-statement cache makes it worse). `lib/db/index.ts` now
exports `getDb()` → `{ db, end }` (fresh postgres client per call, `prepare: false`),
and ALL auth routes/helpers (`login`, `register`, `me`, `lib/auth/session.ts`,
`lib/sponsor-auth.ts`) open/close one client per request.
**When adding PG queries in dev, use `getDb()` + `finally { end() }`, never the
singleton `db` export.**

## PG cannot load under `vinext start` (confirmed root cause)
The production bundle is Workers-targeted, so postgres-js's socket module is
inlined as `import("cloudflare:sockets")` (see `dist/server/index.js`). Node
cannot load `cloudflare:` → `ERR_UNSUPPORTED_ESM_URL_SCHEME` on every PG query
under `vinext start` (login → 500). Externalizing `cloudflare:sockets` in the
build does NOT help (Node still can't load the scheme); a fix needs either a
Node-targeted build for start, or MySQL-backed auth under start (MySQL `users`
table exists in `lib/db/mysql/schema`). As of now: **auth E2E runs on
`vinext dev` only; `vinext start` stays MySQL-backed.**

## runtime-db schema mode (FIXED)
`lib/runtime-db.ts` now selects the schema mode deterministically via
`DB_PROVIDER` (`decideSchemaMode(provider, d1Available)`), and there is **no
silent fallback** — a `d1` request without the binding throws `SchemaModeError`.
The old D1→MySQL fallback (`ALLOW_MYSQL_FALLBACK`) is removed. Shared schema and
seeds live in `lib/content-schema.ts` (`ensureContentSchema`) and run through
the active adapter's `translateSql` (PG: `lib/pg-runtime.ts`; MySQL:
`lib/mysql-runtime.ts`). `CREATE INDEX` statements use `IF NOT EXISTS`, and the
duplicate-error regexes match `/duplicate (key|index|column)|already exists/i`
(MySQL `duplicate` wording and PG `already exists` alike).

## MYSQL_URL must be separate from DATABASE_URL (FIXED)
`DATABASE_URL` points at Postgres/Neon, but `lib/mysql-runtime.ts`,
`lib/mysql-db.ts` and `drizzle.mysql.config.ts` used to read it as the MySQL
connection string. Under `vinext start` with `DB_PROVIDER=mysql` the D1 binding
is absent, so data routes used MySQL → mysql2 tried to parse the `postgresql://`
URL (ETIMEDOUT, plus `Ignoring invalid configuration option ... sslmode/
channel_binding` warnings) → 500s on news/sponsors/ads/admin.
Now all three files use `MYSQL_URL` (falls back to
`mysql://root:root@localhost:3306/akarpromax`), declared in `.env`/`.env.example`.
**Verified under `vinext start` (port 3011, `DB_PROVIDER=mysql`):**
`GET /api/news` → 200 with the MySQL rows (4 for the guest scope);
`GET /api/sponsors` → 200. Login still 500s there because PG cannot load
(`cloudflare:`), so keep auth E2E on `dev`.

## Ads network — one central engine, two channels (DONE)
Website + AkarProMax Office share one serving engine (`lib/ads/engine.ts`
`matchAds` → `scoreAd` → `selectCreative`, house fill via
`selectHouseCandidates`) over the content runtime DB (`getRuntimeDb()`).
- Campaigns carry `channels` JSON (`website` default / `office`); `isChannelMatch`
  isolates the two surfaces (verified live both ways). Office placements live in
  the `office` section of `AD_PLACEMENTS` (`src/constants/advertising.ts`);
  `app/api/office/v1/ads` (Bearer device token, scope `office.ads.read`) serves
  via the central engine and records into central `ad_impressions`/`ad_clicks`.
- **D1 schema contract**: `ad_creatives` must include `tablet_media_url`
  (in `content-schema.ts` CREATE TABLE **and** `AD_CREATIVE_NEW_COLUMNS` ALTER in
  `lib/ad-schema.ts`), because `loadCreatives` SELECTs it. `ad_impressions`/
  `ad_clicks` carry `creative_id`, `channel`, `inventory_class` (DDL +
  `AD_TRACKING_NEW_COLUMNS`). Regression-guarded by `tests/ads-schema-contract.test.mjs`.
- `/api/admin/ads/stats` inventory health is computed per placement **and
  channel** (channel derived from the placement's section — `office` sections
  use channel `office`), so office placements never report website inventory.
- D31 engine behavior (3-commercial threshold → house fill, round-robin
  creatives, channel isolation, house≠commercial) is regression-guarded by
  `tests/ads-engine.test.mjs` (12 cases). Docs in `docs/ads/*` (9 files).

## `tests` prod envs require `DB_PROVIDER=postgres`
Any test that sets `NODE_ENV: "production"` (security-headers, origin-guard,
dev-login, ...) must also set `DB_PROVIDER: "postgres"` — production refuses to
boot without it (`getRuntimeEnv`/`parseDbProvider`).

# Phase 0 release baseline + build unblock (DONE 2026-08-18)

**Phase 0 audit (read-only):** canonical web = this repo (`refactor/architecture-foundation`, last commit 8fca76d 2026-08-17, 481 uncommitted files). Canonical desktop = `F:\akarpromax-office\AkarApp_Next\AkarApp` (user-confirmed). **Web build was BLOCKED** (16 tsc errors, `ignoreBuildErrors:false`); desktop build BLOCKED (no .NET SDK anywhere on machine; `dotnet --info` = "No SDKs were found"; VS18 has MSBuild.exe but only net8/net10 runtimes).

**Fixes applied (all verified):**
- `lib/land/intelligence/resolver.ts:121` — restore `let ... = undefined` initializer (my earlier const "lint fix" broke reassignment at :225; the no-initializer `let` form re-triggers prefer-const).
- `fetchpriority` → `fetchPriority` in `app/properties/[id]/page.tsx:150`, `components/advertising/placements/AdHero.tsx:51` (regressions from image-loading work).
- `src/components/tools/LandMapper.tsx` — hoisted `allText` to handler scope (declaration was inside the PDF branch, referenced outside).
- `app/api/ads/match/route.ts:22` — cache key uses `ctx.countryCode/cityId/language` (ResolvedAdContext has no country/city/locale).
- `app/admin/auction-organizers/page.tsx` — use `getSessionIdentity()` (requireSessionUser returns only email/displayName; role check was a type error).
- `src/components/public/public-shell-layout.tsx` — import `PublicNavItem`/`BreadcrumbItem` from `src/config/public-navigation`.
- `tsconfig.json` — exclude backup/snapshot dirs (`_auctions_current_snapshot`, `.*-backup`, `.temp-fix`, `.vinext`, `.wrangler`, `artifacts`, `build`, `tmp`); tsc was type-checking non-canonical code.
- `src/components/tools/FindMyLand.tsx` — **restored the AMRS surveyor feature** my previous session had dropped: `handleSaveLand` (POST /api/land), `handleDiscoverSurveyors` (GET /api/land/discover-surveyors), `handleRequestQuote` (POST /api/land/{id}/surveyors/quote with `service: "boundary_survey"`), + save/surveyor/quote UI. land-flow contract test passes again (39/39).

**Verified results:** `npx tsc --noEmit --incremental false` → exit 0. `next build` → **exit 0** with `DB_PROVIDER=postgres` (production provider; see Phase 1A below — the earlier "mysql-only build" note is obsolete). `npm ci` → **fails EUSAGE** (package-lock.json out of sync with package.json — missing webpack@5.109.2 etc.; run `npm install` to resync; note `vinext@1.0.0-beta.5` is not in the lockfile). `npm test` → **212 tests: 201 pass / 11 fail** (pre-existing debt: design-tokens 780px breakpoint + dark/LTR styles, rendered-html `.admin-dashboard-grid` + z-20 in LuxuryPropertyCard + ENOENT `public-page-shell.tsx` (renamed), public-shell "public top ad region"/"one hero slot", command-center `"web_home"` + `.admin-dashboard-grid`, services-api CRUD lifecycle 0!==1). Desktop `dotnet build` → **No .NET SDKs were found** (exit 0x80008083).

**Desktop↔web integration (open blocker):** desktop C# + webui call `/api/desktop/*` and `/api/program/sync` (hardcoded `Akar_ProMax_2026_Secure_Key`) — none exist in web; web's new `/api/office/v1/*` protocol has zero desktop callers. Plaintext credentials at `F:\akarpromax-files\` (do not read contents).

**Desktop build baseline (Phase 1B, 2026-08-18):** .NET 8 SDK **8.0.424** now installed via `winget install Microsoft.DotNet.SDK.8` (was absent). Canonical desktop `F:\akarpromax-office\AkarApp_Next\AkarApp` (no .sln — single `AkarApp.csproj`, net8.0-windows, WPF; OutputPath `..\`). `dotnet restore` needed a repo-level `F:\akarpromax-office\AkarApp_Next\NuGet.Config` (`<clear/>` + nuget.org only) because the machine's stale `C:\Program Files (x86)\NuGet\Config\DevExpress 26.1.config` (DevExpress not installed) broke every restore. `dotnet build -c Release` → 0 errors / 3 warnings (CS1998 MainWindow.cs:34, CS4014 DashboardViewModel.cs:433, CS0169 FileNameDialog.cs:17). GResourceBuilder pre-build regenerates `AkarApp.g.resources` from `decompiled/*.baml` (37 BAML entries — the WPF "XAML" is decompiled BAML, no .xaml sources); its `Program.cs` HARDCODED `D:\new program\AkarApp_Next\...` paths — fixed to self-locate the repo root (byte-identical output, SHA match). No test projects exist (WpfTest/ResTest are manual harnesses). WebUI source = `D:\new program\akarpromax-web\akar-frontend-src` (npm, Vite 5.4.21, outDir dist/, base "./"); `npm ci`/`npm run build` need `NODE_OPTIONS=--max-old-space-size=4096` and ≥5GB free RAM (OOM otherwise; close Chrome). Deployed `AkarApp_Next\webui\` (6/18) does NOT match fresh dist (only vendor-three hash identical — source drift; frontend is not a git repo). `dotnet publish -c Release -r win-x64` → clean 103 files, but **webui/ is NOT included** (no Content include; WPF reads `{exeDir}\webui\index.html` via akarapp.local mapping at AkarV2PortalWindow.cs:79/315). First-run DB = EnsureCreated + V2SchemaMigration.Apply + ApplySafeAlterTables (EF Migrations folder is dead code); seeder + EnsureDefaultAdminExists hardcode **admin/admin123, manager/manager123, accountant/accountant123** (seeded hashes are UNSALTED Sha256; admin PBKDF2 via PasswordHasher) and announce them in a MessageBox (Phase 1C fixed this: random first-run admin password). NOTE: Phase 1B's "mojibake-corrupted Arabic" finding was FALSE — a PowerShell console rendering artifact; all C# and frontend sources are clean UTF-8 Arabic. Runtime requires HWID activation key (ActivationView) + offline subscription gate.

# Phase 1A — PostgreSQL production runtime (DONE 2026-08-18)

`DB_PROVIDER=postgres` is again the canonical **production** provider (Phase 0 flip-back). MySQL/D1 remain supported (dev/tools).

- `lib/config/runtime-env.ts` — `parseDbProvider`: production default is now `postgres` (was mysql); removed the "production no longer supports postgres" rejection. Empty/invalid handling unchanged; dev/test still default to `d1`.
- `tests/runtime-env.test.mjs` — contract tests updated: production defaults to postgres; accepts postgres/mysql/d1; the "rejects postgres" test replaced.
- **Verified:** `tsc --noEmit` exit 0; `next build` with `DB_PROVIDER=postgres` **exit 0** (no live DB needed at build — env validation only, routes are dynamic); `npm test` 212 → 201/11 (unchanged from baseline, 0 new failures); targeted DB/runtime suite 125/125 + prod-env suite 58/58.
- **Runtime smoke (production build, `.env` → Neon):** `next start` and `node .next/standalone/server.js` both boot; GET / 200; `/api/geo?type=countries` 200 (PG geo tables); POST `/api/ads/match` HERO 200 (house campaign served — PG content schema ensured at runtime); `/api/auth/login` 401 (PG users query); `/api/properties`, `/api/news`, `/api/currencies`, `/api/land/search` all 200 with real Neon rows. NOTE: `next start` prints a warning that `output: standalone` should run via `node .next/standalone/server.js` (copy `.next/static` + `public` into the standalone dir) — that artifact is verified working.
- **Schema:** no migrations changed. PG content schema is ensured at runtime by `ensureContentSchema` via `PgRuntimeDb` (translated D1 SQL); auth/geo/properties tables already exist in Neon (0015). All verified live.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
