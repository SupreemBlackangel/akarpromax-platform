# Services API Inventory

## Canonical API Endpoints

All canonical endpoints under `/api/service-*` with consistent patterns:

### Authentication
- Session-based via `akar_session` HttpOnly cookie
- `getSessionIdentity()` resolves identity from session
- Returns `SponsorIdentity` with `authenticated`, `email`, `displayName`, `role`, `countryCode`, `permissions[]`

### Permission Checks
Every endpoint uses `hasSponsorPermission(identity, PERMISSION)`:
- Returns `true` if permission in identity.permissions or `*` wildcard
- Super admin has all permissions via `*`

### Error Codes (`SERVICE_ERROR_CODES`)
| Code | HTTP | Description |
|------|------|-------------|
| `UNAUTHORIZED` | 401 | No valid session |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `INVALID_BODY` | 400 | Invalid request payload |
| `NOT_FOUND` | 404 | Entity not found |
| `CONFLICT` | 409 | State conflict (e.g., duplicate offer) |
| `CATEGORY_CONFLICT` | 409 | Duplicate category code |
| `REQUEST_NOT_FOUND` | 404 | Request not found |
| `REQUEST_NOT_OPEN` | 409 | Request not in valid state |
| `OFFER_NOT_FOUND` | 404 | Offer not found |
| `OFFER_NOT_SENT` | 409 | Offer not in sent state |
| `OFFER_ALREADY_EXISTS` | 409 | Duplicate active offer |
| `OFFER_EXPIRED` | 409 | Offer past valid_until |
| `ORDER_NOT_FOUND` | 404 | Order not found |
| `ORDER_STATUS_INVALID` | 409 | Invalid state transition |
| `ONLY_CUSTOMER` | 403 | Action restricted to customer |
| `ONLY_PROVIDER` | 403 | Action restricted to provider |
| `NOT_PARTICIPANT` | 403 | User not part of entity |
| `REVIEW_ALREADY_EXISTS` | 409 | Duplicate review |
| `RATING_INVALID` | 400 | Rating out of 1-5 range |
| `DISPUTE_ALREADY_EXISTS` | 409 | Open dispute exists |
| `DISPUTE_NOT_FOUND` | 404 | Dispute not found |
| `CATEGORY_CONFLICT` | 409 | Duplicate category |
| `CATEGORY_HAS_CHILDREN` | 409 | Cannot delete parent category |
| `CATEGORY_IN_USE` | 409 | Category referenced by entities |
| `LISTING_NOT_FOUND` | 404 | Listing not found |
| `INVALID_QUERY` | 400 | Invalid query parameters |

### Request/Response Patterns

#### List Endpoints (GET)
```
GET /api/service-requests?country=OM&city=om-muscat&categoryId=xxx&status=published&limit=20
```
Response:
```json
{
  "requests": [...],
  "pagination": { "limit": 20, "hasMore": false }
}
```

#### Create Endpoints (POST)
```
POST /api/service-requests
Content-Type: application/json

{
  "categoryId": "xxx",
  "countryCode": "OM",
  "cityId": "om-muscat",
  "title": "AC repair",
  "description": "...",
  "budgetMin": 20,
  "budgetMax": 100
}
```
Response:
```json
{ "ok": true, "id": "uuid" }
```

#### Action Endpoints (PATCH)
```
PATCH /api/service-requests/uuid
{
  "action": "cancel" | "acceptOffer",
  "offerId": "uuid"  // for acceptOffer
}
```

### Pagination
- `limit` query param (default 50, max 100)
- Offset-based via `cursor` or `page` (implementation varies)
- Returns `{ items: [], hasMore: boolean }` or `{ items: [], pagination: { limit, hasMore } }`

### Filtering
Common filters across list endpoints:
- `country` / `countryCode` (ISO 3166-1 alpha-2)
- `city` / `cityId` (internal city code)
- `categoryId` (category UUID)
- `status` (entity-specific status values)
- `customerUserId` / `providerUserId` (ownership filter)

### Date Filtering
- `startAt` / `endAt` (ISO 8601)
- `createdAt` range via `startAt`/`endAt` params

### Sorting
- Default: `created_at DESC` or `updated_at DESC`
- Some endpoints support `sort` param (e.g., `price`, `rating`, `distance`)

## Service Requests API

### GET `/api/service-requests`
List requests with filters.
Query: `countryCode`, `cityId`, `categoryId`, `status`, `customerUserId`, `limit`

### POST `/api/service-requests`
Create new request.
Body: `categoryId`, `countryCode`, `cityId`, `districtId`, `titleKey`, `descriptionKey`, `budgetMin`, `budgetMax`, `currency`, `latitude`, `longitude`

### GET `/api/service-requests/[id]`
Get request with offers.

### PATCH `/api/service-requests/[id]`
Actions: `cancel`, `acceptOffer` (requires `offerId`)

### POST `/api/service-requests/[id]/publish`
Publish draft request, triggers matching.

### GET `/api/service-requests/[id]/matches`
Get matched providers with scores.

### PATCH `/api/service-requests/[id]/matches/[providerId]`
Actions: `contacted`, `ignored`

### GET `/api/service-requests/[id]/history`
Status transition history.

## Service Offers API

### GET `/api/service-offers`
List offers. Filters: `mine=1` (own), `limit`

### POST `/api/service-offers`
Create offer. Body: `requestId`, `price`, `currency`, `durationDays`, `messageKey`, `listingId`, `materialsIncluded`, `materialCost`, `laborCost`, `visitFee`, `taxAmount`, `totalPrice`, `durationText`, `nearestDate`, `offerNotes`, `terms`, `validUntil`, `needsVisit`

### GET `/api/service-offers/[id]`
Get offer with revisions.

### PATCH `/api/service-offers/[id]`
Actions: `accept`, `decline`, `revise`, `withdraw`

### POST `/api/service-offers/[id]/accept`
Accept offer (customer only).

### POST `/api/service-offers/[id]/decline`
Decline offer (customer only).

### POST `/api/service-offers/[id]/revise`
Revise offer (provider only).

### POST `/api/service-offers/[id]/withdraw`
Withdraw offer (provider only).

## Service Providers API

### GET `/api/service-providers`
List providers. Filters: `status`, `countryCode`, `cityId`, `categoryId`, `search`, `limit`

### POST `/api/service-providers`
Create/update provider profile. Body: all profile fields.

### GET `/api/service-providers/me`
Current user's provider profile.

### GET `/api/service-providers/[id]`
Get provider profile with categories, documents, portfolio.

### PATCH `/api/service-providers/[id]`
Update profile fields.

### PATCH `/api/service-providers/[id]/status`
Update verification status (admin/supervisor). Body: `status`, `note`

### GET `/api/service-providers/[id]/categories`
Get provider's categories with pricing.

### POST `/api/service-providers/[id]/categories`
Add/update category. Body: `categoryId`, `priceFrom`, `priceTo`, `pricingUnit`, `minDurationMin`, `notes`

### DELETE `/api/service-providers/[id]/categories/[categoryId]`
Deactivate category.

### GET `/api/service-providers/[id]/documents`
List documents.

### POST `/api/service-providers/[id]/documents`
Upload document. Body: `type`, `fileName`, `fileUrl`, `fileSize`, `mimeType`, `notes`

### PATCH `/api/service-providers/[id]/documents/[docId]`
Verify document. Body: `verified` (boolean)

### GET `/api/service-providers/[id]/portfolio`
List portfolio items.

### POST `/api/service-providers/[id]/portfolio`
Add portfolio item. Body: `title`, `description`, `imageUrl`, `categoryId`, `cityId`, `year`, `tags`, `isFeatured`

### GET `/api/service-providers/me/matched-requests`
Get matched requests for authenticated provider. Query: `status`, `limit`

### PATCH `/api/service-providers/[id]/apply`
Submit application for verification.

## Service Categories API

### GET `/api/service-categories`
List categories. Query: `country` (default OM), `includeInactive`

### POST `/api/service-categories`
Create category. Body: `countryCode`, `code`, `parentId`, `nameAr`, `nameEn`, `nameTr`, `descriptionAr`, `descriptionEn`, `descriptionTr`, `icon`, `imageUrl`, `requiresLicense`, `requiresVisit`, `priceMin`, `priceMax`, `dynamicFields`, `sortOrder`

### GET `/api/service-categories/[id]`
Get category with parsed dynamic fields.

### PATCH `/api/service-categories/[id]`
Update category. Body: all fields optional.

### DELETE `/api/service-categories/[id]`
Delete category (fails if has children or in use).

## Notifications API

### GET `/api/service-notifications`
List notifications. Query: `limit` (default 50, max 100)

### GET `/api/service-notifications/[id]/read`
Mark notification read.

### POST `/api/service-notifications/read-all`
Mark all unread as read.

## Service Jobs API

### GET `/api/service-jobs`
List jobs. Filters: `participantUserId`, `status`, `limit`, `role` (customer|provider)

### GET `/api/service-jobs/[id]`
Get job with timeline, messages, reviews.

### PATCH `/api/service-jobs/[id]/status`
Update job status. Body: `status` (OrderStatus)

### GET `/api/service-jobs/[id]/timeline`
Get job timeline events.

### GET `/api/service-jobs/[id]/review`
Get reviews for job.

### POST `/api/service-jobs/[id]/review`
Create review. Body: `rating`, `comment`, `qualityRating`, `punctualityRating`, `communicationRating`, `valueRating`, `recommend`

## Service Messages API

### POST `/api/service-messages`
Send message. Body: `threadType` (request|order), `threadId`, `body`, `recipientUserId`

### GET `/api/service-messages`
List threads for user.

### GET `/api/service-messages/threads/[threadType]/[threadId]`
Get thread messages.

## Service Reports API

### GET `/api/service-reports`
List reports. Filters: `status`, `targetType`, `limit`

### POST `/api/service-reports`
Create report. Body: `targetType`, `targetId`, `reason`, `description`

### POST `/api/service-reports/[id]/resolve`
Resolve report. Body: `resolution`, `action`

## Admin API

### GET `/api/service-admin`
Admin overview stats.

## Rate Limiting
All endpoints use `enforceRateLimit` with operation-specific limits:
- `service_request_create`: 10/min
- `service_offer_create`: 20/min
- `service_notification_read`: 100/min
- Default: 60/min

## Security Headers
All responses include:
- `Content-Security-Policy`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

## CORS
- Allowed origins from `appOrigin` config
- Credentials included
- Preflight handled via OPTIONS