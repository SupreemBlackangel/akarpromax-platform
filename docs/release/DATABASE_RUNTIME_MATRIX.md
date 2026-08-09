# Database Runtime Matrix

Explicit source-of-truth for every major module: which database it uses in
development, staging, and production, and which schema/migration system owns it.

**Headline:** the production architecture is **PostgreSQL only** (ADR
`docs/runtime/RUNTIME_TARGET_DECISION.md`). D1/SQLite is a **development-only**
shim; MySQL is a **legacy opt-in** (never for staging/production). **Find My
Land is in-memory (ephemeral)** — no database at all.

```text
runtime database   = what the running code reads/writes under that mode
development db     = vinext dev (D1 content shim + real PG for auth)
staging db         = production-like: PG for everything (content + identity)
production target  = PostgreSQL (Neon)
migration source   = schema/migration artifact that owns the tables
```

## Matrix

| MODULE | RUNTIME DATABASE | DEVELOPMENT | STAGING | PRODUCTION TARGET | MIGRATION SOURCE |
|---|---|---|---|---|---|
| Auth (users, sessions/JWT, login/register/me) | PostgreSQL | PostgreSQL (`DATABASE_URL`) | PostgreSQL | PostgreSQL | `lib/db/pg-identity-schema.ts` (`ensurePgIdentitySchema`, version 1) + `drizzle-pg/*` reference |
| Verification (challenges, OTP, tokens) | PostgreSQL | PostgreSQL | PostgreSQL | PostgreSQL | `lib/db/pg-identity-schema.ts` (`verification_challenges`) + `lib/db/verification.ts` |
| Audit events | PostgreSQL | PostgreSQL | PostgreSQL | PostgreSQL | `lib/db/pg-identity-schema.ts` (`audit_events`) + `lib/security/audit.ts:90` |
| AMRS (organizations, members, branches) | PostgreSQL | PostgreSQL | PostgreSQL | PostgreSQL | `lib/db/pg-identity-schema.ts` + `lib/amrs/organization.ts`, `directory.ts`, `admin.ts` |
| Verification records / reputation (RISING/GOLD/PROMAX) | PostgreSQL | PostgreSQL | PostgreSQL | PostgreSQL | `lib/db/pg-identity-schema.ts` (`verification_records`, `reputation_*`) + `lib/amrs/verification.ts`, `reputation.ts` |
| Properties | Content runtime DB | D1 (`env.DB`, `.wrangler/state/v3`) | PostgreSQL (`PgRuntimeDb`) | PostgreSQL | `lib/content-schema.ts` `ensureContentSchema` (latch `ak_content_schema_meta`) |
| Services / Marketplace | Content runtime DB | D1 | PostgreSQL | PostgreSQL | `lib/content-schema.ts` + `lib/services/db.ts`, `ensureServicesSchema` |
| News (incl. ticker, RSS sources) | Content runtime DB | D1 | PostgreSQL | PostgreSQL | `lib/content-schema.ts` + `lib/news/*`, `lib/integration/news.ts` |
| Ads (campaigns, creatives, placements, impressions/clicks) | Content runtime DB | D1 | PostgreSQL | PostgreSQL | `lib/content-schema.ts` + `lib/ad-schema.ts` `ensureAdSchema` (`ad_*` tables, `tablet_media_url`, tracking columns) |
| Sponsors + sponsor assets metadata | Content runtime DB | D1 | PostgreSQL | PostgreSQL | `lib/content-schema.ts` (`sponsor*` tables) |
| i18n / translations | Content runtime DB | D1 | PostgreSQL | PostgreSQL | `lib/content-schema.ts` + `lib/i18n/db.ts` |
| Office integration (pairing, devices, sync, realtime events, notifications) | Content runtime DB | D1 | PostgreSQL | PostgreSQL | `lib/content-schema.ts` (`office_linking`, `office_realtime_events`, `integration_*`) + `lib/integration/*` |
| Command center / admin analytics | Content runtime DB | D1 | PostgreSQL | PostgreSQL | `lib/content-schema.ts` + `lib/command-center/service.ts:134` |
| Find My Land (saved lands, resolve results) | **In-memory only** | in-memory Maps | in-memory Maps | in-memory (documented ephemeral) | NONE — `lib/land/saved-land.ts:3` (`Map`), `lib/land/resolve-store.ts:9` (`Map`, 60-min TTL). Lost on restart; privacy-by-design, no DB, no public exposure |

## Runtime selection (no silent fallback)

`lib/runtime-db.ts` picks the schema mode **deterministically** from
`DB_PROVIDER` (`decideSchemaMode`, `runtime-db.ts:16-30`):

- `postgres` → `PgRuntimeDb` (D1-compatible adapter over `postgres` driver;
  `translateSql` + placeholder expansion; content schema ensured on first use).
- `d1` → `env.DB` (dev only; throws `SchemaModeError` when the binding is
  absent — NO silent fallback).
- `mysql` → legacy opt-in (`MYSQL_URL`); **not** accepted for production
  (`runtime-env.ts:113-115`).

## Staging rules

1. **`DB_PROVIDER=postgres`** on staging — never `d1`, never `mysql`.
2. Content tables are created by `ensureContentSchema` + `ensureAdSchema` +
   area `ensure*Schema` (idempotent DDL, latch-gated, production skips once the
   `ak_content_schema_meta` latch exists).
3. Identity tables are created by `ensurePgIdentitySchema` (version 1,
   `ak_identity_schema_meta`).
4. Do **not** silently run D1/SQLite on staging — the production architecture is
   PostgreSQL (this is the explicit, documented architecture).
5. Find My Land state is ephemeral by design — do not treat it as durable; no
   user-facing promise of persistence (see `STAGING_STORAGE_PLAN.md` /
   `STAGING_UAT_PLAN.md`).
