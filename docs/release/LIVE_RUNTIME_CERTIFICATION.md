# Live Runtime Certification

## Server

- Website running: `YES`
- URL: `http://localhost:3010`
- Health readiness: `PASS`
  - `GET /api/health/ready` returned:
    - `schema.mode = d1`
    - `contentSchema.ready = true`
    - `identitySchema.ready = true`
    - `email.transport = "console"`, `configured = false`,
      `productionCapable = false`
- Production-runtime E2E smoke (`E2E_BASE_URL=http://localhost:3010`,
  `tests/e2e/production-runtime.test.mjs`): `14/14 PASS`
  - content routes 200 (services categories `om`, properties, sponsors),
  - static `/assets/*` 200 (no 404),
  - register 201 -> login blocked 403 `not_verified` -> wrong-password 401 ->
    logout clears cookie -> `/me` 401 without/with malformed cookie.

## Critical Runtime Areas Verified

- News impression/click limits: `PASS`
- News SSRF redirect-hop protection: `PASS`
- Real RSS fetch path: `PASS`
- Find My Land resolve/save/share/discovery/quote: `PASS`
- AMRS organization persistence: `PASS`
- AMRS directory/org reads: `PASS`
- Services listings canonical route: `PASS`
- Services request/offers/order flow: `PASS`

## Public Route Smoke Checks

- `/` -> `200`
- `/services` -> `200`
- `/service-requests/new` -> `200`
- `/tools` -> `200`
- `/login` -> `200`
- `/register` -> `200`
- `/properties/:id` -> `200`
- `/news` -> `404`

## Notes

- `/news` currently has no public page route even though `/news` still appears in some shared configuration. This should remain in the release gap register until product decides whether the page is required for staging.
- Office news/ticker remains authenticated as expected; unauthenticated office route access returns `401`.

## Quality Gates Snapshot

- Full regression (incl. new email-transport suite): `912 PASS` / `912` (114 suites)
- Ads/office regression (`ads-engine`, `ads-schema-contract`,
  `integrations-news-ads`): `21 PASS`
- Email transport suite (`tests/email-transport.test.mjs`): `16 PASS`
- Production-runtime E2E smoke: `14 PASS`
- `npx tsc --noEmit`: `PASS`
- `npm run email:check`: `PASS` — `EMAIL READY = NO`
  (blocked only by real provider configuration)

## Current Staging Decision

- `READY FOR STAGING = NO`

Reason:
- `EMAIL READY = NO` — the email gate is a hard blocker: `EMAIL_TRANSPORT` is
  unset and no real SMTP/API provider is configured (`transport = console`,
  `productionCapable = false`). All transport code and tests are green; the
  blocker is real provider configuration plus SPF/DKIM/DMARC, then an actual
  inbox-delivery journey.
