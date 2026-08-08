# Page Targeting

## Page groups

Every request context carries a `pagePath`; the engine resolves it to a page
group (`pageGroupForPath`):

| Group | Representative paths |
| --- | --- |
| `home` | `/` |
| `properties` | `/properties`, `/properties/...` |
| `services` | `/services`, `/services/catalog/...` |
| `tools` | `/tools/block-calculator`, `/tools/find-my-land` |
| `office` | `/office` |
| `account` | `/account/...` |
| `news` | `/news/feed` |
| `other` | anything else |

A context may pass an explicit `pageGroup` (e.g. from a component that knows its
own group) which takes precedence over path resolution.

## Matching strategy (`evaluatePlacement`)

For each candidate placement the engine checks, in order:

1. **Channel** — must equal the requested channel; a mismatch short-circuits.
2. **Page targeting** — `pageMode` + `pageCodes` against path/group.
3. **Geo** — `countryCode` must match the context country; `cityId` must match
   if both present.
4. **Language** — case-insensitive match when a language is pinned.
5. **Audience** — at least one audience key must intersect the context
   audiences when any are pinned.
6. **Schedule** — within `startAt`/`endAt` and not `paused`.

Any failure records a reason (`page_target_mismatch`, `geo_mismatch`,
`language_mismatch`, `audience_mismatch`, `outside_schedule`,
`placement_paused`, `channel_mismatch`) and the placement is excluded.

## Mode details

- `SPECIFIC_PAGES` matches exact paths; a trailing `/` is normalized and a
  `/*` suffix is a prefix wildcard (`/properties/*` covers `/properties/om/1`).
- `PAGE_GROUPS` matches resolved group names, so `/properties/om/1` matches the
  `properties` group without enumerating every URL.
- `EXCLUDE_PAGES` inverts the union of paths and groups, useful for e.g.
  "everywhere except the tools area".

## Safe zones

The tools area is deliberately excluded from default targeting where the
spec requires it (e.g. Find My Land processing and critical tool flows). A
placement must opt in explicitly to `tools` via `EXCLUDE_PAGES` removal or a
targeted `PAGE_GROUPS` entry.

## Determinism

Matching is pure and deterministic (no randomness, no time-dependent state other
than the schedule window). The same context always produces the same eligible
set, which keeps server and client behavior consistent.
