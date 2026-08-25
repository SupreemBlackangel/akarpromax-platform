# PASS B — Broken or Unwired

**Audit date:** 2026-08-22  
**Mode:** Observation and evidence only — no source changes

Current structures that fail runtime or lack a complete chain.

## CAP-200 — Legacy advertising match endpoint

- **Domain:** Ads
- **Result:** BROKEN
- **Severity:** P2
- **Launch blocker:** NO
- **V1 evidence:** 12_V1_ADVERTISING_BUSINESS_ENGINE.md
- **Current evidence:** app/api/advertising/match/route.ts
- **Runtime evidence:** Runtime: POST /api/ads/match with global_header/home/SA returned 200 and a matched creative; legacy GET /api/advertising/match returned 500.
- **Recommended action:** Restore or formally defer in PASS C.
- **Notes:** Manual domain-level reconciliation record.
