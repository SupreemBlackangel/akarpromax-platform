# PASS C.S.1B — Direct Booking & Full Services Lifecycle Certification

Date: 2026-08-22  
Project: `E:\Akarpromax new 2027\V 2.0 GPT - Copy`  
Runtime Candidate: `http://localhost:3014` only  
Production data modified: **NO**

## Certification result

| Gate | Result | Evidence |
|---|---:|---|
| Direct Booking domain | **PASS** | A booking is created directly in `service_orders` with `source_type = direct_booking`, while `request_id` and `offer_id` are both `NULL`. |
| Direct Booking API | **PASS** | Create, read, transition and review APIs completed on the production standalone runtime. |
| Direct Booking UI | **PASS** | Provider and catalog CTAs respect `instant`, `quote` and `both`; the booking form uses the real API and exposes RFQ as a separate choice. |
| Booking authorization | **PASS** | Guest, cross-customer and cross-provider access was rejected; participant and privileged-role positive cases passed. |
| Booking state machine | **PASS** | Confirm, decline, cancel, schedule, start and complete transitions are enforced server-side; invalid transitions were rejected. |
| Price snapshot | **PASS** | Certified booking retained 45 OMR after the provider category price changed to 80 OMR. |
| Direct Booking E2E | **PASS** | Customer → provider → confirmed → scheduled → in progress → completed → review passed. |
| RFQ E2E | **PASS** | Request → publish → matching → offer → customer acceptance → order → completion → review passed. |
| Provider registration/approval | **PASS** | Isolated provider applications were approved by a moderator; self/customer approval was rejected. |
| Profession/location search | **PASS** | Approved provider was returned for the seeded category and location, while publication guards remained active. |
| Completion + Review | **PASS** | Both Direct Booking and RFQ orders completed and produced rating updates. |
| Privacy API audit | **PASS** | Seven populated public JSON surfaces passed recursive forbidden-key scanning. |
| Authorization matrix | **PASS** | 24 positive and negative HTTP assertions passed across all required roles. |
| Fresh PostgreSQL lifecycle | **PASS** | Empty local DB → bootstrap → Direct Booking + RFQ → idempotent bootstrap rerun, with no manual SQL workaround. |
| Services tests | **138/138** | 138 pass, 0 fail. |
| TypeScript | **PASS** | `tsc --noEmit --incremental false` exited 0. |
| Lint | **PASS** | Focused lint for the complete Services change set and runtime harness exited 0. |
| Build | **PASS** | Next.js 16.3.1 production build completed and generated 89/89 pages. |

## 1. Architecture decision

The existing `service_orders` entity already represented the shared post-selection order lifecycle, so it was extended rather than creating a duplicate order system.

Direct Booking creation remains a separate domain path:

- `source_type = direct_booking`
- `request_id = NULL`
- `offer_id = NULL`
- provider, category, service, schedule, location, contact preference and price snapshot are captured directly

RFQ orders retain:

- `source_type = rfq`
- a real request and accepted offer
- the existing matching and offer lifecycle

This permits both paths to share order history, notifications, completion and reviews after creation without fabricating an RFQ or offer for an instant booking.

The canonical PostgreSQL change is forward migration `0006_pass_cs1b_direct_booking.sql`. It makes the RFQ references nullable, adds the direct-booking snapshot fields, adds provider-category instant pricing/currency, and registers the required indexes and source constraint. Existing migrations were not rewritten.

## 2. Direct Booking state machine

| Current state | Allowed next state | Authorized actor |
|---|---|---|
| `pending_provider` | `confirmed` / `declined` | Assigned provider, authorized Moderator/Admin |
| `pending_provider` | `cancelled` | Owning customer, authorized Moderator/Admin |
| `confirmed` | `scheduled` | Assigned provider, authorized Moderator/Admin |
| `confirmed` / `scheduled` | `cancelled` | Owning customer, assigned provider, authorized Moderator/Admin |
| `scheduled` | `in_progress` | Assigned provider, authorized Moderator/Admin |
| `in_progress` | `completed` | Assigned provider, authorized Moderator/Admin |
| `completed` | review | Owning customer only; one review per order |

Terminal states `declined`, `cancelled` and `completed` reject further lifecycle transitions. Every transition is conditional at the database boundary and produces timeline/audit events; supported notification infrastructure is also called.

## 3. APIs and UI wiring

Direct Booking uses dedicated endpoints:

- `POST /api/service-bookings`
- `GET /api/service-bookings/[id]`
- `PATCH /api/service-bookings/[id]/status`
- `POST /api/service-bookings/[id]/review`

Compatibility job/order views detect direct bookings and delegate to the same protected booking domain instead of permitting a generic status bypass.

UI routing behavior:

- `booking_mode = instant`: Direct Booking CTA
- `booking_mode = quote`: RFQ CTA
- `booking_mode = both`: both choices are visible and explicit

The booking page captures service/provider, location, requested date/time, current price snapshot, contact method and confirmation. A browser check against 3014 showed the two paths, 80 OMR current price, a complete booking form, and zero console errors.

## 4. Runtime E2E evidence

All mutable records use isolated local test identities and the disposable PostgreSQL database `akarpromax_cs1b_20260822_1`.

### Direct Booking

- Booking: `8f2a8a56-7918-4466-8260-8043be2c321b`
- Source: `direct_booking`
- Request: `NULL`
- Offer: `NULL`
- Lifecycle: `pending_provider → confirmed → scheduled → in_progress → completed → reviewed`
- Snapshot: 45 OMR
- Provider price after booking: 80 OMR
- Booking price after provider update: 45 OMR
- Decline branch: PASS
- Customer cancellation branch: PASS
- Moderator/Admin cancellation branches: PASS
- Invalid transition assertions: PASS
- Staged location/contact privacy: PASS

### RFQ regression

- Request: `77708c5f-2dae-426b-9e88-2b481f2773cf`
- Matched providers: 8
- Offer: `9eeddca1-4856-4ac3-b6e1-fe25999bc54e`
- Order: `9e65c8c4-064d-4c38-a0e7-9e7a845ec14b`
- Source: `rfq`
- Lifecycle: `draft → published → matching → offer → accepted → scheduled → in_progress → delivered → completed → reviewed`

No Direct Booking record created a request or offer, and the RFQ order retained both real references.

## 5. Authorization matrix

| Role | Positive assertions | Negative assertions |
|---|---|---|
| Guest | Public categories = 200 | Admin = 403; provider mutation = 401; create/read private booking = 401 |
| Customer A | Read own booking; create/select/review own work | Provider approval = 403; provider-only confirmation rejected |
| Customer B | Read and cancel own booking | Read Customer A booking = 403; accept Customer A RFQ offer = 403 |
| Provider A | Read/transition its assigned booking; submit matched RFQ offer | Self approval = 403 |
| Provider B | Its own provider lifecycle remains available | Read or accept Provider A booking = 403 |
| Moderator | Approve providers; read any booking; cancel pending booking | Accept customer-owned RFQ offer = 403 |
| Admin | Read any booking; cancel pending booking | Accept customer-owned RFQ offer = 403 |

The customer and assigned provider are checked against the authenticated server identity, never a caller-supplied identity. Moderator/Admin access is permission-based. Privileged visibility does not transfer customer-only business actions such as choosing an RFQ offer.

## 6. Privacy controls

Public provider, professional compatibility, provider search, listings collection, listing detail and reviews use explicit allowlist DTOs. The audit recursively rejected the following categories wherever nested:

- email, phone and WhatsApp
- user/provider/reviewer/reviewee identifiers
- tax number
- exact latitude/longitude
- customer private identity, contact or location

The seven populated public audit surfaces all passed:

- provider detail
- rated provider detail with embedded public reviews
- provider search
- professional compatibility route
- listings collection
- listing detail
- public reviews

Unapproved providers remain absent from public provider detail/search. Exact booking location and customer-selected contact data are absent from public APIs and hidden from the assigned provider until confirmation. An unrelated provider and unrelated customer cannot obtain the private booking DTO at any stage.

## 7. Fresh PostgreSQL evidence

The isolated database started empty and was processed only by the canonical bootstrap/migration path:

| Check | Result |
|---|---:|
| Bootstrap exit | 0 |
| Identity schema | v5 ready |
| Public tables | 106 |
| Service categories | 48 |
| Forward migrations | 7 |
| Missing runtime tables | 0 |
| Direct Booking lifecycle | PASS |
| RFQ lifecycle | PASS |
| Bootstrap after lifecycles | exit 0 / ready / 7 migrations |

The database contains genuine isolated `direct_booking` and `rfq` orders. No production connection or production record was used. No manual SQL workaround was applied to make bootstrap or either lifecycle pass.

## 8. Root causes and repairs

1. **No independent Direct Booking entry path.** Existing UI/actions flowed toward request/offer infrastructure. A dedicated booking domain and APIs now create direct orders without RFQ artifacts.
2. **No immutable provider price at booking time.** Provider-category instant price/currency and order snapshot fields now preserve the agreed value.
3. **Generic job mutations could bypass booking rules.** Direct orders are routed through the protected transition engine.
4. **Compatibility professional detail returned a separate raw query.** It now delegates to the canonical public provider DTO and approval guard.
5. **PostgreSQL update-result ambiguity.** The Services conditional transition update now uses `RETURNING id`, allowing the runtime adapter to distinguish a successful transition from a rejected race/invalid state without changing the shared database runtime.
6. **Two test guards described the pre-Direct schema/API.** They were updated to the canonical `0006` journal and embedded-public-review contract; no migration was moved backward.

## 9. Validation

- Focused Direct Booking tests: **7/7**
- Focused Services repair/contract tests: **26/26**
- Full isolated Services suite: **138/138**
- TypeScript: **PASS**
- Focused Services lint: **PASS**
- Production build: **PASS**
- Production standalone runtime on 3014: **PASS**
- `GET /services`: **200**
- Public categories: **200**
- Guest admin: **401**
- Guest provider-status mutation: **401**
- Browser console errors: **0**

Repository-wide lint remains unsuitable as a trustworthy gate because the current command traverses generated, backup and desktop distribution trees; changing global lint scope is outside this Services-only pass. Every source file changed by PASS C.S.1B, including the E2E harness, passed focused lint.

## 10. Classification and scope

Services Marketplace is classified **IMPROVED** because the current project now provides and runtime-certifies two real, independent creation paths through completion and review, with stronger authorization and privacy than the preserved V1 behavior.

Only capability rows actually proved by this certification were reclassified. Vehicle services, land analysis, DXF export, sentiment processing and unexercised portfolio-upload behavior retain their previous PASS B classifications.

## Final

**PASS C.S.1B = PASS**
