# Services Marketplace Test Coverage

## Test files

| File | Scope | Tests |
|---|---|---|
| `tests/services-matching.test.mjs` | Offer-to-request matching, scoring, availability | 13 |
| `tests/services-marketplace.test.mjs` | Core marketplace helpers + session-only identity scan of `app/api/service-*/**` and `lib/services/*` | 9 |
| `tests/services-api.test.mjs` | API route handlers against the in-memory D1-compatible DB | 7 |
| `tests/services-authz.test.mjs` | Authorization scenarios (401 gates, permission model, role matrix) | 10 |
| `tests/services-e2e.mjs` | Environment-gated integration smoke (D1 via `vinext dev` / MySQL via `vinext start`) | 3 (gated) |
| `tests/rendered-html.test.mjs` | SSR-rendered HTML sanity for public pages | — |

Total registered under `npm test`: **41 passing, 0 failing** (build gate + all
unit/session tests). The E2E file self-skips with
`SKIPPED: integration environment unavailable` unless `SERVICES_E2E=1`.

## What is covered

### Matching (`services-matching.test.mjs`)
- Scoring candidates by country match, budget fit, category, rating, deadlines.
- Request/offer lifecycle transitions and guard errors.

### Core marketplace (`services-marketplace.test.mjs`)
- Pure helper behavior for the marketplace domain.
- **Session-only identity scan**: globs every `app/api/service-*/**/*.ts` and
  `lib/services/*.ts` and asserts the module has zero references to
  `getSponsorIdentity` / `requireChatGPTUser` / `getChatGPTUser`.
- Admin gate wired to `getSessionIdentity` + `getAdminOverview` (no ChatGPT
  identity fallback).

### API layer (`services-api.test.mjs`)
Runs the real route handlers against `createInMemoryDb()` (a D1-compatible
adapter supporting the SQL shapes used by the services functions: `INSERT
OR IGNORE` / `UPDATE` / `DELETE` / `SELECT` with equality, `IN`, `NOT IN`,
`LIKE`, `ORDER BY`, `LIMIT`, `COUNT(*)`, and the category in-use union guard):

- `GET /api/service-admin` overview counts (9 metrics: pendingProviders,
  approvedProviders, publishedRequests, openOffers, activeJobs, openReports,
  totalRequests, totalOffers, totalJobs).
- Provider approve / reject → status transition + `notify` + `audit_logs` row.
- Categories CRUD + conflict / has-children / in-use / not-found guards
  (`409`/`404`).
- Reports list / create / resolve.
- Notifications unread / read / mark-all / bulk-scope.

### Authorization (`services-authz.test.mjs`)
- 401 without a session on `service-admin`, category write routes, provider
  status PATCH.
- 403 when the session lacks the required permission.
- Permission grants match the session's role-derived `permissions`.
- Roles that must be allowed into the services admin (e.g. `service_supervisor`).
- Resolver-null / guest path returns the guest identity (never throws).

## How to run

```bash
npm test                                  # build + 41 unit/session tests
SERVICES_E2E=1 SERVICES_BASE_URL=http://localhost:3011 \
  node --import tsx --test tests/services-e2e.mjs   # live D1/MySQL smoke
```

## Uncovered (explicitly out of scope)

- Full browser interaction flows (no Playwright); the rendered-HTML suite
  covers public SSR output only.
- Live DB integration outside the gated E2E smoke (needs `vinext dev` for D1 or
  `vinext start` for MySQL — see `docs/audit/SERVICES_DATABASE_DEPENDENCY_AUDIT.md`).
