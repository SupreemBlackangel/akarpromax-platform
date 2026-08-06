# Phase 4A — Commit Scope Review

**Commit (planned):** `feat(services): complete provider dashboard and runtime wiring`
**Parent:** `55e6872`
**Date:** 2026-08-06

## Command

```bash
git status --porcelain   # classified below, per PHASE_4_DIRTY_WORKTREE_INVENTORY.md
```

## File count

69 tracked modified services files + 1 rename (2 entries) + 3 config/structural
files + 2 runtime-bridge files + 1 new barrel + 1 test file + 10 provider
dashboard pages + 4 new docs = **89 files**.

## Classification

### 1. ARCH-022 alias rewrite — tracked modified services files (69)

`app/api/service-admin/route.ts`, `app/api/service-categories/{route,[id]/route}.ts`,
`app/api/service-jobs/{route,[id]/route,[id]/review/route,[id]/status/route,[id]/timeline/route}.ts`,
`app/api/service-messages/{route,threads/route,threads/[threadType]/[threadId]/route}.ts`,
`app/api/service-notifications/{route,read-all/route,[id]/read/route}.ts`,
`app/api/service-offers/{route,[id]/route,[id]/accept/route,[id]/decline/route,[id]/revise/route,[id]/withdraw/route}.ts`,
`app/api/service-providers/{route,me/route,me/matched-requests/route,[id]/route,[id]/apply/route,[id]/categories/route,[id]/documents/route,[id]/portfolio/route,[id]/status/route}.ts`,
`app/api/service-reports/{route,[id]/resolve/route}.ts`,
`app/api/service-requests/{route,[id]/route,[id]/attachments/route,[id]/cancel/route,[id]/history/route,[id]/matches/[providerId]/route,[id]/matching/route,[id]/publish/route}.ts`,
`app/api/service-reviews/route.ts`,
`app/api/services/{categories,disputes,listings,listings/[id],messages,orders/[id],orders/[id]/review,requests,requests/[id],requests/[id]/offers,reviews}/route.ts`,
`app/providers/{[id]/page,apply/page}.tsx`,
`app/service-requests/{page,new/page,[id]/page,[id]/offer/page}.tsx`,
`app/services/{page,catalog/page,catalog/[code]/page}.tsx`,
`lib/services/{audit,core,marketplace,matching,seed-marketplace}.ts`,
`src/components/services/{ServiceCards,ServiceDashboardShell,ServiceStatusBadges,ThreadMessages}.tsx`

Diffs are import-only (verified on a sample: `app/services/page.tsx`,
`app/service-requests/page.tsx`, `src/components/services/ServiceCards.tsx`,
`lib/services/core.ts`, `app/providers/apply/page.tsx`,
`tests/services-marketplace.test.mjs` — 14 insertions / 14 deletions total).

### 2. Structural / config (3)

| Path | Change |
|---|---|
| `tsconfig.json` | Adds `@services/*`, `@services-ui/*`, `@services-client` paths beside `@/*` |
| `architecture-exceptions.json` | Removes `ARCH-LEGACY-020` (`app/api/services`) and `ARCH-LEGACY-023` (`lib/services`) — no longer needed after the rewrite |
| `lib/services/index.ts` | New public barrel (`constants`, `core`, `matching`) |

Note: `marketplace.ts` is deliberately NOT re-exported from the barrel
(`core` + `marketplace` both export `ActorContext` / `threadMessages`; `tsc`
would error). It remains alias-importable directly via `@services/marketplace`.

### 3. Admin rename (2 entries)

`app/admin/services/services-admin-client.tsx` → `app/admin/services/admin-client.tsx`
(`git mv`), plus `app/admin/services/page.tsx` import update.

### 4. Runtime bridge wiring (2)

`lib/runtime-db.ts`, `lib/mysql-runtime.ts` — each adds only:
`import { ensureServicesMarketplaceSchema } from "@/lib/services-marketplace-schema";`,
`import { seedServicesMarketplace } from "@services/seed-marketplace";`,
`await ensureServicesMarketplaceSchema(db);`, `await seedServicesMarketplace(db);`.
Phase-3 `ensurePropertiesSchema` import/call and the `domains` DDL line are
excluded (see `PHASE_4A_RUNTIME_WIRING_AUDIT.md`).

### 5. Provider dashboard (10 untracked pages)

`app/dashboard/services/{page,inbox/messages,jobs,jobs/[id],matched-requests,
my-requests,offers,offers/[id],provider-profile,reviews}.tsx`

All follow the established gating pattern: `if (!viewer.authenticated) return;`
effect guard + `ServiceDashboardShell` (which itself gates anonymous viewers) +
`ProviderStatusPill` rendering + `NEXT_STATUSES` job transitions (incl.
`disputed`). Provider state coverage (draft/submitted/under_review/approved/
rejected/suspended) lives in `src/lib/services-client.ts`
(`providerStatusLabel` / `providerStatusColor`).

### 6. Tests (1)

`tests/services-marketplace.test.mjs` — admin path updated to
`admin-client.tsx`; new dashboard state/authz assertions (see test additions).

### 7. Documentation (4)

`PHASE_4A_PRECHECK.md`, `PHASE_4A_SCOPE.md`, `PHASE_4A_RUNTIME_WIRING_AUDIT.md`,
`PHASE_4A_CLEAN_COMMIT_VERIFICATION.md`.

## Excluded (must stay unstaged)

Phase 2 (globals/page/Header/Footer/translations/site/AccountDialog), Phase 3
tools/cad/properties/ads-domains, role-label admin batches, `sponsor-access`,
`akarpromax-pre-refactor.bundle`, Phase 2/3 summary docs — per the precheck
exclusion rule. None of these contains `@services` alias imports (verified by
grep over `app/admin/{ads,i18n,sponsors}`, `lib/ads`, `app/api/ads`,
`src/components/{tools,cad,shared}`, `app/page.tsx`).

## Criterion

**Unrelated files = 0 → PASS** (if the commit is staged exactly to this list).
