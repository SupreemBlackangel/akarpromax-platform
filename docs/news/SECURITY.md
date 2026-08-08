# Security

## SSRF protection (`isSafeFetchUrl`)

Enforced twice: at source create/update (`validateSourceInput`) and again
immediately before any `fetch` during ingestion. A candidate URL is rejected
unless it:

- uses `http:` or `https:`;
- is not in the blocked-hostname set (`localhost`, `127.0.0.1`, `::1`,
  `0.0.0.0`, cloud metadata endpoints `metadata.google.internal`,
  `metadata.azure.internal`, `169.254.169.254`);
- does not contain a blocked hostname as a sub-label;
- does not start with a private/loopback/link-local IP prefix (`10.`, `127.`,
  `169.254.`, `172.16-31.`, `192.168.`);
- contains no colon (IPv6 literals, including `::1`, are blocked).

## Safe link normalization (`safeLinkUrl`)

- Allows `https:`, `http:`, `mailto:`, `#anchor`, and same-origin relative paths.
- Rejects `javascript:`, `vbscript:`, `data:`, and protocol-relative `//...`.

## HTML sanitization (`sanitizeHtml`)

Used when ingesting external descriptions:

- Strips `<script>`, `<style>`, comments, and `<iframe|object|embed|form|
  input|button|textarea|select|base|meta|link>` wholesale.
- Allow-lists inline tags: `p, br, strong, b, em, i, u, s, span, a, ul, ol, li,
  h2, h3, h4, blockquote, code, pre, figure, figcaption`.
- Allow-list attributes: `href, title, target, rel`; `on*` handlers dropped;
  `href`/`src` with unsafe protocols dropped.
- `target` forced to `_blank` (or `_self`), `rel` forced to
  `noopener noreferrer`, and anchors without `href` removed.
- Unsupported tags are removed entirely (their text survives).

## Output escaping (`escapeHtml`)

Used for any admin-controlled string rendered into markup: `& < > " '` escaped.

## Auth model

Every admin API is gated through `hasSponsorPermission` with literal permission
strings from `src/constants/permissions.ts`:

- News CRUD: `NEWS_VIEW` (read), `NEWS_UPDATE` (write).
- Publish: `NEWS_PUBLISH` — without it, POST/PATCH downgrades to `draft`.
- Sources: `NEWS_SOURCES_MANAGE`.
- Analytics: `NEWS_ANALYTICS_VIEW` (or `NEWS_VIEW`).
- Placements read: `NEWS_VIEW` / `NEWS_UPDATE`; placements write: `NEWS_UPDATE`.

Restricted editors (`country_manager`-style) are forced to `country` scope via
the admin client (`restrictedToCountry`), never `global`.

## Event integrity

`isBotLike` prevents prefetch/bot/headless requests from consuming delivery
limits or inflating valid click counts. All invalid events are persisted with
`valid = 0` for auditability.

## Do not invent content

Ingestion stores exactly what feeds provided; no fabricated facts, quotes,
dates, or regulations (see `AUTOMATED_INGESTION.md`).
