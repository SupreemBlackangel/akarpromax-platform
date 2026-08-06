# ADR-PHASE-2: Unified Public Shell

Generated: 2026-08-06
Updated: 2026-08-06
Status: ACCEPTED

## Context

Pre-Phase-2, public pages used a `PublicPageShell` that inlined a legacy
`shared/Header` (with a broken `/properties` link, raw locale ternaries, no
`aria-current`), a `shared/Footer` (placeholder links), and inline `AdSlot`
calls. Nav, footer, and ad placements had no single source of truth; the landing
page's `<main id="top">` broke the global SkipLink (`#main-content`).

## Decision

Introduce one canonical public shell whose entry point (`src/components/PublicPageShell.tsx`)
keeps its existing props for all current pages, with implementation moved to:

- `src/components/public/public-shell-layout.tsx` — pure, SSR/test-safe composition.
- `src/components/public/public-page-shell.tsx` — client state (mobile menu, cookie consent).
- `src/components/public/*` — header, desktop/mobile nav, search trigger, footer,
  office promotion, cookie notice, toast region.
- `src/components/ads/ad-slot-frame.tsx` — the only shell-level ad composition point.

Establish three single sources of truth under `src/config/`:

- `public-navigation.ts` — `PUBLIC_NAV` (6 real routes), `isNavPathActive`, `buildBreadcrumbs`.
- `footer-navigation.ts` — `FOOTER_COLUMNS` (quick/useful/legal; legal deferred).
- `ad-placements.ts` — canonical names → stable engine strings (`PUBLIC_TOP`,
  `PUBLIC_BOTTOM` active; the rest `used: false` reservations).

Keep `AdSlot` (data/analytics) and `AdFrame` (presentation) separate;
`ad-slot-frame.tsx` composes them at shell level.

## Consequences

- Nav/footer/ad data is config-driven; adding a route or column is a one-line change.
- `shared/Footer` is deprecated from public use (file kept); `shared/Header` stays for admin.
- The shell is token-only, RTL/LTR + Light/Dark aware, and a11y-first.
- No new dependencies, no new CSS file, no business/auth/db/ads/news changes.
- Cookie consent is localStorage-gated (`akarpromax-cookie-consent`).
- Search trigger is omitted until `SEARCH_ROUTE` is set (no `/search` page yet).
- Global SkipLink now works on `/` after the `#top`→`#main-content` retarget.

## Alternatives considered

- **Full homepage rebuild** — rejected (out of scope; `app/page.tsx` untouched except anchors).
- **Merge AdSlot + AdFrame** — rejected (mixing data/analytics with presentation).
- **New CSS file** — rejected (tokens already cover all needs).

## Related

- `docs/public-shell/PUBLIC_SHELL_ARCHITECTURE.md`
- `docs/public-shell/AD_PLACEMENT_REGISTRY.md`
- `docs/public-shell/ADS_PUBLIC_LAYOUT_POLICY.md`
- `docs/public-shell/NEWS_TICKER_DESIGN.md`
- `docs/public-shell/LEGACY_STYLE_MIGRATION.md`
- `docs/design-system/PHASE_2_PERFORMANCE_IMPACT.md`
- `docs/verification/PHASE_2_RESULT.md`
