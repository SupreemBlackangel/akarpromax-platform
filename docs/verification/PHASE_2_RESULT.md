# Phase 2 Result — Unified Public Shell & Global Public Experience

Generated: 2026-08-06
Branch: `refactor/architecture-foundation`
Baseline commit: `43e88c3`

## Final commits (7, baseline → head)

1. `e657e62` docs(public-shell): add phase 2 baseline and component inventory
2. `4f67458` feat(i18n): add phase 2 public shell translation keys for ar/en/tr
3. `5ba775f` feat(config): add unified public nav, footer, and ad placement registries
4. `37be33e` feat(ads): add shell-level ad placement composition frame
5. `3caac4e` feat(public-shell): build unified public shell with client state wrapper and pure layout
6. `1d50e95` fix(landing): retarget #top anchors to #main-content so the global skip link works on /
7. `644a6e8` test(public-shell): cover landmarks, nav, footer, ads, and optional shell features

## Worktree status

Clean except untracked `docs/comparison/` (Phase 0 PLAN-mode reports, intentionally
uncommitted) and the Phase 2 result docs themselves.

## Production files modified

- `src/components/PublicPageShell.tsx` — thin canonical entry, delegates to `src/components/public/public-page-shell.tsx`; props unchanged.
- `src/components/ui/Breadcrumbs.tsx` — added optional `ariaLabel` prop (backwards-compatible).
- `src/components/Brand.tsx` — `href="#top"` → `#main-content`.
- `src/data/translations.ts` — added 20 Phase-2 keys (incl. `skipToContent`) to ar/en/tr.
- `src/types/site.ts` — extended `Translation` with 20 keys + `TranslationStringKey` helper.
- `app/page.tsx` — `id="top"`→`id="main-content"`; all `#top` anchors→`#main-content`.
- `package.json` — added `tests/public-shell.test.mjs` to the `test` script (9 files).

## Files created

- `src/config/public-navigation.ts`, `footer-navigation.ts`, `ad-placements.ts`
- `src/components/ads/ad-slot-frame.tsx`
- `src/components/public/` (`public-page-shell`, `public-shell-layout`, `public-header`,
  `desktop-navigation`, `mobile-navigation`, `search-trigger`, `public-footer`,
  `office-app-promotion`, `cookie-notice`, `toast-region`)
- `tests/public-shell.test.mjs`
- `docs/public-shell/` (`PUBLIC_SHELL_ARCHITECTURE`, `NEWS_TICKER_DESIGN`,
  `AD_PLACEMENT_REGISTRY`, `ADS_PUBLIC_LAYOUT_POLICY`, `LEGACY_STYLE_MIGRATION`)
- `docs/design-system/PHASE_2_PERFORMANCE_IMPACT.md`
- `docs/decisions/ADR-PHASE-2-PUBLIC-SHELL.md`

## Files deprecated (kept)

- `src/components/shared/Footer.tsx` — no longer used by the public shell (file kept for reference).

## Files removed

- none.

## Dependencies added / removed

- none.

## Delivered components (one line each)

- `PublicShellLayout` — pure SSR-safe composition (landmarks, skip link, header, ticker,
  main, ads, office promo, footer, cookie notice, toast region).
- `PublicPageShell` (client wrapper) — owns mobile-menu + cookie-consent state.
- `PublicHeader` — sticky header, brand→`/`, unified nav, account actions, hamburger.
- `DesktopNavigation` — `PUBLIC_NAV` horizontal nav with `aria-current`, hidden mobile.
- `MobileNavigation` — Dialog-semantics side sheet (focus trap, Escape, scroll lock,
  route-change close, focus restore, RTL inline-start).
- `SearchTrigger` — rendered only when `SEARCH_ROUTE` is set.
- `PublicFooter` — `FOOTER_COLUMNS`-driven; only real routes, no placeholder links.
- `OfficeAppPromotion` — optional band, off by default.
- `CookieNotice` — localStorage-gated consent banner (Accept/Reject/Manage).
- `ToastRegion` — polite live region (empty until wired).
- `AdSlotFrame` — shell-level ad composition (config→`AdSlot` in labelled region).
- Configs: `public-navigation`, `footer-navigation`, `ad-placements`.

## Routes migrated / deferred

- Nav = 6 real routes: `/`, `/services`, `/services/catalog`, `/service-requests`,
  `/tools`, `/providers/apply` (≤7 cap).
- Deferred (no page exists): العقارات، المزادات، المكاتب والشركات، المجتمع والمعرفة، بحث.

## Duplicate removals

- Header nav consolidated into `PUBLIC_NAV` (was inline in `shared/Header` with a broken
  `/properties` link and raw locale ternaries).
- Footer consolidated into `FOOTER_COLUMNS` (was `shared/Footer` with placeholder links).

## Verification

| Pillar | Result |
| --- | --- |
| RTL/LTR | logical properties (`inset-inline-start`, `border-e`); `dir` per locale |
| Light/Dark | token-only (no hardcoded colors) |
| Mobile | responsive header + side-sheet mobile nav; top ad eager, bottom lazy |
| Accessibility | skip link→`#main-content`, landmarks, `aria-current`, focus trap, reduced-motion |
| Performance | no new deps/CSS; build clean; new files ≤400 lines |
| Security | no secrets/logins; cookie consent persisted under localStorage |

## Test / gate counts

- `npx tsc --noEmit`: clean.
- `npm run lint`: 0 errors (23 pre-existing legacy warnings).
- `npm run test` (9 script files incl. public-shell): 100/100 pass.
- Full test universe (all 18 test files run together): 185/185 pass, 0 failures.
- `check-architecture.mjs`: PASS. `check-module-boundaries.mjs`: PASS.

## What did NOT change

- Business logic: NO.
- Auth backend: NO.
- Database: NO.
- Ads targeting: NO.
- News schema: NO.

## Known limitations

- Visual screenshot verification: NOT COMPLETED (no browser-test infra in target).
- `shared/Header` (admin) and `shared/Footer` files kept; public shell no longer uses them.
- Cookie consent `Manage` records the choice but surfaces no granular picker yet.
- Toast region is empty until a consumer wires it.

## Rollback instructions

`git reset --hard 43e88c3` returns to the Phase 1 head (pre-Phase-2).

## Phase 3 readiness

Public shell foundation is in place; Phase 3 can adopt the new primitives across
feature pages (services, catalog, requests, tools, property detail) and backfill the
legacy hardcoded hex in `app/globals.css`/`app/page.tsx` with tokens.

## Recommended Phase 3 scope

- Migrate feature pages onto `PageContainer`/`Section`/`Grid`/`Stack` and ui controls.
- Backfill legacy hex → tokens in `globals.css`; delete superseded classes once grepped clean.
- Wire the toast region and a granular cookie picker.
- Add the deferred nav items once their pages exist.

## No-copy / no-unrequested-work confirmations

- No code copied from the read-only reference app.
- No Phase 3 work started.
