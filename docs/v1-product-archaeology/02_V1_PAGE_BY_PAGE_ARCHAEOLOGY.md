# 02_V1_PAGE_BY_PAGE_ARCHAEOLOGY

# V1 Page-by-Page Archaeology

**Generated:** 2026-08-22  
**V1 Source Root:** `E:\Akarpromax new 2027\V1.0`  
**Evidence source:** `V1_PAGE_COVERAGE.csv`, reconciled against `V1_FILE_LISTING.csv`  
**Scope:** All `src/pages/**/*.tsx` files, excluding backup files.

---

## Certification Summary

- Physical page files verified: **123**
- Page archaeology records: **123**
- Physical coverage: **100.0%**
- Zero-byte STUB pages: **3**
- This document records implementation evidence; it does not certify security, test coverage, or production readiness.

## Classification Distribution

| Classification | Pages |
|---|---:|
| L1_UI_ONLY | 28 |
| L3_PARTIAL_FLOW | 42 |
| L4_END_TO_END_WIRED | 50 |
| STUB | 3 |

## Domain Distribution

| Domain | Pages |
|---|---:|
| admin | 37 |
| service | 10 |
| auction | 8 |
| public | 8 |
| marketer | 7 |
| monetization | 7 |
| property | 7 |
| auth | 5 |
| office | 5 |
| tender | 5 |
| content | 4 |
| engineering | 4 |
| user | 4 |
| marketing | 3 |
| partner | 2 |
| supplier | 2 |
| artisan | 1 |
| dev | 1 |
| messaging | 1 |
| moderation | 1 |
| unknown | 1 |

## Classification Interpretation

- **L1_UI_ONLY:** A user interface is present, but no complete persisted end-to-end flow is evidenced.
- **L3_PARTIAL_FLOW:** Part of the interaction is wired, but the complete flow or enforcement is missing.
- **L4_END_TO_END_WIRED:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **STUB:** The physical page file exists but contains no implementation.

---

## Page Records

### 001. `src/pages/About.tsx`

- **Feature:** About Page
- **Domain:** public
- **Classification:** L1_UI_ONLY
- **Authentication evidence:** no
- **API/integration evidence:** none
- **Recorded lines:** 283
- **Observed notes:** Static content page
- **Archaeology assessment:** A user interface is present, but no complete persisted end-to-end flow is evidenced.
- **Traceable source evidence:** `src/pages/About.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 002. `src/pages/AdminActivityLog.tsx`

- **Feature:** Activity Log
- **Domain:** admin
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** admin role
- **API/integration evidence:** GET /activity-log
- **Recorded lines:** 138
- **Observed notes:** Read-only audit trail
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/AdminActivityLog.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 003. `src/pages/AdminAds.tsx`

- **Feature:** Ad Management
- **Domain:** admin
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** admin role
- **API/integration evidence:** CRUD /ads
- **Recorded lines:** 1926
- **Observed notes:** Full ad campaign management with approval
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/AdminAds.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 004. `src/pages/AdminAnalytics.tsx`

- **Feature:** Market Analytics
- **Domain:** admin
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** admin role
- **API/integration evidence:** GET /api/analytics/*
- **Recorded lines:** 310
- **Observed notes:** Trends + reports + landing entries
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/AdminAnalytics.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 005. `src/pages/AdminArtisans.tsx`

- **Feature:** Artisan Admin
- **Domain:** admin
- **Classification:** L1_UI_ONLY
- **Authentication evidence:** NONE
- **API/integration evidence:** localStorage only
- **Recorded lines:** 234
- **Observed notes:** No auth guard
- **Archaeology assessment:** A user interface is present, but no complete persisted end-to-end flow is evidenced.
- **Traceable source evidence:** `src/pages/AdminArtisans.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 006. `src/pages/AdminAuctions.tsx`

- **Feature:** Auction Admin
- **Domain:** admin
- **Classification:** L3_PARTIAL_FLOW
- **Authentication evidence:** token only
- **API/integration evidence:** GET/PATCH /auctions/admin/*
- **Recorded lines:** 325
- **Observed notes:** Cancel + block but no role guard
- **Archaeology assessment:** Part of the interaction is wired, but the complete flow or enforcement is missing.
- **Traceable source evidence:** `src/pages/AdminAuctions.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 007. `src/pages/AdminBlog.tsx`

- **Feature:** Blog Admin
- **Domain:** admin
- **Classification:** L1_UI_ONLY
- **Authentication evidence:** NONE
- **API/integration evidence:** localStorage only
- **Recorded lines:** 247
- **Observed notes:** No auth guard
- **Archaeology assessment:** A user interface is present, but no complete persisted end-to-end flow is evidenced.
- **Traceable source evidence:** `src/pages/AdminBlog.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 008. `src/pages/AdminCategories.tsx`

- **Feature:** Category Admin
- **Domain:** admin
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** NONE
- **API/integration evidence:** CRUD /api/categories
- **Recorded lines:** 212
- **Observed notes:** Category CRUD with no auth
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/AdminCategories.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 009. `src/pages/AdminChat.tsx`

- **Feature:** Chat Monitor
- **Domain:** admin
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** NONE
- **API/integration evidence:** chatAdminService
- **Recorded lines:** 791
- **Observed notes:** Full chat moderation with no auth
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/AdminChat.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 010. `src/pages/AdminContent.tsx`

- **Feature:** Content CMS
- **Domain:** admin
- **Classification:** L1_UI_ONLY
- **Authentication evidence:** NONE
- **API/integration evidence:** localStorage only
- **Recorded lines:** 212
- **Observed notes:** Static content editor
- **Archaeology assessment:** A user interface is present, but no complete persisted end-to-end flow is evidenced.
- **Traceable source evidence:** `src/pages/AdminContent.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 011. `src/pages/AdminDiscounts.tsx`

- **Feature:** Coupon Admin
- **Domain:** admin
- **Classification:** L3_PARTIAL_FLOW
- **Authentication evidence:** token only
- **API/integration evidence:** CRUD /coupons
- **Recorded lines:** 406
- **Observed notes:** No role guard
- **Archaeology assessment:** Part of the interaction is wired, but the complete flow or enforcement is missing.
- **Traceable source evidence:** `src/pages/AdminDiscounts.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 012. `src/pages/AdminEliteLeads.tsx`

- **Feature:** Elite Leads
- **Domain:** admin
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** admin role
- **API/integration evidence:** GET/PATCH /elite-leads
- **Recorded lines:** 114
- **Observed notes:** Manual elite toggle
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/AdminEliteLeads.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 013. `src/pages/AdminEmperor.tsx`

- **Feature:** Emperor Dashboard
- **Domain:** admin
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** admin role
- **API/integration evidence:** GET /api/admin/emperor
- **Recorded lines:** 370
- **Observed notes:** Read-only analytics dashboard
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/AdminEmperor.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 014. `src/pages/AdminFreeResources.tsx`

- **Feature:** Free Resources
- **Domain:** admin
- **Classification:** L3_PARTIAL_FLOW
- **Authentication evidence:** NONE
- **API/integration evidence:** GET/DELETE /free-resources
- **Recorded lines:** 196
- **Observed notes:** Delete + localStorage mutations
- **Archaeology assessment:** Part of the interaction is wired, but the complete flow or enforcement is missing.
- **Traceable source evidence:** `src/pages/AdminFreeResources.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 015. `src/pages/AdminLicenseKeys.tsx`

- **Feature:** License Key Admin
- **Domain:** admin
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** token only
- **API/integration evidence:** CRUD /admin/license/*
- **Recorded lines:** 560
- **Observed notes:** Full license lifecycle
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/AdminLicenseKeys.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 016. `src/pages/AdminLookups.tsx`

- **Feature:** Lookup Admin
- **Domain:** admin
- **Classification:** L1_UI_ONLY
- **Authentication evidence:** NONE
- **API/integration evidence:** localStorage only
- **Recorded lines:** 451
- **Observed notes:** Dropdown data management
- **Archaeology assessment:** A user interface is present, but no complete persisted end-to-end flow is evidenced.
- **Traceable source evidence:** `src/pages/AdminLookups.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 017. `src/pages/AdminMarketRates.tsx`

- **Feature:** Market Rates
- **Domain:** admin
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** admin role (soft)
- **API/integration evidence:** GET/PUT /api/market-rates
- **Recorded lines:** 308
- **Observed notes:** Rate editing
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/AdminMarketRates.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 018. `src/pages/AdminMatchmaking.tsx`

- **Feature:** Matchmaking
- **Domain:** admin
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** admin role
- **API/integration evidence:** GET/POST /api/matchmaking/*
- **Recorded lines:** 138
- **Observed notes:** Request↔project matching trigger
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/AdminMatchmaking.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 019. `src/pages/AdminMembership.tsx`

- **Feature:** Membership Admin
- **Domain:** admin
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** NONE (CRITICAL)
- **API/integration evidence:** CRUD /admin/*
- **Recorded lines:** 544
- **Observed notes:** 14 endpoints with no auth guard
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/AdminMembership.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 020. `src/pages/AdminModerators.tsx`

- **Feature:** Moderator Admin
- **Domain:** admin
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** NONE
- **API/integration evidence:** CRUD /admin/roles + /admin/moderators
- **Recorded lines:** 681
- **Observed notes:** Role-based access control
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/AdminModerators.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 021. `src/pages/AdminNewsTicker.tsx`

- **Feature:** News Ticker
- **Domain:** admin
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** NONE
- **API/integration evidence:** CRUD /admin/news-ticker
- **Recorded lines:** 422
- **Observed notes:** News ticker CRUD
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/AdminNewsTicker.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 022. `src/pages/AdminNotifications.tsx`

- **Feature:** Push Notifications
- **Domain:** admin
- **Classification:** L1_UI_ONLY
- **Authentication evidence:** NONE
- **API/integration evidence:** localStorage only
- **Recorded lines:** 267
- **Observed notes:** Push notification composer
- **Archaeology assessment:** A user interface is present, but no complete persisted end-to-end flow is evidenced.
- **Traceable source evidence:** `src/pages/AdminNotifications.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 023. `src/pages/AdminPayments.tsx`

- **Feature:** Payment Admin
- **Domain:** admin
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** admin role
- **API/integration evidence:** GET/PATCH /admin/subscriptions
- **Recorded lines:** 330
- **Observed notes:** Payment review + method toggle
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/AdminPayments.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 024. `src/pages/AdminPlans.tsx`

- **Feature:** Plan Admin
- **Domain:** admin
- **Classification:** L3_PARTIAL_FLOW
- **Authentication evidence:** token only
- **API/integration evidence:** CRUD /plans
- **Recorded lines:** 469
- **Observed notes:** No role guard on plan CRUD
- **Archaeology assessment:** Part of the interaction is wired, but the complete flow or enforcement is missing.
- **Traceable source evidence:** `src/pages/AdminPlans.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 025. `src/pages/AdminProperties.tsx`

- **Feature:** Property Moderation
- **Domain:** admin
- **Classification:** L3_PARTIAL_FLOW
- **Authentication evidence:** NONE
- **API/integration evidence:** GET /properties + localStorage
- **Recorded lines:** 401
- **Observed notes:** Hybrid API+localStorage
- **Archaeology assessment:** Part of the interaction is wired, but the complete flow or enforcement is missing.
- **Traceable source evidence:** `src/pages/AdminProperties.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 026. `src/pages/AdminRelistMonitoring.tsx`

- **Feature:** Relist Monitor
- **Domain:** admin
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** token only
- **API/integration evidence:** GET/POST /relist-monitoring
- **Recorded lines:** 386
- **Observed notes:** Suspicious relist detection
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/AdminRelistMonitoring.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 027. `src/pages/AdminReports.tsx`

- **Feature:** Report Moderation
- **Domain:** admin
- **Classification:** L1_UI_ONLY
- **Authentication evidence:** NONE
- **API/integration evidence:** localStorage only
- **Recorded lines:** 373
- **Observed notes:** Content report queue
- **Archaeology assessment:** A user interface is present, but no complete persisted end-to-end flow is evidenced.
- **Traceable source evidence:** `src/pages/AdminReports.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 028. `src/pages/AdminSEO.tsx`

- **Feature:** SEO Manager
- **Domain:** admin
- **Classification:** L1_UI_ONLY
- **Authentication evidence:** NONE
- **API/integration evidence:** localStorage only
- **Recorded lines:** 608
- **Observed notes:** Page meta + robots.txt editor
- **Archaeology assessment:** A user interface is present, but no complete persisted end-to-end flow is evidenced.
- **Traceable source evidence:** `src/pages/AdminSEO.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 029. `src/pages/AdminServiceMarket.tsx`

- **Feature:** Service Category Admin
- **Domain:** admin
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** NONE
- **API/integration evidence:** CRUD /admin/services/*
- **Recorded lines:** 425
- **Observed notes:** Service hub categories
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/AdminServiceMarket.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 030. `src/pages/AdminServiceReviews.tsx`

- **Feature:** Review Moderation
- **Domain:** admin
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** token only
- **API/integration evidence:** GET/DELETE/PATCH /service-hub/admin/*
- **Recorded lines:** 307
- **Observed notes:** Rating review + blacklist
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/AdminServiceReviews.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 031. `src/pages/AdminSettings.tsx`

- **Feature:** System Settings
- **Domain:** admin
- **Classification:** L1_UI_ONLY
- **Authentication evidence:** NONE
- **API/integration evidence:** localStorage only
- **Recorded lines:** 509
- **Observed notes:** Global site settings
- **Archaeology assessment:** A user interface is present, but no complete persisted end-to-end flow is evidenced.
- **Traceable source evidence:** `src/pages/AdminSettings.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 032. `src/pages/AdminSoftwareLicenses.tsx`

- **Feature:** Software License Admin
- **Domain:** admin
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** admin role
- **API/integration evidence:** CRUD /admin/licenses
- **Recorded lines:** 205
- **Observed notes:** License lifecycle
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/AdminSoftwareLicenses.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 033. `src/pages/AdminTenders.tsx`

- **Feature:** Tender Admin
- **Domain:** admin
- **Classification:** L3_PARTIAL_FLOW
- **Authentication evidence:** token only
- **API/integration evidence:** GET/PATCH /tenders/admin/*
- **Recorded lines:** 103
- **Observed notes:** Cancel tenders only
- **Archaeology assessment:** Part of the interaction is wired, but the complete flow or enforcement is missing.
- **Traceable source evidence:** `src/pages/AdminTenders.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 034. `src/pages/AdminTickets.tsx`

- **Feature:** Support Tickets
- **Domain:** admin
- **Classification:** L1_UI_ONLY
- **Authentication evidence:** NONE
- **API/integration evidence:** localStorage only
- **Recorded lines:** 424
- **Observed notes:** Ticket management
- **Archaeology assessment:** A user interface is present, but no complete persisted end-to-end flow is evidenced.
- **Traceable source evidence:** `src/pages/AdminTickets.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 035. `src/pages/AdminUsers.tsx`

- **Feature:** User Management
- **Domain:** admin
- **Classification:** L3_PARTIAL_FLOW
- **Authentication evidence:** NONE
- **API/integration evidence:** localStorage + apiRequest
- **Recorded lines:** 1049
- **Observed notes:** Mass user operations
- **Archaeology assessment:** Part of the interaction is wired, but the complete flow or enforcement is missing.
- **Traceable source evidence:** `src/pages/AdminUsers.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 036. `src/pages/AdminUsersPage.tsx`

- **Feature:** EMPTY FILE
- **Domain:** admin
- **Classification:** STUB
- **Authentication evidence:** NONE
- **API/integration evidence:** none
- **Recorded lines:** 0
- **Observed notes:** Empty 0-byte file
- **Archaeology assessment:** EMPTY/STUB: the physical file is present at 0 bytes and provides no implemented page behavior.
- **Traceable source evidence:** `src/pages/AdminUsersPage.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 037. `src/pages/AdminVerification.tsx`

- **Feature:** Verification Review
- **Domain:** admin
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** admin role
- **API/integration evidence:** GET/PATCH /api/verification/requests
- **Recorded lines:** 197
- **Observed notes:** Badge approval
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/AdminVerification.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 038. `src/pages/Advertise.tsx`

- **Feature:** Ad Submission
- **Domain:** public
- **Classification:** L1_UI_ONLY
- **Authentication evidence:** no
- **API/integration evidence:** none (form)
- **Recorded lines:** 373
- **Observed notes:** Ad request form
- **Archaeology assessment:** A user interface is present, but no complete persisted end-to-end flow is evidenced.
- **Traceable source evidence:** `src/pages/Advertise.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 039. `src/pages/ArchitecturalConsultant.tsx`

- **Feature:** Engineering Configurator
- **Domain:** engineering
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** no
- **API/integration evidence:** local engines
- **Recorded lines:** 2384
- **Observed notes:** 20+ lazy-loaded engineering engines
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/ArchitecturalConsultant.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 040. `src/pages/ArtisanDashboard.tsx`

- **Feature:** Artisan Dashboard
- **Domain:** artisan
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** token
- **API/integration evidence:** lib/artisanData
- **Recorded lines:** 399
- **Observed notes:** Reviews + appointments + quotes
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/ArtisanDashboard.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 041. `src/pages/AuctionDetail.tsx`

- **Feature:** Auction Detail
- **Domain:** auction
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** no (bid requires auth)
- **API/integration evidence:** /api/auctions/:id
- **Recorded lines:** 410
- **Observed notes:** Countdown + bidding + bids list
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/AuctionDetail.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 042. `src/pages/AuctionFAQ.tsx`

- **Feature:** Auction FAQ
- **Domain:** auction
- **Classification:** L1_UI_ONLY
- **Authentication evidence:** no
- **API/integration evidence:** none
- **Recorded lines:** 162
- **Observed notes:** Static FAQ
- **Archaeology assessment:** A user interface is present, but no complete persisted end-to-end flow is evidenced.
- **Traceable source evidence:** `src/pages/AuctionFAQ.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 043. `src/pages/AuctionHistory.tsx`

- **Feature:** Auction History
- **Domain:** auction
- **Classification:** L3_PARTIAL_FLOW
- **Authentication evidence:** no
- **API/integration evidence:** /api/auctions?status=SOLD
- **Recorded lines:** 173
- **Observed notes:** Completed auctions + price charts
- **Archaeology assessment:** Part of the interaction is wired, but the complete flow or enforcement is missing.
- **Traceable source evidence:** `src/pages/AuctionHistory.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 044. `src/pages/Auctions.tsx`

- **Feature:** Auction Listing
- **Domain:** auction
- **Classification:** L3_PARTIAL_FLOW
- **Authentication evidence:** no
- **API/integration evidence:** /api/auctions
- **Recorded lines:** 196
- **Observed notes:** Public listing with filters
- **Archaeology assessment:** Part of the interaction is wired, but the complete flow or enforcement is missing.
- **Traceable source evidence:** `src/pages/Auctions.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 045. `src/pages/AuctionStats.tsx`

- **Feature:** Auction Stats
- **Domain:** auction
- **Classification:** L3_PARTIAL_FLOW
- **Authentication evidence:** no
- **API/integration evidence:** /api/auction-enhancements/stats
- **Recorded lines:** 183
- **Observed notes:** Platform statistics + PDF export
- **Archaeology assessment:** Part of the interaction is wired, but the complete flow or enforcement is missing.
- **Traceable source evidence:** `src/pages/AuctionStats.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 046. `src/pages/AuctionTerms.tsx`

- **Feature:** Auction Terms
- **Domain:** auction
- **Classification:** L1_UI_ONLY
- **Authentication evidence:** no
- **API/integration evidence:** none
- **Recorded lines:** 205
- **Observed notes:** Static terms
- **Archaeology assessment:** A user interface is present, but no complete persisted end-to-end flow is evidenced.
- **Traceable source evidence:** `src/pages/AuctionTerms.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 047. `src/pages/Blog.tsx`

- **Feature:** Blog Listing
- **Domain:** content
- **Classification:** L3_PARTIAL_FLOW
- **Authentication evidence:** no
- **API/integration evidence:** /api/blog
- **Recorded lines:** 199
- **Observed notes:** Category filter + search
- **Archaeology assessment:** Part of the interaction is wired, but the complete flow or enforcement is missing.
- **Traceable source evidence:** `src/pages/Blog.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 048. `src/pages/BlogPostDetail.tsx`

- **Feature:** Blog Detail
- **Domain:** content
- **Classification:** L3_PARTIAL_FLOW
- **Authentication evidence:** no (comment requires auth)
- **API/integration evidence:** /api/blog/:id
- **Recorded lines:** 257
- **Observed notes:** Post + localStorage comments
- **Archaeology assessment:** Part of the interaction is wired, but the complete flow or enforcement is missing.
- **Traceable source evidence:** `src/pages/BlogPostDetail.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 049. `src/pages/BuyLicense.tsx`

- **Feature:** License Purchase
- **Domain:** monetization
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** no (auth for purchase)
- **API/integration evidence:** /api/payments/*
- **Recorded lines:** 482
- **Observed notes:** PayPal/Thawani/bank transfer
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/BuyLicense.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 050. `src/pages/ConsultantDashboard.tsx`

- **Feature:** Consultant Dashboard
- **Domain:** engineering
- **Classification:** L1_UI_ONLY
- **Authentication evidence:** no
- **API/integration evidence:** mock data
- **Recorded lines:** 463
- **Observed notes:** Mock project review UI
- **Archaeology assessment:** A user interface is present, but no complete persisted end-to-end flow is evidenced.
- **Traceable source evidence:** `src/pages/ConsultantDashboard.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 051. `src/pages/Contact.tsx`

- **Feature:** Contact Form
- **Domain:** public
- **Classification:** L1_UI_ONLY
- **Authentication evidence:** no
- **API/integration evidence:** none (setTimeout mock)
- **Recorded lines:** 124
- **Observed notes:** Static form with mock submit
- **Archaeology assessment:** A user interface is present, but no complete persisted end-to-end flow is evidenced.
- **Traceable source evidence:** `src/pages/Contact.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 052. `src/pages/CreateCompany.tsx`

- **Feature:** Create Company
- **Domain:** office
- **Classification:** L3_PARTIAL_FLOW
- **Authentication evidence:** token
- **API/integration evidence:** CompanyContext.createCompany
- **Recorded lines:** 97
- **Observed notes:** localStorage company creation
- **Archaeology assessment:** Part of the interaction is wired, but the complete flow or enforcement is missing.
- **Traceable source evidence:** `src/pages/CreateCompany.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 053. `src/pages/Dashboard.tsx`

- **Feature:** User Dashboard
- **Domain:** user
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** token
- **API/integration evidence:** /api/properties/mine + /api/auth/*
- **Recorded lines:** 487
- **Observed notes:** Property management + API key
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/Dashboard.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 054. `src/pages/DashboardAuctions.tsx`

- **Feature:** My Auctions
- **Domain:** auction
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** token
- **API/integration evidence:** /api/auctions/my
- **Recorded lines:** 264
- **Observed notes:** User's auction CRUD
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/DashboardAuctions.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 055. `src/pages/DashboardBids.tsx`

- **Feature:** My Bids
- **Domain:** auction
- **Classification:** L3_PARTIAL_FLOW
- **Authentication evidence:** token
- **API/integration evidence:** /api/auctions/my-bids
- **Recorded lines:** 194
- **Observed notes:** Bid tracking
- **Archaeology assessment:** Part of the interaction is wired, but the complete flow or enforcement is missing.
- **Traceable source evidence:** `src/pages/DashboardBids.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 056. `src/pages/DashboardPage.tsx`

- **Feature:** EMPTY FILE
- **Domain:** unknown
- **Classification:** STUB
- **Authentication evidence:** NONE
- **API/integration evidence:** none
- **Recorded lines:** 0
- **Observed notes:** Empty 0-byte file
- **Archaeology assessment:** EMPTY/STUB: the physical file is present at 0 bytes and provides no implemented page behavior.
- **Traceable source evidence:** `src/pages/DashboardPage.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 057. `src/pages/DashboardProfile.tsx`

- **Feature:** Profile Editor
- **Domain:** user
- **Classification:** L3_PARTIAL_FLOW
- **Authentication evidence:** token
- **API/integration evidence:** /api/profile PUT
- **Recorded lines:** 194
- **Observed notes:** Avatar upload
- **Archaeology assessment:** Part of the interaction is wired, but the complete flow or enforcement is missing.
- **Traceable source evidence:** `src/pages/DashboardProfile.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 058. `src/pages/DashboardTenderBids.tsx`

- **Feature:** My Tender Bids
- **Domain:** tender
- **Classification:** L3_PARTIAL_FLOW
- **Authentication evidence:** token
- **API/integration evidence:** /api/tenders/my/bids
- **Recorded lines:** 94
- **Observed notes:** Bid tracking
- **Archaeology assessment:** Part of the interaction is wired, but the complete flow or enforcement is missing.
- **Traceable source evidence:** `src/pages/DashboardTenderBids.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 059. `src/pages/DashboardTenders.tsx`

- **Feature:** My Tenders
- **Domain:** tender
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** token
- **API/integration evidence:** /api/tenders/my/list
- **Recorded lines:** 126
- **Observed notes:** Tender CRUD
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/DashboardTenders.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 060. `src/pages/DevLogin.tsx`

- **Feature:** Dev Login
- **Domain:** dev
- **Classification:** L1_UI_ONLY
- **Authentication evidence:** prod-blocked
- **API/integration evidence:** localStorage
- **Recorded lines:** 68
- **Observed notes:** Blocked in production
- **Archaeology assessment:** A user interface is present, but no complete persisted end-to-end flow is evidenced.
- **Traceable source evidence:** `src/pages/DevLogin.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 061. `src/pages/Download.tsx`

- **Feature:** App Download
- **Domain:** public
- **Classification:** L3_PARTIAL_FLOW
- **Authentication evidence:** optional auth
- **API/integration evidence:** /api/auth/trial-license
- **Recorded lines:** 426
- **Observed notes:** Desktop download + trial license
- **Archaeology assessment:** Part of the interaction is wired, but the complete flow or enforcement is missing.
- **Traceable source evidence:** `src/pages/Download.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 062. `src/pages/Estates.tsx`

- **Feature:** Estate Listings
- **Domain:** property
- **Classification:** L3_PARTIAL_FLOW
- **Authentication evidence:** no
- **API/integration evidence:** /api/auctions
- **Recorded lines:** 416
- **Observed notes:** Estate listings + auction cards
- **Archaeology assessment:** Part of the interaction is wired, but the complete flow or enforcement is missing.
- **Traceable source evidence:** `src/pages/Estates.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 063. `src/pages/FreeResources.tsx`

- **Feature:** Free Resources
- **Domain:** content
- **Classification:** L3_PARTIAL_FLOW
- **Authentication evidence:** no (admin for upload)
- **API/integration evidence:** /api/free-resources
- **Recorded lines:** 457
- **Observed notes:** Books + software downloads
- **Archaeology assessment:** Part of the interaction is wired, but the complete flow or enforcement is missing.
- **Traceable source evidence:** `src/pages/FreeResources.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 064. `src/pages/Home.tsx`

- **Feature:** Homepage
- **Domain:** public
- **Classification:** L3_PARTIAL_FLOW
- **Authentication evidence:** no
- **API/integration evidence:** useGetFeaturedProperties
- **Recorded lines:** 186
- **Observed notes:** Hero slideshow + featured properties
- **Archaeology assessment:** Part of the interaction is wired, but the complete flow or enforcement is missing.
- **Traceable source evidence:** `src/pages/Home.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 065. `src/pages/InboxPage.tsx`

- **Feature:** Unified Inbox
- **Domain:** service
- **Classification:** L1_UI_ONLY
- **Authentication evidence:** no
- **API/integration evidence:** delegates to UnifiedInbox
- **Recorded lines:** 16
- **Observed notes:** Wrapper page
- **Archaeology assessment:** A user interface is present, but no complete persisted end-to-end flow is evidenced.
- **Traceable source evidence:** `src/pages/InboxPage.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 066. `src/pages/InvestmentRadar.tsx`

- **Feature:** Investment Radar
- **Domain:** property
- **Classification:** L3_PARTIAL_FLOW
- **Authentication evidence:** no
- **API/integration evidence:** /api/investment-radar
- **Recorded lines:** 473
- **Observed notes:** City investment scoring + radar charts
- **Archaeology assessment:** Part of the interaction is wired, but the complete flow or enforcement is missing.
- **Traceable source evidence:** `src/pages/InvestmentRadar.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 067. `src/pages/JoinFounders.tsx`

- **Feature:** Founder Registration
- **Domain:** auth
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** no
- **API/integration evidence:** /api/auth/register
- **Recorded lines:** 420
- **Observed notes:** Full registration with validation
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/JoinFounders.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 068. `src/pages/LandingCorporates.tsx`

- **Feature:** Corporate Landing
- **Domain:** marketing
- **Classification:** L1_UI_ONLY
- **Authentication evidence:** no
- **API/integration evidence:** none
- **Recorded lines:** 147
- **Observed notes:** Marketing page
- **Archaeology assessment:** A user interface is present, but no complete persisted end-to-end flow is evidenced.
- **Traceable source evidence:** `src/pages/LandingCorporates.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 069. `src/pages/LandingOffices.tsx`

- **Feature:** Office Landing
- **Domain:** marketing
- **Classification:** L1_UI_ONLY
- **Authentication evidence:** no
- **API/integration evidence:** none
- **Recorded lines:** 202
- **Observed notes:** Marketing page
- **Archaeology assessment:** A user interface is present, but no complete persisted end-to-end flow is evidenced.
- **Traceable source evidence:** `src/pages/LandingOffices.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 070. `src/pages/LandingProfessionals.tsx`

- **Feature:** Professional Landing
- **Domain:** marketing
- **Classification:** L1_UI_ONLY
- **Authentication evidence:** no
- **API/integration evidence:** none
- **Recorded lines:** 147
- **Observed notes:** Marketing page
- **Archaeology assessment:** A user interface is present, but no complete persisted end-to-end flow is evidenced.
- **Traceable source evidence:** `src/pages/LandingProfessionals.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 071. `src/pages/Login.tsx`

- **Feature:** Login
- **Domain:** auth
- **Classification:** L1_UI_ONLY
- **Authentication evidence:** no
- **API/integration evidence:** delegates to LoginForm
- **Recorded lines:** 117
- **Observed notes:** Login wrapper
- **Archaeology assessment:** A user interface is present, but no complete persisted end-to-end flow is evidenced.
- **Traceable source evidence:** `src/pages/Login.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 072. `src/pages/MarketHistory.tsx`

- **Feature:** Market History
- **Domain:** property
- **Classification:** L3_PARTIAL_FLOW
- **Authentication evidence:** no
- **API/integration evidence:** /api/market/history
- **Recorded lines:** 278
- **Observed notes:** Price history charts + PDF
- **Archaeology assessment:** Part of the interaction is wired, but the complete flow or enforcement is missing.
- **Traceable source evidence:** `src/pages/MarketHistory.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 073. `src/pages/Messages.tsx`

- **Feature:** Messages
- **Domain:** messaging
- **Classification:** L1_UI_ONLY
- **Authentication evidence:** no
- **API/integration evidence:** delegates to ChatApp
- **Recorded lines:** 21
- **Observed notes:** Chat wrapper
- **Archaeology assessment:** A user interface is present, but no complete persisted end-to-end flow is evidenced.
- **Traceable source evidence:** `src/pages/Messages.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 074. `src/pages/ModeratorPanel.tsx`

- **Feature:** Moderator Panel
- **Domain:** moderation
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** moderator role
- **API/integration evidence:** /api/properties/pending + approve/reject
- **Recorded lines:** 148
- **Observed notes:** Property approval queue
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/ModeratorPanel.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 075. `src/pages/MyCompanies.tsx`

- **Feature:** My Companies
- **Domain:** office
- **Classification:** L3_PARTIAL_FLOW
- **Authentication evidence:** token
- **API/integration evidence:** CompanyContext
- **Recorded lines:** 123
- **Observed notes:** localStorage company management
- **Archaeology assessment:** Part of the interaction is wired, but the complete flow or enforcement is missing.
- **Traceable source evidence:** `src/pages/MyCompanies.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 076. `src/pages/MyPropertyRequests.tsx`

- **Feature:** My Requests
- **Domain:** property
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** token
- **API/integration evidence:** /api/property-requests/mine
- **Recorded lines:** 189
- **Observed notes:** Property requests + office offers
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/MyPropertyRequests.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 077. `src/pages/MyServiceDashboard.tsx`

- **Feature:** Service Provider Dashboard
- **Domain:** service
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** token
- **API/integration evidence:** /api/services/*
- **Recorded lines:** 475
- **Observed notes:** Service listing CRUD
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/MyServiceDashboard.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 078. `src/pages/not-found.tsx`

- **Feature:** 404 Page
- **Domain:** public
- **Classification:** L1_UI_ONLY
- **Authentication evidence:** no
- **API/integration evidence:** none
- **Recorded lines:** 26
- **Observed notes:** Static
- **Archaeology assessment:** A user interface is present, but no complete persisted end-to-end flow is evidenced.
- **Traceable source evidence:** `src/pages/not-found.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 079. `src/pages/OfficeDetail.tsx`

- **Feature:** Office Detail
- **Domain:** office
- **Classification:** L3_PARTIAL_FLOW
- **Authentication evidence:** no
- **API/integration evidence:** /api/offices/:id
- **Recorded lines:** 254
- **Observed notes:** Office profile + properties
- **Archaeology assessment:** Part of the interaction is wired, but the complete flow or enforcement is missing.
- **Traceable source evidence:** `src/pages/OfficeDetail.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 080. `src/pages/OfficeRequests.tsx`

- **Feature:** Office Requests
- **Domain:** office
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** token
- **API/integration evidence:** /api/property-requests
- **Recorded lines:** 183
- **Observed notes:** Office-side request management
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/OfficeRequests.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 081. `src/pages/Offices.tsx`

- **Feature:** Office Listing
- **Domain:** office
- **Classification:** L3_PARTIAL_FLOW
- **Authentication evidence:** no
- **API/integration evidence:** useListOffices
- **Recorded lines:** 384
- **Observed notes:** Public listing with search + compare
- **Archaeology assessment:** Part of the interaction is wired, but the complete flow or enforcement is missing.
- **Traceable source evidence:** `src/pages/Offices.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 082. `src/pages/OtherServices.tsx`

- **Feature:** Other Services
- **Domain:** service
- **Classification:** L3_PARTIAL_FLOW
- **Authentication evidence:** no
- **API/integration evidence:** /api/other-services
- **Recorded lines:** 234
- **Observed notes:** Service marketplace
- **Archaeology assessment:** Part of the interaction is wired, but the complete flow or enforcement is missing.
- **Traceable source evidence:** `src/pages/OtherServices.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 083. `src/pages/PartnerDashboard.tsx`

- **Feature:** Partner Dashboard
- **Domain:** partner
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** partner_key
- **API/integration evidence:** /api/partners/*
- **Recorded lines:** 507
- **Observed notes:** Campaigns + leads + analytics
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/PartnerDashboard.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 084. `src/pages/PartnerPortal.tsx`

- **Feature:** Partner Portal
- **Domain:** partner
- **Classification:** L1_UI_ONLY
- **Authentication evidence:** no
- **API/integration evidence:** /api/partners/login
- **Recorded lines:** 117
- **Observed notes:** Partner login
- **Archaeology assessment:** A user interface is present, but no complete persisted end-to-end flow is evidenced.
- **Traceable source evidence:** `src/pages/PartnerPortal.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 085. `src/pages/PaymentReturn.tsx`

- **Feature:** Payment Callback
- **Domain:** monetization
- **Classification:** L3_PARTIAL_FLOW
- **Authentication evidence:** no
- **API/integration evidence:** /api/payments/thawani/tap/verify
- **Recorded lines:** 95
- **Observed notes:** Payment verification callback
- **Archaeology assessment:** Part of the interaction is wired, but the complete flow or enforcement is missing.
- **Traceable source evidence:** `src/pages/PaymentReturn.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 086. `src/pages/Pricing.tsx`

- **Feature:** Subscription Plans
- **Domain:** monetization
- **Classification:** L3_PARTIAL_FLOW
- **Authentication evidence:** no
- **API/integration evidence:** /api/coupons/public
- **Recorded lines:** 331
- **Observed notes:** Plan listing + promo codes
- **Archaeology assessment:** Part of the interaction is wired, but the complete flow or enforcement is missing.
- **Traceable source evidence:** `src/pages/Pricing.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 087. `src/pages/PricingComingSoon.tsx`

- **Feature:** Pricing Placeholder
- **Domain:** monetization
- **Classification:** L1_UI_ONLY
- **Authentication evidence:** no
- **API/integration evidence:** none
- **Recorded lines:** 68
- **Observed notes:** Placeholder
- **Archaeology assessment:** A user interface is present, but no complete persisted end-to-end flow is evidenced.
- **Traceable source evidence:** `src/pages/PricingComingSoon.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 088. `src/pages/Privacy.tsx`

- **Feature:** Privacy Policy
- **Domain:** public
- **Classification:** L1_UI_ONLY
- **Authentication evidence:** no
- **API/integration evidence:** none
- **Recorded lines:** 195
- **Observed notes:** Static bilingual
- **Archaeology assessment:** A user interface is present, but no complete persisted end-to-end flow is evidenced.
- **Traceable source evidence:** `src/pages/Privacy.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 089. `src/pages/Profile.tsx`

- **Feature:** Public Profile
- **Domain:** user
- **Classification:** L3_PARTIAL_FLOW
- **Authentication evidence:** no
- **API/integration evidence:** /api/profile/:username
- **Recorded lines:** 960
- **Observed notes:** Rank badges gallery contact
- **Archaeology assessment:** Part of the interaction is wired, but the complete flow or enforcement is missing.
- **Traceable source evidence:** `src/pages/Profile.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 090. `src/pages/ProfilePage.tsx`

- **Feature:** Profile View
- **Domain:** user
- **Classification:** L3_PARTIAL_FLOW
- **Authentication evidence:** no
- **API/integration evidence:** /api/profile/:username
- **Recorded lines:** 197
- **Observed notes:** Alternative profile view
- **Archaeology assessment:** Part of the interaction is wired, but the complete flow or enforcement is missing.
- **Traceable source evidence:** `src/pages/ProfilePage.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 091. `src/pages/ProjectVerify.tsx`

- **Feature:** Project Verification
- **Domain:** engineering
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** no
- **API/integration evidence:** /api/diwan/verify/:code
- **Recorded lines:** 235
- **Observed notes:** QR code verification
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/ProjectVerify.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 092. `src/pages/Properties.tsx`

- **Feature:** Property Search
- **Domain:** property
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** no (auth for save)
- **API/integration evidence:** useListProperties + /api/save-search
- **Recorded lines:** 1732
- **Observed notes:** Map + filters + compare + favorites
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/Properties.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 093. `src/pages/PropertyDetail.tsx`

- **Feature:** Property Detail
- **Domain:** property
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** no (auth for actions)
- **API/integration evidence:** useGetProperty + /api/inquiries
- **Recorded lines:** 770
- **Observed notes:** Gallery + map + finance + inquiry
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/PropertyDetail.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 094. `src/pages/Register.tsx`

- **Feature:** Registration
- **Domain:** auth
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** no
- **API/integration evidence:** /api/auth/register
- **Recorded lines:** 812
- **Observed notes:** Full registration form
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/Register.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 095. `src/pages/ResetPassword.tsx`

- **Feature:** Password Reset
- **Domain:** auth
- **Classification:** L3_PARTIAL_FLOW
- **Authentication evidence:** token-based
- **API/integration evidence:** resetPassword()
- **Recorded lines:** 122
- **Observed notes:** Email token reset
- **Archaeology assessment:** Part of the interaction is wired, but the complete flow or enforcement is missing.
- **Traceable source evidence:** `src/pages/ResetPassword.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 096. `src/pages/ServiceDetail.tsx`

- **Feature:** Service Detail
- **Domain:** service
- **Classification:** L3_PARTIAL_FLOW
- **Authentication evidence:** no
- **API/integration evidence:** /api/other-services/:id
- **Recorded lines:** 182
- **Observed notes:** Service listing detail
- **Archaeology assessment:** Part of the interaction is wired, but the complete flow or enforcement is missing.
- **Traceable source evidence:** `src/pages/ServiceDetail.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 097. `src/pages/ServiceHub.tsx`

- **Feature:** Service Hub
- **Domain:** service
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** token
- **API/integration evidence:** /api/service-hub/*
- **Recorded lines:** 2530
- **Observed notes:** Massive artisan hub
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/ServiceHub.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 098. `src/pages/ServiceHubPage.tsx`

- **Feature:** EMPTY FILE
- **Domain:** service
- **Classification:** STUB
- **Authentication evidence:** NONE
- **API/integration evidence:** none
- **Recorded lines:** 0
- **Observed notes:** EMPTY/STUB — 0-byte file; retained for complete physical coverage
- **Archaeology assessment:** EMPTY/STUB: the physical file is present at 0 bytes and provides no implemented page behavior.
- **Traceable source evidence:** `src/pages/ServiceHubPage.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 099. `src/pages/Software.tsx`

- **Feature:** Software Products
- **Domain:** monetization
- **Classification:** L1_UI_ONLY
- **Authentication evidence:** no
- **API/integration evidence:** useListSoftwareProducts
- **Recorded lines:** 175
- **Observed notes:** Product showcase
- **Archaeology assessment:** A user interface is present, but no complete persisted end-to-end flow is evidenced.
- **Traceable source evidence:** `src/pages/Software.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 100. `src/pages/SubmitProperty.tsx`

- **Feature:** Property Submission
- **Domain:** property
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** token
- **API/integration evidence:** /api/properties POST
- **Recorded lines:** 552
- **Observed notes:** Property creation form
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/SubmitProperty.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 101. `src/pages/Subscribe.tsx`

- **Feature:** Subscription Purchase
- **Domain:** monetization
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** auth
- **API/integration evidence:** useCreateSubscription + PayPal
- **Recorded lines:** 774
- **Observed notes:** Payment gateway selection
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/Subscribe.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 102. `src/pages/SupplierDetail.tsx`

- **Feature:** Supplier Detail
- **Domain:** supplier
- **Classification:** L3_PARTIAL_FLOW
- **Authentication evidence:** no
- **API/integration evidence:** useGetSupplier
- **Recorded lines:** 129
- **Observed notes:** Supplier profile + products
- **Archaeology assessment:** Part of the interaction is wired, but the complete flow or enforcement is missing.
- **Traceable source evidence:** `src/pages/SupplierDetail.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 103. `src/pages/Suppliers.tsx`

- **Feature:** Supplier Listing
- **Domain:** supplier
- **Classification:** L3_PARTIAL_FLOW
- **Authentication evidence:** no
- **API/integration evidence:** useListSuppliers
- **Recorded lines:** 230
- **Observed notes:** Supplier marketplace
- **Archaeology assessment:** Part of the interaction is wired, but the complete flow or enforcement is missing.
- **Traceable source evidence:** `src/pages/Suppliers.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 104. `src/pages/TechnicianInbox.tsx`

- **Feature:** Technician Inbox
- **Domain:** service
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** token
- **API/integration evidence:** /api/service-hub/inbox
- **Recorded lines:** 745
- **Observed notes:** Real-time job inbox + ringing
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/TechnicianInbox.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 105. `src/pages/TechnicianSettings.tsx`

- **Feature:** Technician Settings
- **Domain:** service
- **Classification:** L3_PARTIAL_FLOW
- **Authentication evidence:** token
- **API/integration evidence:** /api/service-hub/profile
- **Recorded lines:** 319
- **Observed notes:** Notification + hours + location
- **Archaeology assessment:** Part of the interaction is wired, but the complete flow or enforcement is missing.
- **Traceable source evidence:** `src/pages/TechnicianSettings.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 106. `src/pages/TenderCreate.tsx`

- **Feature:** Create Tender
- **Domain:** tender
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** token
- **API/integration evidence:** /api/tenders POST
- **Recorded lines:** 134
- **Observed notes:** Tender creation form
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/TenderCreate.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 107. `src/pages/TenderDetail.tsx`

- **Feature:** Tender Detail
- **Domain:** tender
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** token
- **API/integration evidence:** /api/tenders/:id + /bid
- **Recorded lines:** 318
- **Observed notes:** Bid submission + award
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/TenderDetail.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 108. `src/pages/Tenders.tsx`

- **Feature:** Tender Listing
- **Domain:** tender
- **Classification:** L3_PARTIAL_FLOW
- **Authentication evidence:** no (auth for create)
- **API/integration evidence:** /api/tenders
- **Recorded lines:** 183
- **Observed notes:** Public listing
- **Archaeology assessment:** Part of the interaction is wired, but the complete flow or enforcement is missing.
- **Traceable source evidence:** `src/pages/Tenders.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 109. `src/pages/Terms.tsx`

- **Feature:** Terms of Service
- **Domain:** public
- **Classification:** L1_UI_ONLY
- **Authentication evidence:** no
- **API/integration evidence:** none
- **Recorded lines:** 160
- **Observed notes:** Static bilingual
- **Archaeology assessment:** A user interface is present, but no complete persisted end-to-end flow is evidenced.
- **Traceable source evidence:** `src/pages/Terms.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 110. `src/pages/Tools.tsx`

- **Feature:** Engineering Tools
- **Domain:** engineering
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** no (auth for some)
- **API/integration evidence:** /api/land/*
- **Recorded lines:** 2034
- **Observed notes:** Coordinate + UTM + area + deed map
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/Tools.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 111. `src/pages/UpgradeToArtisan.tsx`

- **Feature:** Upgrade to Artisan
- **Domain:** service
- **Classification:** L3_PARTIAL_FLOW
- **Authentication evidence:** token
- **API/integration evidence:** /api/services/tabs
- **Recorded lines:** 164
- **Observed notes:** Account type upgrade
- **Archaeology assessment:** Part of the interaction is wired, but the complete flow or enforcement is missing.
- **Traceable source evidence:** `src/pages/UpgradeToArtisan.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 112. `src/pages/VehicleServices.tsx`

- **Feature:** Vehicle Services
- **Domain:** service
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** no
- **API/integration evidence:** /api/vehicle-services/*
- **Recorded lines:** 1192
- **Observed notes:** Vehicle service marketplace
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/VehicleServices.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 113. `src/pages/VerifyEmail.tsx`

- **Feature:** Email Verify
- **Domain:** auth
- **Classification:** L3_PARTIAL_FLOW
- **Authentication evidence:** token-based
- **API/integration evidence:** verifyEmail()
- **Recorded lines:** 76
- **Observed notes:** Email verification link
- **Archaeology assessment:** Part of the interaction is wired, but the complete flow or enforcement is missing.
- **Traceable source evidence:** `src/pages/VerifyEmail.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 114. `src/pages/VerifyLicense.tsx`

- **Feature:** License Verify
- **Domain:** monetization
- **Classification:** L3_PARTIAL_FLOW
- **Authentication evidence:** no
- **API/integration evidence:** useValidateLicense
- **Recorded lines:** 150
- **Observed notes:** License key validation
- **Archaeology assessment:** Part of the interaction is wired, but the complete flow or enforcement is missing.
- **Traceable source evidence:** `src/pages/VerifyLicense.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 115. `src/pages/WriteBlog.tsx`

- **Feature:** Blog Editor
- **Domain:** content
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** token
- **API/integration evidence:** /api/blog POST
- **Recorded lines:** 139
- **Observed notes:** Rich text blog editor
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/WriteBlog.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 116. `src/pages/marketer/AdminMarketers.tsx`

- **Feature:** Marketer Admin
- **Domain:** admin
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** admin role
- **API/integration evidence:** /api/admin/marketers/*
- **Recorded lines:** 287
- **Observed notes:** Marketer approval + ranks
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/marketer/AdminMarketers.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 117. `src/pages/marketer/AdvertiserContracts.tsx`

- **Feature:** Advertiser Contracts
- **Domain:** marketer
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** token
- **API/integration evidence:** /api/marketer/contracts/advertiser
- **Recorded lines:** 120
- **Observed notes:** Contract sign/decline
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/marketer/AdvertiserContracts.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 118. `src/pages/marketer/AdvertiserProposals.tsx`

- **Feature:** Advertiser Proposals
- **Domain:** marketer
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** token
- **API/integration evidence:** /api/marketer/proposals/advertiser
- **Recorded lines:** 128
- **Observed notes:** Proposal accept/reject
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/marketer/AdvertiserProposals.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 119. `src/pages/marketer/AvailableProperties.tsx`

- **Feature:** Available Properties
- **Domain:** marketer
- **Classification:** L3_PARTIAL_FLOW
- **Authentication evidence:** token
- **API/integration evidence:** /api/marketer/available-properties
- **Recorded lines:** 141
- **Observed notes:** Property browsing for marketers
- **Archaeology assessment:** Part of the interaction is wired, but the complete flow or enforcement is missing.
- **Traceable source evidence:** `src/pages/marketer/AvailableProperties.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 120. `src/pages/marketer/MarketerContracts.tsx`

- **Feature:** Marketer Contracts
- **Domain:** marketer
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** token
- **API/integration evidence:** /api/marketer/contracts/marketer
- **Recorded lines:** 122
- **Observed notes:** Contract management
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/marketer/MarketerContracts.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 121. `src/pages/marketer/MarketerProfile.tsx`

- **Feature:** Marketer Profile
- **Domain:** marketer
- **Classification:** L3_PARTIAL_FLOW
- **Authentication evidence:** token
- **API/integration evidence:** /api/marketer/profile
- **Recorded lines:** 155
- **Observed notes:** Profile view
- **Archaeology assessment:** Part of the interaction is wired, but the complete flow or enforcement is missing.
- **Traceable source evidence:** `src/pages/marketer/MarketerProfile.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 122. `src/pages/marketer/MarketerProposals.tsx`

- **Feature:** Marketer Proposals
- **Domain:** marketer
- **Classification:** L3_PARTIAL_FLOW
- **Authentication evidence:** token
- **API/integration evidence:** /api/marketer/proposals/marketer
- **Recorded lines:** 84
- **Observed notes:** Proposal tracking
- **Archaeology assessment:** Part of the interaction is wired, but the complete flow or enforcement is missing.
- **Traceable source evidence:** `src/pages/marketer/MarketerProposals.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

### 123. `src/pages/marketer/MarketerRegister.tsx`

- **Feature:** Marketer Registration
- **Domain:** marketer
- **Classification:** L4_END_TO_END_WIRED
- **Authentication evidence:** token
- **API/integration evidence:** /api/marketer/register
- **Recorded lines:** 222
- **Observed notes:** Registration + code of conduct
- **Archaeology assessment:** UI and operational logic/API evidence form an end-to-end wired flow; this does not imply production hardening.
- **Traceable source evidence:** `src/pages/marketer/MarketerRegister.tsx` and the matching physical record in `V1_FILE_LISTING.csv`.

---

## Reconciliation Statement

All 123 page records in this document map one-to-one to the non-backup TypeScript page files in the reconciled V1 physical listing. `AdminUsersPage.tsx`, `DashboardPage.tsx`, and `ServiceHubPage.tsx` remain explicitly documented as zero-byte STUB files rather than being omitted.

## Application Source Files Modified

**ZERO**
