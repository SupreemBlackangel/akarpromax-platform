# Phase 4 ESLint Warning Delta

## Baseline (precheck)

Captured before any Phase 4 acceptance change (`npm run lint` =
`eslint . --ignore-pattern dist --ignore-pattern .next`):

```
✖ 52 problems (0 errors, 52 warnings)
```

Of these, **21 warnings were located in Phase 4 files** (see
`PHASE_4_SERVICES_ACCEPTANCE_PRECHECK.md` §3): unused destructured variables
(`setLocale`, `loading`, `handleAuthenticated`) across the services pages,
missing `t` / `categories` deps, 3× `no-img-element`, and unused imports /
`locale` prop / no-op `handleOutboxEvent` in the services lib and
`ServiceCards.tsx`.

## After acceptance work

```
✖ 29 problems (0 errors, 29 warnings)
```

- **Phase 4 files: 0 warnings** (all 21 phase-relative warnings eliminated).
- The remaining 29 warnings are pre-existing legacy warnings in non-Phase-4
  files; none were introduced by this phase and none are Phase-4-located.

## Delta

| Metric | Baseline | After | Delta |
|---|---|---|---|
| Total warnings | 52 | 29 | −23 |
| Errors | 0 | 0 | 0 |
| Warnings in Phase 4 files | 21 | 0 | −21 |
| Warnings in legacy files | 31 | 29 | −2 |

The additional −2 beyond the phase-relative 21 comes from warnings inside
Phase-4-edited files that the precheck table grouped as legacy (e.g. the now
removed no-op `handleOutboxEvent`/`_payload` artifact and redundant imports
dropped during the auth refactor). Every Phase 4 file reports 0 warnings.

## Remaining 29 (all legacy, out of Phase 4 scope)

| File | Warnings | Reason |
|---|---|---|
| `app/admin/dashboard-admin-client.tsx` | 1 | unused `typeLabels` |
| `app/admin/roles/page.tsx` | 1 | unused `user` |
| `app/admin/sponsors/[id]/edit/page.tsx` | 1 | unused `user` |
| `app/admin/sponsors/[id]/page.tsx` | 1 | unused `user` |
| `app/admin/sponsors/new/page.tsx` | 1 | unused `user` |
| `app/admin/sponsors/page.tsx` | 1 | unused `user` |
| `app/admin/sponsors/requests/page.tsx` | 1 | unused `user` |
| `app/admin/sponsors/sponsor-admin-client.tsx` | 1 | exhaustive-deps |
| `app/api/admin/stats/route.ts` | 2 | unused `groupBy`, `sponsorEvents` |
| `app/api/auth/verify/route.ts` | 1 | unused `toMySqlDateTime` |
| `scripts/check-architecture.mjs` | 3 | unused `statSync`, `globSync`, `SRC_DIRS` |
| `scripts/check-module-boundaries.mjs` | 1 | unused `legacyExceptions` |
| `src/components/AdSlot.tsx` | 1 | `<img>` |
| `src/components/CountryFlag.tsx` | 1 | `<img>` |
| `src/components/FloatingAdSlotActions.tsx` | 3 | unused `slotData` |
| `src/components/LocationPicker.tsx` | 2 | exhaustive-deps |
| `src/components/SponsorIdentity.tsx` | 1 | `<img>` |
| `src/components/cad/CadExportPanel.tsx` | 1 | exhaustive-deps |
| `src/components/cad/CadPreview.tsx` | 2 | unused `setMeasure`, exhaustive-deps |
| `src/components/cad/ToolFileDropzone.tsx` | 1 | exhaustive-deps |
| `src/components/shared/Sidebar.tsx` | 1 | unused `locale` |
| `src/lib/cad/pdf-export.ts` | 1 | unused `imageObjId` |
| **Total** | **29** | |

## Verification

```bash
npm run lint                       # ✖ 29 problems (0 errors, 29 warnings)
npx tsc --noEmit                   # clean
```
