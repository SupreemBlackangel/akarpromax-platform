# 00_V1_ARCHAEOLOGY_SUMMARY.md
# V1 Product Archaeology — Final Summary

**Audit Date:** 2026-08-19  
**Mode:** READ-ONLY — V1 Source Archaeology

---

## V1 ARCHAEOLOGY STATUS: COMPLETE

---

## Exact V1 Root(s)

| Root | Path | Purpose |
|---|---|---|
| V1.0 Main | `E:\Akarpromax new 2027\V1.0` | Complete V1 application |
| V1.0 Frontend | `E:\Akarpromax new 2027\V1.0\src` | React frontend |
| V1.0 Server | `E:\Akarpromax new 2027\V1.0\server` | Express backend + chat |
| AkarApp_LIVE | `F:\akarpromax-office\AkarApp_LIVE` | WPF desktop |

---

## Files Inspected Count

| Category | Count |
|---|---|
| Total V1 Files | 449 |
| Frontend Pages | 117 |
| Frontend Components | 100+ |
| Engineering Components | 40 |
| API Routes | 28 |
| Database Models | 48 |
| Contexts | 10 |
| Hooks | 13 |
| Services | 8 |

---

## Key Discoveries

### 1. Identity Model
- ONE identity with MULTIPLE capabilities
- UserType enum: INDIVIDUAL, ARTISAN, REALTOR, OFFICE, COMPANY
- Role field: user, moderator, admin
- Company account switching existed

### 2. Property Ecosystem
- Complete supply/demand/broker/admin sides
- Property requests with office offers
- Elite leads for high-value inquiries
- Marketing-enabled properties with contracts

### 3. Auction System
- Open and fixed-price auctions
- Auto-bidding with max ceiling
- Suspicious relist detection (30-day window)
- Sale proof verification
- Office reputation scoring

### 4. Service System
- Three distinct modes: Directory, Dispatch, Tender
- Real-time dispatch with provider selection
- Two-sided reputation (provider ↔ customer)
- Sentiment-tracked feedback

### 5. Marketing Ecosystem
- Marketer profiles with rank system
- Contracts with exclusivity and auto-renew
- Proposals and commissions
- Code of conduct versioning

### 6. Advertising Engine
- Geo-targeting (country/region/city/village)
- Sponsor tiers (Platinum/Gold/Silver/Standard)
- Rotation and campaign limits
- Desktop integration

### 7. Chat System
- Socket.IO with AES-256-GCM encryption
- Private and group conversations
- Text, image, voice, file messages
- Moderation with access logging

### 8. Engineering Suite
- 40+ architectural components
- BOQ engine with 8 sections
- CAD/DXF/3D visualization
- Specialized building engines

### 9. Trust & Safety
- Multi-layer verification (identity, professional, office, marketer)
- Multi-factor reputation (office ratings, provider ratings, marketer ranks)
- Fraud detection (suspicious relists, early warnings)
- Comprehensive audit trail

### 10. Business Model
- Advertising revenue
- Subscription plans
- Software licenses
- Marketing commissions
- Virtual tokens

---

## User Journeys Reconstructed

1. Guest → Property Buyer
2. Property Owner → Listing
3. Property Seeker → Request
4. Service Customer → Service Request
5. Service Provider → Registration
6. Auction Bidder
7. Auction Fraud Detection
8. Marketer → Property Marketing
9. Office → Auction Creation
10. Admin → User Moderation

---

## State Machines Reconstructed

- User status (ACTIVE/BANNED)
- Identity verification (PENDING/APPROVED/REJECTED)
- Property status (ACTIVE/SOLD/RENTED/INACTIVE)
- Property request (OPEN/MATCHED/CLOSED)
- Property offer (PENDING/ACCEPTED/REJECTED)
- Auction (PENDING/ACTIVE/COMPLETED/CANCELLED)
- Marketer profile (PENDING/APPROVED/REJECTED)
- Marketing contract (PENDING/ACTIVE/TERMINATED/EXPIRED)
- Service request (pending/accepted/completed/cancelled)
- Subscription (active/expired/cancelled)
- Software license (active/expired/revoked)

---

## Automation Rules Discovered

- Close expired auctions (60 seconds)
- Process expired relists (5 minutes)
- Close expired tenders (5 minutes)
- Generate auto news (5 minutes)
- Recalculate office ratings (1 hour)
- Run early warning scan (6 hours)

---

## Business Constants Discovered

- Auction auto-extend: 5 minutes
- Suspicious relist window: 30 days
- Proof deadline: 30 days
- License trial: 30 days
- License subscription: 365 days
- Bid increment default: 1000
- Rotation default: 5 seconds
- Max views/clicks: configurable

---

## Permissions Discovered

- Role-based (user/moderator/admin)
- JSON permissions on roles table
- Ownership checks (property owner, office member)
- Verification gates (isVerified, canCreateAuctions)

---

## Messaging Events Discovered

- join_conversation, leave_conversation
- send_message, edit_message, delete_message
- typing_start, typing_stop
- mark_read
- block_user, unblock_user
- report_message, request_moderation

---

## Advertising Rules Discovered

- Geo-targeting hierarchy (country → region → city → village)
- Sponsor tier priority
- Rotation with configurable seconds
- Max views/clicks caps
- Date range targeting
- Language targeting
- Page targeting

---

## Auction Risk Rules Discovered

- Suspicious relist detection (30-day window)
- Price drop percentage calculation
- Proof deadline enforcement
- Early warning pattern scanning
- Office reputation scoring
- User/office auction bans

---

## Previously Missed Items

1. **Virtual token system** — users.tokenBalance for microtransactions
2. **Company account switching** — personal/company toggle
3. **Code of conduct versioning** — legal compliance tracking
4. **Sentiment-tracked feedback** — positive/neutral/negative
5. **Partner accounts** — separate login system
6. **Vehicle services** — dedicated page
7. **Smart landing** — personalized by user/location/context
8. **GeoAdBanner** — geo-targeted ad context
9. **Investment radar** — market analysis tool
10. **Academic/banking/sovereign engines** — specialized engineering

---

## Unresolved Mysteries

1. Admin Emperor — exact purpose unknown
2. Elite Leads — classification criteria unknown
3. Matchmaking — algorithm unknown
4. Membership — difference from subscription unknown
5. Investment Radar — data sources unknown
6. Institutional Sovereign Engine — functionality unknown
7. Banking Security Engine — functionality unknown
8. Academic Specialty Engine — functionality unknown
9. Sovereign Ethics Shield — functionality unknown
10. Partner Campaigns — workflow unknown
11. Developer Projects — existence unknown
12. Vehicle Services — integration unknown

---

## Documentation Files Created

| File | Content |
|---|---|
| 01_V1_PHYSICAL_SOURCE_ATLAS.md | Source root locations |
| 03_V1_COMPLETE_USER_JOURNEYS.md | 10 user journeys |
| 04_V1_STATE_MACHINES.md | 20 state machines |
| 05_V1_DATABASE_PRODUCT_MEANING.md | 48 table meanings |
| 06_V1_FIELD_LEVEL_PRODUCT_IDEAS.md | Hidden product ideas |
| 07_V1_IDENTITY_ACCOUNT_CAPABILITY_MODEL.md | Identity model |
| 08_V1_MODERATOR_OPERATING_MODEL.md | Moderator capabilities |
| 10_V1_TRUST_REPUTATION_MECHANICS.md | Trust/reputation system |
| 11_V1_MESSAGING_PROTOCOL_AND_UX.md | Chat protocol |
| 12_V1_ADVERTISING_BUSINESS_ENGINE.md | Ad system |
| 16_V1_PROPERTY_ECOSYSTEM.md | Property features |
| 19_V1_AUCTION_OPERATING_SYSTEM.md | Auction system |
| 20_V1_SERVICES_THREE_MODE_MODEL.md | Services model |
| 51_V1_PRODUCT_IDEA_GRAPH.md | Product idea graph |
| 52_V1_GROWTH_AND_ENGAGEMENT_LOOPS.md | Engagement loops |
| 53_V1_BUSINESS_MODEL_MAP.md | Business model |
| 54_V1_TRUST_SAFETY_SYSTEM.md | Trust/safety |
| 55_V1_ADMIN_CONTROL_SURFACE.md | Admin controls |
| 57_V1_UNRESOLVED_MYSTERIES.md | Unknown items |
| 58_AKARPROMAX_V1_PRODUCT_CONSTITUTION.md | Product constitution |

---

## Source Files Modified: ZERO

This was a READ-ONLY archaeological investigation. No V1 or V2 source was modified.

---

## TOP 30 NEW DISCOVERIES NOT PRESENT IN PREVIOUS AUDIT

1. **Virtual token system** — users.tokenBalance for microtransactions
2. **Company account switching** — personal/company toggle via CompanyContext
3. **Code of conduct versioning** — legal compliance with IP/User-Agent tracking
4. **Sentiment-tracked feedback** — positive/neutral/negative classification
5. **Partner accounts** — separate login system, not linked to users
6. **Vehicle services** — dedicated page at /vehicle-services
7. **Smart landing** — useSmartLanding hook for personalized landing
8. **GeoAdBanner** — GeoAdsContext with 5-minute cache
9. **Investment radar** — market analysis tool
10. **Academic specialty engine** — academic building calculations
11. **Banking security engine** — banking security features
12. **Sovereign ethics shield** — ethical considerations
13. **Marketer rank system** — Bronze/Silver/Gold/Platinum with commission rates
14. **Marketing contract exclusivity** — single-agent marketing
15. **Auto-renewal contracts** — automatic contract renewal
16. **Suspicious relist detection** — 30-day window, price drop calculation
17. **Sale proof verification** — contract, receipt, signature required
18. **Early warning system** — pattern-based fraud detection
19. **Office rating snapshots** — multi-factor scoring recalculated hourly
20. **Auction auto-extend** — anti-sniping with configurable minutes
21. **Auto-bidding** — incremental bidding up to ceiling
22. **Bid IP tracking** — audit trail for bids
23. **Moderation access logging** — all chat moderator access logged
24. **News ticker page targeting** — JSON array of page names
25. **News ticker settings per page** — max items, refresh interval
26. **Supplier products** — individual product listings
27. **Free resources** — downloadable with download counting
28. **License codes** — pre-generated redemption codes
29. **Desktop version management** — force update capability
30. **Auction price history** — immutable price tracking

---

## TOP 20 QUESTIONS THAT ONLY THE PRODUCT OWNER CAN ANSWER

1. **Admin Emperor** — What was the intended purpose of /admin/emperor?
2. **Elite Leads** — How were leads classified as "elite"? What criteria?
3. **Matchmaking** — What algorithm was used for property matchmaking?
4. **Membership** — How did membership differ from subscription?
5. **Investment Radar** — What data sources fed the investment radar?
6. **Institutional Sovereign Engine** — What building types did it handle?
7. **Banking Security Engine** — What security features did it provide?
8. **Academic Specialty Engine** — What calculations did it perform?
9. **Sovereign Ethics Shield** — What ethical rules did it enforce?
10. **Partner Campaigns** — What was the partner workflow?
11. **Developer Projects** — Did this feature exist in V1?
12. **Vehicle Services** — How did it integrate with main services?
13. **Smart Landing** — What exact rules governed personalization?
14. **Token System** — How were tokens earned and spent?
15. **Company Switching** — Was personal/company simultaneous or either/or?
16. **Sentiment Analysis** — How was feedback sentiment determined?
17. **Contract Exclusivity** — What was the business case for exclusive marketing?
18. **Auto-Renewal** — What triggered contract renewal?
19. **Auction Auto-Extend** — What was the optimal extension time?
20. **Office Rating Weights** — What were the exact weights for each factor?

---

**Status:** COMPLETE  
**Application Source Files Modified:** ZERO
