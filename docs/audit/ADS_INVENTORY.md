# Ads Inventory

## Components and Ad Infrastructure
- `src/components/AdSlot.tsx`
  - Core dynamic ad renderer.
  - Fetches `/api/ads/match`.
  - Tracks impressions via `/api/ads/impression`.
  - Tracks clicks via `/api/ads/click`.
  - Supports `horizontal`, `vertical`, `floating`, and `popup` variants.
  - Supports requestable empty slots via `FloatingAdSlotActions`.
- `src/components/FloatingAdSlotActions.tsx`
  - Empty-slot CTA/actions wrapper for requestable placements.
- `src/components/AdRequestDialog.tsx`
  - Public advertiser request dialog posting to `/api/ads/request`.
- `src/components/SponsorIdentity.tsx`
  - Sponsor identity display block used on the home sponsor ribbon.
- `app/page.tsx`
  - Custom hero ad carousel using `/api/ads` and `/api/ad-events`.
  - Sponsor ribbon using `/api/sponsors` and `/api/sponsor-events`.
- `src/constants/advertising.ts`
  - Central placement registry with 47 placement definitions.

## Placement Registry Snapshot

### General placements
- `global_header`
- `below_header`
- `global_footer`
- `between_sections`
- `floating_bottom`
- `floating_side`
- `mobile_sticky`
- `popup`

### Home placements
- `side_left`
- `side_right`

### Property placements
- `property_details_top`
- `property_after_gallery`
- `property_below_price`
- `property_after_description`
- `property_before_features`
- `property_after_features`
- `property_before_map`
- `property_after_map`
- `property_sidebar_top`
- `property_sidebar_middle`
- `property_sidebar_bottom`
- `property_before_similar`
- `property_after_similar`

### Listing placements
- `listing_top`
- `listing_after_filters`
- `listing_between_items`
- `listing_sidebar`
- `listing_bottom`

### Service placements
- `service_details_top`
- `service_after_description`
- `service_sidebar`

### Office placements
- `office_profile_top`
- `office_profile_sidebar`
- `office_after_properties`

### Tool placements
- `tool_details_top`
- `tool_after_gallery`
- `tool_after_description`
- `tool_sidebar`

## Current User-Page Ad Usage
| Route | Ad System | Current Order | Notes |
| --- | --- | --- | --- |
| `/` | Mixed custom + `AdSlot` | `side_left` -> `side_right` -> custom hero carousel -> sponsor ribbon -> `between_sections` -> `floating_bottom` (mobile only) | Uses both `AdSlot` and a custom hero system; not a single standardized shell. |
| `/properties/[id]` | `AdSlot` only | `property_after_gallery` -> `property_below_price` -> `property_after_description` -> `property_before_similar` + sidebar `top/middle/bottom` | Dense property-specific pattern; no shared global public header/footer ad slots. |
| `/services` | None | No ad placements | Ad registry supports services placements, but page uses none of them. |
| `/tools` | None | No ad placements | Ad registry supports tools placements, but page uses none of them. |

## Ad Pattern Comparison
- Unique user-page ad patterns found: 3
  - Home mixed pattern
  - Property detail pattern
  - No-ad pattern (`/services`, `/tools`)
- Shared public ad shell: none
- Shared public ad ordering contract: none

## Pages Not Using a Unified Ad Pattern
- `/`
  - Uses a custom hero ad system plus `AdSlot`, which makes it the only page with hybrid ad orchestration.
- `/properties/[id]`
  - Uses a route-specific property ad stack unrelated to the home pattern.
- `/services`
  - Uses no ads despite an existing services placement registry.
- `/tools`
  - Uses no ads despite an existing engineering-tools placement registry.

## Additional Findings
- `src/constants/advertising.ts` contains many future-facing placement definitions for routes that do not exist yet (`/offices`, `/auctions`, `/news`, `/engineering-tools`, etc.).
- `/properties/[id]` passes a hardcoded ad `path="/properties/15"` into every `AdSlot`, so all dynamic property pages currently share one ad targeting path.
- `AdSlot` and `AdRequestDialog` are reusable, but the public site still lacks a single layout-level ad contract.

## Decision Notes
- The ad platform itself should be kept.
- The page-level ad composition must be rebuilt into one public shell before any route expansion.
