# Geographic Matching Policy

## Overview

The Services Marketplace uses a geographic matching engine to connect service requests with eligible providers based on location, category, and provider preferences.

## Matching Algorithm

### Core Function: `computeMatchScore(request, provider)`

Returns `MatchScoreResult` with:
```typescript
interface MatchScoreResult {
  providerId: string;
  score: number;           // 0-100
  categoryMatch: boolean;
  distanceKm: number | null;
  budgetFit: boolean;
  urgencyBonus: number;
  ratingBonus: number;
  responseBonus: number;
  reasons: string[];       // e.g., ["category_match", "distance_5km", "budget_fit", "rating_4.5"]
}
```

### Scoring Components

| Component | Max Points | Calculation |
|-----------|------------|-------------|
| Category Match | 40 (base) | Required, else null |
| Distance | 30 | `max(0, 30 - distanceKm)` if within radius |
| Same City (no coords) | 12 | City ID match fallback |
| Urgency | 10 | urgent=10, asap/today=6, this_week=3 |
| Budget Fit | 8 | Provider range overlaps request range |
| Rating Bonus | 10 | ≥4.5=10, ≥4.0=7, ≥3.5=4 |
| Response Rate | 7 | ≥95%=7, ≥85%=4 |
| Completion Rate | 5 | ≥95%=5 |

### Hard Filters (Return Null)
1. Provider status ≠ "approved"
2. Country mismatch
3. Category not in provider's categories
4. Distance > provider's service_radius_km

## Geographic Calculations

### Haversine Distance
```typescript
function distanceKm(a: {lat, lng}, b: {lat, lng}): number | null {
  if (!a.lat || !a.lng || !b.lat || !b.lng) return null;
  const R = 6371; // Earth radius km
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = sin²(dLat/2) + cos(a.lat) * cos(b.lat) * sin²(dLng/2);
  return R * 2 * atan2(√h, √(1-h));
}
```

### Fallback: City Match
If coordinates missing for either party:
- Compare `city_id` (e.g., `om-muscat`)
- Match = 12 points bonus
- No distance penalty

## Provider Eligibility

### Required Criteria
1. `status = "approved"`
2. `country_code` matches request
3. Category in `service_provider_categories` (active)
4. Within `service_radius_km` (default 50km)
4. Coordinates or city_id available

### Provider Profile Fields
```sql
service_provider_profiles:
  latitude, longitude       -- WGS84 decimal degrees
  city_id                   -- e.g., "om-muscat"
  service_radius_km         -- default 50
  rating_avg, rating_count
  completion_rate           -- 0-100
  response_rate             -- 0-100
  avg_response_time_min     -- minutes
```

## Matching Pipeline

### Trigger
`runMatching(requestId)` called when:
1. Request published (`publishRequest()`)
2. Request edited and re-published
3. Manual re-match via API

### Process
```typescript
async function runMatching(requestId: string): Promise<number> {
  1. Load request (category, location, urgency, budget)
  2. Find candidate providers:
     - status = 'approved'
     - same country_code
  3. For each provider:
     a. Load categories + pricing
     b. Build MatchProviderRow
     c. computeMatchScore(request, provider)
     d. If score > 0: INSERT INTO service_request_matches
  4. Batch insert matches (ON CONFLICT UPDATE)
  5. Create notifications for matched providers
  6. Create notification for customer
  7. Enqueue outbox events
  8. Return match count
```

### Notifications Created
| Recipient | Type | Title | Body |
|-----------|------|-------|------|
| Provider | `SERVICE_REQUEST_MATCHED` | "طلب جديد يناسب خدماتك" | "Found matching request, submit offer" |
| Customer | `SERVICE_REQUEST_MATCHED` | "تمت مطابقة طلبك" | "Request matched with potential providers" |

### Outbox Events
- `SERVICE_REQUEST_MATCHED` per match
- `SERVICE_REQUEST_MATCHED` for customer (once)

## Database Schema

### service_request_matches
```sql
id                   UUID PK
request_id           UUID FK
provider_id          UUID FK (service_provider_profiles)
score                INTEGER        -- 0-100
distance_km          REAL NULL
category_match       BOOLEAN
rating_bonus         INTEGER
urgency_bonus        INTEGER
budget_fit           BOOLEAN
is_contacted         BOOLEAN DEFAULT FALSE
contacted_at         DATETIME NULL
provider_ignored     BOOLEAN DEFAULT FALSE
created_at           DATETIME

Indexes:
  UNIQUE (request_id, provider_id)
  INDEX (request_id, score DESC)
```

## API Endpoints

### GET `/api/service-requests/[id]/matches`
List matches for request (customer view):
```json
{
  "matches": [
    {
      "provider_id": "uuid",
      "score": 87,
      "distance_km": 3.2,
      "category_match": true,
      "rating_bonus": 10,
      "urgency_bonus": 6,
      "budget_fit": true,
      "provider": { "display_name_ar", "rating_avg", "jobs_completed" }
    }
  ]
}
```

### GET `/api/service-providers/me/matched-requests`
Provider's matched requests:
```json
{
  "requests": [
    {
      "request_id": "uuid",
      "match_score": 87,
      "match_distance_km": 3.2,
      "is_contacted": false,
      "provider_ignored": false
    }
  ]
```

### PATCH `/api/service-requests/[id]/matches/[providerId]`
Actions: `contacted`, `ignored`

## Configuration

### Default Radius
- Provider default: 50km
- Configurable per provider in profile
- Request can specify preferred radius (future)

### Matching Thresholds
- Minimum score for notification: > 0
- Display threshold in UI: ≥ 30
- Top matches shown first (score DESC)

### Batch Size
- Max 500 providers per matching run
- Batch inserts for performance
- Configurable via `MATCH_BATCH_SIZE` env

## Performance

### Indexes
```sql
-- Providers by status + country
CREATE INDEX service_provider_profiles_status_country_idx
  ON service_provider_profiles (status, country_code);

-- Provider categories
CREATE INDEX service_provider_categories_category_idx
  ON service_provider_categories (category_id);

-- Matches by request + score
CREATE INDEX service_request_matches_request_score_idx
  ON service_request_matches (request_id, score DESC);

-- Matches by request + provider
CREATE UNIQUE INDEX service_request_matches_request_provider_unique
  ON service_request_matches (request_id, provider_id);
```

### Query Optimization
- Providers filtered by status + country first (indexed)
- Categories loaded per provider (batchable)
- Distance computed in JS (not SQL) due to D1 limitations
- Consider PostGIS for production scale

## Testing

See `tests/services-matching.test.mjs`:
- Distance calculation accuracy
- Category match requirement
- Country filter
- Radius enforcement
- Same-city fallback
- Urgency scoring
- Budget conflict detection
- Score capping at 100
- Pipeline inserts matches + notifications

## Future Enhancements

1. **PostGIS Integration**: Native spatial queries when on PostgreSQL
2. **ML-Based Ranking**: Learn from acceptance patterns
3. **Real-Time Updates**: WebSocket for live match updates
4. **Availability Calendar**: Provider schedule integration
5. **Multi-Criteria Optimization**: Pareto-optimal matching

---

## Addendum — the documented radius is not the radius that runs

Recorded rather than quietly patched, because the fix is a business decision
and not a technical one.

This document says a provider covers `service_radius_km`, "default 50km",
"configurable per provider in profile". The code does not do that:

```ts
export const PLATFORM_MAX_SERVICE_RADIUS_KM = 10;   // lib/services/match-score.ts

const providerRadius  = toNum(provider.service_radius_km) ?? PLATFORM_MAX_SERVICE_RADIUS_KM;
const effectiveRadius = Math.max(0.1, Math.min(providerRadius, PLATFORM_MAX_SERVICE_RADIUS_KM));
```

`Math.min` makes the platform ceiling the real limit, so:

* **The write path's own default is 50, and the matcher then caps it at 10.**
  A provider who accepts the default is silently reduced to a fifth of the
  coverage the form offered them.
* **"Configurable per provider" is only true downward.** Any value above 10 has
  no effect at all; the column stores a number that changes nothing.
* **Ten kilometres is smaller than the cities being served.** Muscat's built-up
  area spans roughly 50km end to end, so a provider in Seeb is refused a request
  in central Muscat — both parties in the same governorate, both with correct
  coordinates. Where coordinates are missing the `same_city` fallback still
  matches them, which means **supplying an accurate position can lose a provider
  work that omitting it would have won.** That is the wrong incentive to put in
  front of the people filling in the profile.

Two smaller divergences in the same table:

* Distance scoring is documented as `max(0, 30 - distanceKm)`; the code uses
  `max(0, 30 - round(distance * 2))` — twice the decay.
* "Within `service_radius_km` (default 50km)" appears as criterion 4, and there
  are two criteria numbered 4.

**Nothing here has been changed.** Raising the ceiling widens who gets matched
and notified across the whole marketplace, which is a product decision. What has
been added is `tests/services-matching-policy.test.mjs`, which fails if the
constant and this document drift apart again — the divergence above went
unnoticed precisely because nothing tied them together.
