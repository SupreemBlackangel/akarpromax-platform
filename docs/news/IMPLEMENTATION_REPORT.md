# Implementation Report

## Scope

Delivered the AkarProMax News & Ticker Engine: one central content engine
(manual + automated + scheduled + breaking + geo/page-targeted) delivering to
the website feed, website ticker, office news, office ticker, and notification
channels — all managed from a single admin workspace, reusing and extending the
existing `news` table, `/api/news` route, `NewsTicker` component, and Office
delivery.

## Deliverables

### Service layer (`lib/news/`)
- `contracts.ts` — shared types + channel/targeting/limit constants.
- `schema.ts` — additive DDL (`news_extended`, `news_placements`,
  `news_sources`, `news_delivery_counters`, `news_events`) + indexes.
- `db.ts` — `getNewsDb()` / `setNewsDbForTesting()` seam.
- `eligibility.ts` — page-group mapping, geo/language/audience/schedule/limit
  checks, ranking.
- `delivery.ts` — `resolveForChannel` / `resolveNewsFeed` /
  `resolveTickerForContext` with channel separation and default placements.
- `placements.ts` — placement CRUD + validation.
- `sources.ts` — trusted-source registry.
- `ingestion.ts` — SSRF-safe fetch, dedupe, draft+review insertion.
- `rss.ts` — dependency-free RSS 2.0 / Atom parser.
- `security.ts` — `isSafeFetchUrl`, `safeLinkUrl`, `sanitizeHtml`,
  `escapeHtml`.
- `analytics.ts` — `recordNewsEvent`, `incrementCounter`, bot detection.

### API routes
- `app/api/news/feed/route.ts` (public), `telemetry`, `sources`,
  `sources/fetch`, `placements`, `analytics`; `app/api/office/v1/news` gained
  `view=ticker`; `/api/news` gained extended-field support with `n.`-aliased
  SQL and `NEWS_PUBLISH` draft-downgrade.

### Admin workspace
- `app/admin/news/` rewritten into a 3-tab client (news / sources / analytics)
  with `PlacementEditor`, Arabic RTL UI, and restricted-editor country scoping.

### Ticker
- `NewsTicker.tsx` premium rewrite (slide transform, keyboard/touch/auto-
  advance, `role="status"`, trilingual labels); CSS rules under reduced-motion.

## Quality gates (all green)

- `npx tsc --noEmit` — clean.
- `.ts` test suite — **588 pass** (112 suites; up from 500, +88 news tests).
- `npm test` — **185 pass** (build + mjs suites).
- `npm run lint` — 0 errors on all touched files (9 pre-existing errors in
  untouched auth/sponsor/integration files; 1 pre-existing unused-import
  warning in `tests/land` fixed).
- `scripts/check-architecture.mjs` — PASS (pre-existing ARCH-025 warnings).
- `scripts/check-module-boundaries.mjs` — PASS (10 pre-existing warnings,
  0 violations).
- `npm run build` — pass.

## Bugs fixed during verification

1. SSRF IPv6 bypass (`::1` accepted) — all IPv6 literals now blocked.
2. `incrementCounter` UPDATE bound `?6`–`?9` with only 5 params — renumbered to
   `?2`–`?5`.
3. Channel leakage — default placement applied only when an item has zero
   placements.
4. Atom self-closing `<link>` parsed as empty — dedicated `extractLinkAtom`.

## Known limitations

- News analytics/placement routes are D1/PG/MySQL-backed; like all content
  routes they E2E-test under `vinext dev` (D1) and `vinext start` (PG/MySQL).
- Dev-mode D1 state persists in local Miniflare storage.
- Placements exist only when configured; default delivery keeps every active
  item visible.

## Not modified

`src/components/tools/FindMyLand.tsx`, `app/api/land/*`, and
`docs/find-my-land/` remain untouched per the safe-zone requirement.
