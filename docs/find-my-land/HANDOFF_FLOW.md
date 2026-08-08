# Find My Land — Hand-off Flow (ea78239 integration)

Once the resolver produces a center/geometry, FindMyLand saves the land and
exposes the existing land-flow actions. The flow reuses the `ea78239` land
surface end-to-end — no public `/land/[id]` page exists yet, so all links come
from the share payload's `url` / `buildMapViewUrl`.

## Steps in the UI

### 1. Save

`POST /api/land` with:

```json
{
  "ownerId": "<localStorage ap_owner_id or guest>",
  "title": "My Land — Deed | My Land — Located",
  "location": { "point": center, "geometry": geometry, "label": resolvedAddress },
  "reference": parcelIdentifiers,
  "source": "coordinates" | "geocoding"
}
```

Returns the `SavedLand` object directly (201). The UI stores it and enables
the follow-up actions.

### 2. Share / QR / Directions / Listing

`POST /api/land/[id]/share` with a body mode:

| Mode | Response | UI action |
|---|---|---|
| `(none)` | `createSharePayload` → `{ landId, shareToken, url, qrPayload, expiresAt }` | Share link + QR payload (copied) |
| `directions` | `buildDirections(from, to)` → `{ from, to, url, provider }` | "Open directions ↗" external link |
| `map` | `{ url: buildMapViewUrl(point) }` | Direct map view link |
| `listing` | `{ draft: buildListingDraft(land) }` | Listing draft preview (collapsible) |

The FindMyLand "Share link" button sends **no mode** so it gets both `url`
and `qrPayload`; "Directions" sends `directions`; "Listing" sends `listing`.

### 3. Surveyor discovery (real AMRS)

`GET /api/land/discover-surveyors?lat=..&lon=..&role=surveyor` →
`{ candidates, total, query }`. Rendered as a list with rating/reputation/
distance/jobs and a "Request quote" button.

### 4. Quote request

`POST /api/land/[id]/surveyors/quote` with `{ surveyorId, requesterId, service }`.
Requires `surveyorId` + `requesterId`; on success marks the button "Sent ✓".

## Relevant Library (`lib/land/share.ts`)

- `buildMapViewUrl(point)` — Google Maps pin URL.
- `buildDirections(from, to)` — Google Maps directions URL.
- `createSharePayload(land, { baseUrl })` — share token, url, QR payload,
  expiration.
- `buildListingDraft(land)` — structured listing text.

## `lib/land/flow.ts`

`buildLandFlow` / `runLandFlow` orchestrate the whole land flow
(mapUrl/shareUrl/qrPayload/directionsUrl/listingDraft/surveyors/quote) and are
covered by `tests/land/land-flow.test.ts`. FindMyLand calls the same underlying
routes instead of the orchestration, so both paths stay consistent.
