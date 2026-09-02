# Ads targeting

Every rule that decides whether a campaign may serve, in the order it runs.
See [architecture](./ads-architecture.md) for how this fits the pipeline.

## The twelve checks

`lib/ads/eligibility.ts` runs these in order and stops at the first failure. The
order is deliberate: the cheapest and most decisive checks run first, and the
reason reported is the most meaningful one for an operator reading the preview
simulator.

| # | Check | Fails when | Reason code |
|---|---|---|---|
| 1 | Active | `is_active` is off | `inactive` |
| 2 | Approved | `approval_status ≠ approved` | `not_approved` |
| 3 | Channel | website / office mismatch | `channel` |
| 4 | Schedule | outside start/end, daypart or weekday | `schedule` |
| 5 | Operating system | OS not in the campaign's list | `operating_system` |
| 6 | Budget | lifetime or daily budget, impression or click cap spent | `budget` |
| 7 | Placement | the slot is not one this campaign named | `placement` |
| 8 | Section | page section mismatch | `section` |
| 9 | Domain | request host not in the campaign's list | `domain` |
| 10 | Page type | page type mismatch | `page_type` |
| 11 | Device | desktop / tablet / mobile mismatch | `device` |
| 12 | Language | locale mismatch | `language` |
| 13 | Geo | country, region, city, district or radius mismatch | `geo` |
| 14 | Entity / category | bound to a specific listing or category | `entity`, `category` |

Each reason has an Arabic and English label in `INELIGIBLE_REASON_LABELS`, which
is what the admin simulator shows.

## Placement specificity

Not a score — a tier. `placementSpecificity()` returns:

| Tier | Meaning | Example |
|---|---|---|
| `Exact` (0) | The campaign named this precise placement | `web_home_hero` |
| `Canonical` (1) | It named the generic slot, any page | `HERO` |
| `Any` (2) | It named no placement at all | `[]` |
| `null` | It named a *different* placement — not eligible | `web_services_hero` on the home page |

The most specific tier present wins outright. This is what keeps each page's
hero independent, and it is why an untargeted campaign can still backfill a page
nothing specific asked for without ever displacing one that did.

## Geo

The hierarchy is cumulative — country, then region, then city, then district,
then an optional radius in kilometres. A campaign that names a city must also
match its country. `target_all_*` flags widen a level explicitly rather than
implicitly.

**No country list is hard-coded in the engine.** Countries come from the
campaign row and from the geo registry; adding a market is data, not code.

### Country detection is a client assertion

There is no GeoIP at the edge — nginx forwards `X-Real-IP` and
`X-Forwarded-For` but has no GeoIP module. `resolveServerAdContext` therefore
records `countrySource: "client"` and validates the value against
`/^[a-z]{2}$/` before use, so a malformed or injected value is dropped rather
than making a campaign unservable.

This is honest rather than ideal: the country switcher is a real product
feature, so the visitor's choice is respected, but it is *labelled* as their
assertion. When a geo source is added it overrides this field and nothing else
changes.

Everything the request itself proves is taken from the request and never from
the body: device (from `User-Agent`, with tablets tested before mobiles because
Android tablets differ only by the absence of "Mobile"), host, and the signed
session id.

## The fallback chain

```
Exact country match
   └─ no → Regional match
        └─ no → Global campaign (target_all_countries)
             └─ no → House ad
                  └─ no → no ad, slot collapses
```

House ads are a separate, last-resort pass (`selectHouseCandidates`) rather than
a low-scoring competitor, so they cannot outrank a paying campaign. House fill
still respects geo targeting — it is a fallback, not an override.
