# NAVIGATION INVENTORY

Phase 2 pre-edit inventory of every navigation implementation and link source.

## Implementations

| File | Component / source | Used by | Audience | Duplicate | Accessibility | Responsive | DS compliance | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `src/components/shared/Header.tsx` | inline `<nav>` (Home, Properties, Services, Tools) | `PublicPageShell`, `AdminPageShell` | Public + Admin | Yes | No `aria-current`; raw ar/en/tr ternaries; **`/properties` link is broken (404)** | Always-visible links, no collapse | Legacy `.main-nav` | **REPLACE** with `DesktopNavigation` from `PUBLIC_NAV` |
| `app/page.tsx` | `publicNav` anchors (`#top #properties #services #offices #about #account`) | Landing `/` | Public | Yes | Anchor nav, no `aria-current` | Sidebar hover/pin | Legacy `.sidebar-public-nav` | **DEFER** (landing not rebuilt); not used in shell |
| `src/constants/advertising.ts` | `PLATFORM_SECTIONS_REGISTRY` (section → path/label) | Ads engine (business) | — | No | n/a | n/a | n/a | **KEEP** (ads engine data; not a nav UI source; several paths point at nonexistent routes) |
| (new) `src/config/public-navigation.ts` | `PUBLIC_NAV` items `{key,labelKey,href,icon,children?,requiredFeature?,external?,badge?}` | Desktop + Mobile nav, breadcrumbs | Public | Single source | `aria-current` via `isNavPathActive` | Desktop inline / mobile sheet | Tokens only | **CREATE** |

## Real routes (verified) vs proposal
Proposed items from the directive: الرئيسية، العقارات، المزادات، سوق الخدمات، المكاتب والشركات، المجتمع والمعرفة، المزيد.

Verified real routes and the resulting 6-item main nav (≤7), never linking to nonexistent routes:

| Key | labelKey | href | Route exists |
| --- | --- | --- | --- |
| `home` | `navHome` | `/` | yes |
| `services` | `navServices` | `/services` | yes |
| `catalog` | `navCatalog` | `/services/catalog` | yes |
| `requests` | `navRequests` | `/service-requests` | yes |
| `tools` | `navTools` | `/tools` | yes |
| `apply` | `navApply` | `/providers/apply` | yes |

Deferred because the pages do not exist (no link rendered): العقارات `/properties`, المزادات `/auctions`, المكاتب والشركات `/offices`, المجتمع والمعرفة `/news`/`/blog`, بحث `/search`.

## Active state
`isNavPathActive(href, pathname)`: exact match for `/`, otherwise `pathname === href || pathname.startsWith(href + "/")`. Rendered as `aria-current="page"` via `NavItem`.

## Search
No `/search` page exists (verified). `SearchTrigger`/`HeaderSearch`/`MobileSearchEntry` are built config-driven (`SEARCH_ROUTE` in `public-navigation.ts`, default `undefined` → trigger not rendered). No new backend, no mock suggestions, no wide input.

## Admin / Workspace
No admin or workspace route appears in `PUBLIC_NAV` or `FOOTER_COLUMNS`. Public users never see admin links.
