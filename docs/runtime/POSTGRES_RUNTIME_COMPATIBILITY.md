# PostgreSQL Runtime Compatibility

Status: **Verified** · 2026-08-07 · Environment: `vinext start` (production, Node.js)

## Summary

PostgreSQL (via `postgres-js`) **does connect and serve content data under
`vinext start`**. The original blocker was *not* a `cloudflare:sockets` ESM
failure at runtime (as previously suspected for auth) — content tables use the
`lib/pg-runtime.ts` adapter (`PgRuntimeDb`, a D1-compatible shim over
`postgres-js`) which connects to a Neon Postgres endpoint with
`ssl: "require"`, `prepare: false`.

What previously blocked this was the connection model: the original adapter
created **a fresh TLS connection per statement** (`max: 1`, no pooling) for a
~300-statement schema bootstrap. At ~2s/TLS handshake each on Neon, the first
request that triggers `ensureContentSchema` timed out long before completing.

## Fix applied

`lib/pg-runtime.ts` now uses an **adaptive client strategy**:

| Runtime | Detection | Connection model | Why |
| --- | --- | --- | --- |
| `vinext start` | `import("cloudflare:workers")` throws `ERR_UNSUPPORTED_ESM_URL_SCHEME` | **Shared persistent pool** (`max: 10`, `onnotice: () => {}`) | Node sockets work across requests; pooling amortizes the TLS handshake. |
| `vinext dev` | `import("cloudflare:workers")` resolves (Vite/Workers runtime) | **Fresh client per statement**, closed after use | postgres-js module-level pool cannot be reused across Workers requests (throws `Cannot perform I/O on behalf of a different request`). |

Detection is cached in a module-level variable (`runtimeIsWorkers`) so the
`cloudflare:workers` import is probed at most once per process.

## Schema init

`lib/content-schema.ts::ensureContentSchema(db)` is idempotent and guarded by a
**schema-version latch** (`ak_content_schema_meta` table, version
`CONTENT_SCHEMA_VERSION`). On a fresh database it runs the full DDL + seeds
(~300 statements + marketplace seed ~80 statements) in ~70–110s over Neon TLS
(the first request pays this cost; subsequent requests in-process are ~instant).
On an already-initialized database it performs a single `SELECT` against the
marker table and returns immediately (~150–200ms).

DDL batches of parameter-less statements are coalesced into single simple-query
`unsafe` calls to minimize round trips.

### Type-compatibility note (service_requests)

A Postgres-specific `inconsistent types deduced for parameter $N` server error
occurs when a single bound parameter is inserted into columns of **different
types** in the same statement. This affected the marketplace seed's
`service_requests` INSERT, where the same `?15` placeholder (a UTC-timestamp
string) was bound to `published_at` (TEXT) and `created_at`/`updated_at`
(DATETIME → TIMESTAMP).

Fix: `published_at` / `matched_at` are declared `DATETIME` (not `TEXT`) in
`lib/services-marketplace-schema.ts` so all date columns share the `TIMESTAMP`
type after `translateSql`. (SQLite/D1 and MySQL accept DATETIME for these.)
If columns are added later, keep date columns on `DATETIME`/`TEXT` consistently
within any single INSERT that reuses a parameter across them.

## Auth (PG `lib/db`)

Content tables load under `vinext start` (above). The **auth** layer
(`lib/db`, `getDb()`/drizzle `postgres-js`) still cannot load under `vinext
start`: the production bundle inlines `cloudflare:sockets`
(`dist/server/index.js`), and Node cannot load that scheme
(`ERR_UNSUPPORTED_ESM_URL_SCHEME`) on every PG query → 500 on `/api/auth/login`.
This remains by design; auth E2E runs on `vinext dev` only, and
`vinext start` stays MySQL-backed for auth. See AGENTS.md.

## How to reproduce

```bash
npm run build
NODE_ENV=production DB_PROVIDER=postgres npx vinext start --port 3011
# In separate shell (first request may take ~70–110s on a fresh DB):
fetch http://localhost:3011/api/news            # 200, seeded rows
fetch http://localhost:3011/api/services/categories?country=om  # 200, categories
fetch http://localhost:3011/api/properties      # 200, seeded rows
fetch http://localhost:3011/api/sponsors         # 200, [] (no sponsor seeder)
curl http://localhost:3011/                      # 200, HTML shell
curl http://localhost:3011/assets/index-*.css    # 200 (see VINEXT_RUNTIME_PATCHES.md)
```
