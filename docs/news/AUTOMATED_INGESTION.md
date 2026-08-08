# Automated Ingestion

## Trusted-source registry

External ingestion only ever reads from feeds that an admin explicitly added to
`news_sources`. There is no open-endpoint ingestion.

| Field | Meaning |
| --- | --- |
| `name` | Display name (≤160 chars) |
| `url` | Public `http(s)` feed URL — SSRF-guarded |
| `sourceType` | `RSS` or `EXTERNAL_API` |
| `format` | Feed format hint (`rss`, default) |
| `countryCode` | Optional 2-letter country scope |
| `language` | Content language (default `ar`) |
| `trustLevel` | `TRUSTED` or `REVIEW_REQUIRED` (default) |
| `status` | `active` / `paused` |
| `fetchIntervalMinutes` | Clamped 15 → 10,080 |

New sources default to `REVIEW_REQUIRED`; `TRUSTED` only flags sources an admin
has explicitly promoted.

## Fetch & parse

`ingestSource(sourceId)`:

1. Resolves the source (unknown id → `Source not found`).
2. Skips paused sources (`Source is paused`).
3. Re-checks `isSafeFetchUrl` (SSRF) immediately before `fetch`.
4. Fetches with a 15s timeout (`FETCH_TIMEOUT_MS`), `AkarPromaxNewsBot/1.0`
   User-Agent, `redirect: "follow"`, and a 512 KiB cap (`MAX_FEED_BYTES`).
5. Parses RSS 2.0 or Atom via the dependency-free parser (`parseFeed`).

## Deduplication

Each parsed entry is hashed as `entryContentHash(entry)` =
`stableHash(title|link|pubDate)`. If `news_extended.content_hash` already holds
that hash, the entry is counted as a duplicate and skipped. Re-fetching a feed
therefore never duplicates rows.

## Draft + review policy

Every ingested external item is inserted with:

- `status = 'draft'` — never auto-published.
- `review_status = 'REVIEW_REQUIRED'` in `news_extended`.
- Full source attribution: `source_name`, `source_url`, `source_published_at`,
  `fetched_at`, `content_hash`, `external_id`.

Entries without a title are skipped.

## The AI never invents news

The engine stores exactly what the feed contained — titles, links, pubDate,
categories. It does not fabricate facts, quotes, dates, or regulations, and it
does not auto-translate or auto-summarize. Any downstream summarization or
translation happens under explicit admin control.

## Fetch telemetry

On success `recordSourceFetch(id, "ok", ...)` stores the feed `etag` and content
hash. On failure the error message (truncated to 500 chars) is stored in
`last_error`. The admin workspace surfaces both.

## Rate limiting

- `api:news:sources:create` → 20 requests/hour.
- `api:news:sources:fetch` → 30 requests/minute.

## Manual trigger

`POST /api/news/sources/fetch` with `{ sourceId }` runs the pipeline on demand
and returns an `IngestionSummary` (`{ fetched, entries, newItems, duplicates,
errors }`). 422 on unrecoverable failures.
