# ADS LAYOUT INVENTORY

Phase 2 pre-edit inventory of public ad layout usage.

## Current ad slots (public)

| File / route | Placement string (engine) | Variant | Wrapper | Audience | DS compliance | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| `src/components/PublicPageShell.tsx` (all shell pages) | `global_header` (top of `<main>`) | horizontal | `.ad-slot` (legacy) | Public | Legacy `.ad-slot` CSS | **KEEP placement string**; render via `AdSlotFrame` (`PUBLIC_TOP`) |
| `src/components/PublicPageShell.tsx` | `global_footer` (bottom of `<main>`) | horizontal | `.ad-slot` | Public | Legacy | **KEEP placement string**; render via `AdSlotFrame` (`PUBLIC_BOTTOM`) |
| `app/services/page.tsx` | `services_hub_mid` | horizontal | `.ad-slot` | Public | Legacy | **KEEP** (page-level placement; documented in registry as page-owned) |
| `app/page.tsx` (landing) | `side_left`, `side_right` (desktop) | vertical | `.side-rail-ad` | Public | Legacy | **DEFER** (landing not rebuilt) |
| `app/page.tsx` (landing) | `between_sections` | horizontal | `.ad-slot-container-vertical` | Public | Legacy | **DEFER** (landing); registry maps future `PUBLIC_INLINE_1` → `between_sections` |
| `app/page.tsx` (landing) | `floating_bottom` (mobile) | floating | `.ad-slot` | Public | Legacy | **DEFER** (landing) |
| `app/properties/[id]/page.tsx` | `property_*` placements (7 slots) | mixed | `.ad-slot` | Public | Legacy | **KEEP** (page-owned; engine registry already defines them) |

## Component split (non-negotiable)
- `AdSlot` (`src/components/AdSlot.tsx`) = data/business/analytics component (match + impression + click). NEVER merged with the UI primitive.
- `AdFrame` (`src/components/ui/AdFrame.tsx`) = presentational frame (Phase 1). Not used to fetch ads.
- `AdSlotFrame` (`src/components/ads/ad-slot-frame.tsx`) = shell-level composition point: resolves a placement from `src/config/ad-placements.ts` and renders `AdSlot` inside a token-based labelled region. When no ad matches, `AdSlot` returns `null` (as today) → no empty frame, no layout shift.
- Central registry `src/config/ad-placements.ts` maps canonical Phase 2 names to the STABLE engine placement strings so ad targeting data is unchanged.

## Phase 2 registry (see AD_PLACEMENT_REGISTRY.md)
Active (used by the shell): `PUBLIC_TOP` → `global_header`, `PUBLIC_BOTTOM` → `global_footer`.
Deferred (`used:false`, documented, not rendered): `HOME_HERO`, `PUBLIC_INLINE_1` → `between_sections`, `PUBLIC_INLINE_2`, `PUBLIC_SIDEBAR` → `listing_sidebar`.

## Policy invariants
- No hardcoded ad image/click URLs in shell code (delegated to `AdSlot`).
- Safe external targets: `AdSlot` already emits `rel="sponsored noopener"` and `target="_blank"` only for non-`/` URLs.
- Placeholder/skeleton/error: `AdSlot` skeleton while loading, `null` when empty, requestable state when configured — reused unchanged.
- Lazy loading per position: top ad eager, bottom ad lazy (registry `lazy` flag → `eager` prop).
