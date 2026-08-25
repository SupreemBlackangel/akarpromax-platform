# PASS B — Lost V1 Features

**Audit date:** 2026-08-22  
**Mode:** Observation and evidence only — no source changes

Capabilities with affirmative evidence of V1 implementation and no current equivalent found.

## CAP-001 — AdminEmperor

- **Domain:** Admin
- **Result:** LOST
- **Severity:** P2
- **Launch blocker:** NO
- **V1 evidence:** AdminEmperor.tsx:370
- **Current evidence:** No reliable current equivalent located
- **Runtime evidence:** Runtime: admin endpoints reject unauthenticated requests; no authorized admin session was available.
- **Recommended action:** Restore or formally defer in PASS C.
- **Notes:** No current AdminEmperor symbol, page, or route found.

## CAP-002 — AdminEliteLeads

- **Domain:** Matching
- **Result:** LOST
- **Severity:** P1
- **Launch blocker:** NO
- **V1 evidence:** AdminEliteLeads.tsx:144
- **Current evidence:** lib/db/schemas/leads-schema.ts; lib/services/leads/lead.service.ts; app/api/contact/route.ts
- **Runtime evidence:** No V1 developer-project matchmaking or elite-lead runtime route found; service-provider matching is a different capability.
- **Recommended action:** Restore or formally defer in PASS C.
- **Notes:** No current isEliteLead or leadScore field/route found; service leads are not equivalent.

## CAP-003 — AdminMatchmaking

- **Domain:** Matching
- **Result:** LOST
- **Severity:** P1
- **Launch blocker:** NO
- **V1 evidence:** AdminMatchmaking.tsx:138
- **Current evidence:** No reliable current equivalent located
- **Runtime evidence:** No V1 developer-project matchmaking or elite-lead runtime route found; service-provider matching is a different capability.
- **Recommended action:** Restore or formally defer in PASS C.
- **Notes:** No current developer-project matchmaking stats/run/run-all surface found.

## CAP-025 — AdminRelistMonitoring

- **Domain:** Auctions
- **Result:** LOST
- **Severity:** P1
- **Launch blocker:** NO
- **V1 evidence:** AdminRelistMonitoring.tsx:386
- **Current evidence:** No reliable current equivalent located
- **Runtime evidence:** Runtime: /auctions=200 and /api/auctions?limit=1=200 with zero rows; bidding/closing/contract lifecycle not executable without fixtures.
- **Recommended action:** Restore or formally defer in PASS C.
- **Notes:** No suspicious-relist review surface or model found.

## CAP-138 — BOQEngine

- **Domain:** UX
- **Result:** LOST
- **Severity:** P1
- **Launch blocker:** NO
- **V1 evidence:** BOQEngine.tsx:643
- **Current evidence:** No reliable current equivalent located
- **Runtime evidence:** Runtime public routes /, /properties, /services, /auctions, /tools, /offices returned 200; no full visual/device matrix was run in PASS B.
- **Recommended action:** Restore or formally defer in PASS C.
- **Notes:** No current BOQEngine implementation was found.

## CAP-152 — BIMViewer

- **Domain:** UX
- **Result:** LOST
- **Severity:** P2
- **Launch blocker:** NO
- **V1 evidence:** BIMViewer.tsx:323
- **Current evidence:** No reliable current equivalent located
- **Runtime evidence:** Runtime public routes /, /properties, /services, /auctions, /tools, /offices returned 200; no full visual/device matrix was run in PASS B.
- **Recommended action:** Restore or formally defer in PASS C.
- **Notes:** No current BIM viewer implementation found.

## CAP-153 — Building3DVisualizer

- **Domain:** UX
- **Result:** LOST
- **Severity:** P2
- **Launch blocker:** NO
- **V1 evidence:** Building3DVisualizer.tsx:227
- **Current evidence:** No reliable current equivalent located
- **Runtime evidence:** Runtime public routes /, /properties, /services, /auctions, /tools, /offices returned 200; no full visual/device matrix was run in PASS B.
- **Recommended action:** Restore or formally defer in PASS C.
- **Notes:** No current V1 3D building visualizer evidence found.

## CAP-161 — StructuralConfigurator

- **Domain:** UX
- **Result:** LOST
- **Severity:** P2
- **Launch blocker:** NO
- **V1 evidence:** StructuralConfigurator.tsx:327
- **Current evidence:** No reliable current equivalent located
- **Runtime evidence:** Runtime public routes /, /properties, /services, /auctions, /tools, /offices returned 200; no full visual/device matrix was run in PASS B.
- **Recommended action:** Restore or formally defer in PASS C.
- **Notes:** No current equivalent found.

## CAP-163 — MEPEngine

- **Domain:** UX
- **Result:** LOST
- **Severity:** P2
- **Launch blocker:** NO
- **V1 evidence:** MEPEngine.tsx:281
- **Current evidence:** No reliable current equivalent located
- **Runtime evidence:** Runtime public routes /, /properties, /services, /auctions, /tools, /offices returned 200; no full visual/device matrix was run in PASS B.
- **Recommended action:** Restore or formally defer in PASS C.
- **Notes:** No current equivalent found.

## CAP-202 — Realtime encrypted conversation

- **Domain:** Chat
- **Result:** LOST
- **Severity:** P1
- **Launch blocker:** NO
- **V1 evidence:** 11_V1_MESSAGING_PROTOCOL_AND_UX.md; server/chat-server.ts
- **Current evidence:** No Socket.IO/AES chat equivalent located in current source
- **Runtime evidence:** Runtime: unauthenticated /api/messages=401; no two-user send/read/realtime test performed.
- **Recommended action:** Restore or formally defer in PASS C.
- **Notes:** Manual domain-level reconciliation record.

## CAP-210 — Sentiment-tracked service feedback

- **Domain:** Services
- **Result:** LOST
- **Severity:** P2
- **Launch blocker:** NO
- **V1 evidence:** service_hub_feedback.sentiment
- **Current evidence:** No sentiment field/processor located
- **Runtime evidence:** Runtime: /services=200, /api/services/categories=200, /api/service-categories=200, /api/service-providers=200; lifecycle mutations not tested.
- **Recommended action:** Restore or formally defer in PASS C.
- **Notes:** Manual domain-level reconciliation record.

## CAP-213 — Auto-bidding ceiling

- **Domain:** Auctions
- **Result:** LOST
- **Severity:** P1
- **Launch blocker:** NO
- **V1 evidence:** auction_bids.maxAutoBid
- **Current evidence:** Current bid route writes isAutoBid=false and has no maxAutoBid flow
- **Runtime evidence:** Runtime: /auctions=200 and /api/auctions?limit=1=200 with zero rows; bidding/closing/contract lifecycle not executable without fixtures.
- **Recommended action:** Restore or formally defer in PASS C.
- **Notes:** Manual domain-level reconciliation record.

## CAP-214 — Anti-sniping auto-extension

- **Domain:** Auctions
- **Result:** LOST
- **Severity:** P1
- **Launch blocker:** NO
- **V1 evidence:** auction_settings.autoExtendMinutes
- **Current evidence:** No autoExtendMinutes or equivalent found
- **Runtime evidence:** Runtime: /auctions=200 and /api/auctions?limit=1=200 with zero rows; bidding/closing/contract lifecycle not executable without fixtures.
- **Recommended action:** Restore or formally defer in PASS C.
- **Notes:** Manual domain-level reconciliation record.

## CAP-215 — Suspicious relist and sale proof

- **Domain:** Auctions
- **Result:** LOST
- **Severity:** P1
- **Launch blocker:** NO
- **V1 evidence:** 19_V1_AUCTION_OPERATING_SYSTEM.md
- **Current evidence:** No suspicious_relist/sale_proofs model or route found
- **Runtime evidence:** Runtime: /auctions=200 and /api/auctions?limit=1=200 with zero rows; bidding/closing/contract lifecycle not executable without fixtures.
- **Recommended action:** Restore or formally defer in PASS C.
- **Notes:** Manual domain-level reconciliation record.

## CAP-217 — Elite property leads

- **Domain:** Matching
- **Result:** LOST
- **Severity:** P1
- **Launch blocker:** NO
- **V1 evidence:** 09B_V1_ELITE_LEADS.md
- **Current evidence:** No isEliteLead/leadScore equivalent found
- **Runtime evidence:** No V1 developer-project matchmaking or elite-lead runtime route found; service-provider matching is a different capability.
- **Recommended action:** Restore or formally defer in PASS C.
- **Notes:** Manual domain-level reconciliation record.

## CAP-218 — Developer-project matchmaking

- **Domain:** Matching
- **Result:** LOST
- **Severity:** P1
- **Launch blocker:** NO
- **V1 evidence:** 09C_V1_MATCHMAKING.md
- **Current evidence:** No matchmaking stats/run routes found
- **Runtime evidence:** No V1 developer-project matchmaking or elite-lead runtime route found; service-provider matching is a different capability.
- **Recommended action:** Restore or formally defer in PASS C.
- **Notes:** Manual domain-level reconciliation record.

## CAP-219 — Virtual token wallet

- **Domain:** Membership
- **Result:** LOST
- **Severity:** P2
- **Launch blocker:** NO
- **V1 evidence:** 06_V1_FIELD_LEVEL_PRODUCT_IDEAS.md
- **Current evidence:** No tokenBalance/wallet equivalent found
- **Runtime evidence:** No authenticated plan/promo/license lifecycle test performed.
- **Recommended action:** Restore or formally defer in PASS C.
- **Notes:** Manual domain-level reconciliation record.

## CAP-220 — Promo codes and plan overrides

- **Domain:** Membership
- **Result:** LOST
- **Severity:** P1
- **Launch blocker:** NO
- **V1 evidence:** 09D_V1_MEMBERSHIP.md
- **Current evidence:** No promo-code/plan-override routes or models found
- **Runtime evidence:** No authenticated plan/promo/license lifecycle test performed.
- **Recommended action:** Restore or formally defer in PASS C.
- **Notes:** Manual domain-level reconciliation record.
