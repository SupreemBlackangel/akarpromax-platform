# News & Ticker Engine — Architecture

## Overview

The News & Ticker Engine is a single central content engine that feeds five
delivery surfaces from one editorial workspace:

| Channel | Surface | Primary route |
| --- | --- | --- |
| `WEBSITE_NEWS` | Public website news feed | `GET /api/news/feed` |
| `WEBSITE_TICKER` | Homepage news ticker | `GET /api/news/feed` |
| `OFFICE_NEWS` | Office news listing | `GET /api/office/v1/news` |
| `OFFICE_TICKER` | Office ticker | `GET /api/office/v1/news?view=ticker` |
| `PUSH_NOTIFICATION` / `IN_APP_NOTIFICATION` | Reserved for downstream notification delivery | via placement registry |

The engine reuses the existing `news` table (the same one Find My Land and the
homepage already use) and extends it with additive tables — nothing existing is
migrated or dropped.

## Layers

```
Admin workspace (app/admin/news)          →  management UI (3 tabs)
        │
API routes (app/api/news/*)               →  HTTP surface + auth gates
        │
Service modules (lib/news/*)              →  pure logic + data access
        │
Runtime DB (lib/runtime-db / D1|PG|MySQL) →  storage
```

### Service modules

| File | Responsibility |
| --- | --- |
| `contracts.ts` | Shared types, channel constants, targeting/limit types, `clampPriority` |
| `schema.ts` | Additive DDL + indexes, `ensureNewsSchema` |
| `db.ts` | Data-access seam: `getNewsDb()`, `setNewsDbForTesting()` |
| `eligibility.ts` | Page-group mapping, geo/language/audience/schedule checks, limit checks, ranking |
| `delivery.ts` | `resolveForChannel` / `resolveNewsFeed` / `resolveTickerForContext` |
| `placements.ts` | Placement CRUD + validation |
| `sources.ts` | Trusted source registry CRUD |
| `ingestion.ts` | Feed fetch, parse, dedupe, draft+review insertion |
| `rss.ts` | Dependency-free RSS 2.0 / Atom parser |
| `security.ts` | SSRF guard, `safeLinkUrl`, `sanitizeHtml`, `escapeHtml` |
| `analytics.ts` | `recordNewsEvent`, `incrementCounter`, bot detection |

## Data model

- `news` — base table (existing, extended columns untouched): id, scope, geo,
  trilingual titles, link, status (`draft/active/archived`), priority, schedule,
  created_by/timestamps.
- `news_extended` — 1:1 rich editorial fields (summaries, category, tags, image,
  breaking/pinned flags, source attribution, content hash, review status).
- `news_placements` — per-channel targeting rules (page mode, geo, language,
  audiences, limits, schedule, pause state).
- `news_sources` — trusted external feed registry (RSS / EXTERNAL_API).
- `news_delivery_counters` — daily per placement/user/session counter rollups.
- `news_events` — raw event log (impressions, visible impressions, clicks).

All DDL is additive and runs through the active adapter's `translateSql`
(D1, PostgreSQL, MySQL).

## Resolution pipeline (`resolveForChannel`)

1. Load active news rows (status `active`, within `start_at`/`end_at` window).
2. Load extended fields, placements (all channels), and counters in parallel.
3. For each row: pick channel placements; if the item has **no placements at
   all**, synthesize a default placement from the row (`defaultPlacementFor`).
4. Evaluate page / geo / language / audience / schedule for each candidate.
5. Apply display limits using counter rollups.
6. Rank deterministically: breaking → pinned → priority → manual order → recency.

A placement row for a channel **restricts** delivery to that channel: an item
with only an `OFFICE_NEWS` placement is never delivered on `WEBSITE_*` via the
default fallback.

## API surface

| Method / Path | Purpose | Auth |
| --- | --- | --- |
| `GET /api/news` | Admin list / CRUD | `NEWS_VIEW` / `NEWS_UPDATE` |
| `POST /api/news` | Create (draft if no publish right) | `NEWS_UPDATE` |
| `PATCH /api/news` | Update | `NEWS_UPDATE` |
| `GET /api/news/feed` | Public feed/ticker | public |
| `POST /api/news/telemetry` | Event recording | public + bot guard |
| `GET/POST/PATCH/DELETE /api/news/sources` | Source registry | `NEWS_SOURCES_MANAGE` |
| `POST /api/news/sources/fetch` | Manual ingestion | `NEWS_SOURCES_MANAGE` |
| `GET/POST/PATCH/DELETE /api/news/placements` | Placement registry | `NEWS_VIEW`/`NEWS_UPDATE` |
| `GET /api/news/analytics` | Analytics read | `NEWS_ANALYTICS_VIEW` / `NEWS_VIEW` |
| `GET /api/office/v1/news` | Office news + ticker | sponsor session |
