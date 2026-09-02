# Services marketplace — current system map

STAGE 0 discovery. Measured on 2026-09-02 against the production database and
the `refactor/architecture-foundation` branch. Nothing in this document is
inferred from naming; every claim below was checked.

---

## The headline finding

**The services marketplace is fully built and completely unused.**

Production row counts:

| Table | Rows |
|---|---|
| `service_categories` | **48** |
| `service_marketplace_settings` | 2 |
| `service_message_threads` | 1 |
| `service_provider_profiles` | **0** |
| `service_requests` | **0** |
| `service_offers` | **0** |
| `service_orders` | **0** |
| `service_reviews` | **0** |
| `service_provider_documents` | **0** |
| `service_request_matches` | **0** |
| `service_listings`, `service_disputes`, `service_bookmarks`, `service_notifications`, `service_job_timeline`, `service_reports`, `service_offer_revisions`, `service_request_answers`, `service_request_attachments`, `service_request_status_history`, `service_outbox_events`, `service_provider_categories`, `service_provider_portfolio` | **0** |

There are no providers, no requests, no offers, no orders and no reviews. Only
the category taxonomy is populated.

This changes what the work is. The mandate's rules about not breaking production
data and preserving existing records cost almost nothing here, because there are
no records. The real question is not "how do we refactor around live users" but
**"why has a system this complete never carried a single transaction"** — and
the answer will be found in the flow, not in the schema.

---

## Routes

### Public

| Route | Notes |
|---|---|
| `/providers` | Client component, 110 lines, fetches providers + categories after mount |
| `/providers/[id]` | Provider profile |
| `/providers/apply` | Provider registration entry |
| `/services` | Service hub |
| `/services/catalog`, `/services/catalog/[code]` | Catalog |
| `/services/categories` | Category browse |
| `/service-requests`, `/new`, `/[id]`, `/[id]/matches`, `/[id]/offer`, `/[id]/history` | Request lifecycle |
| `/service-bookings/new` | Direct booking |
| `/messages`, `/messages/[id]` | Conversations |

All three checked live return HTTP 200: `/providers`, `/services`,
`/providers/apply`.

### Customer dashboard

`/dashboard/services` plus `my-requests`, `offers`, `offers/[id]`, `favorites`,
`inbox`, `notifications`, `reviews`, `disputes`.

### Provider dashboard

`/dashboard/services` plus `provider-profile`, `matched-requests`, `jobs`,
`jobs/[id]`, `offers`, `inbox`, `reviews`.

### Supervisor / admin

`/dashboard/services/supervisor` plus `providers`, `requests`, `verification`.
Separately `/admin/services`.

**Observation:** provider and customer share the `/dashboard/services` root and
are separated by sub-route rather than by a distinct provider workspace. Whether
that is a problem depends on the role model; it is noted, not judged.

---

## APIs

### Canonical family — `/api/service-*`

Forty-plus routes covering providers, requests, offers, jobs, messages, reviews,
bookings, disputes, notifications, bookmarks, reports, analytics, categories,
marketplace settings and dashboard counts.

### Compatibility family — `/api/services/*`

`requests`, `requests/[id]`, `requests/[id]/offers`, `listings`, `listings/[id]`,
`messages`, `reviews`, `disputes`, `orders/[id]`, `orders/[id]/review`,
`categories`.

These are **not** a second implementation. Each is a ~25-line proxy that
rewrites the path and re-issues the request:

```ts
function proxyToCanonical(request: NextRequest, canonicalPath: string) {
  const url = new URL(request.url);
  url.pathname = canonicalPath;
  ...
  return fetch(url.toString(), { method: request.method, headers, ... });
}
```

That is better than a fork — there is one implementation — but it costs a full
HTTP round trip from the server to itself on every call: double the latency,
double the connections, and the whole request body buffered twice. It is a
performance defect, not a correctness one.

**Exception:** `/api/services/listings` and `/api/services/listings/[id]` do
**not** proxy — they import `lib/services/core.ts` directly, which is the
older domain module (see below).

---

## Domain layer — `lib/services/` (6,941 lines)

| Module | Lines | Status |
|---|---|---|
| `marketplace.ts` | 2,395 | **The real domain layer** — 52 importers |
| `seed-marketplace.ts` | 741 | Demo seeding |
| `core.ts` | 557 | **Older parallel module** — 4 importers |
| `booking.ts` | 307 | Direct booking |
| `contracts/contract.service.ts` | 270 | |
| `state-machine.ts` | 259 | **Dead code — zero importers** |
| `compat/services-api.ts` | 254 | |
| `match-score.ts` + `matching.ts` + `matching/professional.matcher.ts` | 418 | Matching |
| `constants.ts` | 158 | Contains a **second** state machine |
| `verification/verification-policies.ts` | **21** | See below |

Service classes named in the mandate (`ProviderService`,
`ProviderVerificationService`, `ServiceRequestService`, `QuoteService`,
`SchedulingService`, `NotificationService`) do not exist as such. The equivalent
logic lives as exported functions in `marketplace.ts`. That is a naming
difference, not necessarily an architectural fault — the separation the mandate
actually asks for is business logic outside components, and that is largely
satisfied.

---

## Root cause candidates

### 1. Two state machines, and the better one is dead

`lib/services/state-machine.ts` defines canonical statuses and full transition
tables for **five** entities — request, offer, order, provider, dispute — with
`canTransition*`, `getValidNext*` and `isTerminal*` for each. It is imported by
**nothing**. Verified: `grep -rln "state-machine"` across `app/`, `lib/` and
`src/` returns no results.

`lib/services/constants.ts` defines a **second**, lowercase state machine
(`REQUEST_FLOW`, `ORDER_FLOW`) with its own `canTransitionRequest` and
`canTransition`.

Of all of it, exactly **one** transition guard is enforced anywhere:

```
lib/services/core.ts:417        if (!canTransition(order.status, to)) throw new Error("ORDER_STATUS_INVALID");
lib/services/marketplace.ts:1533 if (!canTransition(order.status, to)) throw new Error("ORDER_STATUS_INVALID");
```

Both are the **order** machine, and the two call sites are themselves duplicates
of each other. `canTransitionRequest` — in either file — is called **nowhere**.
Request, offer, provider and dispute status changes are therefore unguarded: any
status can move to any other.

The two machines also genuinely disagree. For an order `IN_PROGRESS`:

| | `state-machine.ts` | `constants.ts` (the live one) |
|---|---|---|
| → `DELIVERED` | ✗ not allowed | ✓ allowed |
| → `DISPUTED` | ✓ allowed | ✗ **not allowed** |

So under the machine actually in force, **a job in progress cannot be disputed**.
A customer must wait for the provider to mark it delivered first. That is a
product-level consequence of a merge artefact, and it is exactly the kind of
thing Rule 10 exists to prevent.

### 2. Verification is 21 lines

`lib/services/verification/verification-policies.ts` is the entire verification
policy layer. The mandate's STAGE 4 asks for a verification state machine,
levels, per-country and per-provider-type document requirements, expiry,
reverification, suspension, revocation and an audit trail. `PROVIDER_TRANSITIONS`
exists in the dead `state-machine.ts` and is enforced nowhere.

`service_provider_documents` exists as a table with zero rows. Whether document
storage is private, access-controlled and signed is **not yet verified** — that
is the first thing STAGE 5 must establish, and it is a security gate.

### 3. `core.ts` and `marketplace.ts` overlap

Both contain an identical order-transition guard at `core.ts:417` and
`marketplace.ts:1533`. `core.ts` has 4 importers, two of which are the
non-proxying `/api/services/listings` routes. This is a partially completed
migration: most callers moved to `marketplace.ts`, a few did not.

### 4. Schema split

`service_*` tables live in the `akarpromax` schema. `search_path` is
`public, akarpromax`. The ads subsystem was found to have been silently
shadowed by empty `public` duplicates created by `CREATE TABLE IF NOT EXISTS`
(see `docs/ads-campaign-delivery.md`). **The services tables have not yet been
audited for the same hazard** — this must be checked before any migration runs,
because a migration that creates a table in `public` would strand the 48
categories exactly as it stranded 140 ad impressions.

---

## Baseline

| Check | Result |
|---|---|
| **Build** | ✅ passes (`npm run build`, exit 0) |
| **Typecheck** | ✅ clean (`tsc --noEmit`, exit 0) |
| **Lint** | ⚠️ **2 errors**, 221 warnings |
| **Tests** | 72 test files present; the ads suite runs 99/99 green |

The two lint errors, both pre-existing and both the same rule:

```
app/properties/search/page.tsx:72   setState synchronously within an effect
src/contexts/GeoContext.tsx:404     setState synchronously within an effect
```

`GeoContext` is used by the services pages, so its cascading-render error is
directly relevant to marketplace performance (STAGE 23).

---

## What is missing, what exists, what is broken

**Exists and works:** route surface, canonical API family, category taxonomy
(48 rows), domain layer outside components, matching module, geo contract,
message threading, a well-designed state machine.

**Exists but is not wired:** `state-machine.ts` entirely; request, offer,
provider and dispute transition guards; `PROVIDER_TRANSITIONS`.

**Broken or harmful:** a job in progress cannot be disputed; `/api/services/*`
self-`fetch` per call; two overlapping domain modules; two contradictory state
machines.

**Missing:** verification levels, document requirements by country and provider
type, expiry and reverification, verification audit trail; confirmation that
document storage is private and access-controlled; any evidence the end-to-end
flow has ever completed.

---

## Recommended stage order (revised from the mandate)

The mandate's order assumes a live marketplace being repaired. With zero rows,
the risk profile is inverted: schema work is cheap, and the unknown is whether
the journey works at all. Rule 13 asks that a mismatch be recorded rather than
worked around, so:

1. **Security gate first.** STAGE 5 (document storage) before STAGE 4
   (verification), because it is the only finding that could already be
   exploitable and it gates everything else.
2. **Consolidate the state machines** (STAGE 1–2) before any UI work. One
   machine, enforced at every transition, with the dispute regression fixed.
3. **Walk the journey end to end** (STAGE 27) *early*, not last, on the
   existing UI. With no data, an integration walk is the cheapest way to find
   where the flow actually stops — and that answer should shape STAGES 3–18
   rather than being discovered after them.
4. Then registration, verification, profiles, marketplace, requests, matching,
   quotes, messaging, scheduling, tracking, reviews, dashboards, admin.
5. Design system and visual work (STAGES 19–22) last, as the mandate already
   specifies.

Deferring the visual redesign is not a reduction in scope — it is the mandate's
own Definition of Done, which states the work is not complete merely because
`/providers` became beautiful.
