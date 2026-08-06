# Phase 0 — Baseline Verification

Generated: 2026-08-06

Purpose: record the pre-Phase-0 verification baseline (git state, test counts,
build/type/architecture gates) so every Phase 0 commit can be diffed against it.

## Git baseline

- Branch: `refactor/architecture-foundation`
- HEAD (start of Phase 0): `ce74fb2` `refactor(nav): consolidate admin IA into a shared layout and sidebar`
- Working tree at start: clean except untracked `docs/comparison/` (26 PLAN-mode audit reports, sizes 2.0–6.0 KB).
- No tracked production files were modified during the PLAN-mode audit; `git diff --stat` was empty.

## Commands and expected baseline values

| Gate | Command | Baseline |
| --- | --- | --- |
| Build | `npm run build` | Pass |
| Unit/E2E tests | `node --import tsx --test tests/*.test.mjs` | 44 tests, all pass |
| Typecheck | `npx tsc --noEmit` | Clean (0 errors) |
| Architecture | `node scripts/check-architecture.mjs` | PASS (0 violations) |
| Module boundaries | `node scripts/check-module-boundaries.mjs` | PASS at pre-existing baseline |
| Lint | `npm run lint` | 0 errors; 2 pre-existing warnings (`typeLabels` unused, hook deps in sponsors client) — **not** attributable to Phase 0 |

## Test inventory (baseline)

The 44 baseline tests exercise auth core (password hashing, session tokens,
identity mapping, RBAC), services authz, DB helpers, and account flows. Phase 0
must keep all of them green and must not change their behavior contracts.

## Phase 0 additions (delta to be verified at completion)

- 9 new test files: `runtime-env`, `origin-guard`, `rate-limit`, `session`,
  `dev-login`, `schema-latch`, `security-headers`, `audit-log`,
  `accessibility` (86 tests total in the suite after Phase 0).
- New production modules: `lib/config/runtime-env.ts`, `lib/security/*`
  (origin, rate-limit, headers, audit, dev-login), `app/api/health/route.ts`,
  `src/components/ui/*`.

See `PHASE_0_RESULT.md` for the final gate run.
