# Find My Land — Resolver

`lib/land/intelligence/resolver.ts` is the single entry point:
`resolveLandDocument(input): Promise<LandLocationResult>`.

## Input

```ts
interface ResolveInput {
  metadata: UploadMetadata;      // fileName, mimeType, sizeBytes, nativeText
  ocrText?: string;
  visionText?: string;
  countryCode?: string;
  classifier?, adapter?, crsDetector?, geocodingProvider?;  // test overrides
}
```

Dependencies are resolved by `resolveDeps` with real defaults (the Saudi
adapter when `countryCode` is `SA`/`sa`, the generic adapter otherwise).

## Resolve Statuses

| Status | Meaning |
|---|---|
| `RESOLVED_EXPLICIT_COORDINATES` | Coordinates parsed and CRS known → center + geometry |
| `RESOLVED_GEOCODED` | No coordinates; country/city/district matched to a candidate |
| `NEEDS_USER_CONFIRMATION` | Partial evidence; user should confirm on a map |
| `PARTIALLY_RESOLVED` | Some evidence but CRS unknown or too few points |
| `UNRESOLVED` | No usable evidence at all |
| `INVALID_DOCUMENT` | Security gate or empty text failure |
| `NOT_LAND_DOCUMENT` | Relevance gate failed; not a land/property doc |

## Processing Order

1. **Security gate** — `checkDocumentSecurity(metadata)`. Rejects embedded
   scripts, excessive size, empty/invalid file names.
2. **Text extraction** — native text wins; OCR fills gaps. `method` is one of
   `native_text | ocr | vision | none`. `ocrUsed` is true only when OCR was the
   method.
3. **Relevance gate** — `checkRelevanceGate(text, 2)` + classifier category +
   adapter relevance score. If nothing matches → `NOT_LAND_DOCUMENT`.
4. **Adapter hints** — `adapter.extractHints(text)` gives country/region/city/
   district/street/parcels/addresses/landmarks/source references. These are
   purely deterministic regex/keyword extraction.
5. **Geo evidence** — `extractGeoEvidence(text)` yields explicit coordinate
   evidence, parcel evidence, address evidence. The shared geo regex maps
   `صك <number>` → `planId` (baseline behavior).
6. **CRS detection** — `CrsDetector.detect(text, coordinateDetails)`.
7. **Coordinate conversion** — each coordinate evidence is converted with
   `toWgs84Point` (proj4), then `protectCoordinateOrder` guards against
   lat/lon swaps. A point with `orderConfidence === 0` is dropped.
8. **Geometry + center** — `buildLandGeometry` from converted pairs.
9. **Confidence scoring** — location/boundary confidence.
10. **Geocoding fallback** — only when there are no usable explicit points.
    `geocodingProvider.searchCandidates` uses the extracted address hints.
    `bestCandidate` picks the top one.
11. **Status decision** — explicit coords with known CRS →
    `RESOLVED_EXPLICIT_COORDINATES`; explicit coords with unknown CRS →
    `PARTIALLY_RESOLVED`; geocoded → `RESOLVED_GEOCODED`; etc.

## AI Rule Enforcement

`extraction.aiUsed` is always `false`. The resolver never synthesizes
coordinates; it only converts/parses what is in the text. If no coordinates
exist, the geocoding/parcel path applies, and if nothing else exists the
result is `UNRESOLVED` or `NOT_LAND_DOCUMENT`.

## Determinism

For a fixed input the resolver returns the same output. All extraction uses
regex/keyword logic with no randomness and no LLM. `warnings` and `steps`
record the full decision trail, so failures are auditable.

## Resolve Store

`storeResolveResult(result)` stores the result keyed by a generated id with a
1-hour TTL. The POST route returns `{ id, ...result }`; the UI uses the id for
auditing and the result fields for rendering. `getResolveResult(id)` is used by
`GET /api/land/resolve/[id]`.
