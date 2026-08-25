# PROPERTY MARKETPLACE — DISCOVERY SNAPSHOT + LAUNCH BLOCKERS (2026-08-23)

## Implementation map (as found)
- Public: `app/properties/page.tsx` (browse), `app/properties/[id]/page.tsx` (detail), `app/properties/search/page.tsx` (advanced search, URL-param driven).
- APIs: `app/api/properties/route.ts` (GET list — forces status=approved for non-owner; POST create → draft), `[id]/route.ts` (GET detail + view counting / PATCH owner-only, draft|rejected only, resets to draft / DELETE owner-only), `[id]/submit/route.ts` (draft|rejected → pending_review, requires ≥1 active offer), `favorites`, `my` (owner list), `offer-types`, `saved-searches`, `search` (full filter set, status=approved forced).
- Admin: `app/admin/properties/*` (taxonomy manager ONLY), `app/api/admin/properties/taxonomy*`, `app/api/admin/properties/[id]/review` (approve / reject+reason; blocks self-approval; requires pending_review; guarded by `canAccessAdminArea`).
- Owner: `app/dashboard/properties/*` (list, new — 5-step wizard shell over `PropertyFormWithOffers`, `[id]/edit`, favorites, saved-searches).
- DB (drizzle/pg): `properties` (status TEXT default draft; geo text fields country/governorate/city/district + lat/lng decimals; price/currency/area; auction fields), `property_media`, `property_favorites`, `saved_searches`, `property_requests(+offers)`, `property_inquiries`, `property_views`, `auction_bids`. Zod: `lib/validators/property-validators.ts` (statuses: draft, pending_review, approved, rejected, sold, rented, archived).
- Lifecycle (server-enforced): draft → pending_review → approved | rejected(reason) → (edit resets to draft). sold/rented/archived exist in the enum with no transition endpoints yet.
- GEO: canonical multi-country system exists — `/api/geo` (countries→governorates→cities→districts→streets, DB-backed, no country-only fallback), `GeoService`/`resolveGeoSelection` (list API already filters via alias resolution), `GeoContext` + `LocationBar` (public hierarchical selectors storing canonical codes).
- Media: `property_media` rows with URL strings; form takes URLs (no binary upload). The only upload infra (`ad-assets`) is Cloudflare-R2 + sponsor-scoped and depends on `cloudflare:workers` — NOT available in the Windows node runtime.
- Cards: `LuxuryPropertyCard` (canonical public card, favorite included). Legacy duplicates: `PropertyCard.tsx`, `PropertyForm.tsx`, `PropertyWizard.tsx` (unused by the live pages).
- Auth: session {userId, role, permissions}; `canAccessAdminArea` (super_admin | `*` | ADMIN_DASHBOARD_VIEW).

## LAUNCH BLOCKERS (fix now)
- **PB-1 Owner management broken**: `/dashboard/properties` fetches `/api/properties` without `mine=1` → shows ALL users' approved listings as "عقاراتي"; drafts invisible; no status badges; NO UI anywhere to submit a draft for review (submit API unreachable) → the entire listing lifecycle is dead for real users.
- **PB-2 Admin moderation missing**: admin properties area is taxonomy-only; no pending-review queue UI; and NO API to list non-approved properties (public GET forces approved) → moderators cannot see or process submissions even though the review endpoint exists.
- **PB-3 Address gate broken** (task-defined blocker): Add/Edit form uses hardcoded Saudi-only governorate list + partial city map (several governorates → EMPTY city dropdown), free-text country, ignores `/api/geo`; no map picker (leaflet is installed and unused here).
- **PB-4 Public marketplace shows demo data / drops real rows**: `DEMO_PROPERTIES` always merged into the live marketplace (and is the sole content on API error) — violates the project's demo-containment doctrine; listing-type filter compares `for-sale|for-rent` against DB `sale|rent` → real listings vanish when a listing-type filter is applied.
- **PB-5 Detail page ignores its data**: media gallery not rendered (first image only), lat/lng never shown on a map, no favorite action on detail.

## POST-LAUNCH (recorded, not fixed now)
Binary media upload (needs a storage backend valid in the Windows node runtime — R2 path is CF-only) · price/area/rooms filters + pagination on `/properties` (full set already lives in `/properties/search`) · transitions/UI for sold/rented/archived + pause/needs-changes concepts (schema has no such statuses; not invented) · owner views/inquiries analytics · saved-search notifications · legacy `PropertyCard/PropertyForm/PropertyWizard` cleanup · similar-properties relevance · desktop office property push/pull deep-verify beyond contract read.
