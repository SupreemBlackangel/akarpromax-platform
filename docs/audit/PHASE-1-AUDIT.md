# PHASE 1 — Audit: Ads, Services, Providers, Admin

Date: 2026-09-04. Read-only inventory. No behaviour was changed to produce it.

The one exception to "audit before code" was taken deliberately and is recorded
in [§0](#0-the-exception-taken-before-this-audit): approved ads were invisible
in production and had been reported as urgent.

---

## 0. The exception taken before this audit

Approved campaigns were not appearing. Four defects, found by following the data
rather than reading the code. All four are fixed and covered by
`tests/ads-approval-publishes.test.mjs`.

| # | Defect | Evidence |
|---|---|---|
| 1 | Approval never set `status` | `status = CASE WHEN ? THEN 'active' …` — Postgres needs a boolean; a bound 1/0 is not one. Reproduced live: *argument of CASE/WHEN must be type boolean, not type integer* |
| 2 | Editing silently unpublished | An editor without `ADS_PUBLISH` had `status` forced to `draft`, taking a live campaign off the site |
| 3 | Every failure looked like an empty result | `catch {}` → `200 { ads: [] }` in `/api/ads/match` |
| 4 | Cache key omitted matching fields | Keyed without `pageType`, `channel`, `deviceType`, `operatingSystem` — all consulted by the matcher |

Two live campaigns were repaired in a transaction touching only rows already
`approved` + `is_active = 1` but left in `draft`. The one `pending` campaign was
not touched.

**Still open:** `/api/ads/match` had not yet returned an ad at the time of
writing. The swallowed-error fix is what will name the remaining cause; it is
deployed for that purpose. **No claim is made that ads render until that is
seen.**

---

## 1. What exists

Substantial and mostly wired to real APIs. This is not a greenfield.

* **Ads**: 15 API routes under `/api/ads*`, `/api/ad-assets`, `/api/ad-events`,
  `/api/admin/ads*`. A real matching engine (`lib/ads/engine.ts`) with fourteen
  eligibility checks, budget and frequency capping, signed tracking tokens and a
  nonce ledger.
* **Services**: ~50 canonical `/api/service-*` routes plus a `/api/services/*`
  compatibility family that forwards to them in-process.
* **Providers**: application, documents, portfolio, categories, status review.
* **Admin**: ~20 sections, most genuinely calling their APIs.
* **Provider dashboard**: 17 pages under `app/dashboard/services`.

---

## 2. What is broken

### 2.1 `/api/ad-events` accepts anything from anyone

`app/api/ad-events/route.ts:12` — POST with **no authentication, no permission,
and no rate limit**. It writes ad events, which feed impression and click
counts, which feed budget exhaustion and billing.

Anyone able to send a POST can inflate or exhaust any campaign's budget. Note
that `/api/ads/impression` and `/api/ads/click` *are* rate-limited and use
signed tracking tokens — this route is the unguarded sibling.

**Severity: highest in this report.**

### 2.2 `/api/ads/conversion` is not rate limited

`app/api/ads/conversion/route.ts:8` — public, unlike its siblings which call
`limitOr429`. Conversions are the most valuable event to forge.

### 2.3 An entire admin subtree calls routes that do not exist

`app/admin/advertising/**` — four pages calling four missing endpoints:

| Page | Calls | Exists |
|---|---|---|
| `advertising/page.tsx:26` | `/api/admin/advertising/stats` | no |
| `advertising/campaigns/page.tsx:18` | `/api/advertising/campaigns` | no |
| `advertising/featured/page.tsx:17` | `/api/advertising/featured` | no |
| `advertising/news-ticker/page.tsx:17` | `/api/advertising/news-ticker` | no |

Plus dead links to `/admin/advertising/analytics`, `…/campaigns/new`,
`…/featured/new`, `…/news-ticker/new`.

### 2.4 Eight sidebar links lead nowhere

`src/config/sidebar.ts:104–111` points at `/admin/services/{requests,categories,
providers,verifications,offers,reviews,disputes,settings}`. **None exist** — only
`app/admin/services/page.tsx` does. Every one is a 404 from the main navigation.

### 2.5 `/api/advertising/*` is a second, unguarded ads API

`app/api/advertising/match/route.ts` (GET, POST) and `/track/route.ts` (POST) —
no auth, no permission, and POST reads `request.json()` with no validation.
Different response envelope (`{success, data}`) from the `/api/ads/*` family.

---

## 3. What is duplicated

### 3.1 Two complete ads stacks

| | Engine stack | Legacy stack |
|---|---|---|
| Components | `src/components/AdSlot.tsx`, `ads/ad-slot-frame.tsx` | `components/advertising/placements/*` |
| API | `/api/ads/match`, `/impression`, `/click` | `/api/advertising/match`, `/track` |
| Used by | public shell, standard layout | `app/companies/[id]`, `app/offices/[id]`, `app/tools/*` |

### 3.2 Placement definitions in four files

**Corrected after PHASE 3 looked properly.** These are not four competing
registries, which is how this section first read. They are layers, and the
layering is defensible:

| File | Role |
|---|---|
| `src/constants/advertising.ts` | `AD_PLACEMENTS` — the vocabulary the engine validates. The only source of truth |
| `standard-public-ad-registry.ts` | families x slots, which **generate** part of that vocabulary |
| `standard-public-ad-layout.ts` | which slots appear on which page |
| `src/config/ad-placements.ts` | shell slot configs, each naming a placement from the vocabulary |

What was missing was anything checking that the layers agree. Two real
consequences followed, both now fixed and guarded by
`tests/ads-placement-registry.test.mjs`:

* `AD_PLACEMENT_REGISTRY.HOME_HERO` named the **empty string**. `isValidPlacement("")`
  is false, so flipping its `used` flag would have rendered a slot that calls the
  API, is refused, and shows nothing with no error saying why.
* The legacy components pass `left_01`, `right_01`, `bottom_01` — **none of which
  are valid placements**. They work only because `/api/advertising/match`
  translates them using the page name. Every current caller resolves correctly
  (verified: `company-detail`, `office-detail`, `tools` are all known families),
  so **nothing is broken today**; the mapping was simply implicit and unchecked,
  and a page whose name is not a known family would render a slot that can never
  fill, silently.

The original wording of this section is left below for the record.

### 3.2b Original wording: four placement registries

1. `src/config/standard-public-ad-registry.ts` — 22 families × 8 slots
2. `src/config/standard-public-ad-layout.ts` — the cross-product
3. `src/constants/advertising.ts:287` — `AD_PLACEMENTS`, what `isValidPlacement`
   actually checks, merging ~45 legacy literals + generated + shell keys
4. `src/config/ad-placements.ts` — a fourth registry calling itself "Phase 2",
   in which `HOME_HERO` maps to the **empty string** and everything is
   `used: false`

And literals outside all four: `AdSidebar.tsx:6` declares
`'left_01' | 'left_02' | 'right_01' | 'right_02'`, which are **not keys of
`AD_PLACEMENTS`**. `app/api/advertising/match/route.ts:32` carries a
`canonicalLegacyPlacement()` shim whose comment records that `"LEFT_01"` matched
no registered placement — a workaround for this divergence already in the tree.

### 3.3 Three order-like status vocabularies over one table

`service_orders.status` holds values from two different sets:

```
direct booking only:  pending_provider · confirmed · declined
order only:           created · accepted · waiting_customer_confirmation ·
                      delivered · disputed
shared:               scheduled · in_progress · completed · cancelled
```

Confirmed consequence: the admin "active jobs" tile
(`lib/services/marketplace.ts:1946`) counts only
`('accepted','scheduled','in_progress','waiting_customer_confirmation','delivered')`
— **every direct booking awaiting or accepted by a provider is missing from it.**

A fourth, UPPERCASE vocabulary exists in `lib/services/state-machine.ts` for
display, and does not line up: it has `PENDING_REVIEW` (no row ever holds it,
per its own comment), `VERIFIED` where the database says `approved`, `PENDING`
where the database says `submitted`, and lacks
`WAITING_CUSTOMER_CONFIRMATION`.

### 3.4 Two advertiser admin UIs over two APIs

`app/admin/advertisers/page.tsx` → `/api/advertiser-profiles`, while
`app/admin/advertisers/management/page.tsx` → `/api/advertisers` +
`/api/advertiser-access`. Both linked.

Similarly `src/types/advertiser.ts:1` and `src/types/sponsor.ts:1` declare the
**same nine-value union** under two names.

### 3.5 Two component roots

`components/` and `src/components/` both hold card families. `Button`, `Badge`
and the services status badge are single — those are fine.

---

## 4. What is dead

* `components/advertising/placements/AdHero.tsx` — zero importers
* `components/cards/BusinessCard.tsx` — zero importers
* `src/data/demo-properties.ts` — `DEMO_PROPERTIES`, seven rows, zero importers.
  `app/properties/page.tsx:126` states "No demo rows are ever merged into the
  public feed", which holds.
* `app/api/vehicles/route.ts` — returns `{ success: true, data: [] }`
  unconditionally
* `app/admin/offer-types/page.tsx` — no inbound link (its API does exist)
* `app/dashboard/services/favorites/page.tsx` — no inbound link, not in the
  sidebar

---

## 5. Mock data in production UI

Only one real instance:

* `app/vehicles/[id]/page.tsx:10,22,82` — `mockVehicles` rendered directly, no
  API call.

`src/data/toolsData.ts` is a static catalogue by design, not a stub.
`app/dashboard/office/integration/page.tsx:36` has a `/* demo fallback */`
comment on a catch that swallows API failures and leaves the arrays empty —
misleading comment, no fake data.

Notably: **no `TODO` markers anywhere** under `app/`, `src/`, `components/`.

---

## 6. Validation and authorization posture

* **No schema validation anywhere.** Not one zod schema in the ads or services
  routes; every body is hand-narrowed. The mandate asks for zod; this is the gap.
* Authorization is genuinely server-side in the `/api/service-*` and
  `/api/admin/ads*` families — permissions are checked in the route, not by
  hiding buttons. That part is sound.
* Exceptions found: `service-dashboard/counts` imports `PERMISSIONS` without
  gating on it; `service-marketplace-settings` GET is ungated while PATCH is
  gated; `ad-assets` POST checks the literal string `"media:upload"` rather than
  a `PERMISSIONS.*` constant.
* `app/api/professionals/[id]/route.ts:11` re-proxies to
  `/api/service-providers/{id}` over HTTP **without forwarding cookies**, so it
  is permanently the anonymous view. Same class of defect as the
  `/api/services/*` proxies already replaced with in-process forwarding.

---

## 7. Ordered plan

Ranked by harm, not by section order in the mandate.

| Phase | Work | Why first |
|---|---|---|
| **2** | Close `/api/ad-events`; rate-limit `/api/ads/conversion`; decide `/api/advertising/*` | Unauthenticated writes to billing-relevant counters |
| **3** | One placement registry; delete the three others; migrate the legacy literals | Four registries is why `LEFT_01` needed a shim |
| **4** | One ads stack; retire `components/advertising/placements/*` | Two renderers, two APIs, one product |
| **5** | Unify the order/booking status vocabulary; fix the admin active-jobs count | A dashboard that under-reports work in progress |
| **6** | Delete or build `app/admin/advertising/**`; fix the eight sidebar links | Navigation that 404s |
| **7** | Zod schemas on every ads and services write path | The only structural gap in an otherwise sound authorization story |
| **8** | Design tokens, `StatusBadge`, tables, RTL | Real, but nothing here is broken or unsafe |

Sections 19–27 and 43 of the mandate (design system, visual consistency) are
deliberately last. Nothing in them is broken; everything above them is.

---

## 8. What this audit did not cover

Stated rather than left implied:

* Inbound links were checked for `/admin/**` and `/dashboard/services/**` only.
  A page reached solely through `router.push()` with a template string would not
  appear in a literal-link sweep.
* `app/dashboard/services/supervisor/verification/page.tsx` shows no `/api/`
  literal and was not opened.
* `lib/services/compat/`, `contracts/`, `matching/` vs `matching.ts`, and
  `messaging/` vs `message-contexts.ts` look like duplicate pairs but were not
  opened.
* No runtime performance measurement, no responsive or RTL pass, no SEO review.
  Those belong to their phases.
