# PASS C.S.1A — Services Runtime, Privacy & Bootstrap Repair

Date: 2026-08-22  
Project: `E:\Akarpromax new 2027\V 2.0 GPT - Copy`  
Runtime Candidate: `http://localhost:3014` only  
Production data modified: **NO**

## Certification result

| Gate | Result | Evidence |
|---|---:|---|
| CSS/PostCSS root cause | **FIXED** | Standalone Tailwind/PostCSS reproduction went from 347 invalid/replacement characters to 0; production build passed. |
| `/services` on 3014 | **200** | HTTP probe and browser render both passed without a runtime/build error. |
| Public Services APIs | **PASS** | Categories, provider list, listings and reviews returned 200 on 3014; provider/listing detail guards are regression-tested. |
| Privacy API audit | **PASS** | Populated handler-level JSON tests pass 4/4 with recursive forbidden-key assertions. |
| Guest authorization HTTP | **PASS** | `/api/service-admin` = 401; provider-status PATCH = 401; neither returned 500. |
| PostgreSQL bootstrap #1 | **PASS** | Empty DB → ready → clean shutdown → exit 0 in 3,304 ms. |
| PostgreSQL idempotency rerun | **PASS** | Same DB rerun → ready → exit 0 in 1,599 ms; ledger remained at 6. |
| PostgreSQL bootstrap #2 | **PASS** | Second empty DB → ready → clean shutdown → exit 0 in 2,885 ms. |
| Service category CRUD test | **PASS** | Focused regression test passed. |
| Migration journal test | **PASS** | Focused canonical-journal test passed through `0005`. |
| Services isolated tests | **130/130** | 130 pass, 0 fail. |
| TypeScript | **PASS** | `tsc --noEmit --incremental false` exited 0. |
| Build | **PASS** | Next.js 16.3.1 production build completed, including TypeScript and 88/88 static pages. |

## 1. Tailwind/PostCSS root cause and repair

The failure reproduced outside Next.js by running the configured Tailwind/PostCSS pipeline directly on `app/globals.css`. This ruled out `.next` output and Turbopack caching as the root cause.

Tailwind automatic source discovery scanned **8,873 files**, including **6,435 files under `.next.passc1-prebuild`**, plus source maps, compiled JavaScript, cache metadata and binary artifacts. The existing `@source` directives did not restrict that scan: they were additive, and their paths were also wrong relative to `app/globals.css` (`./app` and `./src` resolved below `app/`). Tokens read from generated/binary artifacts produced malformed arbitrary utilities such as the corrupt `color-background`, `color-surface` and `--layer-*` output recorded in PASS C.S.

The source fix in `app/globals.css` is limited to:

```css
@import "tailwindcss" source(none);
@source "./**/*.{js,jsx,ts,tsx}";
@source "../src/**/*.{js,jsx,ts,tsx}";
```

No generated CSS or `.next` file was edited. The corrected standalone output contained 0 invalid characters, retained the expected arbitrary background/surface utilities, and the full production build passed.

## 2. Public API privacy repair

### Root cause

The four public routes returned canonical database records directly. Those records included identity, contact and precise-coordinate columns. Provider detail also accepted any provider status, and the public listings collection allowed a caller to request non-active statuses.

### Repair

`lib/services/public-dto.ts` now contains allowlist-only projections. No serializer spreads a database row, so a future database column is private by default.

Applied to:

- `/api/service-providers/[id]`
- `/api/services/listings`
- `/api/services/listings/[id]`
- `/api/service-reviews`

The public JSON cannot include:

- `email`, `phone`, `whatsapp`
- `user_id`, `provider_user_id`, `reviewer_user_id`, `reviewee_user_id`
- customer identity/contact fields
- `tax_number`
- precise `latitude` or `longitude`

Additional publication guards:

- Public provider detail returns 404 unless the provider is `approved`.
- Public listing collection always returns `active` listings, ignoring a caller-supplied private status.
- Public listing detail returns 404 for non-active listings.

`tests/services-public-privacy.test.mjs` drives the real route handlers against populated isolated data. It recursively scans returned JSON for forbidden keys, injects a synthetic `future_secret` column to prove fail-closed behavior, and tests the approval/activity guards. Result: **4/4**.

## 3. PostgreSQL bootstrap clean shutdown

### Root cause

`PgRuntimeDb` correctly reused a shared postgres-js client in Node, but exposed no disposal lifecycle. `scripts/bootstrap-postgres.ts` called `ensureContentSchema(new PgRuntimeDb())`, printed a ready result, closed its two migration/verification clients, and left the shared runtime pool alive. The open pool retained the Node event loop.

### Repair

- `lib/pg-runtime.ts` exports `closePgRuntimeDb()`.
- Shutdown takes ownership of the current shared client, clears cached adapter/schema state, and calls `client.end({ timeout: 3 })`.
- `scripts/bootstrap-postgres.ts` wraps the complete bootstrap in an outer `try/finally` and always calls `closePgRuntimeDb()`.

No migration was rewritten and no manual SQL repair was used.

### Empty database evidence

Two isolated local databases were created on a disposable PostgreSQL 18 cluster:

| Database | First run | Rerun | Public tables | Service categories | Identity | Forward migrations | Missing runtime tables |
|---|---:|---:|---:|---:|---:|---:|---:|
| `akarpromax_cs1a_1` | exit 0 / 3,304 ms | exit 0 / 1,599 ms | 106 | 48 | v5 ready | 6 | 0 |
| `akarpromax_cs1a_2` | exit 0 / 2,885 ms | — | 106 | 48 | v5 ready | 6 | 0 |

## 4. Existing test root causes

### Service-category CRUD

The production category query was correct. The deterministic in-memory test adapter extracted the first `WHERE` inside an aggregate LEFT JOIN subquery as if it were the outer category filter. That silently returned zero categories after a successful insert. The adapter now models this one canonical aggregate query explicitly, including provider/request counts and ordering. The focused CRUD lifecycle passes.

### Migration journal guard

The guard still described `0003` and `0004` as unarmed and expected the journal to stop at `0002`. The canonical journal, the existing PASS C1 remediation guard, and both fresh bootstrap ledgers confirm that `0003`, `0004`, and `0005` are current. The stale guard now verifies the complete ordered sequence through `0005`; no migration was rolled back.

## 5. Runtime smoke on 3014

All probes used `http://localhost:3014` and the isolated PostgreSQL database:

| Probe | HTTP |
|---|---:|
| `GET /services` | 200 |
| `GET /api/service-categories?country=OM` | 200 |
| `GET /api/service-providers?country=OM&limit=5` | 200 |
| `GET /api/services/listings?limit=5` | 200 |
| `GET /api/service-reviews?...` | 200 |
| Guest `GET /api/service-admin` | 401 |
| Guest provider-status `PATCH` | 401 |

The browser rendered the Services marketplace title and content with no internal/application error.

## 6. Validation notes

- Focused lint on every file changed by PASS C.S.1A: **PASS**.
- The repository-wide `npm run lint` command is not a usable gate in the current dirty repository: it recursively entered `.next.passc1-prebuild`, `AkarApp_LIVE/dist`, compiled bundles and backups, then ESLint's formatter ended with `RangeError: Invalid string length`. No PASS C.S.1A source lint error was reported. Changing global lint scope was deliberately left outside this repair round.
- The first sandboxed build attempt could not fetch Cairo/Inter from Google Fonts. Re-running the same build with network access produced a clean successful build; this was an environment restriction, not a source failure.
- No Direct Booking feature was started or changed.
- No production database was connected to or modified. All mutable verification used local isolated databases and in-memory fixtures.

## Files changed by this repair

- `app/globals.css`
- `app/api/service-providers/[id]/route.ts`
- `app/api/services/listings/route.ts`
- `app/api/services/listings/[id]/route.ts`
- `app/api/service-reviews/route.ts`
- `lib/services/public-dto.ts`
- `lib/pg-runtime.ts`
- `scripts/bootstrap-postgres.ts`
- `tests/services-public-privacy.test.mjs`
- `tests/helpers/in-memory-db.mjs`
- `tests/services-forward-baseline-guard.test.mjs`

## Final

**PASS C.S.1A = PASS**
