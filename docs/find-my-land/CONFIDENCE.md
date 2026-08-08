# Find My Land — Geometry & Confidence

## Geometry (`lib/land/intelligence/geometry-builder.ts`)

`buildLandGeometry(points, countryAdapter)`:

1. **Dedupe** — `dedupePoints` removes exact duplicates.
2. **0 points** → no geometry.
3. **1 point** → `{ type: "point", coordinates: [p] }`, center = that point.
4. **2 points** → center = centroid, warning that a polygon needs ≥3 distinct
   corners.
5. **≥3 points** → closed polygon (`[...distinct, distinct[0]]`),
   validated with `validateGeometry(polygon, countryCode)`. If invalid, the
   points are kept as warnings and only the centroid center is returned.

`centroidOf(points)` returns the mean lat/lon (`null` for empty input; callers
must convert to `undefined` for optional fields).

Result: `{ geometry?, center?, warnings[] }`. The `geometry.type` is only
`point` or `polygon` from the builder (the `linestring` geometry type is
collapsed to `undefined` when passed to the confidence scorer).

### Geometry types

`lib/geo/contracts.ts` defines:

```ts
type Geometry =
  | { type: "point"; coordinates: Point }
  | { type: "linestring"; coordinates: Point[] }
  | { type: "polygon"; coordinates: Point[] };
```

## Confidence (`lib/land/intelligence/confidence.ts`)

`computeLocationConfidence({ evidence, crsConfidence, geometryType, geometryValid, candidatesCount })`:

- Explicit coordinates present **and** CRS is `DETECTED`/`PROBABLE`/`AMBIGUOUS`
  (i.e. not `UNKNOWN`) → `HIGH`.
- A valid polygon geometry adds boundary confidence `HIGH`.
- Geocoded-only results score lower (`MEDIUM`/`LOW`).
- No evidence → `UNRESOLVED`.

`computeBoundaryConfidence` mirrors location confidence but is driven by
whether a validated polygon (or ≥3 distinct points) exists.

`confidenceLabel(level)` maps `HIGH|MEDIUM|LOW|UNRESOLVED` to display text.

## How the UI shows it

FindMyLand renders three badges:

| Badge | Key |
|---|---|
| Location | `locationConfidence` |
| Boundary | `boundaryConfidence` |
| CRS | `crsConfidence` (DETECTED/PROBABLE/AMBIGUOUS/UNKNOWN) |

Mapping lives in `CONFIDENCE_LABELS` inside `src/components/tools/FindMyLand.tsx`.
