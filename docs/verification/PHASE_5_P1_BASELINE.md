# Phase 5 P1 — Continuation Baseline

Captured at the start of P1 (production auth + runtime unification).

## Git state

| Field | Value |
|---|---|
| Branch | `refactor/architecture-foundation` |
| HEAD | `da8b2ec` (Phase 5 P0 committed) |
| Phase 4 baseline | `06a4a2f` |
| Rollback base | `06a4a2f` |
| Worktree | CLEAN (probes removed before P1 start) |

## Build / test state (post P0)

| Check | Result |
|---|---|
| `npx tsc --noEmit` | PASS (0 errors) |
| `npm run build` | PASS (vinext build) |
| `npm test` | 160/160 PASS |
| `npm ci` | PASS (clean install gate) |
| postinstall (`patch-vinext-windows.mjs`) | applied, idempotent |

## Runtime state

### DB_PROVIDER resolution (`lib/runtime-db.ts` → `lib/config/runtime-env.ts`)

| Env | `DB_PROVIDER` | Result |
|---|---|---|
| Production (`vinext start`, `NODE_ENV=production`) | `postgres` | `[runtime-db] schema mode: postgres` (deterministic) |
| Development (`vinext dev`) | unset → `d1` | D1 local binding via `@cloudflare/vite-plugin` shim |
| Production with `mysql` | `mysql` | mysql-runtime adapter |
| Production with `d1` (no binding) | `d1` | **fail-fast** `SchemaModeError` (no silent fallback) |

`ALLOW_MYSQL_FALLBACK` is removed. `decideSchemaMode(provider, d1Available)` is the single decision point.

### PostgreSQL content runtime

`lib/pg-runtime.ts` — adaptive client strategy:
- `import("cloudflare:workers")` probe (cached in `runtimeIsWorkers`).
- **Node / `vinext start`** → shared `postgres` pool (`max: 10`, `onnotice: () => {}`).
- **Workers / `vinext dev`** → fresh single-connection client per statement (pool does not survive the Workers request boundary).
- SQL translation: backtick → double-quote, `INSERT OR IGNORE` → `INSERT ... ON CONFLICT DO NOTHING`, `DATETIME` → `TIMESTAMP`, `datetime('now')` → `now()`, `?N` / bare `?` → `$N` placeholders.
- Batch DDL coalesced into multi-statement simple-query.

Verified under `vinext start` (port 3011, `DB_PROVIDER=postgres`):
- `GET /` → 200
- `GET /api/news` → 200 (seeded rows)
- `GET /api/services/categories?country=om` → 200 (46 KB)
- `GET /api/properties` → 200
- `GET /api/sponsors` → 200
- `GET /api/properties` → 200

### Auth database runtime (P1 result)

`lib/db/index.ts` — Drizzle `postgres-js` datasource.
- **Previous P0 claim:** "PG cannot load under `vinext start` — `cloudflare:sockets` ESM scheme → 500 on login."
- **Re-verified in P1:** FALSE at the import/connection level. The auth DB adapter (`lib/db`) executes Drizzle queries against PostgreSQL under `vinext start`:
  - `POST /api/auth/register` → **201** (writes a user to Postgres).
  - `POST /api/auth/login` (with a verified user) → **200** + `Set-Cookie: akar_session=`.
  - `GET /api/auth/me` (cookie) → **200** `{authenticated:true, ...}`.
  - `GET /api/user-context` (cookie) → **200**.
  - `POST /api/auth/logout` → **200** + clearing cookie; subsequent `/me` → 401.
- The `ERR_UNSUPPORTED_ESM_URL_SCHEME` failure observed originally was a **stale-password / wrong-DBName** connection error (real PG error `28P01`), mis-attributed to the ESM scheme. No build-time `cloudflare:sockets` import error occurs under `vinext start`.

### Session cookie runtime (P1 result)

`lib/auth/session.ts::readSessionCookieValue`:
- Reads raw `Cookie` header via `headers()` first, then falls back to `cookies()`.
- Works under `vinext start` (HTTP local): `GET /api/auth/me` returns `authenticated:true` when a valid session cookie is sent.
- `buildSessionCookieOptions`: `HttpOnly=true`, `secure=NODE_ENV==="production"`, `SameSite=lax`, `Path=/`.
- Logout revokes the session `jti` (in-memory `revokedSessionJtis`) **and** clears the cookie.
- Note (documented limitation): in-memory session revocations are process-local; a horizontally-distributed production deployment needs a shared revocation store (see `docs/security/AUTH_SESSION_POLICY.md`).

### Static assets (vinext Windows patch)

`node_modules/vinext/dist/server/static-file-cache.js:207` patched via `scripts/patch-vinext-windows.mjs` (postinstall):
```js
relativePath: path.relative(base, batch[j]).split(path.sep).join("/"),
```
Re-verified after `npm ci`: CSS 200 (217 KB), JS 200 (framework 189 KB, index 87 KB).

## Known blockers (P1 verified)

| # | Description | Status |
|---|---|---|
| P0-A | PostgreSQL auth under `vinext start` | **CLOSED** — queries execute, login/me/logout verified |
| P0-B | Session cookie read under `vinext start` | **CLOSED** — `headers()`-first reader works over HTTP |

New items to close in P1 (see `# 4. MISSION` ordering):
- P3: Production auth E2E (register→verify→login→/me→protected→logout, under `vinext start`)
- P4: Runtime/DB convergence matrix (auth, users, services, office, notifications all `postgres` in production)
- P5: Schema/readiness hardening (liveness/readiness endpoints, schema version latch correctness, concurrent-first-boot)
- P6: SSE hardening under `vinext start`
- P7: Timezone hardening (quiet hours UTC + recipient tz)
- P8: Multi-instance audit
- P9: Seed/security closure (production demo-seed OFF by default)
- P10: Clean-install reproducibility (postinstall patch verified)
- P11: Comprehensive regression suite (layers 1–12)
- P12: Commit + final Phase 5 baseline

## Current tests

- `tests/e2e/production-runtime.test.mjs` (7 checks) — content routes + assets + postgres select.
- Phase 4 auth E2E suite (160 total tests) — runs on `vinext dev` (D1 local).

## Current blockers (external / out of P1 scope)

(none blocking P1 progress; auth DB + cookie both verified working)
