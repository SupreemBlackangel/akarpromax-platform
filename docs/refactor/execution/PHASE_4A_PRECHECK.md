# Phase 4A — Precheck

**Date:** 2026-08-06
**Branch:** `refactor/architecture-foundation` (HEAD `55e6872`)
**Scope:** Corrective services commit — ARCH-022 boundary compliance, provider
dashboard completion, and runtime schema wiring.
**Auditor:** opencode

---

## 1. Why this commit exists

Commit `55e6872` completed the marketplace backend/admin/notifications but left
three documented gaps (see `PHASE_4_DIRTY_WORKTREE_INVENTORY.md`):

1. **ARCH-022 boundary violations** — `scripts/check-module-boundaries.mjs`
   flags any import specifier containing `/internal/`, `/repository/`, or
   `/service` that does not end in an allowed file. The services module
   (`lib/services/*`) was imported as `@/lib/services/...` (contains
   `/service`), producing violations. The fix is a pure alias rewrite
   (`@services/*`, `@services-ui/*`, `@services-client`) — no code logic
   changes.
2. **Provider dashboard omitted** — `app/dashboard/services/**` (10 pages) was
   never committed (scope gap in `55e6872`).
3. **Runtime wiring deferred** — `lib/runtime-db.ts` / `lib/mysql-runtime.ts`
   never call `ensureServicesMarketplaceSchema` / `seedServicesMarketplace`.

## 2. Verification that ARCH-022 is a substring rule (confirmed)

The rule in `scripts/check-module-boundaries.mjs` matches import specifiers
substring-wise. Adding a public `index.ts` barrel does NOT reduce violations
(barrels are not whitelisted for the substring rule). Therefore the only
correct fix is renaming the import path so no specifier contains `/service`.
This was confirmed by inspecting `node_modules/vinext/dist/index.js`
(`materializeTsconfigPathAliases` / `resolveTsconfigAliases`):

- All `tsconfig.json` `paths` are merged into `resolve.alias` +
  `nextConfig.aliases`.
- Alias keys resolve in longest-first order, so `@services/*` /
  `@services-ui/*` / `@services-client` always beat the `@/*` catch-all.

## 3. Boundary baseline (pre-fix)

`node scripts/check-module-boundaries.mjs` before the rewrite reported ARCH-022
violations across the services imports. After the rewrite:

```
Violations: 0, Warnings: 10 (pre-existing public-export WARNs only), Result: PASS
```

## 4. Gates verified on the dirty tree

| Gate | Command | Result |
|---|---|---|
| Unit tests | `npm test` | 41/41 pass |
| Typecheck | `npx tsc --noEmit` | clean |
| Lint | `npm run lint` | 29 warnings / 0 errors (matches dirty-tree baseline; 0 new) |
| Build | `npm run build` (via `npm test` harness) | pass |
| Architecture | `node scripts/check-architecture.mjs` | Final PASS (pre-existing ARCH-025 line-length warnings only) |
| Boundaries | `node scripts/check-module-boundaries.mjs` | 0 violations, PASS |

## 5. Exclusion rule

The Phase 4A commit must contain **services-domain files only**. The following
dirty files are explicitly EXCLUDED and must remain unstaged:

- Phase 2: `app/globals.css`, `app/page.tsx`, `src/components/shared/{Header,Footer}.tsx`,
  `src/data/translations.ts`, `src/types/site.ts`, `src/components/AccountDialog.tsx`
- Phase 3 tools: `src/components/tools/*`, `src/components/cad/**`, `src/lib/cad/**`,
  `src/components/{LocationChip,LocationPicker}.tsx`
- Phase 3 properties: `app/properties/[id]/page.tsx`, `app/api/properties/**`,
  `lib/properties-{schema,format}.ts`
- Phase 3 ads `domains`: `app/api/{admin/}ads/*`, `lib/ad-schema.ts`, `lib/ads/*`,
  `src/components/{AdSlot,AdRequestDialog}.tsx`
- Role/wiring labels: `app/admin/{ads,i18n,sponsors}/*`, `app/api/sponsor-access/route.ts`
- Backup artifact: `akarpromax-pre-refactor.bundle`
- Phase 2/3 docs: `PHASE_2_COMPLETION_SUMMARY.md`, `PHASE_3_TOOLS_AND_PROPERTIES_SUMMARY.md`

## 6. Outcome

If all gates pass on the dirty tree AND on a clean temporary worktree of the
resulting commit, the commit is complete. See `PHASE_4A_SCOPE.md` for the exact
file list.
