# PUBLIC SHELL INVENTORY

Phase 2 pre-edit inventory of the current public page-shell implementations in the target repo.

## Current implementations

| File | Component | Used by | Audience | Duplicate | Accessibility | Responsive behavior | DS compliance | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `src/components/PublicPageShell.tsx` | `PublicPageShell` (client) | `/services*`, `/service-requests*`, `/providers/*`, `/properties/[id]`, `/tools`, `/dashboard/services/*` | Public | Yes — the only public shell, but its header/footer/ticker/ads are inlined | Partial: `<main id="main-content">`, skip-link target exists; header nav has no `aria-current`; no mobile nav | Nav always visible (no mobile collapse in shared header); ad slots use legacy `.ad-slot` CSS | Legacy classes + hardcoded copy in header/footer | **REBUILD** → canonical shell (`src/components/public/public-page-shell.tsx` + pure `public-shell-layout.tsx`) keeping the exact props API |
| `app/page.tsx` landing chrome | custom `.reference-header` / `.right-sidebar` / `.reference-footer` | `/` only | Public | Yes — second header/footer/nav/ticker implementation | Landing `<main id="top">` breaks global SkipLink (`#main-content` missing) | Custom sidebar hover/pin; responsive | Legacy `.reference-*` CSS | **DEFER** (no full homepage rebuild); only add `id="main-content"` to `<main>` |
| `src/components/shared/Header.tsx` | `Header` | PublicPageShell + `AdminPageShell` | Public + Admin | Yes — legacy header | No `aria-current`; raw locale strings; links to nonexistent `/properties` | No mobile menu | Legacy `.shared-header` | **DEPRECATE** for public; KEEP for `AdminPageShell` |
| `src/components/shared/Footer.tsx` | `Footer` | PublicPageShell | Public | Yes — legacy footer | Raw locale strings; no landmarks | Grid stacks | Legacy `.shared-footer` | **DEPRECATE** (replaced by `PublicFooter`); file kept |
| `src/components/NewsTicker.tsx` | `NewsTicker` (client) | PublicPageShell + landing | Public | No (single impl) | `role="status"` (aria-live polite), pause button, label | Marquee scroll, pause on hover | Legacy `.news-ticker` gradient | **KEEP** + reduced-motion override + documented aria decision |

## Target shell structure (canonical)
```
PublicPageShell (client entry — state: mobile menu, cookie consent)
└── PublicShellLayout (pure, server-safe)
    ├── PublicHeader (brand / DesktopNavigation / SearchTrigger? / user actions / mobile trigger)
    │   └── MobileNavigation (side sheet; focus trap, escape, route-close, scroll lock, account actions)
    ├── NewsTicker
    ├── main#main-content
    │   ├── PUBLIC_TOP AdSlotFrame (global_header)
    │   ├── Breadcrumbs (route-aware, opt-in pageHeader)
    │   ├── children (page content, unchanged)
    │   └── PUBLIC_BOTTOM AdSlotFrame (global_footer)
    ├── OfficeAppPromotion (shell-controlled)
    ├── PublicFooter
    ├── ToastRegion
    └── CookieNotice
```

## Decisions
- **REBUILD** the shell around `src/components/public/*`; keep `src/components/PublicPageShell.tsx` as the canonical import path (20 consumers unchanged).
- **DEFER** landing-page shell migration (no full homepage rebuild); only skip-link target fixed.
- **DEPRECATE** `shared/Footer` (unused after refactor, kept); `shared/Header` kept for admin.
- Single navigation source (`src/config/public-navigation.ts`), single footer source (`src/config/footer-navigation.ts`), single ad placement registry (`src/config/ad-placements.ts`).
