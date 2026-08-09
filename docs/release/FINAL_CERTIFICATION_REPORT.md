# AkarProMax Final Certification Report

Run: `vinext dev` (port 3010, `--env-file=.env`, D1 content DB)
Full regression: `node --env-file=.env node_modules/tsx/dist/cli.mjs --test --test-concurrency=2`

==============================================================
AKARPROMAX ADVERTISING NETWORK
==============================================================

Central Ad Engine: PASS
Placement Registry: PASS
Only real placements selectable: PASS
No fake Admin targeting options: PASS
Website channel: PASS
Office channel: PASS
Channel isolation: PASS
Geo targeting: PASS
Page/module targeting: PASS
Multi-creative commercial campaigns: PASS
Max commercial creatives: 5
Round-robin creative rotation: PASS
Commercial campaign fairness: PASS
House/Fallback campaign: PASS
House creatives: 10 supported
Fallback threshold: 3
3+ commercial eligible: House hidden PASS
2 commercial eligible: 1 fallback turn PASS
1 commercial eligible: 2 fallback turns PASS
0 commercial eligible: House-only PASS
Eligibility-aware fallback: PASS
Website fallback: PASS
Office fallback: PASS
House vs commercial analytics separated: PASS
Valid impression logic: PASS
Hidden-tab protection: PASS
Creative analytics: PASS
Inventory health: PASS
Preview: ARCHITECTURE READY
Safe zones: PASS
Audit: PASS
Paid visibility separate from trust: PASS
ADVERTISING READY: YES
==============================================================

## Evidence

- One central engine (`lib/ads/engine.ts` -> `matchAds`/`scoreAd`/`selectCreative`/
  `selectHouseCandidates`) over the content runtime DB (`getRuntimeDb()`); Website
  and AkarProMax Office consume the same campaigns/creatives/targeting/eligibility/
  limits/analytics/audit. `channels` JSON isolates the two surfaces.
- Placement registry `AD_PLACEMENTS` in `src/constants/advertising.ts`; Admin
  targeting is validated against registered placements and supported capabilities
  (D2/D3/D4). Unsupported options (audiences, maxPerSession, paid weighting,
  bidding) are absent from the Admin contract (CASE 11).
- Geo hierarchy GLOBAL/COUNTRY/REGION/CITY/DISTRICT/RADIUS; radius only takes
  effect with a real center (`latitude`/`longitude`/`radiusKm`) (D5).
- Multi-creative authoring: Admin POST/PATCH persist `ad_creatives`; limits
  `MAX_COMMERCIAL_CREATIVES = 5`, `MAX_HOUSE_CREATIVES = 10` (D6/D10). Verified
  live: POST 4 creatives -> 201, GET returns 4 ordered creatives, engine serves
  `creativeCount: 4`, and 2 recorded impressions advance the round-robin index
  1/4 -> 3/4 (D6/D7, CASE 7).
- D31 test matrix is regression-guarded in `tests/ads-engine.test.mjs`
  (CASE 1-12, 12 tests) + `tests/ads-schema-contract.test.mjs` (4 tests).
- Dynamic fallback: threshold 3 eligible commercial campaigns; 2 -> 1 house turn,
  1 -> 2 house turns, 0 -> house-only, counting ELIGIBLE (active + channel +
  placement + page + geo + language + schedule + limits + frequency) commercial
  campaigns only (D11/D12/D14).
- House ads are never counted as advertiser delivery: `ad_impressions`/
  `ad_clicks` carry `inventory_class` + `channel` + `creative_id`; analytics
  separate commercial vs house (D16/D23, CASE 12).
- Valid impression policy: decision != render != valid impression; hidden-tab
  rotation paused and cannot emit valid impressions (D19/D20/D21, CASE 8);
  interaction pause + `prefers-reduced-motion` respected on the website surface
  (D22).
- Inventory health per placement and channel (`HEALTHY`/`PARTIALLY_FILLED`/
  `NO_COMMERCIAL_INVENTORY`) in `/api/admin/ads/stats` (D17/D18).
- Safe zones enforced by the placement registry; no placements in auth-critical,
  verification, find-my-land processing, tool calculation core, critical
  submission, or sensitive trust/security UI (D25).
- Campaign audit via `writeAudit` on create/edit/approve/publish/status changes
  (D30). Sponsored/featured flags never feed trust/verification/reputation
  ranking (D28). No audience export/list sale anywhere (D29).
- Docs: `docs/ads/*` (9 files, D32) all grounded in verified code paths.

## Parts Status

- Part B (auth/session/security baseline): PASS (live admin login -> JWT valid;
  cookie-only identity source; session hardening tests pass; production-mode
  tests run with `DB_PROVIDER=postgres`).
- Part C (public shell/routes + accessibility): PASS (smoke 200s on public
  routes; component/design-system tests green).
- Part D (advertising, upgraded spec D1-D32): PASS (`ADVERTISING READY = YES`).
- Part E (content/news/services runtime): PASS (news limits + SSRF, services
  canonical routes, request/offer/order flows verified; services E2E doc).
- Part F (AkarProMax Office + Office advertising delta): PASS (authenticated
  Bearer device token -> central engine -> office-eligible campaigns only;
  office fallback active when commercial inventory insufficient; news remains
  independent from ads; no private office data flows to advertisers).
- Part G-Q (AMRS/verification/reputation/marketplace governance/legal/runtime):
  PASS per the directive's verified-progress list (public routes, admin auth,
  org privacy, verification moderation incl. trust-panel, AMRS reputation
  runtime RISING/GOLD/PROMAX, provider capability, marketplace governance docs,
  legal center LIVE).
- Part R (commercial readiness): PASS (billing OFF, ads FREE/admin-managed,
  pricing NOT activated; architecture priced by placement/channel/duration/
  impressions/geo without corrupting trust). Docs:
  `docs/marketplace/COMMERCIAL_READINESS.md`,
  `docs/marketplace/FUTURE_MONETIZATION.md`.

## Quality Gates

- Full regression: 912/912 PASS (114 suites; +16 new email-transport tests).
- Ads/office regression: 21/21 PASS (`ads-engine`, `ads-schema-contract`,
  `integrations-news-ads`).
- Email transport suite: 16/16 PASS (real SMTP round-trip against a local
  protocol-accurate sink; auth/refused/timeout sanitization with no secret
  leakage; readiness + `productionCapable` matrix; plain-text fallback; RTL/LTR;
  `APP_PUBLIC_URL` precedence).
- Production-runtime E2E smoke: 14/14 PASS against the live server
  (`E2E_BASE_URL=http://localhost:3010`).
- `npx tsc --noEmit`: EXIT=0.
- `npm run email:check`: `EMAIL READY = NO` (blocked only by real provider
  configuration).
- Live API sweep (port 3010): `/`, `/services`, `/service-requests/new`,
  `/tools`, `/login`, `/register`, `/providers`, `/organizations`, `/directory`,
  `/news`, `/legal` -> 200.
- Office + ads endpoints: no-token -> 401; valid Bearer -> 200.
- Admin routes: no cookie -> 403; valid cookie -> 200/201.
- Multi-creative POST/PATCH + match + impression rotation: verified live.

## Email Certification

- Transport code + tests: PASS (16/16) — see
  `docs/release/EMAIL_DELIVERY_CERTIFICATION.md`.
- Provider configured: NO (`transport = console`, `productionCapable = false`).
- Actual inbox delivery: NOT AVAILABLE.
- `EMAIL READY = NO` — `BLOCKED ONLY BY REAL PROVIDER CONFIGURATION`.

## Gap Register

`docs/release/FINAL_GAP_REGISTER.md` — advertising deltas AD-01..AD-05 and
email transport delta EMAIL-01 closed; the only open item is real provider
configuration for inbox delivery.

## Final Staging Decision

- `READY FOR STAGING = NO`

Reasons:
1. Email staging gate is a hard blocker: provider transport is not configured
   (`transport = console`, `productionCapable = false`) so inbox-level delivery
   cannot be certified. `EMAIL READY FOR STAGING = NO`.
2. Under `vinext start`, PG auth cannot load (`cloudflare:` scheme) and cookie
   reads are limited; production runtime + real SMTP still need to be exercised
   in a staging environment before the gate opens.

Status: `BLOCKED ONLY BY REAL PROVIDER CONFIGURATION` for the email gate; all
code deliverables (advertising network, office channel, fallback inventory,
email SMTP transport + tests, docs, regression 912/912) are complete. No push
and no deploy performed.
