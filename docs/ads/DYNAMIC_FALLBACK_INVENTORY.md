# Dynamic Fallback / House Ad Inventory

When a placement does not have enough eligible commercial campaigns, the
engine fills the remaining slots with **house** fallback campaigns so the ad
slot is never empty. House inventory is tracked separately from commercial.

## House campaign model

A house campaign is an `ad_campaigns` row with `is_fallback = 1`:

- `is_global = 1` marks a placement-agnostic house creative (global fill).
- `placements` may restrict a house creative to specific placements.
- `priority` orders house candidates.
- House campaigns may target either or both channels (`website`, `office`).

## Threshold (default 3)

`minimumCommercialInventory` defaults to `3` (per request; the placement health
model uses the same value). Fill logic in `matchAds`:

| Eligible commercial campaigns | House turns |
| ----------------------------- | ----------- |
| 3+ (>= threshold)             | 0           |
| 2                             | 1           |
| 1                             | 2           |
| 0                             | house-only  |

Counting uses **eligible** commercial campaigns only — a campaign that is
active but fails geo/channel/section/limits for the current request does not
count toward the threshold.

## House candidate selection (`selectHouseCandidates`)

Ordered deterministically:

1. Placement-specific house creatives first, then global.
2. Within the same class, `is_global` before non-global.
3. Lower `priority` value wins.

House turns rotate evenly through the ordered candidates using the cumulative
impression count (same round-robin idea as commercial creatives).

## Why fallback exists

- Guarantees every registered placement can render an ad.
- Keeps commercial reporting clean: house impressions are never added to
  commercial advertiser totals (`AD_ANALYTICS_MODEL.md`).

## Inventory health

`computeInventoryHealth` (`lib/ads/engine.ts`) derives `HEALTHY` /
`PARTIALLY_FILLED` / `NO_COMMERCIAL_INVENTORY` from the same threshold logic so
analytics and serving always agree (see `AD_ANALYTICS_MODEL.md`).
