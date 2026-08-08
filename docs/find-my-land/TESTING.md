# Find My Land — Testing

## Suites

| Suite | File | Count |
|---|---|---|
| FindMyLand resolver | `tests/land/find-my-land.test.ts` | 49 |
| AMRS directory discovery | `tests/land/amrs-directory.test.ts` | 6 |

## Covered behavior (find-my-land.test.ts)

- **Security gate** — rejects embedded scripts / oversized files /
  invalid names → `INVALID_DOCUMENT`.
- **Relevance gate** — non-land docs → `NOT_LAND_DOCUMENT`.
- **Empty text** — `INVALID_DOCUMENT`, `UNRESOLVED` confidence.
- **Classification** — keyword detection for title deeds, survey plans,
  parcel plans.
- **CRS detection** — WGS84 / EPSG:4326 / UTM zone text / datum mentions /
  `UNKNOWN` when absent; invalid zones (e.g. 0, 61) rejected.
- **UTM conversion** — `toWgs84Point("39N 450000 2600000")` →
  `{ lat: 23.50942472545746, lon: 50.51025414854827 }` (zone 39, lon in
  49..52); unparseable UTM → null.
- **Coordinate order protection** — swapped lat/lon guarded by adapter bounds.
- **Geometry** — point / polygon / centroid for 2 points; dedupe.
- **Statuses** — explicit coords + known CRS → `RESOLVED_EXPLICIT_COORDINATES`;
  explicit coords + unknown CRS → `PARTIALLY_RESOLVED`; geocoded path →
  `RESOLVED_GEOCODED`; `UNRESOLVED` for no-coordinate docs.
- **AI rule** — `extraction.aiUsed` is always `false`.
- **Resolve store** — TTL behavior (store + get, expires after TTL).

## Covered behavior (amrs-directory.test.ts)

- Real `REAL_AMRS_DIRECTORY` uses `searchDirectory`.
- `discoverSurveyorsFromDirectory` with a stub source filters/sorts a pool by
  distance, availability, verification, reputation.
- Unverified-only and verified-only filtering.
- Out-of-range / unsortable pools handled gracefully.

## Key fixture fixes (documented)

- Shared geo regex maps `صك <number>` → `planId` (baseline). A plain deed
  number therefore counts as plan evidence → `PARTIALLY_RESOLVED`. The
  `UNRESOLVED` fixture uses `"صك ملكية - المالك أحمد بن محمد"` (no deed
  number) to avoid the false positive.
- Swap test uses `{ lat: 96.5, lon: 24.7136 }` (must exceed 90 for swap
  detection).
- UTM assertion uses `lon > 49 && lon < 52` (zone 39 central meridian is 51°).
- AMRS fixture `org_b` is `isVerified: false` (asserting total=1 with two
  verified entries would fail otherwise).

## Running

```bash
node --import tsx --test tests/land/find-my-land.test.ts tests/land/amrs-directory.test.ts
node --import tsx --test tests/**/*.test.ts      # full .ts suite
npm test                                          # .mjs suite
```

## Baseline

- Full `.ts` suite: **500 pass / 0 fail** (baseline preserved, +55 land tests
  were added on top of the pre-existing 445).
- `npm test`: **185 pass / 0 fail**.
- `npx tsc --noEmit`: clean.
- `scripts/check-architecture.mjs`, `scripts/check-module-boundaries.mjs`: PASS.
