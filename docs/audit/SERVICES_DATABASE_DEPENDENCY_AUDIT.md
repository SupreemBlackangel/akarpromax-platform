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

## L1C-0 — canonical Services persistence (2026-08-21)

L1C-0 removed the **second, parallel Services store** that had been reachable
from active production routes. There is now exactly one Services Marketplace
persistence truth.

### Canonical Services core

| Layer | Path |
|---|---|
| Schema (base tables) | `lib/services-schema.ts` (`service_categories`, `service_listings`, `service_requests`, `service_offers`, `service_orders`, `service_messages`, `service_reviews`, `service_disputes`, `service_bookmarks`) |
| Schema (marketplace extension) | `lib/services-marketplace-schema.ts` (ALTERs the tables above + `service_provider_*`, `service_request_*`, `service_offer_revisions`, `service_job_timeline`, `service_reports`, `service_notifications`, `service_message_*`, `service_outbox_events`, `service_marketplace_settings`) |
| Domain service | `lib/services/marketplace.ts` (+ `lib/services/core.ts`, `lib/services/matching.ts`) |
| Access seam | `lib/services/db.ts` → `getServicesDb()` |

### Deprecated parallel model — OWNER-DEFERRED, NOT DELETED

`lib/db/schemas/services-schema.ts` (Drizzle/PG) declares `service_categories`,
`service_requests`, `service_offers`, `service_reviews` with the **same table
names but incompatible columns**, plus `service_providers`, `service_jobs`,
`service_portfolio`. It has no migration and is not canonical.

Active consumers **before** L1C-0:

| Consumer | Kind |
|---|---|
| `app/api/services/route.ts` | LEGACY ACTIVE — read *and wrote* `service_requests` in the deprecated shape |
| `app/api/service-analytics/route.ts` | LEGACY ACTIVE — counted deprecated rows, keyed on the session uuid |
| `lib/services/matching/professional.matcher.ts` | LEGACY INACTIVE — zero importers |
| `lib/land/integration/professional-integration.ts` | LEGACY INACTIVE — zero importers |
| `drizzle.config.ts` | tooling only — schema list for `drizzle-kit generate`; no request path |

Active consumers **after** L1C-0: **none**. Both routes now reach the canonical
core; the two zero-importer modules are annotated `LEGACY INACTIVE /
OWNER-DEFERRED` and are kept in source for product archaeology (Product
Constitution: capability preservation).

### Compatibility surface

`/api/services*` remains a public compatibility surface. It owns no storage:

```
/api/services                -> lib/services/compat/services-api.ts -> lib/services/marketplace.ts
/api/services/categories     -> proxy -> /api/service-categories
/api/services/requests       -> proxy -> /api/service-requests
/api/services/reviews        -> proxy -> /api/service-reviews
/api/services/messages       -> proxy -> /api/service-messages
/api/services/orders/*       -> proxy -> /api/service-orders/*  (target route absent - pre-existing 404, no storage)
/api/services/disputes       -> proxy -> /api/service-disputes   (target route absent - pre-existing 404, no storage)
/api/services/listings*      -> lib/services/core.ts (canonical store)
/api/service-analytics       -> getUserServiceAnalytics() in lib/services/marketplace.ts
```

Deliberate contract deviations on `/api/services` (documented, not accidental):

- `GET` lists only publicly visible statuses (`published`, `receiving_offers`)
  and redacts `userId` / `latitude` / `longitude`, matching the canonical
  `/api/service-requests` behaviour. The old route leaked them.
- `POST` requires `SERVICE_REQUESTS_MANAGE_OWN` or `SERVICE_REQUESTS_MANAGE_ALL`
  (was session-only) and creates through the canonical `createRequestFull` →
  `publishRequest` lifecycle, so history, matching and audit all run.
- The legacy `governorate` scalar round-trips through the canonical
  `short_address`; `radius` has no canonical counterpart and is always `null`.

### Guards

- `tests/services-canonical-truth.test.mjs` — behavioural: one category store,
  compatibility-created requests visible on the canonical path, exactly one row
  per create, response-shape compatibility, canonical analytics counters.
- `tests/services-architecture-legacy-guard.test.mjs` — static: no active route
  imports the deprecated model, the two owner-deferred modules stay dead, and
  exactly one `/api/services` compatibility adapter exists.

### Not changed by L1C-0

No migration, no Neon mutation, no seed change, no new table, no UI redesign,
no dispute-domain expansion, and no L1C-1 taxonomy work (`node_type`, GROUP /
PROFESSION / SPECIALIZATION / SERVICE, aliases, translations) — `service_categories`
keeps its current `country_code` + `code` shape.

### Remaining Services debt (out of L1C-0 scope)

- `app/api/services/orders/*` and `app/api/services/disputes` proxy to
  `/api/service-orders/*` and `/api/service-disputes`, which do not exist
  (`/api/service-jobs/*` is the canonical job surface). These proxies 404
  today. Pre-existing; they write nothing, so they are not a second
  persistence truth.
- `drizzle.config.ts` still lists `lib/db/schemas/services-schema.ts`, so a
  future `drizzle-kit generate` would emit DDL for the deprecated colliding
  tables. Left untouched in L1C-0 (no migration work in this phase); needs an
  architecture-lead decision.
- `tests/services-api.test.mjs` "service categories support the full CRUD
  lifecycle" fails because the in-memory test adapter cannot parse
  `listCategoriesFull`'s LEFT JOIN sub-queries. Pre-existing, unchanged by
  L1C-0.
