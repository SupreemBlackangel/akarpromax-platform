# Ad Analytics Model

Analytics distinguish commercial inventory from house/fallback inventory, break
down delivery by placement and channel, and expose per-creative attribution.

## Event tables

- `ad_impressions` — one row per valid impression with `campaign_id`,
  `placement`, `section`, `page_type`, geo (`country_code`, `region_id`,
  `city_id`, `district_id`), `locale`, `device`, `session_id`, `user_id`,
  `creative_id`, `channel`, `inventory_class` (`commercial` | `house`),
  `tracked_at`.
- `ad_clicks` — same context plus `target_url` and `clicked_at`.
- `ad_conversions` — conversion events keyed by campaign.
- `ad_daily_statistics` — per campaign + day aggregates (impressions, unique,
  clicks, unique, conversions, `spent_amount`); used for frequency/budget caps
  and trend series.

## House is not commercial

`inventory_class` is written from the served campaign's `is_fallback` flag
(`house`) or its absence (`commercial`). House impressions are never added to a
commercial advertiser's totals:

- `split` (`/api/admin/ads/stats`) sums `commercial` vs `house` separately.
- `computeInventoryHealth` counts commercial impressions and house impressions
  independently and reports `commercialFillRate = commercial / (commercial + house)`.

## Stats endpoint (`/api/admin/ads/stats`)

Admin-gated (`ads.analytics`). Returns:

- `campaigns` — per-campaign totals (impressions, unique, clicks, unique clicks,
  conversions, spend, budget).
- `daily` — `ad_daily_statistics` series for the current month.
- `placements` — impression counts grouped by `placement`, `channel`,
  `inventory_class`.
- `split` — `{ commercial, house }` totals.
- `inventory` — one entry per registered or observed placement with:

  | Field | Meaning |
  | ----- | ------- |
  | `status` | `HEALTHY` / `PARTIALLY_FILLED` / `NO_COMMERCIAL_INVENTORY` |
  | `eligibleCommercial` | eligible commercial campaigns for that placement + channel |
  | `fallbackActive` | whether house turns are being served |
  | `fallbackTurns` | number of house turns needed (`max(0, threshold − eligible)`) |
  | `commercialImpressions` / `houseImpressions` | split deliveries |
  | `commercialFillRate` | 0..1 share of commercial impressions |

  Inventory health is evaluated per **placement and channel**: office
  placements are scored against office-eligible campaigns (the context channel
  is derived from the placement's section), so an office placement never shows
  the website's inventory health.

- `today` — the current `stat_date`.

## Completion behavior

Campaign lifecycle state is represented by real, supported statuses:

- `expired` — campaign period elapsed (`TIME_EXPIRED`).
- `paused` — manual pause.
- `archived` — administrative end (plus `deleted_at` for soft delete).
- Delivery stops (though status may remain `active`) once `max_impressions`,
  `max_clicks`, or `budget`/`daily_budget` are exhausted (`IMPRESSION_LIMIT`,
  `CLICK_LIMIT`, `BUDGET_EXHAUSTED`), enforced by `isBudgetEligible`.

The Admin UI only shows statuses and limits that are actually supported.
