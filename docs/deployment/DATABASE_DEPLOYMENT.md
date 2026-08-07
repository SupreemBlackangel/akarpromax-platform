# Database Deployment

## Production database

PostgreSQL (Neon). `DB_PROVIDER=postgres` is required for production.

### Connection

`DATABASE_URL=postgresql://<user>:<password>@<host>/<db>?sslmode=require&channel_binding=require`

`MYSQL_URL` is **separate** and only used when `DB_PROVIDER=mysql` (legacy/compat). `lib/db/index.ts` (auth) and `lib/pg-runtime.ts` (content) both read `DATABASE_URL` via `lib/config/runtime-env.ts`.

### Schema sources

- **Content schema** (news, ads, sponsors, services, integration, i18n, properties): `lib/content-schema.ts` + per-area `ensure*Schema` functions. Applied by `lib/pg-runtime.ts` / `lib/mysql-runtime.ts` via the runtime adapter, gated by the `ak_content_schema_meta` latch. In production the schema is created on first readiness probe (no separate migration step required for the content area).
- **Auth schema** (users, verification_challenges, audit_events): Drizzle `pgTable` definitions in `lib/db/schema.ts`, applied by the `postgres` driver against `DATABASE_URL` at query time. Auth DDL relies on the same tables the Drizzle ORM reflects; no separate `db:migrate` is required for auth because the auth adapter uses `CREATE TABLE IF NOT EXISTS` semantics through the runtime path (see `lib/db/index.ts` consumers).

## MySQL (legacy)

Only when `DB_PROVIDER=mysql`. Reads `MYSQL_URL` (fallback `mysql://root:root@localhost:3306/akarpromax?charset=utf8mb4`). Uses `lib/mysql-runtime.ts` (D1-shaped translation over mysql2). Auth still routes to Postgres via `lib/db/index.ts` unless the deployment explicitly accepts the documented PG-under-start limitation.

## D1 (dev only)

`vinext dev` resolves D1 local via the `@cloudflare/vite-plugin` shim (`env.DB`). Not used in production. D1 requests without the binding fail fast (`SchemaModeError`).

## Concurrent first boot

Two instances starting against a fresh DB:
- Idempotent `CREATE TABLE IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS` DDL.
- `ak_content_schema_meta` latch uses `INSERT ... ON CONFLICT DO NOTHING` (Postgres) / D1 equivalent — conflict-safe.
- No seed duplication (seeds are `COUNT`-guarded and production-gated).

## Performance

After the schema latch is set, content routes no longer run DDL. First fresh-Boot DDL is the only long pole and happens outside the request path on readiness.
