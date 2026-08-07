# Runtime Database Provider Matrix

Single source of truth: `lib/runtime-db.ts` → `decideSchemaMode(provider, d1Available)` based on `DB_PROVIDER`.

## Final convergence (Phase 5 closed)

| Subsystem | Production (`vinext start`) | Dev (`vinext dev`) | Legacy / compat |
|---|---|---|---|
| Auth | postgres | postgres | — |
| Users | postgres | postgres | — |
| Properties | postgres | postgres | — |
| Services (marketplace) | postgres | postgres | — |
| Office integration | postgres | postgres | — |
| Notifications | postgres | postgres | — |
| Sync | postgres | postgres | — |
| Radar (geo distance) | postgres (Haversine provider) | postgres (Haversine) | PostGIS adapter staged |
| Audit events | postgres | postgres | — |
| Sessions | postgres | postgres | — |
| Verification challenges | postgres | postgres | — |
| Content (news/ads/sponsors) | postgres | d1 (local) | — |

`DB_PROVIDER=postgres` ⇒ **Auth = postgres, Content = postgres, Services = postgres, Office = postgres, Notifications = postgres.** No silent fallback; `ALLOW_MYSQL_FALLBACK` is removed.

## Provider roles (final)

| Provider | Role | Environments |
|---|---|---|
| `postgres` | **Primary production** | `vinext start` + Neon/PostgreSQL, `vinext dev` (PG-compatible) |
| `d1` | **Local dev only** | `vinext dev` (D1 local binding via `@cloudflare/vite-plugin`) |
| `mysql` | **LEGACY / migration compat** | opt-in under `vinext start` via `DB_PROVIDER=mysql` only |

`mysql` is classified `LEGACY` and must NOT be silently selected. If `DB_PROVIDER=mysql` is set, `lib/mysql-runtime.ts` is used (Drizzle mysql2 + `MYSQL_URL`). Otherwise Postgres.

## Environment → provider mapping

```
NODE_ENV          DB_PROVIDER     -> mode       adapter        binding present
production        postgres        -> postgres   lib/pg-runtime.ts  DATABASE_URL
production        mysql           -> mysql      lib/mysql-runtime.ts MYSQL_URL
production        d1              -> ERROR      SchemaModeError (no binding)
development       (unset)         -> d1         D1 local     env.DB
development       postgres        -> postgres   lib/pg-runtime.ts
development       mysql           -> mysql      lib/mysql-runtime.ts
```

No D1→MySQL silent fallback. A `d1` request without the binding throws `SchemaModeError`.

## Auth provider assertion

`lib/runtime-db.ts::selectSchemaMode()` is the single decision point. Auth (`lib/db/index.ts`) does **not** re-select a provider — it always reads `DATABASE_URL` (PG) and is only reached when `DB_PROVIDER=postgres` (or unset dev, which still resolves PG via `getRuntimeEnv`). An internal health assertion exposes:

```
GET /api/health/ready
{ status: "ok", runtime: { dbProvider: "postgres" | "mysql" | "d1", schemaMode: "postgres" | ... } }
```

This is internal/admin only (not exposing host/credentials). It lets a deployment verify `contentProvider === authProvider === "postgres"` without leaking connection details.

## MySQL separation

`MYSQL_URL` is separate from `DATABASE_URL` (see AGENTS.md). `lib/db/index.ts`, `lib/mysql-runtime.ts`, `lib/mysql-db.ts`, `drizzle.mysql.config.ts` all read `MYSQL_URL` (fallback `mysql://root:root@localhost:3306/akarpromax`). `lib/db/index.ts` (auth) reads `DATABASE_URL` (PG). They cannot silently cross-wire.

## D1 role

D1 is **dev-only** (local Miniflare storage). It backs the same content-schema DDL/seeds through `PgRuntimeDb`/`MysqlRuntimeDb` translation, so business behavior matches Postgres. There is no production traffic routed to D1.

## Verification

- `vinext start`, `DB_PROVIDER=postgres`: `[runtime-db] schema mode: postgres`; all content + auth routes hit Postgres.
- `vinext dev`, unset: `[runtime-db] schema mode: d1`; content seeded in local D1; auth via dev D1 `users`.
- `vinext start`, `DB_PROVIDER=mysql`: content + auth hit MySQL via `MYSQL_URL` (legacy compat). Auth still requires PG-only features only if `lib/db` is PG — see note: under `mysql` provider, `lib/db` still connects to PG; this is the documented hybrid only for **content**, not auth. `DB_PROVIDER=postgres` is required for production auth.
