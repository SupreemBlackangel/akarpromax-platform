# AkarProMax — Final report

Twelve phases, 2026-09-04. Structured to section 53 of the mandate.

Every defect below was **measured against production or a running system**
before it was fixed, and the evidence is quoted rather than summarised. Where a
phase found nothing, it says so.

---

## 1. What changed

| Phase | Commit | Subject |
|---|---|---|
| 1 | `29ecde2` | Audit, saved before any code was touched |
| 2 | `b1daa82` | Unauthenticated writes into billing counters |
| 3 | `ec96787` | Placement layers made to prove they agree |
| 4 | `7327134` | Legacy ad components counted almost nothing |
| 5 | `a8789c9` | Active-job counts omitted every direct booking |
| 6 | `107f217` | Services menu offered seven links to nothing |
| 7 | `06e47ed` | Write-path properties pinned; the finding did not survive |
| 8 | `fc35944` | Colours tokenised |
| 9 | `74eb092` | One signature check instead of seven |
| 10 | `8367c21` | Performance measured; nothing needed fixing |
| 11 | `450787a` | Lifecycle run end to end on an isolated database |
| 12 | `ff468e2` | Ticker controls were three pixels wide |

Preceding these, and the reason the work started: `7cbe0f5` — approved ads were
approved and invisible.

## 2. What was fixed

### The reported fault: approved ads did not appear

Four defects, not one.

**Approval never set the status.**

```sql
status = CASE WHEN ? THEN 'active' ELSE status END
```

Postgres requires the CASE condition to be boolean; a bound `1`/`0` is not.
Reproduced against the live database:

```
ERROR: argument of CASE/WHEN must be type boolean, not type integer
ERROR: parameter $4 of type integer cannot be coerced to expected type boolean
```

Two campaigns sat `approval_status='approved'`, `is_active=1`, `status='draft'`
while the audit log recorded `autoActivated: true` — the code believed it had
activated them. `updated_at` sat milliseconds *before* the audit row, proving the
approval statement itself was the last write.

**Editing silently unpublished.** An editor without `ADS_PUBLISH` had `status`
forced to `draft` whenever they submitted `active` — so fixing a typo on a live,
approved campaign took it off the site, with nothing said.

**Every failure looked like an empty result.** `/api/ads/match` answered
`catch {}` with `200 { ads: [] }`. A broken query, a schema drift and a genuinely
empty match were indistinguishable from outside. This is why it could not be
diagnosed.

**The cache key omitted fields the matcher reads** — `pageType`, `channel`,
`deviceType`, `operatingSystem`. A desktop-only campaign cached for one visitor
could be served to a phone, and a phone's empty result to every desktop for
thirty seconds.

The two stuck campaigns were repaired in a transaction touching only rows already
approved and activated but left in draft. The one pending campaign was untouched.

**And the final answer was not a bug at all.** `explainAdMatch` — added because
"the ad does not appear" was unanswerable across fourteen silent checks — said:

```
REJECTED at geo — cities ["jeddah"] allCities=false
```

Those campaigns target Jeddah and are shown to visitors known to be there.
Verified live: with `cityId: "jeddah"` the ad is served; without a city it is not.

### Anyone could exhaust any campaign's budget

`/api/ad-events` accepted POST with no authentication, no permission, no rate
limit and no signed token, and wrote into the counters that decide budget
exhaustion — while its siblings `/api/ads/impression` and `/api/ads/click` were
already protected. It now enforces the same, and takes the campaign id from the
**verified token** rather than the body.

Deprecated rather than deleted, with the evidence gathered first: no caller in
`app/`, `src/` or `components/`, none in the desktop application, zero
occurrences in the production nginx access log. A stale bundle under `dist/`
still names the path, so it logs each use instead of vanishing into a 404.

`/api/ads/conversion` had the token but no rate limit and no nonce claim, so one
valid token could be replayed without limit — on the event an advertiser is
billed on. Its `value` had no ceiling.

### Three page families counted nothing

An ad on a company, office or tool page recorded **no impression at all** and
sent its clicks to `ad_analytics`, which no report reads. So CPM was never
charged for those pages, `max_impressions` never capped, `frequency_cap_per_user`
never fired, and CTR was computed from partial data.

Nothing new was needed: `/api/advertising/match` had always returned the tracking
token. The **type** did not declare it, so no component could reach it.

### A provider was shown zero of their own work

`service-dashboard/counts` — the customer's and provider's own dashboard —
counted active jobs with a list drawn from the order vocabulary alone.
`service_orders.status` holds two vocabularies, because direct bookings and
quoted orders share the table. A provider with three bookings in progress saw
zero while an administrator could see them.

### Seven admin links led to 404

`src/config/sidebar.ts` listed eight children under Services; only
`/admin/services` exists. It is rendered for anyone with `ADMIN_DASHBOARD_VIEW`.
The destination existed all along — six tabs — but the tab was local state, so
nothing could point at one.

### One security check written seven times

Magic-byte validation existed in seven places and had diverged: three checked
only **four** of PNG's eight signature bytes (the last four exist to catch a file
mangled by a text-mode transfer), one knew the video containers and the rest did
not, and one used the JPEG test as its fallback for **any type it did not
recognise** — answering "yes, that is a valid X" for formats it had never heard
of.

### Three pixels wide

The news ticker's controls rendered at 3×19 and 8×19 CSS pixels on a phone.

## 3. What was refactored

* `lib/security/file-signatures.ts` — one implementation, seven call sites.
* `lib/services/constants.ts` — `ACTIVE_JOB_STATUSES`, one list, both queries.
* `components/advertising/placements/useLegacyAdTracking.ts` — one reporting
  path for the legacy components.
* `lib/ads/engine.ts` — `explainAdMatch`, beside `scoreAd` so they cannot drift.
* Deleted after proving zero importers: `AdHero.tsx`, `BusinessCard.tsx`.

## 4. Database changes

**None to production schema.** Two data repairs, both in transactions:

* `UPDATE ad_campaigns SET status='active'` for rows already
  `approved` + `is_active=1` but left `draft`. Two rows.
* Earlier in the engagement: `service_requests.currency` made nullable, inside a
  transaction that refused to run unless the table was empty.

A test database was created for phase 11: `akarpromax_e2e`, production schema
(114 tables), **zero production rows**, served on port 3020. No row was written
to the production database.

## 5. API changes

| Route | Change |
|---|---|
| `/api/ad-events` | Now requires a signed token, rate limited, deprecation logged |
| `/api/ads/conversion` | Rate limit, nonce claim, bounded value |
| `/api/advertising/track` | Rate limit, allow-listed event type, bounded fields |
| `/api/ads/match` | Errors logged instead of swallowed; cache key complete |
| `/api/admin/ads/approve` | Status decided in code; cache invalidated |
| `/api/admin/ads` (PATCH) | Cannot unpublish without the publish permission |

No route was removed. No response shape changed.

## 6. Permission changes

One, and it is a tightening: without `ADS_PUBLISH` the campaign status is not
the editor's to change **in either direction**. It previously forced `active`
down to `draft`, which read as "you may not publish" but also unpublished.

## 7. UI/UX changes

* Ticker controls given a 32×32 hit area without changing the glyph.
* Toast colours: success was `#0b214c` — the navy used for body text — and
  failure a red the palette does not contain. Now `--color-success` and
  `--color-danger`.
* Admin services menu points at tabs that exist; `?tab=` is read from the URL and
  narrowed, so an unknown value falls back rather than rendering nothing.
* `bg-[var(--color-accent,#eab308)]` — a fallback disagreeing with the token it
  replaces — reduced to the token.

## 8. Ads workflow

```
public request → draft, never self-approved
  → admin approval sets status, approval_status and is_active together
    → cache dropped, so the decision is visible immediately
      → served only when all four gates agree
        → impression and click require a signed, campaign-bound, single-use token
          → pause removes it at once
```

## 9. Provider workflow

`draft → submitted → under_review → approved`, with `rejected` and `suspended`
off the side. Approval is reachable from exactly the two review states. A
suspended provider cannot be silently reinstated; the route back is through
review. Verified end to end: draft, submitted, under_review and rejected are all
absent from the public directory; approved appears and carries no `suspended_at`,
`suspension_reason`, `rejection_reason`, `internal_notes`, `created_at` or
`updated_at`; suspension removes them again.

## 10. Services workflow

Unchanged in behaviour. The active-job vocabulary was unified and the count
fixed. Deeper service-listing work (mandate sections 10–22) was **not built** —
see §13.

## 11. Tests performed

* **943 unit and integration tests**, from 848 at the start. Zero failures.
* **31 end-to-end checks** against a running system on an isolated database.
* **Typecheck clean. Zero lint errors.**
* Browser measurement at 1440×900 and 375×812.
* Live verification after each deploy, including that hardening did not break
  serving.

## 12. Build result

`npm run build` succeeds. Deployed and verified live:

```
POST /api/ad-events   without a token → 400   (was 204)
POST /api/ads/conversion without a token → 400
POST /api/ads/match   with cityId=jeddah → the ad is served
GET  /                → 200
```

## 13. Remaining issues

Stated plainly rather than left implied.

1. **Mandate sections 10–22 were not built** — the service listing wizard,
   provider dashboard rebuild, marketplace UI, quotes, messaging, scheduling.
   The audit ranked them below the defects above and they were not reached.
2. **`/api/advertising/track` writes a raw IP** into `ad_analytics` and nothing
   reads it. It should be hashed or dropped; changing it silently would alter
   what existing rows mean.
3. **Two ad API surfaces remain.** One engine, two front doors. Retiring the
   legacy one is a phase of its own.
4. **Text over photographs is unverified for contrast.** It cannot be measured
   from the DOM; it needs a rendered-pixel sample.
5. **No load or concurrency testing.** The performance numbers are single
   requests against a database holding tens of rows.
6. **The geo-matching ceiling.** `PLATFORM_MAX_SERVICE_RADIUS_KM = 10` while the
   provider form defaults to 50, so a provider in Seeb is refused a request in
   central Muscat. Recorded in `docs/services/GEOGRAPHIC_MATCHING_POLICY.md`; the
   number is a product decision and was not changed.
7. **Ad city targeting depends on `ipinfo.io`** called from the browser. Ad
   blockers and the free-tier quota both break it, and when they do every
   city-targeted campaign disappears.
8. **No screen-reader or keyboard-only pass.**

## 14. Recommended next phase

In order:

1. **Surface `explainAdMatch` in the admin approval screen.** The reported fault
   was never one bug — it was the absence of an answer. A moderator should see
   "this campaign targets Jeddah; only visitors known to be there will see it"
   *before* clicking approve, not after an advertiser complains.
2. **Decide the city signal.** A third-party browser call is a fragile dependency
   on the serving path.
3. **Retire the legacy ads stack** — one engine already, so this is deleting a
   front door, not rebuilding.
4. **Then sections 10–22**, which are feature work rather than repair.

---

## A note on this report's own corrections

Four findings in the phase-1 audit did not survive being examined, and each is
struck through and corrected **in place**, with the original wording kept beneath
it:

| Claimed | Actually |
|---|---|
| Four competing placement registries | Four **layers**, consistent |
| Two complete ad stacks | One engine, two API surfaces |
| `left_01` breaks pages | Nothing broken; the mapping was merely unchecked |
| No zod validation anywhere | Used throughout auth; ads bound every number |

And three defects were in the **testing**, not the platform: a directory check
that passed because its request had failed, an isolation assertion that counted
rows instead of proving identity, and an SSH connection per statement that got
this machine temporarily blocked. All three are described in the commits that
fixed them.

One mistake in conduct is recorded too: seven existing tests were overwritten by
writing into a file without reading it first — the WCAG contrast checks among
them. The total staying at 906 is what exposed it. The file was restored intact.
