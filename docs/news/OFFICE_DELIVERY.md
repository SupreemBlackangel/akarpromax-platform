# Office Delivery

## Channels

The Office surfaces consume the same resolution engine as the website:

| Channel | Route | Returns |
| --- | --- | --- |
| `OFFICE_NEWS` | `GET /api/office/v1/news` | Ranked news items |
| `OFFICE_TICKER` | `GET /api/office/v1/news?view=ticker` | Ranked ticker items |

Both routes run `resolveNewsFeed` with the matching channel; the React Office
UI never re-implements eligibility or ranking.

## Session model

Office news endpoints are gated by the sponsor session (`getSponsorIdentity`).
A placement on `OFFICE_*` channels means the item appears for sponsors only.

## Targeting

Office items support the full targeting matrix via `news_placements`:

- Page groups: an office placement can target `office` or `account` groups
  (and any other group) through `PAGE_GROUPS`/`SPECIFIC_PAGES`.
- Geo: country/city scope.
- Language and audiences.
- Limits, schedule, pause.

Because channel separation is enforced by placements, an item placed only on
`OFFICE_NEWS` never leaks to the public website feed.

## Office default fallback

Like every channel, office items with **no** placements at all still deliver via
the synthesized default placement. Only an explicit placement on another
channel removes an item from office delivery.

## Ticker view

`view=ticker` returns the same resolution with `WEBSITE_TICKER` semantics
replaced by `OFFICE_TICKER`; the response shape is otherwise identical so the
Office ticker component can reuse the website `NewsTicker` rendering rules
(slide transform, `role="status"`, trilingual `tickerPrev`/`tickerNext`).
