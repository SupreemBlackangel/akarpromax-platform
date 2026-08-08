# Find My Land — Real AMRS Surveyor Discovery

## Overview

After a land is located and saved, FindMyLand discovers nearby surveyors from
the **real AMRS `searchDirectory`** (PG-backed `organizations` table), then
lets the user request a quote.

## Modules

### `lib/amrs/directory.ts`

- `searchDirectory(filters)` — queries the `organizations` table via
  `getDb()` (per-request PG client, `prepare: false`). Supports filters:
  `countryCode`, `cityId`, `search`, `limit`/`offset`, `sortBy`/`sortDir`.
  Returns `{ entries, total, limit, offset }`.
- `getDirectoryEntry(entityId)` — single entry.
- `getDirectoryStats()` — counts by type and country.

### `lib/land/amrs-directory.ts`

- `REAL_AMRS_DIRECTORY: SurveyorDirectorySource` — adapter over
  `searchDirectory` (`{ search(filters) => { entries, total } }`).
- `mapDirectoryEntryToSurveyor(entry)` — maps an `organizations` row to a
  `SurveyorCandidate` (id, name, role "surveyor", availability, verification,
  reputation, rating, jobs).
- `discoverSurveyorsFromDirectory(landPoint, options, source)` — fetches up to
  100 entries from the source (default real AMRS), maps them to a pool, then
  runs `findSurveyors(pool, query)`.

### `lib/land/surveyor-discovery.ts`

`findSurveyors(pool, query)`:

- Computes `distanceKm` from `landPoint` (haversine).
- Filters by `maxDistanceKm`, `onlyAvailable`, `onlyVerified`,
  `minReputationScore`.
- Sorts by `distance | reputation | rating | jobs`.
- Applies `limit`.

## API Route

`GET /api/land/discover-surveyors?lat=..&lon=..[&countryCode=..&role=..&maxDistanceKm=..&onlyAvailable=..&onlyVerified=..&minReputationScore=..&sortBy=..&limit=..]`

- Rate-limited (60/min) via `checkRateLimit("api:land:surveyors", ...)`.
- Returns `SurveyorSearchResult` `{ candidates, total, query }`.
- Uses the real `REAL_AMRS_DIRECTORY` — no mock pool.

## Related Existing Route

`GET /api/land/[id]/surveyors?pool=[...]` still exists for callers that pass
an explicit client-provided pool. The FindMyLand tool uses the directory route
instead, which is the real AMRS integration point.

## DB Provider Caveat

`searchDirectory` uses the PG-backed `organizations` table. Under `vinext dev`
this works via `getDb()` per-request clients. Under `vinext start`, PG cannot
load (`cloudflare:` socket issue — see `AGENTS.md`), so directory search there
requires `DB_PROVIDER` MySQL path or PG-backed start. The `organizations`
table has no seeder, so the directory may return empty entries in a fresh DB —
the UI shows a "no surveyors in the directory right now" message.
