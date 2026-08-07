# News Ticker Comparison

**Mode:** PLAN (read-only).

---

## 1. Reference news ticker

- **DB:** Prisma models `NewsTickerSettings` (per-page: `maxItems`, `enabled`) + `NewsTickerItem` (fields incl. `isActive`, `displayOnAllPages`, `targetPages`, `sourceType: manual|auto`, `createdAt`).
- **API:** `GET /news-ticker?page=<page>` (`server/api/src/routes/news-ticker.ts`) → returns active items ordered by `createdAt desc`, limited to `maxItems` (default 5); per-page targeting (`displayOnAllPages` OR `targetPages contains page`); returns `[]` when disabled.
- **Admin:** `AdminNewsTicker.tsx` page (manage items + per-page settings).
- **Auto news:** `generateAutoNews()` — auto-generates items from `sourceType != "manual"` sources (feature intent).
- **Client:** ticker component reads `/news-ticker?page=home` (CSR).

## 2. Target news ticker

- **DB:** D1 `news` table via `lib/runtime-db.ts` (D1 in dev; MySQL under `vinext start`). Schema fields (from `app/api/news/route.ts`): `scope: global|country|city`, `country_code`, `city_id`, `title_ar/en/tr`, `link_url`, `status: draft|active|archived`, `priority`, `start_at`, `end_at`, timestamps.
- **API:** `GET /api/news` (+ admin routes) with **sponsor-identity scoping** — `getSponsorIdentity()` + `canManageCountry()` limit what a country/city supervisor can read/write; `PERMISSIONS` constants enforce admin scope.
- **Admin:** `app/admin/news/page.tsx` + `news-admin-client.tsx` — full CRUD, status/priority, start/end date scheduling, multilingual titles (ar/en/tr).
- **Client:** `src/components/NewsTicker.tsx` (SSR-friendly; falls back to static copy when API empty).
- **Extra:** RTL-aware, priority-ordered, scheduled activation window.

## 3. Comparison

| Capability | Reference | Target | Verdict |
|---|---|---|---|
| Per-page targeting | YES (`targetPages`) | NO (scope: global/country/city) | Target scope model is location-based (directive); reference per-page is finer-grained — OPTIONAL MERGE |
| Scheduled activation | NO | YES (`start_at`/`end_at`, priority, status) | Target superior |
| Multilingual titles | single title (AR labels only) | ar/en/tr columns | Target superior |
| Admin permission scoping | none | sponsor-identity + country/city supervisor scoping | Target superior |
| Auto-generated news | `generateAutoNews()` | no | OPTIONAL MERGE (feeds from CMS later) |
| SSR/public fallback | CSR only | SSR + static fallback | Target superior |

## 4. Decisions
- **KEEP** target news ticker implementation. REUSE_AS_IS.
- **MERGE (optional, ADAPT):** reference per-page targeting as an extension to target `scope` (a `pages` array on news rows) IF product requires page-level ticker config — otherwise drop.
- **MERGE (optional, REBUILD):** auto-news generation from content sources later (Phase 7 CMS).
- **DO_NOT_MIGRATE:** reference single-language, no-schedule model.

**Decision:** KEEP target; reference contributes optional page-targeting + auto-news as ADAPT/REBUILD items.
