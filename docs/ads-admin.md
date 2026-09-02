# Ads admin

The advertising console at `/admin/ads`, its permissions, and the two tools that
explain the engine's decisions.

## Views

| View | Permission | Purpose |
|---|---|---|
| الحملات (Campaigns) | ads read | List, filter, create and edit campaigns through the seven-step wizard |
| مكتبة الوسائط (Media) | ads upload | Upload and manage creatives; start a campaign from an asset |
| التحليلات (Analytics) | `ADS_ANALYTICS` | Totals and daily series per campaign, plus inventory health |
| المحاكي (Simulator) | `ADS_ANALYTICS` | Preview what would serve, and why everything else would not |
| الأرشيف (Archive) | ads edit | Soft-deleted campaigns, restorable |

Every authorization check is server-side. The client hides controls it knows are
unavailable, but the API is the boundary that enforces them.

## The preview simulator

`/api/admin/ads/simulate` (POST) answers "what would a visitor with these
attributes see in this slot".

It runs the **production engines** — the same `evaluateEligibility` and
`competingSet` that serve real traffic. A simulator with its own copy of the
matching rules answers a question nobody asked: it reports what a second
implementation would have done, and it is confidently wrong exactly when the two
drift apart.

The one thing deliberately not reproduced is the weighted random draw, because a
preview has to be reproducible. Instead of sampling one winner, the response
reports every competing campaign with its **share of the traffic**, and every
rejected one with the rule that rejected it.

The operator chooses placement, country, language, device and optionally a date
and time — the last of these so schedule and daypart checks can be previewed
against a future date rather than only against now.

Three outcomes are worth reading carefully:

- **تتنافس** — this campaign competes here, at the shown percentage.
- **مؤهلة لكنها لا تفوز أبداً هنا** — it passes every eligibility rule and still
  gets 0%. It is configured, funded, healthy-looking and invisible.
- A rejection reason — the specific check that stopped it, in Arabic.

## Conflict detection

`/api/admin/ads/simulate` (GET) scans the live campaign set the way selection
does and reports what an operator can act on.

| Type | Severity | Meaning |
|---|---|---|
| `starved_by_priority` | blocked | Outranked on every impression it could win |
| `zero_weight` | blocked | Zero weight beside a weighted sibling in the same tier |
| `duplicate_targeting` | warning | Equal-priority rivals splitting traffic by weight |
| `unreachable_placement` | blocked | Targets a placement no page renders |

`duplicate_targeting` is a warning rather than a fault because splitting traffic
by weight is a legitimate setup. Paused and unapproved campaigns are never
reported: a campaign that is not trying to serve is not being starved.

These are warnings only. Which campaign should win is a commercial decision, not
a technical one, so nothing is changed automatically.

## Approval

Campaigns submitted through the public advertise-with-us form arrive as drafts
awaiting approval. `approval_status` gates serving independently of `status`, so
an approved campaign can still be paused and a draft can never serve.

> Worth knowing: a campaign left in `draft` serves nowhere, and the console shows
> it in the list like any other. The simulator is the fastest way to confirm why
> a slot is empty.
