# Admin Operations

The news workspace lives at `/admin/news` (`app/admin/news/`). It is gated by
`getSponsorIdentity()` and permission checks (`NEWS_VIEW` / `NEWS_UPDATE` /
`NEWS_PUBLISH` / `NEWS_SOURCES_MANAGE` / `NEWS_ANALYTICS_VIEW`). The UI is
Arabic (RTL) with English/TR fallbacks via the app translation tables.

## Tabs

### 1. News (`news`)

- **List**: filter by scope (`global` / `country` / `city`), status
  (`draft` / `active` / `archived`), and country; shows trilingual titles,
  category, breaking/pinned badges, review status, priority.
- **Create / Edit**: trilingual titles (`titleAr` / `titleEn` / `titleTr`),
  summary + body per language, category (`NEWS_TYPES`), tags, image URL, link,
  breaking/pinned toggles, language, `newsType` (`MANUAL` / `RSS` /
  `EXTERNAL_API`), review status, schedule (`startAt` / `endAt`), priority,
  manual order.
- **Inline placement editor** (`PlacementEditor`): add/remove/edit placements
  per channel with page mode, page codes, country/city, language, audiences,
  limits, schedule, and pause state.

Publishing: without `NEWS_PUBLISH` the API downgrades any create/update to
`draft` and returns 403 `Publishing permission required`; the client saves it as
a draft so restricted editors can still author.

### 2. Sources (`sources`)

- List trusted sources with trust badge (`TRUSTED` / `REVIEW_REQUIRED`), status,
  last fetch status/error.
- Create / edit / delete (`NEWS_SOURCES_MANAGE`).
- **جلب الآن** (fetch now) triggers `POST /api/news/sources/fetch` and shows the
  `IngestionSummary` (entries / new / duplicates / errors).

### 3. Analytics (`analytics`)

- Totals cards: impressions, visible impressions, clicks, CTR.
- Per-item table sorted by visible impressions, with per-event valid/invalid
  breakdowns.

## Country scoping

`countryOptions` / `citiesForCountry` come from `src/data/locations.ts`. City
ids start with the country code; the admin falls back to
`${countryCode}-${selectedCountry}` for new cities. Restricted editors are
locked to their country scope.

## Operational notes

- Placements are optional; an item with no placements still delivers via the
  default placement on every channel. Adding a placement restricts the item to
  that channel.
- `manualOrder` boosts an item earlier; it stacks on top of breaking/pinned/
  priority ranking.
- Sources added in `REVIEW_REQUIRED` need a manual trust promotion before the
  admin workflow treats them as trusted.
- Analytics buckets by UTC day; limits reset at UTC midnight.
