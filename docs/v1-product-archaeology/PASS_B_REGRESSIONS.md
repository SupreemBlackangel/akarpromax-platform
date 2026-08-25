# PASS B — Regressions

**Audit date:** 2026-08-22  
**Mode:** Observation and evidence only — no source changes

Capabilities present in reduced or non-equivalent form.

## CAP-004 — AdminMembership

- **Domain:** Membership
- **Result:** REGRESSED
- **Severity:** P1
- **Launch blocker:** NO
- **V1 evidence:** AdminMembership.tsx:544
- **Current evidence:** lib/amrs/events.ts; lib/amrs/workspace.ts; lib/amrs/organization.ts; app/dashboard/offices/page.tsx
- **Runtime evidence:** No authenticated plan/promo/license lifecycle test performed.
- **Recommended action:** Restore or formally defer in PASS C.
- **Notes:** V1 combined rank, badge, trial, promo, override and subscription controls; no equivalent consolidated capability found.

## CAP-032 — AdminTenders

- **Domain:** Services
- **Result:** REGRESSED
- **Severity:** P1
- **Launch blocker:** NO
- **V1 evidence:** AdminTenders.tsx:103
- **Current evidence:** No reliable current equivalent located
- **Runtime evidence:** Runtime: /services=200, /api/services/categories=200, /api/service-categories=200, /api/service-providers=200; lifecycle mutations not tested.
- **Recommended action:** Restore or formally defer in PASS C.
- **Notes:** Current service request/offer marketplace exists, but the distinct V1 tender/RFQ admin surface was not found.

## CAP-108 — Tenders

- **Domain:** Services
- **Result:** REGRESSED
- **Severity:** P1
- **Launch blocker:** NO
- **V1 evidence:** Tenders.tsx:183
- **Current evidence:** No reliable current equivalent located
- **Runtime evidence:** Runtime: /services=200, /api/services/categories=200, /api/service-categories=200, /api/service-providers=200; lifecycle mutations not tested.
- **Recommended action:** Restore or formally defer in PASS C.
- **Notes:** Distinct competitive tender lifecycle from V1 was not found as such in current routes.

## CAP-151 — CADParser

- **Domain:** Tools
- **Result:** REGRESSED
- **Severity:** P2
- **Launch blocker:** NO
- **V1 evidence:** CADParser.ts:268
- **Current evidence:** No reliable current equivalent located
- **Runtime evidence:** Runtime: /tools=200; individual upload/process/download workflows were not executed.
- **Recommended action:** Restore or formally defer in PASS C.
- **Notes:** Current CAD/DXF utilities exist, but the V1 parser surface was not found by name or equivalent proof.

## CAP-167 — DXFWriter

- **Domain:** Tools
- **Result:** REGRESSED
- **Severity:** P2
- **Launch blocker:** NO
- **V1 evidence:** DXFWriter.ts:121
- **Current evidence:** No reliable current equivalent located
- **Runtime evidence:** Runtime: /tools=200; individual upload/process/download workflows were not executed.
- **Recommended action:** Restore or formally defer in PASS C.
- **Notes:** Current DXF generation exists, but V1 writer parity/output equivalence was not runtime-tested.

## CAP-179 — onnxProcessor

- **Domain:** Tools
- **Result:** REGRESSED
- **Severity:** P2
- **Launch blocker:** NO
- **V1 evidence:** onnxProcessor.ts:136
- **Current evidence:** No reliable current equivalent located
- **Runtime evidence:** Runtime: /tools=200; individual upload/process/download workflows were not executed.
- **Recommended action:** Restore or formally defer in PASS C.
- **Notes:** Current land OCR/intelligence exists but no current ONNX processor evidence was found.

## CAP-203 — Message attachments and moderation

- **Domain:** Chat
- **Result:** REGRESSED
- **Severity:** P1
- **Launch blocker:** NO
- **V1 evidence:** 11_V1_MESSAGING_PROTOCOL_AND_UX.md
- **Current evidence:** Basic messages routes found; no equivalent attachment/moderation chain proved
- **Runtime evidence:** Runtime: unauthenticated /api/messages=401; no two-user send/read/realtime test performed.
- **Recommended action:** Restore or formally defer in PASS C.
- **Notes:** Manual domain-level reconciliation record.

## CAP-207 — Three-mode services model

- **Domain:** Services
- **Result:** REGRESSED
- **Severity:** P1
- **Launch blocker:** NO
- **V1 evidence:** 20_V1_SERVICES_THREE_MODE_MODEL.md
- **Current evidence:** Current listings/requests/offers exist; distinct V1 tender mode not established
- **Runtime evidence:** Runtime: /services=200, /api/services/categories=200, /api/service-categories=200, /api/service-providers=200; lifecycle mutations not tested.
- **Recommended action:** Restore or formally defer in PASS C.
- **Notes:** Manual domain-level reconciliation record.

## CAP-223 — Cross-domain notification center

- **Domain:** Notifications
- **Result:** REGRESSED
- **Severity:** P1
- **Launch blocker:** NO
- **V1 evidence:** notifications table; 03 journeys
- **Current evidence:** Service notification routes exist; no unified cross-domain center proved
- **Runtime evidence:** Service notification routes exist; no authenticated delivery/read/bulk-read runtime test performed.
- **Recommended action:** Restore or formally defer in PASS C.
- **Notes:** Manual domain-level reconciliation record.

## CAP-227 — Smart landing URL personalization

- **Domain:** Geography
- **Result:** REGRESSED
- **Severity:** P1
- **Launch blocker:** NO
- **V1 evidence:** 32_V1_SMART_LANDING_RULEBOOK.md
- **Current evidence:** GeoContext exists; no useSmartLanding/category alias rulebook equivalent located
- **Runtime evidence:** Runtime: GET /api/geo?type=countries=200; cross-platform propagation and smart-landing URL behavior not tested.
- **Recommended action:** Restore or formally defer in PASS C.
- **Notes:** Manual domain-level reconciliation record.
