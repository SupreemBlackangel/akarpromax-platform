# Runtime Target Decision — Production Hardening (Phase 5)

Status: **Proposed** · Date: 2026-08-07 · Owner: Platform Engineering

Supersedes the runtime matrix documented in AGENTS.md and
`docs/integrations/DATABASE_TARGET_DECISION.md`. Answers the seven runtime
questions and commits the codebase to a **single database provider
(PostgreSQL)** with **no silent fallback** in any environment.

## The seven runtime questions

| # | Question | Current state | Decision |
| --- | --- | --- | --- |
| 1 | **Web** (who serves the frontend bundle?) | `vinext start` serves static assets + RSC from a Node process; `vinext dev` serves via Vite/Workers. Static CSS/JS 404 on Windows until the manual `node_modules` patch is applied. | Node.js process under `vinext start` for production; `vinext dev` for local. Asset fix must be reproducible (see `VINEXT_RUNTIME_PATCHES.md`) — a postinstall/patch-package script, not a hand edit. |
| 2 | **API** (where do route handlers run?) | Route handlers run in the same bundle as the web layer (Vite Workers in dev, Node in start). `lib/db` (PG) cannot load under `vinext start` because `postgres-js` inlines `cloudflare:sockets`. | Production API runs on Node via `vinext start` **once PG loads** (phase objective). Until then, PG is dev-only and MySQL is the start-time content backend — **selected explicitly**, never silently. |
| 3 | **DB** (single source of truth for data?) | Three paths: D1 (`cloudflare:workers` `env.DB`) in dev; MySQL via `lib/mysql-runtime.ts` `translateSql` under start; PG (`lib/db`) for auth only. Schema mode auto-selected with an opt-in MySQL fallback. | **PostgreSQL is the platform database.** D1 remains the local dev/testing runtime for content tables; MySQL remains the explicit, operator-approved start-time backend. A new `DB_PROVIDER` env (or equivalent) makes the choice fail-fast. No environment may silently switch providers. |
| 4 | **Realtime** (how do office devices get live events?) | SSE over HTTP from `app/api/office/v1/stream/route.ts`, backed by a DB event log with `Last-Event-ID` replay. | Same. SSE must be hardened (per-connection keep-alive, timeout, error path) and replay must stay idempotent across restarts. Multi-instance deployment must not rely on in-memory state (event log is the source of truth; in-memory revocation set is per-instance). |
| 5 | **Jobs** (background work: sync, notifications, seeding) | No scheduler. Sync is pull-based (office device polls `/api/office/v1/sync`). Seeding runs inline during schema init. | Pull-based sync stays. Add a documented boundary: no background timers in the request bundle; scheduled work (if added later) belongs in a separate worker/process, not inside `vinext start`. |
| 6 | **Email** (notification delivery) | `nodemailer` is imported and **externalized** in the build (`vite.config.ts`), but not declared in `package.json` — the import is present only for type-level use. | Declare `nodemailer` explicitly or remove the unresolved import; production email delivery stays out of the request bundle (no SMTP in route handlers). |
| 7 | **Desktop integration** (office app ↔ platform) | Device tokens (Bearer, scoped) authenticate `/api/office/v1/*`; pairing codes with rate limits; sync statuses with dead-letter. | Same identity model. No change to the token flow; production persistence of session cookies for the web account wizard is the Phase 5 auth gap to close. |

## Decisions

1. **PostgreSQL is the platform's production database.** All new production
   data access is PG via `lib/db` (`drizzle-orm/postgres-js`). D1 is a local
   dev/test runtime. MySQL is an explicitly-selected start-time content backend,
   never an implicit fallback.
2. **No silent fallback.** `lib/runtime-db.ts::selectSchemaMode()` currently
   chooses D1 → MySQL and can fail over silently. This must become deterministic:
   one operator-chosen provider per environment, validated at boot, failing fast
   (no `SchemaModeError` swallowed, no `sponsorSchemaReady` singleton that
   latches a failed attempt and poisons all later calls).
3. **Production runtime is Node (`vinext start`).** Workers remains the dev
   runtime. PG-under-start is the top fix (see
   `POSTGRES_RUNTIME_COMPATIBILITY.md`).
4. **Seeding is not a runtime task in production.** Demo seeds
   (`seedNews`, `seedSponsorPlans`, `seedIntegrationDemo`, `seedServicesMarketplace`,
   `seedLocalAdminAccess`/`admin@localhost.*`) must be gated behind
   `NODE_ENV !== "production"` (or a `SEED_DEMO_DATA` flag). Production boot may
   run migrations/schema only, never demo rows, and never a local admin.

## Consequences

- `lib/runtime-db.ts`, `lib/mysql-runtime.ts`, and `lib/config/runtime-env.ts`
  are the three files that encode today's dual-provider behavior; they are the
  primary refactor targets.
- Environment variable classification (REQUIRED_PRODUCTION / OPTIONAL /
  DEV_ONLY / TEST_ONLY / DEPRECATED) is documented in
  `docs/deployment/ENVIRONMENT_MATRIX.md`.
- The one-line `node_modules/vinext/dist/server/static-file-cache.js` fix is
  moved into a script so it survives `npm install`.

## Rejected options

- Keep D1 as a production backend: Workers-only, conflicts with the Node runtime
  decision, and leaves no path to PostGIS (radar) at scale.
- Keep MySQL as primary: works under start but has no D1 path for E2E testing,
  making dev/test diverge from production (same rationale as
  `docs/integrations/DATABASE_TARGET_DECISION.md` Option B).
