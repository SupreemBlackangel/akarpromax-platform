# Ad Placement Registry

Generated: 2026-08-06
Status: ACCEPTED (Phase 2)

## Canonical names → stable engine strings

`src/config/ad-placements.ts` maps Phase-2 canonical placement names to the
STABLE engine placement strings in `src/constants/advertising.ts::AD_PLACEMENTS`,
so ad targeting/analytics data is unchanged.

| Canonical key | Engine string | Variant | Lazy | Used | Purpose |
| --- | --- | --- | --- | --- | --- |
| `PUBLIC_TOP` | `global_header` | horizontal | no (eager) | yes | top of public pages |
| `PUBLIC_BOTTOM` | `global_footer` | horizontal | yes (lazy) | yes | bottom of public pages |
| `HOME_HERO` | — | horizontal | no | no | reserved for landing hero |
| `PUBLIC_INLINE_1` | `between_sections` | horizontal | yes | no | reserved |
| `PUBLIC_INLINE_2` | `between_sections` | horizontal | yes | no | reserved |
| `PUBLIC_SIDEBAR` | `listing_sidebar` | vertical | yes | no | reserved |

Only `used: true` entries are rendered by the shell today. The rest are
documented reservations; flipping `used` to `true` activates them without code
changes.

## Composition, not merge

`src/components/ads/ad-slot-frame.tsx` is the only shell-level ad composition
point. It resolves a registry config and renders `AdSlot` inside a labelled
`<section>`. `AdSlot` (data/business/analytics) and `AdFrame` (presentational
primitive) are intentionally NOT merged.

## Page-owned placements

`services_hub_mid`, `property_*`, and the landing's `side_left`/`side_right`/
`between_sections`/`floating_bottom` placements stay page-owned — the shell does
not centralize them.
