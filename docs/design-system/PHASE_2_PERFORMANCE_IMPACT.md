# Phase 2 Performance Impact

## Approach: additive shell, no legacy page rebuild

Phase 2 ships a new unified public shell plus config/registry files. Existing
pages keep their props (`locale, copy, viewer, country, city, deviceType?,
onLogin, onLogout, children` unchanged); optional props (`breadcrumbs`,
`pageHeader`, `officePromotion`, `cookieNotice`, `currentPath`) default off.
Legacy pages render exactly as before until they opt into the new shell.

## CSS

- No new CSS file. All shell components consume the existing `tokens.css`
  custom properties (inherited once per element; only re-resolve on theme
  change).
- The `.ticker-marquee` reduced-motion override already existed in
  `app/globals.css` — no addition.

## JS bundle

- New shell components are only imported by `PublicPageShell.tsx` and its
  descendants. Pages that do not use the shell are unaffected.
- `lucide-react` icons are named/tree-shaken (existing dependency).
- No new dependencies.

## Runtime behavior

- `mobile-navigation.tsx` mounts only when the menu is open; closed by default.
- Cookie consent reads `localStorage` once on mount (effect), then persists a
  single string.
- `currentPath` resolves via `useSyncExternalStore` (popstate) — no polling.
- Ad frames reuse the existing `AdSlot` fetch/tracking pipeline; no duplicate
  network calls.

## SSR / RSC

- `public-shell-layout.tsx` is pure (no hooks) and SSR-safe.
- `PublicPageShell.tsx` uses `useSyncExternalStore` with an empty server
  snapshot, so hydration is deterministic.

## Measurements

- `vinext build` completes successfully.
- `npm test` (9 files incl. `public-shell.test.mjs`): 100/100 pass.
- Remaining test suite: 86/86 pass.
- `check-architecture.mjs` / `check-module-boundaries.mjs`: PASS (warnings all
  pre-existing legacy).
- New files are all ≤400 lines (ARCH-025 clean).
