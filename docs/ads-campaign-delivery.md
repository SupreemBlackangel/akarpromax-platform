# Campaign delivery

What happens after eligibility: which campaign wins, how it is rendered, and how
the impression and click are recorded.

## Selection

`lib/ads/selection.ts`, three tiers in order:

1. **Placement specificity** — the most specific tier present wins outright.
2. **Priority** — the highest priority within that tier wins outright.
3. **Weight** — weighted random among the survivors.

`priority: 100` therefore does **not** mean "100% of traffic". It means "this
tier outranks lower ones"; within a tier, two campaigns at weights 75 and 25
receive 75% and 25% of impressions. A weight of 0 means "never serve while a
weighted sibling exists"; if *every* candidate is 0 the pick is uniform, so a
misconfigured set still serves something rather than blanking the slot.

`pickWeighted` takes an injectable `RandomSource`, so rotation is deterministic
in tests without touching `Math.random`.

## Budget and pacing

`spent_amount` accrues on every billable event: CPM campaigns bill
`price / 1000` per impression, CPC campaigns bill `price` per click, `fixed`
campaigns accrue nothing per event. It is written to both the campaign row and
the day's `ad_daily_statistics` row.

> This used to be read by the budget gate and written by nothing, so `budget`
> and `daily_budget` were permanently inert — a campaign could never exhaust its
> money.

Daily figures are keyed by `stat_date`, a **day key** (`2026-09-02`). Reading it
with a full timestamp produced `2026-09-02 18:52:45`, which matched no row, so
every daily cap — daily budget, the day's share of `max_impressions` and
`max_clicks`, and creative rotation — was silently inert.

## Frequency capping

Per campaign, per viewer, per period (`session`, `day`, `week`, `month`, `all`),
counted from `ad_impressions` against the signed session id and, when present,
the user id. The period comes from the campaign's own `frequency_cap_period`.

## Tracking

### Tokens

`sha256(payload + AD_TRACKING_SECRET)`, 24-hour TTL, carrying campaign,
placement, section, page type, creative, channel and a **random nonce**.

`AD_TRACKING_SECRET` is required in production. It used to fall back to a
constant committed to this repository, which would have let anyone mint a token
for any campaign and POST it in a loop.

### Single use

`lib/ads/nonce-ledger.ts`. A nonce is spendable **once per event kind**, so one
token legitimately backs one impression and one click but neither can be
replayed. Without it, anyone who loaded a page held a token valid for 24 hours
and could drain a rival's daily budget in seconds, or manufacture an invoice
against an advertiser.

This is also what makes tracking immune to phantom events: a React remount,
StrictMode's double effect, a hydration replay and a retried request all present
the same nonce, so deduplication no longer depends on the client behaving.

A token with **no** nonce is admitted — deploying this must not blank tracking
for every page already open in a browser.

### Impressions

Recorded by `AdSlot` after the creative has been ≥50% visible for a continuous
second and the tab is visible. Rate limited to 120/min per IP.

### Clicks

The ad's anchor points at `/api/ads/click?token=…` and **the browser navigates**.
There is no JavaScript in the click path. That is what makes a plain click, a
middle click, a cmd/ctrl-click and "Open link in new tab" all work and all count
exactly once.

> The previous handler called `preventDefault`, POSTed, waited for the response
> and assigned `location.href`: external ads were forced into the current tab
> despite their own `target="_blank"`, the visitor waited out a round trip, and
> modifier-clicks recorded nothing at all because the handler bailed while the
> href pointed straight at the advertiser.

An **expired** token still redirects the visitor to the advertiser; it simply is
not billed. A **forged** token redirects to the site root. Collapsing both into
one outcome sent people who left a tab open overnight to the homepage instead of
the ad they clicked.

`target_url` is validated before it reaches a `Location` header — it is
admin-entered free text, and `javascript:`, `data:` and protocol-relative
`//host` values have no business there. The redirect origin comes from the
forwarded request headers, not from `request.nextUrl.origin`, which reports the
address the Node server is bound to (`0.0.0.0:3010` behind nginx).

## Data

### Schema shadowing

`CREATE TABLE IF NOT EXISTS` checks only the schema it would create in — the
first entry of `search_path` — not the whole path. Production has
`search_path = public, akarpromax` while the ad tables were created in
`akarpromax`, so the bootstrap created a second, empty `ad_impressions` in
`public` which then shadowed the real one.

Measured state:

| Table | Resolves to | Rows there | Rows stranded in `akarpromax` |
|---|---|---|---|
| `ad_campaigns` | `akarpromax` | 1 | — |
| `ad_creatives` | `akarpromax` | 0 | — |
| `ad_impressions` | `public` | 0 | 140 |
| `ad_clicks` | `public` | 0 | 3 |
| `ad_daily_statistics` | `public` | 0 | 7 |

Reads and writes agree, so tracking is self-consistent going forward — but
campaigns and their own events live in different schemas, and the history is
invisible to analytics and to budget pacing. `ensureAdSchema` now probes whether
a name already resolves before creating anything, which prevents recurrence; the
existing split is resolved by dropping the four empty `public` shadows.

### Retention

`ad_request_assets` holds the raw bytes of every image submitted through the
public advertise-with-us form. Old uploads are swept, but only when
**unreferenced** — the intake route writes a draft campaign whose `media_url`
points back at the asset, and deleting one of those would blank a live ad. A
referencing table that cannot be read contributes no references and blocks
nothing, so an unreadable table can never make the sweep destructive.

### Timezone

Timestamps are stored as UTC-based strings. Per-campaign timezones are **not yet
implemented**: dayparting runs on the server clock. This is a known gap.
