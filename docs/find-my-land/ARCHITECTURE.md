# Find My Land — Architecture

## Pipeline

```
Document (image/PDF)
  → text extraction (native PDF text, or OCR via tesseract.js)
  → POST /api/land/resolve
      → security gate      (checkDocumentSecurity)
      → relevance gate     (checkRelevanceGate + classifier + adapter)
      → adapter hints      (SaudiDocumentAdapter / GenericLandDocumentAdapter)
      → evidence extraction (extractGeoEvidence → coordinates/parcels/addresses)
      → CRS detection      (CrsDetector → kind/zone/hemisphere)
      → per-coordinate conversion (toWgs84Point via proj4)
      → order protection   (protectCoordinateOrder)
      → geometry building  (buildLandGeometry → point/polygon + center)
      → confidence scoring (computeLocationConfidence / computeBoundaryConfidence)
      → geocoding fallback (geocoding-provider → candidates)
      → status decision    (ResolveStatus)
  → storeResolveResult     (1h TTL in-memory)
  → returns { id, ...result }
→ UI renders map + follow-up actions
  → POST /api/land                (save)
  → POST /api/land/[id]/share     (share link / QR / directions / listing)
  → GET  /api/land/discover-surveyors (real AMRS directory)
  → POST /api/land/[id]/surveyors/quote
```

## Module Layout (`lib/land/intelligence/`)

| File | Responsibility |
|---|---|
| `contracts.ts` | All types: `LandDocumentCategory`, `ResolveStatus`, `ConfidenceLevel`, `CrsConfidence`, `LandGeoEvidence`, `LandLocationResult`, interfaces |
| `classifier.ts` | `LAND_CLASSIFIER` — keyword-based doc classification (8 categories) |
| `adapters.ts` | `SAUDI_BOUNDS`, `GULF_BOUNDS`, `SaudiDocumentAdapter`, `GenericLandDocumentAdapter`, `adapterForCountry` |
| `crs-detector.ts` | `CrsDetector`, `toWgs84Point`, `convertWithProj4`, `inferZoneFromLon`, `convertUtmToWgs84` helpers |
| `coordinate-protection.ts` | `protectCoordinateOrder` — guards against swapped lat/lon |
| `geometry-builder.ts` | `centroidOf`, `dedupePoints`, `buildLandGeometry` |
| `confidence.ts` | `computeLocationConfidence`, `computeBoundaryConfidence`, `confidenceLabel` |
| `geocoding-provider.ts` | `DEFAULT_GEOCODING_PROVIDER`, `bestCandidate` — country/city/district → candidates |
| `resolver.ts` | `resolveDeps`, `resolveLandDocument`, `buildLandGeoEvidence`, `extractParcelIdentifiers` |
| `index.ts` | Barrel re-export |

## Supporting Modules

| File | Purpose |
|---|---|
| `lib/land/resolve-store.ts` | `storeResolveResult` / `getResolveResult` — 1h TTL in-memory |
| `lib/land/amrs-directory.ts` | `REAL_AMRS_DIRECTORY` + `discoverSurveyorsFromDirectory` |
| `lib/amrs/directory.ts` | `searchDirectory` — real AMRS organization lookup (PG) |
| `lib/land/surveyor-discovery.ts` | `findSurveyors` — distance/availability/reputation sort |
| `lib/land/saved-land.ts` | `saveLand`, `getLand`, `parseLandReference` |
| `lib/land/share.ts` | `createSharePayload`, `buildDirections`, `buildMapViewUrl`, `buildListingDraft` |
| `lib/geo/*` | Geo primitives: contracts, security-gate, evidence-extraction, crs, geometry, geocoding, text-extraction |

## API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/land/resolve` | POST | Classify + resolve a deed; rate-limited 60/min; returns `{id, ...result}` |
| `/api/land/resolve/[id]` | GET | Fetch a stored resolve result by id (TTL 1h) |
| `/api/land` | POST | Save resolved land (requires `ownerId` + `title`) |
| `/api/land/[id]/share` | GET/POST | Share token/url/qrPayload; modes `directions`/`map`/`listing` |
| `/api/land/discover-surveyors` | GET | Real AMRS directory discovery by lat/lon |
| `/api/land/[id]/surveyors` | GET | Surveyor pool + query via `findSurveyors` |
| `/api/land/[id]/surveyors/quote` | POST | Request a quote (requires `surveyorId` + `requesterId`) |

## Design Notes

- The resolver is **deterministic** for coordinates: no randomness, no LLM
  calls, no invented data. Geocoding is the only non-coordinate path and it is
  explicit (`geocodingUsed: true`) and advisory.
- `resolveLandDocument` returns a full `LandLocationResult` — including steps,
  warnings, evidence, and extraction method — so the UI and tests can audit
  every decision.
- The dev server and `vinext start` differ in runtime backends. See
  `AGENTS.md` for DB provider selection (`DB_PROVIDER`) and the session-cookie
  limitation.
