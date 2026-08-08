# Test Matrix

All news engine tests live in `tests/news/*.test.ts` and run under
`node --import tsx --test`. They use `setNewsDbForTesting(createInMemoryDb())`
from `tests/helpers/in-memory-db.mjs` for deterministic DB-backed coverage, and
mock `globalThis.fetch` for ingestion.

## Coverage map

| Spec area | Test file | Key scenarios |
| --- | --- | --- |
| §92 Scheduling & expiry | `eligibility.test.ts`, `delivery.test.ts` | date() window clauses; before-start blocked; after-end blocked; active window ok; paused never matches |
| §93 Page targeting | `eligibility.test.ts`, `delivery.test.ts` | HOME-only via `SPECIFIC_PAGES`; `PAGE_GROUPS` for properties/services; `EXCLUDE_PAGES` for tools; wildcard `/*`; channel mismatch |
| §94 Website vs Office routing | `delivery.test.ts` | channel separation; placement on `OFFICE_NEWS` never leaks to `WEBSITE_NEWS`; default fallback only when item has zero placements |
| §95 Limits | `eligibility.test.ts`, `analytics.test.ts`, `delivery.test.ts` | impression/click/per-user/per-session limits; counter rollups; limit blocks delivery |
| §96 RSS parsing | `rss.test.ts`, `ingestion.test.ts` | RSS 2.0 + Atom; malformed XML → empty; null/empty input; dedupe by content hash |
| §97 Relevance & review defaults | `rss.test.ts`, `ingestion.test.ts` | keyword scoring; external items land as `draft` + `REVIEW_REQUIRED` with attribution |
| §98 Security | `security.test.ts`, `sources.test.ts` | SSRF (private IPs, localhost, IPv6, metadata, non-http schemes); XSS stripping; `safeLinkUrl`; unsafe source URL rejected |
| §99 Analytics CTR & bots | `analytics.test.ts` | valid vs invalid events; bot/headless/prefetch detection; click-without-impression `valid=0`; counter accumulation; unsupported events ignored |
| §100 Placements CRUD | `placements.test.ts` | validation; create requires news; list by news/channel; update; pause; delete; `placementFromRow` round-trip |
| RTL / i18n | `i18n.test.ts` | `tickerPrev`/`tickerNext` present in ar/en/tr; key parity across locales |

## DB seams exercised

- `INSERT`/`UPDATE` with `?N` binds, arithmetic (`impressions = impressions + ?2`),
  `date(col) <= date('now')` comparisons, `IN` lists, `IS NULL`, `ORDER BY`,
  `LIMIT`.
- `ingestSource` against a mocked `fetch` (success, HTTP 500, dedupe, missing
  title, unknown source).

## Regression results

| Suite | Count | Result |
| --- | --- | --- |
| `tests/news/*.test.ts` | 88 | pass |
| Full `tests/**/*.test.ts` | 588 (112 suites) | pass |
| `npm test` (build + mjs suites) | 185 | pass |
| `npx tsc --noEmit` | — | pass |
| `npm run lint` (news + land + helpers) | — | 0 errors |
| `scripts/check-architecture.mjs` | — | PASS (pre-existing ARCH-025 warnings) |
| `scripts/check-module-boundaries.mjs` | — | PASS (10 pre-existing warnings, 0 violations) |
| `npm run build` | — | pass |

## Bugs caught by the new tests

1. **SSRF IPv6 bypass**: `http://[::1]` was accepted by `isSafeFetchUrl`; the
   guard now rejects any hostname containing a colon (all IPv6 literals).
2. **Broken counter UPDATE**: `incrementCounter` referenced `?6`–`?9` but bound
   only 5 params; fixed to `?2`–`?5` so D1/MySQL no longer NULL the deltas.
3. **Channel separation**: an item with only an `OFFICE_NEWS` placement still
   leaked to `WEBSITE_*` via the default placement; delivery now applies the
   default fallback only to items with zero placements.
4. **Atom `<link>` parsing**: self-closing `<link href=.../>` produced empty
   links; fixed with a dedicated `extractLinkAtom`.
