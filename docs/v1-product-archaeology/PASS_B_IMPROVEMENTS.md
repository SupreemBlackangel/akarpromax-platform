# PASS B — Improvements

**Audit date:** 2026-08-22  
**Mode:** Observation and evidence only — no source changes

Capabilities with evidence that the current product exceeds the V1 baseline.

## CAP-191 — api.ts (mock)

- **Domain:** UX
- **Result:** IMPROVED
- **Severity:** P3
- **Launch blocker:** NO
- **V1 evidence:** api.ts:1170
- **Current evidence:** No reliable current equivalent located
- **Runtime evidence:** Runtime public routes /, /properties, /services, /auctions, /tools, /offices returned 200; no full visual/device matrix was run in PASS B.
- **Recommended action:** Retain evidence and regression-test.
- **Notes:** V1 in-memory mock API has been replaced across core domains by database-backed route handlers.

## CAP-194 — Social OAuth login

- **Domain:** Identity
- **Result:** IMPROVED
- **Severity:** P3
- **Launch blocker:** NO
- **V1 evidence:** PASS A identity model
- **Current evidence:** app/api/auth/google/*; app/api/auth/facebook/*
- **Runtime evidence:** Runtime: /login=200, /register=200, unauthenticated /api/auth/me=401; no authenticated lifecycle tested.
- **Recommended action:** Retain and add regression coverage.
- **Notes:** Manual domain-level reconciliation record.

## CAP-197 — Core ad matching and delivery

- **Domain:** Ads
- **Result:** IMPROVED
- **Severity:** P1
- **Launch blocker:** NO
- **V1 evidence:** 12_V1_ADVERTISING_BUSINESS_ENGINE.md
- **Current evidence:** lib/ads/engine.ts; app/api/ads/match/route.ts
- **Runtime evidence:** Runtime: POST /api/ads/match with global_header/home/SA returned 200 and a matched creative; legacy GET /api/advertising/match returned 500.
- **Recommended action:** Retain and add regression coverage.
- **Notes:** Manual domain-level reconciliation record.

## CAP-198 — Geo/radius/tier campaign targeting

- **Domain:** Ads
- **Result:** IMPROVED
- **Severity:** P1
- **Launch blocker:** NO
- **V1 evidence:** 12_V1_ADVERTISING_BUSINESS_ENGINE.md
- **Current evidence:** lib/ads/engine.ts; src/constants/advertising.ts
- **Runtime evidence:** Runtime: POST /api/ads/match with global_header/home/SA returned 200 and a matched creative; legacy GET /api/advertising/match returned 500.
- **Recommended action:** Retain and add regression coverage.
- **Notes:** Manual domain-level reconciliation record.

## CAP-216 — Auction contract and terms

- **Domain:** Auctions
- **Result:** IMPROVED
- **Severity:** P1
- **Launch blocker:** NO
- **V1 evidence:** auction-contract.ts
- **Current evidence:** app/api/auctions/[id]/terms/route.ts; contract/route.ts; contract/sign/route.ts
- **Runtime evidence:** Runtime: /auctions=200 and /api/auctions?limit=1=200 with zero rows; bidding/closing/contract lifecycle not executable without fixtures.
- **Recommended action:** Retain and add regression coverage.
- **Notes:** Manual domain-level reconciliation record.

## CAP-228 — Hierarchical geo data

- **Domain:** Geography
- **Result:** IMPROVED
- **Severity:** P2
- **Launch blocker:** NO
- **V1 evidence:** V1 geo fields and smart landing
- **Current evidence:** app/api/geo/route.ts; lib/db/schemas/geo-schema.ts
- **Runtime evidence:** Runtime: GET /api/geo?type=countries=200; cross-platform propagation and smart-landing URL behavior not tested.
- **Recommended action:** Retain and add regression coverage.
- **Notes:** Manual domain-level reconciliation record.
