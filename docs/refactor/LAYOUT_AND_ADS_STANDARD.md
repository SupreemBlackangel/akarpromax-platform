# LAYOUT AND ADS STANDARD

## Layout Contract
- Only four layouts are allowed:
  - `PublicLayout`
  - `AccountLayout`
  - `WorkspaceLayout`
  - `AdminLayout`
- All public pages must render inside `PublicPageShell`.
- No page may define its own one-off top-level shell after the refactor.

## PublicPageShell Mandatory Structure
1. Global Header.
2. News Bar.
3. `PUBLIC_TOP` `AdSlot`.
4. Breadcrumb.
5. Unified Page Header.
6. Main Content.
7. `PUBLIC_INLINE_1`.
8. Optional Sidebar with `PUBLIC_SIDEBAR`.
9. `PUBLIC_INLINE_2` عند الحاجة.
10. `OFFICE_APP_PROMO`.
11. `PUBLIC_BOTTOM`.
12. Global Footer.
13. Legal/Cookie layer.

## Allowed Public Ad Placements
- `HOME_HERO`
- `PUBLIC_TOP`
- `PUBLIC_INLINE_1`
- `PUBLIC_SIDEBAR`
- `PUBLIC_INLINE_2`
- `OFFICE_APP_PROMO`
- `PUBLIC_BOTTOM`

## Current-to-Target Ad Mapping
| Current Pattern | Target Standard |
| --- | --- |
| custom home hero carousel | `HOME_HERO` via centralized `AdSlot` orchestration |
| `between_sections` | `PUBLIC_INLINE_1` or `PUBLIC_INLINE_2` depending on page composition |
| `side_left` + `side_right` | single standardized `PUBLIC_SIDEBAR` region; dual rail pattern removed from shared public standard |
| `floating_bottom` | removed from base public standard unless reintroduced as controlled device behavior of `PUBLIC_BOTTOM` |
| property-specific hardcoded placements | remapped to standardized page-aware placements through centralized placement rules, not inline JSX constants |

## AdSlot Contract
- All public ad rendering must go through one component: `AdSlot`.
- Page code may pass context only, never ad assets or direct URLs.

### Required AdSlot Inputs
- `placementId`
- `pageKey`
- `country`
- `region`
- `city`
- `district`
- `latitude`
- `longitude`
- `deviceType`
- `language`

### Optional Context Inputs
- `entityType`
- `entityId`
- `categoryKey`
- `tags`
- `viewerScope`

## Forbidden Page-Level Ad Practices
- Hardcoded ad image URLs inside JSX
- Hardcoded ad click URLs inside JSX
- Route-specific inline placement naming in page code
- Custom ad wrappers per page
- Different ad ordering between public pages

## Shared Public Layout Rules

### Max Width
- One shared container max width only.
- Standard token:
  - `--container-max-width: 1280px`
- No public page may override the container width independently.

### Grid
- One responsive public content grid only:
  - Mobile: single column
  - Tablet: content-first stacked grid
  - Desktop: content column + optional sidebar column
- Recommended token model:
  - 12-column desktop grid
  - shared sidebar span, not page-specific custom spans

### Spacing Tokens
- One token scale only:
  - `--space-1: 4px`
  - `--space-2: 8px`
  - `--space-3: 12px`
  - `--space-4: 16px`
  - `--space-5: 24px`
  - `--space-6: 32px`
  - `--space-7: 48px`
  - `--space-8: 64px`
- All section and shell spacing must use shared tokens.

### Typography
- One public typography scale only.
- Heading hierarchy must be consistent across all public pages.
- No route may introduce a unique font sizing system.

### Card Styles
- One shared card system only:
  - border radius
  - border treatment
  - shadow treatment
  - spacing rhythm
  - media ratio rules
- Cards must be variants of the same design system, not independent page inventions.

### Loading / Empty / Error States
- One shared state system only:
  - `LoadingState`
  - `EmptyState`
  - `ErrorState`
- No page-specific ad hoc loading copy or standalone error shells.

## Header / Footer / Breadcrumb / Page Header Rules
- `Global Header` is rendered by `PublicLayout`, not by individual pages.
- `Global Footer` is rendered by `PublicLayout`, not by individual pages.
- `Breadcrumb` is rendered by `PublicPageShell`, not by individual pages.
- `Unified Page Header` is rendered by `PublicPageShell`, with route-specific props only.
- No page may render a local header/footer/breadcrumb/page-title shell after the refactor.

## Office App Promo Rule
- `OFFICE_APP_PROMO` is a shared shell region, not a custom section embedded in specific pages.
- Pages may only declare whether the promo is shown, not define its structure or content independently.

## RTL / LTR Support
- `PublicPageShell` must own direction-aware spacing, alignment, breadcrumb ordering, sidebar placement, and icon mirroring behavior.
- No page should manually re-implement RTL/LTR shell behavior.

## Mobile First Rule
- Public pages are composed mobile-first.
- Sidebar content collapses below the main content on smaller breakpoints.
- No public page may introduce desktop-only shell assumptions.

## Non-Negotiable Rule
- There is no custom layout for a single public page.
