# Vinext on Windows — static assets 404 (PATCHED)

`vinext` 0.0.50 has a Windows bug: `walkFilesWithStats` in
`node_modules/vinext/dist/server/static-file-cache.js` builds cache keys with
`path.relative()` which yields backslashes (`assets\index-abc.js`), so
`/assets/*` requests (forward slashes) always miss the cache → **404 for all
CSS/JS** under `vinext start` (root-level files like `/favicon.svg` still work).

Fix applied to `node_modules/vinext/dist/server/static-file-cache.js` line 207:

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
