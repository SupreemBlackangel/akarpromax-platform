# Services Database Dependency Audit

## Scope

This audit covers the data-layer dependencies of the Services Marketplace module
(`lib/services/*`, `app/api/service-*`, `scripts/seed-services-marketplace.ts`).
Acceptance criterion: the Phase 4 work must not introduce any **new** D1/MySQL (or
PostgreSQL) dependency in the services module beyond the pre-existing, documented
runtime resolution.

## Access boundary

All data access in the marketplace module flows through a single seam:

```
lib/services/db.ts
  └─ getServicesDb(): Promise<D1Database>
       ├─ setServicesDbForTesting(db) override  (tests only)
       └─ getRuntimeDb()                         (production)
```

- Production: `getRuntimeDb()` (`lib/runtime-db.ts`) tries the D1 binding
  (`import("cloudflare:workers")` → `env.DB`) first — available under `vinext dev`
  via `@cloudflare/vite-plugin`. When the binding is absent (e.g. `vinext start`),
  it falls back to `getMysqlRuntimeDb()` (`lib/mysql-runtime.ts`), which exposes the
  same `D1Database` interface and translates queries to MySQL.
- Tests: `setServicesDbForTesting(db)` injects an explicit in-memory D1-compatible
  adapter, so integration tests never touch a real database and are deterministic.

No call site in `lib/services/*` or the marketplace API routes touches a database
driver, ORM, or `env.DB` directly.

## Module dependency table

Verified from the actual import statements (`lib/services/*.ts`):

| File | DB-relevant imports | Notes |
|---|---|---|
| `db.ts` | `@/lib/runtime-db`, `@/lib/auth/mysql-time` | The only file that talks to runtime-db; defines the test seam |
| `marketplace.ts` | `@/lib/services/db`, `@/lib/services/audit`, `@/lib/services/matching`, `@/lib/services/constants`, `@/lib/auth/mysql-time` | All access via `getServicesDb()` |
| `core.ts` | `@/lib/services/db`, `@/lib/services/audit`, `@/lib/services/constants`, `@/lib/auth/mysql-time` | All access via `getServicesDb()` |
| `matching.ts` | `@/lib/services/db`, `@/lib/services/match-score`, `@/lib/auth/mysql-time` | All access via `getServicesDb()` |
| `audit.ts` | `@/lib/services/db`, `@/lib/auth/mysql-time` | All access via `getServicesDb()` |
| `match-score.ts` | — | Pure computation, no DB |
| `constants.ts` | — | Pure constants/state machines |
| `seed-marketplace.ts` | — | Pure generator; accepts a `SeedDb` argument (`INSERT OR IGNORE`, `INSERT ... ON CONFLICT`) |

`@/lib/auth/mysql-time` (`nowMySqlDateTime`) is a pure date-formatter used for
`created_at`/`updated_at` values; it is a pre-existing ARCH-013 legacy-allowed usage,
unchanged by Phase 4.

## What is NOT used by the services module

Confirmed by content scan of `lib/services/*`:

- PostgreSQL / Neon (`postgresql://`, `postgres`, `pg`, `drizzle`): **none**
- MySQL driver (`mysql2`): **none** (MySQL access exists only behind `lib/mysql-runtime.ts`,
  which the module reaches through the D1-interface shim)
- `cloudflare:workers` / `env.DB`: **none** (only `lib/runtime-db.ts` imports it)
- Direct `@/lib/db` (PG `getDb`): **none**

## Phase-relative delta

| Dependency | Baseline (precheck) | After acceptance work | Delta |
|---|---|---|---|
| `@/lib/runtime-db` reachability | through `lib/services/*` + overview route | through `lib/services/db.ts` only (overview moved to `getAdminOverview()` in `marketplace.ts`) | 0 (net) |
| Direct `getRuntimeDb()` call sites in `lib/services/*` | many (marketplace/audit/core/matching) | 0 — all replaced by `getServicesDb()` | −4 files |
| New D1/MySQL dependency | — | none | 0 |
| ARCH-013 (MySQL legacy allowed) flags | 7 files (`audit`, `core`, `db`, `marketplace`, `matching`, `sponsor-auth`, `api/auth/verify`) | 7 files (unchanged set) | 0 |

The module-boundary checker stays at the pre-existing 164 violations
(`check-module-boundaries.mjs`), with no new `architecture-exceptions.json` entries.
`check-architecture.mjs` PASS (0 violations).

## Testability

- `setServicesDbForTesting(db)` + `getServicesDb()` let `tests/services-api.test.mjs`
  and `tests/services-authz.test.mjs` run full CRUD, overview, provider-status,
  reports, notifications and audit assertions against an in-memory adapter.
- The environment-gated `tests/services-e2e.mjs` exercises real D1/MySQL resolution
  under `vinext dev`/`vinext start` and prints `SKIPPED: integration environment
  unavailable` when the env var is absent.

## Reproduction

```bash
# Confirm no direct driver/ORM usage in the module
rg -n "postgres|neon|drizzle|mysql2|cloudflare|@/lib/db" lib/services/   # → no matches

# Confirm all access flows through the seam
rg -n "getServicesDb\(\)|getRuntimeDb\(\)" lib/services/
```
