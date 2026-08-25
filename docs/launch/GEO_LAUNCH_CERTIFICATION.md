# GEO Launch Certification

Date: 2026-08-22  
Runtime candidate: `http://localhost:3014`  
Database used: isolated local PostgreSQL `akarpromax_cs1b_20260822_1`  
Production data modified: **NO**

## Decision

**GEO CORE = READY**

There are **0 launch-blocking geo defects** in the certified Properties, Ads, and Services paths. The runtime candidate was built from the current source, started from the production standalone output, and exercised through direct JSON requests and the in-app browser.

The repository-wide lint command still has 148 pre-existing errors outside this GEO change. The exact GEO change set has 0 lint errors (8 non-blocking existing image/unused warnings). This debt is not a geo launch blocker and was not hidden with disabled rules or an out-of-scope refactor.

## Root causes fixed

1. Location was not provided once at the application root. Public layouts and individual modules could therefore initialize different location state.
2. Manual country/city state did not carry a complete atomic hierarchy or an explicit source (`manual`, `auto`, `fallback`). Some Services screens also contained Oman defaults instead of consuming platform state.
3. Properties accepted flat query strings without validating the parent hierarchy. The public page could also mix unfiltered demo rows with DB results.
4. Ad matching treated missing geo dimensions too permissively and house fill could bypass a narrower target. Several callers sent only country/city, and cache identity omitted region, district, and coordinates.
5. `/api/advertising/match` did not correctly adapt `page=home`/`placement=hero` to the canonical `/`/`HERO` contract, so the live compatibility route could disagree with `/api/ads/match`.
6. Fresh PostgreSQL bootstrap created `countries` but did not create the canonical governorate/city/district/street hierarchy used by `/api/geo`.

## Certified implementation

- One root `GeoProvider` now owns `Country → Governorate/Region → City → District → Lat/Lng` for the whole application.
- Priority is deterministic: manual selection wins over auto detection; auto detection is accepted only before a manual override; failure resolves to explicit global mode, never a random city.
- Manual selection is persisted in the existing `akarpromax-*` local-storage keys and mirrored to URL query parameters. Changing a parent clears stale children atomically.
- `LocationBar`, Properties, all five legacy advertising callers, Services hub/catalog/providers/requests, provider application, and provider profile consume the shared context.
- Properties performs validated server-side hierarchy filtering. `scope=local` requires a valid country; cross-country/city/district and mixed global/local states return HTTP 400. Direct property detail links remain independent and return 200.
- Both advertising endpoints delegate to the canonical engine. Country, region, city, district, and radius criteria are cumulative. Missing coordinates do not qualify a radius campaign, and fallback inventory cannot bypass geo targeting.
- Public provider search validates the same hierarchy and enforces profession, city, coordinates, requested radius, and provider service radius. Public provider JSON is stripped of identity/contact and precise coordinates.
- Forward migration `0007_geo_hierarchy_launch` creates only the missing hierarchy schema. It inserts no reference or production rows. Bootstrap requires these tables and remains idempotent.

## Isolated certification fixtures

The guarded fixture script refuses non-local hosts and database names not matching `akarpromax_*`.

- Properties: Jeddah A, Jeddah B, Riyadh, Dammam.
- Providers: Jeddah, Riyadh, Dammam; all bound to the same `[GEO-TEST] Electrician` profession.
- Ads: Jeddah city, Riyadh city, Dammam city, Saudi country, 10 km radius centered in Jeddah, and a 10 km radius centered outside the Jeddah test location.
- Reference hierarchy: Saudi Arabia → Makkah/Riyadh/Eastern → Jeddah/Riyadh/Dammam → Rawdah/Olaya/Shati.

No fixture was written to a production database.

## Runtime evidence

### Direct API matrix

| Selected scope | Properties returned | City/radius ads | Providers returned |
| --- | --- | --- | --- |
| Jeddah / Rawdah | Jeddah A + B only | Jeddah + Saudi + near-radius; outside-radius excluded | Jeddah only |
| Riyadh / Olaya | Riyadh only | Riyadh + Saudi | Riyadh only |
| Dammam / Shati | Dammam only | Dammam + Saudi | Dammam only |
| Saudi country only | all four Saudi fixtures | Saudi country only without coordinates | all three Saudi providers |
| Global | broader unfiltered property scope | no geo-targeted fixture without geo context | broader approved-provider scope |

Negative requests for missing local country, mixed global/local state, mismatched country/city, cross-city district, and radius above 500 km returned HTTP 400 rather than leaking rows or returning 500.

The 10 km boundary was checked with points immediately inside and outside the threshold. The inside point qualified the near-Jeddah radius campaign; the outside point did not.

### Browser flow

1. Selected `Saudi Arabia → Makkah Region → Jeddah → Rawdah` manually.
2. `/properties` showed exactly the two Jeddah fixtures and no Riyadh fixture.
3. Refresh preserved the selected region, city, district, and Jeddah results.
4. Changed the same controls to `Riyadh Region → Riyadh → Olaya`.
5. Properties changed to Riyadh only; home hero changed from the Jeddah campaign to the Riyadh campaign; `/providers` changed to the Riyadh provider only.
6. Browser console errors: **0**.

## Regression results

- Geo suites: **115 / 115 PASS**.
- Ads + geo suites: **39 / 39 PASS**.
- Runtime geo E2E: **8 / 8 PASS**.
- Services isolated suite: **134 / 134 PASS**, including Direct Booking, RFQ/matching, authorization, and public privacy contracts.
- TypeScript: **PASS** (`tsc --noEmit --incremental false`).
- GEO-scoped lint: **PASS** with 0 errors and 8 warnings.
- Repository-wide lint: **FAIL**, 148 pre-existing errors in unrelated admin, auction, land, community, legacy scripts, and other files. No GEO file appears in the error list.
- Production build: **PASS** (`next build`).
- PostgreSQL idempotency rerun: **PASS**, identity v5, 8 forward migrations, missing runtime tables 0, exit code 0.

## Final requested result

```text
GEO LAUNCH FIX — FINAL

Runtime:
http://localhost:3014

Central/shared location source:
YES
Details:
Root GeoProvider with one persisted Country → Region → City → District → Lat/Lng contract used by Properties, Ads, and Services.

Manual override priority:
PASS

Auto detection fallback:
PASS

PROPERTY GEO
Jeddah → Jeddah:
PASS

Jeddah excluded from Riyadh local results:
PASS

Riyadh excluded from Jeddah local results:
PASS

Region filtering:
PASS

District filtering:
PASS

Global / All mode:
PASS

ADS GEO
/api/ads/match:
PASS

/api/advertising/match:
PASS

Frontend advertising callers:
5 / 5 PASS

Country targeting:
PASS

Region targeting:
PASS

City targeting:
PASS

District targeting:
PASS

Radius targeting:
PASS

SERVICES GEO
Profession + city search:
PASS

Provider geo matching:
PASS

Direct Booking regression:
PASS

RFQ regression:
PASS

CROSS-MODULE
Change Jeddah → Riyadh updates Properties:
PASS

Change Jeddah → Riyadh updates Ads:
PASS

Change Jeddah → Riyadh updates Services:
PASS

Refresh/location persistence:
PASS

TESTS
Geo tests:
115 / 115

Services:
134 / 134

TypeScript:
PASS

Lint:
FAIL — repository-wide pre-existing debt; GEO-scoped lint PASS with 0 errors

Build:
PASS

Production Data Modified:
NO

Unrelated Features Added:
NO

LAUNCH DECISION:

GEO CORE = READY

Remaining launch-blocking geo defects:
0
```
