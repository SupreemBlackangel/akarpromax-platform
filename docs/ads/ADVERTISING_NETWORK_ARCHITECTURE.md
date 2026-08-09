# Advertising Network Architecture

One central advertising network serves both the public Website and the
authenticated AkarProMax Office desktop application. There is no separate ad
stack per surface.

## Runtime & data

- Content tables (`ad_campaigns`, `ad_creatives`, `ad_impressions`, `ad_clicks`,
  `ad_conversions`, `ad_daily_statistics`) live in the shared content runtime DB
  (D1 under `vinext dev`, PostgreSQL/MySQL adapters elsewhere) resolved through
  `getRuntimeDb()` (`lib/runtime-db.ts`).
- Schema is owned by `lib/content-schema.ts` (`ad_campaigns`, `ad_creatives`)
  plus `lib/ad-schema.ts` (`ad_impressions`, `ad_clicks`, `ad_conversions`,
  `ad_daily_statistics`, and the `ALTER TABLE` migrations for new columns).
  `ensureContentSchema` + `ensureAdSchema` run on boot and are idempotent.

## Serving pipeline

`lib/ads/engine.ts` `matchAds(db, ctx, options)`:

1. `loadActiveAds` selects only `status = 'active'`, `approval_status = 'approved'`,
   `is_active = 1`, not soft-deleted, within `start_at`/`end_at`, and attaches
   creatives via `loadCreatives` (active creatives only, ordered by position).
2. `scoreAd` filters/ranks each campaign against the resolved context
   (channel, section, placement, geo, device, language, time, budget/limits,
   entity/category). Returns `null` when not eligible.
3. Commercial candidates are banded by score and picked weighted; each campaign
   contributes exactly one turn per round.
4. When eligible commercial count is below the placement threshold, house
   fallback turns fill the remaining slots (see `DYNAMIC_FALLBACK_INVENTORY.md`).
5. `selectCreative` picks the next creative for each chosen campaign.
6. A signed tracking token is attached to every match result (`signTrackingToken`
   in `lib/ads/events.ts`) carrying campaign, placement, section, page type,
   creative, channel and inventory class (`commercial` | `house`).

## Routes

- `app/api/ads/match` — website POST matcher (client `AdSlot`).
- `app/api/ads/request` — requestable slot fallback.
- `app/api/ads/impression`, `app/api/ads/click`, `app/api/ads/conversion` —
  event endpoints that verify the tracking token before recording.
- `app/api/admin/ads` — campaign CRUD + approval.
- `app/api/admin/ads/stats` — analytics (see `AD_ANALYTICS_MODEL.md`).
- `app/api/office/v1/ads` — authenticated Office channel endpoint (see
  `WEBSITE_OFFICE_CHANNELS.md`).

## Admin

`lib/ads/admin.ts` + `app/admin/ads/ads-admin-client.tsx` expose only
capabilities the engine really supports (see `AD_TARGETING_CAPABILITIES.md`).
