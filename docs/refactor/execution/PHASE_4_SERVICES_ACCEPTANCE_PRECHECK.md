# PHASE 4 — Services Marketplace Acceptance — Precheck

**Date:** 2026-08-06
**Scope:** Acceptance pass for the Phase 4 services marketplace (no new features).
**Gate:** Do not edit files unrelated to the services module.

---

## 1. Git state

| Item | Value |
|---|---|
| Branch | `refactor/architecture-foundation` |
| Current commit | `5df81d6 refactor(ui): complete phase 2 design system and page shells` |
| Repo root | `E:\Akarpromax new 2027\V 2.0 GPT - Copy` |
| Staged files | none |

### Working tree — modified (41 files)

- `app/admin/ads/ads-admin-client.tsx`, `app/admin/i18n/i18n-admin-client.tsx`
- `app/admin/sponsors/_components/SponsorRequestsView.tsx`, `SponsorsListView.tsx`, `sponsor-admin-client.tsx`
- `app/api/admin/ads/route.ts`, `app/api/ads/route.ts`, `app/api/sponsor-access/route.ts`
- `app/globals.css`, `app/page.tsx`, `app/properties/[id]/page.tsx`, `app/services/page.tsx`
- `lib/ad-schema.ts`, `lib/ads/admin.ts`, `lib/ads/context.ts`, `lib/ads/engine.ts`, `lib/ads/types.ts`
- `lib/auth/identity-map.ts`, `lib/auth/session.ts`, `lib/mysql-runtime.ts`, `lib/rbac/check.ts`
- `lib/runtime-db.ts`, `lib/services/constants.ts`, `lib/sponsor-auth.ts`
- `package-lock.json`, `package.json`
- `src/components/AccountDialog.tsx`, `AdRequestDialog.tsx`, `AdSlot.tsx`, `LocationChip.tsx`, `LocationPicker.tsx`
- `src/components/shared/Footer.tsx`, `Header.tsx`
- `src/components/tools/PointsToDxf.tsx`, `ToolsGate.tsx`, `ToolsPageClient.tsx`
- `src/constants/permissions.ts`, `src/constants/roles.ts`, `src/data/translations.ts`, `src/types/site.ts`

### Working tree — deleted (1 file)

- `lib/rbac/permissions.ts`

### Working tree — untracked (services module + supporting files)

- `akarpromax-pre-refactor.bundle`
- `app/admin/services/`
- `app/api/properties/`
- `app/api/service-admin/`
- `app/api/service-categories/`
- `app/api/service-jobs/`
- `app/api/service-messages/`
- `app/api/service-notifications/`
- `app/api/service-offers/`
- `app/api/service-providers/`
- `app/api/service-reports/`
- `app/api/service-requests/`
- `app/api/service-reviews/`
- `app/dashboard/`
- `app/providers/`
- `app/service-requests/`
- `app/services/catalog/`
- `docs/refactor/execution/PHASE_2_COMPLETION_SUMMARY.md`
- `docs/refactor/execution/PHASE_3_TOOLS_AND_PROPERTIES_SUMMARY.md`
- `docs/refactor/execution/PHASE_4_PRE_IMPLEMENTATION_AUDIT.md`
- `lib/properties-format.ts`, `lib/properties-schema.ts`, `lib/schema-helpers.ts`
- `lib/services-marketplace-schema.ts`
- `lib/services/marketplace.ts`, `lib/services/match-score.ts`, `lib/services/matching.ts`, `lib/services/seed-marketplace.ts`
- `scripts/seed-services-marketplace.ts`
- `src/components/cad/`, `src/components/services/`
- `src/components/tools/ToolCard.tsx`, `ToolsEmptyState.tsx`, `ToolsSkeletonLoader.tsx`
- `src/data/toolsData.ts`, `src/lib/cad/`, `src/lib/services-client.ts`
- `tests/services-marketplace.test.mjs`, `tests/services-matching.test.mjs`

---

## 2. Architecture baseline

Ran before any acceptance changes.

### `node scripts/check-architecture.mjs`

```
Total violations: 0
Total warnings: 24
Legacy exceptions: 6
Final Result: PASS
```

Warnings (all accepted / pre-existing):

| Code | Item |
|---|---|
| ARCH-007 | 4 route-group layouts not in allowed list: `app/(account)`, `app/(admin)`, `app/(public)`, `app/(workspace)` |
| ARCH-013 | Legacy MySQL usage (allowed): `lib/services/audit.ts`, `lib/services/core.ts`, `lib/services/db.ts`, `lib/services/marketplace.ts`, `lib/services/matching.ts`, `lib/sponsor-auth.ts`, `app/api/auth/verify/route.ts` |
| ARCH-025 | >400-line components: `app/admin/ads/ads-admin-client.tsx`, `app/admin/sponsors/sponsor-admin-client.tsx`, `app/api/ads/route.ts`, `app/page.tsx`, `app/service-requests/new/page.tsx`, `src/components/AccountDialog.tsx`, `lib/ads/admin.ts`, `lib/ads/engine.ts`, `lib/mysql-runtime.ts`, `lib/runtime-db.ts`, `lib/services/core.ts`, `lib/services/marketplace.ts`, `lib/services/seed-marketplace.ts` |

Legacy exceptions (6) are unchanged from before Phase 4.

### `node scripts/check-module-boundaries.mjs`

```
Violations: 164
Warnings: 10
Result: FAIL
```

This is a **pre-existing baseline** (checker introduced in commit `36f93ee`). The
violations are the ARCH-022 "internal import" flags across the app (including all
Phase 4 `app/api/service-*` files importing `@/lib/services/*` and `@/src/*`).
Acceptance target: **no phase-relative increase** (Phase 4 files must not add
violations beyond this established pattern; the count stays at 164).

---

## 3. ESLint baseline

Ran with `npm run lint` (`eslint . --ignore-pattern dist --ignore-pattern .next`):

```
✖ 52 problems (0 errors, 52 warnings)
```

Of the 52 warnings, **21 are located in Phase 4 files** (new or Phase-4-modified)
and must be reduced to 0 as part of this acceptance:

| File | Warnings |
|---|---|
| `app/services/page.tsx` | 3 (unused `setLocale`, `loading`, `handleAuthenticated`) |
| `app/providers/[id]/page.tsx` | 4 (unused `handleAuthenticated`, exhaustive-deps `t`, 2× no-img-element) |
| `app/service-requests/[id]/offer/page.tsx` | 1 (unused `handleAuthenticated`) |
| `app/service-requests/[id]/page.tsx` | 2 (unused `handleAuthenticated`, exhaustive-deps `t`) |
| `app/service-requests/new/page.tsx` | 2 (unused `handleAuthenticated`, exhaustive-deps `categories`) |
| `app/service-requests/page.tsx` | 1 (unused `handleAuthenticated`) |
| `app/services/catalog/page.tsx` | 1 (unused `handleAuthenticated`) |
| `app/services/catalog/[code]/page.tsx` | 1 (unused `handleAuthenticated`) |
| `lib/services/marketplace.ts` | 3 (unused `Db`, `db`, `payload`) |
| `lib/services/matching.ts` | 1 (unused `REQUEST_STATUS`) |
| `src/components/services/Avatar.tsx` | 1 (no-img-element) |
| `src/components/services/ServiceCards.tsx` | 1 (unused `locale` in `RatingStars`) |

The remaining 31 warnings are pre-existing legacy warnings (Header/Footer broken
encoding, Sidebar `locale`, pdf-export `imageObjId`, AdSlot/CountryFlag/SponsorIdentity
`<img>`, CAD components, sponsor pages, arch scripts, etc.).

---

## 4. Test baseline

```
npm test  → 22 passing
  - build (vinext build)                         PASS
  - tests/rendered-html.test.mjs                 PASS
  - tests/services-matching.test.mjs (13)       PASS
  - tests/services-marketplace.test.mjs (9)     PASS
npx tsc --noEmit  → clean
```

---

## 5. Acceptance entry criteria

1. Git precheck captured above (no staging, no commit yet).
2. Architecture scripts run and baselined (PASS 0/24/6 and baseline FAIL 164/10).
3. ESLint baseline captured (52 warnings, 0 errors; 21 phase-relative).
4. No changes made yet beyond read-only inspection.
