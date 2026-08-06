# Phase 2 Baseline

Captured before any Phase 2 modification on `refactor/architecture-foundation`.

## Repo state
- Branch: `refactor/architecture-foundation`
- Baseline commit: `43e88c3 docs(verification): add phase 1 gate results and deliverables`
- Worktree: clean except untracked `docs/comparison/` (Phase 0 PLAN-mode reports, intentionally uncommitted).
- `git diff` / `git diff --name-only`: empty.

## Phase gates entering Phase 2
- Phase 0: committed, 130/130 tests.
- Phase 1: 10 commits (`0a2ad0e`→`43e88c3`), `npm test` = 84/84 (8 explicit files), remaining 11-file suite = 126/126, `npm run lint` clean on new dirs, `npx tsc --noEmit` clean, `npm run build` pass (tokens emitted into built CSS), architecture PASS (0 violations; pre-existing ARCH-025 >400-line warnings), boundaries PASS (0 violations, 10 pre-existing missing-index warnings).

## Current public experience (pre-Phase-2)
- Root layout (`app/layout.tsx`): `SkipLink` → `#main-content`, theme boot script, metadata. `(public)/layout.tsx`: empty passthrough.
- `src/components/PublicPageShell.tsx` (client): the only public shell. Used by `/services`, `/services/catalog`, `/services/catalog/[code]`, `/service-requests`, `/service-requests/new`, `/service-requests/[id]`, `/service-requests/[id]/offer`, `/providers/apply`, `/providers/[id]`, `/properties/[id]`, `/tools`, `/dashboard/services/*`.
  - Renders `shared/Header` (nav: `/`, `/properties` [BROKEN, no route], `/services`, `/tools`; login/logout), `NewsTicker`, `<main id="main-content">` + `AdSlot global_header` + children + `AdSlot global_footer`, `shared/Footer`.
- Landing `/` (`app/page.tsx`): custom `.reference-header` / `.right-sidebar` / `.reference-footer`, anchor `publicNav` (`#top #properties #services #offices #about #account`), hero carousel, ticker, sponsor ribbon, `AdSlot` side rails + `between_sections` + `floating_bottom` (mobile). Landing `<main id="top">` has no `id="main-content"` so the global SkipLink is broken on `/`.
- Shared components: `shared/Header.tsx` (used by shell + `AdminPageShell`), `shared/Footer.tsx` (shell only).
- News: `src/components/NewsTicker.tsx` (client; fetch `/api/news?country&city` → fallback `copy.ticker`; pause control; `role="status"`). No marquee element.
- Ads: `src/components/AdSlot.tsx` (client feature; `/api/ads/match` + impression/click; skeleton/empty/requestable; badge). `src/components/ui/AdFrame.tsx` (presentational frame). Engine placement registry `src/constants/advertising.ts::AD_PLACEMENTS`.
- i18n: static typed `src/data/translations.ts` (`Record<Locale, Translation>`) + dynamic `/api/i18n/:locale` flat keys (`t()` in `useServicesPage`).

## Verified route inventory (real pages)
`/`, `/services`, `/services/catalog`, `/services/catalog/[code]`, `/service-requests`, `/service-requests/new`, `/service-requests/[id]`, `/service-requests/[id]/offer`, `/providers/apply`, `/providers/[id]`, `/properties/[id]`, `/tools`, `/dashboard/services/*`, `/dev/design-system` (dev-only), `/admin/*` (out of scope).

Nonexistent (must NOT be linked): `/properties`, `/offices`, `/providers`, `/about`, `/contact`, `/news`, `/search`, `/auctions`, `/blog`.

## Excluded from Phase 2
- `app/admin/*`, `app/(admin)/*`, `app/(account)/*` (no pages), `app/(workspace)/*`, `app/dashboard/*` chrome (kept; only their `PublicPageShell` usage is affected).
- `docs/comparison/` untracked reports.
- `node_modules/vinext` patch (pre-existing, documented in AGENTS.md).
- Legacy CSS in `app/globals.css` — only a reduced-motion ticker override is added.

## Rollback point
`git reset --hard 43e88c3` (worktree otherwise clean). Each Phase 2 unit is committed separately so any unit can be reverted individually.
