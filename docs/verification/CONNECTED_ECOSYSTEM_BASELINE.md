# Connected Ecosystem — Platform Baseline

Status: **COMMITTED** · Branch: `refactor/architecture-foundation`
Generated: 2026-08-07

## Final commit

`b101b05` — `fix(arch): make radar self-contained and satisfy architecture checks`
(the last code commit of this stabilization; the baseline documentation commit
introduces this file).

Previous baseline: `5064183` (docs(phase3): migration matrix, result, and ADR
for feature-page adoption).

## Commits created (this stabilization)

1. `ef195ee` feat(auth): complete secure registration and onboarding flows
2. `6d47103` feat(services): complete services marketplace experience
3. `291dc5b` refactor(services): centralize navigation and state-machine flows
4. `e371e73` feat(office): add connected office device pairing and authentication
5. `7ddf6e4` feat(sync): add idempotent property synchronization and conflict handling
6. `81b3e4d` feat(radar): add unified geo radar integration
7. `1ce63dc` feat(notifications): add centralized notification and realtime delivery
8. `1398ce8` feat(office): add news, ads, and office workspace integration
9. `6770a83` feat(admin): add connected ecosystem monitoring
10. `62338c5` test(platform): add services and connected ecosystem coverage
11. `2e96178` docs(platform): document services and connected ecosystem architecture
12. `b101b05` fix(arch): make radar self-contained and satisfy architecture checks
13. `HEAD` docs(platform): add connected ecosystem baseline (this file)

## Feature status

### Auth Phase 4 — COMPLETE

- Secure register/login/me/logout with account status lifecycle
  (`pending_verification` → active), block reasons, `lastLoginAt`.
- Email verification (token), OTP verification, password reset, change email,
  change password, onboarding completion — all rate-limited and audit-logged.
- Persistent audit log (`audit_events`), hashed verification challenges
  (`verification_challenges`), PG migration `drizzle-pg/0002_auth_phase4.sql`.
- Email via `lib/email.ts` (console transport default, SMTP/nodemailer optional,
  externalized in the build).
- Cookie session is the only identity source; ChatGPT header identity removed.

### Services Marketplace — COMPLETE

- Services API routes rewritten to the shared services domain layer
  (`app/api/services/*`, `app/api/service-dashboard/counts`).
- New dashboard pages: disputes, favorites, notifications, supervisor;
  services categories page; service request wizard (8-step) with draft restore.
- Centralized navigation (`src/config/sidebar.ts` + `ServiceDashboardShell`),
  request state-machine (`lib/services/state-machine.ts`).

### Connected Ecosystem — COMPLETE

- Office device pairing + scoped device credentials + rotation + heartbeat +
  revocation (`lib/integration/{pairing,device,office-auth,crypto,constants}.ts`,
  `/api/office/v1/*`).
- Idempotent property sync with conflict resolution and dead-letter
  (`lib/integration/sync.ts`).
- Unified geo radar (Haversine, self-contained) with scan history
  (`lib/integration/radar.ts`).
- Notifications (dedup, quiet hours, defer-not-lost) + DB-backed realtime SSE
  (`lib/integration/notifications.ts`, `lib/integration/realtime.ts`).
- News + ads delivery for office desktop (`lib/integration/news.ts`, `ads.ts`).
- Office workspace UI (`/dashboard/office/*`) and admin monitoring
  (`/admin/integration`, `/api/admin/integration-overview`).
- Integration schema (`lib/integration/schema.ts`) wired into
  `ensureSponsorSchema` with demo notification-rule seeding.

## Quality gate

| Check | Result |
| --- | --- |
| Tests | **160/160 PASS** |
| Lint | **0 errors** (58 pre-existing warnings) |
| Typecheck (`tsc --noEmit`) | **PASS** |
| Build (`npm run build`) | **PASS** |
| Architecture (`scripts/check-architecture.mjs`) | **PASS** (warnings only) |
| Boundaries (`scripts/check-module-boundaries.mjs`) | **PASS** (warnings only) |

## Lint fixes preserved

- `src/components/services/ServiceDashboardShell.tsx` — hooks hoisted above the
  auth early-return (conditional hook ordering fixed).
- `app/services/categories/page.tsx` — `setState`-in-effect replaced with
  `useMemo` derived state.
- `app/service-requests/new/page.tsx` — effect-based draft restore replaced
  with a lazy `useState` initializer.

## Known limitations

1. **Vinext Windows asset bug** — the one-line
   `path.relative(...).split(path.sep).join("/")` patch in
   `node_modules/vinext/dist/server/static-file-cache.js` is lost on
   `npm install`; re-apply if CSS/JS 404 under `vinext start`.
2. **`vinext dev` breaks on MySQL/drizzle** — `EvalError` on codegen; MySQL-backed
   E2E must use `vinext start`.
3. **D1 routes only under `vinext dev`** — under `vinext start` the D1 binding is
   absent; data routes degrade to MySQL.
4. **Session cookie under `vinext start`** — `cookies()` does not read the
   incoming Cookie header over HTTP, so `/api/auth/me` reports
   `authenticated: false`; the account wizard builds the viewer from local state.
5. **PG cannot load under `vinext start`** (`ERR_UNSUPPORTED_ESM_URL_SCHEME`,
   Workers-targeted bundle) — auth E2E stays on `vinext dev`; `vinext start`
   remains MySQL-backed.
6. Realtime is DB+SSE (WebSocket reserved); quiet hours use server-local time;
   radar is Haversine at km precision capped at 100 km (PostGIS reserved);
   `sponsorSchemaReady` is a module singleton (schema init failure falls back to
   MySQL until restart).

Full detail: `docs/integrations/LIMITATIONS.md`, `AGENTS.md`.

## Deployment requirements

- **Dev**: `vinext dev` (D1 + PG for auth). Requires `.env` with `DATABASE_URL`
  (Postgres/Neon) and `MYSQL_URL` (separate from `DATABASE_URL`).
- **Start**: `npm run build && npm run start` (MySQL-backed content; auth 500
  under start — see limitation 5).
- Optional SMTP via `nodemailer` (externalized; not a declared dependency).
- No new dependencies were added for the connected ecosystem.
