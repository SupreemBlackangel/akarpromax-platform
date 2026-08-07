# PHASE 5 — BASELINE

Date: 2026-08-07 · Captured before any Phase 5 production-code edit.

## Git state

| Item | Value |
| --- | --- |
| Baseline commit | `402ee84` (docs(platform): add connected ecosystem baseline) |
| Current HEAD | `402ee84` |
| Branch | `refactor/architecture-foundation` |
| Worktree status | CLEAN (one untracked dir `docs/runtime/` containing the Phase 5 RUNTIME_TARGET_DECISION.md) |
| Uncommitted diffs | none |
| `git diff --check` | clean |

## Toolchain

- Node: `v24.14.0`, npm `11.9.0`
- vinext: `0.0.50`
- engines: `node >=22.13.0`

## Current runtime architecture

- Web + API run in one bundle served by `vinext`:
  - `vinext dev` = Vite dev server over the Workers runtime (`@cloudflare/vite-plugin` shims `cloudflare:workers` `env.DB`).
  - `vinext start` = Node production process serving static assets + RSC + route handlers.
- Worker entry: `worker/index.ts` (image optimization + `vinext/server/app-router-entry`).
- Build: `vite.config.ts` (`vinext()` + `sites()` + `cloudflare()` plugin; `rolldownOptions.external: ["nodemailer"]`).

## Current database providers

| Provider | Role | Where used |
| --- | --- | --- |
| PostgreSQL (`lib/db`, postgres-js + drizzle) | Auth only (users/sessions) | `lib/auth/*`, auth routes |
| D1 (`cloudflare:workers` `env.DB`) | Content + integration tables in dev | `lib/runtime-db.ts` → `getRuntimeDb()` |
| MySQL (`lib/mysql-runtime.ts` mysql2 shim) | Content + integration under `vinext start` | same `getRuntimeDb()` seam via `translateSql` |

Schema mode selection: `lib/runtime-db.ts` `selectSchemaMode()` → `decideSchemaMode({d1Available, d1InitSucceeded, allowMysqlFallback, mysqlConfigured})`. Mode values `"uninitialized" | "d1" | "mysql-fallback" | "failed"`. `ALLOW_MYSQL_FALLBACK=true` permits silent D1→MySQL fallback; otherwise throws. `sponsorSchemaReady` is a module-level promise singleton that latches the first attempt (success or failure).

## Current session architecture

- `lib/auth/session.ts`: JWT (`jose` HS256) in HttpOnly `akar_session` cookie, 7-day max-age, `sameSite: "lax"`, `secure: NODE_ENV==="production"`.
- Read path: explicit header param → `headers().get("cookie")` parse → `cookies().get()`. Works in dev; under `vinext start` the cookie is not reliably read (documented limitation).
- `getSessionUser(token)` opens a fresh PG client via `getDb()`.
- Session revocation is an in-memory `Set<jti>` (per-process, documented limitation).
- Identity resolution is cookie-only since the auth consolidation (no ChatGPT headers, no localStorage bearer, no localhost fallback in production).

## Current vinext behavior

- Windows static-asset bug: `node_modules/vinext/dist/server/static-file-cache.js:207` must be patched manually (`path.relative(base, batch[j]).split(path.sep).join("/")`) or `/assets/*` 404s. Patch is lost on `npm install`.
- PG (`postgres-js`) fails under `vinext start`: `ERR_UNSUPPORTED_ESM_URL_SCHEME` on `cloudflare:` (sockets inlined into the Worker-targeted bundle). Auth → 500 under start.
- nodemailer is externalized in build but NOT declared in `package.json` (type-level only).

## Current SSE implementation

- `app/api/office/v1/stream/route.ts`: device Bearer auth, `createRealtimeTransport()` (DB-backed `DbRealtimeTransport`), `retry: 3000`, `Last-Event-ID` replay (max 100), `ready` event.
- `lib/integration/realtime.ts`: publish → insert into `office_realtime_events`; replay filters by scope/sponsor/office and `created_at > anchor`. Event log is the source of truth.
- Not hardened: no keep-alive timer, no per-connection cleanup on timeout, no auth-via-cookie path for browser clients, no `X-Accel-Buffering` verification.

## Current geo implementation

- `lib/integration/radar.ts`: self-contained `haversineKm`; `GeoDistanceProvider`-style seam per docs; `HaversineGeoDistanceProvider`; PostGIS adapter reserved (contract only). Max radius is a policy constant in radar.ts.

## Current notification timezone behavior

- `lib/integration/notifications.ts`: `hoursOfNow()` uses **server local time** (`new Date().toTimeString()`). `isWithinQuietWindow(start, end, now)` handles overnight wrap but is timezone-naive. Timestamps stored as UTC strings.

## Current seed entry points

| Seed | File | Runs during |
| --- | --- | --- |
| `seedNews` | `lib/runtime-db.ts`, `lib/mysql-runtime.ts` | schema init |
| `seedSponsorPlans` | same | schema init |
| `seedIntegrationDemo` | `lib/runtime-db.ts` | schema init |
| `seedServicesMarketplace` | `lib/services/seed-marketplace.ts` | schema init |
| `seedLocalAdminAccess` (admin@localhost.akarpromax) | `lib/mysql-runtime.ts` | MySQL schema init |

None guard against `NODE_ENV=production`. No `assertSeedAllowed()` exists.

## Current health endpoints

- `GET /api/health` (single endpoint): `getRuntimeEnv()` + `getSchemaStatus()` → `ok`/`degraded`. No liveness/readiness/dependency split.

## Known limitations (pre-existing, documented in AGENTS.md)

- Vinext Windows asset patch lost on `npm install`.
- PG cannot load under `vinext start` (auth 500).
- Session cookie not read under `vinext start` (auth:false over HTTP).
- D1 routes only work under `vinext dev`.
- `vinext dev` breaks on MySQL/drizzle queries (`EvalError` code-gen) — use `vinext start` for MySQL.
- In-memory rate-limit store + in-memory session revocation + in-memory realtime transport override = per-instance state.
- `sponsorSchemaReady` singleton hides schema failures across the process lifetime.
- nodemailer undeclared dependency.

## Pre-existing lint state

- 58 warnings / 35 files, 0 errors. Captured to `lint-full.txt` (files list recorded; full inventory to be written to `docs/runtime/LINT_WARNING_INVENTORY.md`).

## Potential security risks (pre-existing)

- Quiet-hours evaluated in server-local time (recipient timezone drift).
- Rate limiter is in-memory (per-instance) in production.
- Session revocation in-memory (per-instance).
- Seeds (incl. local super-admin) are not production-blocked.
- Health endpoint exposes schema mode (not a secret, but no sanitized dependency view).
- nodemailer import unresolved at the dependency level.

## Files expected to change

`lib/config/runtime-env.ts`, `lib/runtime-db.ts`, `lib/mysql-runtime.ts`, `lib/db/index.ts`, `lib/auth/session.ts`, `lib/security/rate-limit.ts`, `lib/integration/notifications.ts`, `lib/integration/radar.ts`, `lib/integration/realtime.ts`, `app/api/health/route.ts`, `lib/services/seed-marketplace.ts`, `vite.config.ts`, `package.json`, `.env.example`, new `scripts/apply-vinext-patch.mjs`, new tests.

## Files excluded

No changes to: Office desktop runtime, public shell UI, services/property marketplace business logic, product identity, API contracts without compatibility strategy.

## Rollback point

`402ee84` (baseline). All Phase 5 work is forward-fixable; no destructive migrations, no `git reset --hard`, no DB drops.
