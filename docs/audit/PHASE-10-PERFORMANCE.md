# PHASE 10 — Performance, measured

Date: 2026-09-04. Measured against production, not estimated.

**Outcome: nothing to fix at the current scale.** That is the honest result and
it is recorded rather than padded, because manufacturing work here would have
displaced the phases that did find defects.

---

## 1. Server response times

Measured on the server, so the numbers are the application's own and not a
laptop's connection to it.

| Path | Status | Time |
|---|---|---|
| `/` | 200 | 61 ms |
| `/properties` | 200 | 34 ms |
| `/services` | 200 | 81 ms |
| `/providers` | 200 | 55 ms |
| `POST /api/ads/match` | 200 | 47 ms |

The same pages measured from a laptop take 1.5–1.8 s. That difference is network
latency to the VPS, not server work, and is worth stating so nobody optimises
the wrong thing.

## 2. Batch matching — §28 of the mandate

The mandate asks that a page needing several ad slots must not fire one request
per slot.

It already does not. `src/components/AdSlot.tsx` calls `requestAdMatch` from
`src/lib/ad-match-batcher.ts`, which queues on a microtask and flushes every
pending slot in a single call to `/api/ads/match-batch`.

Verified rather than assumed — four slots, one request:

```
POST /api/ads/match-batch
{"contexts":[{web_home_hero},{web_home_side_left_01},
             {web_home_bottom_01},{web_home_side_right_01}]}

→ {"results":[{"placement":"web_home_hero","ads":[...]},...]}
```

## 3. Database

There is no hot spot, because there is not yet enough data to have one.

| Table | Size | Rows |
|---|---|---|
| `ad_request_assets` | 15 MB | 9 |
| `spatial_ref_sys` | 7.3 MB | 8500 |
| `office_profiles` | 264 kB | 1 |
| `properties` | 160 kB | 5 |
| `audit_events` | 112 kB | 131 |
| `users` | 112 kB | 10 |

A query for tables with more than 200 sequential scans over more than 100 rows
returned nothing.

The N+1 patterns that WOULD matter at scale were found and fixed in earlier
work — the per-provider category query inside the matching loop, and the
per-offer revisions query on the screen where a customer compares offers — and
both are guarded by assertions in `tests/services-hardening.test.mjs`.

## 4. The one number worth watching

`ad_request_assets` is 15 MB across nine rows: about **1.7 MB per row**. It
stores raw image bytes, and a row is created by `/api/ads/request`, which is
public.

Retention exists and is correct. `pruneOrphanAdRequestAssets` deletes only
assets older than ninety days that no campaign or creative references, bounded
to 500 per sweep, and `tests/ads-data-integrity.test.mjs` covers what it deletes,
what it refuses to delete, and — the dangerous case — that a missing referencing
table does not turn the sweep destructive.

What was not covered is the throttle in front of it, which is the part that
matters given where the sweep is hung: on the public upload path. Without it,
every public ad-request upload would run a full sweep, and repeated uploads
would be the cheapest way to make the server do expensive work.
`tests/ads-asset-sweep-throttle.test.mjs` now covers that it sweeps once, not
again within six hours, resumes afterwards, never throws into the upload, and is
not awaited.

## 5. Not measured

Stated rather than implied:

* No load or concurrency testing. These are single-request timings against a
  database holding tens of rows; they say nothing about behaviour under
  contention.
* No client-side measurement — bundle size, hydration cost, Core Web Vitals.
  That needs a browser, and belongs with the visual QA phase.
* `spatial_ref_sys` is PostGIS's own reference table and is not application
  data.
