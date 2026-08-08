# Analytics & Delivery Limits

## Event model

The ticker and news blocks report events to `POST /api/news/telemetry`, which
calls `recordNewsEvent`. Supported event types (`ANALYTICS_EVENT_TYPES`):

| Event | Meaning | Counter effect |
| --- | --- | --- |
| `impression` | Block rendered on screen | `impressions + 1` |
| `visible_impression` | Block rendered **and** visible (client intersection) | `visible_impressions + 1` |
| `ticker_render` | Ticker frame rendered | `impressions + 1` |
| `click` | User clicked the item | `clicks + 1` |
| `pause` | Reserved / non-counting | none |

## Validity rules

- **Visible impression** is only valid when the client confirms visibility
  (`visible: true`).
- **Click** is only valid when the request is not bot-like. `isBotLike`
  inspects `Sec-Purpose` / `X-Moz` prefetch headers and bot/crawler/headless/
  preview markers in the User-Agent.
- A click without a prior impression for the same placement+session is still
  recorded (and counted for CTR) but flagged `valid = 0` so it does not consume
  limits.

Invalid events are written to `news_events` with `valid = 0` and never touch
`news_delivery_counters`.

## Counters

`incrementCounter` maintains per-day rollups in `news_delivery_counters` keyed by
`(news_id, placement_id, day, user_key, session_key)`. Anonymous sessions with
null keys create separate per-event rows (SQL `NULL = NULL` never matches), so
totals are always summed across rows — limit enforcement and CTR stay correct.

## Limit checks in delivery

`isWithinLimits` reads the rollups for a placement and blocks when any of:

- `impressions >= maxImpressions`
- `clicks >= maxClicks`
- `perUserToday >= maxPerUserPerDay`
- `perSession >= maxPerSession`

Failing a limit excludes the placement from `resolveForChannel` output.

## Analytics read API

`GET /api/news/analytics` (gated by `NEWS_ANALYTICS_VIEW` or `NEWS_VIEW`,
params `newsId` / `channel` / `eventType`) returns:

```
{
  totals: { impressions, visibleImpressions, clicks,
            events: { <eventType>: { total, valid, invalid } } },
  items:  [ { newsId, impressions, visibleImpressions, clicks, ctr,
              events: { ... } } ]   // sorted by visibleImpressions desc
}
```

`ctr = clicks / visibleImpressions` (0 when no visible impressions). The event
query caps at the 5,000 most recent rows; unknown event types bucket to `other`.

## CTR caveats

CTR is computed from **valid** click counts and **visible** impression counts,
so prefetch/bot noise is excluded from the denominator and invalid clicks never
inflate the numerator.
