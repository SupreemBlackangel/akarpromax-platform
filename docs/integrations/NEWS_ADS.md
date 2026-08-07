# News & Ads Delivery — Connected Ecosystem (Stage B)

Status: **Implemented**

## News (`lib/integration/news.ts`)

- `listOfficeNews({ countryCode, cityId?, limit? })` — reads the shared `news`
  table, filters by `status='active'`, scope (`global` / `country` /
  `city` matched by lowercase country/city), and date window
  (`date(start_at) <= date('now') <= date(end_at)`). Ordered: city → country →
  global, then priority ASC, `updated_at` DESC.
- `recordNewsDelivery({ newsId, sponsorId, deviceId? })` — inserts into
  `office_news_deliveries` unless the device already recorded this article
  (dedup by device+news).

## Ads (`lib/integration/ads.ts`)

- `listOfficeAds({ countryCode, placement, limit?, device? })` — reads
  `ad_campaigns` where `status='active' AND is_active = 1`, scope by
  `is_global` or `countries` LIKE, date window, and optional `office_types`
  scope. Ordered `is_fallback ASC, priority ASC, weight DESC`. The requested
  `placement` is stamped on each returned ad.
- `recordAdEvent({ campaignId, eventType: impression|click, countryCode, device, placement, officeDeviceId?, dedupKey? })` —
  impression dedup via `ad_events` (`campaign_id` + `city_id` reuse),
  click always recorded.

## Portability notes

- `date('now')` is translated to `CURDATE()` by `translateSql` for MySQL.
- LIKE patterns use `%"country"%"` on both backends.

## API

- `GET /api/office/v1/news` — device-authenticated, scope `office.news.read`.
- `POST /api/office/v1/news/:id/delivered` — mark delivery.
- `GET /api/office/v1/ads` — device-authenticated, scope `office.ads.read`,
  query `?placement=office_dashboard_hero&countryCode=OM`.
- `POST /api/office/v1/ads/events` — impression/click recording
  (audit events `OFFICE_AD_IMPRESSION` / `OFFICE_AD_CLICK`).
