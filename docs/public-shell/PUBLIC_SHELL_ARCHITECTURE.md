# Public Shell Architecture

Generated: 2026-08-06
Status: ACCEPTED (Phase 2)

## Goal

One canonical public shell (`src/components/PublicPageShell.tsx`) that every public
page imports, backed by a single source of truth for navigation, footer, and ad
placements. The shell is token-only, RTL/LTR + Light/Dark aware, and a11y-first.

## Structure

```
src/components/PublicPageShell.tsx   ← canonical entry (props unchanged for ~20 pages)
  └─ src/components/public/public-page-shell.tsx   ← client state (mobile menu, cookie consent)
        └─ src/components/public/public-shell-layout.tsx  ← pure composition (SSR/test-safe)
              ├─ public-header.tsx        ← sticky header, brand, desktop nav, actions, hamburger
              ├─ desktop-navigation.tsx   ← PUBLIC_NAV, aria-current, hidden mobile
              ├─ mobile-navigation.tsx    ← Dialog-semantics side sheet (focus trap, Escape, scroll lock)
              ├─ search-trigger.tsx       ← rendered only when SEARCH_ROUTE is set
              ├─ NewsTicker.tsx           ← existing (kept), role="status", reduced-motion override
              ├─ ads/ad-slot-frame.tsx    ← shell-level ad composition (AdSlot + labelled region)
              ├─ office-app-promotion.tsx ← optional band (off by default)
              ├─ public-footer.tsx        ← FOOTER_COLUMNS-driven, no placeholder links
              ├─ cookie-notice.tsx        ← localStorage-gated consent banner
              └─ toast-region.tsx         ← polite live region (empty until wired)
```

## Single sources of truth

| Concern | Config | Used by |
| --- | --- | --- |
| Navigation items | `src/config/public-navigation.ts` (`PUBLIC_NAV`) | header, mobile, breadcrumbs |
| Footer columns | `src/config/footer-navigation.ts` (`FOOTER_COLUMNS`) | public-footer |
| Ad placements | `src/config/ad-placements.ts` (`AD_PLACEMENT_REGISTRY`) | public-shell-layout |

`PUBLIC_NAV` lists only verified real routes (6 items: `/`, `/services`,
`/services/catalog`, `/service-requests`, `/tools`, `/providers/apply`).
`SEARCH_ROUTE` defaults to `undefined` → no search trigger until a `/search` page
exists. `FOOTER_COLUMNS` legal column is `deferred` and hidden until legal routes
exist; social icons are omitted (no verified URLs).

## Active-route logic

`isNavPathActive(href, pathname)`: exact match for `/`, otherwise
`pathname === href || pathname.startsWith(href + "/")`. This yields a breadcrumb
trail (parent sections stay highlighted under a child page).

## Client vs pure split

- `public-shell-layout.tsx` is pure (no hooks) → unit-testable via
  `renderToStaticMarkup`. It owns no state.
- `public-page-shell.tsx` is the client wrapper: owns `mobileMenuOpen` and
  cookie-consent visibility (persisted under localStorage key
  `akarpromax-cookie-consent`).
- `PublicPageShell.tsx` (canonical entry) is a thin client wrapper that resolves
  `currentPath` from `window.location` via `useSyncExternalStore` (popstate-aware,
  hydration-safe) and delegates to the wrapper.

## Accessibility

- Skip link (`#main-content`) as the first focusable element; `main` carries
  `id="main-content" tabIndex={-1}`.
- Landmarks: `header > nav`, `main`, `footer > nav` per column, `aside` for the
  mobile sheet.
- `aria-current="page"` on active nav items; `aria-modal`, focus trap, Escape,
  scroll lock, and focus restore on the mobile sheet.
- Cookie notice is a labelled `role="status"` region; toast region is
  `aria-live="polite"`.
- Reduced-motion: `.ticker-marquee` already neutralized in `app/globals.css`.

## What did NOT change

- `shared/Header.tsx` (admin) and `shared/Footer.tsx` — kept; public shell no
  longer uses them.
- `NewsTicker.tsx` — kept; only a reduced-motion override was confirmed present.
- `AdSlot` (data/analytics) and `AdFrame` (presentation) — never merged;
  `ad-slot-frame.tsx` is the only shell-level composition point.
- No new dependencies, no new CSS file, no i18n DB changes, no business/auth/db
  logic, no ads-engine/news-schema changes.
