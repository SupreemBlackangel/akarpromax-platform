# Ticker & News Placement Model

## Concepts

A **placement** is the smallest unit of delivery policy: it binds one news item
to one channel and describes *where*, *for whom*, and *how much* it may show.

The engine intentionally keeps placement rows sparse. A row exists in
`news_placements` only when an admin has explicitly configured targeting for an
item on a channel. Otherwise the delivery layer synthesizes a default placement
from the news row (`defaultPlacementFor`), so every active row still delivers
somewhere.

## Placement fields

| Field | Meaning |
| --- | --- |
| `newsId` | Owning news item |
| `channel` | `WEBSITE_NEWS`, `WEBSITE_TICKER`, `OFFICE_NEWS`, `OFFICE_TICKER`, `PUSH_NOTIFICATION`, `IN_APP_NOTIFICATION` |
| `pageMode` + `pageCodes` | Page targeting strategy and the codes/group keys it applies to |
| `countryCode` / `cityId` | Geo scope (optional) |
| `language` | Language scope (optional) |
| `audiences` | Audience segment keys (optional) |
| `priority` | 1–999, lower number wins within a tier |
| `manualOrder` | Manual boost (optional); larger value ranks the item earlier |
| `limits` | `maxImpressions`, `maxClicks`, `maxPerUserPerDay`, `maxPerSession` |
| `startAt` / `endAt` | Schedule window |
| `status` | `active` / `paused` |

## Page targeting modes (`PAGE_TARGET_MODES`)

| Mode | Behavior |
| --- | --- |
| `ALL_PAGES` | Every page |
| `SPECIFIC_PAGES` | Only the exact paths in `pageCodes` (`/`, `/properties/om/*` wildcards supported) |
| `PAGE_GROUPS` | Only pages whose resolved group is in `pageCodes` (`home`, `properties`, `services`, `tools`, `office`, `account`, `news`, `other`) |
| `EXCLUDE_PAGES` | Every page except the paths/groups in `pageCodes` |

Page groups are derived from the URL path (`pageGroupForPath`), e.g.
`/properties/*` → `properties`. A context may override the group explicitly.

## Channel separation

Channel separation is enforced in `resolveForChannel`:

- Items with placements → only the placements whose `channel` equals the
  requested channel are candidates.
- Items with **no** placements → a synthesized default placement on the
  requested channel.

This means adding an `OFFICE_NEWS` placement to an item stops it appearing on
`WEBSITE_*` channels entirely. To restore website delivery, add an explicit
`WEBSITE_NEWS`/`WEBSITE_TICKER` placement (or remove the office placement).

## Limit semantics

Limits are read from the per-day counter rollups (`news_delivery_counters`)
keyed by `(news_id, placement_id, day, user_key, session_key)`:

- `maxImpressions` counts all recorded impressions (renders + visible).
- `maxClicks` counts valid real-user clicks.
- `maxPerUserPerDay` counts impressions in the current UTC day for the user.
- `maxPerSession` counts impressions in the current session.

A hit on any limit excludes the placement from results.

## Schedule semantics

`startAt` / `endAt` are ISO/`YYYY-MM-DD` strings compared against the current
time. A paused placement never matches, regardless of schedule.

## Ticker

`resolveTickerForContext(context)` is `resolveNewsFeed` pinned to
`WEBSITE_TICKER` with a default limit of 20. The ticker component
(`src/components/NewsTicker.tsx`) renders ranked items with slide transitions,
keyboard/touch/auto-advance, `role="status"`, and trilingual
`tickerPrev`/`tickerNext` aria-labels.
