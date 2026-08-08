# Find My Land — Tool Docs

Core docs for the `findmyland` tool in `/tools?tool=findmyland`.

## What It Does

Upload a land deed (image or PDF). FindMyLand:

1. Extracts text (native PDF text or OCR via tesseract.js).
2. Classifies the document (title deed, survey plan, parcel plan, …).
3. Detects the Coordinate Reference System (CRS) from the text.
4. Converts any found coordinates to WGS84 (EPSG:4326) via `proj4`.
5. Builds a geometry (point or polygon) and a center point.
6. Renders the result on a Leaflet map.
7. Hands off into the existing land flow: Save → Share/QR/Directions →
   Listing → Surveyor discovery (real AMRS directory) → Quote request.

## Hard Rules

- **AI never invents coordinates.** If the text contains no coordinates, the
  result goes down the geocoding/parcel path or ends as `UNRESOLVED`.
  The resolver always sets `aiUsed: false`.
- **CRS is detected, never assumed.** EPSG codes, WGS84, UTM zones, datums,
  and hemisphere are read from the text. Coordinates are only converted when a
  CRS is known or probable.
- See `AI_RULE.md` for the full non-invention rule.

## Files

| Doc | Covers |
|---|---|
| `README.md` | This file |
| `ARCHITECTURE.md` | Pipeline layout, module boundaries, data flow |
| `RESOLVER.md` | `lib/land/intelligence/resolver.ts` behavior + statuses |
| `CRS_DETECTION.md` | CRS/UTM/WGS84 detection and conversion |
| `CONFIDENCE.md` | Geometry building, centering, validation, and confidence scoring |
| `AMRS_INTEGRATION.md` | Real AMRS `searchDirectory` surveyor discovery |
| `HANDOFF_FLOW.md` | ea78239 land-flow integration (save/share/QR/directions/listing/quote) |
| `UI.md` | `src/components/tools/FindMyLand.tsx` |
| `TESTING.md` | Test coverage and how to run it |
| `AI_RULE.md` | The no-invention AI rule |

## Quick Start

```bash
# Run the tests
node --import tsx --test tests/land/find-my-land.test.ts tests/land/amrs-directory.test.ts

# Full .ts suite (500 tests)
node --import tsx --test tests/**/*.test.ts

# npm test (.mjs, 185 tests)
npm test

# Typecheck
npx tsc --noEmit
```

## Verification Status

- `tests/land/find-my-land.test.ts` — 49 tests, all pass.
- `tests/land/amrs-directory.test.ts` — 6 tests, all pass.
- Full `.ts` suite — 500 pass / 0 fail.
- `npm test` — 185 pass.
- `npx tsc --noEmit` — clean.
- `scripts/check-architecture.mjs` and `scripts/check-module-boundaries.mjs` — PASS.
