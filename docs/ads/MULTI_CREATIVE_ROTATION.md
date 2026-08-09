# Multi-Creative Rotation

Commercial campaigns may carry multiple creatives. Rotation is deterministic,
even, and capped so that a large campaign does not crowd out small ones.

## Rules

- A commercial campaign is limited to **5 creatives**. Creatives that have no
  media URL are ignored.
- Each campaign gets **one turn per round** — a 5-creative campaign does not
  receive five times the exposure of a 1-creative campaign.
- Within a turn, `selectCreative` (`lib/ads/engine.ts`) picks the next creative
  by the campaign's impression count so far:

  ```ts
  index = (campaignImpressions) % creatives.length
  ```

  `campaignImpressions` = campaign `total_impressions` + today's impressions in
  `ad_daily_statistics`. Each recorded impression advances the counter, so
  consecutive turns round-robin through the creatives.
- `position` (1-based) and `duration_seconds` (min 3, default 6) come from the
  creative row; `durationSeconds` drives the client rotation pause length.

## Data model

`ad_creatives`:

- `id`, `campaign_id`, `media_type`, `media_url`, `mobile_media_url`,
  `tablet_media_url`, `poster_url`, `position`, `duration_seconds`, `status`,
  `created_at`
- Only `status = 'active'` creatives are served, ordered by `position`.

## Per-creative analytics

Every impression and click row stores `creative_id` (`ad_impressions`,
`ad_clicks`), so delivery and performance can be attributed per creative (see
`AD_ANALYTICS_MODEL.md`).

## Client contract

`src/components/AdSlot.tsx` renders each matched ad for `MIN_VISUAL_SECONDS`
(5 seconds, or the creative's `durationSeconds` when greater), pausing rotation
on hover, hidden tab, or `prefers-reduced-motion`. See
`VALID_IMPRESSION_POLICY.md`.
