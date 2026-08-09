# Website + AkarProMax Office Channels

The advertising network serves two first-class channels: the public **Website**
(`website`) and the authenticated **AkarProMax Office** desktop app (`office`).

## Channel model

- Every campaign declares `channels` (`["website"]` by default; may include
  `office`). The engine's `isChannelMatch` requires the campaign's channel list
  to include the request channel. A `website`-only campaign can never serve on
  Office and vice versa.
- Office placements are registered in the `office` section of the placement
  registry (see `AD_PLACEMENT_REGISTRY.md`).

## Website surface

- `src/components/AdSlot.tsx` + `ad-slot-frame.tsx` request matches from
  `POST /api/ads/match` with channel `website`, then report valid impressions
  and clicks through `/api/ads/impression` and `/api/ads/click`.

## Office surface

`app/api/office/v1/ads`:

- **Auth**: `Bearer` device token verified through `authenticateOfficeRequest`
  (`lib/integration/office-auth.ts`); requires an active device with the
  `office.ads.read` scope. Protocol version is checked on every request.
- **GET**: builds a context with `channel: "office"` and the device id as the
  session, then runs the same central `matchAds` engine. Unknown placements are
  rejected.
- **POST**: records impressions/clicks. With a tracking token, the server
  verifies it (campaign id + placement + channel `office` + inventory class)
  and writes to the central `ad_impressions` / `ad_clicks` tables. The campaign
  must have `office` in its `channels` JSON; otherwise the event is rejected.
  A no-token legacy path (`recordAdEvent` in `lib/integration/ads.ts`) remains
  for backward-compatible callers.

## Analytics

Tracking rows carry a `channel` column, so website vs Office delivery is
attributable. Inventory health is computed per placement **and channel** — an
office placement is evaluated against office-eligible campaigns, not the
website inventory (see `AD_ANALYTICS_MODEL.md`).

## Verified live

Channel isolation was verified end-to-end: an Office-only campaign set is
returned for `office_dashboard_hero` (with house fallback when commercial
inventory is below threshold) and is never returned to the website surface;
website campaigns never appear in Office responses.
