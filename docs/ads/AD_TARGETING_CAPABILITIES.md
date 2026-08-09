# Ad Targeting Capabilities

Targeting is real and enforced by the engine's eligibility pipeline
(`scoreAd` in `lib/ads/engine.ts`). A campaign only serves when every targeting
constraint passes for the resolved request context.

## Supported targeting fields

- **Channel** — `channels`: `website`, `office` (see `WEBSITE_OFFICE_CHANNELS.md`).
- **Geo** — `countries`, `regions` (`region_ids`), `cities`, `districts`
  (`district_ids`), each with an explicit `target_all_*` flag that disables the
  constraint. Latitude/longitude + `radius_km` proximity matching is also
  supported.
- **Language** — `languages`: `ar`, `en`, `tr`.
- **Device** — `devices`: `desktop`, `mobile` (tablet matches either).
- **Section / page type / placement** — `section_scopes`, `page_types`,
  `placements`; campaigns may only target registered placements.
- **Domains** — `domains` allow-list for the website surface.
- **Entity & category** — `entity_type` / `entity_ids` (e.g. specific office or
  professional), `category_ids`, plus section-specific `property_types`,
  `service_categories`, `office_types`, `tool_categories`.
- **Operating systems** — `operating_systems`.
- **Time windows** — `start_at` / `end_at` (campaign validity),
  `days_of_week`, `daily_start_time` / `daily_end_time`.

## Campaign limits (enforced in delivery)

- `max_impressions`, `max_clicks`
- `budget` / `daily_budget` (spend tracked in `ad_daily_statistics`)
- `frequency_cap_per_user` per `frequency_cap_period` (day)

`isBudgetEligible` (`lib/ads/engine.ts`) stops delivery once any limit is
reached, including per-session frequency derived from the resolved
session/user id.

## Not supported (intentionally absent from Admin)

The following are **not** exposed in the Admin UI because the engine does not
support them:

- audience segments / arbitrary `audiences`
- `maxPerSession` as a standalone campaign field
- any targeting option that has no real matching code

The Admin payload contract (`lib/ads/admin.ts`) cleans unknown targeting keys,
so an unsupported option cannot be silently stored and served.
