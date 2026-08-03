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

## Dev-mode limitation
`vinext dev` breaks on MySQL/drizzle queries with
`EvalError: Code generation from strings disallowed for this context`.
Use `vinext start` (production build) for MySQL-backed E2E testing.

## D1-backed routes only work under `vinext dev`
`cloudflare:workers` / `env.DB` (used by `lib/runtime-db.ts` for the D1 content
tables: sponsors, ads, news, ...) is shimmed only by `@cloudflare/vite-plugin`
in the Vite dev server. Under `vinext start` the import fails with
`ERR_UNSUPPORTED_ESM_URL_SCHEME` and those routes degrade to empty results
(e.g. `GET /api/news` → `{"news":[]}`, so the ticker falls back to static copy).

E2E-test D1 routes (news/sponsors/ads CRUD, seeded rows) on `vinext dev`
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
cookie session is the primary identity for `/api/user-context` and every
`getSponsorIdentity()`/`getChatGPTUser()` gate (header/`admin@localhost.*`
fallback kept). `lib/auth/session.ts::readSessionCookieValue` reads the raw
`Cookie` header via `headers()` first, then `cookies()` — so it also works under
`vinext start` *if* PG itself loads there (it does not, see below).

**PG under dev — per-request connections required.** postgres-js's module-level
pool cannot be reused across requests inside vinext dev's Workers runtime
(throws `Cannot perform I/O on behalf of a different request` intermittently,
and Drizzle's prepared-statement cache makes it worse). `lib/db/index.ts` now
exports `getDb()` → `{ db, end }` (fresh postgres client per call, `prepare: false`),
and ALL auth routes/helpers (`login`, `register`, `me`, `lib/auth/session.ts`,
`lib/sponsor-auth.ts`, `app/chatgpt-auth.ts`) open/close one client per request.
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

## runtime-db falls back to MySQL even in dev (FIXED)
`lib/runtime-db.ts` tries `cloudflare:workers` `env.DB` first; D1 **is** available
to route handlers under `vinext dev`. But `ensureSponsorSchema()` threw
`index ... already exists: SQLITE_ERROR` on the D1 schema init (i18n/services
`CREATE INDEX` lacked `IF NOT EXISTS`, and their catch regex only matched
MySQL's `duplicate` wording). The failure was swallowed, so `getRuntimeDb()`
silently fell back to MySQL → `connect ETIMEDOUT` → 500s on every data route.
Fixed by adding `IF NOT EXISTS` to `I18N_INDEXES_SQL` / `SERVICES_INDEXES_SQL`
and widening the duplicate regex to `/duplicate (key|index|column)|already exists/i`.
**Caveat**: `sponsorSchemaReady` is a module singleton — if schema init ever
rejects again, all subsequent calls fall back to MySQL until the server restarts.
News/sponsors/ads/admin-data now serve real D1 (seeded) data in dev; MySQL is
only needed for `vinext start`.

## MYSQL_URL must be separate from DATABASE_URL (FIXED)
`DATABASE_URL` points at Postgres/Neon, but `lib/mysql-runtime.ts`,
`lib/mysql-db.ts` and `drizzle.mysql.config.ts` used to read it as the MySQL
connection string. Under `vinext start` the D1 binding is absent, so data
routes fell back to MySQL → mysql2 tried to parse the `postgresql://` URL
(ETIMEDOUT, plus `Ignoring invalid configuration option ... sslmode/
channel_binding` warnings) → 500s on news/sponsors/ads/admin.
Now all three files use `MYSQL_URL` (falls back to
`mysql://root:root@localhost:3306/akarpromax`), declared in `.env`/`.env.example`.
**Verified under `vinext start` (port 3011):** `GET /api/news` → 200 with the
MySQL rows (4 for the guest scope); `GET /api/sponsors` → 200. Login still
500s there because PG cannot load (`cloudflare:`), so keep auth E2E on `dev`.


