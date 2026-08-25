# 57_V1_UNRESOLVED_MYSTERIES.md
# V1 Unresolved Mysteries

**Audit Date:** 2026-08-19  
**Mode:** READ-ONLY — V1 Source Archaeology

---

## 1. Admin Emperor

**Files:** `AdminEmperor.tsx`

**What is known:**
- Page exists at `/admin/emperor`
- Appears to be an admin panel

**What remains unknown:**
- Exact purpose
- What controls it provides
- What data it displays
- Whether it's functional or presentation-only

**Next exact source to inspect:**
- `src/pages/AdminEmperor.tsx`
- `server/api/src/routes/admin.ts`

---

## 2. Elite Leads

**Files:** `AdminEliteLeads.tsx`, `inquiries.isEliteLead`

**What is known:**
- Page exists at `/admin/elite-leads`
- Inquiries have `isEliteLead` flag
- Appears to manage high-value leads

**What remains unknown:**
- How leads are classified as "elite"
- What special handling elite leads receive
- Whether elite leads have different workflows
- What metrics determine elite status

**Next exact source to inspect:**
- `src/pages/AdminEliteLeads.tsx`
- `server/api/src/routes/inquiries.ts`

---

## 3. Matchmaking

**Files:** `AdminMatchmaking.tsx`

**What is known:**
- Page exists at `/admin/matchmaking`
- Appears to match properties with requests

**What remains unknown:**
- Matching algorithm
- What criteria are used
- How matches are presented
- Whether matching is automatic or manual

**Next exact source to inspect:**
- `src/pages/AdminMatchmaking.tsx`
- `server/api/src/routes/admin.ts`

---

## 4. Membership

**Files:** `AdminMembership.tsx`

**What is known:**
- Page exists at `/admin/membership`
- Appears to manage memberships/subscriptions

**What remains unknown:**
- Difference between membership and subscription
- What membership tiers exist
- What benefits each tier provides
- How membership affects features

**Next exact source to inspect:**
- `src/pages/AdminMembership.tsx`
- `server/api/src/routes/admin.ts`

---

## 5. Investment Radar

**Files:** `InvestmentRadar.tsx`

**What is known:**
- Page exists at `/investment-radar`
- Appears to provide investment analysis

**What remains unknown:**
- Data sources
- Calculation logic
- Whether it uses AI/ML
- How it integrates with properties

**Next exact source to inspect:**
- `src/pages/InvestmentRadar.tsx`
- `server/api/src/routes/market-rates.ts`

---

## 6. Institutional Sovereign Engine

**Files:** `InstitutionalSovereignEngine.tsx`

**What is known:**
- Component exists in `src/components/arch/`
- Appears to be an engineering engine

**What remains unknown:**
- What it calculates
- What building types it handles
- Whether it's functional or stub

**Next exact source to inspect:**
- `src/components/arch/InstitutionalSovereignEngine.tsx`

---

## 7. Banking Security Engine

**Files:** `BankingSecurityEngine.tsx`

**What is known:**
- Component exists in `src/components/arch/`
- Appears to handle banking security

**What remains unknown:**
- What security features it provides
- What standards it references
- Whether it's functional or stub

**Next exact source to inspect:**
- `src/components/arch/BankingSecurityEngine.tsx`

---

## 8. Academic Specialty Engine

**Files:** `AcademicSpecialtyEngine.tsx`

**What is known:**
- Component exists in `src/components/arch/`
- Appears to handle academic buildings

**What remains unknown:**
- What calculations it performs
- What building types it handles
- Whether it's functional or stub

**Next exact source to inspect:**
- `src/components/arch/AcademicSpecialtyEngine.tsx`

---

## 9. Sovereign Ethics Shield

**Files:** `SovereignEthicsShield.tsx`

**What is known:**
- Component exists in `src/components/arch/`
- Appears to handle ethical considerations

**What remains unknown:**
- What ethical rules it enforces
- What scenarios it covers
- Whether it's functional or stub

**Next exact source to inspect:**
- `src/components/arch/SovereignEthicsShield.tsx`

---

## 10. Client Flags

**Files:** `service_hub_feedback.sentiment`

**What is known:**
- Feedback has sentiment (positive/neutral/negative)
- Negative sentiment may affect reputation

**What remains unknown:**
- How sentiment is determined
- What happens when sentiment is negative
- Whether flags trigger moderation
- How flags affect matching

**Next exact source to inspect:**
- `server/api/src/routes/service-hub.ts`

---

## 11. Partner Campaigns

**Files:** `partners` table

**What is known:**
- Partners have separate login
- Partners have company field

**What remains unknown:**
- What partners do
- How they differ from users
- What campaigns they run
- How leads are assigned

**Next exact source to inspect:**
- `server/api/src/routes/partners.ts` (if exists)

---

## 12. Developer Projects

**Files:** Unknown

**What is known:**
- Referenced in audit documents

**What remains unknown:**
- Whether they exist in V1
- What they contain
- How they relate to other features

**Next exact source to inspect:**
- Search entire V1 source for "developer_projects"

---

## 13. Vehicle Services

**Files:** `VehicleServices.tsx`

**What is known:**
- Page exists at `/vehicle-services`
- Appears to list vehicle services

**What remains unknown:**
- What services are listed
- How they integrate with main services
- Whether it's functional or stub

**Next exact source to inspect:**
- `src/pages/VehicleServices.tsx`

---

## 14. Smart Landing

**Files:** `useSmartLanding.ts`

**What is known:**
- Hook exists for personalized landing
- Adapts by user/location/context

**What remains unknown:**
- Exact rules for personalization
- What sections change
- What user types affect display
- What fallback exists

**Next exact source to inspect:**
- `src/hooks/useSmartLanding.ts`

---

## 15. GeoAdBanner

**Files:** `GeoAdsContext.tsx`

**What is known:**
- Context handles geo-targeted ads
- Ads are filtered by location

**What remains unknown:**
- Exact geo-targeting logic
- How fallback works
- What happens when no geo data

**Next exact source to inspect:**
- `src/contexts/GeoAdsContext.tsx`

---

## Summary

| Mystery | Files | Status |
|---|---|---|
| Admin Emperor | AdminEmperor.tsx | UNKNOWN |
| Elite Leads | AdminEliteLeads.tsx | PARTIALLY KNOWN |
| Matchmaking | AdminMatchmaking.tsx | UNKNOWN |
| Membership | AdminMembership.tsx | UNKNOWN |
| Investment Radar | InvestmentRadar.tsx | UNKNOWN |
| Institutional Sovereign | InstitutionalSovereignEngine.tsx | UNKNOWN |
| Banking Security | BankingSecurityEngine.tsx | UNKNOWN |
| Academic Specialty | AcademicSpecialtyEngine.tsx | UNKNOWN |
| Sovereign Ethics | SovereignEthicsShield.tsx | UNKNOWN |
| Client Flags | service_hub_feedback | PARTIALLY KNOWN |
| Partner Campaigns | partners table | UNKNOWN |
| Developer Projects | Unknown | UNKNOWN |
| Vehicle Services | VehicleServices.tsx | UNKNOWN |
| Smart Landing | useSmartLanding.ts | PARTIALLY KNOWN |
| GeoAdBanner | GeoAdsContext.tsx | PARTIALLY KNOWN |

---

**Status:** COMPLETE  
**Application Source Files Modified:** ZERO
