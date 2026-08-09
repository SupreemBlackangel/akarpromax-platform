# Services E2E Certification

## Runtime Marketplace Journey

### Listings

- Service listing: `PASS`
  - `GET /api/services/listings` -> `200`
- Service listing detail: `PASS`
  - `GET /api/services/listings/:id` -> `200`
- Filters: `PASS`
  - `country`, `cityId`, `status` verified live
- Pagination: `PASS`
  - `limit` / `offset` verified live
- Invalid query: `PASS`
  - bad `limit` -> `400 services.invalid_query`

### Customer Request

- Request create: `PASS`
  - `POST /api/services/requests` -> `201`
- Request detail: `PASS`
  - `GET /api/services/requests/:id` -> `200`
- Request publish: `PASS`
  - `POST /api/service-requests/:id/publish` -> `200`

### Matching / Offers

- Matching: `PASS`
  - `GET /api/service-requests/:id/matching` -> `200`
- Provider offer create: `PASS`
  - `POST /api/services/requests/:id/offers` -> `201`
- Customer offers read: `PASS`
  - `GET /api/services/requests/:id/offers` -> `200`
- Accept offer: `PASS`
  - `POST /api/service-offers/:id/accept` -> `201`
- Decline offer: `PASS`
  - `POST /api/service-offers/:id/decline` -> `200`
- Double-accept protection: `PASS`
  - second accept on non-sent offer -> `400 services.offer_not_sent`

### Job / Completion / Review

- Job/order creation: `PASS`
  - accept created `service_orders` row; job detail read live via `GET /api/service-jobs/:id`
- Completion lifecycle: `PASS`
  - provider -> `in_progress`
  - provider -> `waiting_customer_confirmation`
  - customer -> `completed`
- Review: `PASS`
  - `POST /api/service-jobs/:id/review` -> `201`

## Security

- Anonymous offer create: `PASS`
  - `401 services.unauthorized`
- Non-customer accept denial: `PASS`
  - `403 services.only_customer`
- Provider cross-edit denial: `PASS`
  - `POST /api/service-offers/:id/revise` from another provider -> `403 services.only_provider`

## Arabic / Unicode

- Arabic Unicode round-trip: `PASS`
  - Real D1 storage contains correct Arabic strings.
  - Node UTF-8 API client confirms exact equality for seeded Arabic payloads.
  - Mojibake observed in PowerShell output was a display artifact, not DB/API corruption.

## Identity Model

- Current persistence key: `Mixed`
  - Auth: stable UUID `users.id`
  - AMRS: stable UUID member/owner references
  - Services runtime persistence: legacy email-keyed participant fields
- Stable identity model: `SAFE LEGACY COMPATIBILITY`
  - Added `lib/services/identity.ts`
  - Email-change confirmation now rekeys services-owned user references from old email to new email
- Email-change safety: `PASS`
  - Verified live: old login fails, new login succeeds after email-change confirmation
  - Verified live/direct-D1: provider profile and historical offer/revision references rekeyed to the new email

## Geo Matching

- Coordinates: `PASS`
  - synthetic coordinate-bearing request created live
- `distance_km`: `PASS`
  - live matches returned numeric distances (`6.78km`, `14.65km`)
- Radius: `PASS`
  - provider4 was given the same category but excluded from matches while nearer in-radius providers were included
- Ranking: `PASS`
  - nearer provider ranked above farther provider for the same category
- Category respected: `PASS`
  - only providers with the `cleaning` category appeared in the geo fixture

## Completion Lifecycle Product Audit

- Provider completion claim: `YES`
- Customer confirmation: `YES`
- Completed verified state: `YES`
- Completed unconfirmed state: `YES` (`waiting_customer_confirmation`)
- Completion dispute: `YES`
  - order is a valid `service_reports` target and `disputed` state exists
- Review requires verified/valid interaction: `YES`
  - review route requires an existing completed order

## Summary Matrix

- Service listing: `PASS`
- Service listing detail: `PASS`
- Request create: `PASS`
- Request detail: `PASS`
- Matching: `PASS`
- Provider offer: `PASS`
- Customer offers read: `PASS`
- Accept offer: `PASS`
- Decline offer: `PASS`
- Double-accept protection: `PASS`
- Job/order creation: `PASS`
- Completion: `PASS`
- Review: `PASS`
- Arabic Unicode round-trip: `PASS`
- Stable identity model: `SAFE LEGACY COMPATIBILITY`
- Geo-distance matching: `PASS`
