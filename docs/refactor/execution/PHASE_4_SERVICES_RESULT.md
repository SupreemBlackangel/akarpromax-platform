# Phase 4 — Services Marketplace Result

## Scope

Complete the services marketplace acceptance: session-only authorization for
the services module, deterministic authorization/API/notification tests,
database-access seam, and the required documentation. Builds on the architecture
foundation (module boundaries, layered architecture, ESLint baseline).

## Changes

### Authorization (session-only, no ChatGPT identity)
- `lib/sponsor-auth.ts`: `GUEST_IDENTITY`, `getSessionIdentity()`,
  `setSessionIdentityResolverForTests()`. The cookie session is the primary
  identity; the legacy `x-openai` header / `admin@localhost` auto-admin bypass
  is removed from the services paths.
- 36 API routes across `app/api/service-*/**` now gate on `getSessionIdentity`
  + `hasSponsorPermission`, including 401 gates added to `service-categories`
  POST/PATCH/DELETE and `service-providers/[id]/status` PATCH.
- `app/admin/services/page.tsx` rewritten with a session+permission server gate.
- Zero references to `getSponsorIdentity` / `requireChatGPTUser` /
  `getChatGPTUser` in `lib/services/*` and `app/api/service-*/**` (verified by
  test + grep scan).
- `lib/services/constants.ts`: new `CATEGORY_HAS_CHILDREN`, `CATEGORY_IN_USE`.

### Services admin + database seam
- `lib/services/db.ts`: `getServicesDb()` (production → `getRuntimeDb()`, tests
  → `setServicesDbForTesting` override) and a fixed `insertRow` (now stores and
  returns the caller-provided UUID instead of a random unrelated id, fixing
  category/notify/report lookups).
- `getAdminOverview()` in `lib/services/marketplace.ts` (9 counts);
  `app/api/service-admin/route.ts` rewritten to 401-gate + permission any-of +
  the overview.
- Category delete (`deleteServiceCategory`) with not-found / has-children /
  in-use guards; DELETE handler in `app/api/service-categories/[id]/route.ts`.
- Audit events via `audit_logs` on provider status changes.

### Tests (41 passing, 0 failing via `npm test`)
- `tests/helpers/in-memory-db.mjs`: D1-compatible in-memory adapter.
- `tests/services-api.test.mjs` (7): overview counts, provider approve/reject +
  notify + audit, categories CRUD + guards, reports, notifications.
- `tests/services-authz.test.mjs` (10): 401/403 gates, permission model, role
  matrix.
- `tests/services-marketplace.test.mjs` (9, updated): session-only identity
  scan + admin-gate assertions.
- `tests/services-matching.test.mjs` (13): matching/scoring/lifecycle.
- `tests/services-e2e.mjs`: env-gated integration smoke (self-skips without
  `SERVICES_E2E=1`).
- `package.json` test script extended to register the new files.

### Docs
- `docs/security/SERVICES_ADMIN_AUTHORIZATION.md` — identity model, enforcement
  layers, per-route matrix, audit entries.
- `docs/audit/SERVICES_DATABASE_DEPENDENCY_AUDIT.md` — seam, module dependency
  table, "not used" scan, phase delta 0.
- `docs/refactor/execution/PHASE_4_ESLINT_WARNING_DELTA.md` — 52 → 29 warnings,
  21 phase-relative → 0.
- `docs/testing/SERVICES_TEST_COVERAGE.md` — files, scope, run instructions.

## Verification gates

| Gate | Baseline | After | Result |
|---|---|---|---|
| `npm run lint` | 52 warnings / 0 errors | 29 warnings / 0 errors | PASS (0 phase-relative) |
| `npx tsc --noEmit` | clean | clean | PASS |
| `npm test` | 22 passing | **41 passing / 0 failing** (build gate included) | PASS |
| `check-architecture.mjs` | Final PASS | Final PASS (0 violations / 24 warnings / 6 legacy) | PASS |
| `check-module-boundaries.mjs` | 164 violations / 10 warnings | 164 violations / 10 warnings (unchanged) | baseline FAIL, no delta |
| DB/legacy deps in `lib/services/*` | — | 0 (no postgres/neon/drizzle/mysql2/cloudflare/`@/lib/db`) | PASS |
| Legacy identity in services module | — | 0 references | PASS |

## Known limitations (unchanged, see AGENTS.md)

- `vinext start` cannot load PG (`cloudflare:` sockets); auth E2E runs on
  `vinext dev`, data E2E on MySQL-backed start.
- Dev-mode `cookies()` caveats documented in AGENTS.md; the wizard builds the
  viewer from local state.
- `check-module-boundaries.mjs` remains a baseline FAIL (164 legacy violations);
  this phase adds none.
